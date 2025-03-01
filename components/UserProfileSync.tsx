// components/UserProfileSync.tsx
import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '@/providers/AuthProvider';

const StyledView = styled(View);
const StyledText = styled(Text);

// Nyckel för att spåra om det är användarens första inloggning
const FIRST_LOGIN_KEY = 'KOALENS_FIRST_LOGIN_COMPLETE';

export const UserProfileSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const [isFirstLogin, setIsFirstLogin] = useState(false);
  const avatarId = useStore(state => state.avatar.id);
  const veganStatus = useStore(state => state.veganStatus.status);
  const syncAttemptedRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Hämta användarinformation från AuthProvider
  const { user, session } = useAuth();
  
  // Viktigt: Kontrollera om användaren är inloggad och om det är första inloggningen
  // Men endast när sessionen faktiskt finns och har ändrats
  useEffect(() => {
    // Endast fortsätt om vi har en aktiv session
    if (!session || !user) {
      // Ingen session, ingen synkronisering behövs
      syncAttemptedRef.current = false; // Återställ för att tillåta synkronisering när session finns
      setSyncing(false); // Se till att laddningsskärmen är dold
      return;
    }
    
    const checkFirstLogin = async () => {
      try {
        // Kontrollera om användaren har en last_sign_in_at (vilket indikerar tidigare inloggning)
        // och om vi redan har markerat denna användare som "inte första inloggning"
        const userKey = `${FIRST_LOGIN_KEY}_${user.id}`;
        const firstLoginComplete = await AsyncStorage.getItem(userKey);
        
        // Om det är användarens första inloggning (ingen previous sign-in timestamp)
        // eller om vi inte har markerat denna användare som klar med första inloggningen
        if (!firstLoginComplete) {
          console.log('UserProfileSync: Första inloggning detekterad för användare', user.id);
          setIsFirstLogin(true);
          
          // Visa en kort laddningsskärm för att förhindra blinkningar
          setSyncing(true);
          
          // Markera första inloggningen som slutförd för denna användare
          await AsyncStorage.setItem(userKey, 'true');
          
          // Efter en kort stund, återställ flaggan och dölj laddningsskärmen
          setTimeout(() => {
            setIsFirstLogin(false);
            setSyncing(false);
          }, 1500);
        }
      } catch (error) {
        console.error('Error checking first login status:', error);
        setSyncing(false);
      }
    };
    
    // Endast kontrollera om det är första inloggningen om
    // vi inte redan har försökt synkronisera för denna session
    if (!syncAttemptedRef.current) {
      console.log('UserProfileSync: Kontrollerar första inloggning för användare', user?.id);
      checkFirstLogin();
      syncAttemptedRef.current = true;
    }
  }, [session, user]); // Kör endast när session eller user ändras
  
  // Separat useEffect för att hantera synkronisering av profildata
  useEffect(() => {
    // Endast fortsätt om det finns en användare
    if (!user) return;
    
    const syncUserProfile = async () => {
      try {
        const userData = user;
        const metadata = userData.user_metadata;
        const store = useStore.getState();
        
        // Kontrollera om det finns metadata att synkronisera
        if (metadata && (
          (metadata.avatar_id && metadata.avatar_id !== avatarId) || 
          (metadata.vegan_status && metadata.vegan_status !== veganStatus)
        )) {
          console.log('UserProfileSync: Synkroniserar användarprofil från metadata');
          
          // Uppdatera avatar-information
          if (metadata.avatar_style && metadata.avatar_id) {
            await store.setAvatar(
              metadata.avatar_style as AvatarStyle, 
              metadata.avatar_id as string
            );
            
            if (typeof metadata.vegan_years === 'number') {
              await store.setVeganYears(metadata.vegan_years);
            }
          }
          
          // Uppdatera vegan-status
          if (metadata.vegan_status) {
            await store.setVeganStatus(metadata.vegan_status as VeganStatus);
          }
          
          console.log('UserProfileSync: Synkronisering slutförd');
        }
      } catch (error) {
        console.error('Error syncing user profile:', error);
      }
    };
    
    syncUserProfile();
  }, [user, avatarId, veganStatus]); // Kör när användardata eller lokal profildata ändras
  
  // Om inte synkroniserar, visa inget
  if (!syncing) return null;
  
  return (
    <StyledView className="absolute inset-0 bg-background-main z-50 flex items-center justify-center">
      <ActivityIndicator size="large" color="#ffd33d" />
      <StyledText className="text-text-primary font-sans text-lg mt-4">
        {isFirstLogin 
          ? 'Förbereder din profil...' 
          : 'Synkroniserar din profil...'}
      </StyledText>
    </StyledView>
  );
};