/**
 * Produktdetaljskärmen
 * Använder den nya produktmodellen och våra custom hooks
 */

import React, { useState, useCallback, useEffect } from 'react';
import { 
  View, Text, Image, ScrollView, ActivityIndicator,
  Pressable, SafeAreaView, Alert, Share, Platform 
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../../hooks/useProducts';
import { Product } from '../../../models/productModel';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);

// Hårdkodade strings för skärmen
const STRINGS = {
  HEADER_BACK: 'Tillbaka',
  HEADER_TITLE: 'Produktdetalj',
  ERROR_TITLE: 'Fel',
  ERROR_MESSAGE: 'Kunde inte hitta produkten',
  ERROR_BUTTON: 'Gå tillbaka',
  SHARE_BUTTON: 'Dela',
  FAVORITE_BUTTON: 'Favorit',
  UNFAVORITE_BUTTON: 'Ta bort favorit',
  DELETE_BUTTON: 'Ta bort',
  DELETE_TITLE: 'Ta bort produkt',
  DELETE_MESSAGE: 'Är du säker på att du vill ta bort denna produkt från historiken?',
  DELETE_CANCEL: 'Avbryt',
  DELETE_CONFIRM: 'Ta bort',
  SHARE_TITLE: 'Se vad jag hittade med KoaLens!',
  SHARE_ERROR: 'Kunde inte dela produkten',
  SECTION_ANALYSIS: 'Analys',
  SECTION_INGREDIENTS: 'Ingredienser',
  VEGAN_INGREDIENTS: 'Veganska ingredienser',
  NON_VEGAN_INGREDIENTS: 'Icke-veganska ingredienser',
  WATCH_INGREDIENTS: 'Ingredienser att se upp med',
  UNKNOWN_INGREDIENTS: 'Okända ingredienser',
  VEGAN_RESULT: 'Vegansk',
  NON_VEGAN_RESULT: 'Inte vegansk',
  CONFIDENCE: 'Säkerhet',
  ANALYSIS_DATE: 'Analyserad',
  NO_INGREDIENTS: 'Inga ingredienser av denna typ hittades',
  EMPTY_REASONING: 'Ingen analysgrund tillgänglig'
};

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
  ingredients: string[];
  type: 'vegan' | 'non-vegan' | 'watch' | 'unknown';
}> = ({ title, ingredients, type }) => {
  // Färgkodning för olika typer av ingredienser
  const getTypeColor = () => {
    switch (type) {
      case 'vegan': return 'bg-status-success';
      case 'non-vegan': return 'bg-status-error';
      case 'watch': return 'bg-status-warning';
      case 'unknown': return 'bg-gray-400';
      default: return 'bg-gray-400';
    }
  };
  
  if (ingredients.length === 0) {
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
              • {ingredient}
            </StyledText>
          ))}
        </StyledView>
      )}
    </StyledView>
  );
};

