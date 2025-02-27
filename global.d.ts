// global.d.ts
declare global {
  // Deklarera isBlockingNavigation som redan finns i koden
  var isBlockingNavigation: boolean;
  
  // Deklarera __ZUSTAND_STATE__ för Sentry-integrationen
  var __ZUSTAND_STATE__: {
    getState?: () => any;
  } | undefined;
}

export {};