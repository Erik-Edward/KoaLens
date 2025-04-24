import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StyleSheet, Alert, ActivityIndicator, Platform, AppState, AppStateStatus } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { StatusBar } from 'expo-status-bar';
import { styled } from 'nativewind';
import { View, Text, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import * as KeepAwake from 'expo-keep-awake';

import VideoRecorder from '@/components/VideoRecorder';
import { AnalysisService } from '@/services/analysisService';
import { useApiStatus } from '@/contexts/ApiStatusContext';
import { useCounter } from '@/hooks/useCounter';
import { UsageLimitModal } from '@/components/UsageLimitModal';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

// Define analysis states and steps
type AnalysisState = 'idle' | 'analyzing' | 'preparing_results' | 'error';
type AnalysisStep = 'uploading' | 'optimizing' | 'analyzing' | 'processing' | 'complete';

// --- Helper Function: Generate Mock Data ---
// Included here as it was missing according to linter
const generateMockVideoAnalysisResult = () => {
  return {
    isVegan: false,
    isUncertain: false,
    confidence: 0.85,
    ingredientList: [
      { name: "Socker", status: "vegan" },
      { name: "Vetemjöl", status: "vegan" },
      { name: "Mjölk", status: "non-vegan" },
      { name: "Vegetabiliska oljor (palm, raps)", status: "vegan" },
      { name: "Salt", status: "vegan" },
      { name: "Emulgeringsmedel (sojalecitin)", status: "vegan" },
      { name: "Arom", status: "uncertain" }
    ],
    watchedIngredients: [
      {
        name: "Mjölk",
        status: "non-vegan",
        reason: "Mjölk är en animalisk produkt som kommer från kor"
      }
    ],
    traceIngredients: ["Nötter"],
    reasoning: "OBS! DETTA ÄR DEMO-DATA. Produkten innehåller mjölk vilket är en animalisk produkt och därför inte vegansk.",
    detectedLanguage: "sv",
    isMock: true // Flag as mock data
  };
};


/**
 * Screen for video analysis. Allows recording a video and analyzing its ingredients.
 */
function VideoScreen() {
  const params = useLocalSearchParams<{ videoPath?: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { checkApiAvailability } = useApiStatus(); // Assuming videoApiStatus is not directly used here anymore

  // Core State
  const [videoUri, setVideoUri] = useState<string | null>(null);
  const [analysisState, setAnalysisState] = useState<AnalysisState>('idle');
  const [error, setError] = useState<string | null>(null);

  // Progress Tracking State
  const [progressValue, setProgressValue] = useState(0);
  const [currentStep, setCurrentStep] = useState<AnalysisStep>('uploading');
  const [stepMessage, setStepMessage] = useState('Förbereder...');

  // Refs for controlling analysis flow
  const processingRef = useRef(false); // Is an analysis currently running?
  const processedVideoPathRef = useRef<string | null>(null); // Which path was last processed?
  const requestIdRef = useRef<string | null>(null); // Unique ID for the current analysis request
  const isCancelledRef = useRef(false); // Flag if user cancelled
  const navigationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // For storing navigation timeout
  const isMountedRef = useRef(true); // Track if component is mounted

  // State for Retry Limit
  const [retryAttempted, setRetryAttempted] = useState(false);

  // Hooks and Services
  const analysisService = useRef(new AnalysisService()).current; // Use ref for stability
  const { checkLimit, recordAnalysis, loading: counterLoading } = useCounter('analysis_count');
  const [isLimitModalVisible, setLimitModalVisible] = useState(false);

  // --- Effect: Initialize from Parameters ---
  useEffect(() => {
    const initialize = async () => {
      const newVideoPath = params.videoPath;
      console.log('VideoScreen: useEffect[params] - Initializing with path:', newVideoPath);

      // Skip initialization if already processing to prevent loops
      if (processingRef.current && analysisState === 'analyzing') {
        console.log('VideoScreen: Already processing. Skipping re-initialization to prevent loops.');
        return;
      }

      if (!newVideoPath) {
        console.log('VideoScreen: No videoPath in params. Resetting.');
        setVideoUri(null);
        setError(null);
        setAnalysisState('idle');
        processingRef.current = false;
        processedVideoPathRef.current = null;
        isCancelledRef.current = false;
        // Reset UI state explicitly
        setProgressValue(0);
        setCurrentStep('uploading');
        setStepMessage('Förbereder...');
        return;
      }

      // Only proceed if it's a genuinely new path and we're not already processing
      if (newVideoPath !== processedVideoPathRef.current && !processingRef.current) {
        console.log('VideoScreen: New video path detected. Resetting state.');
        // Reset all relevant states
        setAnalysisState('idle');
        setProgressValue(0);
        setCurrentStep('uploading');
        setStepMessage('Förbereder...');
        setError(null);
        setVideoUri(null); // Clear previous video display if any
        isCancelledRef.current = false; // Reset cancellation flag
        setRetryAttempted(false); // Reset retry flag for new video
        processedVideoPathRef.current = newVideoPath; // Mark this path as the one we are starting to process

        try {
          const fileCheck = await checkFileExists(newVideoPath);
          if (fileCheck.exists) {
            const validPath = fileCheck.validPath || newVideoPath;
            console.log('VideoScreen: Validated path:', validPath);
            setVideoUri(validPath); // Set URI for potential display or later use

            // Schedule the analysis to start
            // Use requestAnimationFrame for smoother UI transition before heavy task
            console.log('VideoScreen: Scheduling analysis for:', validPath);
            processingRef.current = true; // Mark as processing *before* calling analyzeVideo
            requestAnimationFrame(() => analyzeVideo(validPath));
          } else {
            console.warn('VideoScreen: Video file not found:', newVideoPath);
            setError('Videofilen kunde inte hittas. Försök spela in igen.');
            setAnalysisState('error');
            processingRef.current = false; // Ensure reset on error
          }
        } catch (err) {
          console.error('VideoScreen: Error during file validation:', err);
          setError('Kunde inte validera videofilen. Försök spela in igen.');
          setAnalysisState('error');
          processingRef.current = false; // Ensure reset on error
        }
      } else {
        console.log('VideoScreen: Either videoPath is the same as already processed or processing is in progress. Ignoring initialization.');
      }
    };

    initialize();
  }, [params.videoPath]); // Depend only on path change

  // --- Effect: Progress Bar Animation ---
  useEffect(() => {
    let animationInterval: NodeJS.Timeout | null = null;
    
    if (analysisState === 'analyzing') {
      setProgressValue(0); // Start animation from 0
      animationInterval = setInterval(() => {
        if (isMountedRef.current && !isCancelledRef.current) {
          setProgressValue(prev => Math.min(prev + 5, 95)); // Simple increment up to 95%
        } else {
          // Clear interval if component is no longer mounted
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
        }
      }, 250);
    } else if (analysisState === 'preparing_results') {
      setProgressValue(95); // Jump to 95%
      animationInterval = setInterval(() => {
        if (isMountedRef.current && !isCancelledRef.current) {
          setProgressValue(prev => {
            const nextValue = Math.min(prev + 5, 100);
            if (nextValue === 100 && animationInterval) {
              clearInterval(animationInterval); // Stop at 100%
              animationInterval = null;
            }
            return nextValue;
          });
        } else {
          // Clear interval if component is no longer mounted
          if (animationInterval) {
            clearInterval(animationInterval);
            animationInterval = null;
          }
        }
      }, 100); // Faster animation to 100%
    } else {
      setProgressValue(0); // Reset progress if not analyzing/preparing
    }

    return () => { // Cleanup interval on state change or unmount
      if (animationInterval) {
        clearInterval(animationInterval);
      }
    };
  }, [analysisState]);

  // --- Effect: Keep Awake & App State ---
  useEffect(() => {
    if (analysisState === 'analyzing' || analysisState === 'preparing_results') {
      KeepAwake.activateKeepAwake();
    } else {
      KeepAwake.deactivateKeepAwake();
    }

    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      console.log('App state changed to:', nextAppState);
      // Optional: Add logic here if needed when app returns to foreground during analysis
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
      KeepAwake.deactivateKeepAwake(); // Ensure deactivation on unmount
    };
  }, [analysisState]);

   // --- Effect: Check API Availability ---
   useEffect(() => {
       checkApiAvailability();
   }, [checkApiAvailability]); // Include dependency

  // --- File Handling ---
  const checkFileExists = async (path: string): Promise<{ exists: boolean, validPath?: string }> => {
    console.log('Checking file existence for:', path);
    try {
        // Try original path first
        let info = await FileSystem.getInfoAsync(path);
        if (info.exists) return { exists: true, validPath: path };

        // If not found, try adding file:// prefix (common on Android)
        if (!path.startsWith('file://')) {
            const filePathUri = `file://${path}`;
            info = await FileSystem.getInfoAsync(filePathUri);
            if (info.exists) return { exists: true, validPath: filePathUri };
        }

        // As a last resort, check cache directory (common on iOS simulator/exports)
        const cacheDir = FileSystem.cacheDirectory;
        const fileName = path.split('/').pop();
        if (cacheDir && fileName) {
             const cachePath = `${cacheDir}${fileName}`;
             info = await FileSystem.getInfoAsync(cachePath);
             if (info.exists) return { exists: true, validPath: cachePath };
        }

    } catch (error) {
        console.warn('Error checking file existence:', error);
        // Fallthrough to return false
    }
    console.log('File check failed for all paths derived from:', path);
    return { exists: false };
  };

  // --- Core Analysis Logic ---
  const analyzeVideo = async (uriToAnalyze: string) => {
    console.log(`analyzeVideo: Starting for ${uriToAnalyze}`);
    isCancelledRef.current = false; // Ensure cancellation flag is reset
    requestIdRef.current = uuidv4(); // Generate unique ID for this request

    // 1. Set UI state to analyzing
    setAnalysisState('analyzing');
    setCurrentStep('analyzing'); // Use a generic step during analysis
    setStepMessage('Analyserar video...');
    setError(null); // Clear previous errors

    // 2. Check Usage Limits
    try {
      if (counterLoading) {
         console.log("analyzeVideo: Waiting for counter loading to finish...");
         // Optionally wait or show a message, here we just proceed cautiously
      }
      const limitCheck = await checkLimit();
      if (!limitCheck.allowed) {
        console.log('analyzeVideo: Usage limit reached.');
        setLimitModalVisible(true);
        setAnalysisState('idle'); // Go back to idle
        processingRef.current = false; // Allow new attempt later
        return;
      }
      console.log('analyzeVideo: Usage limit OK.');
    } catch (limitError) {
      console.error('analyzeVideo: Failed to check usage limit:', limitError);
      // Proceed despite error in limit checking
    }

    if (isCancelledRef.current || !isMountedRef.current) {
      console.log("analyzeVideo: Cancelled before API call or component unmounted.");
      setAnalysisState('idle');
      processingRef.current = false;
      return;
    }

    // 3. Call Backend Service
    try {
      console.log(`analyzeVideo: Calling analysisService.analyzeVideo with requestId: ${requestIdRef.current}`);
      // --- MOCK DATA SWITCH ---
      const MOCK_ENABLED = false; // Set to true to force mock data for testing
      let backendResult;
      if (MOCK_ENABLED) {
          console.warn("analyzeVideo: MOCK DATA ENABLED!");
          await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate network delay
          backendResult = generateMockVideoAnalysisResult();
      } else {
         // --- Actual API Call ---
         try {
             backendResult = await analysisService.analyzeVideo(uriToAnalyze, requestIdRef.current);
             console.log('analyzeVideo: API call successful.');
         } catch (apiError: any) {
             console.error('analyzeVideo: API call failed:', apiError);
             // Always re-throw the error to be caught by the outer catch block
             throw apiError;
         }
      }
      // --- End API Call / Mock Data ---

      if (isCancelledRef.current || !isMountedRef.current) {
        console.log("analyzeVideo: Cancelled after API call returned or component unmounted.");
        setAnalysisState('idle');
        processingRef.current = false;
        return;
      }

      // Basic validation of result structure
      if (!backendResult || !backendResult.ingredientList) {
         console.error("analyzeVideo: Invalid result structure from backend:", backendResult);
         throw new Error('Ogiltigt svar från analysservern.');
      }
      
      // Only throw error for empty list if it's NOT mock data 
      if (backendResult.ingredientList.length === 0 && !MOCK_ENABLED) { 
         throw new Error('Kunde inte identifiera några ingredienser. Kontrollera att listan var tydlig i videon.');
      }

      console.log('analyzeVideo: Analysis successful. Preparing results.');
      setAnalysisState('preparing_results');

      // 4. Record Analysis (Fire-and-forget)
      recordAnalysis().catch(err => console.error("analyzeVideo: Failed to record analysis:", err));

      // 5. Navigate to Results
      // Add a slight delay before navigating to allow the "preparing_results" UI state to render briefly
      // Clear any previous timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
      }
      navigationTimeoutRef.current = setTimeout(() => {
          if (!isCancelledRef.current && isMountedRef.current) {
             navigateToResults(backendResult, uriToAnalyze);
          } else {
              console.log("analyzeVideo: Cancelled before navigation timeout or component unmounted.");
              setAnalysisState('idle');
              processingRef.current = false;
          }
          // Clear the ref after timeout completes
          navigationTimeoutRef.current = null;
      }, 300);

    } catch (err: any) {
      console.error('analyzeVideo: Error during analysis process:', err);
      if (isCancelledRef.current || !isMountedRef.current) {
         console.log("analyzeVideo: Error occurred, but was already cancelled or component unmounted.");
         setAnalysisState('idle');
         processingRef.current = false;
         return;
      }

      // Set specific error message if retry failed
      let errorMessage = err.message || 'Ett okänt fel uppstod under analysen.';
      // Handle specific errors if needed, e.g., duplicate request
      if (err.message?.includes('Duplicate request')) {
          errorMessage = 'Analysen pågår redan för denna video.';
          // Keep state as analyzing? Or revert to idle? Reverting seems safer.
          setAnalysisState('idle');
      } else if (retryAttempted) {
          // If this error occurred after a retry attempt
          errorMessage = 'Analysen misslyckades igen. Försök skanna om videon.';
      } else {
          setAnalysisState('error');
      }
      setError(errorMessage); // Set the final error message
      processingRef.current = false; // Ensure reset on error
    }
  };

  // --- Navigation ---
  const navigateToResults = (result: any, sourceVideoUri: string) => {
      console.log('navigateToResults: Navigating with result and URI:', sourceVideoUri);
      try {
          // Ensure result is stringified for navigation parameters
          const resultString = JSON.stringify(result);
          
          // Block ALL future state updates by marking as cancelled
          isCancelledRef.current = true;
          
          // Clear any lingering timers or state that might cause loops
          requestIdRef.current = null;
          
          // Use router.replace instead of push to completely replace current screen in history
          // This helps prevent memory leaks and loops when going back
          router.replace({
            pathname: '/(tabs)/(scan)/result',
            params: { 
                  productAnalysis: resultString,
                  mediaUri: sourceVideoUri,
              }
          });
      } catch (navError) {
          console.error('navigateToResults: Navigation failed:', navError);
          Alert.alert('Navigationsfel', 'Kunde inte visa resultatskärmen.');
          // Reset state if navigation fails
          setError('Navigationsfel.');
          setAnalysisState('error');
          processingRef.current = false;
      }
  };

  // --- Event Handlers ---
  const handleCancel = () => {
    console.log('handleCancel: User initiated cancel.');
    if (analysisState === 'analyzing' || analysisState === 'preparing_results') {
      Alert.alert(
        'Avbryta analys?',
        'Vill du verkligen avbryta den pågående analysen?',
        [
          { text: 'Fortsätt', style: 'cancel' },
          {
            text: 'Avbryt Analys',
            style: 'destructive',
            onPress: () => {
              console.log('handleCancel: Confirmed cancellation.');
              isCancelledRef.current = true;
              processingRef.current = false;
              setRetryAttempted(false); // Reset retry flag on cancel
              setAnalysisState('idle');
              setVideoUri(null); // Clear displayed video
              processedVideoPathRef.current = null; // Allow reprocessing if needed later
              // Navigate back or to a default state
              if (router.canGoBack()) {
                  router.back();
              } else {
                  router.replace('/(tabs)/(scan)/'); // Go to scan home
              }
            }
          }
        ]
      );
    } else {
        // If not analyzing, just navigate back/home
        if (router.canGoBack()) {
            router.back();
        } else {
            router.replace('/(tabs)/(scan)/');
        }
    }
  };

  const handleRetry = () => {
      if (retryAttempted) {
          // If retry already attempted, force rescan by navigating back/cancelling
          console.log('handleRetry: Retry already attempted. Forcing rescan by navigating home.');
          // Explicitly reset processing state before navigating
          processingRef.current = false;
          processedVideoPathRef.current = null; // Clear the path we tried
          // Directly navigate to the scan home screen to ensure a fresh start
          router.replace('/(tabs)/(scan)/');
      } else if (processedVideoPathRef.current) {
           // First retry attempt
           console.log('handleRetry: First retry attempt for:', processedVideoPathRef.current);
           setRetryAttempted(true); // Mark retry as attempted
           setError(null); // Clear previous error
           processingRef.current = true; // Mark as processing again
           analyzeVideo(processedVideoPathRef.current); // Start analysis with the last path
      } else {
           console.error('handleRetry: No video path available to retry.');
           handleCancel(); // Go back if no path
      }
  };

  const handleVideoRecorded = (uri: string) => {
    console.log('handleVideoRecorded: Received new video URI:', uri);
    // Navigate to self with the new video path as a parameter
    // This triggers the useEffect[params] logic for initialization
    router.push({
        pathname: '/(tabs)/(scan)/video', // Navigate to this screen
        params: { videoPath: uri }
    });
  };

  // --- UI Rendering ---
  const renderContent = () => {
    switch (analysisState) {
      case 'analyzing':
      case 'preparing_results':
        return (
          <StyledView className="items-center w-full">
            <ActivityIndicator size="large" color="#ffffff" />
            <StyledText className="text-white text-center mt-4 px-6 font-sans-bold text-lg">
              {stepMessage}
            </StyledText>
            {/* Progress Bar */}
            <StyledView className="w-full mt-6 px-8">
              <StyledView className="h-2 bg-gray-800 rounded-full w-full overflow-hidden">
                <StyledView
                  className="h-full bg-white"
                  style={{ width: `${progressValue}%`, opacity: 0.9 }}
                />
              </StyledView>
            </StyledView>
            {/* Percentage */}
            <StyledView className="mt-2 bg-gray-800/50 px-4 py-2 rounded-lg">
              <StyledText className="text-neutral-300 text-center font-sans-medium text-sm">
                {Math.floor(progressValue)}% slutfört
              </StyledText>
            </StyledView>
            {/* Cancel Button */}
            <StyledPressable
              onPress={handleCancel} // Use the main cancel handler
              className="mt-8 bg-gray-700 px-6 py-3 rounded-lg" // Slightly different color
            >
              <StyledText className="text-white font-sans-medium">
                Avbryt analys
              </StyledText>
            </StyledPressable>
          </StyledView>
        );
      case 'error':
        return (
          <StyledView className="items-center w-full px-6">
            <Ionicons name="alert-circle-outline" size={64} color="#FF4545" />
            <StyledText className="text-white text-center mt-4 font-sans-bold text-lg">
              Analys misslyckades
            </StyledText>
            {error && (
              <StyledText className="text-red-400 text-center mt-2 font-sans text-sm">
                {String(error)}
              </StyledText>
            )}
            <StyledPressable
              onPress={handleRetry} // Use retry handler
              className="bg-white/20 rounded-lg py-3 px-6 mt-8"
            >
              <StyledText className="text-white text-center font-sans-medium">
                  {retryAttempted ? 'Skanna igen' : 'Försök igen'}
              </StyledText>
            </StyledPressable>
          </StyledView>
        );
      case 'idle':
      default:
         // If idle and no videoUri, show recorder.
         // If idle WITH videoUri (e.g., after cancellation before analysis), show placeholder? Or recorder?
         // Showing recorder seems most logical if idle.
        return (
          <VideoRecorder onVideoRecorded={handleVideoRecorded} onCancel={handleCancel} />
        );
    }
  };

  // --- Effect: Component Cleanup ---
  useEffect(() => {
    // Mark as mounted on initial render
    isMountedRef.current = true;
    
    // This effect handles cleanup when component unmounts
    return () => {
      console.log('VideoScreen: Unmounting - performing final cleanup');
      // Mark as unmounted first to prevent any new state updates
      isMountedRef.current = false;
      
      // Clear all processing flags and state to prevent memory leaks and loops
      processingRef.current = false;
      isCancelledRef.current = true;
      requestIdRef.current = null;
      processedVideoPathRef.current = null;
      
      // Clear any pending navigation timeout
      if (navigationTimeoutRef.current) {
        clearTimeout(navigationTimeoutRef.current);
        navigationTimeoutRef.current = null;
      }
      
      // Ensure device doesn't stay awake
      KeepAwake.deactivateKeepAwake();
    };
  }, []);

  // Render main screen structure
  return (
    <SafeAreaView style={styles.container} className="flex-1 bg-black">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Conditionally render VideoRecorder or the analysis/error view */}
      {analysisState === 'idle' && !params.videoPath ? (
         <VideoRecorder onVideoRecorded={handleVideoRecorded} onCancel={handleCancel} />
      ) : (
         <StyledView className="flex-1 justify-center items-center p-4">
           {/* Back Button - always show if not in recorder mode */}
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

           {renderContent()}
         </StyledView>
      )}

      <UsageLimitModal
        visible={isLimitModalVisible}
        onClose={() => setLimitModalVisible(false)}
      />
    </SafeAreaView>
  );
}

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Ensure container uses black background
  },
});

export default VideoScreen;