import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Alert, ActivityIndicator, Platform, Image } from 'react-native';
import { Link, Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { styled } from 'nativewind';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Video, ResizeMode } from 'expo-av';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';

import VideoRecorder from '@/components/VideoRecorder';
import { AnalysisService } from '@/services/analysisService';
// Bortkommenterar lottie-import eftersom det verkar saknas
// import LottieView from 'lottie-react-native';
import { useApiStatus } from '@/contexts/ApiStatusContext';
import { API_BASE_URL } from '@/constants/config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

/**
 * Skärm för videoanalys där användaren kan spela in en video 
 * och få ingredienserna analyserade
 */
function VideoScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { videoApiStatus, checkApiAvailability } = useApiStatus();
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoPlayerError, setVideoPlayerError] = useState(false);
  const [usingMockData, setUsingMockData] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const analysisService = new AnalysisService();
  const processingRef = useRef(false);
  const maxRetries = 2;
  const [videoApiAvailable, setVideoApiAvailable] = useState(true);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [mockData, setMockData] = useState(false);
  // Ny ref för att hålla det aktuella request ID
  const requestIdRef = useRef<string | null>(null);
  // Ny state för att indikera om en analysbegäran avbröts
  const [requestCancelled, setRequestCancelled] = useState(false);
  // Timestamp för senaste analysbegäran
  const lastRequestTimeRef = useRef<number>(0);
  // Minsta tid mellan analysbegäran (millisekunder)
  const MIN_REQUEST_INTERVAL = 3000;

  useEffect(() => {
    const initializeFromParams = async () => {
      try {
        console.log('VideoScreen: Initializing from params:', params);
        
        if (params.videoPath) {
          const videoPath = params.videoPath as string;
          console.log('VideoScreen: Received videoPath from params:', videoPath);
          
          try {
            const fileCheck = await checkFileExists(videoPath);
            
            if (fileCheck.exists) {
              const validPath = fileCheck.validPath || videoPath;
              console.log('VideoScreen: Setting validated videoPath:', validPath);
              setVideoUri(validPath);
              
              // Använd debounce för att förhindra flera anrop
              if (!processingRef.current) {
                setTimeout(() => analyzeVideo(), 500);
              }
            } else {
              console.warn('VideoScreen: Received video path does not exist, using mock:', videoPath);
              setVideoUri(videoPath);
              if (!processingRef.current) {
                setTimeout(() => analyzeVideo(), 500);
              }
            }
          } catch (error) {
            console.error('VideoScreen: Error validating video path, continuing anyway:', error);
            setVideoUri(videoPath);
            if (!processingRef.current) {
              setTimeout(() => analyzeVideo(), 500);
            }
          }
        } else {
          console.log('VideoScreen: No videoPath in params, starting fresh recording flow');
        }
      } catch (error) {
        console.error('VideoScreen: Error during initialization:', error);
      }
    };

    initializeFromParams();
  }, [params]);

  useEffect(() => {
    checkApiAvailability();
  }, []);

  const checkFileExists = async (path: string): Promise<{ exists: boolean, validPath?: string }> => {
    console.log('Kontrollerar om videofilen existerar på sökväg:', path);
    
    try {
      const originalPathInfo = await FileSystem.getInfoAsync(path);
      console.log('Ursprunglig sökväg info:', originalPathInfo);
      if (originalPathInfo.exists) {
        return { exists: true, validPath: path };
      }
    } catch (error) {
      console.log('Fel vid kontroll av ursprunglig sökväg:', error);
    }
    
    if (!path.startsWith('file://')) {
      const filePath = `file://${path}`;
      try {
        const filePathInfo = await FileSystem.getInfoAsync(filePath);
        console.log('file:// sökväg info:', filePathInfo);
        if (filePathInfo.exists) {
          return { exists: true, validPath: filePath };
        }
      } catch (error) {
        console.log('Fel vid kontroll av file:// sökväg:', error);
      }
    }
    
    try {
      const cacheDir = FileSystem.cacheDirectory;
      const fileName = path.split('/').pop();
      if (cacheDir && fileName) {
        const cachePath = `${cacheDir}${fileName}`;
        const cachePathInfo = await FileSystem.getInfoAsync(cachePath);
        console.log('Cache sökväg info:', cachePathInfo);
        if (cachePathInfo.exists) {
          return { exists: true, validPath: cachePath };
        }
      }
    } catch (error) {
      console.log('Fel vid kontroll av cache sökväg:', error);
    }
    
    return { exists: false };
  };

  const handleVideoRecorded = async (uri: string) => {
    console.log('Video inspelad till:', uri);
    
    // Förhindra dubbla anrop med en kombination av flera mekanismer
    if (processingRef.current) {
      console.log('Redan bearbetar en video, ignorerar ny inspelning');
      return;
    }
    
    // Kontrollera om det har gått tillräckligt med tid sedan senaste begäran
    const now = Date.now();
    if (now - lastRequestTimeRef.current < MIN_REQUEST_INTERVAL) {
      console.log('För tidigt att starta ny analys, ignorerar begäran');
      Alert.alert(
        'Vänta lite',
        'Du kan inte starta en ny analys så snabbt efter den förra. Vänta några sekunder och försök igen.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    // Uppdatera timestamp för denna begäran
    lastRequestTimeRef.current = now;
    
    // Generera ett nytt unikt requestId för denna analyssession
    requestIdRef.current = uuidv4();
    console.log('Nytt requestId genererat:', requestIdRef.current);
    
    if (uri.includes('/mock_video_path_after')) {
      console.log('Använda mock-video för analys');
      setVideoUri(uri);
      setTimeout(() => analyzeVideo(), 500);
      return;
    }
    
    setVideoUri(uri);
    setIsProcessing(true);
    processingRef.current = true;
    setRequestCancelled(false); // Återställ avbrytstatus för ny begäran
    
    try {
      const fileCheck = await checkFileExists(uri);
      if (!fileCheck.exists) {
        console.warn('Video fil hittades inte, men vi fortsätter ändå:', uri);
      }
      
      const validVideoUri = fileCheck.validPath || uri;
      console.log('Använder validerad video sökväg:', validVideoUri);
      setVideoUri(validVideoUri);
      
      setTimeout(() => analyzeVideo(), 500);
    } catch (error) {
      console.error('Fel vid validering av videofil, fortsätter ändå:', error);
      setTimeout(() => analyzeVideo(), 500);
    }
  };

  const handleCancel = () => {
    if (isLoading || isProcessing) {
      Alert.alert(
        'Avbryta analys?',
        'Vill du avbryta den pågående analysen?',
        [
          { text: 'Fortsätt analys', style: 'cancel' },
          { 
            text: 'Avbryt', 
            style: 'destructive', 
            onPress: () => {
              // Markera att begäran är avbruten
              setRequestCancelled(true);
              // Återställ bearbetningsstatus
              processingRef.current = false;
              setIsProcessing(false);
              setIsLoading(false);
              router.back();
            } 
          }
        ]
      );
    } else {
      router.back();
    }
  };

  const analyzeVideo = async () => {
    if (!videoUri) {
      setError('Ingen video vald');
      setIsProcessing(false);
      processingRef.current = false;
      return;
    }

    // Förhindra dubbla analyser med flera kontroller
    if (isLoading) {
      console.log('Analys pågår redan, ignorerar ytterligare begäran');
      return;
    }
    
    // Kontrollera om begäran är avbruten
    if (requestCancelled) {
      console.log('Analysbegäran avbruten av användaren, avbryter');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsingMockData(false);
    setRetryCount(0);

    try {
      console.log('Analyserar video:', videoUri);
      
      // Om API:et är inte tillgängligt, visa ett tydligt felmeddelande istället för mockdata
      if (videoApiStatus === 'unavailable') {
        throw new Error('Videoanalys-API är inte tillgängligt för tillfället. Försök igen senare eller kontakta support.');
      }
      
      // Om det är en mock-sökväg från en tidigare misslyckad inspelning, visa ett felmeddelande
      if (videoUri.includes('/mock_video_path_after')) {
        throw new Error('Videoinspelningen misslyckades. Försök spela in igen med bättre ljus och fokus på ingredienslistan.');
      }
      
      // Validera videofilen
      let validVideoUri = videoUri;
      try {
        const fileCheck = await checkFileExists(videoUri);
        if (!fileCheck.exists) {
          throw new Error('Videofilen hittades inte. Försök spela in igen.');
        }
        
        validVideoUri = fileCheck.validPath || videoUri;
        console.log('Validerad video sökväg för analys:', validVideoUri);
      } catch (fileError: any) {
        console.error('Fel vid validering av videofil:', fileError);
        throw new Error('Problem att lokalisera videofilen. Försök spela in igen.');
      }
      
      // Utför analys med validerad sökväg och requestId
      try {
        // Skicka med det unika request ID till analysfunktionen
        console.log('Skickar begäran med requestId:', requestIdRef.current);
        const result = await analysisService.analyzeVideo(validVideoUri, requestIdRef.current);
        
        // Om resultatet är tomt eller inte innehåller nödvändiga fält
        if (!result || result.ingredientList?.length === 0) {
          throw new Error('Kunde inte identifiera några ingredienser i videon. Försök igen och fokusera på ingredienslistan.');
        }
        
        console.log('Analysresultat:', JSON.stringify(result).substring(0, 100) + '...');
        navigateToResults(result, validVideoUri);
      } catch (analysisError: any) {
        console.error('Analysfel:', analysisError);
        
        let errorMsg = 'Kunde inte analysera video. ' + (analysisError.message || '');
        
        // Hantera specifikt felmeddelande för duplicerade begäran
        if (analysisError.message?.includes('Duplicate request') || 
            analysisError.message?.includes('429') ||
            analysisError.message?.includes('Too many requests')) {
          
          errorMsg = 'En analys pågår redan. Vänta tills den är klar eller försök igen senare.';
          setError(errorMsg);
          setIsLoading(false);
          setIsProcessing(false);
          processingRef.current = false;
          return;
        }
        
        if (analysisError.message?.includes('network') || 
            analysisError.message?.includes('timeout') ||
            analysisError.message?.includes('No response from server')) {
          errorMsg = 'Nätverksfel: Kontrollera din internetanslutning och försök igen.';
        } else if (analysisError.message?.includes('404') || 
                  analysisError.message?.includes('endpoint not found')) {
          errorMsg = 'Videoanalys är inte tillgänglig just nu. Försök igen senare.';
          checkApiAvailability();
        } else if (analysisError.message?.includes('413') || 
                  analysisError.message?.includes('too large')) {
          errorMsg = 'Videon är för stor. Försök med en kortare video.';
        } else if (analysisError.message?.includes('500') ||
                  analysisError.message?.includes('Server error')) {
          errorMsg = 'Tjänsten är för närvarande överbelastad. ';
          
          // Implementera automatisk återförsök
          if (retryCount < maxRetries) {
            setRetryCount(prevCount => prevCount + 1);
            setError(`${errorMsg} Försöker igen... (${retryCount + 1}/${maxRetries})`);
            
            // Generera ett nytt requestId för återförsöket
            requestIdRef.current = uuidv4();
            console.log('Nytt requestId för återförsök:', requestIdRef.current);
            
            // Vänta 3 sekunder och försök igen
            setTimeout(() => {
              setIsLoading(false);
              analyzeVideo();
            }, 3000);
            return;
          } else {
            errorMsg += 'Försök igen senare.';
          }
        }
        
        setError(errorMsg);
        setIsLoading(false);
        setIsProcessing(false);
        processingRef.current = false;
      }
    } catch (error: any) {
      console.error('Fel vid videoanalys:', error);
      setError(error.message || 'Ett oväntat fel inträffade vid videoanalys');
      setIsLoading(false);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };
  
  const navigateToResults = (result: any, videoPath: string) => {
    try {
      console.log('Navigerar till resultatskärm');
      
      // Stoppa laddning först för att säkerställa att UI är redo för navigering
      setIsLoading(false);
      setIsProcessing(false);
      processingRef.current = false;
      
      // Använd setTimeout för att säkerställa att navigeringen sker efter att state har uppdaterats
      setTimeout(() => {
        try {
          console.log('Försöker navigera till resultatskärm med params:', {
            analysisResult: JSON.stringify(result),
            videoPath: videoPath,
            analysisType: 'video'
          });
          
          // Använd push istället för replace för att undvika problem med navigationsstacken
          router.push({
            pathname: '/(tabs)/(scan)/result',
            params: { 
              analysisResult: JSON.stringify(result),
              videoPath: videoPath,
              analysisType: 'video'
            }
          });
        } catch (routeError) {
          console.error('Navigationsfel:', routeError);
          
          // Fallbackmetod om den första navigeringen misslyckas
          Alert.alert(
            'Navigationsfel',
            'Kunde inte visa resultatskärmen. Vill du försöka igen?',
            [
              { 
                text: 'Avbryt', 
                style: 'cancel',
                onPress: () => router.replace('/(tabs)/(scan)')
              },
              { 
                text: 'Försök igen', 
                onPress: () => {
                  // Försök med en annan navigeringsmetod
                  router.navigate({
                    pathname: '/(tabs)/(scan)/result',
                    params: {
                      analysisResult: JSON.stringify(result),
                      videoPath: videoPath,
                      analysisType: 'video'
                    }
                  });
                }
              }
            ]
          );
        }
      }, 300);
    } catch (error) {
      console.error('Allvarligt navigationsfel:', error);
      Alert.alert(
        'Fel',
        'Ett fel uppstod när analysresultatet skulle visas. Försök igen.',
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/(scan)') }]
      );
    }
  };

  const handleVideoError = (error: any) => {
    console.error('Video player error:', error);
    setVideoPlayerError(true);
  };

  // Funktion för att konvertera video till base64
  const convertVideoToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('Converting video to base64:', uri);
      
      // Normalisera sökvägen för bättre kompatibilitet
      let normalizedUri = uri;
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        normalizedUri = `file://${uri}`;
      }
      
      // Hämta filinformation
      const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
      
      // Kontrollera att filen existerar
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }
      
      // Kontrollera filstorlek (max 50MB)
      if (fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
        throw new Error('Video file is too large (max 50MB)');
      }
      
      // Läs filen som base64
      const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      console.log(`Successfully converted video to base64 (${base64.length} chars)`);
      return base64;
    } catch (error) {
      console.error('Failed to convert video to base64:', error);
      throw error;
    }
  };
  
  // Funktion för att generera mock-data för videoanalys
  const generateMockVideoAnalysisResult = () => {
    return {
      isVegan: false,
      confidence: 0.85,
      ingredientList: [
        "Socker", 
        "Vetemjöl", 
        "Mjölk", 
        "Vegetabiliska oljor (palm, raps)", 
        "Salt", 
        "Emulgeringsmedel (sojalecitin)", 
        "Arom"
      ],
      watchedIngredients: [
        {
          name: "Mjölk",
          isVegan: false,
          reason: "Mjölk är en animalisk produkt som kommer från kor"
        },
        {
          name: "Vegetabiliska oljor (palm, raps)",
          isVegan: true,
          reason: "Vegetabiliska oljor är veganska, men palmolja kan ha etiska problem relaterade till miljöpåverkan"
        }
      ],
      reasoning: "OBS! DETTA ÄR DEMO-DATA. Produkten innehåller mjölk vilket är en animalisk produkt och därför inte vegansk.",
      detectedLanguage: "sv"
    };
  };

  // Funktion som hanterar videoinspelning och skickar den för analys
  const handleVideoSubmit = async (uri: string) => {
    try {
      setIsLoading(true);
      setIsProcessing(true);
      
      // Optimerad prompt för bättre resultat
      const customPrompt = `Analyze these food ingredients and determine if the product is vegan. 
Respond in JSON format with these fields:
{
  "isVegan": boolean,
  "confidence": number between 0 and 1,
  "ingredientList": array of all ingredients,
  "watchedIngredients": array of objects with non-vegan or questionable ingredients, each with: 
    { 
      "name": "ingredient name", 
      "isVegan": boolean, 
      "reason": "brief explanation" 
    },
  "reasoning": "short explanation about the decision",
  "detectedLanguage": "language code"
}`;

      const videoBase64 = await convertVideoToBase64(uri);
      
      // Kontrollera om API:et är tillgängligt
      if (!videoApiAvailable) {
        console.log('Video API not available, handling with mock data');
        // Visa felmeddelande eller indikator för demosyfte
        setMockData(true);
        
        // Använd mockdata för demo
        const mockResult = generateMockVideoAnalysisResult();
        setAnalysisResult(mockResult);
        
        // Använd den säkrare navigeringsfunktionen
        navigateToResults(mockResult, uri);
        return;
      }
      
      // Skickar videofilen för analys
      const response = await axios.post(
        `${API_BASE_URL}/api/video/analyze-video`,
        {
          base64Data: videoBase64,
          mimeType: 'video/mp4',
          preferredLanguage: 'sv',
          customPrompt: customPrompt // Skicka med anpassad prompt
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000 // Längre timeout för videoanalys
        }
      );
      
      if (response.data && response.data.result) {
        console.log('Fick svar från API:', response.data);
        setAnalysisResult(response.data.result);
        setMockData(false);
        
        // Använd den säkrare navigeringsfunktionen
        navigateToResults(response.data.result, uri);
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error submitting video for analysis:', error);

      // Om fel uppstår, använd mock-data och markera att det är demo
      setMockData(true);
      const mockResult = generateMockVideoAnalysisResult();
      setAnalysisResult(mockResult);
      
      // Använd den säkrare navigeringsfunktionen
      navigateToResults(mockResult, uri);
    } finally {
      setIsLoading(false);
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} className="bg-black">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {videoApiStatus === 'unavailable' && (
        <StyledView className="absolute top-0 left-0 right-0 bg-amber-500 z-50 p-2">
          <StyledText className="text-white text-center text-sm font-medium">
            Videoanalys är i beta och API:et är inte tillgängligt just nu. Demo-data kommer att användas.
          </StyledText>
        </StyledView>
      )}
      
      {!videoUri ? (
        <VideoRecorder onVideoRecorded={handleVideoRecorded} onCancel={handleCancel} />
      ) : (
        <StyledView className="flex-1">
          {!videoPlayerError ? (
            <View style={styles.video}>
              <StyledView className="flex-1 justify-center items-center">
                <Ionicons name="videocam" size={64} color="#4CAF50" />
                <StyledText className="text-white text-center mt-4 px-6 font-sans font-bold text-lg">
                  Video inspelad
                </StyledText>
                <StyledText className="text-white text-center mt-2 px-6 font-sans">
                  Din video är redo att analyseras för ingredienser
                </StyledText>
              </StyledView>
            </View>
          ) : (
            <StyledView className="flex-1 justify-center items-center">
              <Ionicons name="videocam" size={64} color="#ffffff" />
              <StyledText className="text-white text-center mt-4 px-6 font-sans">
                Video inspelad, men kan inte visas.
                Du kan ändå fortsätta med analysen.
              </StyledText>
            </StyledView>
          )}
          
          <StyledView className="absolute inset-x-0 top-0" style={{ marginTop: insets.top }}>
            <StyledView className="flex-row justify-between items-center p-4">
              <StyledPressable
                onPress={() => setVideoUri(null)}
                className="bg-black/50 rounded-full p-2"
              >
                <Ionicons name="arrow-back" size={24} color="white" />
              </StyledPressable>
            </StyledView>
          </StyledView>
          
          <StyledView 
            className="absolute inset-x-0 bottom-0 items-center bg-black/30" 
            style={{ paddingBottom: Math.max(insets.bottom + 20, 36) }}
          >
            {isLoading ? (
              <StyledView className="items-center my-8">
                <ActivityIndicator size="large" color="#ffffff" />
                <StyledText className="text-white mt-2 font-sans">Analyserar video...</StyledText>
              </StyledView>
            ) : (
              <StyledView className="w-full px-4 my-4">
                {error && (
                  <StyledView className="bg-red-500/80 p-3 rounded-lg mb-4">
                    <StyledText className="text-white text-center font-sans">{error}</StyledText>
                  </StyledView>
                )}
                
                <StyledPressable
                  onPress={() => handleVideoSubmit(videoUri!)}
                  className="bg-emerald-600 rounded-lg p-4 items-center"
                >
                  <StyledText className="text-white font-sans-bold text-lg">Analysera video</StyledText>
                </StyledPressable>
                
                <StyledPressable
                  onPress={() => setVideoUri(null)}
                  className="bg-gray-700 rounded-lg p-4 items-center mt-3"
                >
                  <StyledText className="text-white font-sans-medium">Spela in igen</StyledText>
                </StyledPressable>
                
                <StyledPressable
                  onPress={() => router.back()}
                  className="mt-3 p-2"
                >
                  <StyledText className="text-white text-center font-sans">Tillbaka till hemskärmen</StyledText>
                </StyledPressable>
              </StyledView>
            )}
          </StyledView>
        </StyledView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  video: {
    flex: 1,
    alignSelf: 'stretch',
    backgroundColor: '#000',
  },
});

export default VideoScreen; 