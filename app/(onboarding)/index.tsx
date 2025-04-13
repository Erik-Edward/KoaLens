// app/(onboarding)/index.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, Image, Pressable, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import * as Haptics from 'expo-haptics';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  useSharedValue,
  runOnJS,
} from 'react-native-reanimated';
import AnimatedBackground from '@/components/AnimatedBackground';
import { useAuth } from '@/providers/AuthProvider';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledImage = styled(Image);
const AnimatedView = Animated.createAnimatedComponent(styled(View));
const AnimatedText = Animated.createAnimatedComponent(styled(Text));

const MESSAGES = [
  "Analysera produkter för att se om de är veganska",
  "Panorera över ingredienslistan för fullständig analys",
  "Få direkt besked om produkten är vegansk eller inte",
  "Inga språkbarriärer - fungerar på alla språk"
];

export default function OnboardingWelcomeScreen() {
  const { width } = useWindowDimensions();
  const setOnboardingCompleted = useStore((state) => state.setOnboardingCompleted);
  const setCurrentStep = useStore((state) => state.setCurrentStep);
  const { signOut } = useAuth();

  // State för textväxling
  const [currentMessage, setCurrentMessage] = useState(MESSAGES[0]);
  const [messageIndex, setMessageIndex] = useState(0);

  // Animationsvärden
  const logoOpacity = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const buttonsOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(1);

  // Beräkna logotypens storlek
  const logoWidth = width * 0.7;
  const logoHeight = (logoWidth * 264) / 489;

  // Funktion för att byta meddelande
  const cycleMessage = useCallback(() => {
    const nextIndex = (messageIndex + 1) % MESSAGES.length;
    const nextMsg = MESSAGES[nextIndex];
    
    textOpacity.value = withSequence(
      withTiming(0, { 
        duration: 500,
        easing: Easing.out(Easing.ease) 
      }, () => {
        runOnJS(setCurrentMessage)(nextMsg);
        runOnJS(setMessageIndex)(nextIndex);
      }),
      withTiming(1, { 
        duration: 500,
        easing: Easing.in(Easing.ease)
      })
    );
  }, [messageIndex, textOpacity]);

  useEffect(() => {
    // Initial animations
    const animationConfig = {
      duration: 800,
      easing: Easing.bezier(0.16, 1, 0.3, 1),
    };

    logoOpacity.value = withDelay(200, withTiming(1, animationConfig));
    contentOpacity.value = withDelay(400, withTiming(1, animationConfig));
    buttonsOpacity.value = withDelay(600, withTiming(1, animationConfig));

    // Start message cycling
    const intervalId = setInterval(cycleMessage, 4000);
    return () => clearInterval(intervalId);
  }, [cycleMessage, logoOpacity, contentOpacity, buttonsOpacity]);

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    opacity: logoOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  const handleStart = async () => {
    console.log("handleStart called");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCurrentStep(0);
    router.push('/(onboarding)/vegan-status');
  };

  const handleSkip = async () => {
    console.log("handleSkip called");
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await signOut();
      console.log("handleSkip: Successfully signed out before navigating");
    } catch (error) {
      console.error("handleSkip: Error signing out:", error);
    }
    await setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Animerad bakgrund - Restore */}
      <AnimatedBackground />

      {/* Gradient overlay - Restore */}
      <StyledView className="absolute inset-0 bg-gradient-to-b from-background-dark/30 via-transparent to-background-main" />

      {/* Huvudinnehåll */}
      <StyledView className="flex-1 px-6">
        {/* Logo sektion */}
        <AnimatedView className="items-center mt-20" style={logoStyle}>
          <StyledImage
            source={require('@/assets/images/koalens-text-logo.png')}
            style={{
              width: logoWidth,
              height: logoHeight,
            }}
            resizeMode="contain"
          />
        </AnimatedView>

        {/* Rotating text section */}
        <AnimatedView 
          className="mt-12 mb-auto" 
          style={contentStyle}
        >
          <AnimatedView 
            className="bg-background-main px-4 py-2 rounded-lg"
            style={textStyle}
          >
            <AnimatedText className="text-text-primary font-sans-bold text-3xl text-center">
              {currentMessage}
            </AnimatedText>
          </AnimatedView>
        </AnimatedView>

        {/* Knappar */}
        <AnimatedView 
          className="space-y-4 mb-12" 
          style={buttonsStyle}
        >
          <StyledPressable
            onPress={handleStart}
            className="bg-primary py-5 rounded-xl active:opacity-80"
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.98 : 1 }],
            })}
          >
            <StyledText className="text-text-inverse font-sans-bold text-xl text-center">
              Kom igång!
            </StyledText>
          </StyledPressable>

          <StyledPressable
            onPress={handleSkip}
            className="py-4"
          >
            <StyledText className="text-text-secondary font-sans text-base text-center">
              Hoppa över introduktionen
            </StyledText>
          </StyledPressable>
        </AnimatedView>
      </StyledView>
    </StyledView>
  );
}