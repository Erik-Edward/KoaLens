import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/stores/useStore';
import { Stack, useRouter } from 'expo-router';
import { Product, WatchedIngredient, IngredientListItem } from '@/models/productModel';

// Styled komponenter
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

export default function CreateProductsScreen() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [result, setResult] = useState<{ success: boolean; count: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Hämta användar-ID från store
  const userIdOrNull = useStore(state => state.userId);
  // Konvertera null till undefined för att matcha vad useProducts förväntar sig
  const userId = userIdOrNull || undefined;
  
  // Använd useProducts hook för att spara produkter
  const { saveToHistory, products, refreshProducts } = useProducts(userId);

  // Skapa en samling av testprodukter
  const createTestProducts = async (count: number = 5) => {
    try {
      setIsCreating(true);
      setResult(null);
      setError(null);
      
      if (!userId) {
        setError('Ingen användare inloggad. Logga in först.');
        setIsCreating(false); // Stop creation if no user
        return;
      }
      
      console.log(`Skapar ${count} testprodukter för användare ${userId}...`);
      
      let createdCount = 0;
      for (let i = 0; i < count; i++) {
        const product = generateTestProduct(userId, i);
        await saveToHistory(product);
        createdCount++;
      }
      
      // await refreshProducts(); // Refresh might happen automatically via hook
      
      setResult({
        success: true,
        count: createdCount
      });
      
      console.log(`Skapade ${createdCount} testprodukter`);
    } catch (err) {
      console.error('Fel vid skapande av testprodukter:', err);
      setError(`Fel: ${err instanceof Error ? err.message : String(err)}`);
      setResult({
        success: false,
        count: 0
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <StyledScrollView className="flex-1 bg-background-main p-4">
      <Stack.Screen options={{ title: 'Skapa Testprodukter' }} />
      
      <StyledView className="mb-6">
        <StyledText className="text-2xl font-sans-bold text-text-primary mb-2">
          Skapa Testprodukter
        </StyledText>
        <StyledText className="text-text-secondary font-sans">
          Skapa testprodukter i den nya arkitekturen för att testa att produkterna visas korrekt.
        </StyledText>
      </StyledView>
      
      {/* Status för inloggning */}
      <StyledView className="mb-6 p-4 rounded-lg bg-background-light">
        <StyledText className="text-lg font-sans-medium text-text-primary mb-2">
          Användarstatus
        </StyledText>
        <StyledText className="text-text-secondary">
          Användar-ID: {userId || 'Inte inloggad'}
        </StyledText>
        <StyledText className="text-text-secondary mt-2">
          Antal produkter: {products.length}
        </StyledText>
      </StyledView>
      
      {/* Knappar för att skapa testprodukter */}
      <StyledView className="flex-row flex-wrap justify-between mb-6">
        <StyledPressable
          onPress={() => createTestProducts(1)}
          disabled={isCreating || !userId}
          className={`py-3 px-4 rounded-lg ${!userId ? 'bg-gray-500' : 'bg-primary'} mb-3 w-[48%]`}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Skapa 1 produkt
          </StyledText>
        </StyledPressable>
        
        <StyledPressable
          onPress={() => createTestProducts(5)}
          disabled={isCreating || !userId}
          className={`py-3 px-4 rounded-lg ${!userId ? 'bg-gray-500' : 'bg-primary'} mb-3 w-[48%]`}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Skapa 5 produkter
          </StyledText>
        </StyledPressable>
        
        <StyledPressable
          onPress={() => createTestProducts(10)}
          disabled={isCreating || !userId}
          className={`py-3 px-4 rounded-lg ${!userId ? 'bg-gray-500' : 'bg-primary'} mb-3 w-[48%]`}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Skapa 10 produkter
          </StyledText>
        </StyledPressable>
        
        <StyledPressable
          onPress={() => router.push('/(tabs)/(history)/new-history')}
          className="py-3 px-4 rounded-lg bg-blue-700 mb-3 w-[48%]"
        >
          <StyledText className="text-white text-center font-sans-medium">
            Gå till ny historik
          </StyledText>
        </StyledPressable>
      </StyledView>
      
      {/* Resultat eller laddning */}
      {isCreating && (
        <StyledView className="items-center p-4">
          <ActivityIndicator size="large" color="#4FB4F2" />
          <StyledText className="mt-4 text-text-secondary">
            Skapar testprodukter...
          </StyledText>
        </StyledView>
      )}
      
      {result && !isCreating && (
        <StyledView className="p-4 rounded-lg bg-background-light mb-6">
          <StyledText 
            className={`text-lg font-sans-medium ${result.success ? 'text-status-success' : 'text-status-error'}`}
          >
            {result.success ? 'Produkter skapade!' : 'Misslyckades att skapa produkter'}
          </StyledText>
          {result.success && (
            <StyledText className="text-text-secondary mt-2">
              Skapade {result.count} produkter. Du bör nu kunna se dem i den nya historikvyn.
            </StyledText>
          )}
        </StyledView>
      )}
      
      {error && (
        <StyledView className="p-4 rounded-lg bg-red-900/30 mb-6">
          <StyledText className="text-status-error font-sans-medium">
            Fel uppstod
          </StyledText>
          <StyledText className="text-status-error opacity-80 mt-1">
            {error}
          </StyledText>
        </StyledView>
      )}
    </StyledScrollView>
  );
}

// Hjälpfunktion för att generera testprodukter
function generateTestProduct(userId: string, index: number): Product {
  const isVegan = Math.random() > 0.3; // 70% chans att vara vegansk
  // Introduce uncertainty
  const isUncertain = !isVegan && Math.random() > 0.5; // 50% chance of being uncertain if non-vegan
  const actualIsVegan = isUncertain ? null : isVegan;

  const now = new Date();
  const id = `test-${now.getTime()}-${index}`;
  const timestamp = now.toISOString();

  const baseIngredients = [
    'Vatten', 'Socker', 'Salt', 'Mjöl', 'Jäst', 'Vegetabiliskt fett',
    'Majsstärkelse', 'Äpple', 'Apelsinjuice', 'Kakao', 'Arom'
  ];

  const nonVeganIngredientPool = ['Mjölk', 'Ägg', 'Honung', 'Gelatin', 'Vassle'];
  const uncertainIngredientPool = ['Arom', 'E471', 'Lecitin', 'Glycerin'];

  let productIngredientNames = [...baseIngredients];
  const watched: WatchedIngredient[] = [];

  if (!isVegan && !isUncertain) {
    const nonVeganCount = 1; // Add one non-vegan
    for (let i = 0; i < nonVeganCount; i++) {
      const rndIndex = Math.floor(Math.random() * nonVeganIngredientPool.length);
      const name = nonVeganIngredientPool[rndIndex];
      if (!productIngredientNames.includes(name)) {
        productIngredientNames.push(name);
        watched.push({
          name: name,
          description: 'Icke-vegansk ingrediens',
          reason: 'non-vegan',
          status: 'non-vegan' // Fix: Add status
        });
      }
    }
  } else if (isUncertain) {
      const uncertainCount = 1;
      for (let i = 0; i < uncertainCount; i++) {
        const rndIndex = Math.floor(Math.random() * uncertainIngredientPool.length);
        const name = uncertainIngredientPool[rndIndex];
        if (!productIngredientNames.includes(name)) {
           productIngredientNames.push(name);
        }
         // Ensure the uncertain ingredient is in watched list
         if (!watched.some(w => w.name === name)) {
             watched.push({
                 name: name,
                 description: 'Potentiellt icke-vegansk / Osäker status',
                 reason: 'uncertain-source',
                 status: 'uncertain' // Fix: Add status
             });
         }
      }
  }

  // Shuffle ingredients for more variety
  productIngredientNames.sort(() => Math.random() - 0.5);

  // Fix: Map ingredient names to IngredientListItem[]
  const ingredientsListItems: IngredientListItem[] = productIngredientNames.map(name => {
      const watchedItem = watched.find(w => w.name === name);
      let status: IngredientListItem['status'] = 'vegan'; // Default to vegan if not watched
      let color = STATUS_COLORS.vegan;

      if (watchedItem) {
          status = watchedItem.status;
          color = STATUS_COLORS[watchedItem.status] || STATUS_COLORS.unknown;
      } else if (uncertainIngredientPool.includes(name) && !watchedItem) {
          // Handle base ingredients that might be uncertain but not explicitly added as non-vegan
          status = 'uncertain';
          color = STATUS_COLORS.uncertain;
          // Optionally add to watched list here if needed elsewhere, but status is set for display
          if (!watched.some(w => w.name === name)) {
               watched.push({ name: name, status: 'uncertain', description: 'Osäkert ursprung' });
          }
      }

      return {
          name: name,
          status: status,
          statusColor: color,
          description: watchedItem?.description
      };
  });

  let reasoning = '';
  if (actualIsVegan === true) {
      reasoning = 'Produkten bedöms vara vegansk baserat på ingredienserna.';
  } else if (actualIsVegan === null) {
      reasoning = `Produkten har osäker status på grund av ingrediensen/ingredienserna: ${watched.filter(w=>w.status === 'uncertain').map(w=>w.name).join(', ')}.`;
  } else {
      reasoning = `Produkten är inte vegansk på grund av ingrediensen/ingredienserna: ${watched.filter(w=>w.status === 'non-vegan').map(w=>w.name).join(', ')}.`;
  }

  return {
    id,
    timestamp,
    // Fix: Assign IngredientListItem[]
    ingredients: ingredientsListItems,
    analysis: {
      // Fix: Assign boolean | null
      isVegan: actualIsVegan,
      isUncertain: isUncertain,
      confidence: 0.7 + Math.random() * 0.3,
      // Fix: Assign WatchedIngredient[] (already correct)
      watchedIngredients: watched,
      reasoning: reasoning,
      // Add optional fields if needed
      detectedLanguage: 'sv',
      uncertainReasons: isUncertain ? watched.filter(w=>w.status === 'uncertain').map(w => w.description || 'Osäkert ursprung') : []
    },
    metadata: {
      userId,
      scanDate: timestamp,
      isFavorite: Math.random() > 0.7,
      isSavedToHistory: true,
      source: 'Testprodukt',
      imageUri: `https://picsum.photos/400/400?random=${index}`,
      name: `Testprodukt ${index + 1}`
    }
  };
}

// Add STATUS_COLORS constant needed by generateTestProduct
const STATUS_COLORS: Record<IngredientListItem['status'], string> = {
  vegan: '#4CAF50', // Grön
  'non-vegan': '#F44336', // Röd
  uncertain: '#FF9800', // Orange
  unknown: '#607D8B', // Gråblå
}; 