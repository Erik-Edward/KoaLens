// app/_layout.tsx - med Sentry integration
import 'react-native-reanimated';
import { FC, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';
import theme from '@/constants/theme';
import { UserProfileSync } from '@/components/UserProfileSync';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { initSentry } from '@/lib/sentry';
import { ErrorBoundary } from '@/components/ErrorBoundary';

// Initiera Sentry så tidigt som möjligt
initSentry();

// Visa splashscreen tills appen är redo
SplashScreen.preventAutoHideAsync().catch(() => {
  /* ingen åtgärd vid fel */
});

const RootLayout: FC = () => {
  // Förbättrad djuplänkhantering (detta stör inte AuthProvider:s egen hantering)
  useEffect(() => {
    // Dölj splash screen när komponenten är monterad
    SplashScreen.hideAsync().catch(() => {
      /* ingen åtgärd vid fel */
    });
    
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
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
};

export default RootLayout;