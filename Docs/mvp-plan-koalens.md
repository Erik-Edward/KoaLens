# KoaLens MVP: Färdigställningsplan och Lanseringsstrategi (Uppdaterad Mars 2025)

## 1. Projektöversikt

**KoaLens** är en mobilapplikation som hjälper användare identifiera veganska produkter genom att analysera ingredienslistor via kamerabaserad skanning och AI-analys.

### Syfte
Att hjälpa konsumenter enkelt avgöra om produkter är veganska genom att analysera ingredienslistor via kameran och artificiell intelligens.

### Nuvarande Status
- ✅ Grundläggande apparkitektur implementerad (React Native, Expo, TypeScript)
- ✅ Kamerafunktionalitet för bildtagning och beskärning
- ✅ Claude Vision API-integration via backend
- ✅ Ingrediensanalys och produktvalidering
- ✅ Historikfunktionalitet
- ✅ Användarautentisering via Supabase
- ✅ Profilhantering och avatarsystem
- ✅ Onboarding-process
- ✅ Sentry crashrapportering implementerad och verifierad
- ✅ Firebase Analytics för användarstatistik implementerad och verifierad
- ✅ Supportfunktioner implementerade (kontakt, feedback, hjälpsektion)
- ✅ Backend driftsatt på Fly.io i Stockholm-regionen
- ✅ EAS testbygge skapat och verifierat på fysisk Android-enhet
- ✅ Font-rendering problem löst med expo-font plugin
- ✅ Komplett end-to-end flöde från kamera till analys fungerar
- ✅ Förbättrad UX i skanningsfunktionen med moderna animationer
- ✅ Uppdaterad profilsida med möjlighet att ändra vegansk status i realtid
- ✅ Förbättrad avatar-selektion med omedelbar visuell feedback
- ✅ Uppgraderad till Claude 3.7 Sonnet för förbättrad analysnoggrannhet
- ✅ Implementerat användningsgräns för analyser (15 per månad)
- ⚠️ UI/layout- och fontproblem identifierade i testbygge (delvis åtgärdade)
- ⚠️ Redundanta paketberoenden (minor)
- 🔄 Lösenordsåterställning för användare (planerad)
- 🔄 Professionell testdistribution via EAS Internal Distribution (planerad)
- 🔄 Testardokumentation och användarguide (planerad)
- 🔍 Förbättrad hantering av svårskannade förpackningar (långsiktig förbättring)

### Målplattformar
- **Primär:** Android (implementerad och testad)
- **Sekundär:** iOS (ska implementeras via Expo EAS)

## 2. Teknisk Arkitektur

### Frontend
- **Ramverk:** React Native med Expo
- **Språk:** TypeScript
- **Navigering:** Expo Router
- **Styling:** NativeWind (Tailwind för React Native)
- **State Management:** Zustand med persist middleware
- **Autentisering:** Supabase Auth
- **Bild/Kamerahantering:** React Native Vision Camera
- **Felrapportering:** Sentry
- **Användaranalys:** Firebase Analytics
- **Byggverktyg:** Expo EAS Build
- **UI-komponenter:** Anpassade komponenter med moderna animationer

### Backend
- **Ramverk:** Node.js med Express
- **Språk:** TypeScript
- **AI-integration:** Claude Vision API (3.7 Sonnet)
- **Databas:** Supabase för användarsessioner och feedback
- **Hosting:** Fly.io med Stockholm-region för lägsta latens

## 3. Slutförda förbättringar

### 3.1. Förbättrat användargränssnitt för skannknappen
**Status: ✅ Slutförd**

**Implementerade förbättringar:**
- Förbättrad shimmer-animation med bättre prestanda genom native driver
- Moderniserad design med pulserande effekt och inre glöd
- Optimerad kodstruktur för animationslogiken
- Konsekvent namngivning för animation-variabler

**Tekniska detaljer:**
- Separata interpolationer för olika animationsaspekter (shimmer, glöd, pulsering)
- Förbättrad användning av React Native's Animated API
- Förbättrad kodläsbarhet och underhållbarhet

