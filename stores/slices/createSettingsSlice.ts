// stores/slices/createSettingsSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { UserPreferences } from '@/types/settingsTypes';

const defaultWatchedIngredients = {
  palmolja: {
    name: 'Palmolja',
    enabled: false,
    description: 'Bidrar ofta till regnskogsskövling och förlust av biologisk mångfald. Palmolja producerad inom EU anses vara mer hållbar eftersom produktionen inte är kopplad till avskogning.'
  },
  kokosolja: {
    name: 'Kokosolja',
    enabled: false,
    description: 'Kan ha liknande miljöpåverkan som palmolja vid storskalig produktion'
  },
  soja: {
    name: 'Soja',
    enabled: false,
    description: 'Kan vara kopplad till avskogning om den inte är certifierad'
  }
};

const defaultPreferences: UserPreferences = {
  watchedIngredients: defaultWatchedIngredients
};

export interface SettingsSlice {
  preferences: UserPreferences;
  toggleWatchedIngredient: (ingredientKey: string) => void;
  resetPreferences: () => void;
}

export const createSettingsSlice: StateCreator<StoreState, [], [], SettingsSlice> = (set) => ({
  preferences: defaultPreferences,

  toggleWatchedIngredient: (ingredientKey: string) =>
    set((state) => {
      if (!state.preferences.watchedIngredients[ingredientKey]) {
        console.warn(`Ingredient ${ingredientKey} not found in watched ingredients`);
        return state;
      }

      return {
        preferences: {
          ...state.preferences,
          watchedIngredients: {
            ...state.preferences.watchedIngredients,
            [ingredientKey]: {
              ...state.preferences.watchedIngredients[ingredientKey],
              enabled: !state.preferences.watchedIngredients[ingredientKey].enabled,
            },
          },
        },
      };
    }),

  resetPreferences: () => set({ preferences: defaultPreferences }),
});