import { supabase } from '../supabase';

export interface UserProfile {
  id: string;
  email?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  avatar_url?: string;
  updated_at?: string;
  supporter_type?: string | null;
  is_read?: boolean;
  message?: string;
  // Andra relevanta fält kan läggas till här
}

export class SupabaseHelper {
  /**
   * Hämtar en användarprofil från databasen
   */
  static async getFullProfile(userId: string): Promise<UserProfile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }

      return data as UserProfile;
    } catch (error) {
      console.error('Error in getFullProfile:', error);
      return null;
    }
  }

  /**
   * Uppdaterar en användarprofil i databasen
   */
  static async updateProfile(profile: UserProfile) {
    try {
      const { error } = await supabase
        .from('profiles')
        .upsert(profile, { onConflict: 'id' });

      return { error };
    } catch (error) {
      console.error('Error in updateProfile:', error);
      return { error };
    }
  }

  /**
   * Hämtar notifikationer för en användare
   */
  static async getNotifications(userId: string) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      return { data, error };
    } catch (error) {
      console.error('Error in getNotifications:', error);
      return { data: null, error };
    }
  }
} 