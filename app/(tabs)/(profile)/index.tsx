// app/(tabs)/(profile)/index.tsx
import { FC, useState } from 'react';
import { View, Text, Pressable, Alert } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/providers/AuthProvider';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import { Avatar } from '@/components/Avatar';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

const ProfileScreen: FC = () => {
  const { user, signOut } = useAuth();
  const avatar = useStore(state => state.avatar);
  const veganStatus = useStore(state => state.veganStatus.status);
  const [syncing, setSyncing] = useState(false);
  
  const handleSyncProfile = async () => {
    try {
      setSyncing(true);
      
      // Om du skulle implementera en faktisk synkroniseringsfunktion:
      // await updateUserProfile();
      
      // Simulera laddningstid
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert('Profil uppdaterad', 'Din profil har synkroniserats.');
    } catch (error) {
      console.error('Sync error:', error);
      Alert.alert('Fel', 'Ett oväntat fel inträffade. Försök igen senare.');
    } finally {
      setSyncing(false);
    }
  };

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

  return (
    <StyledView 
      className="flex-1 bg-background-main"
      accessibilityLabel="Profil skärm"
    >
      {/* Profile Info */}
      <StyledView className="px-4 pt-12 pb-6">
        <StyledView className="items-center">
          {/* Visa avatar från lagrat val */}
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
        {/* Uppdatera profil */}
        <StyledPressable 
          onPress={handleSyncProfile}
          disabled={syncing}
          className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Uppdatera profil"
        >
          <Ionicons 
            name={syncing ? "sync" : "sync-outline"} 
            size={24} 
            color="#ffffff" 
          />
          <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
            {syncing ? 'Uppdaterar...' : 'Uppdatera profil'}
          </StyledText>
          <Ionicons 
            name="chevron-forward" 
            size={24} 
            color="#ffffff" 
            style={{ marginLeft: 'auto' }}
          />
        </StyledPressable>

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

        {/* Sign Out */}
        <StyledPressable 
          onPress={handleSignOut}
          className="flex-row items-center p-4 bg-status-error/80 rounded-lg mt-8 active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="Logga ut"
        >
          <Ionicons name="log-out-outline" size={24} color="#ffffff" />
          <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
            Logga ut
          </StyledText>
        </StyledPressable>
      </StyledView>
    </StyledView>
  );
};

export default ProfileScreen;