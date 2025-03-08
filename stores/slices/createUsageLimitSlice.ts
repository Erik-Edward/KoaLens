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
      
      const response = await fetch(`${BACKEND_URL}/usage/${userId}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Kunde inte hämta användningsdata');
      }
      
      const usageData = await response.json();
      
      set((state) => ({
        usageLimit: {
          ...state.usageLimit,
          analysesUsed: usageData.analysesUsed,
          analysesLimit: usageData.analysesLimit,
          isPremium: usageData.isPremium,
          lastChecked: new Date().toISOString(),
          isLoading: false
        }
      }));
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