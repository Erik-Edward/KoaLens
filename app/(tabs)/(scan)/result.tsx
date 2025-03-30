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
  StyleSheet,
  Platform
} from 'react-native';
import { styled } from 'nativewind';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
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
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  }
});

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

// Mock data för fallback
const mockAnalysisResult = {
  isVegan: false,
  confidence: 0.75,
  watchedIngredients: [
    {
      name: "Mjölk",
      reason: "Mjölk är en animalisk produkt",
      description: "Mjölk kommer från kor och är därför inte veganskt."
    }
  ],
  ingredientList: ["Socker", "Vetemjöl", "Mjölk", "Salt"],
  reasoning: "OBS! DETTA ÄR DEMO-DATA. Produkten innehåller mjölk vilket gör den icke-vegansk."
};

// Funktion för att parse JSON säkert
function safeJsonParse(jsonString: string | undefined, fallback: any = null) {
  if (!jsonString) return fallback;
  
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Kunde inte tolka JSON:', error, jsonString);
    return fallback;
  }
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
  const [videoPath, setVideoPath] = useState<string | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('image');
  const [showVideoThumbnail, setShowVideoThumbnail] = useState(false);
  const [isDemo, setIsDemo] = useState(false); // Indikator för demo-data
  
  // Referenser
  const photoPathRef = useRef<string | null>(null);
  const hasInitializedRef = useRef(false);
  
  // Hämta URL-parametrar
  const params = useLocalSearchParams();
  const router = useRouter();
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
    console.log('[DEBUG] ResultScreen mount/params update triggered');
    console.log('[DEBUG] Params object:', Object.keys(params).length ? params : 'empty params');
    
    // Förhindra dubbla initieringar
    if (hasInitializedRef.current) {
      console.log('[DEBUG] Redan initialiserad, skipping');
      return;
    }
    
    const initializeFromParams = async () => {
      try {
        console.log('[DEBUG] Initi start, setting loading true');
        hasInitializedRef.current = true;
        setIsLoading(true);
        
        console.log('RESULT SCREEN: Initializing screen...');
        console.log('RESULT SCREEN: Available params:', Object.keys(params).join(', '));
        console.log('RESULT SCREEN: Starting initialization');
        
        // Kontrollera först om vi har ett videoPath
        if (params.videoPath) {
          console.log('RESULT SCREEN: Video path set:', params.videoPath);
          setVideoPath(params.videoPath as string);
          setAnalysisType('video');
        }
        
        // Kontrollera om detta är resultatet av en videoanalys
        const isVideoAnalysis = params.analysisType === 'video';
        console.log('RESULT SCREEN: Is video analysis:', isVideoAnalysis);
        
        if (isVideoAnalysis) {
          setAnalysisType('video');
        }
        
        // Hämta användarens ID för att spara produkten
        const userId = await getUserId();
        console.log('RESULT SCREEN: User ID retrieved:', userId);
        
        // Kontrollera om vi har analysresultat i params
        if (params.analysisResult) {
          const resultString = params.analysisResult as string;
          console.log('RESULT SCREEN: Found analysis result in params, length:', resultString.length);
          
          // Kontrollera vad för typ av data vi har
          console.log('RESULT SCREEN: Raw data type:', typeof resultString);
          
          try {
            // Försök tolka JSON direkt
            console.log('RESULT SCREEN: Attempting to parse JSON directly');
            let parsedResult;
            
            // Förbättrad JSON parsing med konvertering av häftiga data
            try {
              parsedResult = JSON.parse(resultString);
              console.log('RESULT SCREEN: Direct JSON parsing succeeded');
            } catch (initialParseError) {
              console.error('RESULT SCREEN: Initial JSON parse failed:', initialParseError);
              
              // Försök rensa strängen och tolka igen
              try {
                // Om strängen innehåller escape-tecken som stör parsningen
                const cleanedString = resultString
                  .replace(/\\"/g, '"')        // Ersätt \" med "
                  .replace(/^"|"$/g, '')       // Ta bort omslutande citattecken
                  .replace(/\\n/g, ' ')        // Ersätt radbrytningar med mellanslag
                  .replace(/\\\\/g, '\\');     // Ersätt \\ med \
                
                console.log('RESULT SCREEN: Trying with cleaned string');
                parsedResult = JSON.parse(cleanedString);
                console.log('RESULT SCREEN: Cleaned JSON parsing succeeded');
              } catch (secondParseError) {
                console.error('RESULT SCREEN: Second parse attempt failed:', secondParseError);
                throw new Error('Kunde inte tolka analysresultatet från JSON');
              }
            }
            
            // Skriv ut hela resultatet för felsökning
            console.log('RESULT SCREEN: Parsed result:', JSON.stringify(parsedResult));
            
            // Validera att det är ett giltigt analysresultat
            console.log('RESULT SCREEN: JSON parsed successfully');
            console.log('RESULT SCREEN: Analysis result keys:', Object.keys(parsedResult).join(', '));
            
            if (!parsedResult.isVegan && parsedResult.isVegan !== false) {
              console.error('RESULT SCREEN: Missing isVegan property in result');
              throw new Error('Invalid analysis result: Missing isVegan property');
            }
            
            if (!parsedResult.confidence && parsedResult.confidence !== 0) {
              console.error('RESULT SCREEN: Missing confidence property in result');
              throw new Error('Invalid analysis result: Missing confidence property');
            }
            
            // Skapa en produkt från analysresultatet
            console.log('RESULT SCREEN: Creating product from analysis result');
            const product = createProductFromAnalysis(parsedResult, userId, params.videoPath as string | undefined);
            
            // Uppdatera state med produkten
            setProduct(product);
            
            // Det kan vara en demo/mockup
            if (parsedResult.reasoning && parsedResult.reasoning.includes('DEMO-DATA')) {
              setIsDemo(true);
            }
            
            // Spara produkten om användaren är autentiserad
            if (userId) {
              try {
                await saveToHistory(product);
                console.log('RESULT SCREEN: Product saved to history');
              } catch (saveError) {
                console.error('RESULT SCREEN: Error saving to history:', saveError);
              }
            }
          } catch (parseError) {
            console.error('RESULT SCREEN: Error parsing analysis result:', parseError);
            setErrorMessage('Ett fel uppstod vid bearbetning av analysresultatet. Försök igen.');
          }
        } else {
          console.error('RESULT SCREEN: No analysis result in params');
          setErrorMessage('Inget analysresultat att visa. Gå tillbaka och försök igen.');
        }
      } catch (error: any) {
        console.error('RESULT SCREEN: Error during initialization:', error);
        setErrorMessage(`Ett fel uppstod: ${error.message || 'Okänt fel'}`);
      } finally {
        setIsLoading(false);
        console.log('RESULT SCREEN: Loading state changed:', false);
      }
    };
    
    if (Object.keys(params).length > 0) {
      console.log('[DEBUG] Params finns, initierar');
      initializeFromParams();
    } else {
      console.log('[DEBUG] Inga params, avbryter init');
      setErrorMessage('Ingen analys att visa. Starta en ny analys.');
      setIsLoading(false);
    }
  }, [params]);
  
  // Skapar en produkt från analysresultatet
  const createProductFromAnalysis = (analysisResult: any, userId: string | null, videoPath?: string): Product => {
    console.log('RESULT SCREEN: Inside createProductFromAnalysis, input:', JSON.stringify(analysisResult).substring(0, 200) + '...');
    
    try {
      // Validera och normalisera resultat
      const ingredients = Array.isArray(analysisResult.ingredientList) 
        ? analysisResult.ingredientList 
        : [];
      
      // Se till att vi har en watchedIngredients-array med korrekt format
      let watchedIngredients = [];
      if (Array.isArray(analysisResult.watchedIngredients)) {
        // Validera och normalisera varje watchedIngredient
        watchedIngredients = analysisResult.watchedIngredients.map((item: any) => {
          return {
            name: item.name || item.ingredient || (typeof item === 'string' ? item : 'Okänd ingrediens'),
            reason: item.reason || 'okänd anledning',
            description: item.description || ''
          };
        });
      }
        
      // Säkerställ att vi har en reasoning-sträng
      const reasoning = typeof analysisResult.reasoning === 'string' 
        ? analysisResult.reasoning 
        : 'Ingen förklaring tillgänglig';
      
      // Säkerställ tidsstämpeln
      const scanDate = new Date().toISOString();
      
      console.log('RESULT SCREEN: Prepared product data for display');
      
      // Skapa produkt
      return {
        id: uuidv4(),
        timestamp: scanDate,
        ingredients: ingredients,
        analysis: {
          isVegan: analysisResult.isVegan === true,
          confidence: typeof analysisResult.confidence === 'number' ? analysisResult.confidence : 0.5,
          watchedIngredients: watchedIngredients,
          reasoning: reasoning,
          detectedLanguage: analysisResult.detectedLanguage || 'sv'
        },
        metadata: {
          userId: userId || 'anonymous',
          scanDate: scanDate,
          isFavorite: false,
          isSavedToHistory: true,
          source: 'video',
          imageUri: '',
          name: 'Analyserad produkt'
        }
      };
    } catch (error) {
      console.error('RESULT SCREEN: Error creating product from analysis:', error);
      
      // Skapa ett nödfall-produktobjekt med minimala data
      return {
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        ingredients: [],
        analysis: {
          isVegan: false,
          confidence: 0,
          watchedIngredients: [],
          reasoning: 'Kunde inte skapa produkt från analysresultat'
        },
        metadata: {
          userId: userId || 'anonymous',
          scanDate: new Date().toISOString(),
          isFavorite: false,
          isSavedToHistory: false,
          source: 'video',
          imageUri: '',
          name: 'Analysfel'
        }
      };
    }
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
      <StyledView className="flex-1 bg-background-main">
        <StatusBar style="dark" />
        <Stack.Screen options={{ 
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarTranslucent: true
        }} />
        
        {/* Garantera extra utrymme för Android */}
        {Platform.OS === 'android' && (
          <StyledView style={{ height: 25 }} />
        )}
        
        <StyledSafeAreaView className="flex-1 justify-center items-center">
          <StyledView className="items-center bg-white p-8 rounded-2xl shadow-lg">
            <StyledText className="text-xl font-sans-bold text-center mb-6 text-text-primary">
              Analyserar produkt
            </StyledText>
            
            {/* Cirkulär framstegsindikator */}
            <StyledView className="w-24 h-24 rounded-full border-4 border-primary-main justify-center items-center mb-6 border-t-gray-200 animate-spin">
              <StyledView className="w-20 h-20 rounded-full bg-primary-light/50 justify-center items-center">
                <StyledText className="text-primary-main font-sans-bold text-xl">
                  {progress}%
                </StyledText>
              </StyledView>
            </StyledView>
            
            {/* Statustext */}
            <StyledText className="text-base text-text-secondary text-center mb-5">
              {statusText}
            </StyledText>
            
            {/* Linjär framstegsindikator */}
            <StyledView className="w-64 h-2 bg-gray-200 rounded-full overflow-hidden">
              <StyledView 
                className="h-2 bg-primary-main rounded-full" 
                style={{ width: `${progress}%` }} 
              />
            </StyledView>
          </StyledView>
        </StyledSafeAreaView>
      </StyledView>
    );
  }
  
  // Visa felskärm
  if (errorMessage || !product) {
    return (
      <StyledView className="flex-1 bg-background-main">
        <StatusBar style="dark" />
        <Stack.Screen options={{ 
          headerShown: false,
          statusBarStyle: 'dark',
          statusBarTranslucent: true
        }} />
        
        {/* Garantera extra utrymme för Android */}
        {Platform.OS === 'android' && (
          <StyledView style={{ height: 25 }} />
        )}
        
        <StyledSafeAreaView className="flex-1 justify-center items-center p-4">
          <StyledView className="bg-white p-8 rounded-2xl shadow-lg items-center w-4/5">
            <Ionicons name="alert-circle-outline" size={48} color="#ef4444" />
            <StyledText className="mt-4 text-text-primary text-center font-sans-bold text-lg">
              Något gick fel
            </StyledText>
            <StyledText className="mt-2 text-text-secondary text-center font-sans">
              {errorMessage || 'Kunde inte analysera ingredienserna'}
            </StyledText>
            
            <StyledPressable 
              onPress={handleBack}
              className="mt-6 bg-primary-main py-3 px-6 rounded-lg"
            >
              <StyledText className="text-white font-sans-bold">
                Tillbaka
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledSafeAreaView>
      </StyledView>
    );
  }
  
  // Visa analysresultat
  return (
    <StyledView className="flex-1 bg-white">
      <StatusBar style="dark" />
      <Stack.Screen options={{ 
        headerShown: false,
        statusBarStyle: 'dark',
        // Sätt statusbar-höjd för bättre layout
        statusBarTranslucent: true
      }} />
      
      {/* Garantera extra utrymme för Android */}
      {Platform.OS === 'android' && (
        <StyledView style={{ height: 25 }} />
      )}
      
      {/* Säker område för innehållet som tar hänsyn till statusbar */}
      <StyledSafeAreaView className="flex-1">
        {/* Visa demobanner om det är demodata */}
        {isDemo && (
          <StyledView className="bg-amber-500 px-4 py-2">
            <StyledText className="text-white text-center font-medium">
              Detta är demo-data. Videoanalys-API är för närvarande i beta.
            </StyledText>
          </StyledView>
        )}

        {/* Header med centrerad rubrik i eget utrymme, med extra marginal baserat på plattform */}
        <StyledView 
          className="px-4 pb-4 border-b border-gray-100 mb-2"
          style={{ 
            paddingTop: Platform.OS === 'ios' ? 12 : 16, // iOS behöver lite mindre padding
            marginTop: Platform.OS === 'android' ? 10 : 0 // Android behöver extra marginal i toppen
          }}
        >
          <StyledText className="text-xl font-bold text-center">Analysresultat</StyledText>
        </StyledView>
        
        <StyledScrollView className="flex-1">
          {/* Video analysis indicator med förbättrad design */}
          {product.metadata.source === 'video' && (
            <StyledView className="w-full bg-indigo-50 p-5 my-3 mx-4 rounded-xl shadow-sm border border-indigo-100">
              <StyledView className="flex-row items-center mb-2">
                <StyledView className="w-10 h-10 rounded-full bg-indigo-100 justify-center items-center mr-3">
                  <Ionicons name="videocam" size={20} color="#4f46e5" />
                </StyledView>
                <StyledText className="text-indigo-900 font-sans-bold text-lg">
                  Videoanalys genomförd
                </StyledText>
              </StyledView>
              <StyledText className="text-indigo-700 text-base ml-1">
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
            className={`mx-4 my-5 p-6 rounded-xl shadow-sm ${
              product.analysis.isVegan ? 'bg-green-100' : 'bg-red-100'
            }`}
          >
            <StyledView className="flex items-center justify-center mb-2">
              <StyledView 
                className={`w-16 h-16 rounded-full flex items-center justify-center ${
                  product.analysis.isVegan ? 'bg-green-200' : 'bg-red-200'
                }`}
              >
                <Ionicons 
                  name={product.analysis.isVegan ? "checkmark-circle" : "close-circle"} 
                  size={40} 
                  color={product.analysis.isVegan ? "#15803d" : "#b91c1c"} 
                />
              </StyledView>
            </StyledView>
            
            <StyledText 
              className={`text-xl font-sans-bold text-center ${
                product.analysis.isVegan ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {product.analysis.isVegan ? 'Vegansk' : 'Ej vegansk'}
            </StyledText>
            
            <StyledText 
              className={`mt-2 text-base text-center ${
                product.analysis.isVegan ? 'text-green-700' : 'text-red-700'
              }`}
            >
              Säkerhet: {Math.round(product.analysis.confidence * 100)}%
            </StyledText>
            
            {/* Analysgrund */}
            <StyledView 
              className={`mt-4 ${
                product.analysis.isVegan ? 'bg-green-50' : 'bg-red-50'
              } p-4 rounded-lg`}
            >
              <SafeText 
                value={product.analysis.reasoning} 
                fallback="Ingen analysgrund tillgänglig"
                style={{ 
                  color: product.analysis.isVegan ? '#166534' : '#991b1b',
                  fontSize: 15,
                  lineHeight: 22,
                  textAlign: 'center'
                }}
              />
            </StyledView>
          </StyledView>
          
          {/* Ingredienslista */}
          <StyledView className="mx-4 mb-8">
            <StyledText className="text-xl font-sans-bold text-text-primary mb-4">
              Ingredienser
            </StyledText>
            
            {product.ingredients.length === 0 ? (
              <StyledText className="text-text-secondary italic">
                Inga ingredienser hittades
              </StyledText>
            ) : (
              <StyledView className="bg-gray-50 p-4 rounded-xl">
                {/* Alla ingredienser */}
                {product.ingredients.map((ingredient, index) => {
                  // Avgör om ingrediensen är icke-vegansk
                  const isNonVegan = product.analysis.watchedIngredients.some(
                    w => w.name.toLowerCase() === ingredient.toLowerCase() && w.reason === 'non-vegan'
                  );
                  
                  // Avgör om ingrediensen är granskad (men vegansk/oklar)
                  const isWatched = product.analysis.watchedIngredients.some(
                    w => w.name.toLowerCase() === ingredient.toLowerCase() && w.reason !== 'non-vegan'
                  );
                  
                  let iconName = "leaf-outline";
                  let iconColor = "#15803d"; // grön
                  let bgColor = "bg-white";
                  let textColor = "#1f2937";
                  
                  if (isNonVegan) {
                    iconName = "close-circle";
                    iconColor = "#b91c1c"; // röd
                    bgColor = "bg-red-50";
                    textColor = "#991b1b";
                  } else if (isWatched) {
                    iconName = "alert-circle-outline";
                    iconColor = "#92400e"; // gul/orange
                    bgColor = "bg-amber-50";
                    textColor = "#92400e";
                  }
                  
                  return (
                    <StyledView 
                      key={`ingredient-${index}`} 
                      className={`mb-3 p-3 rounded-lg ${bgColor} shadow-sm`}
                    >
                      <StyledView className="flex-row items-center">
                        <Ionicons name={iconName} size={20} color={iconColor} style={{ marginRight: 8 }} />
                        <SafeText 
                          value={ingredient}
                          style={{ 
                            fontSize: 16,
                            color: textColor,
                            fontWeight: '500'
                          }}
                        />
                      </StyledView>
                    </StyledView>
                  );
                })}
                
                {/* Förklaring av ikoner */}
                <StyledView className="mt-4 p-3 bg-gray-100 rounded-lg">
                  <StyledText className="text-sm text-gray-700 font-medium mb-2">Förklaring:</StyledText>
                  <StyledView className="flex-row items-center mb-1">
                    <Ionicons name="leaf-outline" size={16} color="#15803d" style={{ marginRight: 8 }} />
                    <StyledText className="text-sm text-gray-600">Vegansk ingrediens</StyledText>
                  </StyledView>
                  <StyledView className="flex-row items-center mb-1">
                    <Ionicons name="alert-circle-outline" size={16} color="#92400e" style={{ marginRight: 8 }} />
                    <StyledText className="text-sm text-gray-600">Granskad ingrediens</StyledText>
                  </StyledView>
                  <StyledView className="flex-row items-center">
                    <Ionicons name="close-circle" size={16} color="#b91c1c" style={{ marginRight: 8 }} />
                    <StyledText className="text-sm text-gray-600">Icke-vegansk ingrediens</StyledText>
                  </StyledView>
                </StyledView>
                
                {/* Detaljerad information om granskade ingredienser */}
                {product.analysis.watchedIngredients.length > 0 && (
                  <StyledView className="mt-6 bg-gray-100 p-4 rounded-lg">
                    <StyledText className="text-lg font-sans-bold text-gray-800 mb-3">
                      Detaljer om granskade ingredienser
                    </StyledText>
                    
                    {product.analysis.watchedIngredients.map((item, index) => (
                      <StyledView key={`detail-${index}`} className="mb-3 bg-white p-4 rounded-lg shadow-sm">
                        <StyledView className="flex-row items-center mb-2">
                          <Ionicons 
                            name={item.reason === 'non-vegan' ? "close-circle" : "alert-circle-outline"} 
                            size={20} 
                            color={item.reason === 'non-vegan' ? "#b91c1c" : "#92400e"} 
                            style={{ marginRight: 8 }}
                          />
                          <StyledText 
                            className={`font-sans-bold text-base ${
                              item.reason === 'non-vegan' ? 'text-red-800' : 'text-amber-800'
                            }`}
                          >
                            {item.name}
                          </StyledText>
                        </StyledView>
                        
                        <StyledText 
                          className={`text-sm ml-7 ${
                            item.reason === 'non-vegan' ? 'text-red-700' : 'text-amber-700'
                          }`}
                        >
                          {item.reason === 'non-vegan' 
                            ? (item.description || 'Icke-vegansk ingrediens') 
                            : (item.description || 'Potentiellt problematisk ingrediens')}
                        </StyledText>
                      </StyledView>
                    ))}
                  </StyledView>
                )}
              </StyledView>
            )}
          </StyledView>
          
          {/* Tomt utrymme i botten */}
          <StyledView className="h-32" />
        </StyledScrollView>
        
        {/* Kontroller (spara, favorit, dela, ny skanning) */}
        <StyledView className="absolute bottom-0 left-0 right-0 flex-row justify-between p-4 border-t border-gray-200 bg-white shadow-lg">
          <StyledPressable
            onPress={handleNewScan}
            className="flex-row items-center justify-center bg-primary-main py-3 px-5 rounded-lg shadow-sm flex-1 mr-2"
          >
            <Ionicons name="camera-outline" size={20} color="white" />
            <StyledText className="text-white font-sans-bold ml-2 text-base">
              Ny skanning
            </StyledText>
          </StyledPressable>
          
          <StyledView className="flex-row flex-1 justify-end">
            <StyledPressable
              onPress={handleShare}
              className="flex-row items-center justify-center p-3 rounded-lg mr-2 bg-gray-100"
            >
              <Ionicons name="share-outline" size={20} color="#4b5563" />
            </StyledPressable>
            
            <StyledPressable
              onPress={handleToggleFavorite}
              disabled={!product.metadata.isSavedToHistory}
              className="flex-row items-center justify-center p-3 rounded-lg mr-2 bg-gray-100"
            >
              <Ionicons 
                name={product.metadata.isFavorite ? "heart" : "heart-outline"} 
                size={20} 
                color={product.metadata.isFavorite ? "#ef4444" : "#4b5563"} 
              />
            </StyledPressable>
            
            <StyledPressable
              onPress={handleSaveToHistory}
              disabled={product.metadata.isSavedToHistory}
              className={`flex-row items-center justify-center py-3 px-5 rounded-lg shadow-sm ${
                product.metadata.isSavedToHistory ? 'bg-gray-100' : 'bg-primary-main'
              }`}
            >
              <Ionicons 
                name="bookmark-outline" 
                size={20} 
                color={product.metadata.isSavedToHistory ? "#4b5563" : "white"} 
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
    </StyledView>
  );
} 