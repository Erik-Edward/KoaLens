// Ny fil: app/(tabs)/(profile)/advanced.tsx

import React, { useState } from 'react';
import { View, Text, Pressable, Alert, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import theme from '@/constants/theme';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);

export default function AdvancedScreen() {
  const [syncing, setSyncing] = useState(false);
  
  const handleSyncProfile = async () => {
    try {
      setSyncing(true);
      // Simulera en synkronisering
      await new Promise(resolve => setTimeout(resolve, 1500));
      Alert.alert('Synkronisering slutförd', 'Din profildata har synkroniserats.');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Fel', 'Ett oväntat fel inträffade. Försök igen senare.');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Avancerade inställningar",
          headerStyle: {
            backgroundColor: theme.colors.background.dark,
          },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      <StyledScrollView className="flex-1 bg-background-main">
        <StyledView className="p-4">
          {/* Informationssektion */}
          <StyledView className="mb-6 bg-background-light/30 p-4 rounded-lg">
            <StyledText className="text-text-primary font-sans-medium text-lg mb-2">
              Datasynkronisering
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-sm mb-4">
              I denna sektion hittar du funktioner för att synkronisera din profildata. 
              Dessa funktioner behövs normalt endast om du upplever problem med att dina 
              profilinställningar inte sparas korrekt.
            </StyledText>
            <StyledView className="flex-row items-center p-2 bg-background-light/20 rounded">
              <Ionicons name="information-circle-outline" size={20} color="#ffd33d" />
              <StyledText className="text-primary font-sans text-sm ml-2">
                Använd dessa funktioner endast vid behov
              </StyledText>
            </StyledView>
          </StyledView>

          {/* Synkroniseringsknapp */}
          <StyledView className="bg-background-light/30 p-4 rounded-lg mb-4">
            <StyledText className="text-text-primary font-sans-medium mb-2">
              Synkronisera profildata
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-sm mb-4">
              Tvingar en synkronisering av din profil mellan appen och servern. 
              Använd denna funktion om du märker att dina profilinställningar 
              inte visas korrekt.
            </StyledText>
            <StyledPressable
              onPress={handleSyncProfile}
              disabled={syncing}
              className={`p-3 rounded-lg flex-row justify-center items-center ${
                syncing ? 'bg-background-light/20' : 'bg-primary/80'
              }`}
            >
              <Ionicons 
                name={syncing ? "sync" : "sync-outline"} 
                size={20} 
                color={syncing ? "#cccccc" : "#000000"}
              />
              <StyledText className={`font-sans-medium ml-2 ${
                syncing ? 'text-text-secondary' : 'text-text-inverse'
              }`}>
                {syncing ? 'Synkroniserar...' : 'Synkronisera nu'}
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </>
  );
}