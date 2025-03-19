# Welcome to your Expo app 👋

This is an [Expo](https://expo.dev) project created with [`create-expo-app`](https://www.npmjs.com/package/create-expo-app).

## Get started

1. Install dependencies

   ```bash
   npm install
   ```

2. Start the app

   ```bash
    npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.

## Teststrategi för ny arkitektur

För att säkerställa att den nya arkitekturen fungerar korrekt bör följande tester utföras efter varje större ändring:

### Manuella tester

1. **Dev-fliken test**:
   - Kontrollera att Dev-fliken syns i appen
   - Använd funktionerna i Dev-vyn för att skapa testprodukter
   - Kontrollera att testprodukterna visas korrekt i historiken

2. **Produkthantering**:
   - Skanna en produkt och se till att den sparas korrekt
   - Kontrollera att produkten visas i både den gamla och den nya historiken
   - Markera en produkt som favorit och verifiera att statusen uppdateras
   - Ta bort en produkt och verifiera att den försvinner från listan

3. **Analyshantering**:
   - Genomför en analys och kontrollera att räknaren uppdateras korrekt
   - Verifiera att analyser visas korrekt i historikvyn
   - Testa att analysbegränsningen fungerar när gränsen nås

### Automatiserade tester (framtida implementering)

För framtida implementation bör följande automatiserade tester skapas:

1. **Enhetstester**:
   - Testa `ProductRepository`-funktioner
   - Testa `AnalyticsService`-funktioner
   - Testa hooks som `useProducts` och `useAnalytics`

2. **Integrationstester**:
   - Testa flödet från skanning till visning i historiken
   - Testa att gamla och nya system kan samexistera

3. **UI-tester**:
   - Testa grundläggande UI-interaktioner med React Native Testing Library
   - Verifiera att produktkort och detaljer visas korrekt

### Utvecklingsverktyg

Använd utvecklingsverktyg för att underlätta testning:

1. **Dev-fliken**:
   - Använd "Skapa Testprodukter" för att generera testdata
   - Använd "Testa Analytics" för att simulera analysanvändning
   - Använd "Visa användar-ID" för att felsöka användarspecifika problem

2. **AsyncStorage-inspektion**:
   - Använd "Rensa AsyncStorage" för att återställa appstatus vid behov
   - Inspektera AsyncStorage för att verifiera att data sparas korrekt

Genom att följa denna teststrategi kan vi säkerställa att den nya arkitekturen fungerar som förväntat och att övergången från det gamla systemet går smidigt.
