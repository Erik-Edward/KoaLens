// app/(tabs)/(scan)/camera.tsx
import React, { useRef, useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { Camera, useCameraDevice, useCameraPermission } from 'react-native-vision-camera';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { styled } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraGuide } from '@/components/CameraGuide';
import { captureException, addBreadcrumb } from '@/lib/sentry';
// Lägg till import för Analytics
import { logEvent, Events, logScreenView } from '@/lib/analytics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

const GUIDE_KEY = 'KOALENS_CAMERA_GUIDE_SHOWN';

export default function CameraScreen() {
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');
  const camera = useRef<Camera>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);

  // Logga skärmvisning när komponenten monteras
  useEffect(() => {
    logScreenView('Camera');
  }, []);

  useEffect(() => {
    const checkGuide = async () => {
      try {
        const hasSeenGuide = await AsyncStorage.getItem(GUIDE_KEY);
        setShowGuide(!hasSeenGuide);
      } catch (error) {
        console.error('Error checking guide status:', error);
      }
    };

    checkGuide();
  }, []);

  // Utvecklarfunktion för att resetta guiden
  const resetGuide = async () => {
    try {
      await AsyncStorage.removeItem(GUIDE_KEY);
      setShowGuide(true);
      console.log('Guide reset successful');
    } catch (error) {
      console.error('Error resetting guide:', error);
    }
  };

  const capturePhoto = async () => {
    try {
      if (camera.current && !isCapturing) {
        setIsCapturing(true);
        addBreadcrumb('Capturing photo', 'camera');
        
        // Logga att skanningen har påbörjats
        logEvent(Events.SCAN_STARTED);
        
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        
        const photo = await camera.current.takePhoto({
          flash: 'off',
          enableShutterSound: true
        });
  
        addBreadcrumb('Photo captured', 'camera', { path: photo.path });
        
        // Navigera till beskärningsskärmen först
        router.push({
          pathname: './crop',
          params: { photoPath: photo.path }
        });
      }
    } catch (error) {
      console.error('Failed to take photo:', error);
      captureException(error instanceof Error ? error : new Error('Failed to take photo'));
      
      // Logga fel vid skanning
      logEvent(Events.SCAN_ERROR, { 
        error_type: "camera_error",
        error_message: error instanceof Error ? error.message : "Unknown error"
      });
      
      Alert.alert(
        "Fel vid bildtagning",
        "Kunde inte ta bilden. Försök igen.",
        [{ text: "OK" }]
      );
    } finally {
      setIsCapturing(false);
    }
  };

  const handleCloseGuide = async () => {
    // Spara att användaren har sett guiden
    try {
      await AsyncStorage.setItem(GUIDE_KEY, 'true');
      setShowGuide(false);
      
      // Logga guideinteraktion
      logEvent('guide_completed', { type: 'camera_guide' });
    } catch (error) {
      console.error('Error saving guide status:', error);
      setShowGuide(false);
    }
  };

  if (!hasPermission) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main p-4">
        <StyledText className="text-text-primary font-sans text-lg text-center mb-4">
          KoaLens behöver tillgång till kameran för att kunna skanna ingredienslistor.
        </StyledText>
        <StyledPressable 
          onPress={requestPermission}
          className="bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Ge tillgång till kamera
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  if (device == null) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <StyledText className="text-text-primary font-sans text-lg">
          Kunde inte hitta kameran
        </StyledText>
      </StyledView>
    );
  }

  return (
    <StyledView className="flex-1 bg-black">
      <StatusBar 
        style="light"
        backgroundColor="transparent"
        translucent={true}
      />
      
      <Camera
        ref={camera}
        style={{ flex: 1 }}
        device={device}
        isActive={true}
        photo={true}
      />
      
      {/* Guide-rutnät */}
      <StyledView className="absolute inset-0 flex justify-center items-center">
        <StyledView className="w-4/5 h-32 border-2 border-white/50 rounded-lg" />
      </StyledView>
      
      {/* Dev button - bara synlig under utveckling */}
      {__DEV__ && (
        <StyledPressable 
          onPress={resetGuide}
          className="absolute top-2 left-2 bg-black/30 p-2 rounded-full"
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </StyledPressable>
      )}
      
      {/* Kamerakontroller */}
      <StyledView className="absolute bottom-0 left-0 right-0 h-24 bg-black/50">
        <StyledView className="flex-row justify-between items-center px-8 h-full">
          <StyledPressable 
            onPress={() => router.back()}
            className="w-12 h-12 rounded-full bg-gray-800/80 justify-center items-center"
          >
            <Ionicons name="close" size={24} color="white" />
          </StyledPressable>

          <StyledPressable
            onPress={capturePhoto}
            disabled={isCapturing}
            className={`w-16 h-16 rounded-full justify-center items-center ${
              isCapturing ? 'bg-gray-400' : 'bg-white'
            }`}
          >
            <StyledView className="w-14 h-14 rounded-full border-2 border-black" />
          </StyledPressable>

          <StyledView className="w-12 h-12" />
        </StyledView>
      </StyledView>

      {/* Guide overlay */}
      {showGuide && <CameraGuide onClose={handleCloseGuide} />}
    </StyledView>
  );
}