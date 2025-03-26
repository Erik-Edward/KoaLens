/**
 * Resultatskärmen för scanning av produktingredienser
 * Använder produktmodellen och våra custom hooks
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  View, Text, ScrollView, ActivityIndicator, 
  Image, Pressable, SafeAreaView, Alert, Platform 
} from 'react-native';
import { styled } from 'nativewind';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../../hooks/useProducts';
import { useCounter } from '../../../hooks/useCounter';
import { Product } from '../../../models/productModel';
import * as Clipboard from 'expo-clipboard';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getUserId } from '@/stores/adapter';
import { AnalysisService } from '@/services/analysisService';
import { v4 as uuidv4 } from 'uuid';
import { ProductRepository } from '@/services/productRepository';
import { useStore } from '@/stores/useStore';

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
  HEADER_TITLE: 'Resultat',
  LOADING: 'Analyserar ingredienser...',
  ERROR_TITLE: 'Analys misslyckades',
  ERROR_MESSAGE: 'Kunde inte analysera ingredienserna. Försök igen.',
  ERROR_RETRY: 'Försök igen',
  ERROR_CANCEL: 'Avbryt',
  RETRY_BUTTON: 'Ny analys',
  SAVE_BUTTON: 'Spara i historik',
  SAVED_SUCCESS: 'Sparad i historik',
  SAVE_ERROR: 'Kunde inte spara',
  COPY_BUTTON: 'Kopiera',
  COPIED: 'Kopierat!',
  SECTION_RESULT: 'Resultat',
  SECTION_INGREDIENTS: 'Ingredienser',
  SECTION_REASONING: 'Analys',
  VEGAN_INGREDIENTS: 'Veganska ingredienser',
  NON_VEGAN_INGREDIENTS: 'Icke-veganska ingredienser',
  WATCH_INGREDIENTS: 'Bevakade ingredienser',
  UNKNOWN_INGREDIENTS: 'Okända ingredienser',
  VEGAN_RESULT: 'Vegansk',
  NON_VEGAN_RESULT: 'Inte vegansk',
  CONFIDENCE: 'Säkerhet',
  USAGE_LIMIT_TITLE: 'Analysgräns uppnådd',
  USAGE_LIMIT_MESSAGE: 'Du har nått din månadskvot för analyser. Nya analyser blir tillgängliga nästa månad.',
  USAGE_LIMIT_OK: 'OK',
  NO_INGREDIENTS: 'Inga ingredienser hittades',
  NO_INGREDIENTS_DESCRIPTION: 'Vi kunde inte hitta några ingredienser i bilden. Försök igen med en tydligare bild.',
  NO_REASONING: 'Ingen analysgrund tillgänglig',
  SHARE_BUTTON: 'Dela',
  SHARE_TITLE: 'Dela resultat',
  SHARE_SUCCESS: 'Delat',
  SHARE_ERROR: 'Kunde inte dela',
  SHARE_CANCEL: 'Avbryt'
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
  if (ingredients.length === 0) {
    return null;
  }
  
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
  
  return (
    <StyledView className="mb-6">
      <StyledView className="flex-row items-center mb-2">
        <StyledView className={`w-3 h-3 rounded-full mr-2 ${getTypeColor()}`} />
        <StyledText className="text-text-primary font-sans-medium">
          {title}
        </StyledText>
      </StyledView>
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
    </StyledView>
  );
};

// Hjälpkomponent för ingredienser
function IngredientItem({ name, status, description }: { 
  name: string; 
  status: 'neutral' | 'warning' | 'danger'; 
  description?: string;
}) {
  const [showDescription, setShowDescription] = useState(false);
  
  const statusColors = {
    neutral: 'bg-green-400',
    warning: 'bg-yellow-400',
    danger: 'bg-red-400'
  };
  
  return (
    <StyledView className="mb-2">
      <StyledPressable 
        onPress={() => description ? setShowDescription(!showDescription) : null}
        className="flex-row items-center"
      >
        <StyledView className={`w-3 h-3 rounded-full mr-2 ${statusColors[status]}`} />
        <StyledText className="text-text-primary font-sans flex-1">
          {name}
        </StyledText>
        {description && (
          <Ionicons 
            name={showDescription ? "chevron-up" : "chevron-down"} 
            size={16} 
            color="#6b7280" 
          />
        )}
      </StyledPressable>
      
      {showDescription && description && (
        <StyledView className="mt-1 ml-5 p-2 bg-background-light rounded-md">
          <StyledText className="text-text-secondary text-sm">
            {description}
          </StyledText>
        </StyledView>
      )}
    </StyledView>
  );
}

// Analyskontroll
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
  return (
    <StyledView className="flex-row justify-between p-4">
      <StyledPressable
        onPress={onNew}
        className="flex-row items-center justify-center bg-primary-main py-2 px-4 rounded-md"
      >
        <Ionicons name="camera-outline" size={18} color="white" />
        <StyledText className="text-white font-sans-bold ml-2">
          Ny skanning
        </StyledText>
      </StyledPressable>
      
      <StyledView className="flex-row">
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
        
        <StyledPressable
          onPress={onFavoriteToggle}
          className={`flex-row items-center justify-center py-2 px-4 rounded-md mr-2 ${
            isFavorite ? 'bg-background-light' : 'bg-background-light'
          }`}
          disabled={!isAlreadySaved}
        >
          <Ionicons 
            name={isFavorite ? "heart" : "heart-outline"} 
            size={18} 
            color={isFavorite ? "#ef4444" : "#6b7280"} 
          />
        </StyledPressable>
        
        <StyledPressable
          onPress={onSaveToHistory}
          className={`flex-row items-center justify-center py-2 px-4 rounded-md ${
            isAlreadySaved ? 'bg-background-light' : 'bg-primary-main'
          }`}
          disabled={isAlreadySaved}
        >
          <Ionicons 
            name="bookmark-outline" 
            size={18} 
            color={isAlreadySaved ? "#6b7280" : "white"} 
          />
          <StyledText 
            className={`font-sans-bold ml-2 ${
              isAlreadySaved ? 'text-text-primary' : 'text-white'
            }`}
          >
            {isAlreadySaved ? "Sparad" : "Spara"}
          </StyledText>
        </StyledPressable>
      </StyledView>
    </StyledView>
  );
}

// Huvudkomponent för resultatskärmen
export default function ScanResultScreen() {
  const params = useLocalSearchParams<{ ingredients: string; image?: string }>();
  
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  
  // Hämta produkthook och counter
  const { saveToHistory, toggleFavorite } = useProducts();
  const { 
    checkLimit, 
    recordAnalysis, 
    hasReachedLimit 
  } = useCounter('analysis_count');
  
  useEffect(() => {
    if (analyzed) return;
    
    async function analyzeIngredients() {
      try {
        setLoading(true);
        setError(null);
        
        // Kontrollera om användaren har nått sin analysgräns
        try {
          const usageCheck = await checkLimit();
          if (!usageCheck?.allowed) {
            // Visa varningsmeddelande och återvänd till föregående skärm
            Alert.alert(
              "Analysgräns nådd",
              "Du har använt alla dina analyser för denna period. Försök igen senare eller uppgradera till premium för fler analyser.",
              [
                { 
                  text: "OK", 
                  onPress: () => router.back() 
                }
              ]
            );
            // Avbryt analysen här
            setLoading(false);
            setAnalyzed(true);
            return;
          }
        } catch (usageError) {
          console.warn('Kunde inte kontrollera användningsgräns, fortsätter ändå:', usageError);
        }
        
        if (!params.ingredients) {
          throw new Error('Inga ingredienser hittades att analysera');
        }
        
        // Skapa ingredienslista
        let ingredients: string[] = [];
        try {
          ingredients = JSON.parse(params.ingredients);
          if (!Array.isArray(ingredients)) {
            ingredients = [params.ingredients];
          }
        } catch (e) {
          // Om JSON.parse misslyckas, använd ingredienserna som de är
          ingredients = [params.ingredients];
        }
        
        // Logga antal ingredienser
        console.log(`Analyserar ${ingredients.length} ingredienser`);
        
        // Prioritera auth.user.id för att säkerställa att produkter kopplas till rätt användare
        const authUser = useStore.getState().user;
        const storeUserId = useStore.getState().userId;
        
        // Hämta effektivt användar-ID med prioritetsordning
        let userId = authUser?.id;
        
        if (!userId) {
          // Fallback till att hämta från getUserId
          userId = await getUserId();
          console.log('ScanResultScreen: Använder användar-ID från getUserId:', userId);
          
          // Sista utväg: använd storeUserId
          if (!userId) {
            userId = storeUserId || undefined;
            console.log('ScanResultScreen: Använder användar-ID från store:', userId);
          }
        } else {
          console.log('ScanResultScreen: Använder användar-ID från auth:', userId);
        }
        
        // Validera att vi har giltigt användar-ID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!userId || !uuidRegex.test(userId)) {
          console.warn('Ogiltigt användar-ID upptäckt, genererar nytt ID för produkt:', userId);
          userId = uuidv4();
          console.log(`Genererat nytt användar-ID för analys: ${userId}`);
        } else {
          console.log(`Använder giltigt användar-ID för analys: ${userId}`);
        }
        
        // Analysera ingredienserna
        const analysisService = new AnalysisService();
        const analysis = await analysisService.analyzeIngredients(ingredients);
        
        // Bekräfta att vi har analysresultat
        if (!analysis) {
          throw new Error('Analysen gav inget resultat');
        }
        
        // Försök registrera analys i statistik men fånga fel och fortsätt
        let analyticsResult = false;
        try {
          // Kontrollera om användaren kan utföra analys, men fortsätt endast om den är tillåten
          let canProceed = true;
          try {
            const usageCheck = await checkLimit();
            if (!usageCheck?.allowed) {
              console.warn('Användaren har nått sin analysgräns:', usageCheck?.reason);
              canProceed = false;
            }
          } catch (usageError) {
            console.warn('Kunde inte kontrollera användningsgräns, fortsätter ändå:', usageError);
          }
          
          // Registrera analysen endast om användaren inte har nått sin gräns
          if (canProceed) {
            console.log('Registrerar analys i användarstatistik...');
            analyticsResult = await recordAnalysis();
            console.log('Analys registrerad i användarstatistik, resultat:', analyticsResult);
          } else {
            console.log('Analys registreras inte eftersom användaren har nått sin gräns');
          }
          
          // Vänta längre tid för att ge backend tid att uppdatera
          console.log('Väntar på att backend ska uppdatera användaranalytik...');
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          // Tvinga uppdatering av användningsgränsen med vår nya forceUpdate-funktion
          console.log('Tvingar fram uppdatering av användningsgränser från servern...');
          const updateSuccess = await checkLimit();
          console.log('Uppdatering av användningsgränser:', updateSuccess ? 'lyckades' : 'misslyckades');
          
          // Om första försöket misslyckades, försök igen efter lite längre väntan
          if (!updateSuccess) {
            console.log('Första uppdateringsförsöket misslyckades, väntar längre och försöker igen...');
            await new Promise(resolve => setTimeout(resolve, 2000));
            const secondAttempt = await checkLimit();
            console.log('Andra uppdateringsförsöket:', secondAttempt ? 'lyckades' : 'misslyckades');
          }
          
        } catch (analyticsError) {
          console.warn('Kunde inte registrera analys i statistik, ignorerar:', analyticsError);
          // Fortsätt även om vi inte kan registrera analysen
        }
        
        // Skapa ett korrekt UUID för produkten
        const productId = uuidv4();
        console.log(`Genererar nytt produkt-ID: ${productId}`);
        
        // Skapa en produktmodell
        const newProduct: Product = {
          id: productId,
          timestamp: new Date().toISOString(),
          ingredients: ingredients,
          analysis: {
            isVegan: analysis.isVegan,
            confidence: analysis.confidence,
            watchedIngredients: analysis.watchedIngredients,
            reasoning: analysis.reasoning
          },
          metadata: {
            scanDate: new Date().toISOString(),
            isFavorite: false,
            isSavedToHistory: false,
            source: 'camera',
            userId: userId
          }
        };
        
        // Lägg till bildsökväg om den finns
        if (params.image) {
          newProduct.metadata.imageUri = params.image;
        }
        
        console.log('Produkt skapad med ID:', newProduct.id);
        setProduct(newProduct);
        setAnalyzed(true);
        
      } catch (error) {
        console.error('Fel vid ingrediensanalys:', error);
        setError(error instanceof Error ? error : new Error(String(error)));
        setAnalyzed(true);
      } finally {
        setLoading(false);
      }
    }
    
    analyzeIngredients();
  }, [params.ingredients, params.image]);
  
  // Hanterare för att gå tillbaka
  const handleBack = () => {
    router.back();
  };
  
  // Hanterare för att spara till historik
  const handleSaveToHistory = async () => {
    if (!product) return;
    
    try {
      setSaveLoading(true);
      
      // Uppdatera metadata för att markera som sparad
      const updatedProduct = {
        ...product,
        metadata: {
          ...product.metadata,
          isSavedToHistory: true
        }
      };
      
      console.log('Sparar produkt till historik:', updatedProduct.id);
      const savedProduct = await saveToHistory(updatedProduct);
      
      // Uppdatera lokalt tillstånd
      setProduct(updatedProduct);
      
      // Försök att göra en tvåvägssynkronisering med Supabase
      if (updatedProduct.metadata.userId) {
        try {
          console.log("Utför tvåvägssynkronisering med Supabase för aktuell produkt...");
          const productRepository = ProductRepository.getInstance();
          await productRepository.syncProductsBidirectional(updatedProduct.metadata.userId);
        } catch (syncError) {
          console.warn("Kunde inte synkronisera med Supabase:", syncError);
          // Produkten är fortfarande sparad lokalt så fortsätt
        }
      }
      
      // Visa bekräftelse
      Alert.alert(
        "Produkt sparad",
        "Produkten har sparats i din historik. Du kan hitta den i Historik-fliken.",
        [{ text: "OK" }]
      );
    } catch (error) {
      console.error('Fel vid sparande av produkt:', error);
      Alert.alert(
        "Kunde inte spara",
        "Det gick inte att spara produkten. Försök igen.",
        [{ text: "OK" }]
      );
    } finally {
      setSaveLoading(false);
    }
  };
  
  // Hanterare för att växla favoritstatus
  const handleToggleFavorite = async () => {
    if (!product || !product.metadata.isSavedToHistory) return;
    
    try {
      await toggleFavorite(product.id);
      
      // Uppdatera lokalt produktstate
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
      console.error('Fel vid ändring av favoritstatus:', err);
    }
  };
  
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
      
      if (product.metadata.imageUri) {
        // Dela med bild
        await Sharing.shareAsync(product.metadata.imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Dela KoaLens-analys',
          UTI: 'public.jpeg'
        });
      } else {
        // Skapa en temporär textfil för att dela bara texten
        const tempFilePath = FileSystem.documentDirectory + 'koalens_analys.txt';
        await FileSystem.writeAsStringAsync(tempFilePath, resultText);
        
        await Sharing.shareAsync(tempFilePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Dela KoaLens-analys',
          UTI: 'public.plain-text'
        });
      }
      
    } catch (error) {
      console.error('Fel vid delning av resultat:', error);
      Alert.alert(
        STRINGS.SHARE_ERROR,
        "Det gick inte att dela analysresultatet. Försök igen.",
        [{ text: "OK" }]
      );
    }
  };
  
  // Hanterare för ny skanning
  const handleNewScan = () => {
    router.replace('/(tabs)/(scan)');
  };
  
  // Visa laddningsskärm
  if (loading) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <ActivityIndicator size="large" color="#6366f1" />
        <StyledText className="mt-4 text-text-primary font-sans-medium">
          Analyserar ingredienser...
        </StyledText>
      </StyledView>
    );
  }
  
  // Visa felskärm
  if (error || !product) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background-main">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <StyledText className="mt-4 text-text-primary text-center font-sans-bold text-lg">
            Något gick fel
          </StyledText>
          <StyledText className="mt-2 text-text-secondary text-center font-sans">
            {error?.message || 'Kunde inte analysera ingredienserna'}
          </StyledText>
          <StyledPressable 
            onPress={handleBack}
            className="mt-4 bg-primary-main py-2 px-4 rounded-md"
          >
            <StyledText className="text-white font-sans-bold">
              Tillbaka
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledSafeAreaView>
    );
  }
  
  // Rendera produktanalysresultat
  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      {/* Header */}
      <StyledView className="flex-row items-center justify-between p-4 border-b border-gray-200">
        <StyledPressable 
          onPress={handleBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color="#6b7280" />
        </StyledPressable>
        
        <StyledText className="text-lg font-sans-bold text-text-primary flex-1 ml-4">
          Analysresultat
        </StyledText>
      </StyledView>
      
      <StyledScrollView className="flex-1">
        {/* Produktbild om den finns */}
        {product.metadata.imageUri && (
          <StyledView className="w-full h-64 bg-black">
            <StyledImage 
              source={{ uri: product.metadata.imageUri }} 
              className="w-full h-full" 
              resizeMode="contain"
            />
          </StyledView>
        )}
        
        {/* Vegansk-status */}
        <StyledView 
          className={`m-4 p-4 rounded-lg ${
            product.analysis.isVegan ? 'bg-green-100' : 'bg-red-100'
          }`}
        >
          <StyledView className="flex-row items-center">
            <Ionicons 
              name={product.analysis.isVegan ? "checkmark-circle" : "close-circle"} 
              size={24} 
              color={product.analysis.isVegan ? "#22c55e" : "#ef4444"} 
            />
            <StyledText 
              className={`text-lg font-sans-bold ml-2 ${
                product.analysis.isVegan ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {product.analysis.isVegan ? 'Vegansk' : 'Ej vegansk'}
            </StyledText>
          </StyledView>
          
          <StyledText 
            className={`mt-1 ${
              product.analysis.isVegan ? 'text-green-700' : 'text-red-700'
            }`}
          >
            Säkerhet: {Math.round(product.analysis.confidence * 100)}%
          </StyledText>
          
          {product.analysis.reasoning && (
            <StyledText 
              className={`mt-2 ${
                product.analysis.isVegan ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {product.analysis.reasoning}
            </StyledText>
          )}
        </StyledView>
        
        {/* Ingredienslista */}
        <StyledView className="mx-4 mb-4">
          <StyledText className="text-lg font-sans-bold text-text-primary mb-2">
            Ingredienser
          </StyledText>
          
          {product.ingredients.length === 0 ? (
            <StyledText className="text-text-secondary italic">
              Inga ingredienser hittades
            </StyledText>
          ) : (
            <StyledView>
              {/* Vanliga ingredienser */}
              {product.ingredients.map((ingredient, index) => {
                // Hitta om ingrediensen är flaggad
                const watchedIngredient = product.analysis.watchedIngredients.find(
                  w => {
                    // Kolla för exakt matchning först
                    if (w.name.toLowerCase() === ingredient.toLowerCase()) return true;
                    
                    // Sedan kolla för en delmatchning (om ingredient innehåller w.name eller tvärtom)
                    if (ingredient.toLowerCase().includes(w.name.toLowerCase()) || 
                        w.name.toLowerCase().includes(ingredient.toLowerCase())) {
                      return true;
                    }
                    
                    return false;
                  }
                );
                
                let status: 'neutral' | 'warning' | 'danger' = 'neutral';
                if (watchedIngredient) {
                  if (watchedIngredient.reason === 'non-vegan') {
                    status = 'danger';
                  } else if (watchedIngredient.reason === 'maybe-non-vegan') {
                    status = 'warning';
                  } else if (watchedIngredient.reason === 'watched') {
                    status = 'warning';
                  }
                }
                
                return (
                  <IngredientItem 
                    key={`${index}-${ingredient}`}
                    name={ingredient}
                    status={status}
                    description={watchedIngredient?.description}
                  />
                );
              })}

              {/* Bevakade ingredienser section - visas bara om det finns några */}
              {product.analysis.watchedIngredients.some(w => w.reason === 'watched') && (
                <>
                  <StyledView className="mt-6 mb-2">
                    <StyledText className="text-lg font-sans-bold text-text-primary">
                      Bevakade ingredienser
                    </StyledText>
                  </StyledView>
                  
                  {product.analysis.watchedIngredients
                    .filter(w => w.reason === 'watched')
                    .map((watchedItem, index) => {
                      const matchedIngredient = product.ingredients.find(
                        ing => ing.toLowerCase().includes(watchedItem.name.toLowerCase()) || 
                              watchedItem.name.toLowerCase().includes(ing.toLowerCase())
                      );
                      
                      return (
                        <IngredientItem 
                          key={`watched-${index}`}
                          name={matchedIngredient || watchedItem.name}
                          status="warning"
                          description={watchedItem.description}
                        />
                      );
                    })}
                </>
              )}
            </StyledView>
          )}
        </StyledView>
        
        {/* Tom vy i botten för att förhindra att innehåll döljs under kontrollerna */}
        <StyledView className="h-24" />
      </StyledScrollView>
      
      {/* Kontroller för att spara/favorit */}
      {saveLoading ? (
        <StyledView className="p-4">
          <ActivityIndicator size="small" color="#6366f1" />
        </StyledView>
      ) : (
        <AnalysisControls 
          onSaveToHistory={handleSaveToHistory}
          isAlreadySaved={product.metadata.isSavedToHistory}
          onFavoriteToggle={handleToggleFavorite}
          isFavorite={product.metadata.isFavorite}
          onShare={handleShareResult}
          onNew={handleNewScan}
        />
      )}
    </StyledSafeAreaView>
  );
} 