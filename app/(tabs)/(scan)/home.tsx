import React from 'react';
import { View, Text, Pressable, StyleSheet, StatusBar, SafeAreaView } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import * as Haptics from 'expo-haptics';
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';

// Styling med nativewind
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);

// Enkel hemskärm för skanna-fliken
export default function HomeScreen() {
  // Loggning av skärmvisning
  React.useEffect(() => {
    console.log('HomeScreen loaded');
    logScreenView('ScanScreen');
    
    // Returnera en cleanup-funktion
    return () => {
      console.log('HomeScreen unmounted');
    };
  }, []);

  // Hantera knapp för att öppna kameran
  const handleOpenCamera = React.useCallback(() => {
    console.log('Opening camera');
    
    // Ge haptisk feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(console.error);
    
    // Logga händelse
    logEvent(Events.SCAN_STARTED);
    
    // Navigera till kameran
    router.push('/(tabs)/(scan)/camera');
  }, []);

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StatusBar barStyle="light-content" backgroundColor="#232A35" />
      
      <StyledView className="flex-1 justify-center items-center p-6">
        <StyledView className="items-center mb-8">
          <Ionicons name="scan-outline" size={80} color="#4ECDC4" />
          <StyledText className="mt-4 text-text-primary font-sans-bold text-xl">
            Skanna ingredienslista
          </StyledText>
          <StyledText className="mt-2 text-text-secondary font-sans text-center">
            Tryck på knappen nedan för att öppna kameran och skanna en ingredienslista
          </StyledText>
        </StyledView>
        
        <StyledPressable 
          onPress={handleOpenCamera}
          className="bg-primary px-8 py-4 rounded-xl active:opacity-80"
        >
          <StyledView className="flex-row items-center">
            <Ionicons name="camera-outline" size={24} color="#fff" />
            <StyledText className="ml-2 text-white font-sans-medium text-base">
              Öppna kamera
            </StyledText>
          </StyledView>
        </StyledPressable>
      </StyledView>
    </StyledSafeAreaView>
  );
} 