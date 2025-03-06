import { Platform } from 'react-native';
import { logEvent } from './analyticsWrapper';
import { supabase } from './supabase';
import Constants from 'expo-constants';
import { useAuth } from '@/providers/AuthProvider';

interface FeedbackOptions {
  type: 'suggestion' | 'issue' | 'praise';
  message: string;
  email?: string;
}

class FeedbackWrapper {
  private static instance: FeedbackWrapper;
  private isDummy: boolean = false;

  private constructor() {
    // Check if we're in Expo Go or have limited functionality
    this.isDummy = Platform.OS === 'web' || __DEV__;
    console.log(`[Feedback ${this.isDummy ? 'Dummy' : ''}] Initialized`);
  }

  public static getInstance(): FeedbackWrapper {
    if (!FeedbackWrapper.instance) {
      FeedbackWrapper.instance = new FeedbackWrapper();
    }
    return FeedbackWrapper.instance;
  }

  async submitFeedback(options: FeedbackOptions): Promise<boolean> {
    try {
      // Log the feedback event
      logEvent('submit_feedback', {
        type: options.type,
        platform: Platform.OS,
        isDevelopment: __DEV__
      });

      if (this.isDummy) {
        console.log('[Feedback Dummy] Feedback submitted:', options);
        return true;
      }

      // Get the current user session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) {
        console.error('[Feedback] Session error:', sessionError);
        return false;
      }

      // Insert feedback into Supabase
      const { data, error } = await supabase
        .from('app_feedback')
        .insert([
          {
            user_id: session?.user?.id || null,
            feedback_type: options.type,
            message: options.message,
            email: options.email || session?.user?.email || null,
            app_version: Constants.expoConfig?.version || 'unknown',
            platform: Platform.OS,
            platform_version: Platform.Version,
            device_type: Platform.OS === 'ios' ? 'iOS' : 'Android'
          }
        ]);

      if (error) {
        console.error('[Feedback] Supabase error:', error);
        return false;
      }

      console.log('[Feedback] Successfully submitted to Supabase:', data);
      return true;
    } catch (error) {
      console.error('[Feedback] Error submitting feedback:', error);
      return false;
    }
  }
}

export const feedback = FeedbackWrapper.getInstance(); 