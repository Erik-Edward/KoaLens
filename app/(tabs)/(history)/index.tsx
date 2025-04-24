// app/(tabs)/(history)/index.tsx
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { NewProductCard } from '@/components/NewProductCard';
import { useStore } from '@/stores/useStore';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { logEvent, logScreenView } from '@/lib/analyticsWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedProduct, StoreState, MixedProductArray } from '@/stores/types';
import { Product } from '@/models/productModel';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import { useProducts } from '@/hooks/useProducts';
import { shouldUseModernUI, getUseNewUI, getUIPreferences, UIVersion } from '../../../constants/uiPreferences';
import { router } from 'expo-router';

// Färgkonstanter för historiksidan
export const HISTORY_HEADER_COLOR = '#232A35';
export const HISTORY_ACCENT_COLOR = '#FFD700'; // Du kan flytta denna också om den används

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledPressable = styled(Pressable);

// Type guard to check if a product is a ScannedProduct
function isScannedProduct(product: ScannedProduct | Product): product is ScannedProduct {
  return 'isVegan' in product && 
         'imageUri' in product && 
         'nonVeganIngredients' in product && 
         'allIngredients' in product;
}

// Type guard to check if a product is a Product
function isProduct(product: ScannedProduct | Product): product is Product {
  return 'ingredients' in product && 
         'analysis' in product && 
         'metadata' in product;
}

// Helper function to get userId from either product type
function getUserId(product: ScannedProduct | Product): string | undefined {
  if (isScannedProduct(product)) {
    return product.userId;
  } else if (isProduct(product)) {
    return product.metadata.userId;
  }
  return undefined;
}

// Helper function to get isVegan status from either product type
function getIsVegan(product: ScannedProduct | Product): boolean | null {
  if (isScannedProduct(product)) {
    return product.isVegan ?? false;
  } else if (isProduct(product)) {
    return product.analysis.isVegan;
  }
  return false;
}

// Helper function to get isFavorite status from either product type
function getIsFavorite(product: ScannedProduct | Product): boolean {
  if (isScannedProduct(product)) {
    return product.isFavorite;
  } else if (isProduct(product)) {
    return product.metadata.isFavorite;
  }
  return false;
}

// Helper function to get ingredients from either product type
function getIngredients(product: ScannedProduct | Product): string[] {
  if (isScannedProduct(product)) {
    return product.allIngredients || [];
  } else if (isProduct(product)) {
    return product.ingredients.map(item => item.name);
  }
  return [];
}

// Helper function to convert mixed product to ScannedProduct format for ProductCard
function toScannedProduct(product: ScannedProduct | Product): ScannedProduct {
  if (isScannedProduct(product)) {
    return product;
  } else if (isProduct(product)) {
    return {
      id: product.id,
      timestamp: product.timestamp,
      imageUri: product.metadata.imageUri || '',
      isVegan: product.analysis.isVegan ?? false,
      confidence: product.analysis.confidence,
      nonVeganIngredients: product.analysis.watchedIngredients
        .filter(i => i.status === 'non-vegan')
        .map(i => i.name),
      allIngredients: product.ingredients.map(item => item.name),
      reasoning: product.analysis.reasoning || '',
      isFavorite: product.metadata.isFavorite,
      watchedIngredientsFound: [],
      userId: product.metadata.userId
    };
  }
  console.error('Invalid product type encountered in toScannedProduct:', product);
  return {
      id: 'error-product',
      timestamp: new Date().toISOString(),
      imageUri: '',
      isVegan: false,
      confidence: 0,
      nonVeganIngredients: [],
      allIngredients: [],
      reasoning: 'Invalid product type',
      isFavorite: false,
      watchedIngredientsFound: [],
      userId: undefined
  };
}

