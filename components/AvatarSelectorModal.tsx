// components/AvatarSelectorModal.tsx
import React from 'react';
import { View, Text, Modal, Pressable, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { Avatar } from './Avatar';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { getAvailableAvatars, getSupporterAvatars } from '@/utils/avatarUtils';

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

// Combine all avatars into one array
const ALL_AVATARS = [
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
  const handleSelectAvatar = async (avatarId: string, style: AvatarStyle) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectAvatar(avatarId, style);
    onClose();
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
          {/* Header with close button */}
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

          {/* Avatar grid */}
          <StyledScrollView>
            <StyledView className="flex-row flex-wrap justify-center p-4">
              {ALL_AVATARS.map((avatar) => {
                const isSelected = currentAvatarId === avatar.id && currentAvatarStyle === avatar.style;
                
                return (
                  <StyledPressable
                    key={`${avatar.id}-${avatar.style}`}
                    onPress={() => handleSelectAvatar(avatar.id, avatar.style)}
                    className="p-4"
                  >
                    <Avatar
                      source={avatar.filename}
                      size="medium"
                      style={avatar.style}
                      variant={isSelected ? 'selected' : 'default'}
                    />
                  </StyledPressable>
                );
              })}
            </StyledView>
          </StyledScrollView>
        </StyledView>
      </StyledView>
    </Modal>
  );
};