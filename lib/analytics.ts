// lib/analytics.ts
import analytics from '@react-native-firebase/analytics';
import { Platform } from 'react-native';
import { useStore } from '@/stores/useStore';

// Händelse-typer för konsekvent spårning genom hela appen
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

// Standardparametrar att inkludera med varje händelse
const getDefaultParams = () => ({
  platform: Platform.OS,
  app_version: Platform.OS === 'ios' 
    ? Platform.constants.reactNativeVersion.major 
    : Platform.Version,
});

/**
 * Logga en händelse i Firebase Analytics
 * @param eventName Händelsens namn
 * @param parameters Ytterligare parametrar att inkludera med händelsen
 */
export const logEvent = async (eventName: string, parameters: Record<string, any> = {}) => {
  try {
    const params = {
      ...getDefaultParams(),
      ...parameters,
    };
    
    console.log(`Analytics: Logging event ${eventName}`, params);
    await analytics().logEvent(eventName, params);
  } catch (error) {
    // Fånga fel tyst - analytik ska aldrig störa användarupplevelsen
    console.error('Analytics error:', error);
  }
};

/**
 * Logga en skärmvisning i Firebase Analytics
 * @param screenName Skärmens namn
 * @param screenClass Skärmens klass (valfritt)
 */
export const logScreenView = async (screenName: string, screenClass?: string) => {
  try {
    console.log(`Analytics: Logging screen view ${screenName}`);
    await analytics().logScreenView({
      screen_name: screenName,
      screen_class: screenClass || screenName,
    });
  } catch (error) {
    console.error('Analytics screen tracking error:', error);
  }
};

/**
 * Initialisera analytics-tracking
 */
export const initAnalytics = async () => {
  try {
    // Aktivera analytics-samling
    await analytics().setAnalyticsCollectionEnabled(true);
    
    // Konfigurera användarproperty för "vegan_status" för att kunna segmentera händelser
    const store = useStore.getState();
    const veganStatus = store.veganStatus.status;
    if (veganStatus) {
      await analytics().setUserProperty('vegan_status', veganStatus);
    }
    
    // Konfigurera avatar-användarproperty
    const avatar = store.avatar;
    if (avatar.id) {
      await analytics().setUserProperty('avatar_style', avatar.style);
      await analytics().setUserProperty('vegan_years', avatar.veganYears.toString());
    }
    
    console.log('Firebase Analytics initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize Firebase Analytics:', error);
    return false;
  }
};