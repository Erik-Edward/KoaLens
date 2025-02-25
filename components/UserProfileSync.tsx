// components/UserProfileSync.tsx - Uppdaterad för att respektera avatar_update

import React, { useEffect, useState, useRef } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';
import { useStore } from '@/stores/useStore';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';

const StyledView = styled(View);
const StyledText = styled(Text);

export const UserProfileSync: React.FC = () => {
  const [syncing, setSyncing] = useState(false);
  const avatarId = useStore(state => state.avatar.id);
  const veganStatus = useStore(state => state.veganStatus.status);
  const syncAttemptedRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    // Endast synkronisera om vi inte har försökt redan
    if (syncAttemptedRef.current) return;
    
    const syncUserProfile = async () => {
      try {
        // Hämta användardata direkt från Supabase
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error || !user) {
          console.log('No user to sync profile for');
          return;
        }
        
        const metadata = user.user_metadata;
        const store = useStore.getState();
        
        // Kontrollera om det finns metadata att synkronisera
        if (metadata && (
          (metadata.avatar_id && metadata.avatar_id !== avatarId) || 
          (metadata.vegan_status && metadata.vegan_status !== veganStatus)
        )) {
          console.log('Syncing user profile from Supabase metadata');
          
          // Sätt en kort fördröjning innan vi visar laddningsskärmen
          // för att undvika snabba blinkningar vid korta operationer
          syncTimeoutRef.current = setTimeout(() => {
            setSyncing(true);
          }, 300);
          
          // Kontrollera om detta är en avataruppdatering och undvik att navigera
          const isAvatarUpdate = metadata.avatar_update === true;
          console.log('UserProfileSync: Är detta en avataruppdatering?', isAvatarUpdate);
          
          // Uppdatera avatar-information
          if (metadata.avatar_style && metadata.avatar_id) {
            console.log('UserProfileSync: Synkroniserar avatar från Supabase metadata:', {
              style: metadata.avatar_style,
              id: metadata.avatar_id,
              isAvatarUpdate
            });
            
            // Uppdatera lokalt utan att utlösa en ny uppdatering till Supabase
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
          
          // Synkronisera tillbaka till Supabase om lokal data är annorlunda
          // Viktigt: Vi bör endast göra detta om det INTE är en avataruppdatering
          if (!metadata.avatar_id && avatarId && !isAvatarUpdate) {
            await supabase.auth.updateUser({
              data: {
                avatar_style: store.avatar.style,
                avatar_id: avatarId,
                vegan_years: store.avatar.veganYears,
                vegan_status: veganStatus
              }
            });
          }
          
          // Om det är en avataruppdatering, aktivera navigationsspärren för säkerhets skull
          if (isAvatarUpdate) {
            console.log('UserProfileSync: Aktiverar navigationsspärr p.g.a. avataruppdatering');
            global.isBlockingNavigation = true;
            
            // Inaktivera navigationsspärren efter en kort stund
            setTimeout(() => {
              console.log('UserProfileSync: Inaktiverar navigationsspärr efter timeout');
              global.isBlockingNavigation = false;
            }, 3000);
          }
          
          // Avbryt timeout om vi hann bli färdiga innan den triggats
          if (syncTimeoutRef.current) {
            clearTimeout(syncTimeoutRef.current);
            syncTimeoutRef.current = null;
          }
          
          // Stäng laddningsindikatorn efter en kort fördröjning för att undvika ryckig UI
          setTimeout(() => {
            setSyncing(false);
          }, 500);
        }
        
        // Markera att vi har försökt synkronisera
        syncAttemptedRef.current = true;
      } catch (error) {
        console.error('Error syncing user profile:', error);
        setSyncing(false);
      }
    };
    
    syncUserProfile();
    
    return () => {
      // Rensa timeout om komponenten unmountas
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, [avatarId, veganStatus]);
  
  if (!syncing) return null;
  
  return (
    <StyledView className="absolute inset-0 bg-background-main/90 z-50 flex items-center justify-center">
      <ActivityIndicator size="large" color="#ffd33d" />
      <StyledText className="text-text-primary font-sans text-lg mt-4">
        Synkroniserar din profil...
      </StyledText>
    </StyledView>
  );
};