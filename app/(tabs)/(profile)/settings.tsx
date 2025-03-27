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
  
  // Add state for language selection
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<'sv' | 'en' | 'auto'>('auto');
  
  // Add reference to analysis service
  const analysisService = new AnalysisService();

  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };
  
  // Load language preference
  useEffect(() => {
    const loadLanguagePreference = async () => {
      try {
        const savedLanguage = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
        if (savedLanguage && (savedLanguage === 'sv' || savedLanguage === 'en' || savedLanguage === 'auto')) {
          setSelectedLanguage(savedLanguage as 'sv' | 'en' | 'auto');
        }
      } catch (error) {
        console.error('Error loading language preference:', error);
      }
    };
    
    loadLanguagePreference();
  }, []);
  
  // Save language preference
  const handleLanguageChange = async (language: 'sv' | 'en' | 'auto') => {
    try {
      setSelectedLanguage(language);
      analysisService.setPreferredLanguage(language);
      await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, language);
      console.log('Saved language preference:', language);
      setShowLanguageModal(false);
    } catch (error) {
      console.error('Error saving language preference:', error);
    }
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

  // Language selection modal
  const renderLanguageModal = () => (
    <Modal
      visible={showLanguageModal}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowLanguageModal(false)}
    >
      <StyledPressable 
        className="flex-1 justify-center items-center bg-black/50"
        onPress={() => setShowLanguageModal(false)}
      >
        <StyledView 
          className="w-5/6 bg-background-main rounded-lg p-4 shadow-lg"
          onStartShouldSetResponder={() => true}
        >
          <StyledText className="text-text-primary font-sans-bold text-lg mb-4 text-center">
            Språk för analys
          </StyledText>
          
          <StyledPressable 
            className={`flex-row items-center p-3 mb-2 rounded-md ${selectedLanguage === 'auto' ? 'bg-primary-light' : 'bg-background-light'}`}
            onPress={() => handleLanguageChange('auto')}
          >
            <Ionicons name="globe-outline" size={24} color={selectedLanguage === 'auto' ? '#ffd33d' : '#6b7280'} />
            <StyledView className="ml-3">
              <StyledText className={`font-sans-medium ${selectedLanguage === 'auto' ? 'text-primary-main' : 'text-text-primary'}`}>
                Automatisk
              </StyledText>
              <StyledText className="text-text-secondary text-sm">
                Identifiera språket automatiskt
              </StyledText>
            </StyledView>
          </StyledPressable>
          
          <StyledPressable 
            className={`flex-row items-center p-3 mb-2 rounded-md ${selectedLanguage === 'sv' ? 'bg-primary-light' : 'bg-background-light'}`}
            onPress={() => handleLanguageChange('sv')}
          >
            <StyledText className="text-2xl">🇸🇪</StyledText>
            <StyledView className="ml-3">
              <StyledText className={`font-sans-medium ${selectedLanguage === 'sv' ? 'text-primary-main' : 'text-text-primary'}`}>
                Svenska
              </StyledText>
              <StyledText className="text-text-secondary text-sm">
                Analysera på svenska
              </StyledText>
            </StyledView>
          </StyledPressable>
          
          <StyledPressable 
            className={`flex-row items-center p-3 mb-2 rounded-md ${selectedLanguage === 'en' ? 'bg-primary-light' : 'bg-background-light'}`}
            onPress={() => handleLanguageChange('en')}
          >
            <StyledText className="text-2xl">🇬🇧</StyledText>
            <StyledView className="ml-3">
              <StyledText className={`font-sans-medium ${selectedLanguage === 'en' ? 'text-primary-main' : 'text-text-primary'}`}>
                Engelska
              </StyledText>
              <StyledText className="text-text-secondary text-sm">
                Analysera på engelska
              </StyledText>
            </StyledView>
          </StyledPressable>
          
          <StyledPressable 
            className="bg-background-light mt-2 p-3 rounded-md"
            onPress={() => setShowLanguageModal(false)}
          >
            <StyledText className="text-text-primary font-sans-medium text-center">
              Stäng
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledPressable>
    </Modal>
  );

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
        {/* Språkinställningar Sektion */}
        <StyledView className="px-4 pt-4 mb-6">
          <StyledView className="mb-3">
            <StyledText className="text-text-primary font-sans-semibold text-lg mb-2">
              Språkinställningar
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-sm">
              Välj vilket språk som ska användas för ingrediensanalys
            </StyledText>
          </StyledView>

          <StyledPressable 
            className="flex-row items-center justify-between bg-background-light/30 rounded-lg p-4 mt-2"
            onPress={() => setShowLanguageModal(true)}
          >
            <StyledView className="flex-row items-center">
              <Ionicons 
                name="language" 
                size={24} 
                color="#ffd33d" 
              />
              <StyledText className="text-text-primary font-sans-medium ml-3">
                Språk för analys
              </StyledText>
            </StyledView>
            <StyledView className="flex-row items-center">
              <StyledText className="text-text-secondary mr-2">
                {selectedLanguage === 'auto' ? 'Automatisk' : 
                 selectedLanguage === 'sv' ? 'Svenska' : 'Engelska'}
              </StyledText>
              <Ionicons 
                name="chevron-forward" 
                size={20} 
                color="#8A8A8A" 
              />
            </StyledView>
          </StyledPressable>
        </StyledView>

        {/* Bevakade Ingredienser Sektion */}
        <StyledView className="px-4 pt-0">
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

                {/* Expanderad beskrivning */}
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
      
      {/* Render language modal */}
      {renderLanguageModal()}
    </>
  );
} 