// Huvudkomponent för produktdetalj
export default function ProductDetailScreen() {
  // Hämta ID från URL-parametrar
  const { id } = useLocalSearchParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Hämta produktrelaterade funktioner från vår custom hook
  const { 
    getProductById, toggleFavorite, removeProduct
  } = useProducts();
  
  // Ladda produktdata
  const loadProduct = useCallback(async () => {
    if (!id) {
      console.error('ProductDetailScreen: Inget produkt-ID angivet');
      setError('Inget produkt-ID angivet');
      setLoading(false);
      return;
    }
    
    // Rensa bort eventuellt -new suffix från ID
    const cleanId = id.toString().replace('-new', '');
    console.log(`ProductDetailScreen: Försöker hämta produkt med ID: ${cleanId} (original ID: ${id})`);
    
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
  }, [id, getProductById]);
  
  // Ladda produkten när skärmen visas
  useEffect(() => {
    loadProduct();
  }, [loadProduct]);
  
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
      const result = product.analysis.isVegan 
        ? `${STRINGS.VEGAN_RESULT} (${Math.round(product.analysis.confidence * 100)}% säkerhet)`
        : `${STRINGS.NON_VEGAN_RESULT} (${Math.round(product.analysis.confidence * 100)}% säkerhet)`;
      
      const message = `${STRINGS.SHARE_TITLE}\n\nProdukt analyserad med KoaLens: ${result}\n\nLaddade ner KoaLens-appen för att analysera dina egna produkter!`;
      
      await Share.share({
        message,
        // På iOS kan vi ange både titel och meddelande
        ...(Platform.OS === 'ios' ? { title: STRINGS.SHARE_TITLE } : {})
      });
    } catch (err) {
      console.error('Fel vid delning:', err);
      Alert.alert('Fel', STRINGS.SHARE_ERROR);
    }
  };
  
  // Visa laddningsindikator
  if (loading) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background-main">
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#6366f1" />
        </StyledView>
      </StyledSafeAreaView>
    );
  }
  
  // Visa felmeddelande
  if (error || !product) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background-main">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <StyledText className="text-text-primary font-sans-medium text-lg mt-4 text-center">
            {STRINGS.ERROR_TITLE}
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mt-2 mb-4">
            {error || STRINGS.ERROR_MESSAGE}
          </StyledText>
          <StyledPressable
            onPress={() => router.back()}
            className="bg-primary py-2 px-4 rounded"
          >
            <StyledText className="text-text-inverse font-sans">
              {STRINGS.ERROR_BUTTON}
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledSafeAreaView>
    );
  }
  
  // Formatterat datum
  const formattedDate = format(new Date(product.timestamp), 'PPP', {
    locale: sv,
  });
  
  // Huvudinnehåll
  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      {/* Header */}
      <StyledView className="px-4 py-2 flex-row items-center border-b border-gray-200">
        <StyledPressable
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={24} color="#6366f1" />
        </StyledPressable>
        <StyledText className="text-text-primary font-sans-medium ml-2 flex-1">
          {STRINGS.HEADER_TITLE}
        </StyledText>
        
        {/* Åtgärdsknappar */}
        <StyledView className="flex-row">
          <StyledPressable
            onPress={handleShare}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="mr-4"
          >
            <Ionicons name="share-outline" size={24} color="#6366f1" />
          </StyledPressable>
          <StyledPressable
            onPress={handleToggleFavorite}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="mr-4"
          >
            <Ionicons
              name={product.metadata.isFavorite ? "star" : "star-outline"}
              size={24}
              color={product.metadata.isFavorite ? "#ffd700" : "#6366f1"}
            />
          </StyledPressable>
          <StyledPressable
            onPress={handleRemove}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="trash-outline" size={24} color="#ef4444" />
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
          {/* Resultat */}
          <StyledView className="items-center mb-6">
            <StyledView 
              className={`py-2 px-4 rounded-full mb-4 ${
                product.analysis.isVegan 
                  ? 'bg-status-success/20' 
                  : 'bg-status-error/20'
              }`}
            >
              <StyledText className={`font-sans-bold text-lg ${
                product.analysis.isVegan 
                  ? 'text-status-success' 
                  : 'text-status-error'
              }`}>
                {product.analysis.isVegan 
                  ? STRINGS.VEGAN_RESULT 
                  : STRINGS.NON_VEGAN_RESULT}
              </StyledText>
            </StyledView>
            
            <StyledView className="flex-row items-center mb-2">
              <Ionicons name="shield-checkmark-outline" size={16} color="#9ca3af" />
              <StyledText className="text-text-secondary font-sans ml-1">
                {STRINGS.CONFIDENCE}: {Math.round(product.analysis.confidence * 100)}%
              </StyledText>
            </StyledView>
            
            <StyledView className="flex-row items-center">
              <Ionicons name="calendar-outline" size={16} color="#9ca3af" />
              <StyledText className="text-text-secondary font-sans ml-1">
                {STRINGS.ANALYSIS_DATE}: {formattedDate}
              </StyledText>
            </StyledView>
          </StyledView>
          
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
            
            <IngredientList
              title={STRINGS.VEGAN_INGREDIENTS}
              ingredients={product.ingredients.filter(
                ing => !product.analysis.watchedIngredients.some(w => w.name === ing && w.reason === 'non-vegan') &&
                       !product.analysis.watchedIngredients.some(w => w.name === ing)
              )}
              type="vegan"
            />
            
            <IngredientList
              title={STRINGS.NON_VEGAN_INGREDIENTS}
              ingredients={product.analysis.watchedIngredients
                .filter(w => w.reason === 'non-vegan')
                .map(w => w.name)}
              type="non-vegan"
            />
            
            <IngredientList
              title={STRINGS.WATCH_INGREDIENTS}
              ingredients={product.analysis.watchedIngredients
                .filter(w => w.reason !== 'non-vegan')
                .map(w => w.name)}
              type="watch"
            />
            
            <IngredientList
              title={STRINGS.UNKNOWN_INGREDIENTS}
              ingredients={[]} // Vi har inte unknown i vår nuvarande modell
              type="unknown"
            />
          </StyledView>
          
          {/* Utrymme i botten */}
          <StyledView className="h-24" />
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
} 