import React, { useState, useEffect } from 'react';
import { View, Text, Switch, ScrollView, Pressable, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { useHydration } from '@/hooks/useHydration';
import theme from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisService } from '@/services/analysisService';

// Language preference storage key
const LANGUAGE_STORAGE_KEY = 'KOALENS_LANGUAGE_PREFERENCE';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);

export default function SettingsScreen() {
  const hydrated = useHydration();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const watchedIngredients = useStore(useShallow(state => 
    state.preferences?.watchedIngredients || {}
  ));
  
  const toggleWatchedIngredient = useStore(state => state.toggleWatchedIngredient);
  
  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  if (!hydrated) {
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center">
        <StyledText className="text-text-secondary font-sans">
          Laddar inställningar...
        </StyledText>
      </StyledView>
    );
  }

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Inställningar",
          headerStyle: {
            backgroundColor: theme.colors.background.dark,
          },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <StyledScrollView className="flex-1 bg-background-main">
        {/* Bevakade Ingredienser Sektion */}
        <StyledView className="px-4 pt-4">
          <StyledView className="mb-3">
            <StyledText className="text-text-primary font-sans-semibold text-lg mb-2">
              Bevakade ingredienser
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-sm">
              Markera ingredienser du vill hålla extra koll på i dina analyser
            </StyledText>
          </StyledView>

          {/* Lista över bevakade ingredienser */}
          <StyledView className="space-y-3">
            {Object.entries(watchedIngredients).map(([key, ingredient]) => (
              <StyledView 
                key={key} 
                className="bg-background-light/30 rounded-lg p-4"
              >
                <StyledView className="flex-row items-center justify-between">
                  <StyledView className="flex-1">
                    <StyledText className="text-text-primary font-sans-medium capitalize">
                      {ingredient.name}
                    </StyledText>
                  </StyledView>
                  
                  {/* Kontroller */}
                  <StyledView className="flex-row items-center space-x-3">
                    <Switch
                      value={ingredient.enabled}
                      onValueChange={() => toggleWatchedIngredient(key)}
                      trackColor={{ false: '#3a3f44', true: '#ffd33d' }}
                      thumbColor={ingredient.enabled ? '#ffffff' : '#cccccc'}
                    />
                    <StyledText 
                      onPress={() => handleExpand(key)}
                      className="text-primary text-sm"
                    >
                      {expandedId === key ? 'Dölj info' : 'Visa info'}
                    </StyledText>
                  </StyledView>
                </StyledView>
                
                {/* Visa detaljerad information när expanderad */}
                {expandedId === key && (
                  <StyledView className="mt-3 bg-background-light/20 rounded p-3">
                    <StyledText className="text-text-secondary font-sans text-sm">
                      {ingredient.description}
                    </StyledText>
                  </StyledView>
                )}
              </StyledView>
            ))}
          </StyledView>

          {/* Informationsruta */}
          <StyledView className="mt-6 bg-background-light/20 rounded-lg p-4 mb-4">
            <StyledView className="flex-row space-x-3">
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color="#9ca3af" 
              />
              <StyledText className="text-text-secondary font-sans text-sm flex-1">
                Markerade ingredienser visas i analysresultatet för din kännedom. 
                Detta påverkar inte det övergripande resultatet om produkten är 
                vegansk eller inte.
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </>
  );
} 