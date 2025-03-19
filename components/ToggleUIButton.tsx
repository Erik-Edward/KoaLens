/**
 * Komponent för att växla mellan gamla och nya UI-versioner
 * Används för att enkelt navigera mellan olika versioner av samma vy
 */

import React from 'react';
import { Pressable, Text, View } from 'react-native';
import { styled } from 'nativewind';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

// Styled components
const StyledPressable = styled(Pressable);
const StyledText = styled(Text);
const StyledView = styled(View);

export interface ToggleUIButtonProps {
  currentPath: string;
  newPath: string;
  oldPath?: string;
  label?: string;
  useToast?: boolean;
  position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Komponent för att växla mellan gamla och nya UI-versioner
 */
export default function ToggleUIButton({
  currentPath,
  newPath,
  oldPath,
  label = 'Växla UI',
  useToast = false,
  position = 'bottom-right'
}: ToggleUIButtonProps) {
  // Bestäm om vi är i nya eller gamla UI:t
  const isNewUI = currentPath === newPath;
  
  // Bestäm vilket path vi ska navigera till
  const targetPath = isNewUI 
    ? (oldPath || currentPath.replace('-new', ''))
    : newPath;
  
  // Bestäm positionering
  const positionClass = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'bottom-left': 'bottom-20 left-4',
    'bottom-right': 'bottom-20 right-4'
  }[position];
  
  // Hantera klick
  const handlePress = () => {
    router.push(targetPath as any);
  };
  
  // Visa som toast på botten
  if (useToast) {
    return (
      <StyledPressable
        onPress={handlePress}
        className={`bg-black/70 px-4 py-2 rounded-full absolute z-50 flex-row items-center ${positionClass}`}
      >
        <Ionicons 
          name={isNewUI ? 'arrow-back-outline' : 'arrow-forward-outline'} 
          size={16} 
          color="white" 
        />
        <StyledText className="text-white text-xs ml-2">
          {isNewUI ? 'Gamla UI:t' : 'Nya UI:t'}
        </StyledText>
      </StyledPressable>
    );
  }
  
  // Visa som knapp
  return (
    <StyledPressable
      onPress={handlePress}
      className={`bg-primary/10 px-3 py-1 rounded-md flex-row items-center absolute z-50 ${positionClass}`}
    >
      <Ionicons
        name={isNewUI ? 'arrow-back-outline' : 'arrow-forward-outline'}
        size={14}
        color="#6366f1"
      />
      <StyledText className="text-primary text-xs ml-1">
        {label}
      </StyledText>
    </StyledPressable>
  );
} 