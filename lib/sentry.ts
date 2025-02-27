// lib/sentry.ts
import * as Sentry from 'sentry-expo';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Definiera en egen enum för severity-nivåer
enum Severity {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug'
}

// Viktigt: Ersätt denna DSN med din egen från Sentry-dashboarden
const SENTRY_DSN = "https://ba5841d4b9c827331ded3dfd43f3e8a1@o4508887214194688.ingest.de.sentry.io/4508887220093008";

export const initSentry = () => {
  // Ändra detta för att ALLTID initiera Sentry oavsett utvecklingsläge för att testa
  if (true) { // Ändrat från: if (!__DEV__ || process.env.ENABLE_SENTRY_IN_DEV) {
    Sentry.init({
      dsn: SENTRY_DSN,
      enableInExpoDevelopment: true,
      debug: true, // Sätt till true för att visa debug-meddelanden
      
      // Konfigurera miljö baserat på build-typ, men tvinga till development för test
      environment: 'development', // Ändrat från: __DEV__ ? 'development' : 'production',
      
      // Release och dist information, för att korrekt mappa sourcemaps
      release: 'koalens@' + Constants.expoConfig?.version,
      dist: Platform.OS === 'ios' 
        ? Constants.expoConfig?.ios?.buildNumber 
        : Constants.expoConfig?.android?.versionCode?.toString(),
      
      // Konfigurera automatisk sessionstracking
      integrations: [
        new Sentry.Native.ReactNativeTracing({
          routingInstrumentation: new Sentry.Native.ReactNavigationInstrumentation(),
          tracingOrigins: ["koalens.app", /^\//],
        }),
      ],
      
      // För test: öka antalet breadcrumbs för mer detaljerad debugging
      maxBreadcrumbs: 100,
      
      // Konfigurera användargränsen (% av användare som rapporterar errors)
      tracesSampleRate: 1.0, // Ändrat från 0.5 till 1.0 för test - 100% av användare
    });
    
    // Lägg till grundläggande användarinformation om tillgänglig
    const userId = getUserId();
    if (userId) {
      Sentry.Native.setUser({ id: userId });
    }
    
    console.log('Sentry initialized with debug mode');
  } else {
    console.log('Sentry disabled in development mode');
  }
};

// Hjälpfunktion för att sätta användarkontext
export const setUserContext = (userId: string, email?: string) => {
  Sentry.Native.setUser({
    id: userId,
    email: email,
  });
};

// Hjälpfunktion för att rensa användarkontext
export const clearUserContext = () => {
  Sentry.Native.setUser(null);
};

// Hjälpfunktion för att rapportera fel
export const captureException = (error: Error, context?: Record<string, any>) => {
  if (context) {
    Sentry.Native.setContext("additional", context);
  }
  Sentry.Native.captureException(error);
};

// Hjälpfunktion för att rapportera meddelanden
export const captureMessage = (message: string, level: Severity = Severity.Info) => {
  Sentry.Native.captureMessage(message, level as any);
};

// Hjälpfunktion för att logga breadcrumbs (spåra användarflöden)
export const addBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  Sentry.Native.addBreadcrumb({
    message,
    category,
    data,
    level: Severity.Info as any,
  });
};

// Hjälpfunktion för att hämta användare från lagring om tillgänglig
const getUserId = (): string | null => {
  try {
    // Anpassas baserat på hur du lagrar användarinformation
    // Exempel: Om du använder Zustand/useStore
    // @ts-ignore - Ignorera typfel för denna globala variabel
    const state = global.__ZUSTAND_STATE__?.getState?.();
    return state?.user?.id || null;
  } catch (e) {
    return null;
  }
};

export { Severity };