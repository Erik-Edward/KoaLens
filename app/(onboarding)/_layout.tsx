// app/(onboarding)/_layout.tsx
import { useEffect } from 'react';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import * as NavigationBar from 'expo-navigation-bar';
import theme from '@/constants/theme';

const StyledPressable = styled(Pressable);

export default function OnboardingLayout() {
  const resetStore = useStore((state) => state.resetOnboarding);
  const resetAvatar = useStore((state) => state.resetAvatar);
  const resetVeganStatus = useStore((state) => state.resetVeganStatus);

  useEffect(() => {
    if (Platform.OS === 'android') {
      const setupNavigationBar = async () => {
        try {
          await NavigationBar.setBackgroundColorAsync(theme.colors.background.main);
          await NavigationBar.setBorderColorAsync(theme.colors.background.main);
          await NavigationBar.setButtonStyleAsync('light');
        } catch (error) {
          console.log('Error setting navigation bar:', error);
        }
      };
      
      setupNavigationBar();

      return () => {
        NavigationBar.setBackgroundColorAsync(theme.colors.background.dark).catch(() => {});
      };
    }
  }, []);

  const handleReset = async () => {
    try {
      console.log('Resetting app state...');
      await resetStore();
      await resetAvatar();
      await resetVeganStatus();
      router.replace('/(onboarding)');
      console.log('App state reset complete');
    } catch (error) {
      console.error('Error resetting app state:', error);
    }
  };

  return (
    <>
      <StatusBar 
        style="light"
        backgroundColor={theme.colors.background.main}
        translucent={true}
      />
      
      {/* Dev Reset Button */}
      {__DEV__ && (
        <StyledPressable 
          onPress={handleReset}
          className="absolute top-14 right-4 z-50 bg-background-light/50 p-2 rounded-full"
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </StyledPressable>
      )}

      <Stack
        screenOptions={{
          gestureEnabled: false,
          headerShown: false,
          contentStyle: {
            backgroundColor: theme.colors.background.main
          },
          animation: 'fade',
        }}
      >
        <Stack.Screen 
          name="index"
          options={{
            title: 'Välkommen till KoaLens',
          }}
        />
        <Stack.Screen 
          name="vegan-status"
          options={{
            title: 'Din Veganska Resa',
          }}
        />
        <Stack.Screen 
          name="avatar"
          options={{
            title: 'Välj Avatar',
          }}
        />
        <Stack.Screen 
          name="guide"
          options={{
            title: 'Guide',
          }}
        />
        <Stack.Screen 
          name="disclaimer"
          options={{
            title: 'Ansvarsfriskrivning',
          }}
        />
      </Stack>
    </>
  );
}