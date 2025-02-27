// components/FeedbackModal.tsx
import React, { useState } from 'react';
import { View, Text, Modal, Pressable, TextInput, Alert, ActivityIndicator, Platform, Linking } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { logEvent } from '@/lib/analytics';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import Constants from 'expo-constants';
import { SUPPORT_EMAIL } from '@/constants/config';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledTextInput = styled(TextInput);

interface FeedbackModalProps {
  visible: boolean;
  onClose: () => void;
}

type FeedbackType = 'suggestion' | 'issue' | 'praise';

const FEEDBACK_TYPES = [
  { id: 'suggestion', label: 'Förslag', icon: 'bulb-outline', color: '#FFD33D' },
  { id: 'issue', label: 'Problem', icon: 'alert-circle-outline', color: '#F44336' },
  { id: 'praise', label: 'Beröm', icon: 'heart-outline', color: '#4CAF50' },
];

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ visible, onClose }) => {
  const [selectedType, setSelectedType] = useState<FeedbackType>('suggestion');
  const [feedback, setFeedback] = useState('');
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user } = useAuth(); // Hämta användarkontext

  const handleClose = () => {
    setSelectedType('suggestion');
    setFeedback('');
    setEmail('');
    onClose();
  };

  const handleSubmit = async () => {
    if (!feedback.trim()) {
      Alert.alert('Oops', 'Vänligen skriv din feedback innan du skickar in.');
      return;
    }

    try {
      setIsSubmitting(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Logga feedback-händelse för analytics
      logEvent('feedback_submitted', {
        feedback_type: selectedType,
        has_email: !!email.trim()
      });

      // Spara feedback i Supabase
      const appVersion = Constants.expoConfig?.version || 'unknown';
      const { data, error } = await supabase
        .from('app_feedback')
        .insert([
          { 
            user_id: user?.id || null, 
            feedback_type: selectedType,
            message: feedback,
            email: email || null,
            app_version: appVersion,
            platform: Platform.OS
          }
        ]);
      
      if (error) {
        console.error('Error saving feedback:', error);
        // Fallback till att skicka e-post om Supabase-lagringen misslyckas
        await sendFeedbackEmail();
        Alert.alert(
          'Feedback mottagen',
          'Tack för din feedback! Vi hade ett problem med att spara den, men har skickat den via e-post istället.',
          [{ text: 'OK', onPress: handleClose }]
        );
        return;
      }
      
      Alert.alert(
        'Tack för din feedback!',
        'Vi uppskattar att du hjälper oss förbättra KoaLens.',
        [{ text: 'OK', onPress: handleClose }]
      );
      
      Alert.alert(
        'Tack för din feedback!',
        'Vi uppskattar att du hjälper oss förbättra KoaLens.',
        [{ text: 'OK', onPress: handleClose }]
      );
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert('Ett fel uppstod', 'Kunde inte skicka din feedback. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Hjälpfunktion för att skicka feedback via e-post om Supabase misslyckas
  const sendFeedbackEmail = async () => {
    try {
      const subject = `KoaLens Feedback: ${selectedType}`;
      const body = `Typ: ${selectedType}\n\nMeddelande: ${feedback}\n\nKontakt: ${email || 'Ej angiven'}\n\n----------\nApp version: ${Constants.expoConfig?.version || 'unknown'}\nPlattform: ${Platform.OS}`;
      
      const mailtoUrl = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      return await Linking.openURL(mailtoUrl);
    } catch (error) {
      console.error('Error sending feedback via email:', error);
      return false;
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
    >
      <StyledView className="flex-1 justify-end bg-black/70">
        <StyledView className="bg-background-main rounded-t-3xl">
          {/* Header */}
          <StyledView className="flex-row justify-between items-center p-6 border-b border-background-light">
            <StyledText className="text-text-primary font-sans-bold text-xl">
              Lämna feedback
            </StyledText>
            <StyledPressable
              onPress={handleClose}
              className="w-10 h-10 rounded-full bg-background-light/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </StyledPressable>
          </StyledView>

          {/* Content */}
          <StyledView className="p-6">
            {/* Feedback Type Selection */}
            <StyledText className="text-text-primary font-sans-medium mb-3">
              Typ av feedback
            </StyledText>
            <StyledView className="flex-row justify-between mb-6">
              {FEEDBACK_TYPES.map((type) => (
                <StyledPressable
                  key={type.id}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedType(type.id as FeedbackType);
                  }}
                  className={`flex-1 p-3 rounded-lg items-center mx-1 ${
                    selectedType === type.id ? 'bg-background-light' : 'bg-background-light/30'
                  }`}
                  style={({ pressed }) => ({
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={type.color} 
                  />
                  <StyledText className="text-text-primary font-sans text-sm mt-1">
                    {type.label}
                  </StyledText>
                </StyledPressable>
              ))}
            </StyledView>

            {/* Feedback Text Input */}
            <StyledText className="text-text-primary font-sans-medium mb-3">
              Din feedback
            </StyledText>
            <StyledTextInput
              className="bg-background-light/50 p-4 rounded-lg text-text-primary font-sans min-h-32"
              placeholder="Berätta vad du tycker eller delge dina idéer..."
              placeholderTextColor="#9ca3af"
              multiline
              textAlignVertical="top"
              value={feedback}
              onChangeText={setFeedback}
            />

            {/* Optional Email */}
            <StyledText className="text-text-primary font-sans-medium mt-6 mb-3">
              E-post (valfritt)
            </StyledText>
            <StyledView className="flex-row bg-background-light/50 rounded-lg px-4 py-3 items-center">
              <Ionicons name="mail-outline" size={20} color="#9ca3af" />
              <StyledTextInput
                className="flex-1 ml-3 text-text-primary font-sans"
                placeholder="För att få svar på din feedback"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                value={email}
                onChangeText={setEmail}
              />
            </StyledView>

            {/* Submit Button */}
            <StyledPressable
              onPress={handleSubmit}
              disabled={isSubmitting}
              className={`mt-8 p-4 rounded-lg items-center ${
                isSubmitting ? 'bg-primary/60' : 'bg-primary'
              }`}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <StyledText className="text-text-inverse font-sans-bold">
                  Skicka feedback
                </StyledText>
              )}
            </StyledPressable>
          </StyledView>
        </StyledView>
      </StyledView>
    </Modal>
  );
};