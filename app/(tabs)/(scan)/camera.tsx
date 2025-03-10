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
const NAV_LOCK_KEY = 'KOALENS_CAMERA_NAV_LOCK';

// Tydligt deklarerad som default export-funktion
export default function CameraScreen() {
  // Note: We no longer need to use the permission hook since we check permissions on the scan tab
  const device = useCameraDevice('back');
  const camera = useRef<any>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [navLocked, setNavLocked] = useState(true); // Start with navigation locked
  const navigation = useNavigation();
  
  // Check for web browser environment
  const isWebEnvironment = Platform.OS === 'web';

  // Set a stronger navigation lock to prevent unwanted navigation away from the camera
  useEffect(() => {
    console.log('Setting up camera screen navigation lock');
    
    const setupNavigationLock = async () => {
      try {
        // Clear any existing timeouts
        const timeoutString = await AsyncStorage.getItem('KOALENS_CAMERA_TIMEOUT');
        if (timeoutString) {
          const timeoutId = parseInt(timeoutString, 10);
          clearTimeout(timeoutId);
          await AsyncStorage.removeItem('KOALENS_CAMERA_TIMEOUT');
          console.log('Cleared previous camera safety timeout');
        }
        
        // Set the navigation lock
        await AsyncStorage.setItem(NAV_LOCK_KEY, 'true');
        setNavLocked(true);
        console.log('Camera navigation locked successfully');
      } catch (err) {
        console.error('Failed to set navigation lock:', err);
      }
    };
    
    setupNavigationLock();
    
    // More aggressive cleanup when component unmounts
    return () => {
      console.log('Camera screen unmounting, cleaning up');
      
      // Clear navigation lock when component unmounts
      AsyncStorage.removeItem(NAV_LOCK_KEY)
        .then(() => console.log('Camera navigation lock cleared'))
        .catch(err => console.error('Failed to clear navigation lock:', err));
    };
  }, []);

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

  // Listen for navigation attempts and block unwanted ones more aggressively
  useEffect(() => {
    console.log('Setting up navigation protection');
    
    const blockUnwantedNavigation = (e: any) => {
      // Block all navigation events while locked
      if (navLocked) {
        console.log('Blocked navigation event:', e.data.action.type);
        e.preventDefault();
        
        // Only handle back navigation, ignore other types
        if (e.data.action.type === 'GO_BACK') {
          console.log('Handling back navigation manually');
          handleBack();
        }
      }
    };
    
    // Add listener for beforeRemove events
    const unsubscribe = navigation.addListener('beforeRemove', blockUnwantedNavigation);
    
    return unsubscribe;
  }, [navigation, navLocked]);

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
        
        // Unlock navigation before taking photo
        await AsyncStorage.removeItem(NAV_LOCK_KEY);
        setNavLocked(false);
        console.log('Navigation unlocked for photo navigation');
        
        const photo = await camera.current.takePhoto({
          flash: 'off',
          enableShutterSound: true
        });
  
        addBreadcrumb('Photo captured', 'camera', { path: photo.path });
        
        // Navigate to crop screen
        console.log('Navigating to crop screen');
        router.push({
          pathname: './crop',
          params: { photoPath: photo.path }
        });
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
      
      // Unlock navigation after error
      await AsyncStorage.removeItem(NAV_LOCK_KEY);
      setNavLocked(false);
    } finally {
      setIsCapturing(false);
    }
  };

  // Explicitly handle back navigation
  const handleBack = async () => {
    console.log('Manual back navigation from camera');
    
    // Unlock navigation
    await AsyncStorage.removeItem(NAV_LOCK_KEY);
    setNavLocked(false);
    console.log('Navigation unlocked for back navigation');
    
    // Use a more direct router method
    router.replace('/(tabs)/(scan)');
  };

  // Handle closing the guide
  const handleCloseGuide = async () => {
    try {
      await AsyncStorage.setItem(GUIDE_KEY, 'true');
      setShowGuide(false);
      
      // Log guide interaction
      logEvent('guide_completed', { type: 'camera_guide' });
    } catch (error) {
      console.error('Error saving guide status:', error);
      setShowGuide(false);
    }
  };

  // Show informative text for web environment
  if (isWebEnvironment) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main p-4">
        <Ionicons name="camera-outline" size={48} color="#ffffff" />
        <StyledText className="text-text-primary font-sans-bold text-xl text-center mt-4 mb-2">
          Kameran är inte tillgänglig
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mb-6">
          Kamerafunktionaliteten är bara tillgänglig på fysiska enheter och i EAS builds, inte i webbläsaren eller Expo Go.
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

  // Show error if no device found
  if (device == null) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <StyledText className="text-text-primary font-sans text-lg">
          Kunde inte hitta kameran
        </StyledText>
        <StyledPressable 
          onPress={handleBack}
          className="mt-6 bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Gå tillbaka
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Show camera view
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
      
      {/* Guide grid */}
      <StyledView className="absolute inset-0 flex justify-center items-center">
        <StyledView className="w-4/5 h-32 border-2 border-white/50 rounded-lg" />
      </StyledView>
      
      {/* Dev button - only visible during development */}
      {__DEV__ && (
        <StyledPressable 
          onPress={resetGuide}
          className="absolute top-2 left-2 bg-black/30 p-2 rounded-full"
        >
          <Ionicons name="refresh" size={20} color="#fff" />
        </StyledPressable>
      )}
      
      {/* Camera controls */}
      <StyledView className="absolute bottom-0 left-0 right-0 h-24 bg-black/50">
        <StyledView className="flex-row justify-between items-center px-8 h-full">
          <StyledPressable 
            onPress={handleBack}
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