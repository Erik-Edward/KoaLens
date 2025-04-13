# KoaLens MVP: Färdigställningsplan och Lanseringsstrategi (Uppdaterad April 2025)

## 1. Projektöversikt

**KoaLens** är en mobilapplikation som hjälper användare identifiera veganska produkter genom att analysera ingredienslistor via **videoinspelning** och AI-analys.

### Syfte
Att hjälpa konsumenter enkelt avgöra om produkter är veganska genom att analysera ingredienslistor via kameran och artificiell intelligens.

### Nuvarande Status
- ✅ Grundläggande apparkitektur implementerad (React Native, Expo, TypeScript)
- ✅ **Videoanalys via enhetens kamera och AI-backend (Gemini)**
- ✅ Ingrediensanalys och produktvalidering
- ✅ Historikfunktionalitet
- ✅ Användarautentisering via Supabase
- ✅ Profilhantering och avatarsystem (inkl. realtidsuppdatering)
- ✅ Onboarding-process (uppdaterad för videoanalys)
- ✅ E-nummersökning
- ✅ Sentry crashrapportering implementerad och verifierad
- ✅ Firebase Analytics för användarstatistik implementerad och verifierad
- ✅ Supportfunktioner implementerade (kontakt, feedback, hjälpsektion)
- ✅ **Backend med nytt räknarsystem (Supabase/Node.js) driftsatt på Fly.io**
- ✅ **Användningsgräns för analyser (15 per månad) implementerad och verifierad**
- ✅ Förbättrad UX i skanningsfunktionen (kamera UI, inspelningsknapp)
- ✅ EAS testbygge skapat och verifierat på fysisk Android-enhet
- ✅ Font-rendering problem löst med expo-font plugin
- ✅ Komplett end-to-end flöde från videoinspelning till analys fungerar
- ✅ Fixat dubbletter i E-nummerdatabas (E1517, E1518)
- ✅ Fixat onboarding-flödet (visas ej för befintliga användare)
- ✅ Fixat navigeringsproblem efter profiluppdatering
- ✅ Lösenordsåterställning för användare
- ⚠️ UI/layout-tester på olika skärmstorlekar behövs (via Android Studio)
- ⚠️ Feedback-systemets backend-integration behöver verifieras
- 🔄  (planerad)
- 🔄 Testardokumentation och användarguide (behöver uppdateras)
- 🔍 Förbättrad hantering av svårskannade förpackningar (långsiktig förbättring)

### Målplattformar
- **Primär:** Android (implementerad och testad)
- **Sekundär:** iOS (planerad via Expo EAS)

## 2. Teknisk Arkitektur

### Frontend
- **Ramverk:** React Native med Expo
- **Språk:** TypeScript
- **Navigering:** Expo Router
- **Styling:** NativeWind (Tailwind för React Native)
- **State Management:** Zustand med persist middleware
- **Autentisering:** Supabase Auth
- **Video/Kamerahantering:** React Native Vision Camera
- **Felrapportering:** Sentry
- **Användaranalys:** Firebase Analytics
- **Byggverktyg:** Expo EAS Build
- **UI-komponenter:** Anpassade komponenter med moderna animationer

### Backend
- **Ramverk:** Node.js med Express
- **Språk:** TypeScript
- **AI-integration:** **Google Gemini API (via anpassad backend-tjänst)**
- **Databas:** Supabase (Auth, User Counters, Feedback etc.)
- **Hosting:** Fly.io med Stockholm-region

## 3. Slutförda förbättringar (Urval sedan Mars 2025)

### 3.1. Implementering av Videoanalys
**Status: ✅ Slutförd**
- Ersatt bildanalys (Claude) med videoanalys (Gemini).
- Realtids-feedback under inspelning (även om analys sker efteråt).
- Hantering av videoström och backend-kommunikation.

### 3.2. Implementering av Nytt Räknarsystem
**Status: ✅ Slutförd**
- Implementerat backend-baserat räknarsystem via Supabase stored procedures.
- Frontend använder `useCounter`-hook för att hämta och uppdatera analysantal.
- Gräns satt till 15 analyser/månad, med automatisk återställning.
- UI-komponenter (`UsageLimitIndicator`, `UsageLimitModal`) integrerade.
- Korrigerat initialt visningsvärde (15/15 visas korrekt nu).

### 3.3. Förbättrad Profilsida & Avatar
**Status: ✅ Slutförd**
- Användare kan uppdatera vegansk status.
- Avatarbild uppdateras omedelbart.
- Navigationsproblem efter uppdatering löst.

### 3.4. Onboarding-flöde & Texter
**Status: ✅ Slutförd**
- Onboarding visas nu korrekt (endast för nya användare).
- Texter och illustrationer uppdaterade för att reflektera videoanalys och panorering.
- Information om landscape/portrait-läge tillagd.

### 3.5. E-nummer Databas
**Status: ✅ Slutförd**
- Korrigerat dubblettstatus för E1517 och E1518 (visas nu endast som "Osäker").

## 4. Återstående prioriterade uppgifter (Inför MVP)

