# KoaLens MVP: Färdigställningsplan och Lanseringsstrategi (Uppdaterad)

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
- ⚠️ UI/layout- och fontproblem identifierade i testbygge
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

### Backend
- **Ramverk:** Node.js med Express
- **Språk:** TypeScript
- **AI-integration:** Claude Vision API (3.5 Sonnet, planerar byte till 3.7 Sonnet)
- **Databas:** Supabase för användarsessioner och feedback
- **Hosting:** Fly.io med Stockholm-region för lägsta latens

## 3. Nya prioriterade uppgifter

### 3.1. Förbättra testdistribution och dokumentation
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

### 3.2. Åtgärda UI/layout- och fontproblem
**Status: Prioriterad**

Nuvarande problem: Användartestning visar att EAS testbygget har flera UI/layout-problem och fontavvikelser:
1. Element (knappar) placeras för långt ner på skärmen och är delvis osynliga på vissa enheter
2. Font-rendering skiljer sig drastiskt från förväntad design på resultat-sidan

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

// Skapa en DeviceTestView för att snabbt testa på olika skärmstorlekar
function DeviceTestView({ children }) {
  const [deviceType, setDeviceType] = useState('default');
  
  const dimensions = {
    'small': { width: 320, height: 568 }, // iPhone SE
    'medium': { width: 375, height: 667 }, // iPhone 8
    'large': { width: 428, height: 926 }, // iPhone 13 Pro Max
    'default': { width: '100%', height: '100%' }
  };
  
  return (
    <>
      <View style={styles.deviceSelector}>
        {Object.keys(dimensions).map(type => (
          <TouchableOpacity
            key={type}
            onPress={() => setDeviceType(type)}
            style={[
              styles.deviceButton,
              deviceType === type && styles.activeDevice
            ]}
          >
            <Text>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>
      
      <View style={[
        styles.devicePreview,
        {
          width: dimensions[deviceType].width,
          height: dimensions[deviceType].height
        }
      ]}>
        {children}
      </View>
    </>
  );
}
```

**Font-felsökning:**
1. Verifiera att alla fontfiler är korrekt inkluderade i assets/fonts-mappen
2. Kontrollera att fonter läses in via useFont-hook i _layout.tsx
3. Granska fonttilldelningen i NativeWind/Tailwind för detaljerad resultat-sida
4. Identifiera vilken specifik text som visar avvikande font
5. Implementera direkta fontstilar som fallback om fontfamilj inte laddas korrekt

```typescript
// Säkrare font-laddning med fallback i _layout.tsx
import { useFonts } from 'expo-font';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'PlusJakartaSans-Regular': require('../assets/fonts/PlusJakartaSans-Regular.ttf'),
    'PlusJakartaSans-Medium': require('../assets/fonts/PlusJakartaSans-Medium.ttf'),
    'PlusJakartaSans-SemiBold': require('../assets/fonts/PlusJakartaSans-SemiBold.ttf'),
    'PlusJakartaSans-Bold': require('../assets/fonts/PlusJakartaSans-Bold.ttf'),
    // Övriga fontvarianter...
  });
  
  useEffect(() => {
    if (fontsLoaded) {
      console.log('Fonts loaded successfully');
    }
  }, [fontsLoaded]);
  
  // Visa laddningsskärm om fonter fortfarande laddas
  if (!fontsLoaded) {
    return <SplashScreen />;
  }
  
  return <RootLayoutNav />;
}

// Direkt fontstil för problematisk text som fallback
const styles = StyleSheet.create({
  resultText: {
    // Primärt använd Tailwind/NativeWind klasser
    // Fallback till direkt styling
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
    lineHeight: 24,
  }
});
```

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

### 3.2. Implementera användningsgräns för analyser
**Status: Prioriterad**

För att hantera kostnader och förbereda för freemium-modell behöver vi begränsa antalet analyser per användare.

**Lösningsstrategi:**
- Skapa en ny tabell i Supabase för att spåra användarstatistik
- Begränsa gratis användare till 15 analyser per månad
- Visa återstående analyser i användargränssnittet
- Implementera återställning av räknare den första dagen varje månad

**Implementeringsplan:**
```sql
-- Skapa tabell i Supabase
CREATE TABLE user_usage (
  user_id TEXT PRIMARY KEY REFERENCES auth.users(id),
  analyses_used INTEGER DEFAULT 0,
  analyses_limit INTEGER DEFAULT 15,
  last_reset TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  premium_until TIMESTAMP
);
```

```typescript
// Implementera kontrolllogik i claudeVisionService.ts
async function checkUsageLimit(): Promise<boolean> {
  // Hämta användarens användningsstatus från Supabase
  // Returnera true om användaren har analyser kvar
}
```

### 3.3. Uppgradera till Claude 3.7 Sonnet
**Status: Prioriterad**

För att förbättra analysnoggrannheten planerar vi att uppgradera från Claude 3.5 Sonnet till nya Claude 3.7 Sonnet som visar bättre prestanda på bildanalysuppgifter.

**Lösningsstrategi:**
- Uppdatera modellinställningen i backend-servern
- Potentiellt testa båda modellerna parallellt för jämförelse
- Justera komprimeringsinställningar om nödvändigt för nya modellen

**Implementeringsplan:**
```typescript
// Uppdatera i server.ts
const message = await anthropic.messages.create({
  model: "claude-3-7-sonnet-20250219", // Uppdatera från claude-3-5-sonnet-20241022
  // Övriga parametrar oförändrade
});
```

### 3.4. Lösa feedback-systemet
**Status: Prioriterad**

Nuvarande problem: Feedback från appen sparas inte korrekt i Supabase.

**Lösningsstrategi:**
- Debugga anslutningen till Supabase för feedback-tabellen
- Kontrollera Row Level Security-inställningar i Supabase
- Verifiera att supabase-klienten initialiseras korrekt
- Lägg till detaljerad loggning för felsökning

**Implementeringsplan:**
```typescript
// Testfunktion för att verifiera anslutning
async function testSupabaseConnection() {
  try {
    const { data, error } = await supabase
      .from('app_feedback')
      .select('count(*)');
    
    console.log('Connection test:', { data, error });
  } catch (e) {
    console.error('Connection error:', e);
  }
}

