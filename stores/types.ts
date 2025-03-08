// stores/types.ts
import { UserPreferences, WatchedIngredientFound } from '@/types/settingsTypes';
import { OnboardingSlice } from './slices/createOnboardingSlice';
import type { AvatarSlice as ImportedAvatarSlice } from './slices/createAvatarSlice';
import { VeganStatusSlice } from './slices/createVeganStatusSlice';
import { UsageLimitSlice } from './slices/createUsageLimitSlice';

// User interface för auth
export interface User {
  id: string;
  email: string;
  lastLoginAt: string;
}

// Auth slice interface
export interface AuthSlice {
  user: User | null;
  session: string | null;
  isAuthenticated: boolean;
  login: (user: User, session: string) => void;
  logout: () => void;
  updateSession: (session: string) => void;
}

// Scanned product interface
export interface ScannedProduct {
  id: string;
  timestamp: string;
  imageUri: string;
  isVegan: boolean;
  confidence: number;
  nonVeganIngredients: string[];
  allIngredients: string[];
  reasoning: string;
  isFavorite: boolean;
  watchedIngredientsFound: WatchedIngredientFound[];
}

// History slice interface
export interface HistorySlice {
  products: ScannedProduct[];
  addProduct: (product: Omit<ScannedProduct, 'id' | 'timestamp' | 'isFavorite'>) => void;
  removeProduct: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
}

// Settings slice interface
export interface SettingsSlice {
  preferences: UserPreferences;
  toggleWatchedIngredient: (ingredientKey: string) => void;
  resetPreferences: () => void;
}

// Exportera AvatarSlice som kommer från createAvatarSlice
export type { ImportedAvatarSlice as AvatarSlice };

// Kombinerad store-typ som innehåller alla slices
export type StoreState = AuthSlice & 
  SettingsSlice & 
  HistorySlice & 
  OnboardingSlice &
  ImportedAvatarSlice &
  VeganStatusSlice &
  UsageLimitSlice;