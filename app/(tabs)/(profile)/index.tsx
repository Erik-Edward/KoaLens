import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView, ScrollView, Platform, Alert } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { router } from 'expo-router';
import * as Device from 'expo-device';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AvatarSelectorModal } from '@/components/AvatarSelectorModal';
import { Avatar } from '@/components/Avatar';
import { useUpdateUserProfile } from '@/hooks/useUpdateUserProfile';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

export default function ProfileScreen() {
  const { user } = useAuth();
  const veganStatus = useStore(useShallow(state => state.veganStatus.status));
  const avatarStyle = useStore(state => state.avatar.style);
  const avatarId = useStore(state => state.avatar.id);
  const setAvatar = useStore(state => state.setAvatar);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const { updateAvatar } = useUpdateUserProfile();

  const handleSignOut = async () => {
    Alert.alert(
      'Logga ut',
      'Är du säker på att du vill logga ut?',
      [
        {
          text: 'Avbryt',
          style: 'cancel'
        },
        {
          text: 'Logga ut',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.auth.signOut();
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error signing out:', error);
            }
          }
        }
      ]
    );
  };

  const handleAvatarPress = () => {
    setShowAvatarModal(true);
  };

  const handleSelectAvatar = async (filename: string, style: 'cute' | 'cool' | 'supporter') => {
    console.log('Selecting avatar:', { filename, style });
    
    // Update local state
    setAvatar(style, filename);
    
    // Update in Supabase
    await updateAvatar(style, filename);
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StyledScrollView className="flex-1">
        {/* Header */}
        <StyledView className="px-4 pt-16 pb-6">
          <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
            Min Profil
          </StyledText>
        </StyledView>

        {/* Profile Info */}
        <StyledView className="px-4 mb-6 space-y-4">
          {/* User Info with Avatar */}
          <StyledView className="bg-background-light/30 p-4 rounded-lg">
            <StyledPressable 
              onPress={handleAvatarPress}
              className="items-center mb-4"
            >
              <Avatar
                source={avatarId || 'squirrel'}
                size="medium"
                style={avatarStyle || 'cute'}
              />
              <StyledText className="text-text-secondary font-sans text-sm mt-2">
                Tryck för att ändra avatar
              </StyledText>
            </StyledPressable>
            <StyledText className="text-text-primary font-sans-medium text-lg text-center">
              {user?.email}
            </StyledText>
          </StyledView>

          {/* Vegan Status */}
          <StyledView className="bg-background-light/30 p-4 rounded-lg">
            <StyledText className="text-text-primary font-sans-medium text-lg mb-2">
              Vegansk Status
            </StyledText>
            <StyledText className="text-text-secondary font-sans">
              {veganStatus === 'vegan' ? 'Vegan' : 
               veganStatus === 'supporter' ? 'Intresserad av veganism' : 
               'Inte angett'}
            </StyledText>
          </StyledView>
        </StyledView>

        {/* Menu Items */}
        <StyledView className="px-4 space-y-3">
          {/* Settings */}
          <StyledPressable 
            onPress={() => router.push('/(tabs)/(profile)/settings')}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          >
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Inställningar
            </StyledText>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>

          {/* Support */}
          <StyledPressable 
            onPress={() => router.push('/(tabs)/(profile)/support')}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          >
            <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Support
            </StyledText>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>

          {/* Sign Out Button */}
          <StyledPressable 
            onPress={handleSignOut}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          >
            <Ionicons name="log-out-outline" size={24} color="#ff4444" />
            <StyledText className="text-status-error font-sans-medium text-lg ml-3">
              Logga ut
            </StyledText>
          </StyledPressable>
        </StyledView>

        {/* Version Info */}
        <StyledView className="items-center mt-8 mb-6">
          <StyledText className="text-text-secondary/60 font-sans text-sm">
            KoaLens v{process.env.EXPO_PUBLIC_VERSION || '1.0.0'}
          </StyledText>
        </StyledView>

        {/* Avatar Selector Modal */}
        <AvatarSelectorModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelectAvatar={handleSelectAvatar}
          currentAvatarId={avatarId}
          currentAvatarStyle={avatarStyle || 'cute'}
        />
      </StyledScrollView>
    </StyledSafeAreaView>
  );
} 