### 3.2. Förbättrad profilsida med redigerbar vegansk status
**Status: ✅ Slutförd**

**Implementerade förbättringar:**
- Användare kan nu uppdatera sin veganska status direkt från profilsidan
- Moderniserad UI med tydligare interaktiva element
- Modal-baserad selektion med samma alternativ som i onboarding
- Haptisk feedback vid statusförändringar
- Uppdateringar sparas både lokalt och i Supabase

**Tekniska detaljer:**
- Integration med useUpdateUserProfile-hook för att hantera databasens uppdateringar
- Statusuppdateringar sparas omedelbart i Zustand-state
- Förbättrad felhantering med tydliga användarmeddelanden
- Omedelbar UI-uppdatering efter statusförändring

### 3.3. Förbättrad avatarselektion med omedelbar visuell feedback
**Status: ✅ Slutförd**

**Implementerade förbättringar:**
- Avatarbild uppdateras omedelbart i UI när en ny väljs
- Förbättrad lokal state-hantering för snabbare feedback
- Modal stängs automatiskt efter val för bättre UX
- Robustare implementation med tydlig typning
- Förbättrad felhantering för Supabase-uppdateringar

**Tekniska detaljer:**
- Lokal caching av avatardata för omedelbar visuell uppdatering
- Realtidsuppdatering för konsekvent UI över hela appen
- Förbättrad React hook-användning (useCallback, useEffect)
- Separerade state-hantering för lokal och backend-data

### 3.4. Uppgraderad till Claude 3.7 Sonnet
**Status: ✅ Slutförd**

**Implementerade förbättringar:**
- Uppgraderad från Claude 3.5 Sonnet till 3.7 Sonnet
- Förbättrad analysnoggrannhet för ingredienslistor
- Optimerade komprimeringsinställningar för den nya modellen
- Snabbare svarstider för analyser

**Tekniska detaljer:**
- Uppdaterad modellversion i backend API-anrop
- Anpassade prompt-optimeringar för den nya modellen
- Behållit kompatibilitet med tidigare analyssvar
- Förbättrad felhantering vid API-gränssnittet

### 3.5. Implementerat användningsgräns för analyser
**Status: ✅ Slutförd**

**Implementerade förbättringar:**
- Begränsning av gratisanvändare till 15 analyser per månad
- Skapad ny tabell i Supabase för att spåra användarstatistik
- Visuell indikator för återstående analyser i användargränssnittet
- Automatisk återställning av räknare den första dagen varje månad

**Tekniska detaljer:**
- Implementerad kontrolllogik i claudeVisionService
- Integration med Supabase för spårning av analyser
- Uppdaterad UI för att visa återstående analyser
- Användarmeddelanden när gränsen närmar sig

## 4. Återstående prioriterade uppgifter

### 4.1. Förbättra testdistribution och dokumentation
**Status: Prioriterad**

Nuvarande situation: EAS-byggen distribueras manuellt via Google Drive-länkar, vilket fungerar för begränsad testning men inte ger en optimal erfarenhet för testare.

**Lösningsstrategi:**
- Implementera EAS Update/Internal Distribution för professionell app-distribution
- Skapa tydlig dokumentation för testare
- Strukturera namngivning av APK-filer

**Implementeringsplan:**
```bash
# Konfigurera EAS Update i projektet
eas update:configure

# Skapa en intern distributionskanal
eas channel:create internal

# Bjud in testare via e-post
eas channel:add internal --build-profile preview --email tester1@example.com tester2@example.com
```

**Testardokumentation:**
- Skapa en PDF-guide med:
  - Kort introduktion till KoaLens
  - Installationsanvisningar med skärmbilder
  - Instruktioner för huvudfunktionaliteten
  - Hur man lämnar feedback och rapporterar problem
  - Kontaktinformation för support

**APK-namngivning:**
- Standardisera namngivning: "KoaLens-v[version].apk" (t.ex. "KoaLens-v1.0.1.apk")
- Inkludera version för enkel spårning

