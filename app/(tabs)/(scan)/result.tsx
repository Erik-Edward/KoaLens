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
import { Product, ProductAnalysis, WatchedIngredient } from '../../../models/productModel';
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
    console.log('RESULT SCREEN: Available params:', Object.keys(params).join(', '));
    
    const initScreen = async () => {
      try {
        console.log('RESULT SCREEN: Starting initialization');
        
        // Kontrollera om vi har resultat från temp-filen (för fallback-navigering)
        try {
          const tempFilePath = `${FileSystem.cacheDirectory}temp_analysis_result.json`;
          const fileInfo = await FileSystem.getInfoAsync(tempFilePath);
          
          if (fileInfo.exists) {
            console.log('RESULT SCREEN: Found temp analysis file, reading...');
            const tempData = await FileSystem.readAsStringAsync(tempFilePath);
            const tempParams = JSON.parse(tempData);
            
            console.log('RESULT SCREEN: Using temp params:', Object.keys(tempParams).join(', '));
            
            // Uppdatera params från temp-filen
            if (tempParams.analysisResult) {
              params.analysisResult = JSON.stringify(tempParams.analysisResult);
            }
            if (tempParams.videoPath) {
              params.videoPath = tempParams.videoPath;
            }
            if (tempParams.analysisType) {
              params.analysisType = tempParams.analysisType;
            }
            
            // Ta bort temp-filen
            await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
            console.log('RESULT SCREEN: Temp file processed and deleted');
          }
        } catch (tempError) {
          console.log('RESULT SCREEN: No temp file or error reading it:', tempError);
        }
        
        // Spara foto- eller videosökväg om den finns
        if (params.photoPath) {
          photoPathRef.current = params.photoPath as string;
          console.log('RESULT SCREEN: Photo path set:', photoPathRef.current);
        } else if (params.videoPath) {
          photoPathRef.current = params.videoPath as string;
          console.log('RESULT SCREEN: Video path set:', photoPathRef.current);
        }
        
        // Avgör om detta är en videoanalys
        const isVideoAnalysis = params.analysisType === 'video';
        console.log('RESULT SCREEN: Is video analysis:', isVideoAnalysis);
        
        // Hämta användar-ID
        const userId = await getUserId();
        console.log('RESULT SCREEN: User ID retrieved:', userId);
        
        // Hantera analysresultat
        if (params.analysisResult) {
          try {
            console.log('RESULT SCREEN: Found analysis result in params, length:', 
              (params.analysisResult as string)?.length || 0);
            
            // Hantera direktanalys
            const rawData = params.analysisResult as string;
            console.log('RESULT SCREEN: Raw data type:', typeof rawData);
            
            let analysisResult: any = null;
            
            // Parseringförsök 1: Direktparsering av JSON
            try {
              console.log('RESULT SCREEN: Attempting to parse JSON directly');
              analysisResult = JSON.parse(rawData);
              console.log('RESULT SCREEN: JSON parsed successfully');
            } catch (parseError) {
              console.log('RESULT SCREEN: Initial parse failed, trying alternative methods:', parseError);
              // Parseringförsök 2: Hantera dubbel-stringifierad JSON
              try {
                const cleaned = rawData.replace(/^"|"$/g, '').replace(/\\"/g, '"');
                analysisResult = JSON.parse(cleaned);
                console.log('RESULT SCREEN: Parsed JSON from cleaned string');
              } catch (innerError) {
                console.log('RESULT SCREEN: Second parse attempt failed:', innerError);
                
                // Om det är ett objekt redan, använd det direkt
                if (typeof rawData === 'object') {
                  console.log('RESULT SCREEN: Using raw data as object directly');
                  analysisResult = rawData;
                }
                // Behandla rådata som text om det innehåller vissa nyckelord
                else if (typeof rawData === 'string' && 
                    (rawData.includes('The model is overloaded') || 
                     rawData.includes('Error:') || 
                     rawData.includes('Failed') || 
                     rawData.includes('rate limit'))) {
                  console.error('RESULT SCREEN: API error message detected in raw data');
                  throw new Error(`API-tjänsten är överbelastad: ${rawData.substring(0, 100)}`);
                } else {
                  console.error('RESULT SCREEN: Failed to parse analysis result');
                  throw new Error('Kunde inte tolka analysresultatet');
                }
              }
            }
            
            console.log('RESULT SCREEN: Analysis result keys:', Object.keys(analysisResult).join(', '));
            
            // Skapa produktobjekt från analysresultatet
            console.log('RESULT SCREEN: Creating product from analysis result');
            const newProduct = createProductFromAnalysis(
              analysisResult, 
              photoPathRef.current,
              userId
            );
            
            setProduct(newProduct);
            setProgress(100);
            setStatusText("Analys slutförd!");
            setIsLoading(false);
          } catch (error) {
            console.error('RESULT SCREEN: Error handling analysis result:', error);
            setErrorMessage(`Kunde inte tolka analysresultatet: ${error instanceof Error ? error.message : String(error)}`);
            setIsLoading(false);
          }
        } 
        // Ingen analysResult i params, utför egen analys
        else if (photoPathRef.current) {
          try {
            console.log('RESULT SCREEN: No analysis result in params, performing analysis');
            
            const analysisService = new AnalysisService();
            
            // Starta lyssning på analysframsteg
            const progressListener = setInterval(() => {
              setProgress(analysisService.analysisProgress);
            }, 500);
            
            let ingredients: string[] = [];
            let analysisResult;
            
            try {
              if (isVideoAnalysis) {
                console.log('RESULT SCREEN: Performing video analysis');
                setStatusText("Analyserar video...");
                
                // Direkt analys av videofilen
                analysisResult = await analysisService.analyzeVideo(photoPathRef.current);
              } else {
                console.log('RESULT SCREEN: Performing image analysis');
                setStatusText("Extraherar ingredienser från bild...");
                
                // Extrahera ingredienser från bilden först
                ingredients = await analysisService.extractIngredientsFromImage(photoPathRef.current);
                console.log(`RESULT SCREEN: Extracted ${ingredients.length} ingredients`);
                
                // Analysera sedan ingredienserna
                if (ingredients && ingredients.length > 0) {
                  setStatusText("Analyserar ingredienser...");
                  analysisResult = await analysisService.analyzeIngredients(ingredients);
                } else {
                  throw new Error('Kunde inte hitta några ingredienser i bilden');
                }
              }
            } catch (analysisError) {
              console.error('RESULT SCREEN: Analysis error:', analysisError);
              
              // Om analysen misslyckas, försök med direktanalys av bilden
              if (!isVideoAnalysis) {
                console.log('RESULT SCREEN: Falling back to direct image analysis');
                setStatusText("Använder alternativ analysmetod...");
                analysisResult = await analysisService.analyzeImageDirectly(photoPathRef.current);
              } else {
                throw analysisError;
              }
            }
            
            // Avbryt lyssning på analysframsteg
            clearInterval(progressListener);
            
            // Skapa produkt från analysresultatet
            if (analysisResult) {
              console.log('RESULT SCREEN: Analysis succeeded, creating product');
              setProgress(95);
              
              const scanDate = new Date().toISOString();
              let ingredients: string[] = [];
              
              // Extrahera ingredienser
              if (Array.isArray(analysisResult.ingredientList)) {
                ingredients = analysisResult.ingredientList;
              }
              
              // Skapa watchedIngredients
              const watchedIngredients: WatchedIngredient[] = 
                Array.isArray(analysisResult.watchedIngredients) ? 
                  analysisResult.watchedIngredients :
                  [];
              
              // Skapa produkt enligt Product-interfacet
              const newProduct: Product = {
                id: uuidv4(),
                timestamp: scanDate,
                ingredients: ingredients,
                analysis: {
                  isVegan: analysisResult.isVegan === true,
                  confidence: analysisResult.confidence || 0.7,
                  watchedIngredients: watchedIngredients,
                  reasoning: analysisResult.reasoning || ''
                },
                metadata: {
                  userId: userId || 'anonymous',
                  scanDate: scanDate,
                  isFavorite: false,
                  isSavedToHistory: true,
                  source: isVideoAnalysis ? 'video' : 'image',
                  imageUri: photoPathRef.current || undefined,
                  croppedImageUri: photoPathRef.current || undefined,
                  name: 'Analyserad produkt'
                }
              };
              
              setProduct(newProduct);
              setProgress(100);
              setStatusText("Analys slutförd!");
              setIsLoading(false);
            } else {
              throw new Error('Analysen gav inget resultat');
            }
          } catch (error) {
            console.error('RESULT SCREEN: Analysis error:', error);
            setErrorMessage(`Analys misslyckades: ${error instanceof Error ? error.message : String(error)}`);
            setIsLoading(false);
          }
        } else {
          console.error('RESULT SCREEN: No photo path or analysis result');
          setErrorMessage('Ingen bild eller video att analysera');
          setIsLoading(false);
        }
      } catch (error) {
        // Fånga alla oväntade fel
        console.error('RESULT SCREEN: Unexpected error during initialization:', error);
        setErrorMessage(`Ett oväntat fel uppstod: ${error instanceof Error ? error.message : String(error)}`);
        setIsLoading(false);
      }
    };

    initScreen();
    
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
    console.log('RESULT SCREEN: Inside createProductFromAnalysis');
    
    // Bestäm källa (bild eller video)
    const isVideoAnalysis = params.analysisType === 'video';
    const source = isVideoAnalysis ? 'video' : 'image';
    
    if (!analysisResult) {
      throw new Error('Analysresultatet är tomt');
    }
    
    // Extrahera ingredienser från olika API-format
    let ingredients: string[] = [];
    
    if (Array.isArray(analysisResult.ingredients)) {
      ingredients = analysisResult.ingredients.map((i: any) => 
        typeof i === 'string' ? i : i.name || i.ingredient || String(i)
      );
    } else if (Array.isArray(analysisResult.allIngredients)) {
      ingredients = analysisResult.allIngredients.map((i: any) => 
        typeof i === 'string' ? i : i.name || i.ingredient || String(i)
      );
    } else if (typeof analysisResult.text === "string") {
      ingredients = analysisResult.text
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0);
    }
    
    // Sammanställ bevakade ingredienser
    let watchedIngredients: WatchedIngredient[] = [];
    
    if (Array.isArray(analysisResult.watchedIngredients)) {
      watchedIngredients = analysisResult.watchedIngredients;
    } else if (Array.isArray(analysisResult.flaggedIngredients)) {
      watchedIngredients = analysisResult.flaggedIngredients.map((i: any) => ({
        name: i.name || String(i),
        reason: i.reason || 'non-vegan',
        description: i.description || ''
      }));
    } else if (Array.isArray(analysisResult.nonVeganIngredients)) {
      watchedIngredients = analysisResult.nonVeganIngredients.map((i: any) => ({
        name: typeof i === 'string' ? i : i.name || String(i),
        reason: 'non-vegan',
        description: i.description || i.details || ''
      }));
    }
    
    const scanDate = new Date().toISOString();
    
    // Skapa produktobjekt enligt Product-interfacet
    return {
      id: uuidv4(),
      timestamp: scanDate,
      ingredients: ingredients,
      analysis: {
        isVegan: analysisResult.isVegan === true,
        confidence: typeof analysisResult.confidence === 'number' ? analysisResult.confidence : 0.7,
        watchedIngredients: watchedIngredients,
        reasoning: analysisResult.reasoning || analysisResult.summary || '',
        detectedLanguage: analysisResult.detectedLanguage,
        detectedNonVeganIngredients: Array.isArray(analysisResult.nonVeganIngredients) 
          ? analysisResult.nonVeganIngredients.map((i: any) => typeof i === 'string' ? i : i.name || String(i))
          : undefined
      },
      metadata: {
        userId: userId,
        scanDate: scanDate,
        isFavorite: false,
        isSavedToHistory: true,
        source: source,
        imageUri: photoPath || undefined,
        croppedImageUri: photoPath || undefined, 
        name: analysisResult.productName || 'Analyserad produkt'
      }
    };
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
        {/* Video analysis indicator (replacing video player) */}
        {product.metadata.source === 'video' && (
          <StyledView className="w-full bg-primary-light p-4 m-4 rounded-lg">
            <StyledView className="flex-row items-center mb-2">
              <Ionicons name="videocam" size={24} color="#1f2937" />
              <StyledText className="text-text-primary font-sans-bold ml-2">
                Videoanalys genomförd
              </StyledText>
            </StyledView>
            <StyledText className="text-text-secondary">
              Videon har analyserats för att identifiera ingredienser.
            </StyledText>
          </StyledView>
        )}
        
        {/* Produktbild */}
        {product.metadata.source !== 'video' && product.metadata.croppedImageUri && (
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