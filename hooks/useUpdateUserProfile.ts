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
  
  return { updateUserProfile };
};