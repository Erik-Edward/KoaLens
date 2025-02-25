// types/settingsTypes.ts
export interface WatchedIngredient {
  name: string;          // t.ex. "Palmolja"
  enabled: boolean;      // om ingrediensen är aktiverad för bevakning
  description: string;   // förklaring varför ingrediensen bevakas
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