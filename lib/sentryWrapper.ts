// lib/sentryWrapper.ts
import { Platform } from 'react-native';

// Skapa egna Severity-enum för bakåtkompatibilitet
export enum Severity {
  Fatal = 'fatal',
  Error = 'error',
  Warning = 'warning',
  Info = 'info',
  Debug = 'debug'
}

// Dummy-implementering för Sentry i Expo Go/web
const dummyCaptureException = (error: Error, context?: Record<string, any>) => {
  console.log('[Sentry Dummy] Captured exception:', error, context);
};

const dummyCaptureMessage = (message: string, level: Severity = Severity.Info) => {
  console.log(`[Sentry Dummy] Captured message (${level}):`, message);
};

const dummyAddBreadcrumb = (message: string, category: string, data?: Record<string, any>) => {
  console.log('[Sentry Dummy] Added breadcrumb:', { message, category, data });
};

const dummySetUserContext = (userId: string, email?: string) => {
  console.log('[Sentry Dummy] Set user context:', { userId, email });
};

const dummyClearUserContext = () => {
  console.log('[Sentry Dummy] Cleared user context');
};

const dummyInitSentry = () => {
  console.log('[Sentry Dummy] Initialized');
};

// Exportera dummy-funktioner som standard
export let captureException = dummyCaptureException;
export let captureMessage = dummyCaptureMessage;
export let addBreadcrumb = dummyAddBreadcrumb;
export let setUserContext = dummySetUserContext;
export let clearUserContext = dummyClearUserContext;
export let initSentry = dummyInitSentry;

// Försök att importera riktiga Sentry på native om det är tillgängligt
if (Platform.OS !== 'web') {
  try {
    // Försök importera den riktiga Sentry-modulen
    const Sentry = require('sentry-expo');
    
    // Om vi kan använda vissa delar av Sentry utan ReactNativeTracing, ersätt bara de funktionerna
    const realInitSentry = () => {
      console.log('[Sentry] Using limited functionality in Expo Go');
      try {
        Sentry.init({
          dsn: "https://ba5841d4b9c827331ded3dfd43f3e8a1@o4508887214194688.ingest.de.sentry.io/4508887220093008",
          enableInExpoDevelopment: true,
          debug: true,
          environment: 'development',
          // TA BORT integrations-array helt för att undvika problem med ReactNativeTracing
        });
        return true;
      } catch (error) {
        console.log('[Sentry] Failed to initialize:', error);
        return false;
      }
    };

    // Ersätt bara de funktioner som fungerar
    if (Sentry.Native) {
      if (typeof Sentry.Native.captureException === 'function') {
        captureException = Sentry.Native.captureException;
      }
      
      if (typeof Sentry.Native.captureMessage === 'function') {
        captureMessage = Sentry.Native.captureMessage;
      }
      
      if (typeof Sentry.Native.addBreadcrumb === 'function') {
        addBreadcrumb = Sentry.Native.addBreadcrumb;
      }
      
      if (typeof Sentry.Native.setUser === 'function') {
        setUserContext = (userId, email) => 
          Sentry.Native.setUser({ id: userId, email });
      }
      
      if (typeof Sentry.Native.setUser === 'function') {
        clearUserContext = () => 
          Sentry.Native.setUser(null);
      }
    }
    
    // Initialisera Sentry med begränsad funktionalitet
    initSentry = realInitSentry;
    
    console.log('[Sentry] Limited functionality wrapper created for Expo Go');
  } catch (error) {
    console.log('[Sentry] Could not load native module, using dummy implementation:', error);
  }
}