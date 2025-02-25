import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { Avatar } from '@/components/Avatar';
import { getAvailableAvatars, type AvatarOption } from '@/utils/avatarUtils';
import { useStore } from '@/stores/useStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

interface AvatarSelectorProps {
  onComplete: () => void;
}

export const AvatarSelector: React.FC<AvatarSelectorProps> = ({ onComplete }) => {
  const [selectedStyle, setSelectedStyle] = useState<'cute' | 'cool'>('cute');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  
  const veganYears = useStore((state) => state.avatar.veganYears);
  const setAvatar = useStore((state) => state.setAvatar);
  
  // Get available avatars based on vegan years
  const availableAvatars = getAvailableAvatars(veganYears, selectedStyle);

  const handleStyleChange = async (style: 'cute' | 'cool') => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedStyle(style);
    setSelectedAvatar(null);
  };

  const handleAvatarSelect = async (avatar: AvatarOption) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedAvatar(avatar);
    setAvatar(selectedStyle, avatar.id);
  };

  const handleContinue = async () => {
    if (selectedAvatar) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onComplete();
    }
  };

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Style selector */}
      <StyledView className="flex-row justify-center space-x-4 px-6 pt-4 mb-6">
        <StyledPressable
          onPress={() => handleStyleChange('cute')}
          className={`flex-1 py-3 rounded-lg items-center ${
            selectedStyle === 'cute' ? 'bg-primary' : 'bg-background-light'
          }`}
        >
          <StyledText className={`font-sans-medium ${
            selectedStyle === 'cute' ? 'text-text-inverse' : 'text-text-primary'
          }`}>
            Cute
          </StyledText>
        </StyledPressable>

        <StyledPressable
          onPress={() => handleStyleChange('cool')}
          className={`flex-1 py-3 rounded-lg items-center ${
            selectedStyle === 'cool' ? 'bg-primary' : 'bg-background-light'
          }`}
        >
          <StyledText className={`font-sans-medium ${
            selectedStyle === 'cool' ? 'text-text-inverse' : 'text-text-primary'
          }`}>
            Cool
          </StyledText>
        </StyledPressable>
      </StyledView>

      {/* Avatars grid */}
      <StyledScrollView className="flex-1 px-6">
        <StyledView className="flex-row flex-wrap justify-between">
          {availableAvatars.map((avatar) => {
            const isSelected = selectedAvatar?.id === avatar.id;

            return (
              <StyledPressable
                key={avatar.id}
                onPress={() => handleAvatarSelect(avatar)}
                className="w-[48%] mb-6"
              >
                <StyledView className="items-center">
                  <Avatar
                    source={avatar.filename}
                    size="medium"
                    style={selectedStyle}
                    variant={isSelected ? 'selected' : 'default'}
                  />
                  <StyledText className="text-text-primary font-sans-medium text-center mt-2">
                    {avatar.name}
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-sm text-center mt-1">
                    {avatar.description}
                  </StyledText>
                </StyledView>
              </StyledPressable>
            );
          })}
        </StyledView>
      </StyledScrollView>

      {/* Continue button */}
      <StyledView className="px-6 py-4">
        <StyledPressable
          onPress={handleContinue}
          disabled={!selectedAvatar}
          className={`py-4 rounded-lg items-center ${
            selectedAvatar ? 'bg-primary' : 'bg-background-light'
          }`}
        >
          <StyledText className={`font-sans-bold ${
            selectedAvatar ? 'text-text-inverse' : 'text-text-secondary'
          }`}>
            Fortsätt
          </StyledText>
        </StyledPressable>
      </StyledView>
    </StyledView>
  );
};