// Revidera components/UserProfileSync.tsx

import React, { useEffect, useState } from 'react';
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
  
  useEffect(() => {
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
          setSyncing(true);
          
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
          
          // Synkronisera tillbaka till Supabase om lokal data är annorlunda
          if (!metadata.avatar_id && avatarId) {
            await supabase.auth.updateUser({
              data: {
                avatar_style: store.avatar.style,
                avatar_id: avatarId,
                vegan_years: store.avatar.veganYears,
                vegan_status: veganStatus
              }
            });
          }
          
          // Tillåt lite tid för animationen att visas
          setTimeout(() => {
            setSyncing(false);
          }, 1000);
        }
      } catch (error) {
        console.error('Error syncing user profile:', error);
        setSyncing(false);
      }
    };
    
    syncUserProfile();
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