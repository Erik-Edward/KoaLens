// app/(tabs)/(scan)/camera.tsx - Korrigerad version med tydlig default export
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, Platform, BackHandler } from 'react-native';
// Ersätt standard import med vår wrapper
import { Camera, useCameraDevice } from '@/lib/visionCameraWrapper';
import { router, useNavigation, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as FileSystem from 'expo-file-system'; // Import FileSystem
import { styled } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraGuide } from '@/components/CameraGuide';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import { logScreenView, logEvent } from '@/lib/analyticsWrapper';
import Animated, { useSharedValue, withTiming, useAnimatedStyle } from 'react-native-reanimated';
import * as ImageManipulator from 'expo-image-manipulator';
import { useIsFocused } from '@react-navigation/native';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledAnimatedView = styled(Animated.View);

const GUIDE_KEY = 'KOALENS_CAMERA_GUIDE_SHOWN';
const MAX_VIDEO_DURATION = 5 * 1000; // 5 sekunder i millisekunder

// Tydligt deklarerad som default export-funktion
export default function CameraScreen() {
  // Note: We no longer need to use the permission hook since we check permissions on the scan tab
  const device = useCameraDevice('back');
  const camera = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  // Alltid videoläge
  const [recordingMode, setRecordingMode] = useState<'video'>('video');
  const [videoElapsedTime, setVideoElapsedTime] = useState(0);
  const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
  const recordingProgress = useSharedValue(0);
  const [showGuide, setShowGuide] = useState(false);
  const navigation = useNavigation();
  
  // Referens för timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Check for web browser environment
  const isWebEnvironment = Platform.OS === 'web';
  
  // Alltid ställ in videoläge oavsett params (ignorera mode)
  useEffect(() => {
    // Inget behov av att kontrollera params eftersom vi låst till videoläge
    setRecordingMode('video');
  }, []);

  // Hantera videoinspelningstimer
  useEffect(() => {
    if (isRecording) {
      // Starta timer för att uppdatera förloppsindikator
      timerRef.current = setInterval(() => {
        if (recordingStartTime) {
          const elapsed = Date.now() - recordingStartTime;
          const progress = Math.min(elapsed / MAX_VIDEO_DURATION, 1);
          recordingProgress.value = withTiming(progress, { duration: 100 });
          setVideoElapsedTime(elapsed);
          
          // Stoppa inspelningen när maximal tid uppnåtts
          if (elapsed >= MAX_VIDEO_DURATION && isRecording) {
            console.log('Maximal inspelningstid uppnådd, stoppar automatiskt...');
            clearInterval(timerRef.current!);
            timerRef.current = null;
            // Lägg till en liten fördröjning för att hantera eventuella race conditions
            setTimeout(() => {
              stopRecording();
            }, 50);
          }
        }
      }, 100);
    } else {
      // Rensa timer när inspelningen stoppas
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
    
    // Rensa timer vid unmount
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRecording, recordingStartTime]);

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Back button pressed in camera screen');
      
      // Om videoinspelning pågår, stoppa den
      if (isRecording) {
        stopRecording();
        return true;
      }
      
      // Always handle manually rather than default behavior
      handleBack();
      return true; // Prevent default behavior
    });
    
    return () => backHandler.remove();
  }, [isRecording]);

  // Formatera inspelningstid till MM:SS
  const formatRecordingTime = (timeMs: number): string => {
    const totalSeconds = Math.floor(timeMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };
  
  // Animera inspelningsindikator
  const progressStyle = useAnimatedStyle(() => {
    return {
      width: `${recordingProgress.value * 100}%`,
    };
  });

  // Log screen view when component mounts
  useEffect(() => {
    logScreenView('Camera');
    console.log('Camera screen mounted');
  }, []);

  // Check and set guide visibility
  useEffect(() => {
    const checkGuide = async () => {
      try {
        // TEMPORARILY DISABLED FOR MVP: Don't show guide regardless of AsyncStorage
        setShowGuide(false);
      } catch (error) {
        console.error('Error checking guide status:', error);
      }
    };

    checkGuide();
  }, []);

  // Reset guide for development purposes
  const resetGuide = async () => {
    try {
      await AsyncStorage.removeItem(GUIDE_KEY);
      setShowGuide(true);
      console.log('Guide reset successful');
    } catch (error) {
      console.error('Error resetting guide:', error);
    }
  };

  // Starta videoinspelning
  const startRecording = async () => {
    try {
      if (camera.current && !isCapturing) {
        setIsCapturing(true);
        setIsRecording(true);
        setRecordingStartTime(Date.now());
        recordingProgress.value = 0;
        
        addBreadcrumb('Starting video recording', 'camera');
        logEvent('video_recording_started');
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        console.log('Starting video recording...');
        
        // Starta inspelningen
        await camera.current.startRecording({
          onRecordingFinished: (video: any) => handleRecordingFinished(video),
          onRecordingError: (error: any) => handleRecordingError(error)
        });
      }
    } catch (error) {
      handleRecordingError(error);
    }
  };
  
  // Stoppa videoinspelning
  const stopRecording = async () => {
    try {
      if (camera.current && isRecording) {
        console.log('Stopping video recording...');
        await camera.current.stopRecording();
        // Återställning av tillstånd hanteras i callback-funktionen
      }
    } catch (error) {
      handleRecordingError(error);
    }
  };
  
  // Funktion för att kontrollera om filen existerar på olika möjliga platser
  // Denna funktion är kopierad från video.tsx för konsekvent filhantering
  const checkFileExists = async (path: string): Promise<{ exists: boolean, validPath?: string }> => {
    console.log('Kontrollerar om videofilen existerar på sökväg:', path);
    
    // Kontrollera ursprunglig sökväg
    try {
      const originalPathInfo = await FileSystem.getInfoAsync(path);
      console.log('Ursprunglig sökväg info:', originalPathInfo);
      if (originalPathInfo.exists) {
        return { exists: true, validPath: path };
      }
    } catch (error) {
      console.log('Fel vid kontroll av ursprunglig sökväg:', error);
    }
    
    // Kontrollera med file:// prefix
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
    
    // Kontrollera Cache-katalog
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
  
  // Hantera slutförd inspelning
  const handleRecordingFinished = async (video: any) => {
    console.log('Video recording finished callback received:', video);

    // 1. Återställ ENDAST inspelningstillstånd direkt, behåll isCapturing
    // setIsCapturing(false); // TA BORT DENNA RAD
    setIsRecording(false);
    setRecordingStartTime(null);
    recordingProgress.value = 0;

    addBreadcrumb('Video recording finished', 'camera', { path: video?.path });
    logEvent('video_recording_completed', { duration: videoElapsedTime });

    // 2. Validera videoobjekt och sökväg
    if (!video || !video.path) {
      console.error('Invalid video object or missing path received from camera:', video);
      captureException(new Error('Invalid video object received'), { extra: { videoObject: video } });
      Alert.alert('Inspelningsfel', 'Ett oväntat fel inträffade (ingen videofil hittades). Försök igen.');
      return; // Avbryt om videoobjektet är ogiltigt
    }
    
    const videoPath = video.path;
    console.log('Processing recorded video path:', videoPath);

    try {
      // Lägg till en kort fördröjning för att ge filsystemet tid
      console.log('Waiting 500ms before checking file existence...');
      await new Promise(resolve => setTimeout(resolve, 500));

      // 3. Använd den mer robusta checkFileExists-funktionen
      console.log(`Checking if file exists at multiple possible locations...`);
      const fileCheck = await checkFileExists(videoPath);
      
      if (!fileCheck.exists) {
        console.error('Recorded video file does not exist at any known location:', videoPath);
        captureException(new Error('Recorded video file does not exist'), { extra: { path: videoPath } });
        
        // Eftersom navigering till videoskärmen ändå kan fungera med mockade data, låt oss gå vidare
        console.log('Proceeding with navigation using original path despite missing file');
        router.navigate({
          pathname: '/(tabs)/(scan)/video',
          params: { videoPath: videoPath },
        });
        return;
      }

      // Vi hittade en giltig filsökväg
      const validVideoPath = fileCheck.validPath || videoPath;
      console.log('Video file confirmed to exist at path:', validVideoPath);

      // 4. Navigera till videoskärmen med den validerade sökvägen
      console.log('Attempting navigation to video screen with validated path:', validVideoPath);
      router.navigate({
        pathname: '/(tabs)/(scan)/video',
        params: { videoPath: validVideoPath },
      });
      console.log('Navigation to video screen initiated successfully.');

    } catch (error) {
      console.error('Error during recording finish handling:', error);
      const errorToCapture = error instanceof Error ? error : new Error(String(error));
      captureException(errorToCapture, { extra: { context: 'handleRecordingFinished Error', videoPath } });
      
      // Trots felet, försök ändå navigera till videoskärmen
      // Video.tsx har fallbacks för att hantera icke-existerande videofiler
      console.log('Attempting navigation despite error');
      router.navigate({
        pathname: '/(tabs)/(scan)/video',
        params: { videoPath: videoPath },
      });
    }
  };
  
  // Hantera fel vid inspelning
  const handleRecordingError = (error: any) => {
    console.error('Video recording error:', error);
    captureException(error instanceof Error ? error : new Error('Failed to record video'));
    
    // Återställ inspelningstillstånd
    setIsCapturing(false);
    setIsRecording(false);
    setRecordingStartTime(null);
    
    // Logga fel
    logEvent('video_recording_error', { 
      error_type: "camera_error",
      error_message: error instanceof Error ? error.message : "Unknown error"
    });
    
    Alert.alert(
      "Fel vid videoinspelning",
      "Kunde inte spela in video. Försök igen.",
      [{ text: "OK" }]
    );
  };

  // Handle photo capture - Modified to show alert and prevent usage
  const capturePhoto = async () => {
    console.warn('capturePhoto called, but image analysis is disabled.');
    logEvent('photo_capture_attempt_disabled');
    // Reset capturing state immediately
    setIsCapturing(false);
    // Inform the user that photo capture is not supported
    Alert.alert(
      "Bildanalys inaktiverad",
      "Att ta bilder för analys stöds inte längre. Använd videoinspelning istället.",
      [{ text: "OK" }]
    );
    // Do not proceed with capturing or navigation
    return;

    /* Original photo capture logic (commented out):
    try {
      if (camera.current && !isCapturing) {
        setIsCapturing(true);
        addBreadcrumb('Capturing photo', 'camera');
        logEvent('photo_capture_started');
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        console.log('Taking photo...');
        
        const photo = await camera.current.takePhoto({
          flash: 'off',
          enableShutterSound: true
        });
  
        addBreadcrumb('Photo captured', 'camera', { path: photo.path });
        
        // Navigate to crop screen
        console.log('Navigating to crop screen with photo path:', photo.path);
        
        // Använd en rak router.replace för att gå till beskärningsskärmen
        router.replace({
          pathname: '/(tabs)/(scan)/crop',
          params: { photoPath: photo.path }
        });
        
        console.log('Navigation till crop-skärmen initierad');
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      captureException(error instanceof Error ? error : new Error('Failed to take photo'));
      
      // Log scanning error
      logEvent('photo_capture_error', { 
        error_type: "camera_error",
        error_message: error instanceof Error ? error.message : "Unknown error"
      });
      
      Alert.alert(
        "Fel vid bildtagning",
        "Kunde inte ta bilden. Försök igen.",
        [{ text: "OK" }]
      );
      
      setIsCapturing(false);
    }
    */
  };

  // Hantera knapptryckning för foto/video
  const handleCameraAction = () => {
    addBreadcrumb(`Camera action triggered. Mode: ${recordingMode}, Recording: ${isRecording}`, 'camera');
    // Förenklad logik eftersom recordingMode alltid är 'video'
    if (isRecording) {
      console.log('Stopping recording via button press');
      stopRecording();
    } else {
      console.log('Starting recording via button press');
      startRecording();
    }
    // Borttagen else-gren för 'photo'
  };

  // Explicitly handle back navigation
  const handleBack = async () => {
    try {
      console.log('Handling back navigation from camera screen');
      
      // Återställ isCapturing när vi navigerar tillbaka
      setIsCapturing(false); 
      
      // Ge haptisk feedback
      await Haptics.selectionAsync();
      
      // Gå tillbaka till föregående skärm
      router.back();
    } catch (error) {
      console.error('Error in back navigation:', error);
      
      // Som fallback, använd direkt replacement
      router.replace('/(tabs)/(scan)');
    }
  };

  // --- Flytta CameraControls definition INNANFÖR CameraScreen --- 
  const CameraControls = () => {
    // Calculate time left
    const timeLeft = Math.max(0, Math.ceil((MAX_VIDEO_DURATION - videoElapsedTime) / 1000));

    return (
      <StyledView className="items-center">
        {/* Progress bar för video */}
        {isRecording && (
          <StyledView className="w-full px-10 mb-3">
            <StyledView className="h-2 bg-neutral-700 rounded-full overflow-hidden">
              <StyledAnimatedView 
                className="h-full bg-red-500"
                style={progressStyle} 
              />
            </StyledView>
            <StyledText className="text-white text-center mt-1 text-xs font-mono">
              {timeLeft}s kvar
            </StyledText>
          </StyledView>
        )}

        {/* Inspelningsknapp - Säkerställ att den förblir inaktiv/transparent under bearbetning */}
        <StyledPressable
          onPress={handleCameraAction} 
          // Inaktivera knappen helt så länge kameran är upptagen (spelar in ELLER bearbetar)
          disabled={isCapturing} 
          className={`w-20 h-20 rounded-full border-4 border-white items-center justify-center transition-opacity duration-200 
            ${isCapturing ? 'opacity-50' : 'active:opacity-70'} // Opacity baserat på isCapturing
            ${isCapturing ? 'bg-transparent' : 'bg-red-500'} // Bakgrund baserat på isCapturing (transparent när upptagen, annars röd)
          `}
        >
          {/* Visa stopp-kvadrat *endast* när isRecording är aktivt. 
              När isRecording=false men isCapturing=true (bearbetning), visa inget. */}
          {isRecording ? <StyledView className="w-8 h-8 bg-red-500 rounded-md" /> : <></>} 
        </StyledPressable>
      </StyledView>
    );
  };
  // --- Slut på CameraControls definition ---
  
  // Rendera kamera-UI
  if (isWebEnvironment) {
    // Special handling for web environment - show placeholder
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center p-4">
        <Ionicons name="camera-outline" size={48} color="#ffffff" />
        <StyledText className="text-text-primary font-sans-bold text-xl text-center mt-4 mb-2">
          Kamera ej tillgänglig
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mb-6">
          Kamerafunktionen är bara tillgänglig på fysiska enheter och i EAS builds, inte i webbläsaren eller Expo Go.
        </StyledText>
        <StyledPressable 
          onPress={handleBack}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Camera hardware is not available
  if (!device) {
    return (
      <StyledView className="flex-1 bg-[#000000] justify-center items-center p-4">
        <Ionicons name="alert-circle-outline" size={48} color="#ffd33d" />
        <StyledText className="text-white font-sans-bold text-lg text-center mt-4 mb-2">
          Kameran är inte tillgänglig
        </StyledText>
        <StyledText className="text-gray-300 font-sans text-center mb-6">
          Vi kunde inte få tillgång till enhetens kamera. Kontrollera kamerabehörigheter i enhetsinställningarna.
        </StyledText>
        <StyledPressable 
          onPress={handleBack}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-black">
      <StatusBar style="light" />
      
      {/* Real Camera View */}
      <Camera
        ref={camera}
        style={{ flex: 1 }}
        device={device}
        isActive={true}
        video={true}
        audio={false}
      />
      
      {/* Overlays och kontroller */} 
      <StyledView className="absolute inset-0 flex-1 justify-between items-center">
        {/* Top Bar: Back button and potentially mode indicator */}
        <StyledView className="w-full flex-row justify-between items-center p-4 pt-6 bg-black/30">
          <StyledPressable 
            onPress={handleBack}
            disabled={isCapturing} // Disable back while processing
            className="p-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledPressable>

          {/* Tom container där text/indikator fanns */}
          <StyledView className="w-10" /> 

        </StyledView>

        {/* Middle Section: Borttaget */}
        
        {/* Bottom Section: Borttaget */}
      </StyledView>
      
      {/* Flytta CameraControls till botten med absolute positionering */}
      <StyledView className="absolute bottom-10 left-0 right-0 items-center">
         <CameraControls />
      </StyledView>
      
    </StyledView>
  );
}