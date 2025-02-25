// app/(tabs)/(profile)/index.tsx - med global navigationsspärr
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
      
      // 2. Synkronisera med Supabase
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
          Alert.alert('Varning', 'Avataren uppdaterades lokalt men synkroniseringen med servern misslyckades.');
        } else {
          console.log('Avatar uppdaterad i Supabase');
        }
      }
      
      // Behåll navigationsspärren aktiv i 3 sekunder för att förhindra att
      // någon annan navigation sker medan vi uppdaterar avataren
      setTimeout(() => {
        global.isBlockingNavigation = false;
        console.log('Navigationsspärr inaktiverad efter avatarbyte');
        
        // Återställ avatar_update-flaggan
        if (user) {
          supabase.auth.updateUser({
            data: {
              avatar_update: false
            }
          }).catch(err => console.error('Fel vid återställning av avatar_update:', err));
        }
      }, 3000);
    } catch (error) {
      console.error('Error updating avatar:', error);
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

      {/* Avatar Selector Modal */}
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