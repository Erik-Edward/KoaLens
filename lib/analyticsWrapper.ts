// lib/analyticsWrapper.ts
import { Platform } from 'react-native';

// Definiera Events från originella lib/analytics.ts
export const Events = {
  // Skanning
  SCAN_STARTED: 'scan_started',
  SCAN_COMPLETED: 'scan_completed',
  SCAN_ERROR: 'scan_error',
  
  // Analys
  ANALYSIS_STARTED: 'analysis_started',
  ANALYSIS_COMPLETED: 'analysis_completed',
  ANALYSIS_ERROR: 'analysis_error',
  
  // Användaråtgärder
  TOGGLE_FAVORITE: 'toggle_favorite',
  SHARE_RESULT: 'share_result',
  DELETE_PRODUCT: 'delete_product',
  CLEAR_HISTORY: 'clear_history',
  
  // Inställningar
  TOGGLE_WATCHED_INGREDIENT: 'toggle_watched_ingredient',
  
  // Profil
  CHANGE_AVATAR: 'change_avatar',
  
  // Auth
  LOGIN: 'login',
  SIGNUP: 'signup',
  LOGOUT: 'logout',
  
  // Skärmvisningar
  SCREEN_VIEW: 'screen_view',
};

// Dummy-implementering av analytik-funktioner för web/Expo Go
const logEvent = async (eventName: string, parameters: Record<string, any> = {}) => {
  console.log(`[Analytik Dummy] Event: ${eventName}`, parameters);
};

const logScreenView = async (screenName: string, screenClass?: string) => {
  console.log(`[Analytik Dummy] Screen View: ${screenName}`, { screenClass });
};

const initAnalytics = async () => {
  console.log('[Analytik Dummy] Initialiserad');
  return true;
};

// Exportera dummy-funktioner direkt för Expo Go/web
export { logEvent, logScreenView, initAnalytics };

// Om vi är i en native-app som inte är Expo Go, försöker importera den riktiga firebase-analysen
if (Platform.OS !== 'web') {
  try {
    // Försök att dynamiskt importera firebase-analytics
    // Dette blir endast ett försök, och vi hanterar felfall med dummy-implementationen
    const realAnalytics = require('@/lib/analytics');
    
    // Om importen lyckas, överskriv exporterna
    if (realAnalytics && typeof realAnalytics.logEvent === 'function') {
      console.log('Använder riktig Firebase Analytics');
      module.exports = realAnalytics;
    }
  } catch (error) {
    console.log('Kunde inte ladda Firebase Analytics, använder dummy:', error);
    // Vi fortsätter använda dummy-funktioner
  }
}