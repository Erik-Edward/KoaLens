import { View, Text, Linking, Pressable, ScrollView, Platform, Modal, TextInput } from 'react-native';
import { styled } from 'nativewind';
import * as Device from 'expo-device';
import { useState } from 'react';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { feedback } from '@/lib/feedbackWrapper';
import { SUPPORT_EMAIL } from '@/constants/config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);
const StyledTextInput = styled(TextInput);

// Basic FAQ data
const faqData = [
  {
    question: 'Hur skannar jag en produkt?',
    answer: 'Öppna kamerafliken och rikta kameran mot produktens streckkod. Appen kommer automatiskt att skanna och visa produktinformation.'
  },
  {
    question: 'Hur uppdaterar jag min profil?',
    answer: 'Gå till profilinställningar genom att trycka på profilfliken och sedan på inställningsikonen.'
  },
  {
    question: 'Vad gör jag om skanningen inte fungerar?',
    answer: 'Se till att streckkoden är väl belyst och centrerad i kameran. Om problemet kvarstår, prova att starta om appen.'
  }
];

const Support = () => {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth();

  const handleContactSupport = async () => {
    if (Device.isDevice && !__DEV__) {
      // Show feedback modal in EAS builds
      setShowFeedbackModal(true);
    } else {
      // Basic support for Expo Go
      handleBasicContactSupport();
    }
  };

  const handleBasicContactSupport = async () => {
    const subject = 'KoaLens Support Request';
    const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}`;
    
    try {
      const canOpen = await Linking.canOpenURL(mailtoUrl);
      if (canOpen) {
        await Linking.openURL(mailtoUrl);
      }
    } catch (error) {
      console.error('Error opening mail client:', error);
    }
  };

  const handleSubmitFeedback = async () => {
    if (!feedbackText.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);

    try {
      const success = await feedback.submitFeedback({
        type: 'issue',
        message: feedbackText,
        email: user?.email
      });

      if (success) {
        // Clear form and close modal
        setFeedbackText('');
        setShowFeedbackModal(false);
      } else {
        // If submission fails, fall back to email
        handleBasicContactSupport();
      }
    } catch (error) {
      console.error('Error sending feedback:', error);
      // Fallback to email if feedback submission fails
      handleBasicContactSupport();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StyledScrollView className="flex-1 bg-background-main">
      <StyledView className="p-6 space-y-6">
        {/* Header Section */}
        <StyledView className="space-y-2">
          <StyledText className="text-2xl font-bold text-text-primary">
            Hur kan vi hjälpa dig?
          </StyledText>
          <StyledText className="text-text-secondary">
            Välj ett alternativ nedan för att få hjälp
          </StyledText>
        </StyledView>

        {/* Contact Support Button */}
        <StyledPressable
          onPress={handleContactSupport}
          className="bg-primary p-4 rounded-lg active:opacity-80"
        >
          <StyledText className="text-white text-center font-semibold">
            {Device.isDevice && !__DEV__ ? 'Skicka Feedback' : 'Kontakta Support'}
          </StyledText>
        </StyledPressable>

        {/* FAQ Section */}
        <StyledView className="space-y-4">
          <StyledText className="text-lg font-semibold text-text-primary">
            Vanliga frågor
          </StyledText>
          {faqData.map((faq, index) => (
            <StyledView key={index} className="bg-background-secondary p-4 rounded-lg">
              <StyledText className="font-semibold text-text-primary mb-2">
                {faq.question}
              </StyledText>
              <StyledText className="text-text-secondary">
                {faq.answer}
              </StyledText>
            </StyledView>
          ))}
        </StyledView>

        {/* Version Info */}
        <StyledText className="text-text-secondary text-center text-sm">
          Version {Device.osVersion} ({Platform.OS})
        </StyledText>

        {/* Feedback Modal */}
        <Modal
          visible={showFeedbackModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => !isSubmitting && setShowFeedbackModal(false)}
        >
          <StyledView className="flex-1 justify-center items-center bg-black/50">
            <StyledView className="bg-background-main p-6 rounded-lg w-11/12 max-w-md">
              <StyledText className="text-xl font-bold text-text-primary mb-4">
                Skicka Feedback
              </StyledText>
              
              <StyledTextInput
                className="bg-background-secondary p-4 rounded-lg text-text-primary mb-4"
                placeholder="Beskriv ditt ärende här..."
                placeholderTextColor="#666"
                multiline
                numberOfLines={4}
                value={feedbackText}
                onChangeText={setFeedbackText}
                editable={!isSubmitting}
              />

              <StyledView className="flex-row justify-end space-x-4">
                <StyledPressable
                  onPress={() => setShowFeedbackModal(false)}
                  className="px-4 py-2 rounded-lg bg-background-secondary"
                  disabled={isSubmitting}
                >
                  <StyledText className="text-text-primary">Avbryt</StyledText>
                </StyledPressable>
                
                <StyledPressable
                  onPress={handleSubmitFeedback}
                  className={`px-4 py-2 rounded-lg ${isSubmitting ? 'bg-primary/50' : 'bg-primary'}`}
                  disabled={isSubmitting}
                >
                  <StyledText className="text-white font-semibold">
                    {isSubmitting ? 'Skickar...' : 'Skicka'}
                  </StyledText>
                </StyledPressable>
              </StyledView>
            </StyledView>
          </StyledView>
        </Modal>
      </StyledView>
    </StyledScrollView>
  );
};

export default Support; 