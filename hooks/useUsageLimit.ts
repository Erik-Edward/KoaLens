// hooks/useUsageLimit.ts
import { useCallback, useEffect } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/providers/AuthProvider';
import { captureException, addBreadcrumb } from '@/lib/sentry';

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
  
  const refreshUsageLimit = useCallback(async () => {
    if (user?.id) {
      console.log('Refreshing usage limit for user:', user.id);
      try {
        // Kontrollera backend-anslutning först
        addBreadcrumb('Refreshing usage limit', 'api', { userId: user.id });

        // Använd fetchWithRetry istället för vanlig fetch
        const response = await fetchWithRetry(`${BACKEND_URL}/usage/${user.id}`);
        
        // Parse response
        const usageData = await response.json();
        console.log('Usage data received:', usageData);

        // Uppdatera store direkt med data från API-anropet
        // Detta är snabbare än att göra ett nytt anrop via fetchUsageLimit
        useStore.setState(state => ({
          usageLimit: {
            ...state.usageLimit,
            analysesUsed: usageData.analysesUsed,
            analysesLimit: usageData.analysesLimit,
            isPremium: usageData.isPremium || false,
            lastChecked: new Date().toISOString(),
            isLoading: false
          }
        }));
        
        console.log('Usage limit refreshed successfully');
        const updatedLimit = useStore.getState().usageLimit;
        console.log('New usage values:', {
          used: updatedLimit.analysesUsed,
          limit: updatedLimit.analysesLimit,
          remaining: updatedLimit.analysesLimit - updatedLimit.analysesUsed
        });
        
        return true;
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
            used: currentState.analysesUsed,
            limit: currentState.analysesLimit,
            remaining: currentState.analysesLimit - currentState.analysesUsed
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
  }, [user, fetchUsageLimit]);
  
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
    : Math.max(0, usageLimit.analysesLimit - usageLimit.analysesUsed);
  
  // Kontrollera om användaren har nått sin gräns
  const hasReachedLimit = !usageLimit.isPremium && remaining <= 0;
  
  return {
    ...usageLimit,
    remaining,
    hasReachedLimit,
    refreshUsageLimit
  };
}