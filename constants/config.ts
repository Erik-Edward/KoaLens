// constants/config.ts
// Centraliserade konfigurationsvariabler för appen

// Support kontaktinformation
export const SUPPORT_EMAIL = 'koalens.app@gmail.com';
export const PRIVACY_POLICY_URL = 'https://koalens.se/privacy';

// App versionsinfo
export const APP_NAME = 'KoaLens';
export const COMPANY_NAME = 'KoaLens';
export const WEBSITE_URL = 'https://koalens.live';

// API endpoints och tjänster
// För lokal utveckling, använd IP-adressen till din dator
// export const BACKEND_URL = 'http://192.168.1.67:3000';
// För produktion:
export const BACKEND_URL = 'https://koalens-backend.fly.dev';

// Alias för bakåtkompatibilitet
export const API_BASE_URL = BACKEND_URL;

// FAQ configuration
export const FAQ_ITEMS = [
  {
    question: 'Hur fungerar KoaLens?',
    answer: 'KoaLens använder artificiell intelligens för att analysera bilder av ingredienslistor. När du tar en bild med appen, skickas den till vår server där Claude-Vision AI analyserar ingredienserna och avgör om produkten är vegansk baserat på innehållet.',
  },
  {
    question: 'Hur pålitlig är KoaLens analys?',
    answer: 'KoaLens ger en procentuell tillförlitlighet för varje analys. Vi rekommenderar alltid att du granskar ingredienslistan själv, särskilt om tillförlitligheten är under 90%. Vissa ingredienser kan vara svårtolkade eller ha olika ursprung.',
  },
  {
    question: 'Kan jag använda KoaLens offline?',
    answer: 'Ja, med begränsad funktionalitet. KoaLens kan ta bilder medan du är offline, men analysen utförs när du återansluter till internet. Bilder sparas i en kö och analyseras automatiskt när du får internetanslutning igen.',
  },
  {
    question: 'Hur lägger jag till bevakade ingredienser?',
    answer: 'Gå till "Inställningar" i profilfliken. Där kan du aktivera bevakning av specifika ingredienser som du vill ha extra koll på, till exempel palmolja eller soja.',
  },
  {
    question: 'Varför visas ingen historik?',
    answer: 'Historiken lagras lokalt på din enhet. Om du har bytt enhet eller raderat appen syns inga tidigare skanningar. Du kan också ha aktiverat "Visa bara favoriter", prova att inaktivera det filtret.',
  },
  {
    question: 'Hur kan jag ändra min avatar?',
    answer: 'Tryck på din avatar på profilsidan för att öppna avatar-väljaren. Där kan du välja mellan olika djurteman och stilar.',
  },
  {
    question: 'Vad gör jag om bilden blir suddig?',
    answer: 'Se till att hålla telefonen stilla och ha bra belysning. KoaLens har beskärningsverktyg som du kan använda för att justera bilden innan analys. Du kan också ta en ny bild om den första inte blev bra.',
  },
  {
    question: 'Fungerar KoaLens med alla språk?',
    answer: 'Ja, KoaLens kan analysera ingredienslistor på alla språk, inklusive asiatiska och andra icke-latinska språk. Vissa ovanliga språk kan ha något lägre tillförlitlighet.',
  },
  {
    question: 'Finns KoaLens för iOS?',
    answer: 'KoaLens finns för närvarande på Android. Vi jobbar på en iOS-version som kommer att lanseras senare i år.',
  },
] as const;