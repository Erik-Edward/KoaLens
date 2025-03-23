# KoaLens - Implementering av delningsfunktion

## Projektkontext
KoaLens är en React Native-app som använder Expo och hjälper användare att identifiera veganska produkter genom att scanna ingredienslistor. Appen använder Claude Vision API för att analysera bilder på ingredienslistor och avgöra om produkten är vegansk eller inte. Projektets tekniska stack inkluderar:

- React Native med Expo
- TypeScript
- Zustand för tillståndshantering
- Supabase för backend
- NativeWind för styling

## Uppgiftsbeskrivning
Implementera en delningsfunktion i appen som gör det möjligt för användare att dela analyseringen av produkter. Användare ska kunna dela:
1. Bilden på ingredienslistan (om tillgänglig)
2. Analysresultat (vegansk/ej vegansk)
3. Konfidensgrad
4. Lista på ingredienser
5. Analysbeskrivning (reasoning)

## Tekniska krav
För att implementera denna funktionalitet behöver du:

1. **Installera nödvändiga paket**:
   ```bash
   npx expo install expo-sharing
   ```
   
2. **Uppdatera resultatskärmen** (`app/(tabs)/(scan)/result.tsx`) med:
   - Import av Share-funktionalitet
   - En ny delningsknapp i AnalysisControls-komponenten
   - Funktionalitet för att generera och dela innehållet

## Detaljerad implementering

### 1. Imports som behöver läggas till
```typescript
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
```

### 2. Uppdatera STRINGS-objektet
```typescript
// I STRINGS-objektet, lägg till:
SHARE_BUTTON: 'Dela',
SHARE_TITLE: 'Dela resultat',
SHARE_SUCCESS: 'Delat',
SHARE_ERROR: 'Kunde inte dela',
SHARE_CANCEL: 'Avbryt',
```

### 3. Implementera handleShareResult-funktionen
```typescript
// Hanterare för att dela analys
const handleShareResult = async () => {
  if (!product) return;
  
  try {
    // Förbered text för delning
    const veganStatus = product.analysis.isVegan ? 'Vegansk' : 'Ej vegansk';
    const resultText = `KoaLens analys: ${veganStatus} (${Math.round(product.analysis.confidence * 100)}% säkerhet)\n\nIngredienser: ${product.ingredients.join(', ')}\n\n${product.analysis.reasoning || ''}`;
    
    // Kontrollera om delning är tillgänglig på enheten
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert(
        "Delning inte tillgänglig", 
        "Delning är inte tillgänglig på din enhet"
      );
      return;
    }
    
    let shareOptions = {};
    
    // Om vi har en bild, förbered den för delning
    if (product.metadata.imageUri) {
      // För att använda bilden direkt från din URI
      shareOptions = {
        message: resultText,
        url: product.metadata.imageUri
      };
    } else {
      // Dela bara texten om ingen bild finns
      shareOptions = {
        message: resultText
      };
    }
    
    await Sharing.shareAsync(product.metadata.imageUri || FileSystem.documentDirectory + 'temp.txt', {
      mimeType: 'text/plain',
      dialogTitle: 'Dela KoaLens-analys',
      UTI: 'public.plain-text',
    });
    
  } catch (error) {
    console.error('Fel vid delning av resultat:', error);
    Alert.alert(
      "Kunde inte dela",
      "Det gick inte att dela analysresultatet. Försök igen.",
      [{ text: "OK" }]
    );
  }
};
```

### 4. Uppdatera AnalysisControls-komponenten
Funktionsdefinitionen:
```typescript
function AnalysisControls({ 
  onSaveToHistory, 
  isAlreadySaved,
  onFavoriteToggle,
  isFavorite,
  onShare,
  onNew
}: { 
  onSaveToHistory: () => void;
  isAlreadySaved: boolean;
  onFavoriteToggle: () => void;
  isFavorite: boolean;
  onShare: () => void;
  onNew: () => void;
}) {
```

Lägg till delningsknappen inuti AnalysisControls:
```tsx
<StyledPressable
  onPress={onShare}
  className="flex-row items-center justify-center py-2 px-4 rounded-md mr-2 bg-background-light"
>
  <Ionicons 
    name="share-outline" 
    size={18} 
    color="#6b7280" 
  />
</StyledPressable>
```

### 5. Uppdatera AnalysisControls-anropet i huvudfunktionen
```tsx
<AnalysisControls 
  onSaveToHistory={handleSaveToHistory}
  isAlreadySaved={product.metadata.isSavedToHistory}
  onFavoriteToggle={handleToggleFavorite}
  isFavorite={product.metadata.isFavorite}
  onShare={handleShareResult}
  onNew={handleNewScan}
/>
```

## Tekniska överväganden
- Använd `expo-sharing` för att hantera delningen, vilket fungerar bra med Expo-appar.
- `expo-file-system` behövs för att hantera filer temporärt om vi behöver spara innehåll.
- Appen stödjer redan bildhantering med `expo-image-manipulator`.
- Delningsfunktionen bör fungera på både iOS och Android.

## Förväntade resultat
Efter implementeringen ska användare kunna:
1. Se en ny delningsknapp på resultatskärmen
2. Klicka på knappen för att öppna operativsystemets delningsfunktion
3. Dela analysen (text + bild) med andra appar (som meddelanden, e-post, sociala medier, etc.)

Detta förbättrar användarupplevelsen genom att göra det enkelt att dela resultat med andra, vilket ökar appens sociala aspekt och användbarhet.