// app/(onboarding)/avatar.tsx
import React, { useState } from 'react';
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useStore } from '@/stores/useStore';
import { getSupporterAvatars, getAvailableAvatars } from '@/utils/avatarUtils';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

type StyleType = 'cute' | 'cool';

export default function AvatarScreen() {
  const [years, setYears] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('cute');
  
  const setVeganYears = useStore((state) => state.setVeganYears);
  const setAvatar = useStore((state) => state.setAvatar);
  const veganStatus = useStore((state) => state.veganStatus.status);

  const handleStyleChange = async (style: StyleType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyle(style);
  };

  const handleYearChange = (value: number) => {
    setYears(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    const currentAvatar = getAvailableAvatars(years, selectedStyle).slice(-1)[0];
    await setVeganYears(years);
    await setAvatar(selectedStyle, currentAvatar.id);
    router.push('/(onboarding)/guide');
  };

  const currentAvatar = getAvailableAvatars(years, selectedStyle).slice(-1)[0];

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Header - ta bort undertexten och öka margin bottom */}
      <StyledView className="px-6 pt-14 mb-8">
        <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
          Hur länge har du varit vegan
        </StyledText>
      </StyledView>

      {/* Style buttons - öka margin bottom */}
      <StyledView className="flex-row justify-center space-x-3 px-6 mb-10">
        <StyledPressable
          onPress={() => handleStyleChange('cute')}
          className={`px-6 py-3 rounded-xl ${
            selectedStyle === 'cute' ? 'bg-primary' : 'bg-background-light/30'
          }`}
        >
          <StyledText 
            className={`font-sans-medium ${
              selectedStyle === 'cute' ? 'text-text-inverse' : 'text-text-primary'
            }`}
          >
            Lekfull
          </StyledText>
        </StyledPressable>

        <StyledPressable
          onPress={() => handleStyleChange('cool')}
          className={`px-6 py-3 rounded-xl ${
            selectedStyle === 'cool' ? 'bg-primary' : 'bg-background-light/30'
          }`}
        >
          <StyledText 
            className={`font-sans-medium ${
              selectedStyle === 'cool' ? 'text-text-inverse' : 'text-text-primary'
            }`}
          >
            Stilren
          </StyledText>
        </StyledPressable>
      </StyledView>

      {/* Avatar display - öka mellanrum */}
      {currentAvatar && (
        <StyledView className="items-center px-6">
          <StyledView className="w-52 h-52 bg-background-light/30 rounded-full justify-center items-center mb-8">
            <Avatar
              source={currentAvatar.filename}
              size="large"
              style={selectedStyle}
            />
          </StyledView>

          <StyledText className="text-primary font-sans-bold text-2xl mb-3">
            {currentAvatar.name}
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mb-8">
            {currentAvatar.description}
          </StyledText>

          {/* Years selector */}
          <StyledText className="text-text-primary font-sans-bold text-2xl mb-6">
  {years === 0 
    ? "Nybliven vegan" 
    : years === 5 
      ? "5+ år" 
      : `${years} år`
  }
</StyledText>

          <StyledView className="w-full mb-8">
          <Slider
  style={{ height: 36 }}
  minimumValue={0}
  maximumValue={5}  // Ändrat från 10 till 5
  step={0.5}
  value={years}
  onValueChange={handleYearChange}
  minimumTrackTintColor="#4CAF50"
  maximumTrackTintColor="#3a3f44"
  thumbTintColor="#ffd33d"
/>
            <StyledView className="flex-row justify-between mt-2">
              <StyledText className="text-text-secondary font-sans">
                Nybliven
              </StyledText>
              <StyledText className="text-text-secondary font-sans">
                Veteran
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      )}

      {/* Continue button */}
      <StyledView className="px-6 mt-auto pb-8">
        <StyledPressable
          onPress={handleContinue}
          className="bg-primary py-4 rounded-lg active:opacity-80"
        >
          <StyledText className="text-text-inverse font-sans-bold text-center">
            Fortsätt
          </StyledText>
        </StyledPressable>
      </StyledView>
    </StyledView>
  );
}