// app/(tabs)/(profile)/support.tsx
import React, { useState } from 'react';
import { View, Text, Pressable, Linking, Alert, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackModal } from '@/components/FeedbackModal';
import { HelpSectionModal } from '@/components/HelpSectionModal';
import * as Haptics from 'expo-haptics';
import Constants from 'expo-constants';
import { SUPPORT_EMAIL } from '@/constants/config';
import { logEvent } from '@/lib/analytics';
import theme from '@/constants/theme';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export default function SupportScreen() {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  // Support funktioner
  const handleContactSupport = async () => {
    try {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      // Logga support-kontakthändelse
      logEvent('contact_support_email', {});
      
      // Skapa e-postämne och brödtext
      const subject = `KoaLens Support (v${Constants.expoConfig?.version || '1.0.0'})`;
      const body = `\n\n\n\n----------\nApp-version: ${Constants.expoConfig?.version || '1.0.0'}\nPlattform: ${Platform.OS} ${Platform.Version}\nEnhet: ${Platform.OS === 'ios' ? 'iOS' : 'Android'}\n----------`;
      
      // Öppna e-postklient
      const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      const canOpen = await Linking.canOpenURL(url);
      
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(
          'Kunde inte öppna e-post',
          `Vänligen skicka e-post manuellt till ${SUPPORT_EMAIL}`
        );
      }
    } catch (error) {
      console.error('Error opening email client:', error);
      Alert.alert(
        'Något gick fel',
        `Vänligen skicka e-post manuellt till ${SUPPORT_EMAIL}`
      );
    }
  };

  const handleOpenFeedback = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Logga feedback-händelse
    logEvent('open_feedback_form', {});
    setShowFeedbackModal(true);
  };

  const handleOpenHelp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // Logga hjälp-händelse
    logEvent('open_help_section', {});
    setShowHelpModal(true);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Support",
          headerStyle: {
            backgroundColor: theme.colors.background.dark,
          },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <StyledView className="flex-1 bg-background-main p-4">
        {/* Intro text */}
        <StyledView className="bg-background-light/30 p-4 rounded-lg mb-6">
          <StyledText className="text-text-primary font-sans-medium text-lg mb-2">
            Hur kan vi hjälpa dig?
          </StyledText>
          <StyledText className="text-text-secondary font-sans">
            Välj ett av alternativen nedan för att få hjälp eller lämna feedback på appen.
          </StyledText>
        </StyledView>
        
        {/* Support options */}
        <StyledView className="space-y-4">
          {/* Contact Support */}
          <StyledPressable 
            onPress={handleContactSupport}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Kontakta support"
          >
            <Ionicons name="mail-outline" size={24} color="#ffffff" />
            <StyledView className="ml-3 flex-1">
              <StyledText className="text-text-primary font-sans-medium text-lg">
                Kontakta support
              </StyledText>
              <StyledText className="text-text-secondary font-sans text-sm mt-1">
                Skicka e-post till vårt supportteam
              </StyledText>
            </StyledView>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>

          {/* Feedback Form */}
          <StyledPressable 
            onPress={handleOpenFeedback}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Lämna feedback"
          >
            <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
            <StyledView className="ml-3 flex-1">
              <StyledText className="text-text-primary font-sans-medium text-lg">
                Lämna feedback
              </StyledText>
              <StyledText className="text-text-secondary font-sans text-sm mt-1">
                Förslag, problem eller beröm
              </StyledText>
            </StyledView>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>

          {/* Help Section */}
          <StyledPressable 
            onPress={handleOpenHelp}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Hjälp & Vanliga frågor"
          >
            <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
            <StyledView className="ml-3 flex-1">
              <StyledText className="text-text-primary font-sans-medium text-lg">
                Hjälp & Vanliga frågor
              </StyledText>
              <StyledText className="text-text-secondary font-sans text-sm mt-1">
                Svar på vanliga frågor om appen
              </StyledText>
            </StyledView>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>
        </StyledView>
        
        {/* Version Information */}
        <StyledView className="items-center mt-auto pt-4 pb-2">
          <StyledText className="text-text-secondary/60 font-sans text-sm">
            KoaLens v{Constants.expoConfig?.version || '1.0.0'}
          </StyledText>
        </StyledView>
      </StyledView>
      
      {/* Modals */}
      <FeedbackModal
        visible={showFeedbackModal}
        onClose={() => setShowFeedbackModal(false)}
      />
      
      <HelpSectionModal
        visible={showHelpModal}
        onClose={() => setShowHelpModal(false)}
      />
    </>
  );
}