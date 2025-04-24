// stores/slices/createSettingsSlice.ts
import { StateCreator } from 'zustand';
import { StoreState } from '../types';
import { UserPreferences, WatchedIngredient, IngredientCategory } from '@/types/settingsTypes';

// Define the type for the map using string keys and WatchedIngredient values
type WatchedIngredientMap = { [key: string]: WatchedIngredient };

export const defaultWatchedIngredients: WatchedIngredientMap = {
  // Miljö & Etik
  palmolja: {
    name: 'Palmolja',
    enabled: false,
    description: 'Bidrar ofta till regnskogsskövling och förlust av biologisk mångfald. Certifierad palmolja (t.ex. RSPO) har mindre negativ påverkan.',
    category: 'Miljö & Etik',
    keywords: ['palmolja', 'palmfett']
  },
  kokosolja: {
    name: 'Kokosolja',
    enabled: false,
    description: 'Kan ha miljöpåverkan vid storskalig produktion, men anses ofta vara ett bättre alternativ än icke-certifierad palmolja.',
    category: 'Miljö & Etik',
    keywords: ['kokosolja', 'kokosfett']
  },
  soja: {
    name: 'Soja',
    enabled: false,
    description: 'Odling av soja kan vara kopplad till avskogning, särskilt i Sydamerika. Välj certifierad eller lokalt odlad soja för mindre miljöpåverkan.',
    category: 'Miljö & Etik',
    keywords: ['soja', 'sojaprotein', 'sojalecitin'] // Kan utökas
  },
  // Allergener & Intoleranser
  gluten: {
    name: 'Gluten (Vete, Korn, Råg)',
    enabled: false,
    description: 'Protein som finns i vete, korn och råg. Måste undvikas vid celiaki och kan ge besvär vid glutenintolerans. Havre kan vara kontaminerat.',
    category: 'Allergener & Intoleranser',
    keywords: ['gluten', 'vete', 'korn', 'råg', 'malt', 'dinkel', 'kamut', 'durum', 'semolina', 'mannagryn', 'rågvete']
  },
  mjolk: {
    name: 'Mjölk & Laktos',
    enabled: false,
    description: 'Innehåller mjölkprotein och/eller laktos (mjölksocker). Relevant för mjölkallergiker och laktosintoleranta.',
    category: 'Allergener & Intoleranser',
    keywords: ['mjölk', 'laktos', 'kasein', 'vassle', 'skummjölk', 'grädde', 'smör', 'ost', 'yoghurt', 'kvarg', 'kärnmjölk']
  },
  agg: {
    name: 'Ägg',
    enabled: false,
    description: 'Vanligt allergen som finns i många bearbetade livsmedel.',
    category: 'Allergener & Intoleranser',
    keywords: ['ägg', 'egg', 'ova', 'albumin', 'lysozym'] 
  },
  jordnot: {
    name: 'Jordnöt',
    enabled: false,
    description: 'Baljväxt men en vanlig och potent allergen, ofta kopplad till trädnötallergi.',
    category: 'Allergener & Intoleranser',
    keywords: ['jordnöt', 'jordnöts']
  },
  mandel: {
    name: 'Mandel',
    enabled: false,
    description: 'Vanlig trädnötallergen.',
    category: 'Allergener & Intoleranser',
    keywords: ['mandel']
  },
  hasselnöt: {
    name: 'Hasselnöt',
    enabled: false,
    description: 'Vanlig trädnötallergen.',
    category: 'Allergener & Intoleranser',
    keywords: ['hasselnöt']
  },
  valnöt: {
    name: 'Valnöt',
    enabled: false,
    description: 'Vanlig trädnötallergen.',
    category: 'Allergener & Intoleranser',
    keywords: ['valnöt']
  },
   cashewnöt: {
    name: 'Cashewnöt',
    enabled: false,
    description: 'Vanlig trädnötallergen.',
    category: 'Allergener & Intoleranser',
    keywords: ['cashew']
  },
  pistagenöt: {
    name: 'Pistagenöt',
    enabled: false,
    description: 'Trädnötallergen.',
    category: 'Allergener & Intoleranser',
    keywords: ['pistage', 'pistach'] 
  },
   sesamfrö: {
    name: 'Sesamfrö',
    enabled: false,
    description: 'Allergent frö som måste deklareras.',
    category: 'Allergener & Intoleranser',
    keywords: ['sesamfrö', 'sesam']
  },
  // Hälsa & Kost
  tillsatt_socker: {
      name: 'Tillsatt Socker',
      enabled: false,
      description: 'Bevakar vanligt socker (sackaros) samt sirap, glukos, fruktos, druvsocker, majssirap etc. som tillsatts produkten.',
      category: 'Hälsa & Kost',
      keywords: ['socker', 'sirap', 'glukos', 'fruktos', 'druvsocker', 'rörsocker', 'betsocker', 'invertsocker', 'maltsocker', 'melass', 'honung', 'agave', 'lönnsirap']
  },
  sockeralkoholer: {
      name: 'Sockeralkoholer',
      enabled: false,
      description: 'Sötningsmedel som sorbitol (E420), mannitol (E421), xylitol (E967), erytritol (E968). Kan ha laxerande effekt vid hög konsumtion.',
      category: 'Hälsa & Kost',
      keywords: ['sorbitol', 'mannitol', 'xylitol', 'erytritol', 'maltitol', 'laktitol', 'isomalt'] 
  },
};

// Rensa bort eventuella undefined nycklar (som gamla 'notter')
Object.keys(defaultWatchedIngredients).forEach(key => {
    if (defaultWatchedIngredients[key] === undefined) {
        delete defaultWatchedIngredients[key];
    }
});

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
      const currentWatchedMap = state.preferences.watchedIngredients;
      
      if (!currentWatchedMap || !currentWatchedMap[ingredientKey]) {
        console.warn(`Ingredient ${ingredientKey} not found in watched ingredients`);
        return state;
      }

      const updatedIngredient: WatchedIngredient = {
          ...currentWatchedMap[ingredientKey],
          enabled: !currentWatchedMap[ingredientKey].enabled,
      };
      
      const updatedWatchedMap: WatchedIngredientMap = {
          ...currentWatchedMap,
          [ingredientKey]: updatedIngredient,
      };

      return {
        preferences: {
          ...state.preferences,
          watchedIngredients: updatedWatchedMap, 
        },
      };
    }),

  resetPreferences: () => set({ preferences: defaultPreferences }),
});