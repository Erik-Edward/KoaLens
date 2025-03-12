# KoaLens Development Environment Guide

Detta dokument beskriver hur du arbetar med utvecklingsmiljön för KoaLens-appen.

## Grundläggande setup

### Förutsättningar
- Node.js och npm installerat
- EAS CLI installerat: `npm install -g eas-cli`
- Expo CLI: `npm install -g expo-cli`
- Expo Go-appen installerad på testenheter (för enkel testning)
- Development build installerad på fysiska enheter (för kameratestning)

### Konfiguration
- **app.json**: Innehåller app-metadata, plugins och uppdateringskonfiguration
- **eas.json**: Definierar olika byggprofiler och kanaler för uppdateringar
- **package.json**: Scripts för byggen och uppdateringar

## Utvecklingsflöde

### 1. Lokal utveckling med hot reload

```bash
# Starta utvecklingsservern
npx expo start --dev-client
```

- Skanna QR-koden med din enhet där development build är installerad
- Ändringar i JavaScript/TypeScript-kod uppdateras omedelbart i appen
- React och UI-komponenter kan testas utan att bygga om appen

### 2. Publicera uppdateringar (utan nytt bygge)

När du gjort ändringar som du vill distribuera utan att skapa ett nytt bygge:

```bash
# För utveckling (ditt eget team)
npm run update:dev
# eller
eas update --branch development --message "Beskrivning av uppdateringen"

# För testare (beta testing)
npm run update:preview
# eller
eas update --branch preview --message "Beskrivning av uppdateringen"
```

### 3. Skapa nya byggen

När du gjort ändringar som kräver nativa ändringar:

```bash
# Utvecklingsbygge (endast för ditt team)
npm run build:dev
# eller
eas build --profile development --platform android

# Förhandsvisningsbygge (för testare)
npm run build:preview
# eller
eas build --profile preview --platform android
```

## Backend-integration

- Appen är konfigurerad att använda Fly.io-backend i alla miljöer
- Backend-URL: `https://koalens-backend.fly.dev`
- Fel i nätverksanrop hanteras med automatiska retries och backoff

## Debugging

### Visa utvecklarmeny på enheten
- Skaka enheten eller använd `adb shell input keyevent 82` i terminalen

### Vanliga problem och lösningar

1. **Nätverksfel**:
   - Kontrollera internetanslutning
   - Verifiera att backend-tjänsten är igång via `curl https://koalens-backend.fly.dev`

2. **Uppdateringar syns inte**:
   - Kontrollera att appen använder rätt kanal (`development` eller `preview`)
   - Använd `eas update:list` för att se status på uppdateringar

3. **Kamera fungerar inte**:
   - Verifiera att development build används (inte Expo Go)
   - Kontrollera kamerarättigheter i Android-inställningar

## Användning av EAS Update

### Visa uppdateringshistorik

```bash
# Lista alla uppdateringar
eas update:list

# Visa detaljer för en specifik uppdatering
eas update:view UPDATE_ID
```

### Hantera uppdateringskanaler

```bash
# Lista kanaler
eas channel:list

# Ändra vilken branch en kanal använder
eas channel:edit CHANNEL_NAME --branch BRANCH_NAME
```

## När behövs ett nytt bygge?

Ett nytt bygge krävs när:
1. Du lägger till eller uppdaterar native dependencies
2. Du ändrar Android-manifestfilen eller iOS-infoPlist
3. Du ändrar plugins i app.json
4. Du modifierar native-kod i Android eller iOS-mapparna

I andra fall är det tillräckligt med EAS Update.