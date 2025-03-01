// app/(onboarding)/avatar.tsx - Fixat för att undvika oändlig loop
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useStore } from '@/stores/useStore';
import { getSupporterAvatars, getAvailableAvatars, AvatarOption } from '@/utils/avatarUtils';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { AvatarCarousel } from '@/components/AvatarCarousel';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

type StyleType = 'cute' | 'cool';

export default function AvatarScreen() {
  const [years, setYears] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('cute');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const initializedRef = useRef(false);
  
  const setVeganYears = useStore((state) => state.setVeganYears);
  const setAvatar = useStore((state) => state.setAvatar);
  const veganStatus = useStore((state) => state.veganStatus.status);

  // Avgör om användaren är vegan
  const isVegan = veganStatus === 'vegan';

  // Hämta rätt avatarer baserat på veganStatus och år
  const availableAvatars = isVegan 
    ? getAvailableAvatars(years, selectedStyle)
    : getSupporterAvatars();

  // Välj initial avatar, men bara en gång
  useEffect(() => {
    if (!initializedRef.current && availableAvatars.length > 0) {
      if (isVegan) {
        // För veganska användare, välj den senaste tillgängliga avataren baserat på år
        const latestAvatar = availableAvatars[availableAvatars.length - 1];
        setSelectedAvatar(latestAvatar);
      } else {
        // För supporter, välj första avataren
        setSelectedAvatar(availableAvatars[0]);
      }
      initializedRef.current = true;
    }
  }, [availableAvatars, isVegan]);

  const handleStyleChange = async (style: StyleType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyle(style);
    
    // När stilen ändras, uppdatera avataren baserat på den nya stilen och nuvarande år
    const newAvatars = getAvailableAvatars(years, style);
    if (newAvatars.length > 0) {
      setSelectedAvatar(newAvatars[newAvatars.length - 1]);
    }
  };

  const handleYearChange = (value: number) => {
    setYears(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // När års-slidern dras, uppdatera manuellt selectedAvatar
    if (isVegan) {
      const newAvatars = getAvailableAvatars(value, selectedStyle);
      if (newAvatars.length > 0) {
        // Välj den senaste avataren som är tillgänglig för detta årsantal
        const latestAvatar = newAvatars[newAvatars.length - 1];
        
        // Endast uppdatera om avataren faktiskt har ändrats
        if (!selectedAvatar || selectedAvatar.id !== latestAvatar.id) {
          setSelectedAvatar(latestAvatar);
        }
      }
    }
  };

  const handleSelectAvatar = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (!selectedAvatar && availableAvatars.length > 0) {
      setSelectedAvatar(availableAvatars[0]);
    }

    // Använd den valda avataren eller den första tillgängliga
    const avatar = selectedAvatar || (availableAvatars.length > 0 ? availableAvatars[0] : null);
    
    if (avatar) {
      // För veganska användare använder vi selectedStyle, för supporter används 'supporter'
      const avatarStyle = isVegan ? selectedStyle : 'supporter';
      
      await setVeganYears(isVegan ? years : 0);
      await setAvatar(avatarStyle, avatar.id);
      router.push('/(onboarding)/guide');
    }
  };

  // Anpassa UI-element baserat på veganStatus
  const headerText = isVegan ? "Hur länge har du varit vegan" : "Välj din karaktär";
  const yearsText = years === 0 
    ? "Nybliven vegan" 
    : years === 5 
      ? "5+ år" 
      : `${years} år`;

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Header - anpassad baserat på veganStatus */}
      <StyledView className="px-6 pt-14 mb-8">
        <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
          {headerText}
        </StyledText>
      </StyledView>

      {/* Style buttons - visas endast för veganer */}
      {isVegan && (
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
      )}

      {/* För icke-veganska användare visas avatarkarussellen */}
      {!isVegan && (
        <StyledView className="flex-1 mb-6">
          <AvatarCarousel 
            avatars={availableAvatars} 
            onSelectAvatar={handleSelectAvatar} 
            selectedAvatarId={selectedAvatar?.id || null}
          />
        </StyledView>
      )}

      {/* För veganska användare visas den valda avataren baserat på års-val */}
      {isVegan && selectedAvatar && (
        <StyledView className="items-center px-6">
          <StyledView className="w-52 h-52 bg-background-light/30 rounded-full justify-center items-center mb-8">
            <Avatar
              source={selectedAvatar.filename}
              size="large"
              style={selectedStyle}
            />
          </StyledView>

          <StyledText className="text-primary font-sans-bold text-2xl mb-3">
            {selectedAvatar.name}
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mb-8">
            {selectedAvatar.description}
          </StyledText>

          {/* Visa års-väljare för veganska användare */}
          <StyledText className="text-text-primary font-sans-bold text-2xl mb-6">
            {yearsText}
          </StyledText>

          <StyledView className="w-full mb-8">
            <Slider
              style={{ height: 36 }}
              minimumValue={0}
              maximumValue={5}
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