### 4.2. Åtgärda kvarvarande UI/layout- och fontproblem
**Status: Delvis slutförd, fortsatt prioriterad**

Nuvarande problem: Vissa UI/layout-problem kvarstår i testbygget:
1. Element (knappar) placeras för långt ner på skärmen och är delvis osynliga på vissa enheter
2. Font-rendering skiljer sig på vissa skärmar från förväntad design

**Lösningsstrategi:**
- Implementera skärmstorlek-responsiv layout med anpassade SafeArea-komponenter
- Felsöka font-laddning och CSS-klasstilldelning på resultat-sidan
- Testa på olika skärmstorlekar för att säkerställa konsekvent design

**Implementeringsplan:**
```typescript
// Förbättrad layout med bättre SafeArea-hantering
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ResultScreen() {
  const insets = useSafeAreaInsets();
  
  return (
    <View style={[
      styles.container,
      {
        // Anpassa padding baserat på enhetens "notch"
        paddingTop: insets.top,
        paddingBottom: Math.max(insets.bottom, 20),
        paddingLeft: insets.left + 10,
        paddingRight: insets.right + 10,
      }
    ]}>
      {/* Övriga komponenter */}
      
      {/* Placera knappar med hänsyn till padding-bottom */}
      <View style={styles.buttonContainer}>
        <Button title="Fortsätt" onPress={handleContinue} />
      </View>
    </View>
  );
}
```

### 4.3. Fixa onboarding-flödet
**Status: Prioriterad**

Nuvarande problem: Onboarding-skärmen visas för alla användare vid varje app-start, även för befintliga användare.

**Lösningsstrategi:**
- Implementera AsyncStorage-baserad spårning av onboarding-status
- Integrera med Supabase användarstatus för att avgöra om användaren är ny
- Visa login-skärmen direkt för återvändande användare
- Behåll onboarding endast för nya installationer

**Implementeringsplan:**
```typescript
// Skapa en användbar hook för att kontrollera onboarding-status
export function useOnboardingStatus() {
  // Kontrollera AsyncStorage och användarstatus
  // Returnera { hasCompletedOnboarding, isLoading, markOnboardingComplete }
}

// Uppdatera navigationlogiken i app/_layout.tsx
```

### 4.4. Lösa feedback-systemet
**Status: Prioriterad**

Nuvarande problem: Feedback från appen sparas inte korrekt i Supabase.

**Lösningsstrategi:**
- Debugga anslutningen till Supabase för feedback-tabellen
- Kontrollera Row Level Security-inställningar i Supabase
- Verifiera att supabase-klienten initialiseras korrekt
- Lägg till detaljerad loggning för felsökning

### 4.5. Implementera lösenordsåterställning
**Status: Prioriterad**

Nuvarande problem: Användare kan registrera sig via e-post men saknar möjlighet att återställa sitt lösenord om de glömmer det.

**Lösningsstrategi:**
- Implementera lösenordsåterställning via Supabase Auth
- Skapa ett användarvänligt formulär i appen
- Hantera återställningsprocessen från begäran till bekräftelse

### 4.6. Optimera Fly.io-kostnader
**Status: Under utvärdering**

För att optimera driftskostnader under testfasen kan vi överväga att minska antalet maskiner.

**Lösningsstrategi:**
- Minska från 2 maskiner till 1 maskin under testfasen
- Övervaka prestanda och tillgänglighet
- Införa autoskalning när användarbasen växer

## 5. Kostnadsanalys

### 5.1. API-kostnad (Claude Vision)
- Nuvarande kostnad per analys: ~$0.01 (baserat på verklig användning)
- Uppskattad månadskostnad per gratisanvändare (15 analyser): $0.15
- Påverkan av modelluppgradering: Behöver utvärderas, men förväntas vara likvärdig

