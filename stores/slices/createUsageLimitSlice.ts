// stores/slices/createUsageLimitSlice.ts
// NOTICE: Detta är en tomm implementation som finns kvar av bakåtkompatibilitetsskäl
// Använd useCounter hooket istället för usageLimit
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
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
  limit: 15,
  remaining: 15,
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
  UsageLimitSlice
> = (set, get) => ({
  usageLimit: initialState,

  setUsageLimit: (usageData: Partial<UsageLimitState>) => {
    console.log('OBS: setUsageLimit anropad, men detta är en tom implementation - använd useCounter istället');
    // Gör ingenting
  },

  fetchUsageLimit: async (userId: string) => {
    console.log('OBS: fetchUsageLimit anropad, men detta är en tom implementation - använd useCounter istället');
    return true;
  },

  resetUsageLimit: () => {
    console.log('OBS: resetUsageLimit anropad, men detta är en tom implementation - använd useCounter istället');
    // Gör ingenting
  },

  refreshUsageLimit: (data: Partial<UsageLimitState>) => {
    console.log('OBS: refreshUsageLimit anropad, men detta är en tom implementation - använd useCounter istället');
    // Gör ingenting
  }
});