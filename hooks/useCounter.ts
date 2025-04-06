/**
 * Hook för att använda counter-API:et
 * Detta är en ny implementation som ersätter useAnalytics/useUsageLimit
 */
import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { useStore } from '@/stores/useStore';
import * as Sentry from "@sentry/react-native";
import { captureException } from '@/lib/sentry';
import { CounterState } from '@/stores/types';

// Använd samma BACKEND_URL som i andra services
const BACKEND_URL = 'https://koalens-backend.fly.dev';

// Interface för counter information
export interface CounterInfo {
  counter_id: string;
  user_id: string;
  counter_name: string;
  value: number;
  limit: number;
  remaining: number;
  is_limited: boolean;
  has_reached_limit: boolean;
  reset_frequency: 'daily' | 'weekly' | 'monthly' | 'never';
  last_reset: string;
  next_reset: string | null;
}

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

/**
 * Hook för att hantera en specifik räknare
 * @param counterName Namnet på räknaren (t.ex. 'analysis_count')
 */
export function useCounter(counterName: string = 'analysis_count') {
  const { user } = useAuth();
  const userId = user?.id;
  
  // Defaultvärden för counter state om det inte finns i store
  const defaultCounterState: CounterState = {
    value: 0,
    limit: 15,
    remaining: 15,
    hasReachedLimit: false,
    lastChecked: null,
    loading: false
  };
  
  // Använd store för att spara counter state
  const counterState = useStore(state => 
    state.counters?.[counterName] || defaultCounterState
  );
  
  // Hämta räknarens information från backend
  const fetchCounter = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      console.warn('Cannot fetch counter: No user ID available');
      return null;
    }
    
    // Om vi nyligen har kollat och inte behöver tvinga en uppdatering, använd cache
    const lastChecked = counterState.lastChecked ? new Date(counterState.lastChecked) : null;
    const cacheValid = lastChecked && (new Date().getTime() - lastChecked.getTime() < 60 * 1000); // 1 minut cache
    
    if (cacheValid && !forceRefresh) {
      console.log('Using cached counter data');
      return counterState;
    }
    
    console.log('Fetching counter data for:', userId, counterName);
    
    try {
      // Uppdatera loading state
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            ...((state.counters || {})[counterName] || defaultCounterState),
            loading: true
          }
        }
      }));
      
      // Fetch counter data
      const response = await fetchWithRetry(`${BACKEND_URL}/api/counters/${userId}/${counterName}`);
      const data = await response.json() as CounterInfo;
      
      // Uppdatera store med nya data
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            value: data.value,
            limit: data.limit,
            remaining: data.remaining,
            hasReachedLimit: data.has_reached_limit,
            lastChecked: new Date().toISOString(),
            loading: false
          }
        }
      }));
      
      return data;
    } catch (error) {
      console.error('Error fetching counter:', error);
      
      // Rapportera till Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { 
          feature: 'counter',
          counterName,
          userId
        }
      });
      
      // Uppdatera loading state
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            ...((state.counters || {})[counterName] || defaultCounterState),
            loading: false
          }
        }
      }));
      
      return null;
    }
  }, [userId, counterName, counterState]);
  
  // Öka räknaren
  const incrementCounter = useCallback(async (increment: number = 1) => {
    if (!userId) {
      console.warn('Cannot increment counter: No user ID available');
      return false;
    }
    
    console.log(`Incrementing "${counterName}" counter for user:`, userId);
    
    try {
      // Gör en direkt uppdatering av store för bättre UX (optimistic update)
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            ...((state.counters || {})[counterName] || defaultCounterState),
            value: (state.counters?.[counterName]?.value || 0) + increment,
            remaining: Math.max(0, (state.counters?.[counterName]?.remaining || 15) - increment),
            loading: true
          }
        }
      }));
      
      // Anropa API för att öka räknaren
      const response = await fetchWithRetry(
        `${BACKEND_URL}/api/counters/${userId}/${counterName}/increment`, 
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ increment })
        }
      );
      
      const data = await response.json() as CounterInfo;
      
      // Uppdatera store med bekräftad data från server
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            value: data.value,
            limit: data.limit,
            remaining: data.remaining,
            hasReachedLimit: data.has_reached_limit,
            lastChecked: new Date().toISOString(),
            loading: false
          }
        }
      }));
      
      return true;
    } catch (error) {
      console.error('Error incrementing counter:', error);
      
      // Rapportera till Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { 
          feature: 'counter_increment',
          counterName,
          userId
        }
      });
      
      // Återställ loading state
      useStore.setState(state => ({
        ...state,
        counters: {
          ...state.counters,
          [counterName]: {
            ...((state.counters || {})[counterName] || defaultCounterState),
            loading: false
          }
        }
      }));
      
      return false;
    }
  }, [userId, counterName]);
  
  // Kontrollera om användaren kan utföra en operation baserat på räknargränsen
  const canPerformOperation = useCallback(async () => {
    if (!userId) {
      console.warn('Cannot check operation permission: No user ID available');
      // Tillåt alltid om userId inte finns (t.ex. om användaren inte är inloggad)
      return { 
        allowed: true,
        reason: 'No user ID available',
        value: 0,
        limit: 15,
        remaining: 15
      };
    }
    
    try {
      // Hämta aktuell räknarinfo
      const counterInfo = await fetchCounter();
      
      // Om vi inte kunde hämta data, tillåt operation som fallback
      if (!counterInfo) {
        return { 
          allowed: true,
          reason: 'Could not check limit',
          value: counterState.value,
          limit: counterState.limit,
          remaining: counterState.remaining
        };
      }
      
      // Kontrollera om det är CounterInfo eller CounterState
      const hasReachedLimit = 'has_reached_limit' in counterInfo 
        ? counterInfo.has_reached_limit 
        : counterInfo.hasReachedLimit;
        
      const allowed = !hasReachedLimit;
      
      return {
        allowed,
        reason: allowed ? '' : 'Counter limit reached',
        value: counterInfo.value,
        limit: counterInfo.limit,
        remaining: counterInfo.remaining
      };
    } catch (error) {
      console.error('Error checking operation permission:', error);
      
      // Rapportera till Sentry
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: { 
          feature: 'counter_permission',
          counterName,
          userId
        }
      });
      
      // Tillåt alltid vid fel
      return { 
        allowed: true,
        reason: 'Error checking limit',
        value: counterState.value,
        limit: counterState.limit,
        remaining: counterState.remaining
      };
    }
  }, [userId, counterName, fetchCounter, counterState]);
  
  // Ladda räknardata vid mount
  useEffect(() => {
    if (userId) {
      // Lägg till en flag för att endast köra detta en gång per mount
      const loadData = async () => {
        try {
          // Tvinga alltid en uppdatering vid mount för att säkerställa färsk data
          console.log('Forcing counter fetch on mount for:', userId, counterName);
          await fetchCounter(true); // forceRefresh = true
        } catch (err) {
          console.error('Failed to fetch counter data on mount:', err);
        }
      };
      
      loadData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]); // Ta bort fetchCounter från beroenden för att undvika oändlig loop
  
  return {
    // State
    value: counterState.value,
    limit: counterState.limit,
    remaining: counterState.remaining,
    hasReachedLimit: counterState.hasReachedLimit,
    loading: counterState.loading,
    
    // Funktioner
    fetchCounter,
    incrementCounter,
    canPerformOperation,
    
    // Kortare alias-funktioner för bakåtkompatibilitet med useAnalytics
    recordAnalysis: () => incrementCounter(1),
    checkLimit: canPerformOperation
  };
} 