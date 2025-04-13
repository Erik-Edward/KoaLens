// app/(tabs)/(history)/index.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/stores/useStore';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScannedProduct, StoreState, MixedProductArray } from '@/stores/types';
import { Product } from '@/models/productModel';
import { useNavigation } from '@react-navigation/native';
import { Redirect, usePathname, useRouter } from 'expo-router';
import { shouldUseModernUI, getUseNewUI, getUIPreferences, UIVersion } from '../../../constants/uiPreferences';
import * as SplashScreen from 'expo-splash-screen';
import { router } from 'expo-router';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledPressable = styled(Pressable);

// Förhindra autohide av splash screen vid appens boot
SplashScreen.preventAutoHideAsync();

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

/**
 * Historik-router
 * Denna komponent ansvarar för att dirigera till rätt historiksida
 */
export default function HistoryIndexRouter() {
  useEffect(() => {
    // Denna timeout säkerställer att splash screen visas korrekt
    // innan vi navigerar till nästa skärm
    const navigateTimer = setTimeout(() => {
      // Navigera till den nya historikskärmen och dölj splash screen när vi är redo
      try {
        router.replace('/(tabs)/(history)/history');
        SplashScreen.hideAsync();
      } catch (error) {
        console.error('Navigation error:', error);
        SplashScreen.hideAsync();
      }
    }, 100);

    return () => clearTimeout(navigateTimer);
  }, []);

  // Visar en laddningsindikator medan vi förbereder för navigation
  return (
    <StyledView className="flex-1 justify-center items-center bg-background-main">
      <ActivityIndicator size="large" color="#4FB4F2" />
      <StyledText className="text-text-secondary mt-4">
        Laddar historik...
      </StyledText>
    </StyledView>
  );
}

