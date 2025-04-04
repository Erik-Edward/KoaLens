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

// Definiera typer för analysstatus
type AnalysisState = 'idle' | 'analyzing' | 'preparing_results' | 'error';

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
  const requestIdRef = useRef<string | null>(null);
  const [requestCancelled, setRequestCancelled] = useState(false);
  const lastRequestTimeRef = useRef<number>(0);
  const MIN_REQUEST_INTERVAL = 3000;
  const processedVideoPathRef = useRef<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');

  useEffect(() => {
    const initializeFromParams = async () => {
      try {
        console.log('VideoScreen: Initializing from params:', params);
        
        if (params.videoPath) {
          const videoPath = params.videoPath as string;
          console.log('VideoScreen: Received videoPath from params:', videoPath);
          
          if (videoPath === processedVideoPathRef.current) {
            console.log('VideoScreen: videoPath from params already processed, skipping analyzeVideo call.');
            return;
          }
          
          try {
            const fileCheck = await checkFileExists(videoPath);
            
            if (fileCheck.exists) {
              const validPath = fileCheck.validPath || videoPath;
              console.log('VideoScreen: Setting validated videoPath:', validPath);
              setVideoUri(validPath);
              
              if (!processingRef.current) {
                processedVideoPathRef.current = videoPath;
                setAnalysisState('analyzing');
                processingRef.current = true;
                setTimeout(() => analyzeVideo(validPath), 500);
              }
            } else {
              console.warn('VideoScreen: Received video path does not exist, setting error:', videoPath);
              setVideoUri(videoPath);
              setError('Videofilen kunde inte hittas. Försök spela in igen.');
              setAnalysisState('error');
            }
          } catch (error) {
            console.error('VideoScreen: Error validating video path, setting error:', error);
            setVideoUri(videoPath);
            setError('Kunde inte validera videofilen. Försök spela in igen.');
            setAnalysisState('error');
          }
        } else {
          console.log('VideoScreen: No videoPath in params, starting fresh recording flow');
          setAnalysisState('idle');
        }
      } catch (error) {
        console.error('VideoScreen: Error during initialization:', error);
        setError('Ett oväntat fel uppstod vid initiering.');
        setAnalysisState('error');
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
    
    if (processingRef.current) {
      console.log('Redan bearbetar en video, ignorerar ny inspelning');
      return;
    }
    
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
    
    lastRequestTimeRef.current = now;
    
    requestIdRef.current = uuidv4();
    console.log('Nytt requestId genererat:', requestIdRef.current);
    
    setVideoUri(uri);
    setAnalysisState('analyzing');
    processingRef.current = true;
    setRequestCancelled(false);
    
    setTimeout(async () => {
      try {
        const fileCheck = await checkFileExists(uri);
        if (!fileCheck.exists) {
          console.warn('Video fil hittades inte efter inspelning:', uri);
          setError('Videofilen verkar ha försvunnit direkt efter inspelning. Försök igen.');
          setAnalysisState('error');
          processingRef.current = false;
          return;
        }
        
        const validVideoUri = fileCheck.validPath || uri;
        console.log('Använder validerad video sökväg:', validVideoUri);
        setVideoUri(validVideoUri); 
        
        analyzeVideo(validVideoUri);
      } catch (error) {
        console.error('Fel vid validering av videofil efter inspelning:', error);
        setError('Kunde inte validera videofilen. Försök igen.');
        setAnalysisState('error');
        processingRef.current = false;
      }
    }, 100);
  };

  const handleCancel = () => {
    if (analysisState === 'analyzing') { 
      Alert.alert(
        'Avbryta analys?',
        'Vill du avbryta den pågående analysen?',
        [
          { text: 'Fortsätt analys', style: 'cancel' },
          { 
            text: 'Avbryt', 
            style: 'destructive', 
            onPress: () => {
              console.log('Avbryter analys, requestId:', requestIdRef.current);
              setRequestCancelled(true);
              processingRef.current = false;
              setAnalysisState('idle');
              setVideoUri(null);
              router.back();
            } 
          }
        ]
      );
    } else {
      setAnalysisState('idle');
      setVideoUri(null);
      router.back();
    }
  };

  const analyzeVideo = async (uriToAnalyze?: string) => {
    const currentVideoUri = uriToAnalyze || videoUri; 
    
    if (!currentVideoUri) {
      console.error('analyzeVideo anropad utan videoUri.');
      setError('Ingen video vald för analys.');
      setAnalysisState('error');
      processingRef.current = false;
      return;
    }
    
    if (analysisState !== 'analyzing') {
       console.warn('analyzeVideo anropad när state inte är "analyzing". Aktuell state:', analysisState);
       setAnalysisState('analyzing');
    }
    
    setError(null);

    try {
      console.log('Analyserar video:', currentVideoUri);
      
      if (videoApiStatus === 'unavailable') {
        throw new Error('Videoanalys-API är inte tillgängligt för tillfället. Försök igen senare eller kontakta support.');
      }
      
      if (currentVideoUri.includes('/mock_video_path_after')) {
        throw new Error('Videoinspelningen misslyckades. Försök spela in igen med bättre ljus och fokus på ingredienslistan.');
      }
      
      try {
        const fileInfo = await FileSystem.getInfoAsync(currentVideoUri);
        if (!fileInfo.exists) {
          throw new Error(`Videofil på sökväg ${currentVideoUri} hittades inte precis före analys.`);
        }
      } catch (validationError: any) {
         console.error('Fel vid sista validering av videofil:', validationError);
         throw new Error('Problem att komma åt videofilen för analys. Försök igen.');
      }
      
      try {
        console.log('Skickar begäran med requestId:', requestIdRef.current);
        
        if (requestCancelled) {
          console.log('Analys avbruten innan API-anrop skickades.');
          processingRef.current = false;
          setAnalysisState('idle');
          return; 
        }
        
        const result = await analysisService.analyzeVideo(currentVideoUri, requestIdRef.current);
        
        if (requestCancelled) {
           console.log('Analys avbruten efter API-anrop slutfördes men innan navigering.');
           processingRef.current = false;
           setAnalysisState('idle');
           return; 
        }
        
        if (!result || !result.ingredientList || result.ingredientList.length === 0) {
           throw new Error('Kunde inte identifiera några ingredienser i videon. Kontrollera att hela ingredienslistan var synlig och välbelyst i videon. Försök igen.');
        }
        
        console.log('Analysresultat:', JSON.stringify(result).substring(0, 100) + '...');
        setAnalysisState('preparing_results');
        navigateToResults(result, currentVideoUri);
        
      } catch (analysisError: any) {
        if (requestCancelled) {
           console.log('Analys avbruten, ignorerar analysfel.');
           processingRef.current = false;
           setAnalysisState('idle'); 
           return;
        }
        
        console.error('Analysfel:', analysisError);
        
        let errorMsg = 'Kunde inte analysera video. ' + (analysisError.message || '');
        
        if (analysisError.message?.includes('Duplicate request') || 
            analysisError.message?.includes('429') ||
            analysisError.message?.includes('Too many requests')) {
          
          errorMsg = 'En analys pågår redan. Vänta tills den är klar eller försök igen senare.';
        } else if (analysisError.message?.includes('network') || 
            analysisError.message?.includes('timeout') ||
            analysisError.message?.includes('No response from server')) {
          errorMsg = 'Nätverksfel: Kontrollera din internetanslutning och försök igen.';
        } else if (analysisError.message?.includes('Failed to convert video')) {
           errorMsg = 'Problem med att bearbeta videofilen. Försök spela in igen.';
        }
        throw new Error(errorMsg); 
      }
    } catch (error: any) {
       if (requestCancelled) {
          console.log('Analys avbruten, ignorerar yttre fel.');
          processingRef.current = false;
          setAnalysisState('idle');
          return;
       }
       
       console.error('Fel i analyzeVideo funktionen:', error);
       setError(error.message || 'Ett okänt fel uppstod vid analys.');
       setAnalysisState('error');
    } finally {
       if (analysisState !== 'idle') {
           processingRef.current = false;
       }
    }
  };
  
  const navigateToResults = (result: any, videoPath: string) => {
    try {
      console.log('Navigerar till resultatskärm');
      
      setTimeout(() => {
        try {
          setAnalysisState('idle');
          setVideoUri(null);
          processingRef.current = false;

          console.log('Försöker navigera till resultatskärm med params:', {
            analysisResult: JSON.stringify(result),
            videoPath: videoPath,
            analysisType: 'video'
          });
          
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

  const convertVideoToBase64 = async (uri: string): Promise<string> => {
    try {
      console.log('Converting video to base64:', uri);
      
      let normalizedUri = uri;
      if (!uri.startsWith('file://') && !uri.startsWith('content://')) {
        normalizedUri = `file://${uri}`;
      }
      
      const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
      
      if (!fileInfo.exists) {
        throw new Error('Video file not found');
      }
      
      if (fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
        throw new Error('Video file is too large (max 50MB)');
      }
      
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

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]} className="bg-black flex-1">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      
      {videoApiStatus === 'unavailable' && (
        <StyledView className="absolute top-0 left-0 right-0 bg-amber-500 z-50 p-2" style={{ marginTop: insets.top }}>
          <StyledText className="text-white text-center text-sm font-medium">
            Videoanalys (beta) är tillfälligt otillgänglig. Försök igen senare.
          </StyledText>
        </StyledView>
      )}
      
      {analysisState === 'idle' && !videoUri ? (
        <VideoRecorder onVideoRecorded={handleVideoRecorded} onCancel={handleCancel} />
      ) : (
        <StyledView className="flex-1 justify-center items-center p-4">
           <StyledView className="absolute inset-x-0 top-0 z-10" style={{ marginTop: insets.top }}>
             <StyledView className="flex-row justify-between items-center p-4">
                <StyledPressable
                  onPress={handleCancel}
                  className="bg-black/50 rounded-full p-2"
                >
                  <Ionicons name="arrow-back" size={24} color="white" />
                </StyledPressable>
               <StyledView className="w-10" /> 
             </StyledView>
           </StyledView>

          {analysisState === 'analyzing' && (
            <StyledView className="items-center">
              <ActivityIndicator size="large" color="#ffffff" />
              <StyledText className="text-white text-center mt-4 px-6 font-sans font-bold text-lg">
                Analyserar ingredienserna...
              </StyledText>
              <StyledText className="text-neutral-400 text-center mt-2 px-6 font-sans text-sm">
                Detta kan ta en liten stund.
              </StyledText>
            </StyledView>
          )}

          {analysisState === 'preparing_results' && (
            <StyledView className="items-center">
              <ActivityIndicator size="large" color="#ffffff" />
              <StyledText className="text-white text-center mt-4 px-6 font-sans font-bold text-lg">
                Förbereder resultaten...
              </StyledText>
            </StyledView>
          )}

          {analysisState === 'error' && (
            <StyledView className="items-center w-full">
               <Ionicons name="alert-circle-outline" size={64} color="#FF4545" />
              <StyledText className="text-white text-center mt-4 px-6 font-sans font-bold text-lg">
                Analys misslyckades
              </StyledText>
              {error && (
                 <StyledText className="text-red-400 text-center mt-2 px-6 font-sans text-sm">
                   {error}
                 </StyledText>
              )}
              <StyledPressable
                onPress={() => {
                   if (videoUri) {
                      setError(null);
                      setAnalysisState('analyzing');
                      analyzeVideo(videoUri); 
                   } else {
                      handleCancel(); 
                   }
                }}
                className="bg-white/20 rounded-lg py-3 px-6 mt-8"
              >
                <StyledText className="text-white text-center font-sans font-medium">Försök igen</StyledText>
              </StyledPressable>
            </StyledView>
          )}
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