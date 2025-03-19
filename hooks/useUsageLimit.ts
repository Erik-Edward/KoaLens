// hooks/useUsageLimit.ts
import { useCallback, useEffect, useState } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/providers/AuthProvider';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import * as Sentry from "@sentry/react-native";

// Använd samma BACKEND_URL som i claudeVisionService
const BACKEND_URL = 'https://koalens-backend.fly.dev';

// Förbättrad fetch-funktion med timeout och retry
const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries: number = 3) => {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Lägg till timeout för fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 sekunders timeout
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Kontrollera HTTP-status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        // Exponentiell backoff: vänta längre för varje försök
        const waitTime = Math.pow(2, attempt) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw lastError;
};

export function useUsageLimit() {
  const { user } = useAuth();
  const usageLimit = useStore(state => state.usageLimit);
  const fetchUsageLimit = useStore(state => state.fetchUsageLimit);
  const setUsageLimit = useStore(state => state.setUsageLimit);
  
  const refreshUsageLimit = useCallback(async () => {
    if (user?.id) {
      console.log('Refreshing usage limit for user:', user.id);
      try {
        // Kontrollera backend-anslutning först
        addBreadcrumb('Refreshing usage limit', 'api', { userId: user.id });
        
        // Lägg till en fördröjning för att ge backend tid att uppdatera databasen
        // Detta är kritiskt efter en analys då backend behöver tid att spara ändringarna
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // För bättre chans att få korrekt data efter en analys, gör flera försök
        // med exponentiell backoff
        let maxRetries = 3;
        let attempt = 0;
        let lastError = null;
        let success = false;
        
        while (attempt < maxRetries && !success) {
          try {
            // Öka väntetiden för varje försök (500ms, 1000ms, 2000ms)
            if (attempt > 0) {
              const waitTime = Math.pow(2, attempt-1) * 500;
              console.log(`Retry ${attempt+1}/${maxRetries}: Waiting ${waitTime}ms before next attempt...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            
            // Använd fetchWithRetry istället för vanlig fetch
            console.log(`Attempt ${attempt+1}/${maxRetries} to fetch usage data...`);
            const response = await fetchWithRetry(`${BACKEND_URL}/usage/${user.id}`);
            
            // Parse response
            const usageData = await response.json();
            console.log('Usage data received:', usageData);
            
            // Mappa om fältnamn om nödvändigt för att matcha vår modell
            // Backend kan använda analyses_used/analyses_limit eller analysesUsed/analysesLimit
            const analysesUsed = usageData.analysesUsed !== undefined ? 
              usageData.analysesUsed : 
              (usageData.analyses_used !== undefined ? usageData.analyses_used : 0);
            
            const analysesLimit = usageData.analysesLimit !== undefined ? 
              usageData.analysesLimit : 
              (usageData.analyses_limit !== undefined ? usageData.analyses_limit : 2);
            
            const isPremium = usageData.isPremium !== undefined ? 
              usageData.isPremium : 
              (usageData.is_premium !== undefined ? usageData.is_premium : false);
            
            // Logga mappade värden
            console.log('Mapped usage values:', { total: analysesUsed, limit: analysesLimit, isPremium });
            
            // Uppdatera store direkt med data från API-anropet
            // Detta är snabbare än att göra ett nytt anrop via fetchUsageLimit
            useStore.setState(state => ({
              usageLimit: {
                ...state.usageLimit,
                total: analysesUsed,
                limit: analysesLimit,
                remaining: isPremium ? 999 : Math.max(0, analysesLimit - analysesUsed),
                isPremium: isPremium,
                lastChecked: new Date().toISOString(),
                loading: false
              }
            }));
            
            // Dubbel verifiering för att säkerställa att datan verkligen uppdaterades
            setTimeout(() => {
              const currentLimit = useStore.getState().usageLimit;
              console.log('Verifierar användningsgräns efter uppdatering:', {
                total: currentLimit.total,
                limit: currentLimit.limit, 
                lastChecked: currentLimit.lastChecked
              });
              
              // Om uppdateringen inte tog, försök igen
              if (currentLimit.total !== analysesUsed) {
                console.warn('Användningsgräns uppdaterades inte korrekt, försöker igen...');
                // Försök uppdatera igen, men direkt
                setUsageLimit({
                  total: analysesUsed,
                  limit: analysesLimit,
                  remaining: isPremium ? 999 : Math.max(0, analysesLimit - analysesUsed),
                  isPremium: isPremium,
                  lastChecked: new Date().toISOString(),
                  loading: false
                });
              }
            }, 100);
            
            console.log('Usage limit refreshed successfully');
            const updatedLimit = useStore.getState().usageLimit;
            console.log('New usage values:', {
              total: updatedLimit.total,
              limit: updatedLimit.limit,
              remaining: updatedLimit.remaining
            });
            
            success = true;
            return true;
          } catch (retryError) {
            console.log(`Attempt ${attempt+1} failed:`, retryError);
            lastError = retryError;
            attempt++;
          }
        }
        
        if (!success) {
          throw lastError || new Error('Alla försök att uppdatera användningsgränsen misslyckades');
        }
      } catch (err) {
        console.error('Failed to refresh usage limit:', err);
        
        // Log to Sentry for server-side tracking
        captureException(err instanceof Error ? err : new Error(String(err)), {
          tags: { feature: 'usage_limit', userId: user.id },
          level: 'warning'
        });

        // Fall back to cached values if available
        const currentState = useStore.getState().usageLimit;
        if (currentState.lastChecked) {
          console.log('Using cached usage values:', {
            total: currentState.total,
            limit: currentState.limit,
            remaining: currentState.remaining
          });
          return true;
        }
        
        // Set default values if no cached data available
        if (!currentState.lastChecked) {
          console.log('Setting default usage values due to network failure');
          await fetchUsageLimit(user.id);
          return true;
        }
        
        return false;
      }
    } else {
      console.warn('Cannot refresh usage limit: No user ID available');
      return false;
    }
  }, [user, fetchUsageLimit, setUsageLimit]);

  // Kontrollera om vi behöver uppdatera användningsdata (äldre än 1 timme)
  const shouldRefresh = usageLimit.lastChecked
    ? new Date().getTime() - new Date(usageLimit.lastChecked).getTime() > 60 * 60 * 1000
    : true;
    
  useEffect(() => {
    let mounted = true;
    
    if (user?.id && shouldRefresh) {
      // Add some delay to ensure we don't hammer the API immediately on mount
      const timer = setTimeout(() => {
        if (mounted) {
          refreshUsageLimit().catch(err => {
            // Already logged in the function
            console.warn('Background refresh of usage limit failed:', 
              err instanceof Error ? err.message : String(err));
          });
        }
      }, 500);
      
      return () => {
        mounted = false;
        clearTimeout(timer);
      };
    }
    
    return () => {
      mounted = false;
    };
  }, [user, shouldRefresh, refreshUsageLimit]);

  // Beräkna återstående analyser
  const remaining = usageLimit.isPremium 
    ? Infinity 
    : Math.max(0, usageLimit.limit - usageLimit.total);
  
  // Kontrollera om användaren har nått sin gräns
  const hasReachedLimit = !usageLimit.isPremium && remaining <= 0;

  // Tvinga en omedelbar uppdatering från servern och ignorera cache
  const forceUpdate = useCallback(async () => {
    if (!user?.id) {
      console.warn('Cannot force update: No user ID available');
      return false;
    }
    
    console.log('Forcerar omedelbar uppdatering från servern för användar-ID:', user.id);
    
    try {
      // Rensa först gammal data från store för att undvika falsk framgångssignal
      setUsageLimit({
        loading: true,
        lastChecked: null
      });
      
      // Gör en fördröjning för att ge backend lite tid att uppdatera
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Anropa API direkt med striktare inställningar
      const response = await fetchWithRetry(`${BACKEND_URL}/usage/${user.id}?nocache=${Date.now()}`);
      const freshData = await response.json();
      
      console.log('Färsk data hämtad direkt från servern:', freshData);
      
      // Mappa om fältnamn om nödvändigt för att matcha vår modell
      const analysesUsed = freshData.analysesUsed !== undefined ? 
        freshData.analysesUsed : 
        (freshData.analyses_used !== undefined ? freshData.analyses_used : 0);
      
      const analysesLimit = freshData.analysesLimit !== undefined ? 
        freshData.analysesLimit : 
        (freshData.analyses_limit !== undefined ? freshData.analyses_limit : 2);
      
      const isPremium = freshData.isPremium !== undefined ? 
        freshData.isPremium : 
        (freshData.is_premium !== undefined ? freshData.is_premium : false);
      
      console.log('Uppdaterar store med färsk data:', { 
        total: analysesUsed, 
        limit: analysesLimit, 
        isPremium 
      });
      
      // Uppdatera store direkt
      useStore.setState(state => ({
        usageLimit: {
          ...state.usageLimit,
          total: analysesUsed,
          limit: analysesLimit,
          remaining: isPremium ? 999 : Math.max(0, analysesLimit - analysesUsed),
          isPremium: isPremium,
          loading: false,
          lastChecked: new Date().toISOString()
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Failed to force update usage limit:', error);
      
      // Logga till Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { feature: 'usage_limit_force_update', userId: user.id },
        level: 'warning'
      });
      
      // Återställ loading state
      setUsageLimit({
        loading: false
      });
      
      return false;
    }
  }, [user, setUsageLimit]);

  return {
    ...usageLimit,
    remaining,
    hasReachedLimit,
    refreshUsageLimit,
    forceUpdate
  };
}