export default function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const addProduct = useStore(state => state.addProduct);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const navigation = useNavigation();
  
  // --- Use the useProducts hook to get products and manage state --- 
  const authUser = useStore(state => state.user);
  const storeUserId = useStore(state => state.userId);
  const effectiveUserId = authUser?.id || (storeUserId || undefined);
  const { 
    products: userProducts, // Get products directly from the hook
    loading: refreshing,    // Use loading state from the hook as refreshing
    refreshProducts,
    toggleFavorite,        // We might need these later if ProductCard doesn't handle them
    removeProduct          // We might need these later if ProductCard doesn't handle them
  } = useProducts(effectiveUserId);
  // ------------------------------------------------------------------
  
  useEffect(() => {
    // Logga skärmvisning
    logScreenView('HistoryScreen');
    
    // Statistik om produkterna
    const totalProducts = userProducts.length;
    const veganProducts = userProducts.filter(p => getIsVegan(p) === true).length;
    const favorites = userProducts.filter(p => getIsFavorite(p)).length;
    
    console.log(`Historievy: ${totalProducts} produkter totalt, ${veganProducts} veganska, ${favorites} favoriter`);
  }, [userProducts]);
  
  // Filtrera produkterna baserat på sökning och favoriter
  const filteredProducts = useMemo(() => {
    return userProducts
      // Ensure products is an array before filtering
      .filter(product => !!product) // Simple check if product is truthy
      .filter((product) => {
        // Ändra sökning till att matcha antingen ingredienser eller ID om produktnamn saknas
        const ingredientsList = getIngredients(product);
        const matchesSearch = searchQuery === '' || 
          (ingredientsList && ingredientsList.join(' ').toLowerCase().includes(searchQuery.toLowerCase())) ||
          (product.id && product.id.toLowerCase().includes(searchQuery.toLowerCase()));
        const matchesFavorite = !filterFavorites || getIsFavorite(product);
        return matchesSearch && matchesFavorite;
      })
      .sort((a, b) => {
        // Säkrare jämförelse för timestamp som kan vara string eller saknas
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeB - timeA; // Nyast först
      });
  }, [userProducts, searchQuery, filterFavorites]);

  const handleFavoriteFilter = () => {
    setFilterFavorites(!filterFavorites);
    // Använd generisk logEvent istället för TOGGLE_FAVORITES_FILTER som inte existerar
    logEvent('history_toggle_favorite_filter', { newState: !filterFavorites });
  };

  // Use useFocusEffect to refresh products when the screen is focused
  useFocusEffect(
    useCallback(() => {
      console.log('HistoryScreen focused, refreshing products...');
      refreshProducts(); // Call refreshProducts from the hook
      // The hook will handle loading state and update products
      // which will cause this component to re-render.

      return () => {
        console.log('HistoryScreen blurred');
      };
    }, [refreshProducts]) // Depend only on the refresh function reference
  );

  // Display loading indicator based on the hook's state
  if (refreshing && userProducts.length === 0) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background-main justify-center items-center">
        <ActivityIndicator size="large" color={HISTORY_ACCENT_COLOR} />
        <StyledText className="text-text-secondary mt-4">Laddar historik...</StyledText>
      </StyledSafeAreaView>
    );
  }

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StyledView className="px-4 pt-2 pb-4">
        <StyledText className="text-2xl font-sans-bold text-text-primary mb-4">
          Historik
        </StyledText>
        
        <StyledView className="flex-row items-center mb-4">
          <StyledView className="flex-1 mr-2 bg-background-secondary rounded-lg flex-row items-center px-3 py-2">
            <Ionicons name="search" size={16} color="#9CA3AF" />
            <StyledTextInput
              className="flex-1 ml-2 text-text-primary font-sans"
              placeholder="Sök produkter..."
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
        </StyledView>

          <StyledPressable
            className={`p-2 rounded-lg ${filterFavorites ? 'bg-primary' : 'bg-background-secondary'}`}
            onPress={handleFavoriteFilter}
          >
            <Ionicons
              name="star" 
              size={20}
              color={filterFavorites ? '#fff' : '#9CA3AF'} 
            />
          </StyledPressable>
        </StyledView>
      </StyledView>

      {userProducts.length === 0 ? (
        <StyledView className="flex-1 justify-center items-center px-6">
          <StyledText className="text-text-secondary text-center font-sans-medium text-lg mb-2">
            Ingen historik än
          </StyledText>
          <StyledText className="text-text-tertiary text-center font-sans">
            När du skannar ingredienser kommer dina analyser att visas här.
                </StyledText>
              </StyledView>
      ) : filteredProducts.length === 0 ? (
        <StyledView className="flex-1 justify-center items-center px-6">
          <StyledText className="text-text-secondary text-center font-sans-medium text-lg mb-2">
            Inga produkter hittades
          </StyledText>
          <StyledText className="text-text-tertiary text-center font-sans">
            Prova att ändra dina sökfilter för att hitta produkter.
          </StyledText>
        </StyledView>
      ) : (
        <StyledScrollView className="flex-1">
          <StyledView className="px-4 pb-24">
            {filteredProducts.map((product: Product) => (
              <NewProductCard 
                key={product.id} 
                product={product}
                onFavoriteToggle={() => toggleFavorite(product.id)}
                onDelete={() => removeProduct(product.id)}
                useNewDetailPage={true}
              />
            ))}
          </StyledView>
      </StyledScrollView>
      )}
      
      {__DEV__ && <AdminControls removeProduct={removeProduct} />}
    </StyledSafeAreaView>
  );
}