export function HistoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const getUserProducts = useStore(state => state.getUserProducts);
  const addProduct = useStore(state => state.addProduct);
  const [filterFavorites, setFilterFavorites] = useState(false);
  const [forceUpdate, setForceUpdate] = useState(Date.now());
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);
  
  // Funktion för att uppdatera produktlistan
  const updateProductsList = useCallback(() => {
    // Tvinga omrendering genom att uppdatera forceUpdate-statet
    setForceUpdate(Date.now());
    console.log('Uppdaterar produktlista i historik');
  }, []);
  
  // Använd useMemo för att beräkna produktlistan baserat på aktuella filter
  const userProducts = useMemo(() => {
    // Hämta ALLA produkter först för debugging
    const allStoredProducts = useStore.getState().products;
    const currentUser = useStore.getState().user;
    
    // Logga alla produkter för debugging
    console.log('DEBUG: Alla produkter i store:', 
      allStoredProducts.map(p => ({ 
        id: p.id,
        userId: getUserId(p),
        isFavorite: getIsFavorite(p),
        isVegan: getIsVegan(p),
        timestamp: p.timestamp
      }))
    );
    
    // Logga användarinfo
    console.log('DEBUG: Nuvarande användare:', currentUser ? currentUser.id : 'ingen inloggad användare');
    
    // Hämta produkter som vi normalt skulle visa, för debugging
    const products = getUserProducts();
    console.log('History: Fick', products.length, 'produkter från getUserProducts');
    
    // Om inga produkter från getUserProducts, analysera varför
    if (products.length === 0 && allStoredProducts.length > 0) {
      console.warn('VIKTIGT: getUserProducts returnerar 0 produkter trots att det finns', 
        allStoredProducts.length, 'produkter i store - möjlig användarfiltrering');
        
      // Check vilka produkter som filtreras bort pga användare
      const productsWithoutUserId = allStoredProducts.filter(p => !getUserId(p));
      const productsWithDifferentUserId = allStoredProducts.filter(p => 
        getUserId(p) && currentUser && getUserId(p) !== currentUser.id);
      
      console.log('Produkter utan användar-ID:', productsWithoutUserId.length);
      console.log('Produkter med annat användar-ID:', productsWithDifferentUserId.length);
      
      // I utvecklingsläge, visa alla produkter oavsett användar-ID
      if (__DEV__) {
        console.log('DEV-läge: Visar alla produkter oavsett användar-ID');
        return allStoredProducts;
      }
    }
    
    return products;
  }, [getUserProducts, forceUpdate]);
  
  // Tvinga uppdatering var 5:e sekund och när komponenten visas
  useEffect(() => {
    const interval = setInterval(() => {
      console.log('Uppdaterar produktlistan...');
      setForceUpdate(Date.now());
    }, 5000);
    
    return () => clearInterval(interval);
  }, []);
  
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
    logEvent('toggle_filter', { filterType: 'favorites', newState: !filterFavorites });
  };

  // Uppdatera produkter när fliken får fokus
  useEffect(() => {
    // Automatisk uppdatering när komponenten renderas
    setRefreshing(true);
    updateProductsList();
    
    // Hämta även produkter från AsyncStorage om det finns sådana
    const syncFromAsyncStorage = async () => {
      try {
        const productsJson = await AsyncStorage.getItem('koalens-latest-products');
        if (productsJson) {
          const asyncProducts = JSON.parse(productsJson);
          if (Array.isArray(asyncProducts) && asyncProducts.length > 0) {
            console.log(`Hittade ${asyncProducts.length} produkter i AsyncStorage`);
            
            // Lägg till produkter från AsyncStorage till store om de inte redan finns där
            const storeProducts = getUserProducts();
            const storeProductIds = new Set(storeProducts.map(p => p.id));
            
            // Räkna nya produkter som inte finns i store
            let newProductCount = 0;
            
            // För varje produkt i AsyncStorage
            for (const asyncProduct of asyncProducts) {
              if (asyncProduct && asyncProduct.id && !storeProductIds.has(asyncProduct.id)) {
                try {
                  // Använd addProduct från store för att lägga till produkten
                  console.log('Lägger till produkt från AsyncStorage i store:', asyncProduct.id);
                  
                  addProduct({
                    imageUri: asyncProduct.imageUri,
                    isVegan: asyncProduct.isVegan,
                    confidence: asyncProduct.confidence,
                    nonVeganIngredients: asyncProduct.nonVeganIngredients || [],
                    allIngredients: asyncProduct.allIngredients || [],
                    reasoning: asyncProduct.reasoning || '',
                    watchedIngredientsFound: asyncProduct.watchedIngredientsFound || [],
                    userId: asyncProduct.userId || 'unknown'
                  });
                  
                  newProductCount++;
                } catch (error) {
                  console.error('Fel vid tillägg av produkt från AsyncStorage:', error);
                }
              }
            }
            
            if (newProductCount > 0) {
              console.log(`Lade till ${newProductCount} nya produkter från AsyncStorage till store`);
              // Uppdatera produktlistan igen efter att vi lagt till från AsyncStorage
              updateProductsList();
            }
          }
        }
      } catch (error) {
        console.error('Fel vid synkronisering från AsyncStorage:', error);
      } finally {
        setRefreshing(false);
      }
    };
    
    syncFromAsyncStorage();
    
    // Registrera en fokus-lyssnare för att uppdatera när fliken visas
    const unsubscribe = navigation?.addListener('focus', () => {
      console.log('Historikfliken fick fokus, uppdaterar produktlistan');
      updateProductsList();
      syncFromAsyncStorage();
    });
    
    return () => {
      unsubscribe && unsubscribe();
    };
  }, [navigation]);

  // Överskrid getUserProducts i DEV för att visa alla produkter
  useEffect(() => {
    if (__DEV__) {
      console.log('DEV-läge: Skapar en funktion som visar alla produkter');
      
      // Sätt en override i store för getUserProducts
      const originalGetUserProducts = useStore.getState().getUserProducts;
      
      // Spara original-funktionen i en ref för återställning senare
      const getAllProductsOverride = () => {
        return useStore.getState().products as unknown as ScannedProduct[];
      };
      
      // Logga för att verifiera
      console.log('DEV: Override getUserProducts för att visa alla produkter');
      
      // Override getUserProducts direkt i store
      useStore.setState({
        getUserProducts: getAllProductsOverride
      });
      
      // Återställ när komponenten avmonteras
      return () => {
        console.log('DEV: Återställer getUserProducts till original');
        useStore.setState({
          getUserProducts: originalGetUserProducts
        });
      };
    }
  }, []);

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
            {filteredProducts.map((product) => (
              <ProductCard 
                key={product.id} 
                product={toScannedProduct(product)}
              />
            ))}
          </StyledView>
      </StyledScrollView>
      )}
      
      {__DEV__ && <AdminControls setForceUpdate={setForceUpdate} />}
    </StyledSafeAreaView>
  );
}

// Administrativ kontroll för utvecklingsläge
interface AdminControlsProps {
  setForceUpdate: React.Dispatch<React.SetStateAction<number>>;
}

function AdminControls({ setForceUpdate }: AdminControlsProps) {
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
    
    // Uppdatera listan
    setForceUpdate(Date.now());
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
    setForceUpdate(Date.now());
    
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
      setForceUpdate(Date.now());
      
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