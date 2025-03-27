// app/(tabs)/(scan)/camera.tsx - Korrigerad version med tydlig default export
import React, { useRef, useState, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Alert, Platform, BackHandler } from 'react-native';
// Ersätt standard import med vår wrapper
import { Camera, useCameraDevice } from '@/lib/visionCameraWrapper';
import { router, useNavigation } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { styled } from 'nativewind';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { CameraGuide } from '@/components/CameraGuide';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import { logEvent, Events, logScreenView } from '@/lib/analytics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

const GUIDE_KEY = 'KOALENS_CAMERA_GUIDE_SHOWN';

// Tydligt deklarerad som default export-funktion
export default function CameraScreen() {
  // Note: We no longer need to use the permission hook since we check permissions on the scan tab
  const device = useCameraDevice('back');
  const camera = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const navigation = useNavigation();
  
  // Check for web browser environment
  const isWebEnvironment = Platform.OS === 'web';

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      console.log('Back button pressed in camera screen');
      
      // Always handle manually rather than default behavior
      handleBack();
      return true; // Prevent default behavior
    });
    
    return () => backHandler.remove();
  }, []);

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

  // Handle photo capture
  const capturePhoto = async () => {
    try {
      if (camera.current && !isCapturing) {
        setIsCapturing(true);
        addBreadcrumb('Capturing photo', 'camera');
        
        // Log that scanning has started
        logEvent(Events.SCAN_STARTED);
        
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
      logEvent(Events.SCAN_ERROR, { 
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
  };

  // Explicitly handle back navigation
  const handleBack = async () => {
    try {
      console.log('Handling back navigation from camera screen');
      
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

  // Render camera guide overlay
  const renderGuide = () => {
    if (!showGuide) return null;
    
    return (
      <CameraGuide 
        onClose={() => {
          setShowGuide(false);
          AsyncStorage.setItem(GUIDE_KEY, 'true')
            .catch(error => console.error('Failed to save guide status:', error));
        }} 
      />
    );
  };

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
        photo={true}
      />
      
      {/* Camera Controls Overlay */}
      <StyledView className="absolute inset-0 pointer-events-none">
        {/* Top Bar */}
        <StyledView className="flex-row justify-between items-center p-4 pointer-events-auto">
          <StyledPressable
            onPress={handleBack}
            className="bg-black/50 rounded-full p-2"
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </StyledPressable>
          
          <StyledPressable
            onPress={() => setShowGuide(true)}
            className="bg-black/50 rounded-full p-2"
          >
            <Ionicons name="help-circle-outline" size={24} color="white" />
          </StyledPressable>
        </StyledView>
        
        {/* Center guidance text */}
        <StyledView className="flex-1 justify-center items-center p-4">
          <StyledView className="bg-black/50 rounded-lg px-6 py-3">
            <StyledText className="text-white text-center font-sans">
              Placera ingredienslistan i mitten av skärmen
            </StyledText>
          </StyledView>
        </StyledView>
        
        {/* Bottom Bar */}
        <StyledView className="flex-row justify-center items-center pb-12 pt-6 pointer-events-auto">
          <StyledPressable
            onPress={capturePhoto}
            disabled={isCapturing}
            className={`bg-white rounded-full w-16 h-16 items-center justify-center border-4 border-gray-800 ${
              isCapturing ? 'opacity-50' : ''
            }`}
          >
            {isCapturing ? (
              <StyledView className="bg-gray-600 rounded-full w-12 h-12" />
            ) : (
              <StyledView className="bg-white rounded-full w-12 h-12" />
            )}
          </StyledPressable>
        </StyledView>
      </StyledView>
      
      {/* Render Camera Guide if needed */}
      {renderGuide()}
    </StyledView>
  );
}