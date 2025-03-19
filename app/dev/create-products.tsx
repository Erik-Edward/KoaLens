import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { useProducts } from '@/hooks/useProducts';
import { useStore } from '@/stores/useStore';
import { Stack, useRouter } from 'expo-router';
import { Product } from '@/models/productModel';

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
        return;
      }
      
      console.log(`Skapar ${count} testprodukter för användare ${userId}...`);
      
      // Spara produkterna en efter en
      let createdCount = 0;
      for (let i = 0; i < count; i++) {
        const product = generateTestProduct(userId, i);
        await saveToHistory(product);
        createdCount++;
      }
      
      // Uppdatera produktlistan
      await refreshProducts();
      
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
  const now = new Date();
  const id = `test-${now.getTime()}-${index}`;
  const timestamp = now.toISOString();
  
  const ingredients = [
    'Vatten',
    'Socker',
    'Salt',
    'Mjöl',
    'Jäst',
    'Vegetabiliskt fett',
    'Majsstärkelse',
    'Äpple',
    'Apelsinjuice',
    'Kakao',
  ];
  
  // Lägg till potentiellt icke-veganska ingredienser
  const nonVeganIngredients = ['Mjölk', 'Ägg', 'Honung', 'Gelatin', 'Vassle'];
  
  // Slumpa fram ingredienser
  const productIngredients = [...ingredients];
  if (!isVegan) {
    // Lägg till 1-2 icke-veganska ingredienser om produkten inte är vegansk
    const count = Math.floor(Math.random() * 2) + 1;
    for (let i = 0; i < count; i++) {
      const rndIndex = Math.floor(Math.random() * nonVeganIngredients.length);
      productIngredients.push(nonVeganIngredients[rndIndex]);
    }
  }
  
  // Skapa produkten
  return {
    id,
    timestamp,
    ingredients: productIngredients,
    analysis: {
      isVegan,
      confidence: 0.7 + Math.random() * 0.3, // 70-100% konfidensgrad
      watchedIngredients: isVegan ? [] : [
        {
          name: nonVeganIngredients[Math.floor(Math.random() * nonVeganIngredients.length)],
          description: 'Icke-vegansk ingrediens',
          reason: 'non-vegan'
        }
      ],
      reasoning: isVegan 
        ? 'Produkten innehåller inga icke-veganska ingredienser.'
        : 'Produkten innehåller ingredienser som inte är veganska.'
    },
    metadata: {
      userId,
      scanDate: timestamp,
      isFavorite: Math.random() > 0.7, // 30% chans att vara favorit
      isSavedToHistory: true,
      source: 'Testprodukt',
      imageUri: `https://picsum.photos/400/400?random=${index}`,
      name: `Testprodukt ${index + 1}`
    }
  };
} 