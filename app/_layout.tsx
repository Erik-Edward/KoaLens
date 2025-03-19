// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Image, Text } from 'react-native';
import { AuthProvider } from '../providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UserProfileSync } from '@/components/UserProfileSync';
import { AppInitializer } from '@/components/AppInitializer';
import theme from '@/constants/theme';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';

// Styled komponenter för laddningsindikatorn
const StyledView = styled(View);
const StyledText = styled(Text);

export default function RootLayout() {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  // Hantera fördröjd laddning och initialization
  useEffect(() => {
    // Minsta laddningstiden är 1 sekund för att visa splash-skärmen
    const timer = setTimeout(() => {
      // Om appen är initialiserad, fortsätt
      if (isInitialized) {
        setIsLoading(false);
      }
    }, 1000);

    // Om initialiseringen inte är klar inom 5 sekunder, fortsätt ändå
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized) {
        console.warn('App initialization timed out, proceeding anyway');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [isInitialized]);

  // Hantera slutförd initialisering
  const handleInitialized = () => {
    console.log('App initialization complete');
    setIsInitialized(true);
    
    // Om minsta laddningstiden har passerat, avsluta laddningsskärmen
    setTimeout(() => {
      setIsLoading(false);
    }, 300);
  };

  if (isLoading) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-[#070F2B]">
        <Image 
          source={require('../assets/images/splashscreen_logo.png')} 
          style={{ width: 100, height: 100, marginBottom: 20 }}
        />
        <ActivityIndicator size="large" color="#4FB4F2" />
        <StyledText className="text-white mt-4 text-lg">KoaLens</StyledText>
        <StyledText className="text-gray-400 mt-1">Läser in...</StyledText>
      </StyledView>
    );
  }

  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppInitializer onInitialized={handleInitialized} />
        <StatusBar 
          style="light"
          backgroundColor={theme.colors.background.main}
          translucent={true}
        />
        <UserProfileSync />
        <Stack 
          screenOptions={{ 
            headerShown: false,
            contentStyle: {
              backgroundColor: theme.colors.background.main
            },
            animation: 'fade'
          }}
        >
          <Stack.Screen 
            name="(auth)" 
            options={{
              animation: 'fade'
            }}
          />
          <Stack.Screen 
            name="(tabs)"
            options={{
              animation: 'fade'
            }}
          />
          <Stack.Screen 
            name="(onboarding)"
            options={{
              animation: 'fade'
            }}
          />
        </Stack>
      </AuthProvider>
    </ErrorBoundary>
  );
};