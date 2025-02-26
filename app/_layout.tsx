// app/_layout.tsx - Förbättrad djuplänkhantering för verifiering

import 'react-native-reanimated';
import { FC, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';
import theme from '@/constants/theme';
import { UserProfileSync } from '@/components/UserProfileSync';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';

const RootLayout: FC = () => {
  // Förbättrad djuplänkhantering (detta stör inte AuthProvider:s egen hantering)
  useEffect(() => {
    // Hantera initial URL när appen startas via en djuplänk
    const getInitialURL = async () => {
      const url = await Linking.getInitialURL();
      if (url) {
        console.log('RootLayout: Initial URL detected:', url);
        
        // För verifieringslänkar, se till att navigera till login direkt
        // Detta är ett säkerhetsnät om AuthProvider misslyckas
        if (url.includes('type=signup')) {
          console.log('RootLayout: Detected signup verification, will ensure login redirect');
          
          // Sätt en timer för att säkerställa att vi navigerar till login om inget annat händer
          const redirectTimer = setTimeout(() => {
            console.log('RootLayout: Safety redirect to login triggered');
            router.replace('/(auth)/login?verified=true');
          }, 3000);
          
          // Rensa timern om komponenten unmountas
          return () => clearTimeout(redirectTimer);
        }
      }
    };
    
    getInitialURL();
  }, []);

  return (
    <AuthProvider>
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
  );
};

export default RootLayout;