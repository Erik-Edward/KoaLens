// app/(onboarding)/vegan-status.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { router } from 'expo-router';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

const OPTIONS: Array<{
    id: string;
    title: string;
    description: string;
    icon: string;
    value: VeganStatus;
  }> = [
    {
      id: 'vegan',
      title: 'Jag är vegan',
      description: 'Du följer redan en vegansk livsstil och vill ha hjälp att identifiera veganska produkter',
      icon: 'leaf-outline',
      value: 'vegan'
    },
    {
      id: 'supporter',
      title: 'Jag utforskar växtbaserat',
      description: 'Du är nyfiken på växtbaserade alternativ eller vill lära dig mer om veganska produkter',
      icon: 'search-outline',
      value: 'supporter'
    }
  ];

export default function VeganStatusScreen() {
  const setVeganStatus = useStore((state) => state.setVeganStatus);

  const handleOptionSelect = async (value: VeganStatus) => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setVeganStatus(value);
    router.push('/(onboarding)/avatar');
  };

  const renderOption = (option: typeof OPTIONS[0]) => (
    <StyledPressable
      key={option.id}
      onPress={() => handleOptionSelect(option.value)}
      className="bg-background-light/30 rounded-xl active:opacity-80 overflow-hidden"
      style={({ pressed }) => ({
        transform: [{ scale: pressed ? 0.98 : 1 }],
      })}
    >
      {/* Bakgrund med subtil gradient */}
      <StyledView className="absolute inset-0 bg-gradient-to-b from-background-light/10 to-transparent" />
      
      {/* Innehåll */}
      <StyledView className="p-6">
        <StyledView className="flex-row items-center mb-3">
          <StyledView className="bg-primary/10 p-2 rounded-lg mr-4">
            <Ionicons 
              name={option.icon as any} 
              size={28}
              color="#ffd33d"
            />
          </StyledView>
          <StyledText className="text-text-primary font-sans-bold text-xl flex-1">
            {option.title}
          </StyledText>
        </StyledView>
        <StyledText className="text-text-secondary font-sans text-base pl-14 leading-relaxed">
          {option.description}
        </StyledText>
      </StyledView>
    </StyledPressable>
  );

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Header */}
      <StyledView className="px-6 pt-16 mb-12">
        <StyledText className="text-text-primary font-sans-bold text-3xl text-center mb-3">
          Välkommen till KoaLens
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-lg text-center">
          Välj det alternativ som passar dig bäst
        </StyledText>
      </StyledView>

      {/* Options */}
      <StyledView className="px-6 flex-1">
        <StyledView className="space-y-6">
          {OPTIONS.map(renderOption)}
        </StyledView>
      </StyledView>

      {/* Bottom text */}
      <StyledView className="px-6 pb-8 mt-auto">
        <StyledText className="text-text-secondary/70 font-sans text-sm text-center">
          Du kan alltid ändra detta val senare i inställningarna
        </StyledText>
      </StyledView>
    </StyledView>
  );
}