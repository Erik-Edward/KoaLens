/**
 * Adapter för att låta gamla useStore använda nya counter
 * Detta är ett övergångslager som kommer tas bort när migrationen är klar
 */

import { useCounter } from '@/hooks/useCounter';
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

// Skapa ett litet lokalt store för cache
const analyticsCache = createStore<{
  usageStatus: any;
  setUsageStatus: (status: any) => void;
}>((set) => ({
  usageStatus: null,
  setUsageStatus: (status) => set({ usageStatus: status })
}));

// Hjälpfunktion för att anropa backend API direkt
const fetchCounter = async (userId: string, counterName: string = 'analysis_count') => {
  try {
    const BACKEND_URL = 'https://koalens-backend.fly.dev';
    const response = await fetch(`${BACKEND_URL}/api/counters/${userId}/${counterName}`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error fetching counter:', error);
    return null;
  }
};

// Hjälpfunktion för att inkrementera counter direkt
const incrementCounter = async (userId: string, counterName: string = 'analysis_count', increment: number = 1) => {
  try {
    const BACKEND_URL = 'https://koalens-backend.fly.dev';
    const response = await fetch(
      `${BACKEND_URL}/api/counters/${userId}/${counterName}/increment`, 
      {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ increment })
      }
    );
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error('Error incrementing counter:', error);
    return null;
  }
};

/**
 * Initialisera analytics för en användare
 */
export async function initializeAnalytics(userId: string): Promise<boolean> {
  try {
    if (!userId) return false;
    
    // Hämta counter status
    const counterData = await fetchCounter(userId);
    
    if (!counterData) return false;
    
    // Konvertera counter format till analytics format
    const status = {
      allowed: !counterData.has_reached_limit,
      reason: counterData.has_reached_limit ? 'Limit reached' : '',
      remaining: counterData.remaining,
      total: counterData.value,
      limit: counterData.limit
    };
    
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
    const counterData = await fetchCounter(userId);
    
    if (!counterData) {
      // Returnera default-värden
      return {
        allowed: true,
        reason: 'Kunde inte hämta data',
        remaining: 15,
        total: 0,
        limit: 15
      };
    }
    
    // Konvertera counter format till analytics format
    const status = {
      allowed: !counterData.has_reached_limit,
      reason: counterData.has_reached_limit ? 'Limit reached' : '',
      remaining: counterData.remaining,
      total: counterData.value,
      limit: counterData.limit
    };
    
    // Spara i cachen
    analyticsCache.getState().setUsageStatus(status);
    
    return status;
  } catch (error) {
    console.error('Fel vid kontroll av analysgräns via adapter:', error);
    
    // Returnera default-värden
    return {
      allowed: true,
      reason: 'Fel vid kontroll',
      remaining: 15,
      total: 0,
      limit: 15
    };
  }
}

/**
 * Registrera en ny analys
 */
export async function recordAnalysis(userId: string): Promise<boolean> {
  try {
    const result = await incrementCounter(userId);
    
    if (!result) return false;
    
    // Uppdatera cachat status
    analyticsCache.getState().setUsageStatus({
      allowed: !result.has_reached_limit,
      reason: result.has_reached_limit ? 'Limit reached' : '',
      remaining: result.remaining,
      total: result.value,
      limit: result.limit
    });
    
    return true;
  } catch (error) {
    console.error('Fel vid registrering av analys via adapter:', error);
    return false;
  }
}

/**
 * Registrera en väntande analys för offline-användning
 * I det nya systemet behövs inte denna funktion, vi ökar direkt
 */
export function recordPendingAnalysis(userId: string): boolean {
  try {
    // Direkt ökning om möjligt, annars ignorera
    if (navigator.onLine) {
      incrementCounter(userId).catch(console.error);
    }
    return true;
  } catch (error) {
    console.error('Fel vid registrering av väntande analys via adapter:', error);
    return false;
  }
}

/**
 * Synkronisera väntande analyser
 * I det nya systemet behövs inte denna funktion
 */
export async function syncPendingAnalyses(userId: string): Promise<boolean> {
  try {
    // Vi behöver bara uppdatera status nu
    const counterData = await fetchCounter(userId);
    
    if (counterData) {
      // Uppdatera cache efter synkronisering
      analyticsCache.getState().setUsageStatus({
        allowed: !counterData.has_reached_limit,
        reason: counterData.has_reached_limit ? 'Limit reached' : '',
        remaining: counterData.remaining,
        total: counterData.value,
        limit: counterData.limit
      });
    }
    
    return true;
  } catch (error) {
    console.error('Fel vid synkronisering via adapter:', error);
    return false;
  }
} 