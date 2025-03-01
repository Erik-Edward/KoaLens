// hooks/useUpdateUserProfile.ts - uppdaterad för att stödja avatar-uppdateringar
import { useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/lib/supabase';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice';

export const useUpdateUserProfile = () => {
  const { user } = useAuth();
  const avatarData = useStore(state => state.avatar);
  const veganStatus = useStore(state => state.veganStatus.status);
  
  const updateUserProfile = useCallback(async () => {
    if (!user) return false;
    
    try {
      // Uppdatera användarens metadata i Supabase
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_style: avatarData.style,
          avatar_id: avatarData.id,
          vegan_years: avatarData.veganYears,
          vegan_status: veganStatus
        }
      });
      
      if (error) {
        console.error('Error updating user profile:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception updating user profile:', error);
      return false;
    }
  }, [user, avatarData, veganStatus]);
  
  // Funktion för att bara uppdatera avataren
  const updateAvatar = useCallback(async (style: AvatarStyle, avatarId: string) => {
    if (!user) return false;
    
    try {
      // Uppdatera endast avatar-relaterad metadata
      const { error } = await supabase.auth.updateUser({
        data: {
          avatar_style: style,
          avatar_id: avatarId
        }
      });
      
      if (error) {
        console.error('Error updating avatar:', error);
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Exception updating avatar:', error);
      return false;
    }
  }, [user]);
  
  return { updateUserProfile, updateAvatar };
};