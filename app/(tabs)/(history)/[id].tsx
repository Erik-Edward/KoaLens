/**
 * Produktdetaljskärmen
 * Använder den nya produktmodellen och våra custom hooks
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { 
  View, Text, Image, ScrollView, ActivityIndicator,
  Pressable, SafeAreaView, Alert, Share, Platform, StatusBar 
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../../hooks/useProducts';
import { Product, IngredientListItem } from '../../../models/productModel';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { STRINGS } from '@/constants/strings';
import { WatchedIngredient } from '@/types/settingsTypes';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);

// Sektion-rubrik komponent
const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <StyledView className="border-b border-gray-200 pb-2 mb-4">
    <StyledText className="text-text-primary font-sans-bold text-lg">
      {title}
    </StyledText>
  </StyledView>
);

// Ingrediens-lista komponent
const IngredientList: React.FC<{
  title: string;
  ingredients: IngredientListItem[];
  type: 'vegan' | 'non-vegan' | 'watch' | 'unknown' | 'user-watch';
}> = ({ title, ingredients, type }) => {
  // Färgkodning för olika typer av ingredienser
  const getTypeColor = () => {
    switch (type) {
      case 'vegan': return 'bg-status-success';
      case 'non-vegan': return 'bg-status-error';
      case 'watch': return 'bg-status-warning';
      case 'user-watch': return 'bg-blue-500';
      case 'unknown': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };
  
  if (!ingredients || ingredients.length === 0) {
    return null;
  }
  
  return (
    <StyledView className="mb-6">
      <StyledView className="flex-row items-center mb-2">
        <StyledView className={`w-3 h-3 rounded-full mr-2 ${getTypeColor()}`} />
        <StyledText className="text-text-primary font-sans-medium">
          {title}
        </StyledText>
      </StyledView>
      {ingredients.length === 0 ? (
        <StyledText className="text-text-secondary font-sans-italic ml-5">
          {STRINGS.NO_INGREDIENTS}
        </StyledText>
      ) : (
        <StyledView className="ml-5">
          {ingredients.map((ingredient, index) => (
            <StyledText 
              key={index} 
              className="text-text-primary font-sans mb-1"
            >
              • {ingredient.name}
            </StyledText>
          ))}
        </StyledView>
      )}
    </StyledView>
  );
};

// Huvudkomponent för produktdetalj
export default function ProductDetailScreen() {
  const { getProductById, removeProduct, toggleFavorite } = useProducts();
  const { id: originalId } = useLocalSearchParams<{ id: string }>();
  
  // --- Get current watched ingredient settings ---
  const watchedIngredientsSettings = useStore(useShallow(state => state.preferences.watchedIngredients));
  // ---

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Memoize the active watched configurations (including keywords)
  const activeWatchedConfigs = useMemo(() => {
    return Object.values(watchedIngredientsSettings)
      .filter((config): config is WatchedIngredient => config?.enabled && Array.isArray(config.keywords));
  }, [watchedIngredientsSettings]);

  // Ladda produktdata
  const loadProduct = useCallback(async () => {
    if (!originalId) {
      console.error('ProductDetailScreen: Inget produkt-ID angivet');
      setError('Inget produkt-ID angivet');
      setLoading(false);
      return;
    }
    
    // Rensa bort eventuellt -new suffix från ID
    const cleanId = originalId.toString().replace('-new', '');
    console.log(`ProductDetailScreen: Försöker hämta produkt med ID: ${cleanId} (original ID: ${originalId})`);
    
    try {
      setLoading(true);
      const foundProduct = await getProductById(cleanId);
      if (foundProduct) {
        console.log(`ProductDetailScreen: Produkt hittad med ID ${cleanId}`);
        setProduct(foundProduct);
        setError(null);
      } else {
        console.error(`ProductDetailScreen: Produkt med ID ${cleanId} kunde inte hittas`);
        setError('Produkten kunde inte hittas');
      }
    } catch (err) {
      console.error(`ProductDetailScreen: Fel vid hämtning av produkt med ID ${cleanId}:`, err);
      setError('Ett fel uppstod vid hämtning av produkten');
    } finally {
      setLoading(false);
    }
  }, [originalId, getProductById]);
  
  // Ladda produkten när skärmen visas
  useEffect(() => {
    loadProduct();
  }, [loadProduct]);
  
  // --- Filter product ingredients based on user's watch list (USING KEYWORDS) ---
  const watchedProductIngredients = useMemo(() => {
    if (!product || !Array.isArray(product.ingredients) || !activeWatchedConfigs) {
      return [];
    }

    const watched: IngredientListItem[] = [];
    const productIngredients = product.ingredients; // IngredientListItem[]

    productIngredients.forEach(ingredient => {
      const ingredientNameLower = ingredient.name.toLowerCase();
      let isWatched = false;

      for (const config of activeWatchedConfigs) {
        if (config.keywords.some(keyword => ingredientNameLower.includes(keyword.toLowerCase()))) {
          isWatched = true;
          break; // Found a match for this ingredient, no need to check other configs
        }
      }

      if (isWatched) {
        watched.push(ingredient);
      }
    });

    console.log("[HistoryDetail] Filtered watched ingredients:", JSON.stringify(watched.map(i => i.name)));
    return watched;
  }, [product, activeWatchedConfigs]);
  // --------------------------------------------------------------------
  
  // --- Separate ingredients by status for rendering --- 
  const { veganIngredients, nonVeganIngredients, uncertainIngredients } = useMemo(() => {
    if (!product || !Array.isArray(product.ingredients)) {
      return { veganIngredients: [], nonVeganIngredients: [], uncertainIngredients: [] };
    }
    const result = {
      veganIngredients: [] as IngredientListItem[],
      nonVeganIngredients: [] as IngredientListItem[],
      uncertainIngredients: [] as IngredientListItem[],
    };
    product.ingredients.forEach(item => {
      if (item.status === 'vegan') {
        result.veganIngredients.push(item);
      } else if (item.status === 'non-vegan') {
        result.nonVeganIngredients.push(item);
      } else { // Assume uncertain or unknown
        result.uncertainIngredients.push(item);
      }
    });
    return result;
  }, [product]);

  // Hantera favorit-knapp
  const handleToggleFavorite = async () => {
    if (!product) return;
    
    try {
      await toggleFavorite(product.id);
      // Uppdatera lokala produktdata med nya favorit-statusen
      setProduct(prev => {
        if (!prev) return null;
        return {
          ...prev,
          metadata: {
            ...prev.metadata,
            isFavorite: !prev.metadata.isFavorite
          }
        };
      });
    } catch (err) {
      console.error('Fel vid växling av favoritstatus:', err);
      Alert.alert('Fel', 'Kunde inte uppdatera favoritstatus');
    }
  };
  
  // Hantera borttagning
  const handleRemove = () => {
    if (!product) return;
    
    Alert.alert(
      STRINGS.DELETE_TITLE,
      STRINGS.DELETE_MESSAGE,
      [
        {
          text: STRINGS.DELETE_CANCEL,
          style: 'cancel'
        },
        {
          text: STRINGS.DELETE_CONFIRM,
          style: 'destructive',
          onPress: async () => {
            try {
              await removeProduct(product.id);
              router.back();
            } catch (err) {
              console.error('Fel vid borttagning av produkt:', err);
              Alert.alert('Fel', 'Kunde inte ta bort produkten');
            }
          }
        }
      ]
    );
  };
  
  // Dela produkt
  const handleShare = async () => {
    if (!product) return;
    
    try {
      // Fix: Handle isVegan: null for result string
      let result = STRINGS.UNKNOWN_RESULT; // Default to unknown
      if (product.analysis.isVegan === true) {
        result = `${STRINGS.VEGAN_RESULT} (${Math.round(product.analysis.confidence * 100)}% säkerhet)`;
      } else if (product.analysis.isVegan === false && !product.analysis.isUncertain) {
        result = `${STRINGS.NON_VEGAN_RESULT} (${Math.round(product.analysis.confidence * 100)}% säkerhet)`;
      } else { // isVegan is null or isUncertain is true
         result = `${STRINGS.UNCERTAIN_RESULT} (${Math.round(product.analysis.confidence * 100)}% säkerhet)`;
      }

      const message = `${STRINGS.SHARE_TITLE}\n\nProdukt analyserad med KoaLens: ${result}\n\nLaddade ner KoaLens-appen för att analysera dina egna produkter!`;
      
      await Share.share({
        message,
        title: STRINGS.SHARE_TITLE
      });
    } catch (error) {
      console.error(STRINGS.SHARE_ERROR, error);
      Alert.alert(STRINGS.ERROR_TITLE, STRINGS.SHARE_ERROR);
    }
  };
  
  // --- Loading/Error States --- (remain the same)
  if (loading) {
    return <StyledView className="flex-1 justify-center items-center"><ActivityIndicator size="large" /></StyledView>;
  }

  if (error) {
    return (
      <StyledSafeAreaView className="flex-1 justify-center items-center bg-background p-4">
        <StyledText className="text-status-error font-sans-bold text-xl mb-4">{STRINGS.ERROR_TITLE}</StyledText>
        <StyledText className="text-text-secondary font-sans text-center mb-6">{error}</StyledText>
        <StyledPressable onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-lg">
          <StyledText className="text-white font-sans-bold">{STRINGS.ERROR_BUTTON}</StyledText>
        </StyledPressable>
      </StyledSafeAreaView>
    );
  }

  // --- Fix: Explicit check for null product after loading/error --- 
  if (!product) {
    // This handles the case where loading is false, error is null, but product is still null
    return (
      <StyledSafeAreaView className="flex-1 justify-center items-center bg-background p-4">
        <StyledText className="text-text-secondary font-sans text-center">{STRINGS.ERROR_MESSAGE}</StyledText>
        <StyledPressable onPress={() => router.back()} className="bg-primary px-6 py-3 rounded-lg mt-6">
          <StyledText className="text-white font-sans-bold">{STRINGS.ERROR_BUTTON}</StyledText>
        </StyledPressable>
      </StyledSafeAreaView>
    );
  }
  // --- TypeScript now knows product is not null below this line ---

  // --- Start Rendering --- (can now safely assume product is not null)
  return (
    <StyledSafeAreaView 
      className="flex-1 bg-background-main"
      style={{ 
        // På Android behöver vi manuellt lägga till utrymme för StatusBar
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 
      }}
    >
      {/* Status Bar */}
      <StatusBar barStyle="light-content" backgroundColor="#25292e" />
      
      {/* Header - lägre marginal eftersom vi nu hanterar statusbar separat */}
      <StyledView className="px-4 py-4 flex-row items-center border-b border-gray-700/50">
        <StyledPressable
          onPress={() => router.back()}
          className="p-2 rounded-full bg-background-light/30"
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color="#6366f1" />
        </StyledPressable>
        <StyledText className="text-text-primary font-sans-medium ml-2 flex-1">
          Historik
        </StyledText>
        
        {/* Åtgärdsknappar */}
        <StyledView className="flex-row gap-2">
          <StyledPressable
            onPress={handleShare}
            className="p-2 rounded-full bg-background-light/30"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="share-outline" size={22} color="#6366f1" />
          </StyledPressable>
          <StyledPressable
            onPress={handleToggleFavorite}
            className="p-2 rounded-full bg-background-light/30"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={product.metadata.isFavorite ? "star" : "star-outline"}
              size={22}
              color={product.metadata.isFavorite ? "#ffd700" : "#6366f1"}
            />
          </StyledPressable>
          <StyledPressable
            onPress={handleRemove}
            className="p-2 rounded-full bg-background-light/30"
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={22} color="#ef4444" />
          </StyledPressable>
        </StyledView>
      </StyledView>
      
      <StyledScrollView className="flex-1">
        {/* Produktbild */}
        {product.metadata?.imageUri && (
          <StyledImage
            source={{ uri: product.metadata.imageUri }}
            className="w-full h-48"
            resizeMode="cover"
          />
        )}
        
        {/* Innehåll */}
        <StyledView className="p-4">
          {/* --- ADD PRODUCT NAME HERE --- */}
          <StyledText className="text-2xl font-sans-bold text-text-primary mb-4">
            {product.metadata.name}
          </StyledText>
          {/* ----------------------------- */}

          {/* Analys */}
          <StyledView className="mb-8">
            <SectionHeader title={STRINGS.SECTION_ANALYSIS} />
            {product.analysis.reasoning ? (
              <StyledText className="text-text-primary font-sans">
                {product.analysis.reasoning}
              </StyledText>
            ) : (
              <StyledText className="text-text-secondary font-sans-italic">
                {STRINGS.EMPTY_REASONING}
              </StyledText>
            )}
          </StyledView>
          
          {/* Ingredienser */}
          <StyledView>
            <SectionHeader title={STRINGS.SECTION_INGREDIENTS} />
            
            {/* Updated IngredientList usage */}
            <IngredientList 
              title={STRINGS.NON_VEGAN_INGREDIENTS}
              ingredients={nonVeganIngredients} 
              type="non-vegan" 
            />
            <IngredientList 
              title={STRINGS.UNCERTAIN_INGREDIENTS}
              ingredients={uncertainIngredients} 
              type="watch" 
            />
            <IngredientList 
              title={STRINGS.WATCH_INGREDIENTS} // Use existing watch title
              ingredients={watchedProductIngredients} // Pass the filtered user-watched list
              type="user-watch" // Use a distinct type for user-watched
            />
            <IngredientList 
              title={STRINGS.VEGAN_INGREDIENTS}
              ingredients={veganIngredients} 
              type="vegan" 
            />
            
          </StyledView>
          
          {/* Utrymme i botten */}
          <StyledView className="h-24" />
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
} 