### 5.2. Infrastrukturkostnad (Fly.io)
- Nuvarande konfiguration (2 maskiner): ~$13-15/månad
- Optimerad konfiguration (1 maskin): ~$7/månad
- Kostnad per analys: Beror på volym, cirka $0.01 med nuvarande konfiguration vid 1500 analyser/månad

## 6. Lanseringsplan

### 6.1. Tidslinje (Uppdaterad)

**Mars 2025: Komplettering av MVP**
- ✅ Backend driftsatt på Fly.io
- ✅ EAS testbygge för Android skapat och verifierat
- ✅ Förbättrad UX i skanningsfunktionen med moderna animationer
- ✅ Uppdaterad profilsida med möjlighet att ändra vegansk status
- ✅ Förbättrad avatar-selektion med omedelbar visuell feedback
- ✅ Uppgraderat till Claude 3.7 Sonnet för bättre analysnoggrannhet
- ✅ Implementerat användningsgräns för analyser (15 per månad)
- 🔄 Åtgärda kvarvarande UI/layout- och fontproblem
- 🔄 Fixa onboarding-flödet
- 🔄 Lösa feedback-systemet
- 🔄 Implementera lösenordsåterställning
- 🔄 Förbättra testdistributionsmetod
- 🔄 Skapa testardokumentation
- 🔄 Rensa redundanta paketberoenden

**April 2025: Beta-testning**
- Distribuera till 5-10 externa testare via EAS Internal Distribution
- Samla in och analysera feedback
- Implementera kritiska förbättringar
- Optimera kostnader baserat på användarmönster
- Lägg till informativa meddelanden om scanning-begränsningar

**Maj 2025: Slutförberedelser**
- Slutliga prestandaoptimeringar
- Validera alla funktioner
- Förbereda marknadsföringsmaterial
- Finalisera integritetspolicy och användarvillkor
- Analysera feasibility för multi-bild analys för svårskannade förpackningar

**Juni 2025: Lansering**
- Publicera i Google Play Store (Android)
- Börja planera för App Store (iOS)
- Aktivera all lanseringsrelaterad infrastruktur
- Implementera monetiseringsstrategi

**Post-lansering (Q3-Q4 2025)**
- Utforska avancerade bildhanteringstekniker för cylindriska förpackningar
- Utveckla prototyp för panorama/bildstitching-lösning
- Testa och implementera multi-bild analys baserat på betafeedback

## 7. Monetiseringsstrategi

### 7.1. Fasbaserad Implementering

#### Fas 1: Gratis MVP (Lansering)
- **Begränsningar:** 15 skanningar/månad per användare (nu implementerad)
- **Fokus:** Bygga användarbas och samla feedback
- **Tidsram:** Första 1-2 månaderna
- **Kostnad per användare:** ~$0.15/månad API + infrastruktur

#### Fas 2: Freemium-modell (Post-lansering)
- **Gratis tier:** 15 skanningar/månad
- **Premium tier:** 50 skanningar/månad
- **Pris:** 39 SEK/månad eller 349 SEK/år
- **Backend-skalning:** Skala Fly.io-resurser baserat på användning

## 8. Nästa steg

Under mars-april 2025 fokuserar vi på att slutföra följande uppgifter i prioritetsordning:

1. **Åtgärda kvarvarande UI/layout- och fontproblem** - Kritisk förbättring för konsekvent användarupplevelse
2. **Fixa onboarding-flödet** - Viktig användarupplevelseförbättring för nya och befintliga användare
3. **Lösa feedback-systemet** - För att samla in värdefull användarfeedback
4. **Implementera lösenordsåterställning** - För att förbättra användarupplevelsen vid inloggningsproblem
5. **Förbättra testdistribution och dokumentation** - För att förbereda för en professionell beta-testning
6. **Adressera begränsningar med svårskannade förpackningar** - Börja med information till användare och planera för mer avancerade lösningar
7. **Rensa redundanta paketberoenden** - Underhållsåtgärd för bättre kodkvalitet

Med de senaste framstegen i användarinteraktionen, AI-modellen och användarstatistik är vi nu väl positionerade att nå MVP-målet i tid för betafasen i april.
