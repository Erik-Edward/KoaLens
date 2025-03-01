// app/(tabs)/(profile)/index.tsx
import { FC, useState, useEffect } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import { Avatar } from '@/components/Avatar';
import { AvatarSelectorModal } from '@/components/AvatarSelectorModal';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { supabase } from '@/lib/supabase';
import { captureException, captureMessage, Severity, addBreadcrumb } from '@/lib/sentry';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

// Skapa en global variabel för att blockera navigering tillfälligt
// Denna kan nås från AuthProvider för att kontrollera om navigering bör blockeras
if (typeof global.isBlockingNavigation === 'undefined') {
  global.isBlockingNavigation = false;
}

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

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
      // Explicit logging för testning
      console.log('Starting Sentry test...');
      
      // Lägg till en breadcrumb innan felet
      addBreadcrumb('About to throw test error', 'test', {
        important: true,
        userId: user?.id || 'unknown'
      });
      
      // Skicka ett testmeddelande först
      captureMessage('Test message from KoaLens app', Severity.Info);
      console.log('Sent test message to Sentry');
      
      // Skapa ett unikt fel med tidsstämpel för att göra det lättare att identifiera
      const timestamp = new Date().toISOString();
      throw new Error(`Test error from KoaLens app at ${timestamp}`);
    } catch (error) {
      // Explicit logging när vi fångar felet
      console.log('Caught test error, sending to Sentry:', error);
      
      // Skicka felet med mer kontext
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
      
      // Skicka ett extra meddelande för att bekräfta att allt fungerar
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
      
      // Aktivera navigationsspärren innan vi gör några ändringar
      global.isBlockingNavigation = true;
      console.log('Navigationsspärr aktiverad för avatarbyte');
      
      // 1. Uppdatera lokalt i Zustand-store
      await setAvatar(style, filename);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      
      // 2. Synkronisera med Supabase - VIKTIGT: Sätt avatar_update till true
      if (user) {
        const { error } = await supabase.auth.updateUser({
          data: {
            avatar_style: style,
            avatar_id: filename,
            avatar_update: true, // Markera tydligt att detta är en avataruppdatering
            vegan_years: avatar.veganYears,
            vegan_status: veganStatus
          }
        });
        
        if (error) {
          console.error('Fel vid uppdatering av avatar i Supabase:', error);
          captureException(error); // Rapportera felet till Sentry
          Alert.alert('Varning', 'Avataren uppdaterades lokalt men synkroniseringen med servern misslyckades.');
        } else {
          console.log('Avatar uppdaterad i Supabase');
        }
      }
      
      // VIKTIGT: Ta bort återställningen av avatar_update-flaggan
      // och förläng tiden för navigationsspärren till 5 sekunder
      setTimeout(() => {
        // Inaktivera navigationsspärren efter 5 sekunder
        global.isBlockingNavigation = false;
        console.log('Navigationsspärr inaktiverad efter avatarbyte');
        
        // Vi återställer INTE avatar_update-flaggan här längre
        // Det gör att vi inte får en andra USER_UPDATED-händelse
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
    <StyledView 
      className="flex-1 bg-background-main"
      accessibilityLabel="Profil skärm"
    >
      {/* Profile Info */}
      <StyledView className="px-4 pt-12 pb-6">
        <StyledView className="items-center">
          {/* Visa avatar från lagrat val med klickbar funktion */}
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
            
            {/* Liten redigeringsikon */}
            <StyledView className="absolute bottom-0 right-0 bg-primary rounded-full p-2">
              <Ionicons name="pencil" size={16} color="#000000" />
            </StyledView>
            
            {/* Liten indikator när uppdatering pågår */}
            {updating && (
              <StyledView className="absolute inset-0 bg-black/20 rounded-full items-center justify-center">
                <Ionicons name="sync" size={32} color="#ffd33d" />
              </StyledView>
            )}
          </StyledPressable>
          
          {/* Visa e-post */}
          {user?.email && (
            <StyledText 
              className="text-text-secondary font-sans text-base text-center mt-2"
              accessibilityLabel={`Inloggad som ${user.email}`}
            >
              {user.email}
            </StyledText>
          )}
          
          {/* Visa vegan-status */}
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
        {/* Settings */}
        <StyledPressable 
          onPress={handleSettingsPress}
          className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Öppna inställningar"
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
          onPress={() => router.push('./support')}
          className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Öppna support"
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

        {/* Offline Test */}
        <StyledPressable 
          onPress={handleOfflineTestPress}
          className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Öppna offline test"
        >
          <Ionicons name="cloud-offline-outline" size={24} color="#ffffff" />
          <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
            Offline Test
          </StyledText>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color="#ffffff" 
            style={{ marginLeft: 'auto' }}
          />
        </StyledPressable>

        {/* Sentry Test Button - endast i utvecklingsläge */}
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

        {/* Sign Out */}
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
        
        {/* Version Information - Nu placerad efter utloggningsknappen */}
        <StyledView className="items-center mt-4 pt-2">
          <StyledText className="text-text-secondary/60 font-sans text-sm">
            KoaLens v{Constants.expoConfig?.version || '1.0.0'}
          </StyledText>
        </StyledView>
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
  );
};

export default ProfileScreen;