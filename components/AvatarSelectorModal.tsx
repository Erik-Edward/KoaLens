// components/AvatarSelectorModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { getAvailableAvatars, getSupporterAvatars, type AvatarOption } from '@/utils/avatarUtils';
import { AvatarCarousel } from './AvatarCarousel';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

interface AvatarSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (filename: string, style: AvatarStyle) => void;
  currentAvatarId: string | null;
  currentAvatarStyle: AvatarStyle;
}

// Combine all avatars into one array
const ALL_AVATARS: AvatarOption[] = [
  ...getAvailableAvatars(5, 'cute'), // Get all cute avatars
  ...getAvailableAvatars(5, 'cool'), // Get all cool avatars
  ...getSupporterAvatars() // Get all supporter avatars
];

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  visible,
  onClose,
  onSelectAvatar,
  currentAvatarId,
  currentAvatarStyle,
}) => {
  // State för att hålla reda på den avatar som visas i karusellen
  const [currentlyDisplayedAvatar, setCurrentlyDisplayedAvatar] = useState<AvatarOption | null>(null);

  // Logga innehållet i ALL_AVATARS när komponenten renderas
  console.log('AvatarSelectorModal: Rendering with ALL_AVATARS count:', ALL_AVATARS.length);
  // console.log('AvatarSelectorModal: ALL_AVATARS data:', JSON.stringify(ALL_AVATARS)); // Avkommentera vid behov för mer detaljer

  // Initialisera state när modalen blir synlig eller när den nuvarande avataren ändras
  useEffect(() => {
    if (visible) {
      console.log('AvatarSelectorModal Effect: Finding initial avatar for', { currentAvatarId, currentAvatarStyle });
      const initialAvatar = ALL_AVATARS.find(a => a.id === currentAvatarId && a.style === currentAvatarStyle);
      console.log('AvatarSelectorModal Effect: Found initial avatar:', initialAvatar ? `${initialAvatar.id}-${initialAvatar.style}` : 'null');
      
      // Sätt state till den funna avataren, eller den första i listan om ingen matchades
      const avatarToSet = initialAvatar || ALL_AVATARS[0];
      console.log('AvatarSelectorModal Effect: Setting currentlyDisplayedAvatar to:', avatarToSet ? `${avatarToSet.id}-${avatarToSet.style}` : 'null');
      setCurrentlyDisplayedAvatar(avatarToSet || null); // Säkerställ att vi inte sätter undefined
    }
  }, [visible, currentAvatarId, currentAvatarStyle]);

  // Hantera när användaren swipar till en ny avatar i karusellen
  const handleCarouselSelect = (avatar: AvatarOption) => {
    setCurrentlyDisplayedAvatar(avatar);
    // Ingen haptik här, karusellen hanterar det
  };

  // Hantera när användaren trycker på bekräftelseknappen
  const handleConfirmSelection = async () => {
    if (currentlyDisplayedAvatar) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onSelectAvatar(currentlyDisplayedAvatar.filename, currentlyDisplayedAvatar.style);
      onClose(); // Stäng modalen efter val
    }
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 bg-black/70 pt-10 justify-end">
        {/* Ge container flex-grow och max-height */}
        <StyledView className="bg-background-main rounded-t-lg shadow-xl overflow-hidden pb-6 flex-grow max-h-[85vh]">
          {/* Header med close button */}
          <StyledView className="flex-row justify-between items-center p-6 border-b border-background-light mb-6">
            <StyledText className="text-text-primary font-sans-bold text-xl">
              Välj avatar
            </StyledText>
            <StyledPressable
              onPress={onClose}
              className="w-10 h-10 rounded-full bg-background-light/50 items-center justify-center"
            >
              <Ionicons name="close" size={24} color="#fff" />
            </StyledPressable>
          </StyledView>

          {/* Wrapper för Karusell med flex: 1 */}
          <StyledView className="flex-1 mb-4">
            {currentlyDisplayedAvatar && (
              <AvatarCarousel
                avatars={ALL_AVATARS}
                onSelectAvatar={handleCarouselSelect} // Uppdatera lokalt state vid swipe
                selectedAvatarId={currentlyDisplayedAvatar.id} // Visa vilken som är aktiv
              />
            )}
          </StyledView>
          
          {/* Bekräftelseknapp (justerad padding) */}
          <StyledView className="px-6 pt-4">
            <StyledPressable
              onPress={handleConfirmSelection}
              disabled={!currentlyDisplayedAvatar}
              className={`py-4 rounded-lg items-center ${
                currentlyDisplayedAvatar ? 'bg-primary' : 'bg-background-light'
              }`}
            >
              <StyledText className={`font-sans-bold text-lg ${
                currentlyDisplayedAvatar ? 'text-text-inverse' : 'text-text-secondary'
              }`}>
                Välj denna avatar
              </StyledText>
            </StyledPressable>
          </StyledView>
          
        </StyledView>
      </StyledView>
    </Modal>
  );
};