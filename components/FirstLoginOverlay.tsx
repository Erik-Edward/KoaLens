// components/FirstLoginOverlay.tsx
import React from 'react';
import { View, Text, ActivityIndicator, Modal } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);

interface FirstLoginOverlayProps {
  visible: boolean;
}

export const FirstLoginOverlay: React.FC<FirstLoginOverlayProps> = ({ visible }) => {
  if (!visible) return null;
  
  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
    >
      <StyledView className="flex-1 bg-background-main/95 justify-center items-center">
        <StyledView className="bg-background-light p-8 rounded-2xl w-4/5 max-w-md items-center shadow-lg">
          <Ionicons name="person-circle-outline" size={60} color="#ffd33d" />
          
          <StyledText className="text-xl font-sans-bold text-text-primary mt-4 text-center">
            Välkommen!
          </StyledText>
          
          <StyledText className="text-base font-sans text-text-secondary mt-2 text-center">
            Vi förbereder din profil...
          </StyledText>
          
          <ActivityIndicator size="large" color="#ffd33d" style={{ marginTop: 24, marginBottom: 8 }} />
        </StyledView>
      </StyledView>
    </Modal>
  );
};