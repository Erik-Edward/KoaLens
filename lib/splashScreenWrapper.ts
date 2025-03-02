// lib/splashScreenWrapper.ts
import { Platform } from 'react-native';

// Dummy-implementering för web/Expo Go
const splashScreenDummy = {
  preventAutoHideAsync: async (): Promise<{ success: boolean }> => {
    console.log('[SplashScreen Dummy] preventAutoHideAsync called');
    return { success: true };
  },
  
  hideAsync: async (): Promise<{ success: boolean }> => {
    console.log('[SplashScreen Dummy] hideAsync called');
    return { success: true };
  }
};

// Exportera funktioner
let splashScreen = splashScreenDummy;

// Försök importera verklig SplashScreen på native om tillgänglig
if (Platform.OS !== 'web') {
  try {
    // Dynamic import
    const ExpoSplashScreen = require('expo-splash-screen');
    
    // Kontrollera om funktionerna finns
    const hasPreventAutoHide = typeof ExpoSplashScreen.preventAutoHideAsync === 'function';
    const hasHideAsync = typeof ExpoSplashScreen.hideAsync === 'function';
    
    if (hasPreventAutoHide && hasHideAsync) {
      // Använd den verkliga implementationen
      splashScreen = ExpoSplashScreen;
      console.log('[SplashScreen] Using real implementation');
    } else {
      console.log('[SplashScreen] Some functions missing, using dummy implementation');
    }
  } catch (error) {
    console.log('[SplashScreen] Could not load module, using dummy implementation:', error);
  }
}

export const { preventAutoHideAsync, hideAsync } = splashScreen;