### 4.1. UI/Layout-testning på Virtuella Enheter
**Status: Prioriterad**
- **Mål:** Säkerställa UI-konsistens över olika skärmstorlekar/upplösningar.
- **Åtgärd:** Använd Android Studio Emulator för att testa layout, textbrytning, elementpositionering på olika virtuella enheter.

### 4.2. Verifiera Backend Deployment & Live Testning
**Status: Prioriterad**
- **Mål:** Säkerställa att appen fungerar korrekt mot den deployade backend-miljön på Fly.io.
- **Åtgärd:**
    - Dubbelkolla Fly.io konfiguration (miljövariabler, secrets för Gemini etc.).
    - Utför tester på fysisk enhet mot live backend (videoanalys, räknare, prestanda, felhantering).

### 4.3. Verifiera Feedback-systemet
**Status: Prioriterad**
- **Mål:** Säkerställa att användarfeedback sparas korrekt i Supabase.
- **Åtgärd:** Skicka test-feedback från appen och verifiera att den dyker upp i Supabase-tabellen. Debugga vid behov (RLS, anslutning).

### 4.4. Implementera Lösenordsåterställning
**Status: ✅ Slutförd**
- **Mål:** Ge användare möjlighet att återställa glömt lösenord.
- **Åtgärd:** Implementerat flöde med Supabase Auth (PKCE) och dedikerad skärm i appen.

### 4.5. Uppdatera Testardokumentation
**Status: Prioriterad**
- **Mål:** Ge testare aktuell och korrekt information.
- **Åtgärd:** Uppdatera `Docs/koalens-test-guide.md` för att reflektera videoanalys.

### 4.6. Förbättra Testdistribution (Valfritt för MVP, bra för beta)
**Status: Lägre Prioritet (MVP)**
- **Mål:** Effektivisera distribution av testversioner.
- **Åtgärd:** Utvärdera/implementera EAS Update/Internal Distribution.

### 4.7. Rensa Redundanta Paket (Underhåll)
**Status: Lägre Prioritet (MVP)**
- **Mål:** Förbättra kodkvalitet och minska appstorlek.
- **Åtgärd:** Identifiera och ta bort oanvända npm-paket.

## 5. Kostnadsanalys

### 5.1. API-kostnad (Google Gemini)
- **Uppskattning:** Behöver följas upp baserat på verklig användning av Gemini API för video. Kostnaden kan skilja sig från Claude. Initiala tester i loggar indikerar en viss token-användning per analys.
- **Uppskattad månadskostnad per gratisanvändare (15 analyser):** **TBD** (Monitorera via Google Cloud Console).

### 5.2. Infrastrukturkostnad (Fly.io)
- Nuvarande konfiguration (2 maskiner): ~$13-15/månad (kan behöva justeras uppåt beroende på Geminis resurskrav).
- Optimerad konfiguration (1 maskin, testfas): ~$7/månad.
- **Rekommendation:** Börja med 1 maskin för beta, skala upp vid behov.

## 6. Lanseringsplan

### 6.1. Tidslinje (Uppdaterad April 2025)

**April 2025: Slutförande av MVP & Förberedelse för Beta**
- 🔄 UI/Layout-testning på virtuella enheter
- 🔄 Verifiera Backend Deployment & Live Testning
- 🔄 Verifiera Feedback-systemet
- 🔄 Implementera Lösenordsåterställning
- 🔄 Uppdatera Testardokumentation (`koalens-test-guide.md`)
- 🔄 Förbered distribution för beta-testare (t.ex. via manuell APK eller EAS)

**Maj 2025: Beta-testning**
- Distribuera till 5-10 externa testare
- Samla in och analysera feedback (via det verifierade feedback-systemet)
- Implementera kritiska förbättringar baserat på feedback
- Monitorera API-kostnader (Gemini) och backend-prestanda (Fly.io)

**Juni 2025: Slutförberedelser**
- Slutliga prestandaoptimeringar
- Validera alla funktioner baserat på betatester
- Förbereda marknadsföringsmaterial (ikoner, skärmdumpar för butik)
- Finalisera integritetspolicy och användarvillkor

**Juli 2025 (Preliminärt): Lansering**
- Publicera i Google Play Store (Android)
- Börja planera för App Store (iOS)
- Implementera monetiseringsstrategi (om premium-tier ska finnas vid lansering)

**Post-lansering (Q3-Q4 2025)**
- Utforska avancerade bildhanteringstekniker för svårskannade förpackningar (panorama/stitching)
- Iterera baserat på användarfeedback och analysdata

## 7. Monetiseringsstrategi (Oförändrad Plan)

### 7.1. Fasbaserad Implementering

#### Fas 1: Gratis MVP (Lansering)
- **Begränsningar:** 15 analyser/månad per användare (verifierad)
- **Fokus:** Bygga användarbas och samla feedback

#### Fas 2: Freemium-modell (Post-lansering)
- **Gratis tier:** 15 analyser/månad
- **Premium tier:** **Obegränsat** eller högre antal analyser/månad (TBD)
- **Pris:** TBD (ex. 39 SEK/månad eller 349 SEK/år)

## 8. Nästa steg (April 2025)

Fokus ligger nu på att slutföra uppgifterna under **Punkt 4 (Återstående prioriterade uppgifter)**, med start i UI-testning och backend-verifiering, för att kunna påbörja beta-testning i maj.
