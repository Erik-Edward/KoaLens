/**
 * Resultatskärm för KoaLens
 * Visar analys av produktingredienser med fokus på säker textrendering
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  ScrollView, 
  ActivityIndicator, 
  Image, 
  Pressable, 
  SafeAreaView, 
  Alert,
  StyleSheet
} from 'react-native';
import { styled } from 'nativewind';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../../hooks/useProducts';
import { useCounter } from '../../../hooks/useCounter';
import { Product, ProductAnalysis } from '../../../models/productModel';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getUserId } from '@/stores/adapter';
import { AnalysisService } from '@/services/analysisService';
import { v4 as uuidv4 } from 'uuid';
import { ProductRepository } from '@/services/productRepository';
import { logScreenView } from '@/lib/analyticsWrapper';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);

/**
 * SafeText-komponent för att säkert rendera text
 * Garanterar att alla värden renderas inom Text-komponenter
 */
function SafeText({ 
  value, 
  fallback = "", 
  style = {},
  numberOfLines
}: { 
  value: any, 
  fallback?: string, 
  style?: any,
  numberOfLines?: number
}) {
  let displayText = fallback;
  
  try {
    if (value === null || value === undefined) {
      displayText = fallback;
    } else if (typeof value === "string") {
      displayText = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      displayText = String(value);
    } else if (Array.isArray(value) || typeof value === "object") {
      displayText = JSON.stringify(value);
    } else {
      displayText = String(value);
    }
  } catch (e) {
    displayText = fallback;
  }
  
  return (
    <StyledText style={style} numberOfLines={numberOfLines}>
      {displayText}
    </StyledText>
  );
}

/**
 * Huvudkomponent för resultatskärmen
 */
