/**
 * Adapter för att låta gamla useStore använda nya analytics
 * Detta är ett övergångslager som kommer tas bort när migrationen är klar
 */

import { AnalyticsService } from '@/services/analyticsService';
import { useAnalytics } from '@/hooks/useAnalytics';
import { createStore } from 'zustand';

// Interface för status (måste matcha gamla interfacet)
interface AnalyticsStatus {
  currentPeriod: {
    startDate: string;
    endDate: string;
    totalAnalyses: number;
    limit: number;
  };
  historicalPeriods: {
    period: string;
    totalAnalyses: number;
  }[];
}

// Skapa en singleton-instans för analytics
const analyticsService = AnalyticsService.getInstance();

// Skapa ett litet lokalt store för cache
const analyticsCache = createStore<{
  usageStatus: any;
  setUsageStatus: (status: any) => void;
}>((set) => ({
  usageStatus: null,
  setUsageStatus: (status) => set({ usageStatus: status })
}));

/**
 * Initialisera analytics för en användare
 */
export async function initializeAnalytics(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Använd canPerformAnalysis för att initiera och få status
    const status = await analyticsService.canPerformAnalysis(userId);
    
    // Spara i cachen
    analyticsCache.getState().setUsageStatus(status);
    
    return true;
  } catch (error) {
    console.error('Fel vid initialisering av analytics via adapter:', error);
    return false;
  }
}

/**
 * Kontrollera om en användare kan utföra ytterligare en analys
 */
export async function canPerformAnalysis(userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  remaining: number;
  total: number;
  limit: number;
}> {
  try {
    // Kolla cached status först
    const cachedStatus = analyticsCache.getState().usageStatus;
    if (cachedStatus) {
      return {
        allowed: cachedStatus.allowed,
        reason: cachedStatus.reason,
        remaining: cachedStatus.remaining,
        total: cachedStatus.total,
        limit: cachedStatus.limit
      };
    }
    
    // Om inget i cache, hämta ny status
    const status = await analyticsService.canPerformAnalysis(userId);
    
    // Spara i cachen
    analyticsCache.getState().setUsageStatus(status);
    
    return {
      allowed: status.allowed,
      reason: status.reason,
      remaining: status.remaining,
      total: status.total,
      limit: status.limit
    };
  } catch (error) {
    console.error('Fel vid kontroll av analysgräns via adapter:', error);
    
    // Returnera default-värden
    return {
      allowed: true,
      reason: 'Fel vid kontroll',
      remaining: 99,
      total: 0,
      limit: 100
    };
  }
}

/**
 * Registrera en ny analys
 */
export async function recordAnalysis(userId: string): Promise<boolean> {
  try {
    const result = await analyticsService.recordAnalysis(userId);
    
    // Uppdatera cachat status
    if (result.success) {
      const oldStatus = analyticsCache.getState().usageStatus;
      
      if (oldStatus) {
        analyticsCache.getState().setUsageStatus({
          ...oldStatus,
          total: result.currentCount,
          remaining: result.remaining,
          allowed: result.remaining > 0
        });
      }
    }
    
    return result.success;
  } catch (error) {
    console.error('Fel vid registrering av analys via adapter:', error);
    return false;
  }
}

/**
 * Registrera en väntande analys för offline-användning
 */
export function recordPendingAnalysis(userId: string): boolean {
  try {
    analyticsService.recordOfflineAnalysis(userId);
    return true;
  } catch (error) {
    console.error('Fel vid registrering av väntande analys via adapter:', error);
    return false;
  }
}

/**
 * Synkronisera väntande analyser
 */
export async function syncPendingAnalyses(userId: string): Promise<boolean> {
  try {
    await analyticsService.syncPendingAnalyses();
    
    // Uppdatera cache efter synkronisering
    const newStatus = await analyticsService.canPerformAnalysis(userId);
    analyticsCache.getState().setUsageStatus(newStatus);
    
    return true;
  } catch (error) {
    console.error('Fel vid synkronisering av väntande analyser via adapter:', error);
    return false;
  }
} 