// components/UsageLimitModal.tsx
import React from 'react';
import { Modal, View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useCounter } from '@/hooks/useCounter';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

interface UsageLimitModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UsageLimitModal({ visible, onClose }: UsageLimitModalProps) {
  const { value: analysesUsed, limit: analysesLimit } = useCounter('analysis_count');
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 justify-center items-center bg-black/70">
        <StyledView className="w-11/12 max-w-md bg-background-main p-6 rounded-xl">
          <StyledView className="items-center mb-6">
            <Ionicons name="alert-circle" size={64} color="#ff9800" />
            <StyledText className="text-xl font-sans-bold text-text-primary mt-4 text-center">
              Du har nått din månatliga gräns
            </StyledText>
          </StyledView>
          
          <StyledText className="text-base font-sans text-text-secondary mb-6">
            Du har använt alla dina {analysesLimit} analyser för denna månad. 
            Vänta till nästa månad för att få nya analyser eller uppgradera till 
            premium för obegränsade analyser.
          </StyledText>
          
          <StyledView className="bg-background-light/20 p-4 rounded-lg mb-6">
            <StyledText className="text-text-secondary font-sans text-center">
              Ditt antal analyser återställs automatiskt den första dagen i nästa månad.
            </StyledText>
          </StyledView>
          
          <StyledView className="flex-row justify-end space-x-4">
            <StyledPressable 
              className="py-3 px-4 rounded-lg bg-primary-dark active:opacity-80"
              onPress={onClose}
            >
              <StyledText className="font-sans-bold text-text-inverse">
                OK
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
      </StyledView>
    </Modal>
  );
}