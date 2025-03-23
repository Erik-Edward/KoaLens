// stores/types.ts
import { UserPreferences, WatchedIngredientFound } from '@/types/settingsTypes';
import { OnboardingSlice } from './slices/createOnboardingSlice';
import type { AvatarSlice as ImportedAvatarSlice } from './slices/createAvatarSlice';
import { VeganStatusSlice } from './slices/createVeganStatusSlice';
import { UsageLimitSlice } from './slices/createUsageLimitSlice';
import { UserSlice } from './slices/userSlice';
import { ProductSlice } from './slices/productSlice';
import type { Product } from '@/models/productModel';

// Definiera CounterState-interface för använding i stores
export interface CounterState {
  value: number;
  limit: number;
  remaining: number;
  hasReachedLimit: boolean;
  lastChecked: string | null;
  loading: boolean;
}

// Interface för CounterSlice i store
export interface CounterSlice {
  // Mappa counterName till counterState
  counters?: Record<string, CounterState>;
}

// User interface för auth
export interface User {
  id: string;
  email: string;
  lastLoginAt?: string; // Gör optional för att fungera med Supabase User
  // Andra fält från Supabase som kan vara användbara
  app_metadata?: any;
  user_metadata?: any;
  created_at?: string;
  updated_at?: string;
  email_confirmed_at?: string;
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

// Scanned product interface (för den äldre HistorySlice)
// Uppdaterad för att fungera som alias till Product när det behövs
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
  userId?: string; // Användar-ID som äger produkten, optional för bakåtkompatibilitet
}

// Type för att hantera blandade produkttyper
export type MixedProductArray = (Product | ScannedProduct)[];

// Modifiera HistorySlice för att hantera bakåtkompatibiliteten mellan Product och ScannedProduct
export interface HistorySlice {
  // Använd en kombination av typerna för att lösa typkompatibiliteten
  products: ScannedProduct[];
  getUserProducts: () => ScannedProduct[]; // Filtrerar produkter baserat på inloggad användare
  addProduct: (product: Omit<ScannedProduct, 'id' | 'timestamp' | 'isFavorite'>) => void;
  removeProduct: (id: string) => void;
  toggleFavorite: (id: string) => void;
  clearHistory: () => void;
  clearProductsWithoutUser: () => number; // Administrativ funktion för att rensa produkter utan användar-ID
}

// Settings slice interface
export interface SettingsSlice {
  preferences: UserPreferences;
  toggleWatchedIngredient: (ingredientKey: string) => void;
  resetPreferences: () => void;
}

// Exportera AvatarSlice som kommer från createAvatarSlice
export type { ImportedAvatarSlice as AvatarSlice };

// Interface för analytics slice
export interface AnalyticsSlice {
  analyticsUsage: any;
  analyticsLoading: boolean;
  analyticsError: string | null;
  pendingAnalyses: { userId: string; timestamp: string }[];
  initializeAnalytics: (userId: string) => Promise<boolean>;
  canPerformAnalysis: (userId: string) => Promise<any>;
  recordAnalysis: (userId: string) => Promise<boolean>;
  recordPendingAnalysis: (userId: string) => boolean;
  syncPendingAnalyses: (userId: string) => Promise<boolean>;
}

// Kombinerad store-typ som innehåller alla slices
export type StoreState = Omit<
  AuthSlice & 
  SettingsSlice & 
  Omit<HistorySlice, 'products'> & 
  OnboardingSlice &
  ImportedAvatarSlice &
  VeganStatusSlice &
  UsageLimitSlice &
  UserSlice &
  Omit<ProductSlice, 'products'> &
  AnalyticsSlice &
  CounterSlice, 
  'products'
> & {
  products: MixedProductArray;
};