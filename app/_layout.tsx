// app/_layout.tsx
import 'react-native-reanimated';
import { FC, useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, Text, ActivityIndicator } from 'react-native';
import { AuthProvider } from '../providers/AuthProvider';
import theme from '@/constants/theme';
import { UserProfileSync } from '@/components/UserProfileSync';
import * as Linking from 'expo-linking';
import { router } from 'expo-router';
// Använd wrappers istället för direkta importer
import { initSentry } from '@/lib/sentryWrapper';
import { preventAutoHideAsync, hideAsync } from '@/lib/splashScreenWrapper';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { initAnalytics } from '@/lib/analyticsWrapper';
import { styled } from 'nativewind';
import { supabase } from '@/lib/supabase';

// Styled komponenter för laddningsindikatorn
const StyledView = styled(View);
const StyledText = styled(Text);

// Initiera Sentry så tidigt som möjligt
initSentry();

// Visa splashscreen tills appen är redo
preventAutoHideAsync().catch(() => {
  /* ingen åtgärd vid fel */
});

const RootLayout: FC = () => {
  const [initialized, setInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  // Supabase initialiserings-useEffect
  useEffect(() => {
    const initSupabase = async () => {
      try {
        console.log('Initializing Supabase in layout...');
        
        // Utför en enkel operation för att initiera Supabase-klienten
        // Detta triggar den lazy-initialized klienten i lib/supabase.ts
        await supabase.auth.getSession();
        
        console.log('Supabase initialized successfully');
        setInitialized(true);
      } catch (error) {
        console.error('Supabase initialization error:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        
        // Fortsätt ändå efter en kort fördröjning för att inte blockera appen helt
        setTimeout(() => setInitialized(true), 1000);
      }
    };

    initSupabase();
  }, []);

  // Förbättrad djuplänkhantering (detta stör inte AuthProvider:s egen hantering)
  useEffect(() => {
    // Dölj splash screen när komponenten är monterad
    if (initialized) {
      hideAsync().catch((error) => {
        // Logga felet men fortsätt
        console.log('Error hiding splash screen:', error);
      });
    }
    
    // Initiera Firebase Analytics när appen har initialiserats
    if (initialized) {
      initAnalytics().then(success => {
        if (success) {
          console.log('Analytics initialized successfully');
        } else {
          console.warn('Failed to initialize Analytics');
        }
      });
    }
    
    // Hantera initial URL när appen startas via en djuplänk
    if (initialized) {
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
    }
  }, [initialized]);

  // Visa laddningsskärm medan Supabase initialiseras
  if (!initialized) {
    return (
      <StyledView className="flex-1 bg-background-main justify-center items-center">
        <ActivityIndicator size="large" color="#ffd33d" />
        <StyledText className="text-text-primary font-sans-medium mt-4 text-center px-6">
          {initError 
            ? `Ett problem uppstod: ${initError}\n\nStartar ändå...` 
            : 'Förbereder KoaLens...'}
        </StyledText>
      </StyledView>
    );
  }

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