export default function ResultScreen() {
  // Lokal state
  const [isLoading, setIsLoading] = useState(true);
  const [product, setProduct] = useState<Product | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState("Förbereder analys...");
  const [isSaved, setIsSaved] = useState(false);
  
  // Referenser
  const photoPathRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Hämta URL-parametrar
  const params = useLocalSearchParams();
  console.log('RESULT SCREEN: Received params:', JSON.stringify(params, null, 2));
  
  const isDirectAnalysis = params.isDirectAnalysis === 'true';
  
  // Hooks
  const { saveToHistory, toggleFavorite } = useProducts();
  
  // Använd en timer för att simulera analysframsteg
  useEffect(() => {
    console.log('RESULT SCREEN: Loading state changed:', isLoading);
    logScreenView('ResultScreen');
    
    if (!isLoading) return;
    
    const progressTimer = setInterval(() => {
      setProgress(prev => {
        const newProgress = Math.min(prev + 2, 99);
        
        // Uppdatera statustext baserat på framsteg
        if (newProgress < 20) {
          setStatusText("Förbereder analys...");
        } else if (newProgress < 40) {
          setStatusText("Optimerar bild...");
        } else if (newProgress < 70) {
          setStatusText("Analyserar ingredienser...");
        } else if (newProgress < 90) {
          setStatusText("Verifierar resultat...");
        } else {
          setStatusText("Nästan klar...");
        }
        
        return newProgress;
      });
    }, 150);
    
    return () => clearInterval(progressTimer);
  }, [isLoading]);
  
  // Hämta och behandla analysresultat från parametrarna
  useEffect(() => {
    // Förhindra dubbel initialisering
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;
    
    let isActive = true;
    
    console.log('RESULT SCREEN: Initializing screen...');
    
    const initScreen = async () => {
      try {
        console.log('RESULT SCREEN: Starting initialization');
        
        // Spara fotosökväg om den finns
        if (params.photoPath) {
          photoPathRef.current = params.photoPath as string;
          console.log('RESULT SCREEN: Photo path set:', photoPathRef.current);
        }
        
        // Hämta användar-ID
        const userId = await getUserId();
        console.log('RESULT SCREEN: User ID retrieved:', userId);
        
        // Hantera analysresultat
        if (params.analysisResult) {
          try {
            console.log('RESULT SCREEN: Found analysis result in params');
            
            // Hantera direktanalys
            const rawData = params.analysisResult as string;
            console.log('RESULT SCREEN: Raw data length:', rawData?.length || 0);
            
            let analysisResult: any = null;
            
            // Parseringförsök 1: Direktparsering av JSON
            try {
              console.log('RESULT SCREEN: Attempting to parse JSON directly');
              analysisResult = JSON.parse(rawData);
              console.log('RESULT SCREEN: JSON parsed successfully');
            } catch (parseError) {
              console.log('RESULT SCREEN: Initial parse failed, trying alternative methods');
              // Parseringförsök 2: Hantera dubbel-stringifierad JSON
              try {
                const cleaned = rawData.replace(/^"|"$/g, '').replace(/\\"/g, '"');
                analysisResult = JSON.parse(cleaned);
                console.log('RESULT SCREEN: Parsed JSON from cleaned string');
              } catch (innerError) {
                // Behandla rådata som text om det innehåller vissa nyckelord
                if (typeof rawData === 'string' && 
                    (rawData.includes('The model is overloaded') || 
                     rawData.includes('Error:') || 
                     rawData.includes('Failed') || 
                     rawData.includes('rate limit'))) {
                  console.error('RESULT SCREEN: API error message detected in raw data');
                  throw new Error(`API-tjänsten är överbelastad: ${rawData.substring(0, 100)}`);
                }
                
                console.error('RESULT SCREEN: Failed to parse analysis result');
                throw new Error('Kunde inte tolka analysresultatet');
              }
            }
            
            // Skapa produktobjekt från analysresultatet
            console.log('RESULT SCREEN: Creating product from analysis result');
            const newProduct: Product = createProductFromAnalysis(
              analysisResult, 
              photoPathRef.current, 
              userId || 'anonymous'
            );
            
            if (isActive) {
              console.log('RESULT SCREEN: Setting product and finishing loading');
              setProduct(newProduct);
              setIsLoading(false);
              setProgress(100);
            }
          } catch (error) {
            if (isActive) {
              console.error('RESULT SCREEN: Error processing analysis result:', error);
              setErrorMessage(`${error instanceof Error ? error.message : 'Ett okänt fel inträffade'}`);
              setIsLoading(false);
            }
          }
        } else {
          // Ingen analysdata tillgänglig
          console.error('RESULT SCREEN: No analysis data available');
          if (isActive) {
            setErrorMessage('Ingen analysinformation tillgänglig');
            setIsLoading(false);
          }
        }
      } catch (error) {
        if (isActive) {
          console.error('RESULT SCREEN: Fatal error during initialization:', error);
          setErrorMessage(`${error instanceof Error ? error.message : 'Ett okänt fel inträffade'}`);
          setIsLoading(false);
        }
      }
    };
    
    // Kör initScreen med en kort fördröjning för att säkerställa att parametrarna har laddats
    setTimeout(() => {
      initScreen().catch(error => {
        console.error('RESULT SCREEN: Unhandled error in initScreen:', error);
        setErrorMessage(`Oväntat fel: ${error instanceof Error ? error.message : 'Okänt fel'}`);
        setIsLoading(false);
      });
    }, 100);
    
    return () => {
      isActive = false;
    };
  }, [params]);
  
  // Funktion för att skapa ett produktobjekt från analysresultatet
  const createProductFromAnalysis = (
    analysisResult: any, 
    photoPath: string | null | undefined,
    userId: string
  ): Product => {
    console.log('RESULT SCREEN: Creating product with analysis result keys:', Object.keys(analysisResult || {}));
    
    // Basprodukt med standardvärden
    const product: Product = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      ingredients: [],
      metadata: {
        scanDate: new Date().toISOString(),
        croppedImageUri: photoPath || undefined,
        isSavedToHistory: false,
        isFavorite: false,
        userId: userId
      },
      analysis: {
        isVegan: false,
        confidence: 0,
        watchedIngredients: [],
        reasoning: 'Ingen analysgrund tillgänglig'
      }
    };
    
    // Uppdatera med faktiska värden från analysresultatet
    if (analysisResult) {
      // Hantera isVegan på ett säkert sätt
      if ('isVegan' in analysisResult) {
        product.analysis.isVegan = analysisResult.isVegan === true;
      }
      
      // Hantera confidence på ett säkert sätt
      if ('confidence' in analysisResult) {
        const confidenceValue = Number(analysisResult.confidence);
        product.analysis.confidence = isNaN(confidenceValue) ? 0 : confidenceValue;
      }
      
      // Hantera reasoning på ett säkert sätt
      if ('reasoning' in analysisResult) {
        if (typeof analysisResult.reasoning === 'string') {
          product.analysis.reasoning = analysisResult.reasoning;
        } else if (analysisResult.reasoning !== null && analysisResult.reasoning !== undefined) {
          try {
            product.analysis.reasoning = JSON.stringify(analysisResult.reasoning);
          } catch (e) {
            product.analysis.reasoning = 'Kunde inte konvertera analysgrund';
          }
        }
      }
      
      // Hantera ingredienser på ett säkert sätt
      if ('ingredientList' in analysisResult && Array.isArray(analysisResult.ingredientList)) {
        product.ingredients = analysisResult.ingredientList
          .filter((item: any) => item !== null && item !== undefined)
          .map((item: any) => typeof item === 'string' ? item : String(item));
      }
      
      // Hantera icke-veganska ingredienser
      if ('nonVeganIngredients' in analysisResult && 
          Array.isArray(analysisResult.nonVeganIngredients)) {
        // Kopiera nonVeganIngredients direkt till produkten för enkel åtkomst senare
        (product.analysis as any).nonVeganIngredients = analysisResult.nonVeganIngredients
          .filter((item: any) => item !== null && item !== undefined)
          .map((item: any) => typeof item === 'string' ? item : String(item));
          
        // Lägg till icke-veganska ingredienser i watchedIngredients
        const nonVeganWatched = analysisResult.nonVeganIngredients
          .filter((item: any) => item !== null && item !== undefined)
          .map((item: any) => ({
            name: typeof item === 'string' ? item : String(item),
            reason: 'non-vegan',
            description: 'Identifierad som icke-vegansk'
          }));
          
        product.analysis.watchedIngredients = [
          ...product.analysis.watchedIngredients,
          ...nonVeganWatched
        ];
      }
      
      // Hantera bevakade ingredienser direkt från analysresultatet
      if ('watchedIngredients' in analysisResult && 
          Array.isArray(analysisResult.watchedIngredients)) {
        const safeWatchedIngredients = analysisResult.watchedIngredients
          .filter((item: any) => item !== null && item !== undefined && typeof item === 'object')
          .map((item: any) => ({
            name: typeof item.name === 'string' ? item.name : String(item.name || ''),
            reason: typeof item.reason === 'string' ? item.reason : 'unknown',
            description: item.description ? String(item.description) : undefined
          }));
          
        // Kombinera med befintliga bevakade ingredienser
        product.analysis.watchedIngredients = [
          ...product.analysis.watchedIngredients,
          ...safeWatchedIngredients
        ];
      }
    }
    
    return product;
  };
  
  // Hantera navigering tillbaka
  const handleBack = () => {
    router.back();
  };
  
  // Hantera spara till historik
  const handleSaveToHistory = async () => {
    if (!product) return;
    
    try {
      setIsLoading(true);
      
      // Kopiera bilden till en permanent lagringsplats innan vi sparar
      let permanentImageUri = product.metadata.croppedImageUri;
      
      if (permanentImageUri) {
        try {
          console.log('Kopierar bild till permanent lagring...');
          // Skapa ett unikt filnamn baserat på produkt-ID
          const timestamp = new Date().getTime();
          const newFileName = `${product.id}_${timestamp}.jpg`;
          const permanentDir = `${FileSystem.documentDirectory}images/`;
          
          // Skapa images-katalogen om den inte finns
          const dirInfo = await FileSystem.getInfoAsync(permanentDir);
          if (!dirInfo.exists) {
            console.log('Skapar bildkatalog...');
            await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
          }
          
          const newUri = `${permanentDir}${newFileName}`;
          console.log(`Kopierar från ${permanentImageUri} till ${newUri}`);
          
          // Kopiera bilden till den permanenta platsen
          await FileSystem.copyAsync({
            from: permanentImageUri,
            to: newUri
          });
          
          console.log('Bild kopierad till permanent lagring:', newUri);
          permanentImageUri = newUri;
        } catch (imgError) {
          console.error('Fel vid kopiering av bild:', imgError);
          // Om något går fel fortsätter vi ändå men utan bild
          permanentImageUri = undefined;
        }
      }
      
      // Uppdatera metadata med den permanenta bildsökvägen
      const updatedProduct = {
        ...product,
        metadata: {
          ...product.metadata,
          croppedImageUri: permanentImageUri,
          isSavedToHistory: true
        }
      };
      
      // Spara till historik
      const repository = ProductRepository.getInstance();
      await repository.updateProduct(updatedProduct);
      
      // Uppdatera lokalt produktobjekt
      setProduct(updatedProduct);
      setIsSaved(true);
      setIsLoading(false);
      
      console.log('Produkt sparad till historik med bildsökväg:', permanentImageUri);
      Alert.alert("Sparad", "Produkten har sparats i din historik.");
    } catch (error) {
      console.error('Kunde inte spara produkt:', error);
      setIsLoading(false);
      Alert.alert("Fel", "Kunde inte spara produkten. Försök igen.");
    }
  };
  
  // Hantera favorit-togglering
  const handleToggleFavorite = async () => {
    if (!product || !product.metadata.isSavedToHistory) return;
    
    try {
      // Uppdatera UI omedelbart för bättre användarupplevelse
      const updatedProduct = {
        ...product,
        metadata: {
          ...product.metadata,
          isFavorite: !product.metadata.isFavorite
        }
      };
      
      setProduct(updatedProduct);
      
      // Uppdatera i databasen
      await toggleFavorite(product.id);
    } catch (error) {
      console.error('Kunde inte ändra favoritstatus:', error);
      // Återställ UI om det misslyckas
      setProduct(product);
    }
  };
  
  // Hantera delning av resultat
  const handleShare = async () => {
    if (!product) return;
    
    try {
      // Förbered text för delning
      const veganStatus = product.analysis.isVegan ? 'Vegansk' : 'Ej vegansk';
      const confidence = Math.round(product.analysis.confidence * 100);
      const ingredients = product.ingredients.join(', ');
      
      let reasoning = '';
      if (typeof product.analysis.reasoning === 'string') {
        reasoning = product.analysis.reasoning;
      } else if (product.analysis.reasoning !== null && product.analysis.reasoning !== undefined) {
        try {
          reasoning = JSON.stringify(product.analysis.reasoning);
        } catch (e) {
          reasoning = 'Kunde inte konvertera analysgrund';
        }
      }
      
      const resultText = `KoaLens analys: ${veganStatus} (${confidence}% säkerhet)\n\nIngredienser: ${ingredients}\n\n${reasoning}`;
      
      // Kontrollera om delning är tillgänglig
      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        Alert.alert("Inte tillgänglig", "Delning är inte tillgänglig på din enhet");
        return;
      }
      
      // Dela med bild om tillgänglig, annars med text
      if (product.metadata.croppedImageUri) {
        try {
          console.log('Delar bild:', product.metadata.croppedImageUri);
          await Sharing.shareAsync(product.metadata.croppedImageUri, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Dela KoaLens-analys'
          });
        } catch (shareError) {
          console.error('Fel vid delning av bild:', shareError);
          // Om bilddelning misslyckas, fallback till textdelning
          const tempFilePath = `${FileSystem.documentDirectory}koalens_analys.txt`;
          await FileSystem.writeAsStringAsync(tempFilePath, resultText);
          
          await Sharing.shareAsync(tempFilePath, {
            mimeType: 'text/plain',
            dialogTitle: 'Dela KoaLens-analys'
          });
        }
      } else {
        // Skapa en temporär textfil för delning
        const tempFilePath = `${FileSystem.documentDirectory}koalens_analys.txt`;
        await FileSystem.writeAsStringAsync(tempFilePath, resultText);
        
        await Sharing.shareAsync(tempFilePath, {
          mimeType: 'text/plain',
          dialogTitle: 'Dela KoaLens-analys'
        });
      }
    } catch (error) {
      console.error('Fel vid delning:', error);
      Alert.alert("Fel", "Kunde inte dela analysen. Försök igen.");
    }
  };
  
  // Hantera ny skanning
  const handleNewScan = () => {
    router.replace('/(tabs)/(scan)');
  };
  
  // ===== UI-rendering =====
  
  // Visa laddningsskärm
  if (isLoading) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <StyledView className="w-64 items-center">
          {/* Analysstatustext */}
          <StyledText className="text-text-primary font-sans-medium text-center mb-4">
            {statusText}
          </StyledText>
          
          {/* Cirkulär framstegsindikator */}
          <StyledView className="w-20 h-20 rounded-full border-4 border-primary-light justify-center items-center mb-4">
            <StyledText className="text-primary-main font-sans-bold text-xl">
              {progress}%
            </StyledText>
          </StyledView>
          
          {/* Linjär framstegsindikator */}
          <StyledView className="w-full h-2 bg-gray-200 rounded-full">
            <StyledView 
              className="h-2 bg-primary-main rounded-full" 
              style={{ width: `${progress}%` }} 
            />
          </StyledView>
        </StyledView>
      </StyledView>
    );
  }
  
  // Visa felskärm
  if (errorMessage || !product) {
    return (
      <StyledSafeAreaView className="flex-1 bg-background-main">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
          <StyledText className="mt-4 text-text-primary text-center font-sans-bold text-lg">
            Något gick fel
          </StyledText>
          <StyledText className="mt-2 text-text-secondary text-center font-sans">
            {errorMessage || 'Kunde inte analysera ingredienserna'}
          </StyledText>
          
          <StyledPressable 
            onPress={handleBack}
            className="mt-6 bg-primary-main py-2 px-4 rounded-md"
          >
            <StyledText className="text-white font-sans-bold">
              Tillbaka
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledSafeAreaView>
    );
  }
  
  // Visa analysresultat
  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      {/* Header */}
      <StyledView className="flex-row justify-between items-center p-4 border-b border-gray-200">
        <StyledPressable onPress={handleBack} className="flex-row items-center">
          <Ionicons name="chevron-back" size={24} color="#1f2937" />
          <StyledText className="text-text-primary font-sans-medium ml-1">
            Tillbaka
          </StyledText>
        </StyledPressable>
        <StyledText className="text-text-primary font-sans-bold text-lg">
          Resultat
        </StyledText>
        <StyledView style={{ width: 70 }} />
      </StyledView>
      
      <StyledScrollView className="flex-1">
        {/* Produktbild */}
        {product.metadata.croppedImageUri && (
          <StyledView className="w-full h-64 bg-black">
            <StyledImage 
              source={{ uri: product.metadata.croppedImageUri }} 
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
          
          {/* Analysgrund */}
          <StyledView 
            className={`mt-2 ${
              product.analysis.isVegan ? 'bg-green-50' : 'bg-red-50'
            } p-2 rounded-md`}
          >
            <SafeText 
              value={product.analysis.reasoning} 
              fallback="Ingen analysgrund tillgänglig"
              style={{ color: product.analysis.isVegan ? '#166534' : '#991b1b' }}
            />
          </StyledView>
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
              {/* Alla ingredienser */}
              {product.ingredients.map((ingredient, index) => {
                // Avgör om ingrediensen är icke-vegansk
                const isNonVegan = product.analysis.watchedIngredients.some(
                  w => w.name.toLowerCase() === ingredient.toLowerCase() && w.reason === 'non-vegan'
                );
                
                return (
                  <StyledView 
                    key={`ingredient-${index}`} 
                    className={`mb-2 p-2 rounded-md ${isNonVegan ? 'bg-red-50' : 'bg-gray-50'}`}
                  >
                    <StyledView className="flex-row items-center">
                      <StyledView 
                        className={`w-3 h-3 rounded-full mr-2 ${isNonVegan ? 'bg-red-500' : 'bg-green-500'}`} 
                      />
                      <SafeText 
                        value={ingredient}
                        style={{ 
                          fontSize: 16,
                          color: isNonVegan ? '#991b1b' : '#1f2937'
                        }}
                      />
                    </StyledView>
                  </StyledView>
                );
              })}
              
              {/* Icke-veganska ingredienser-sektion */}
              {product.analysis.watchedIngredients.some(w => w.reason === 'non-vegan') && (
                <StyledView className="mt-4">
                  <StyledText className="text-lg font-sans-bold text-red-800 mb-2">
                    Icke-veganska ingredienser
                  </StyledText>
                  
                  {product.analysis.watchedIngredients
                    .filter(w => w.reason === 'non-vegan')
                    .map((item, index) => (
                      <StyledView key={`nonvegan-${index}`} className="mb-2">
                        <StyledView className="flex-row items-center">
                          <StyledView className="w-3 h-3 rounded-full mr-2 bg-red-500" />
                          <SafeText 
                            value={item.name}
                            style={{ color: '#991b1b' }}
                          />
                        </StyledView>
                        
                        {item.description && (
                          <StyledView className="ml-5 mt-1 p-2 bg-red-50 rounded">
                            <SafeText 
                              value={item.description}
                              style={{ fontSize: 12, color: '#991b1b' }}
                            />
                          </StyledView>
                        )}
                      </StyledView>
                    ))
                  }
                </StyledView>
              )}
            </StyledView>
          )}
        </StyledView>
        
        {/* Tomt utrymme i botten */}
        <StyledView className="h-24" />
      </StyledScrollView>
      
      {/* Kontroller (spara, favorit, dela, ny skanning) */}
      <StyledView className="flex-row justify-between p-4 border-t border-gray-200">
        <StyledPressable
          onPress={handleNewScan}
          className="flex-row items-center justify-center bg-primary-main py-2 px-4 rounded-md"
        >
          <Ionicons name="camera-outline" size={18} color="white" />
          <StyledText className="text-white font-sans-bold ml-2">
            Ny skanning
          </StyledText>
        </StyledPressable>
        
        <StyledView className="flex-row">
          <StyledPressable
            onPress={handleShare}
            className="flex-row items-center justify-center p-2 rounded-md mr-2 bg-background-light"
          >
            <Ionicons name="share-outline" size={18} color="#6b7280" />
          </StyledPressable>
          
          <StyledPressable
            onPress={handleToggleFavorite}
            disabled={!product.metadata.isSavedToHistory}
            className="flex-row items-center justify-center p-2 rounded-md mr-2 bg-background-light"
          >
            <Ionicons 
              name={product.metadata.isFavorite ? "heart" : "heart-outline"} 
              size={18} 
              color={product.metadata.isFavorite ? "#ef4444" : "#6b7280"} 
            />
          </StyledPressable>
          
          <StyledPressable
            onPress={handleSaveToHistory}
            disabled={product.metadata.isSavedToHistory}
            className={`flex-row items-center justify-center py-2 px-4 rounded-md ${
              product.metadata.isSavedToHistory ? 'bg-background-light' : 'bg-primary-main'
            }`}
          >
            <Ionicons 
              name="bookmark-outline" 
              size={18} 
              color={product.metadata.isSavedToHistory ? "#6b7280" : "white"} 
            />
            <StyledText 
              className={`font-sans-bold ml-2 ${
                product.metadata.isSavedToHistory ? 'text-text-primary' : 'text-white'
              }`}
            >
              {product.metadata.isSavedToHistory ? "Sparad" : "Spara"}
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
} 