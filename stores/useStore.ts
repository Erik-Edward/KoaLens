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

const STORE_VERSION = 1;

interface PersistedState {
  preferences?: StoreState['preferences'];
  products?: StoreState['products'];
  onboarding?: StoreState['onboarding'];
  avatar?: StoreState['avatar'];
  veganStatus?: StoreState['veganStatus'];
}

export const useStore = create<StoreState>()(
  persist(
    (...a) => ({
      ...createAuthSlice(...a),
      ...createSettingsSlice(...a),
      ...createHistorySlice(...a),
      ...createOnboardingSlice(...a),
      ...createAvatarSlice(...a),
      ...createVeganStatusSlice(...a),
    }),
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
        veganStatus: state.veganStatus
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