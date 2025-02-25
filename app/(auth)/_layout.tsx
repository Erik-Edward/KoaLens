import { Stack } from 'expo-router';
import { useAuth } from '../../providers/AuthProvider';
import { useEffect } from 'react';
import { router } from 'expo-router';

export default function AuthLayout() {
  const { session } = useAuth();

  useEffect(() => {
    if (session) {
      router.replace('/(tabs)');
    }
  }, [session]);

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
    </Stack>
  );
}