// Kontrollera RLS-inställningar i Supabase
```

### 3.5. Implementera lösenordsåterställning
**Status: Prioriterad**

Nuvarande problem: Användare kan registrera sig via e-post men saknar möjlighet att återställa sitt lösenord om de glömmer det.

**Lösningsstrategi:**
- Implementera lösenordsåterställning via Supabase Auth
- Skapa ett användarvänligt formulär i appen
- Hantera återställningsprocessen från begäran till bekräftelse

**Implementeringsplan:**
```typescript
// Funktion för att begära återställning av lösenord
async function resetPassword(email: string) {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'koalens://reset-password',
    });
    
    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error resetting password:', error);
    return { success: false, error };
  }
}

// Exempel på komponent för återställning av lösenord
function PasswordResetScreen() {
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const { success, error } = await resetPassword(email);
    
    if (success) {
      setMessage('Kontrollera din e-post för instruktioner om återställning av lösenord.');
    } else {
      setMessage('Kunde inte skicka återställning. Försök igen senare.');
    }
    setIsSubmitting(false);
  };

  // Render UI
}
```

### 3.6. Optimera Fly.io-kostnader
**Status: Under utvärdering**

För att optimera driftskostnader under testfasen kan vi överväga att minska antalet maskiner.

**Lösningsstrategi:**
- Minska från 2 maskiner till 1 maskin under testfasen
- Övervaka prestanda och tillgänglighet
- Införa autoskalning när användarbasen växer

**Implementeringsplan:**
```bash
# Kommando för att skala ner till 1 maskin
fly scale count 1
```

## 4. Kostnadsanalys

### 4.1. API-kostnad (Claude Vision)
- Nuvarande kostnad per analys: ~$0.01 (baserat på verklig användning)
- Uppskattad månadskostnad per gratisanvändare (15 analyser): $0.15
- Påverkan av modelluppgradering: Behöver utvärderas, men förväntas vara likvärdig

### 4.2. Infrastrukturkostnad (Fly.io)
- Nuvarande konfiguration (2 maskiner): ~$13-15/månad
- Optimerad konfiguration (1 maskin): ~$7/månad
- Kostnad per analys: Beror på volym, cirka $0.01 med nuvarande konfiguration vid 1500 analyser/månad

## 5. Lanseringsplan

### 5.1. Tidslinje (Uppdaterad)

**Mars 2025: Komplettering av MVP**
- ✅ Backend driftsatt på Fly.io
- ✅ EAS testbygge för Android skapat och verifierat
- 🔄 Åtgärda UI/layout- och fontproblem
- 🔄 Implementera användningsgräns för analyser
- 🔄 Fixa onboarding-flödet
- 🔄 Uppgradera till Claude 3.7 Sonnet
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

## 6. Monetiseringsstrategi

### 6.1. Fasbaserad Implementering

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

## 7. Nästa steg

För att komma vidare med implementeringen av de prioriterade uppgifterna:

1. **Åtgärda UI/layout- och fontproblem** - Kritisk förbättring för att säkerställa konsekvent användarupplevelse
2. **Ta itu med onboarding-flödet** - Viktig användarupplevelseförbättring
3. **Implementera användningsgräns** - Viktigt för att hantera kostnader och förbereda för monetisering
4. **Uppgradera Claude-modellen** - För bättre analysresultat
5. **Lösa feedback-systemet** - För att samla in värdefull användarfeedback
6. **Implementera lösenordsåterställning** - För att förbättra användarupplevelsen vid inloggningsproblem
7. **Förbättra testdistribution och dokumentation** - För att förbereda för en professionell beta-testning
8. **Adressera begränsningar med svårskannade förpackningar** - Börja med information till användare och planera för mer avancerade lösningar
9. **Rensa redundanta paketberoenden** - Underhållsåtgärd för bättre kodkvalitet

Dessa åtgärder kommer att positionera KoaLens som en robust produkt redo för lanseringsfasen.
