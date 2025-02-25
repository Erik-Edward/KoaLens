// app/_layout.tsx
import 'react-native-reanimated';  // Lägg till denna högst upp
import { FC } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider } from '../providers/AuthProvider';
import theme from '@/constants/theme';
import { UserProfileSync } from '@/components/UserProfileSync';

const RootLayout: FC = () => {
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
