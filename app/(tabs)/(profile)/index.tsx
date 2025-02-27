// app/(tabs)/(profile)/index.tsx - med support-funktioner och scroll
import { FC, useState, useEffect } from 'react';
import { ScrollView, View, Text, Pressable, Alert, Linking, Platform } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import { Avatar } from '@/components/Avatar';
import { AvatarSelectorModal } from '@/components/AvatarSelectorModal';
import { FeedbackModal } from '@/components/FeedbackModal';
import { HelpSectionModal } from '@/components/HelpSectionModal';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { captureException, captureMessage, Severity, addBreadcrumb } from '@/lib/sentry';
import { logEvent } from '@/lib/analytics';
import Constants from 'expo-constants';

if (typeof global.isBlockingNavigation === 'undefined') {
  global.isBlockingNavigation = false;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

import { SUPPORT_EMAIL } from '@/constants/config';
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

const ProfileScreen: FC = () => {
  const { user, signOut } = useAuth();
  const avatar = useStore(state => state.avatar);
  const veganStatus = useStore(state => state.veganStatus.status);
  const setAvatar = useStore(state => state.setAvatar);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const [updating, setUpdating] = useState(false);
  
  // Återställ navigationsspärren när komponenten monteras och demonteras
  useEffect(() => {
    global.isBlockingNavigation = false;
    return () => {
      global.isBlockingNavigation = false;
    };
  }, []);
  
  const handleSettingsPress = () => {
    router.push('./settings');
  };

  const handleOfflineTestPress = () => {
    router.push('./offline-test');
  };

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
              await signOut();
            } catch (error) {
              console.error('Utloggningsfel:', error);
              Alert.alert('Fel', 'Kunde inte logga ut. Försök igen.');
            }
          }
        }
      ]
    );
  };

  // Uppdaterad funktion för att testa Sentry
  const testSentry = () => {
    try {
      console.log('Starting Sentry test...');
      addBreadcrumb('About to throw test error', 'test', {
        important: true,
        userId: user?.id || 'unknown'
      });
      captureMessage('Test message from KoaLens app', Severity.Info);
      const timestamp = new Date().toISOString();
      throw new Error(`Test error from KoaLens app at ${timestamp}`);
    } catch (error) {
      console.log('Caught test error, sending to Sentry:', error);
      captureException(error instanceof Error ? error : new Error(String(error)), {
        tags: {
          test: 'true',
          timestamp: new Date().toISOString(),
          version: Constants.expoConfig?.version || 'unknown'
        },
        extra: {
          device: Platform.OS,
          user: user?.id || 'anonymous'
        }
      });
      captureMessage('Test exception was caught and reported', Severity.Warning);
      console.log('Sent exception to Sentry');
      Alert.alert(
        'Sentry Test',
        'Ett testfel har skickats till Sentry. Kontrollera din Sentry-dashboard.\n\nOm felet inte syns, kontrollera konsolloggen.',
        [{ text: 'OK' }]
      );
    }
  };

  // Uppdaterad funktion för att synkronisera avatar med Supabase
  const handleSelectAvatar = async (filename: string, style: AvatarStyle) => {
    try {
      setUpdating(true);
      global.isBlockingNavigation = true;
      console.log('Navigationsspärr aktiverad för avatarbyte');
      await setAvatar(style, filename);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            avatar_style: style,
            avatar_id: filename,
            avatar_update: true,
            vegan_years: avatar.veganYears,
            vegan_status: veganStatus
          }
        });
        
        if (error) {
          console.error('Fel vid uppdatering av avatar i Supabase:', error);
          captureException(error);
          Alert.alert('Varning', 'Avataren uppdaterades lokalt men synkroniseringen med servern misslyckades.');
        } else {
          console.log('Avatar uppdaterad i Supabase');
        }
      }
      
      setTimeout(() => {
        global.isBlockingNavigation = false;
        console.log('Navigationsspärr inaktiverad efter avatarbyte');
      }, 5000);
    } catch (error) {
      console.error('Error updating avatar:', error);
      captureException(error instanceof Error ? error : new Error(String(error)));
      Alert.alert('Fel', 'Kunde inte uppdatera avataren. Försök igen senare.');
      global.isBlockingNavigation = false;
    } finally {
      setUpdating(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={{ flexGrow: 1 }} style={{ backgroundColor: '#25292e' }} accessibilityLabel="Profil skärm">
      <StyledView className="flex-1 bg-background-main">
        {/* Profile Info */}
        <StyledView className="px-4 pt-12 pb-6">
          <StyledView className="items-center">
            <StyledPressable
              onPress={() => setShowAvatarModal(true)}
              className="relative"
              accessibilityLabel="Ändra avatar"
              accessibilityHint="Tryck för att välja en ny avatar"
              disabled={updating}
            >
              {avatar.id ? (
                <Avatar 
                  source={avatar.id}
                  size="large"
                  style={avatar.style}
                />
              ) : (
                <StyledView className="w-24 h-24 bg-background-light rounded-full justify-center items-center mb-4">
                  <Ionicons name="person" size={48} color="#ffffff" />
                </StyledView>
              )}
              <StyledView className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
                <Ionicons name="pencil" size={16} color="#000000" />
              </StyledView>
              {updating && (
                <StyledView className="absolute inset-0 bg-black/20 rounded-full items-center justify-center">
                  <Ionicons name="sync" size={32} color="#ffd33d" />
                </StyledView>
              )}
            </StyledPressable>
            {user?.email && (
              <StyledText className="text-text-secondary font-sans text-base text-center mt-2" accessibilityLabel={`Inloggad som ${user.email}`}>
                {user.email}
              </StyledText>
            )}
            {veganStatus && (
              <StyledText className="text-primary font-sans-medium text-sm text-center mt-1">
                {veganStatus === 'vegan' ? 'Vegan' : 'Utforskar växtbaserat'}
                {avatar.veganYears > 0 && ` • ${avatar.veganYears} år`}
              </StyledText>
            )}
          </StyledView>
        </StyledView>
        {/* Menu Items */}
        <StyledView className="px-4 space-y-4">
          <StyledPressable 
            onPress={() => router.push('./settings')}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Öppna inställningar"
          >
            <Ionicons name="settings-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Inställningar
            </StyledText>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" style={{ marginLeft: 'auto' }} />
          </StyledPressable>
          
          <StyledPressable 
            onPress={() => router.push('./support')}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Öppna support"
          >
            <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Support
            </StyledText>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" style={{ marginLeft: 'auto' }} />
          </StyledPressable>

          <StyledPressable 
            onPress={() => router.push('./offline-test')}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Öppna offline test"
          >
            <Ionicons name="cloud-offline-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Offline Test
            </StyledText>
            <Ionicons name="chevron-forward" size={24} color="#ffffff" style={{ marginLeft: 'auto' }} />
          </StyledPressable>

          {__DEV__ && (
            <StyledPressable 
              onPress={testSentry}
              className="flex-row items-center p-4 bg-red-500/50 rounded-lg active:opacity-70"
              accessibilityRole="button"
              accessibilityLabel="Testa Sentry felrapportering"
            >
              <Ionicons name="bug-outline" size={24} color="#ffffff" />
              <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
                Testa Sentry
              </StyledText>
            </StyledPressable>
          )}

          <StyledView className="items-center pt-4 pb-2">
            <StyledText className="text-text-secondary/60 font-sans text-sm">
              KoaLens v{APP_VERSION}
            </StyledText>
          </StyledView>

          <StyledPressable 
            onPress={handleSignOut}
            className="flex-row items-center p-4 bg-status-error/80 rounded-lg mt-4 active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="Logga ut"
          >
            <Ionicons name="log-out-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Logga ut
            </StyledText>
          </StyledPressable>
        </StyledView>
        {/* Modals */}
        <AvatarSelectorModal
          visible={showAvatarModal}
          onClose={() => setShowAvatarModal(false)}
          onSelectAvatar={handleSelectAvatar}
          currentAvatarId={avatar.id}
          currentAvatarStyle={avatar.style}
        />
      </StyledView>
    </ScrollView>
  );
};

export default ProfileScreen;
