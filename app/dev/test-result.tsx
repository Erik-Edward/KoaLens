/**
 * Testsida för analysresultat
 * Simulerar ett analysresultat för att testa den nya resultatskärmen
 */

import React, { useEffect } from 'react';
import { View, Text, Image, SafeAreaView, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);

// Demo bildadress
const DEMO_IMAGE_URI = 'https://images.unsplash.com/photo-1621062280699-a4471ee0a5ff?q=80&w=800&auto=format&fit=crop';

export default function TestResultScreen() {
  // Navigera till resultatskärmen med demo-bilden
  useEffect(() => {
    // Kort fördröjning för att simulera laddning
    const timer = setTimeout(() => {
      router.replace({
        pathname: '/(tabs)/(scan)/result-new',
        params: { imageUri: DEMO_IMAGE_URI }
      });
    }, 500);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StyledSafeAreaView className="flex-1 bg-background-main">
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="hourglass-outline" size={48} color="#6366f1" />
          <StyledText className="text-text-primary font-sans-medium text-lg mt-4 text-center">
            Laddar demo-analys...
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mt-2">
            Du kommer att omdirigeras till resultatskärmen
          </StyledText>
        </StyledView>
      </StyledSafeAreaView>
    </>
  );
} 