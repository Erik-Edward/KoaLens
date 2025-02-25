// app/(onboarding)/guide.tsx
import { View, Text, ScrollView, Pressable } from 'react-native';
import { router } from 'expo-router';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import ScanGuideStep from '@/components/onboarding/ScanGuideContent';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export default function GuideScreen() {
  const setOnboardingStep = useStore((state) => state.setCurrentStep);

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(onboarding)/disclaimer');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Content */}
      <ScanGuideStep />

      {/* Navigation buttons */}
      <StyledView className="px-6 pb-12">
        <StyledView className="flex-row justify-between">
          <StyledPressable
            onPress={handleBack}
            className="py-4 px-6"
          >
            <StyledText className="text-text-secondary font-sans">
              Tillbaka
            </StyledText>
          </StyledPressable>

          <StyledPressable
            onPress={handleNext}
            className="bg-primary py-4 px-8 rounded-lg active:opacity-80"
          >
            <StyledText className="text-text-inverse font-sans-bold">
              Fortsätt
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}