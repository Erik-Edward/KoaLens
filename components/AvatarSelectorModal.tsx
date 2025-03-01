// components/AvatarSelectorModal.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Pressable, ScrollView, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

interface AvatarSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (filename: string, style: AvatarStyle) => void;
  currentAvatarId: string | null;
  currentAvatarStyle: AvatarStyle;
}

// Avatarer för de olika stilarna - VIKTIGT: id används för att identifiera valet, filename används för bildvisning
const CUTE_AVATARS = [
  { id: 'squirrel', filename: 'squirrel' },
  { id: 'rabbit', filename: 'rabbit' },
  { id: 'koala', filename: 'koala' },
  { id: 'turtle', filename: 'turtle' },
];

const COOL_AVATARS = [
  { id: 'squirrel', filename: 'squirrel' },
  { id: 'rabbit', filename: 'rabbit' },
  { id: 'koala', filename: 'koala' },
  { id: 'turtle', filename: 'turtle' },
];

const SUPPORTER_AVATARS = [
  { id: 'gorilla', filename: 'gorilla' },
  { id: 'cow', filename: 'cow' },
  { id: 'ostrich', filename: 'ostrich' },
  { id: 'giraffe', filename: 'giraffe' },
  { id: 'deer', filename: 'deer' },
  { id: 'alpaca', filename: 'alpaca' },
  { id: 'panda', filename: 'panda' },
  { id: 'hippo', filename: 'hippo' },
];

// Array med alla tillgängliga stilar för att enkelt kunna navigera mellan dem
const AVAILABLE_STYLES: AvatarStyle[] = ['cute', 'cool', 'supporter'];

// Svensk visningstext för de olika stilarna
const STYLE_DISPLAY_NAMES: Record<AvatarStyle, string> = {
  'cute': 'Söta djur',
  'cool': 'Coola djur',
  'supporter': 'Fler djur'
};

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  visible,
  onClose,
  onSelectAvatar,
  currentAvatarId,
  currentAvatarStyle,
}) => {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(currentAvatarStyle);
  
  // Återställ vald stil när modalen öppnas
  useEffect(() => {
    if (visible) {
      setSelectedStyle(currentAvatarStyle);
    }
  }, [visible, currentAvatarStyle]);

  const handleSelectAvatar = async (avatarId: string) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectAvatar(avatarId, selectedStyle);
    onClose();
  };

  // Navigera till nästa stil
  const handleNextStyle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentIndex = AVAILABLE_STYLES.indexOf(selectedStyle);
    const nextIndex = (currentIndex + 1) % AVAILABLE_STYLES.length;
    setSelectedStyle(AVAILABLE_STYLES[nextIndex]);
  };

  // Navigera till föregående stil
  const handlePrevStyle = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const currentIndex = AVAILABLE_STYLES.indexOf(selectedStyle);
    const prevIndex = (currentIndex - 1 + AVAILABLE_STYLES.length) % AVAILABLE_STYLES.length;
    setSelectedStyle(AVAILABLE_STYLES[prevIndex]);
  };

  // Bestäm vilka avatarer som ska visas baserat på vald stil
  let displayedAvatars = CUTE_AVATARS;
  if (selectedStyle === 'cool') {
    displayedAvatars = COOL_AVATARS;
  } else if (selectedStyle === 'supporter') {
    displayedAvatars = SUPPORTER_AVATARS;
  }

  // Hjälpfunktion för att kontrollera om en avatar är vald
  const isAvatarSelected = (avatarId: string): boolean => {
    // Om vi är i cool-läge, jämför bara basnamnet utan att ta hänsyn till "_cool"
    if (currentAvatarStyle === 'cool' && selectedStyle === 'cool') {
      return currentAvatarId === avatarId;
    }
    
    // För andra stilar, direkt jämförelse
    return currentAvatarId === avatarId;
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 justify-end bg-black/70">
        <StyledView className="bg-background-main rounded-t-3xl h-4/5">
          {/* Header med stängknapp */}
          <StyledView className="flex-row justify-between items-center p-6 border-b border-background-light">
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

          {/* Navigationsfält med pilar */}
          <StyledView className="flex-row justify-between items-center px-6 py-3">
            <StyledPressable
              onPress={handlePrevStyle}
              className="p-2 rounded-full bg-background-light/50 active:opacity-70"
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="chevron-back" size={24} color="#fff" />
            </StyledPressable>
            
            <StyledText className="text-text-primary font-sans-medium text-lg">
              {STYLE_DISPLAY_NAMES[selectedStyle]}
            </StyledText>
            
            <StyledPressable
              onPress={handleNextStyle}
              className="p-2 rounded-full bg-background-light/50 active:opacity-70"
              hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}
            >
              <Ionicons name="chevron-forward" size={24} color="#fff" />
            </StyledPressable>
          </StyledView>

          {/* Avatarlista med större mellanrum */}
          <StyledScrollView className="flex-1 px-4">
            <StyledView className="flex-row flex-wrap justify-center">
              {displayedAvatars.map((avatar) => {
                const isSelected = isAvatarSelected(avatar.id);
                const avatarStyle = selectedStyle === 'supporter' ? 'supporter' : selectedStyle;
                
                return (
                  <StyledPressable
                    key={avatar.id}
                    onPress={() => handleSelectAvatar(avatar.id)}
                    className="p-4" // Ökat mellanrum mellan avatarerna
                  >
                    <Avatar
                      source={avatar.filename}
                      size="medium"
                      style={avatarStyle}
                      variant={isSelected ? 'selected' : 'default'}
                    />
                  </StyledPressable>
                );
              })}
            </StyledView>
            <StyledView className="h-8" />
          </StyledScrollView>
        </StyledView>
      </StyledView>
    </Modal>
  );
};