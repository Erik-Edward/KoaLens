// stores/slices/createUsageLimitSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { BACKEND_URL, API_BASE_URL } from '@/constants/config';
import { supabase } from '@/lib/supabase';
import { captureException } from '@/lib/sentry';
import type { StoreState as AppState } from '../types';

export interface UsageLimitState {
  total: number;
  limit: number;
  remaining: number;
  isPremium: boolean;
  loading: boolean;
  lastChecked: string | null; 
}

export interface UsageLimitSlice {
  usageLimit: UsageLimitState;
  setUsageLimit: (usageData: Partial<UsageLimitState>) => void;
  fetchUsageLimit: (userId: string) => Promise<boolean>;
  resetUsageLimit: () => void;
  refreshUsageLimit: (data: Partial<UsageLimitState>) => void;
}

const initialState: UsageLimitState = {
  total: 0,
  limit: 2,
  remaining: 2,
  isPremium: false,
  loading: false,
  lastChecked: null
};

export interface UsageLimitActions {
  fetchUsageLimit: (userId: string) => Promise<boolean>;
  refreshUsageLimit: (data: Partial<UsageLimitState>) => void;
}

export const createUsageLimitSlice: StateCreator<
  AppState,
  [],
  [],
  UsageLimitState & UsageLimitActions
> = (set, get) => ({
  ...initialState,

  setUsageLimit: (usageData: Partial<UsageLimitState>) => {
    set((state: AppState) => ({
      usageLimit: {
        ...state.usageLimit,
        ...usageData
      }
    }));
  },

  fetchUsageLimit: async (userId: string) => {
    try {
      set((state: AppState) => ({ 
        usageLimit: { ...state.usageLimit, loading: true } 
      }));
      
      console.log(`Fetching usage data for user: ${userId}`);
      const response = await fetch(`${BACKEND_URL}/usage/${userId}`);
      
      if (!response.ok) {
        throw new Error(`Error fetching usage limit: ${response.status}`);
      }
      
      const usageData = await response.json();
      console.log('Usage data received from API:', usageData);
      
      // Hantera båda formaten - camelCase och snake_case
      const analysesUsed = usageData.analysesUsed !== undefined 
        ? usageData.analysesUsed 
        : usageData.analyses_used || 0;
      
      const analysesLimit = usageData.analysesLimit !== undefined 
        ? usageData.analysesLimit 
        : usageData.analyses_limit || 2;
      
      const isPremium = usageData.isPremium !== undefined 
        ? usageData.isPremium 
        : usageData.is_premium || false;
      
      const remaining = isPremium ? 999 : Math.max(0, analysesLimit - analysesUsed);
      
      console.log('Mapped usage values:', { 
        total: analysesUsed, 
        limit: analysesLimit, 
        remaining, 
        isPremium,
        lastChecked: new Date().toISOString() 
      });
      
      // Uppdatera store med de nya värdena
      set((state: AppState) => ({
        usageLimit: {
          ...state.usageLimit,
          total: analysesUsed,
          limit: analysesLimit,
          remaining: remaining,
          isPremium: isPremium,
          loading: false,
          lastChecked: new Date().toISOString()
        }
      }));
      
      // Verifiera att uppdateringen genomfördes
      setTimeout(() => {
        const currentState = get().usageLimit;
        console.log('Verifying store update:', {
          total: currentState.total,
          limit: currentState.limit,
          remaining: currentState.remaining
        });
      }, 100);
      
      return true;
    } catch (error) {
      console.error('Failed to fetch usage limit:', error);
      if (error instanceof Error) {
        captureException(error);
      }
      
      set((state: AppState) => ({
        usageLimit: {
          ...state.usageLimit,
          loading: false
        }
      }));
      
      return false;
    }
  },

  resetUsageLimit: () => {
    set({ usageLimit: initialState });
  },

  refreshUsageLimit: (data: Partial<UsageLimitState>) => {
    set((state: AppState) => ({
      usageLimit: {
        ...state.usageLimit,
        ...data,
        lastChecked: new Date().toISOString()
      }
    }));
  }
});