// stores/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreState } from './types';
import { createAuthSlice } from './slices/createAuthSlice';
import { createSettingsSlice } from './slices/createSettingsSlice';
import { createHistorySlice } from './slices/createHistorySlice';
import { createOnboardingSlice } from './slices/createOnboardingSlice';
import { createAvatarSlice } from './slices/createAvatarSlice';
import { createVeganStatusSlice } from './slices/createVeganStatusSlice';
import { createUsageLimitSlice } from './slices/createUsageLimitSlice';
import { createUserSlice } from './slices/userSlice';
import { createProductSlice } from './slices/productSlice';
import { Product } from '@/models/productModel';
import { ScannedProduct } from './types';

const STORE_VERSION = 1;

interface PersistedState {
  preferences?: StoreState['preferences'];
  products?: StoreState['products'];
  onboarding?: StoreState['onboarding'];
  avatar?: StoreState['avatar'];
  veganStatus?: StoreState['veganStatus'];
  usageLimit?: StoreState['usageLimit'];
  userId?: StoreState['userId'];
}

// Helper för typkonvertering mellan Product och ScannedProduct
type CompatibleStore = Omit<StoreState, 'products'> & {
  products: (Product | ScannedProduct)[];
};

// Skapa store med vår kombinerare
export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createSettingsSlice(...a),
      ...createHistorySlice(...a),
      ...createOnboardingSlice(...a),
      ...createAvatarSlice(...a),
      ...createVeganStatusSlice(...a),
      ...createUsageLimitSlice(...a),
      ...createUserSlice(...a),
      ...createProductSlice(...a),
    } as unknown as StoreState), // Använd en dubbelkonvertering för att kringgå typkonflikten
    {
      name: 'koalens-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        preferences: state.preferences,
        products: state.products,
        onboarding: {
          ...state.onboarding,
          hasCompletedOnboarding: false
        },
        avatar: state.avatar,
        veganStatus: state.veganStatus,
        usageLimit: {
          ...state.usageLimit,
          loading: false
        },
        userId: state.userId
      }),
      version: STORE_VERSION,
      migrate: (persistedState: unknown, version: number) => {
        console.log('Migrating store from version:', version, 'to version:', STORE_VERSION);
        
        const isValidPersistedState = (state: unknown): state is PersistedState => {
          const s = state as PersistedState;
          return typeof state === 'object' && state !== null;
        };

        if (version < STORE_VERSION) {
          const migratedState = {
            ...(isValidPersistedState(persistedState) ? persistedState : {}),
            onboarding: {
              currentStep: 0,
              hasAcceptedDisclaimer: false,
              hasCompletedOnboarding: false
            },
            avatar: {
              style: 'cute',
              id: null,
              veganYears: 0
            },
            veganStatus: {
              status: null
            }
          };
          return migratedState;
        }
        
        return isValidPersistedState(persistedState) ? persistedState : {};
      }
    }
  )
);