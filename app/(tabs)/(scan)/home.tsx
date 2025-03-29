import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { logEvent, Events, logScreenView } from '@/lib/analytics';
import { useCameraPermission } from '@/lib/visionCameraWrapper';

// Styling med nativewind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);

// Enkel hemskärm för skanna-fliken
export default function HomeScreen() {
  const [isCheckingPermissions, setIsCheckingPermissions] = useState(false);
  const { hasPermission, requestPermission } = useCameraPermission();

  // Loggning av skärmvisning
  useEffect(() => {
    console.log('HomeScreen loaded');
    logScreenView('ScanScreen');
    
    // Returnera en cleanup-funktion
    return () => {
      console.log('HomeScreen unmounted');
    };
  }, []);

  // Kontrollera kamera-behörigheter
  const checkCameraPermissions = async () => {
    try {
      setIsCheckingPermissions(true);
      
      console.log('Checking camera permissions');
      
      // Om vi redan har tillstånd, returnera true direkt
      if (hasPermission) {
        console.log('Camera permission already granted');
        return true;
      }
      
      // Annars, begär tillstånd
      const result = await requestPermission();
      console.log('Camera permission request result:', result);
      
      if (!result.granted) {
        Alert.alert(
          "Kameratillstånd krävs",
          "För att kunna använda denna funktion behöver appen tillstånd att använda din kamera.",
          [{ text: "OK" }]
        );
        return false;
      }
      
      // Tillstånd beviljat
      return true;
    } catch (error) {
      console.error('Error checking permissions:', error);
      Alert.alert(
        "Kunde inte kontrollera behörigheter",
        "Ett fel uppstod när behörigheter skulle kontrolleras. Försök igen.",
        [{ text: "OK" }]
      );
      return false;
    } finally {
      setIsCheckingPermissions(false);
    }
  };

  // Hantera knapp för att öppna kameran för foto
  const handleOpenCamera = async () => {
    try {
      console.log('Opening camera for photo');
      
      // Ge haptisk feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Kontrollera behörigheter
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) return;
      
      // Logga händelse
      logEvent(Events.SCAN_STARTED);
      
      // Navigera till kameran med inställning för fotoläge
      router.push({
        pathname: '/(tabs)/(scan)/camera',
        params: { mode: 'photo' }
      });
    } catch (error) {
      console.error('Error opening camera:', error);
    }
  };
  
  // Hantera knapp för att öppna kameran för video
  const handleOpenVideo = async () => {
    try {
      console.log('Opening camera for video');
      
      // Ge haptisk feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      // Kontrollera behörigheter (samma som för foto eftersom vi inte använder ljud)
      const hasPermission = await checkCameraPermissions();
      if (!hasPermission) return;
      
      // Logga händelse
      logEvent(Events.VIDEO_RECORDING_STARTED);
      
      // Navigera till kameran med inställning för videoläge
      router.push({
        pathname: '/(tabs)/(scan)/camera',
        params: { mode: 'video' }
      });
    } catch (error) {
      console.error('Error opening video recorder:', error);
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StatusBar barStyle="light-content" backgroundColor="#232A35" />
      
      <StyledView className="flex-1 justify-center items-center p-6">
        <StyledView className="items-center mb-8">
          <Ionicons name="scan-outline" size={80} color="#4ECDC4" />
          <StyledText className="mt-4 text-text-primary font-sans-bold text-xl">
            Skanna eller filma ingredienslista
          </StyledText>
          <StyledText className="mt-2 text-text-secondary font-sans text-center">
            Använd kameran för en stillbild eller spela in en video av ingredienslistan
          </StyledText>
        </StyledView>
        
        <StyledView className="w-full gap-4">
          <StyledPressable 
            onPress={handleOpenCamera}
            disabled={isCheckingPermissions}
            className={`bg-primary px-8 py-4 rounded-xl ${isCheckingPermissions ? 'opacity-70' : 'active:opacity-80'}`}
          >
            <StyledView className="flex-row items-center justify-center">
              {isCheckingPermissions ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="camera-outline" size={24} color="#fff" />
              )}
              <StyledText className="ml-2 text-white font-sans-medium text-base">
                Ta bild
              </StyledText>
            </StyledView>
          </StyledPressable>
          
          <StyledPressable 
            onPress={handleOpenVideo}
            disabled={isCheckingPermissions}
            className={`bg-secondary px-8 py-4 rounded-xl ${isCheckingPermissions ? 'opacity-70' : 'active:opacity-80'}`}
          >
            <StyledView className="flex-row items-center justify-center">
              {isCheckingPermissions ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="videocam-outline" size={24} color="#fff" />
              )}
              <StyledText className="ml-2 text-white font-sans-medium text-base">
                Spela in video
              </StyledText>
            </StyledView>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
} 