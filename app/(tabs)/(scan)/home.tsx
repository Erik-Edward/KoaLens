import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { logScreenView, logEvent } from '@/lib/analyticsWrapper';
import { useCameraPermission } from '@/lib/visionCameraWrapper';
import { useRouter } from 'expo-router';
import { Link, Stack } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Asset } from 'expo-asset';
import AnimatedBackground from '@/components/AnimatedBackground';

// Styling med nativewind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);

// Enkel hemskärm för skanna-fliken
export default function HomeScreen() {
  const router = useRouter();
  
  // Status för tillståndskontrollen
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
        // Låt systemets behörighetsbegäran hantera detta
        // Vi visar ingen extra dialog här
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
      logEvent('video_recording_started');
      
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
        <StyledView className="items-center mb-12">
          <Ionicons name="scan-outline" size={80} color="#4ECDC4" />
          <StyledText className="mt-4 text-text-primary font-sans-bold text-xl">
            Videoskanna ingredienslistan
          </StyledText>
        </StyledView>
        
        <StyledView className="w-full items-center">
          <StyledPressable 
            onPress={handleOpenVideo}
            disabled={isCheckingPermissions}
            className={`bg-primary px-8 py-4 rounded-xl w-full ${isCheckingPermissions ? 'opacity-70' : 'active:opacity-80'}`}
          >
            <StyledView className="flex-row items-center justify-center">
              {isCheckingPermissions ? (
                <ActivityIndicator size="small" color="#000" />
              ) : (
                <Ionicons name="scan-outline" size={24} color="#000" />
              )}
              <StyledText className="ml-2 text-black font-sans-medium text-base">
                Skanna nu
              </StyledText>
            </StyledView>
          </StyledPressable>

          <StyledView className="mt-8 w-full px-4">
            <StyledView className="flex-row mb-2 items-start">
               <StyledText className="text-text-secondary mr-2">•</StyledText>
               <StyledText className="text-text-secondary font-sans text-sm flex-1">
                 Panorera lugnt över <StyledText className="font-sans-bold">hela</StyledText> ingredienslistan.
               </StyledText>
            </StyledView>
             <StyledView className="flex-row mb-2 items-start">
               <StyledText className="text-text-secondary mr-2">•</StyledText>
               <StyledText className="text-text-secondary font-sans text-sm flex-1">
                 Inspelningen är <StyledText className="font-sans-bold">5 sekunder</StyledText> lång.
               </StyledText>
            </StyledView>
             <StyledView className="flex-row items-start">
               <StyledText className="text-text-secondary mr-2">•</StyledText>
               <StyledText className="text-text-secondary font-sans text-sm flex-1">
                 Analysen startar automatiskt när inspelningen är klar.
               </StyledText>
            </StyledView>
            <StyledView className="flex-row items-start mt-2">
               <StyledText className="text-text-secondary mr-2">•</StyledText>
               <StyledText className="text-text-secondary font-sans text-sm flex-1">
                 Du får sedan veta om produkten är <StyledText className="font-sans-bold">vegansk eller inte</StyledText>.
               </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledSafeAreaView>
  );
} 