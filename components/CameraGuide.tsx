// components/CameraGuide.tsx
import React from 'react';
import { View, Text, Pressable } from 'react-native';
import { styled } from 'nativewind';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Svg, Path, Circle, G } from 'react-native-svg';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

interface CameraGuideProps {
  onClose: () => void;
  isTransparent?: boolean;
}

const GUIDE_KEY = 'KOALENS_CAMERA_GUIDE_SHOWN';

// SVG-komponenter
const CornerArrow = () => (
  <Svg width="64" height="64" viewBox="0 0 64 64">
    <Path 
      d="M52 12L12 52" 
      stroke="#FFD33D" 
      strokeWidth="4" 
      strokeLinecap="round"
    />
    <Path 
      d="M52 32V12H32" 
      stroke="#FFD33D" 
      strokeWidth="4" 
      fill="none" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Circle 
      cx="52"
      cy="12"
      r="6"
      fill="#FFD33D"
      opacity="0.5"
    />
  </Svg>
);

const ZoomArrows = () => (
  <Svg width="64" height="64" viewBox="0 0 64 64">
    <G transform="translate(32, 32)">
      <Path 
        d="M-16 -16L-8 -8" 
        stroke="#FFD33D" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <Path 
        d="M-16 -8L-16 -16L-8 -16" 
        stroke="#FFD33D" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
      <Path 
        d="M16 16L8 8" 
        stroke="#FFD33D" 
        strokeWidth="4" 
        strokeLinecap="round"
      />
      <Path 
        d="M16 8L16 16L8 16" 
        stroke="#FFD33D" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        fill="none"
      />
    </G>
    <Circle 
      cx="32"
      cy="32"
      r="4"
      fill="#FFD33D"
      opacity="0.5"
    />
  </Svg>
);

export const CameraGuide: React.FC<CameraGuideProps> = ({ 
  onClose, 
  isTransparent = true 
}) => {
  const handleClose = async () => {
    try {
      await AsyncStorage.setItem(GUIDE_KEY, 'true');
      onClose();
    } catch (error) {
      console.error('Error saving guide state:', error);
      onClose();
    }
  };

  return (
    <StyledView className={`absolute inset-0 ${
      isTransparent ? 'bg-black/90' : 'bg-background-main'
    } z-50`}>
      <StyledView className="flex-1 items-center px-6 pt-32">
        {/* Guide illustration */}
        <StyledView className="w-64 h-64 mb-8 relative">
          <StyledView className="border-2 border-primary w-full h-full rounded-lg">
            {/* Pilar för hörnjustering */}
            <StyledView className="absolute -top-6 -right-6">
              <CornerArrow />
            </StyledView>
            {/* Pil för zoom */}
            <StyledView className="absolute -left-16 top-1/2 -translate-y-1/2">
              <ZoomArrows />
            </StyledView>
          </StyledView>
        </StyledView>

        {/* Instruktionstexter */}
        <StyledText className="text-text-primary font-sans-bold text-xl text-center mb-4">
          Så här redigerar du bilden
        </StyledText>
        <StyledView className="space-y-4 mb-8">
          <StyledView className="flex-row items-start">
            <StyledText className="text-text-primary font-sans-medium text-base">
              1. Ta en bild på hela ingredienslistan
            </StyledText>
          </StyledView>
          <StyledView className="flex-row items-start">
            <StyledText className="text-text-primary font-sans-medium text-base">
              2. Dra i hörnen för att justera storleken på rutan
            </StyledText>
          </StyledView>
          <StyledView className="flex-row items-start">
            <StyledText className="text-text-primary font-sans-medium text-base">
              3. Nyp utanför rutan för att zooma bilden
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Knapp för att stänga guiden */}
        <StyledPressable
          onPress={handleClose}
          className="bg-primary px-8 py-3 rounded-lg active:opacity-80"
        >
          <StyledText className="text-text-inverse font-sans-medium text-center">
            Jag förstår
          </StyledText>
        </StyledPressable>
      </StyledView>
    </StyledView>
  );
};