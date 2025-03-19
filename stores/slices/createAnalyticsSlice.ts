import { StateCreator } from 'zustand';
import { StoreState, AnalyticsSlice } from '../types';
import * as analyticsAdapter from '../analytics-adapter';
import { captureException } from '@/lib/sentry';

// Skapa en adapter för att ansluta gamla slicen med nya implementationen
export const createAnalyticsSlice: StateCreator<
  StoreState, 
  [], 
  [], 
  AnalyticsSlice
> = (set, get) => ({
  // Status för analysanvändning
  analyticsUsage: null,
  analyticsLoading: false,
  analyticsError: null,
  pendingAnalyses: [],

  // Initialiserar eller hämtar analysstatistik för en användare
  initializeAnalytics: async (userId) => {
    try {
      set({ analyticsLoading: true, analyticsError: null });
      console.log("Initierar analytics för", userId);
      
      if (!userId) {
        console.warn("Försöker initialisera analytics utan användar-ID");
        set({ analyticsUsage: null, analyticsLoading: false });
        return false;
      }
      
      // Använd adapter
      const success = await analyticsAdapter.initializeAnalytics(userId);
      
      if (success) {
        // Returnera true - vi behöver inte sätta analyticsUsage eftersom det hanteras
        // i adaptern direkt
        set({ analyticsLoading: false });
      } else {
        set({ 
          analyticsError: "Kunde inte hämta analysdata", 
          analyticsLoading: false 
        });
      }
      
      return success;
    } catch (error) {
      console.error("Fel vid initialisering av analytics:", error);
      set({ 
        analyticsError: "Kunde inte hämta analysdata", 
        analyticsLoading: false 
      });
      captureException(error instanceof Error ? error : new Error('Failed to initialize analytics'));
      return false;
    }
  },

  // Kontrollerar om en användare kan utföra ytterligare en analys
  canPerformAnalysis: async (userId) => {
    try {
      return await analyticsAdapter.canPerformAnalysis(userId);
    } catch (error) {
      console.error("Fel vid kontroll av analysbegränsning:", error);
      captureException(error instanceof Error ? error : new Error('Error checking analysis limits'));
      
      // Returnera default-värden
      return {
        allowed: true, // Tillåt som fallback
        remaining: 99, // Stort antal kvar för att inte blockera
        limit: 100,
        reasons: ["Fel vid kontroll av begränsning"]
      };
    }
  },

  // Registrerar en ny analys
  recordAnalysis: async (userId) => {
    try {
      return await analyticsAdapter.recordAnalysis(userId);
    } catch (error) {
      console.error("Fel vid registrering av analys:", error);
      captureException(error instanceof Error ? error : new Error('Error recording analysis'));
      return false;
    }
  },

  // Registrera en analys som väntar på synkronisering
  recordPendingAnalysis: (userId) => {
    try {
      return analyticsAdapter.recordPendingAnalysis(userId);
    } catch (error) {
      console.error("Fel vid registrering av väntande analys:", error);
      captureException(error instanceof Error ? error : new Error('Error recording pending analysis'));
      return false;
    }
  },

  // Synkronisera väntande analyser
  syncPendingAnalyses: async (userId) => {
    try {
      return await analyticsAdapter.syncPendingAnalyses(userId);
    } catch (error) {
      console.error("Fel vid synkronisering av väntande analyser:", error);
      captureException(error instanceof Error ? error : new Error('Error syncing pending analyses'));
      return false;
    }
  }
}); 