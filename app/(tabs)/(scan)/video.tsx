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

import VideoRecorder from '@/components/VideoRecorder';
import { AnalysisService } from '@/services/analysisService';
// Bortkommenterar lottie-import eftersom det verkar saknas
// import LottieView from 'lottie-react-native';
import { useApiStatus } from '@/contexts/ApiStatusContext';

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
    
    // Förhindra dubbla anrop
    if (processingRef.current) {
      console.log('Redan bearbetar en video, ignorerar ny inspelning');
      return;
    }
    
    if (uri.includes('/mock_video_path_after')) {
      console.log('Använda mock-video för analys');
      setVideoUri(uri);
      setTimeout(() => analyzeVideo(), 500);
      return;
    }
    
    setVideoUri(uri);
    setIsProcessing(true);
    processingRef.current = true;
    
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
          { text: 'Avbryt', style: 'destructive', onPress: () => router.back() }
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

    // Förhindra dubbla analyser
    if (isLoading) {
      console.log('Analys pågår redan, ignorerar ytterligare begäran');
      return;
    }

    setIsLoading(true);
    setError(null);
    setUsingMockData(false);

    try {
      console.log('Analyserar video:', videoUri);
      
      if (videoApiStatus === 'unavailable') {
        console.log('VideoScreen: Använder mock-data eftersom API inte är tillgängligt');
        const result = await analysisService.mockVideoAnalysis(true);
        setUsingMockData(true);
        navigateToResults(result, videoUri);
        return;
      }
      
      if (videoUri.includes('/mock_video_path_after')) {
        console.log('Använder mock-analys för misslyckad video');
        const result = await analysisService.mockVideoAnalysis(true);
        setUsingMockData(true);
        
        navigateToResults(result, videoUri);
        return;
      }
      
      let validVideoUri = videoUri;
      try {
        const fileCheck = await checkFileExists(videoUri);
        if (!fileCheck.exists) {
          console.warn('Videofilen hittades inte, försöker med mockAnalys');
          const result = await analysisService.mockVideoAnalysis(true);
          setUsingMockData(true);
          navigateToResults(result, videoUri);
          return;
        }
        
        validVideoUri = fileCheck.validPath || videoUri;
        console.log('Validerad video sökväg för analys:', validVideoUri);
      } catch (error) {
        console.error('Fel vid validering av videofil:', error);
      }
      
      try {
        const result = await analysisService.analyzeVideo(validVideoUri);
        
        if (result.reasoning && result.reasoning.includes('DETTA ÄR DEMO-DATA')) {
          setUsingMockData(true);
        }
        
        console.log('Analysresultat:', JSON.stringify(result).substring(0, 100) + '...');
        
        navigateToResults(result, validVideoUri);
      } catch (analysisError: any) {
        console.error('Analysfel:', analysisError);
        
        let errorMsg = 'Kunde inte analysera video';
        
        if (analysisError.message?.includes('network') || 
            analysisError.message?.includes('timeout') ||
            analysisError.message?.includes('Network Error')) {
          errorMsg = 'Nätverksfel: Kontrollera din internetanslutning';
        } else if (analysisError.message?.includes('404')) {
          errorMsg = 'Videoanalys är inte tillgänglig just nu. Försök igen senare.';
          checkApiAvailability();
        } else if (analysisError.message?.includes('413') || 
                  analysisError.message?.includes('too large')) {
          errorMsg = 'Videon är för stor. Försök med en kortare video.';
        } else if (analysisError.message?.includes('500') ||
                  analysisError.message?.includes('429')) {
          errorMsg = 'Tjänsten är för närvarande överbelastad. ';
          
          // Implementera automatisk återförsök
          if (retryCount < maxRetries) {
            setRetryCount(prevCount => prevCount + 1);
            setError(`${errorMsg} Försöker igen... (${retryCount + 1}/${maxRetries})`);
            
            // Vänta 3 sekunder och försök igen
            setTimeout(() => {
              setIsLoading(false);
              analyzeVideo();
            }, 3000);
            return;
          } else {
            errorMsg += 'Försök igen senare eller använd demo-data.';
          }
        }
        
        setError(errorMsg);
        setIsLoading(false);
        setIsProcessing(false);
        processingRef.current = false;
        
        if (analysisError.message?.includes('404') || 
            analysisError.message?.includes('network') ||
            analysisError.message?.includes('timeout') ||
            analysisError.message?.includes('429') ||
            analysisError.message?.includes('500')) {
          setTimeout(() => {
            Alert.alert(
              'Videoanalys misslyckades',
              'Vill du använda demo-data istället?',
              [
                { text: 'Avbryt', style: 'cancel' },
                { 
                  text: 'Använd demo-data', 
                  onPress: async () => {
                    setIsLoading(true);
                    const mockResult = await analysisService.mockVideoAnalysis(true);
                    setUsingMockData(true);
                    navigateToResults(mockResult, validVideoUri);
                  }
                }
              ]
            );
          }, 500);
        }
      }
    } catch (error: any) {
      console.error('Fel vid videoanalys:', error);
      setError(`Kunde inte analysera video: ${error.message || 'Okänt fel'}`);
      setIsLoading(false);
      setIsProcessing(false);
      processingRef.current = false;
    }
  };
  
  const navigateToResults = (result: any, videoPath: string) => {
    try {
      console.log('Navigerar till resultatskärm');
      
      try {
        router.replace({
          pathname: '/(tabs)/(scan)/result',
          params: { 
            analysisResult: JSON.stringify(result),
            videoPath: videoPath,
            analysisType: 'video'
          }
        });
      } catch (routeError) {
        console.error('Första navigeringsförsöket misslyckades:', routeError);
        
        router.navigate({
          pathname: '/(tabs)/(scan)/result',
          params: { 
            analysisResult: JSON.stringify(result),
            videoPath: videoPath,
            analysisType: 'video'
          }
        });
      }
    } catch (error) {
      console.error('Alla navigeringsförsök misslyckades:', error);
      
      router.replace('/(tabs)/(scan)/result');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVideoError = (error: any) => {
    console.error('Video player error:', error);
    setVideoPlayerError(true);
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
                  onPress={analyzeVideo}
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