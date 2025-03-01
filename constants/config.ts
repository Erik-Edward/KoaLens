// constants/config.ts
// Centraliserade konfigurationsvariabler för appen

// Support kontaktinformation
export const SUPPORT_EMAIL = 'koalens.app@gmail.com';

// App versionsinfo
export const APP_NAME = 'KoaLens';
export const COMPANY_NAME = 'KoaLens';
export const WEBSITE_URL = 'https://koalens.live';

// API endpoints och tjänster
export const BACKEND_URL = __DEV__ 
  ? 'http://192.168.1.67:3000' 
  : 'https://din-produktions-url.com';