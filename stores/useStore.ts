// stores/useStore.ts
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StoreState } from './types';
import { createAuthSlice } from './slices/createAuthSlice';
import { createSettingsSlice, defaultWatchedIngredients } from './slices/createSettingsSlice';
import { createHistorySlice } from './slices/createHistorySlice';
import { createOnboardingSlice } from './slices/createOnboardingSlice';
import { createAvatarSlice } from './slices/createAvatarSlice';
import { createVeganStatusSlice } from './slices/createVeganStatusSlice';
import { createUsageLimitSlice } from './slices/createUsageLimitSlice';
import { createUserSlice } from './slices/userSlice';
import { createProductSlice } from './slices/productSlice';
import { Product } from '@/models/productModel';
import { ScannedProduct } from './types';
import { WatchedIngredient } from '@/types/settingsTypes';

const STORE_VERSION = 1;

interface PersistedState {
  preferences?: StoreState['preferences'];
  products?: StoreState['products'];
  onboarding?: StoreState['onboarding'];
  avatar?: StoreState['avatar'];
  veganStatus?: StoreState['veganStatus'];
  usageLimit?: StoreState['usageLimit'];
  userId?: StoreState['userId'];
  counters?: StoreState['counters'];
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
      // Initiera counters med ett tomt objekt
      counters: {},
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
        userId: state.userId,
        counters: state.counters
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
      },
      merge: (persistedState, currentState) => {
        console.log('[Merge] Merging persisted state with current state.');
        const typedPersistedState = persistedState as PersistedState;

        // --- Merge logic for watchedIngredients --- 
        const currentDefaultIngredients = defaultWatchedIngredients; // Default list from settings slice
        const persistedWatchedIngredients = typedPersistedState.preferences?.watchedIngredients || {};
        const mergedWatchedIngredients: { [key: string]: WatchedIngredient } = {};

        // Iterate over the definitive default list
        Object.keys(currentDefaultIngredients).forEach(key => {
          const defaultIngredient = currentDefaultIngredients[key];
          const persistedIngredient = persistedWatchedIngredients[key];

          if (persistedIngredient) {
            // Ingredient exists in persisted state, use it (keeps user's enabled status)
            // Optional: Add a check here to ensure persistedIngredient structure is valid?
             mergedWatchedIngredients[key] = persistedIngredient;
          } else {
            // Ingredient is new (or was missing), use the default
            mergedWatchedIngredients[key] = defaultIngredient;
          }
        });
        console.log(`[Merge] Watched ingredients merged. Total keys: ${Object.keys(mergedWatchedIngredients).length}`);
        // --- End merge logic for watchedIngredients ---

        // Merge the rest of the state (simple shallow merge for this example)
        // Important: This assumes other parts of the state don't need deep merging.
        // If they do, more specific merge logic is needed for them too.
        const mergedState = {
            ...currentState, // Start with the current app state (slices' initial states)
            ...(persistedState as object), // Overwrite with persisted values (shallow)
            // ** Explicitly set the merged preferences **
            preferences: {
                 ...(currentState.preferences || {}),
                 ...(typedPersistedState.preferences || {}),
                 watchedIngredients: mergedWatchedIngredients, // Use the carefully merged watched ingredients
            },
            // Example: Ensure specific non-primitive substates are handled if needed
             onboarding: { 
                 ...(currentState.onboarding || {}), 
                 ...(typedPersistedState.onboarding || {}), 
             },
             // Add similar logic for other complex slices if necessary
        };

        // Remove potential undefined keys that might come from persisted state
        Object.keys(mergedState).forEach(key => {
            if ((mergedState as any)[key] === undefined) {
                delete (mergedState as any)[key];
            }
        });

        console.log('[Merge] State merge complete.');
        return mergedState as StoreState;
      },
    }
  )
);