console.log('[TEST LOG] app/_layout.tsx loaded');
import 'react-native-gesture-handler';
// app/_layout.tsx
import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Image, Text, LogBox } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { AuthProvider } from '../providers/AuthProvider';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { UserProfileSync } from '@/components/UserProfileSync';
import { AppInitializer } from '@/components/AppInitializer';
import { UpdateHandler } from '@/components/UpdateHandler';
import theme from '@/constants/theme';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';
import Providers from '@/providers';

// Styled komponenter för laddningsindikatorn
const StyledView = styled(View);
const StyledText = styled(Text);

// Ignorera specifik varning relaterad till Metro bundler
LogBox.ignoreLogs([
  'Metro waiting on',
  'Non-serializable values were found in the navigation state',
]);

const RootLayout = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const [updateChecked, setUpdateChecked] = useState(false);

  // Hantera fördröjd laddning och initialization
  useEffect(() => {
    // Minsta laddningstiden är 1 sekund för att visa splash-skärmen
    const timer = setTimeout(() => {
      // Om appen är initialiserad och uppdatering kontrollerad, fortsätt
      if (isInitialized && updateChecked) {
        setIsLoading(false);
      }
    }, 1000);

    // Om initialiseringen inte är klar inom 5 sekunder, fortsätt ändå
    const fallbackTimer = setTimeout(() => {
      if (!isInitialized || !updateChecked) {
        console.warn('App initialization or update check timed out, proceeding anyway');
        setIsLoading(false);
      }
    }, 5000);

    return () => {
      clearTimeout(timer);
      clearTimeout(fallbackTimer);
    };
  }, [isInitialized, updateChecked]);

  // Hantera slutförd initialisering
  const handleInitialized = () => {
    console.log('App initialization complete');
    setIsInitialized(true);
    
    // Om minsta laddningstiden har passerat och uppdatering är kontrollerad, avsluta laddningsskärmen
    if (updateChecked) {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
  };
  
  // Hantera slutförd uppdateringskontroll
  const handleUpdateComplete = () => {
    console.log('Update check complete');
    setUpdateChecked(true);
    
    // Om minsta laddningstiden har passerat och appen är initialiserad, avsluta laddningsskärmen
    if (isInitialized) {
      setTimeout(() => {
        setIsLoading(false);
      }, 300);
    }
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Providers>
        <ErrorBoundary>
          <AuthProvider>
            <UpdateHandler onUpdateComplete={handleUpdateComplete} />
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
      </Providers>
    </GestureHandlerRootView>
  );
};

export default RootLayout;