# KoaLens Ny Arkitektur

Detta dokument beskriver den nya arkitekturen för KoaLens-appen och hur man använder den.

## Översikt över arkitekturen

Den nya arkitekturen är designad för att vara mer modulär, testbar, och enklare att underhålla. Den består av följande lager:

### 1. Modeller & Typer

Modeller och typer definieras i `models/`-katalogen. Dessa representerar domänentiteter som:

- **Product**: Representerar en produkt med ingredienser och analysresultat
- **WatchedIngredient**: Flaggade ingredienser med anmärkningar
- **ProductAnalysis**: Analysresultat för en produkt

### 2. Tjänster

Tjänster implementerar affärslogik och åtkomst till externa resurser:

- **ProductRepository** (`services/productRepository.ts`): Hanterar CRUD-operationer för produkter 
- **AnalyticsService** (`services/analyticsService.ts`): Hanterar användarstatistik och begränsningar
- **AnalysisService** (`services/analysisService.ts`): Analyserar ingredienser och kommunicerar med Claude Vision-API:et
- **StorageService** (`services/storageService.ts`): Hanterar lokal lagring med robust UUID-hantering

### 3. State Management

State management hanteras av Zustand:

- **UserStore** (`store/userStore.ts`): Hanterar användaridentitet och UUID-validering
- **ProductStore** (`store/productStore.ts`): Hanterar produktlagring och -hantering

### 4. Hooks

React hooks förenklar användningen av tjänster i komponenter:

- **useProducts** (`hooks/useProducts.ts`): Ger komponenter tillgång till produktfunktionalitet
- **useAnalytics** (`hooks/useAnalytics.ts`): Ger tillgång till användarstatistik och begränsningar
- **useAppInitialization** (`hooks/useAppInitialization.ts`): Hanterar app-initialisering

### 5. UI-Komponenter

UI-komponenter är uppdelade i:

- **Screens**: Fullständiga skärmar som visas i appen
- **Components**: Återanvändbara UI-komponenter

## Hur använder man arkitekturen

### Använda Hooks i komponenter

```tsx
import React from 'react';
import { View, Text } from 'react-native';
import { useProducts } from '@/hooks/useProducts';

export function ProductList() {
  const { products, loading, error, refreshProducts } = useProducts();
  
  if (loading) {
    return <Text>Laddar...</Text>;
  }
  
  if (error) {
    return <Text>Fel: {error.message}</Text>;
  }
  
  return (
    <View>
      {products.map(product => (
        <Text key={product.id}>{product.metadata.name || 'Okänd produkt'}</Text>
      ))}
    </View>
  );
}
```

### För nya screens

Nya skärmar bör använda hooks och de nya modellerna:

```tsx
import React, { useState } from 'react';
import { View, Text, Button } from 'react-native';
import { useProducts } from '@/hooks/useProducts';
import { NewProduct } from '@/models/productModel';

export function AddProductScreen() {
  const { addProduct } = useProducts();
  const [loading, setLoading] = useState(false);
  
  const handleAddProduct = async () => {
    setLoading(true);
    
    const newProduct: NewProduct = {
      ingredients: ['Socker', 'Salt', 'Vatten'],
      analysis: {
        isVegan: true,
        confidence: 0.95,
        watchedIngredients: []
      },
      metadata: {
        scanDate: new Date().toISOString(),
        isFavorite: false,
        isSavedToHistory: true,
        source: 'Manual'
      }
    };
    
    try {
      await addProduct(newProduct);
      // Visa bekräftelse
    } catch (error) {
      // Visa felmeddelande
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <View>
      <Button 
        title="Lägg till produkt" 
        onPress={handleAddProduct} 
        disabled={loading} 
      />
    </View>
  );
}
```

### Användning av Claude Vision för bildanalys

Appen använder Claude Vision för att extrahera ingredienser från bilder:

```tsx
import { AnalysisService } from '@/services/analysisService';

async function analyzeImage(imagePath: string) {
  const analysisService = new AnalysisService();
  
  try {
    // Extrahera ingredienser från bild
    const ingredients = await analysisService.extractIngredientsFromImage(imagePath);
    
    // Analysera ingredienserna
    const analysis = await analysisService.analyzeIngredients(ingredients);
    
    return {
      ingredients,
      analysis
    };
  } catch (error) {
    console.error('Fel vid bildanalys:', error);
    throw error;
  }
}
```

## UUID-hantering

Appen använder UUID för att identifiera användare och tracking:

1. **Validering av UUID**: Alla användar-ID:n valideras med en regex för att säkerställa att de är korrekta UUID:n
2. **Fallback-mekanism**: Om ett användar-ID saknas eller är ogiltigt, genereras ett nytt med `uuidv4()`
3. **Konsekvent användar-ID**: Vid API-anrop och produktlagring används samma användar-ID

## Migration från gamla arkitekturen

Migrationen sker gradvis:

1. **useStore adapter**: Gamla `useStore` använder nu adapters som delegerar till de nya implementationerna
2. **Parallella UI:er**: Både gamla och nya UI-komponenter finns parallellt och användaren kan växla mellan dem
3. **GradVis ersättning**: Gamla implementationen ersätts gradvis i takt med att komponenter migreras

Se `docs/migration-progress.md` för detaljerad plan för migrationen.

## Best Practices

1. **Använd hooks istället för direkt åtkomst till stores**: Detta förenklar testning och förbättrar moduläriteten.
2. **Håll affärslogik i tjänster**: UI-komponenter ska fokusera på rendering och delegera logik till hooks och tjänster.
3. **Tydliga gränser mellan lager**: Använd tydliga gränser mellan domänmodeller, repositories, och UI.
4. **Stöd för offline**: Säkerställ att appen fungerar även i offline-läge.
5. **Explicit felhantering**: Hantera fel explicit i varje lager och visa användbara felmeddelanden.
6. **Robust ID-hantering**: Säkerställ att UUID:n är giltiga innan de används i API-anrop eller för lagring.
7. **Säkerhetskopiera data**: Implementera säkerhetsmekanismer för att skydda mot dataförlust vid fel. 