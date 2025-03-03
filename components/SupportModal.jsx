// components/SupportModal.jsx
import React, { useState } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { FeedbackModal } from './FeedbackModal';
import { HelpSectionModal } from './HelpSectionModal';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export function SupportModal({ visible, onClose }) {
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);

  const handleOpenFeedback = () => {
    setShowFeedbackModal(true);
  };

  const handleOpenHelp = () => {
    setShowHelpModal(true);
  };
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 bg-black/80">
        <StyledView className="flex-1 bg-background-main mt-12">
          {/* Header */}
          <StyledView className="flex-row items-center p-6 border-b border-background-light">
            <StyledPressable 
              onPress={onClose}
              className="p-2"
            >
              <Ionicons name="arrow-back" size={24} color="#ffffff" />
            </StyledPressable>
            <StyledText className="text-text-primary font-sans-bold text-xl ml-2">
              Support
            </StyledText>
          </StyledView>
          
          {/* Content */}
          <StyledView className="p-6 flex-1">
            <StyledText className="text-text-primary font-sans-medium text-lg mb-6">
              Hur kan vi hjälpa dig?
            </StyledText>
            
            {/* Feedback Button */}
            <StyledPressable 
              onPress={handleOpenFeedback}
              className="flex-row items-center p-4 bg-background-light/80 rounded-lg mb-4"
            >
              <Ionicons name="chatbubble-outline" size={24} color="#ffffff" />
              <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
                Lämna feedback
              </StyledText>
            </StyledPressable>
            
            {/* Help Button */}
            <StyledPressable 
              onPress={handleOpenHelp}
              className="flex-row items-center p-4 bg-background-light/80 rounded-lg"
            >
              <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
              <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
                Hjälp & Vanliga frågor
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
        
        {/* Nested modals */}
        <FeedbackModal
          visible={showFeedbackModal}
          onClose={() => setShowFeedbackModal(false)}
        />
        
        <HelpSectionModal
          visible={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      </StyledView>
    </Modal>
  );
}