// app/(onboarding)/disclaimer.tsx
import { View, Text, ScrollView, Pressable, Alert, NativeSyntheticEvent, NativeScrollEvent, StyleProp, ViewStyle } from 'react-native';
import { router } from 'expo-router';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useState, useRef } from 'react';
import { useCallback } from 'react';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

// Disclaimer punkter
const DISCLAIMER_POINTS = [
  {
    title: 'AI-baserad analys',
    description: 'KoaLens använder artificiell intelligens för att analysera ingredienslistor. Även om tekniken är avancerad kan den innehålla fel eller missa viktig information.',
    icon: 'analytics-outline',
    iconBgColor: 'bg-blue-500/10'
  },
  {
    title: 'Gör din egen bedömning',
    description: 'KoaLens hjälper dig i din bedömning, men ersätter inte ditt eget omdöme. Läs alltid ingredienslistan själv och använd KoaLens som ett kompletterande verktyg.',
    icon: 'eye-outline',
    iconBgColor: 'bg-primary/10'
  },
  {
    title: 'Videokvalitet påverkar',
    description: 'Dålig belysning, skakiga videoinspelningar eller ofullständiga ingredienslistor kan påverka analysens tillförlitlighet.',
    icon: 'videocam-outline',
    iconBgColor: 'bg-green-500/10'
  },
  {
    title: 'Uppdaterad information',
    description: 'Produktinnehåll kan ändras. Kontrollera alltid mot den senaste informationen på förpackningen.',
    icon: 'refresh-outline',
    iconBgColor: 'bg-purple-500/10'
  }
];

export default function DisclaimerScreen() {
  const setDisclaimerAccepted = useStore((state) => state.setDisclaimerAccepted);
  const setOnboardingCompleted = useStore((state) => state.setOnboardingCompleted);
  const [isAtBottom, setIsAtBottom] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  const handleScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const {layoutMeasurement, contentOffset, contentSize} = event.nativeEvent;
    const paddingToBottom = 20;
    setIsAtBottom(layoutMeasurement.height + contentOffset.y >= 
      contentSize.height - paddingToBottom);
  }, []);

  const handleAccept = async () => {
    if (!isAtBottom) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(
        'Läs igenom informationen',
        'Vänligen läs igenom all information innan du fortsätter.',
        [{ text: 'OK' }]
      );
      // Animera scroll till botten
      scrollViewRef.current?.scrollToEnd({ animated: true });
      return;
    }

    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setDisclaimerAccepted(true);
    await setOnboardingCompleted(true);
    router.replace('/(auth)/login');
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const getScaleStyle = (pressed: boolean): StyleProp<ViewStyle> => ({
    transform: [{ scale: pressed ? 0.98 : 1 }]
  });

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Header med subtil skugga */}
      <StyledView className="px-6 pt-12 pb-4 bg-background-main/80 backdrop-blur-sm">
        <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
          Innan du börjar
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mt-2">
          Läs igenom följande information noggrant
        </StyledText>

        {/* Scroll indikator */}
        {!isAtBottom && (
          <StyledView className="flex-row justify-center mt-4">
            <Ionicons 
              name="chevron-down" 
              size={24} 
              color="#ffd33d"
              style={{ opacity: 0.8 }}
            />
          </StyledView>
        )}
      </StyledView>

      {/* Scrollable content med förbättrad padding */}
      <StyledScrollView 
        ref={scrollViewRef}
        className="flex-1 px-6"
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {DISCLAIMER_POINTS.map((point, index) => (
          <StyledView 
            key={index}
            className="bg-background-light/30 rounded-xl p-6 mb-4"
          >
            <StyledView className="flex-row items-center mb-3">
              <StyledView className={`p-2 rounded-lg ${point.iconBgColor}`}>
                <Ionicons 
                  name={point.icon as any} 
                  size={24}
                  color="#ffd33d"
                />
              </StyledView>
              <StyledText className="text-text-primary font-sans-bold text-lg ml-3 flex-1">
                {point.title}
              </StyledText>
            </StyledView>
            <StyledText className="text-text-secondary font-sans leading-relaxed">
              {point.description}
            </StyledText>
          </StyledView>
        ))}

        {/* Extra legal text med förbättrad läsbarhet */}
        <StyledView className="mb-8 bg-background-light/20 p-4 rounded-lg">
          <StyledText className="text-text-secondary font-sans text-sm leading-relaxed text-center">
            Genom att fortsätta bekräftar du att du har läst och förstått ovanstående information. 
            KoaLens ansvarar inte för eventuella felaktiga bedömningar eller konsekvenser 
            av appens användning.
          </StyledText>
        </StyledView>
      </StyledScrollView>

      {/* Bottom buttons med gradient overlay */}
      <StyledView className="px-6 pb-12 pt-4 bg-gradient-to-t from-background-main via-background-main to-transparent">
        <StyledView className="flex-row justify-between">
          <StyledPressable
            onPress={handleBack}
            className="py-4 px-6 active:opacity-70"
          >
            <StyledText className="text-text-secondary font-sans">
              Tillbaka
            </StyledText>
          </StyledPressable>

          <StyledPressable
            onPress={handleAccept}
            disabled={!isAtBottom}
            className={`bg-primary py-4 px-8 rounded-lg ${
              !isAtBottom ? 'opacity-50 cursor-not-allowed' : 'active:opacity-80'
            }`}
            style={({ pressed }) => isAtBottom ? getScaleStyle(pressed) : undefined}
          >
            <StyledText className="text-text-inverse font-sans-bold">
              Jag förstår
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledView>
  );
}