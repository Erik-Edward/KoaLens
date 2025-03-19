/**
 * Custom hook för att använda analytics service i React-komponenter
 */

import { useState, useEffect, useCallback } from 'react';
import { AnalyticsService, UsageCheckResult } from '../services/analyticsService';
import { useStore } from '../stores/useStore';
import { v4 as uuidv4 } from 'uuid';

export const useAnalytics = (userId?: string) => {
  const [usageStatus, setUsageStatus] = useState<UsageCheckResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Hämta användar-ID från store om inget angetts
  const user = useStore(state => state.user);
  const effectiveUserId = userId || user?.id;
  
  // Hämta service-instans
  const analyticsService = AnalyticsService.getInstance();
  
  // State för väntande analyser
  const [pendingCount, setPendingCount] = useState(0);
  
  // Ladda användarens analysstatistik
  const loadUsageStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!effectiveUserId) {
        console.warn('Användar-ID saknas, kan inte hämta analysanvändning');
        setUsageStatus(null);
        setLoading(false);
        return;
      }
      
      const status = await analyticsService.canPerformAnalysis(effectiveUserId);
      setUsageStatus(status);
    } catch (error) {
      console.error('Fel vid hämtning av analysanvändning:', error);
      setError('Kunde inte hämta analysanvändning');
    } finally {
      setLoading(false);
    }
  }, [analyticsService, effectiveUserId]);
  
  // Ladda användningsstatus när hooken används
  useEffect(() => {
    loadUsageStatus();
    
    // Hämta antalet väntande analyser
    const getPendingCount = async () => {
      try {
        // För tillfället har vi inte getPendingAnalysesCount, så vi använder syncPendingAnalyses 
        // som returnerar antalet väntande. Vi behöver inte synkronisera här - bara få antalet
        const pending = await analyticsService.syncPendingAnalyses();
        setPendingCount(pending);
      } catch (error) {
        console.error('Fel vid hämtning av väntande analyser:', error);
      }
    };
    
    getPendingCount();
  }, [loadUsageStatus, analyticsService]);
  
  // Funktion för att uppdatera användningsstatus
  const refreshUsageStatus = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadUsageStatus();
    } finally {
      setRefreshing(false);
    }
  }, [loadUsageStatus]);
  
  // Funktion för att registrera en ny analys
  const recordAnalysis = useCallback(async () => {
    try {
      // Om användare saknas, skapa ett tillfälligt UUID och fortsätt
      let userIdToUse = effectiveUserId;
      if (!userIdToUse) {
        console.warn('Användar-ID saknas vid analys, använder tillfälligt UUID');
        userIdToUse = uuidv4();
      } else {
        // Kontrollera att det är ett giltigt UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(userIdToUse)) {
          console.warn('Användar-ID är inte ett giltigt UUID, använder tillfälligt UUID');
          userIdToUse = uuidv4();
        }
      }
      
      try {
        const result = await analyticsService.recordAnalysis(userIdToUse);
        if (result.success) {
          // Uppdatera lokal status utan att göra ett nytt nätverksanrop
          setUsageStatus(prev => {
            if (!prev) return null;
            
            return {
              ...prev,
              total: result.currentCount,
              remaining: result.remaining,
              allowed: result.remaining > 0
            };
          });
        }
        
        return result.success;
      } catch (dbError) {
        // Hantera databas-relaterade fel, men returnera true för att fortsätta analys
        console.error('Databasfel vid registrering av analys, fortsätter ändå:', dbError);
        return true;
      }
    } catch (error) {
      console.error('Okänt fel vid registrering av analys:', error);
      // Vid fel returnera true ändå för att inte blockera analys
      return true;
    }
  }, [analyticsService, effectiveUserId]);
  
  // Funktion för att registrera analys i offline-läge
  const recordOfflineAnalysis = useCallback(async (analysisData: any = {}) => {
    try {
      if (!effectiveUserId) {
        console.error('Användar-ID saknas, kan inte registrera offline-analys');
        return false;
      }
      
      const result = await analyticsService.recordOfflineAnalysis(effectiveUserId, analysisData);
      if (result.success) {
        // Uppdatera lokal status utan att göra ett nytt nätverksanrop
        setUsageStatus(prev => {
          if (!prev) return null;
          
          return {
            ...prev,
            total: result.estimatedCount,
            remaining: result.estimatedRemaining,
            allowed: result.estimatedRemaining > 0
          };
        });
      }
      
      return result.success;
    } catch (error) {
      console.error('Fel vid registrering av offline-analys:', error);
      return false;
    }
  }, [analyticsService, effectiveUserId]);
  
  // Funktion för att synkronisera väntande analyser
  const syncPendingAnalyses = useCallback(async () => {
    try {
      const count = await analyticsService.syncPendingAnalyses();
      setPendingCount(count);
      if (count > 0) {
        await loadUsageStatus();
      }
      return count;
    } catch (error) {
      console.error('Fel vid synkronisering av väntande analyser:', error);
      return 0;
    }
  }, [analyticsService, loadUsageStatus]);
  
  // Funktion för att kontrollera om användaren kan göra en ny analys
  const canPerformAnalysis = useCallback(async () => {
    try {
      if (!effectiveUserId) {
        console.warn('Användar-ID saknas, kan inte kontrollera analysmöjlighet');
        // Tillåt analys trots att användar-ID saknas
        return { 
          allowed: true, 
          reason: 'Användar-ID saknas',
          remaining: 999,
          total: 0,
          limit: 999
        };
      }
      
      try {
        const status = await analyticsService.canPerformAnalysis(effectiveUserId);
        setUsageStatus(status);
        return status;
      } catch (dbError) {
        // Vid databasfel, tillåt alltid analys
        console.error('Databasfel vid kontroll av analysmöjlighet, tillåter ändå:', dbError);
        return { 
          allowed: true, 
          reason: 'Kunde inte kontrollera begränsningar, tillåter som standard',
          remaining: 999,
          total: 0,
          limit: 999
        };
      }
    } catch (error) {
      console.error('Okänt fel vid kontroll av analysmöjlighet:', error);
      // Vid okänt fel, tillåt alltid analys
      return { 
        allowed: true, 
        reason: 'Ett fel uppstod vid kontroll, tillåter som standard',
        remaining: 999,
        total: 0,
        limit: 999
      };
    }
  }, [analyticsService, effectiveUserId]);
  
  // Funktion för att hämta nuvarande status
  const getCurrentStatus = useCallback(async () => {
    try {
      if (!effectiveUserId) {
        console.warn('Användar-ID saknas, kan inte hämta nuvarande status');
        return null;
      }
      
      return await analyticsService.getCurrentStatus(effectiveUserId);
    } catch (error) {
      console.error('Fel vid hämtning av nuvarande status:', error);
      return null;
    }
  }, [analyticsService, effectiveUserId]);
  
  return {
    usageStatus,
    loading,
    error,
    refreshing,
    refreshUsageStatus,
    recordAnalysis,
    recordOfflineAnalysis,
    syncPendingAnalyses,
    canPerformAnalysis,
    getCurrentStatus,
    pendingCount
  };
}; 