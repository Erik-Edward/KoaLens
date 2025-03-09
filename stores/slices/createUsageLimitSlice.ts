// stores/slices/createUsageLimitSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { BACKEND_URL } from '@/constants/config';
import { supabase } from '@/lib/supabase';

export interface UsageLimitState {
  analysesUsed: number;
  analysesLimit: number;
  isPremium: boolean;
  lastChecked: string | null; // ISO tidsstämpel-sträng
  isLoading: boolean;
}

export interface UsageLimitSlice {
  usageLimit: UsageLimitState;
  setUsageLimit: (usageData: Partial<UsageLimitState>) => void;
  fetchUsageLimit: (userId: string) => Promise<void>;
  resetUsageLimit: () => void;
}

const initialState: UsageLimitState = {
  analysesUsed: 0,
  analysesLimit: 2,
  isPremium: false,
  lastChecked: null,
  isLoading: false
};

export const createUsageLimitSlice: StateCreator<
  StoreState,
  [],
  [],
  UsageLimitSlice
> = (set, get) => ({
  usageLimit: initialState,
  
  setUsageLimit: (usageData) => {
    set((state) => ({
      usageLimit: {
        ...state.usageLimit,
        ...usageData
      }
    }));
  },

  fetchUsageLimit: async (userId) => {
    if (!userId) return;
    
    try {
      set((state) => ({
        usageLimit: {
          ...state.usageLimit,
          isLoading: true
        }
      }));
      
      console.log(`Fetching usage for user: ${userId}`);
      const response = await fetch(`${BACKEND_URL}/usage/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        console.error('API error:', errorData);
        throw new Error(errorData.message || 'Kunde inte hämta användningsdata');
      }
      
      const usageData = await response.json();
      console.log('Usage data received:', usageData);
      
      set((state) => {
        console.log('Updating store with usage data:', usageData);
        return {
          usageLimit: {
            ...state.usageLimit,
            analysesUsed: usageData.analysesUsed,
            analysesLimit: usageData.analysesLimit,
            isPremium: usageData.isPremium,
            lastChecked: new Date().toISOString(),
            isLoading: false
          }
        };
      });
      
      // Använd get() för att få tillgång till uppdaterat tillstånd
      const currentState = get();
      console.log('Store state after update:', currentState.usageLimit);
    } catch (error) {
      console.error('Fel vid hämtning av användningsgräns:', error);
      set((state) => ({
        usageLimit: {
          ...state.usageLimit,
          isLoading: false
        }
      }));
    }
  },

  resetUsageLimit: () => {
    set({ usageLimit: initialState });
  }
});