// Administrativ kontroll för utvecklingsläge
function AdminControls({ removeProduct }: { removeProduct?: (id: string) => Promise<void> }) {
  const clearProductsWithoutUser = useStore((state: StoreState) => state.clearProductsWithoutUser);
  const currentUser = useStore((state: StoreState) => state.user);
  const [showAllProducts, setShowAllProducts] = useState(false);
  const allProducts = useStore((state: StoreState) => state.products);
  
  // Kontrollera AsyncStorage för aktuell inställning vid montering
  useEffect(() => {
    const checkSetting = async () => {
      try {
        const value = await AsyncStorage.getItem('DEV_SHOW_ALL_PRODUCTS');
        if (value !== null) {
          setShowAllProducts(value === 'true');
          // Sätt global variabel för omedelbar effekt
          // @ts-ignore
          global.__DEV_SHOW_ALL_PRODUCTS = (value === 'true');
        }
      } catch (error) {
        console.error('Fel vid läsning av DEV-flagga:', error);
      }
    };
    
    checkSetting();
  }, []);
  
  const handleCleanup = () => {
    const before = useStore.getState().products.length;
    clearProductsWithoutUser();
    const after = useStore.getState().products.length;
    
    Alert.alert(
      'Rensning slutförd',
      `Borttagna produkter: ${before - after}\nÅterstående produkter: ${after}`,
      [
        { text: 'OK' }
      ]
    );
  };

  // Hämta session direkt från supabase
  const checkSupabaseSession = async () => {
    try {
      const { supabase } = require('@/lib/supabase');
      
      // Testa både gamla och nya API-anrop
      let sessionInfo = "Kunde inte hämta session";
      let userId = "Okänd";
      
      // Försök med nyare API
      try {
        console.log("Testar nya Supabase API:et (getSession)");
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          sessionInfo = "Session hittad via getSession()";
          userId = data.session?.user?.id || "saknas";
        }
      } catch (e) {
        console.log("Fel med nya API:et:", e);
      }
      
      // Försök med äldre API
      try {
        console.log("Testar äldre Supabase API (session())");
        if (typeof supabase.auth.session === 'function') {
          const sessionData = supabase.auth.session();
          if (sessionData) {
            sessionInfo += "\nSession hittad via session()";
            userId = sessionData?.user?.id || userId;
          }
        }
      } catch (e) {
        console.log("Fel med äldre API:et:", e);
      }
      
      Alert.alert(
        'Supabase Session',
        `Status: ${sessionInfo}\nUser ID: ${userId}\n\nProdukter i store: ${allProducts.length}`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Fel vid kontroll av session:', error);
      Alert.alert('Fel', 'Kunde inte hämta session');
    }
  };
  
  const forceReload = () => {
    console.log("Manuell uppdatering begärd, uppdaterar...");
    
    // Visa toast eller alert för att bekräfta
    Alert.alert('Uppdatering', 'Produktlistan uppdateras...', [
      { text: 'OK' }
    ]);
  };
  
  const toggleShowAllProducts = async () => {
    const newValue = !showAllProducts;
    setShowAllProducts(newValue);
    
    try {
      await AsyncStorage.setItem('DEV_SHOW_ALL_PRODUCTS', newValue ? 'true' : 'false');
      
      // Sätt global variabel för omedelbar effekt
      // @ts-ignore
      global.__DEV_SHOW_ALL_PRODUCTS = newValue;
      
      // Tvinga uppdatering
      forceReload();
      
      // Visa ett meddelande om att inställningen är aktiverad
      Alert.alert(
        'Inställning sparad',
        `Admin-läge för att visa alla produkter: ${newValue ? 'AKTIVERAT' : 'INAKTIVERAT'}`,
        [
          { text: 'OK' }
        ]
      );
    } catch (err) {
      console.error('Fel vid inställning av DEV-flagga:', err);
      Alert.alert('Fel', 'Kunde inte spara inställningen');
    }
  };

  return (
    <StyledView className="p-4 bg-gray-800 rounded-t-lg">
      <StyledText className="text-white font-sans-bold mb-2">Admin-verktyg (DEV)</StyledText>
      <StyledText className="text-gray-300 text-sm mb-2">
        Inloggad som: {currentUser?.id || 'Inte inloggad'}
      </StyledText>
      <StyledText className="text-gray-300 text-sm mb-2">
        Totalt antal produkter i store: {allProducts.length}
      </StyledText>
      
      <StyledView className="flex-row mt-2 mb-2">
      <StyledPressable
          className="bg-red-600 rounded-lg py-2 px-4 mr-2 flex-1"
        onPress={handleCleanup}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Rensa utan användar-ID
          </StyledText>
        </StyledPressable>
        
        <StyledPressable 
          className={`rounded-lg py-2 px-4 flex-1 ${showAllProducts ? 'bg-green-600' : 'bg-gray-600'}`}
          onPress={toggleShowAllProducts}
        >
          <StyledText className="text-white text-center font-sans-medium">
            {showAllProducts ? 'Visa endast mina' : 'Visa alla produkter'}
          </StyledText>
        </StyledPressable>
      </StyledView>

      <StyledView className="flex-row mt-2 mb-2">
        <StyledPressable
          className="bg-blue-600 rounded-lg py-2 px-4 mr-2 flex-1"
          onPress={checkSupabaseSession}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Kontrollera session
          </StyledText>
        </StyledPressable>
        
        <StyledPressable
          className="bg-orange-600 rounded-lg py-2 px-4 flex-1"
          onPress={forceReload}
        >
          <StyledText className="text-white text-center font-sans-medium">
            Uppdatera nu
        </StyledText>
      </StyledPressable>
      </StyledView>
    </StyledView>
  );
}