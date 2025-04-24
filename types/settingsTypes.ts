// types/settingsTypes.ts
export type IngredientCategory = 'Allergener & Intoleranser' | 'Hälsa & Kost' | 'Miljö & Etik';

export interface WatchedIngredient {
  name: string;          // Visningsnamn, t.ex. "Gluten (Vete, Korn, Råg)"
  enabled: boolean;      // Om bevakningen är påslagen
  description: string;   // Förklaring
  category: IngredientCategory; 
  keywords: string[];    // Lista med sökord (lowercase) som ska matchas
}

export interface UserPreferences {
  watchedIngredients: {
      [key: string]: WatchedIngredient;
  };
}

// Interface för hittade bevakade ingredienser i analysen
export interface WatchedIngredientFound {
  name: string;          // Namn på ingrediensen som hittades
  description: string;   // Beskrivning från WatchedIngredient
  reason: string;        // Specifik anledning till varför den hittades i denna analys
}

// Interface för hela settings-state
export interface SettingsState {
  preferences: UserPreferences;
  toggleWatchedIngredient: (ingredientKey: string) => void;
  resetPreferences: () => void;
}