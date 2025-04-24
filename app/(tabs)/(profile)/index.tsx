import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, Alert, Modal, SafeAreaView, Pressable, ActivityIndicator, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/providers/AuthProvider';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { AvatarSelectorModal } from '@/components/AvatarSelectorModal';
import { Avatar } from '@/components/Avatar';
import { Ionicons } from '@expo/vector-icons';
import { UsageLimitIndicator } from '@/components/UsageLimitIndicator';
import { useUpdateUserProfile } from '@/hooks/useUpdateUserProfile';
import * as Haptics from 'expo-haptics';
// Import Clipboard safely
let Clipboard: { setStringAsync: (text: string) => Promise<boolean> };
try {
  Clipboard = require('expo-clipboard');
} catch (e) {
  // Fallback implementation if the module fails to load
  console.log('Using fallback clipboard implementation');
  Clipboard = {
    setStringAsync: async (text: string) => {
      console.log('Clipboard fallback: would copy', text);
      return true;
    }
  };
}
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert as CustomAlert } from '@/utils/alertUtils';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

const ProfileScreen = () => {
  const { user } = useAuth();
  const veganStatus = useStore(state => state.veganStatus.status);
  const setVeganStatus = useStore(state => state.setVeganStatus);
  const avatarStyle = useStore(state => state.avatar.style);
  const avatarId = useStore(state => state.avatar.id);
  const setAvatar = useStore(state => state.setAvatar);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [showVeganStatusModal, setShowVeganStatusModal] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [emailCopied, setEmailCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [localVeganStatus, setLocalVeganStatus] = useState<VeganStatus | null>(veganStatus);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [localAvatarId, setLocalAvatarId] = useState<string | null>(avatarId);
  const [localAvatarStyle, setLocalAvatarStyle] = useState<'cute' | 'cool' | 'supporter' | null>(avatarStyle as 'cute' | 'cool' | 'supporter' | null);
  const { updateAvatar, updateUserProfile, updateVeganStatus } = useUpdateUserProfile();
  const { width } = useWindowDimensions();

  // Calculate email font size based on length and screen width
  const getEmailFontSize = (email: string) => {
    if (!email) return 16; // Default size
    
    const availableWidth = width - 32; // Account for container padding
    
    // More dynamic calculation based on email length and screen width
    if (email.length > 35) return 13;
    if (email.length > 30) return 14;
    if (email.length > 25) return 15;
    return 16; // Default size for shorter emails
  };

  // Format email to show with ellipsis in the middle if too long
  const formatEmail = (email: string | undefined) => {
    if (!email) return '';
    
    // For very long emails, we'll truncate the middle
    if (email.length > 30) {
      const atIndex = email.indexOf('@');
      if (atIndex > 0) {
        // Split into local part and domain
        const localPart = email.substring(0, atIndex);
        const domain = email.substring(atIndex);
        
        // If local part is very long, truncate it
        if (localPart.length > 15) {
          return `${localPart.substring(0, 10)}...${domain}`;
        }
      }
    }
    
    return email;
  };

  // Update local state when store changes
  useEffect(() => {
    setLocalVeganStatus(veganStatus);
    console.log('ProfileScreen: Store vegan status changed to:', veganStatus);
  }, [veganStatus]);

  // Update local avatar state when store changes
  useEffect(() => {
    setLocalAvatarId(avatarId);
    setLocalAvatarStyle(avatarStyle as 'cute' | 'cool' | 'supporter' | null);
  }, [avatarId, avatarStyle]);

  const handleSignOut = async () => {
    CustomAlert.alert(
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
    console.log('ProfileScreen: Selecting avatar:', { filename, style });
    
    // Update local state immediately for UI
    setLocalAvatarId(filename);
    setLocalAvatarStyle(style);
    
    // Update store
    setAvatar(style, filename);
    
    // Close modal
    setShowAvatarModal(false);
    
    // Logga vad som skickas till hooken
    console.log(`ProfileScreen: Calling updateAvatar hook with style: ${style}, filename: ${filename}`);
    
    // Update in Supabase
    const success = await updateAvatar(style, filename);
    
    if (success) {
      console.log('ProfileScreen: Avatar successfully updated in Supabase');
      
      // Provide haptic feedback
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // Force a re-render to ensure UI is updated
      setTimeout(() => {
        console.log('ProfileScreen: Forcing refresh to show new avatar');
        setRefreshKey(prevKey => prevKey + 1);
      }, 100);
    } else {
      console.error('ProfileScreen: Failed to update avatar in Supabase');
    }
  };

  const handleVeganStatusPress = () => {
    setShowVeganStatusModal(true);
  };

  const handleSelectVeganStatus = async (status: VeganStatus) => {
    try {
      console.log('ProfileScreen: Updating vegan status to:', status);
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Set loading state
      setIsUpdatingStatus(true);
      
      // Save current status for comparison
      const oldStatus = localVeganStatus;
      
      // Immediately update local state for UI
      setLocalVeganStatus(status);
      
      // Update in store
      await setVeganStatus(status);
      console.log('ProfileScreen: Local store updated from', oldStatus, 'to', status);
      
      // Update in Supabase using the dedicated function
      console.log('ProfileScreen: Calling updateVeganStatus hook');
      const success = await updateVeganStatus(status);
      
      if (!success) {
        console.error('ProfileScreen: Error updating vegan status');
        throw new Error('Failed to update vegan status');
      }
      
      console.log('ProfileScreen: Vegan status successfully updated in Supabase');
      
      // Get fresh status from store to confirm it was updated
      const storeStatus = useStore.getState().veganStatus.status;
      console.log('ProfileScreen: Current store status after update:', storeStatus);
      
      // Force update local state again to ensure UI consistency
      setLocalVeganStatus(status);
      
      // Close modal
      setShowVeganStatusModal(false);
      
      // Force persistence to AsyncStorage
      try {
        // Give the store time to update AsyncStorage
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Force an immediate write of the current store to AsyncStorage
        const persistState = JSON.parse(JSON.stringify(useStore.getState()));
        await AsyncStorage.setItem('koalens-storage', JSON.stringify({
          state: { 
            ...persistState,
            veganStatus: { status }
          },
          version: 1
        }));
        
        console.log('ProfileScreen: Forced AsyncStorage update with status:', status);
      } catch (storageError) {
        console.error('ProfileScreen: Error writing to AsyncStorage:', storageError);
      }
      
      // Force a re-render to ensure UI is updated
      setTimeout(() => {
        console.log('ProfileScreen: Forcing refresh with status:', status);
        setRefreshKey(prevKey => prevKey + 1);
        setIsUpdatingStatus(false);
      }, 300);
    } catch (error) {
      console.error('ProfileScreen: Error updating vegan status:', error);
      setIsUpdatingStatus(false);
      CustomAlert.alert('Fel', 'Kunde inte uppdatera vegansk status. Försök igen senare.');
    }
  };

  const handleEmailPress = () => {
    setShowEmailModal(true);
  };

  const handleCopyEmail = async () => {
    if (user?.email) {
      try {
        const success = await Clipboard.setStringAsync(user.email);
        
        if (success) {
          // Show copied confirmation
          setEmailCopied(true);
          
          // Reset the copied state after 2 seconds
          setTimeout(() => {
            setEmailCopied(false);
          }, 2000);
          
          // Haptic feedback for confirmation
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          console.log('ProfileScreen: Unable to copy to clipboard');
        }
      } catch (error) {
        console.error('ProfileScreen: Error copying to clipboard:', error);
        CustomAlert.alert('Fel', 'Kunde inte kopiera e-postadressen. Försök igen senare.');
      }
    }
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main" key={refreshKey}>
      <StyledScrollView className="flex-1">
        {/* Header */}
        <StyledView className="px-4 pt-12 pb-6 items-center">
          <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
            Min Profil
          </StyledText>
        </StyledView>

        {/* Profile section with Avatar and Email - No box */}
        <StyledView className="items-center mb-8">
          <StyledPressable 
            onPress={handleAvatarPress}
            className="active:opacity-80"
          >
            <StyledView className="border-2 border-background-light/30 p-1 rounded-full shadow-sm">
              <Avatar
                source={localAvatarId || 'squirrel'}
                size="large" 
                style={localAvatarStyle || 'cute'}
              />
            </StyledView>
            <StyledText className="text-text-secondary font-sans text-sm mt-3 text-center">
              Tryck för att ändra avatar
            </StyledText>
          </StyledPressable>
          
          <StyledPressable 
            onPress={handleEmailPress}
            className="active:opacity-80 mt-5"
          >
            <StyledView className="bg-background-light/50 py-2.5 px-4 rounded-md flex-row items-center justify-center shadow-sm">
              <Ionicons name="mail-outline" size={16} color="#9ca3af" style={{ marginRight: 6 }} />
              <StyledText 
                className="text-text-primary font-sans-medium text-center" 
                numberOfLines={1}
                ellipsizeMode="middle"
                style={{ 
                  fontSize: user?.email ? getEmailFontSize(user.email) : 16,
                  maxWidth: width * 0.7 // Ensure text doesn't overflow container
                }}
              >
                {formatEmail(user?.email)}
              </StyledText>
              <Ionicons name="chevron-down-outline" size={14} color="#9ca3af" style={{ marginLeft: 4 }} />
            </StyledView>
          </StyledPressable>
        </StyledView>

        {/* Section Title */}
        <StyledView className="px-4 mb-3">
          <StyledText className="text-text-secondary font-sans-medium text-sm uppercase tracking-wider">
            Profil & Inställningar
          </StyledText>
        </StyledView>

        {/* Settings sections */}
        <StyledView className="px-4 space-y-3 mb-8">
          {/* Vegan Status - Interactive */}
          <StyledPressable 
            className="bg-background-light/30 p-4 rounded-lg active:opacity-80 shadow-sm"
            onPress={handleVeganStatusPress}
            disabled={isUpdatingStatus}
          >
            <StyledView className="flex-row justify-between items-center">
              <StyledView>
                <StyledText className="text-text-primary font-sans-medium text-lg mb-1">
                  Växtbaserad profil
                </StyledText>
                <StyledText className="text-text-secondary font-sans">
                  {isUpdatingStatus ? "Uppdaterar..." : 
                   localVeganStatus === 'vegan' ? 'Jag är vegan' : 
                   localVeganStatus === 'supporter' ? 'Jag utforskar växtbaserat' : 
                   'Inte angett'}
                </StyledText>
              </StyledView>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </StyledView>
          </StyledPressable>

          {/* Användningsstatus */}
          <StyledView className="bg-background-light/30 p-4 rounded-lg shadow-sm">
            <StyledText className="text-text-primary font-sans-medium text-lg mb-1">
              Månatliga analyser
            </StyledText>
            <UsageLimitIndicator />
          </StyledView>

          {/* Settings */}
          <StyledPressable 
            className="bg-background-light/30 p-4 rounded-lg active:opacity-80 flex-row justify-between items-center shadow-sm"
            onPress={() => router.push('/(tabs)/(profile)/settings')}
          >
            <StyledText className="text-text-primary font-sans-medium text-lg">
              Inställningar
            </StyledText>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </StyledPressable>

          {/* Sign Out Button */}
          <StyledPressable 
            className="bg-status-error/10 p-4 rounded-lg active:opacity-80 mt-6 shadow-sm"
            onPress={handleSignOut}
          >
            <StyledView className="flex-row justify-center items-center">
              <Ionicons name="log-out-outline" size={18} color="#ef4444" style={{ marginRight: 6 }} />
              <StyledText className="text-status-error font-sans-medium text-center">
                Logga ut
              </StyledText>
            </StyledView>
          </StyledPressable>
        </StyledView>
      </StyledScrollView>

      {/* Avatar Selector Modal */}
      <AvatarSelectorModal
        visible={showAvatarModal}
        onClose={() => setShowAvatarModal(false)}
        onSelectAvatar={handleSelectAvatar}
        currentAvatarId={localAvatarId || avatarId}
        currentAvatarStyle={localAvatarStyle || avatarStyle || 'cute'}
      />

      {/* Vegan Status Modal */}
      <Modal
        visible={showVeganStatusModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => !isUpdatingStatus && setShowVeganStatusModal(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/60">
          <StyledView className="bg-background-main w-11/12 max-w-md rounded-xl p-6">
            <StyledText className="text-text-primary font-sans-bold text-xl mb-4 text-center">
              Uppdatera din växtbaserade profil
            </StyledText>
            
            {/* Vegan Option */}
            <StyledPressable 
              className={`bg-background-light/30 p-4 rounded-lg mb-3 active:opacity-80 ${localVeganStatus === 'vegan' ? 'border border-primary' : ''}`}
              onPress={() => handleSelectVeganStatus('vegan')}
              disabled={isUpdatingStatus}
            >
              <StyledView className="flex-row items-center">
                <StyledView className="bg-primary/10 p-2 rounded-full mr-3">
                  <Ionicons name="leaf-outline" size={24} color="#ffd33d" />
                </StyledView>
                <StyledView className="flex-1">
                  <StyledText className="text-text-primary font-sans-medium text-base">
                    Jag är vegan
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-sm mt-1">
                    Du följer redan en vegansk livsstil och vill ha hjälp att identifiera veganska produkter
                  </StyledText>
                </StyledView>
                {localVeganStatus === 'vegan' && (
                  <Ionicons name="checkmark-circle" size={24} color="#ffd33d" />
                )}
              </StyledView>
            </StyledPressable>
            
            {/* Supporter Option */}
            <StyledPressable 
              className={`bg-background-light/30 p-4 rounded-lg mb-4 active:opacity-80 ${localVeganStatus === 'supporter' ? 'border border-primary' : ''}`}
              onPress={() => handleSelectVeganStatus('supporter')}
              disabled={isUpdatingStatus}
            >
              <StyledView className="flex-row items-center">
                <StyledView className="bg-primary/10 p-2 rounded-full mr-3">
                  <Ionicons name="search-outline" size={24} color="#ffd33d" />
                </StyledView>
                <StyledView className="flex-1">
                  <StyledText className="text-text-primary font-sans-medium text-base">
                    Jag utforskar växtbaserat
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-sm mt-1">
                    Du är nyfiken på växtbaserade alternativ eller vill lära dig mer om veganska produkter
                  </StyledText>
                </StyledView>
                {localVeganStatus === 'supporter' && (
                  <Ionicons name="checkmark-circle" size={24} color="#ffd33d" />
                )}
              </StyledView>
            </StyledPressable>
            
            {/* Cancel Button */}
            <StyledPressable 
              className="bg-background-light/50 p-3 rounded-lg active:opacity-80"
              onPress={() => !isUpdatingStatus && setShowVeganStatusModal(false)}
              disabled={isUpdatingStatus}
            >
              {isUpdatingStatus ? (
                <StyledView className="flex-row items-center justify-center">
                  <ActivityIndicator size="small" color="#ffd33d" style={{ marginRight: 8 }} />
                  <StyledText className="text-text-primary font-sans-medium">Uppdaterar...</StyledText>
                </StyledView>
              ) : (
                <StyledText className="text-text-primary font-sans-medium text-center">
                  Avbryt
                </StyledText>
              )}
            </StyledPressable>
          </StyledView>
        </StyledView>
      </Modal>

      {/* Email Modal */}
      <Modal
        visible={showEmailModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowEmailModal(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/60">
          <StyledView className="bg-background-main w-11/12 max-w-md rounded-xl p-6">
            <StyledText className="text-text-primary font-sans-bold text-xl mb-4 text-center">
              Din e-postadress
            </StyledText>
            
            <StyledView className="bg-background-light/30 p-4 rounded-lg mb-2">
              <StyledText 
                className="text-text-primary font-sans-medium text-center break-words" 
                selectable={true}
              >
                {user?.email}
              </StyledText>
            </StyledView>
            
            <StyledText className="text-text-secondary font-sans text-xs text-center mb-4">
              Håll på texten för att markera och kopiera manuellt
            </StyledText>
            
            {/* Copy Button */}
            <StyledPressable 
              className="bg-primary/20 p-3 rounded-lg active:opacity-80 mb-3"
              onPress={handleCopyEmail}
            >
              <StyledView className="flex-row items-center justify-center">
                <Ionicons 
                  name={emailCopied ? "checkmark-outline" : "copy-outline"} 
                  size={18} 
                  color="#ffd33d" 
                  style={{ marginRight: 8 }} 
                />
                <StyledText className="text-primary font-sans-medium text-center">
                  {emailCopied ? "Kopierad!" : "Kopiera e-postadress"}
                </StyledText>
              </StyledView>
            </StyledPressable>
            
            {/* Close Button */}
            <StyledPressable 
              className="bg-background-light/50 p-3 rounded-lg active:opacity-80"
              onPress={() => setShowEmailModal(false)}
            >
              <StyledText className="text-text-primary font-sans-medium text-center">
                Stäng
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
      </Modal>
    </StyledSafeAreaView>
  );
};

export default ProfileScreen;