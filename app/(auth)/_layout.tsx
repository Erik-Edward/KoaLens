import { Stack, useSegments } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AuthLayout() {
  const { session, isNavigatingToReset } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    const currentRoute = segments.join('/');
    const isInAuthGroup = segments[0] === '(auth)';
    
    console.log(
      'AuthLayout useEffect körs:', 
      `Session: ${session ? 'finns' : 'saknas'}`, 
      `isNavigatingToReset: ${isNavigatingToReset}`, 
      `Current route: ${currentRoute}`,
      `Is in Auth Group: ${isInAuthGroup}`
    );
    
    if (currentRoute === '(auth)/reset-password') {
      console.log('AuthLayout: Är på reset-password sidan, ingen omdirigering.');
      return;
    }
    
    if (isNavigatingToReset) {
      console.log('AuthLayout: Navigering till reset-password pågår, hoppar över omdirigering till tabs.');
      return;
    }
    
    if (session && isInAuthGroup) {
      console.log('AuthLayout: Session finns och är i auth-gruppen (ej reset), omdirigerar till tabs.');
      router.replace('/(tabs)');
    }
  }, [session, isNavigatingToReset, segments]);

  return (
    <Stack>
      <Stack.Screen 
        name="login" 
        options={{ 
          title: 'Logga in',
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerTintColor: '#ffffff'
        }} 
      />
      <Stack.Screen 
        name="register" 
        options={{ 
          title: 'Registrera',
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerTintColor: '#ffffff'
        }} 
      />
      <Stack.Screen 
        name="forgot-password" 
        options={{ 
          title: 'Glömt lösenord',
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerTintColor: '#ffffff'
        }} 
      />
      <Stack.Screen 
        name="reset-password" 
        options={{ 
          title: 'Återställ lösenord',
          headerStyle: {
            backgroundColor: '#25292e',
          },
          headerTintColor: '#ffffff'
        }} 
      />
    </Stack>
  );
}