/**
 * UI-preferenser för appen
 * Hanterar lagring av och beslutsfattning om UI-versioner
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Konstanter för AsyncStorage nycklar
const UI_PREFERENCE_KEY = '@KoaLens:uiPreference';

// Enum för UI-versioner
export enum UIVersion {
  Legacy = 'legacy',
  Modern = 'modern'
}

// Interface för UI-preferenser
export interface UIPreferences {
  version: UIVersion;
}

/**
 * Hämta användarens UI-preferenser
 */
export const getUIPreferences = async (): Promise<UIPreferences> => {
  try {
    const preferences = await AsyncStorage.getItem(UI_PREFERENCE_KEY);
    
    if (preferences) {
      try {
        // Försök att parsa det sparade värdet som JSON 
        return JSON.parse(preferences) as UIPreferences;
      } catch (parseError) {
        // Om värdet inte är giltigt JSON, kan det vara en sträng från gamla implementationen
        if (preferences === 'true') {
          return { version: UIVersion.Modern };
        } else {
          return { version: UIVersion.Legacy };
        }
      }
    }
    
    // Default till modern UI som standard nu när migreringen är klar
    return { version: UIVersion.Modern };
  } catch (error) {
    console.error('Fel vid hämtning av UI-preferenser:', error);
    return { version: UIVersion.Modern };
  }
};

/**
 * Spara användarens UI-preferenser
 */
export const saveUIPreferences = async (preferences: UIPreferences): Promise<void> => {
  try {
    console.log(`Sparar UI-preferenser: ${JSON.stringify(preferences)}`);
    await AsyncStorage.setItem(UI_PREFERENCE_KEY, JSON.stringify(preferences));
  } catch (error) {
    console.error('Fel vid sparande av UI-preferenser:', error);
  }
};

/**
 * Uppdatera UI-version
 */
export const setUIVersion = async (version: UIVersion): Promise<void> => {
  console.log(`Sätter UI-version till: ${version}`);
  await saveUIPreferences({ version });
};

/**
 * Bestäm vilken väg som ska användas för en viss skärm
 */
export const getUIPath = async (legacyPath: string, modernPath: string): Promise<string> => {
  const { version } = await getUIPreferences();
  return version === UIVersion.Modern ? modernPath : legacyPath;
};

/**
 * Hämta UI-inställning från AsyncStorage
 * @returns true om den nya UI:n ska användas, false annars
 */
export async function getUseNewUI(): Promise<boolean> {
  try {
    const { version } = await getUIPreferences();
    return version === UIVersion.Modern;
  } catch (error) {
    console.error('Error fetching UI preference:', error);
    return true; // Använd nya UI:n som standard vid fel
  }
}

/**
 * Sätt UI-inställning i AsyncStorage
 * @param useNewUI true om den nya UI:n ska användas, false annars
 */
export async function setUseNewUI(useNewUI: boolean): Promise<void> {
  try {
    // Uppdatera till att använda version istället för boolean
    const preferences: UIPreferences = {
      version: useNewUI ? UIVersion.Modern : UIVersion.Legacy
    };
    
    console.log(`Uppdaterar UI-inställning till: ${useNewUI ? 'Modern' : 'Legacy'}`);
    await saveUIPreferences(preferences);
  } catch (error) {
    console.error('Error saving UI preference:', error);
  }
}

/**
 * @deprecated Använd getUseNewUI istället
 * För baklängeskompatibilitet
 */
export async function shouldUseModernUI(): Promise<boolean> {
  return getUseNewUI();
} 