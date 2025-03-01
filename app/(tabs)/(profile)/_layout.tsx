// app/(tabs)/(profile)/_layout.tsx
import { FC } from 'react';
import { Stack } from 'expo-router';
import theme from '@/constants/theme';

const ProfileLayout: FC = () => {
  return (
    <Stack
      screenOptions={{
        // Header styling
        headerStyle: {
          backgroundColor: theme.colors.background.dark,
        },
        headerTintColor: theme.colors.text.primary,
        headerTitleStyle: {
          fontFamily: 'PlusJakartaSans-Medium',
          fontSize: 18,
        },
        // Huvudinnehållet
        contentStyle: {
          backgroundColor: theme.colors.background.main,
        },
        // Navigation animation
        animation: 'slide_from_right',
        // Ta bort header shadow
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Min profil',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: "Inställningar",
        }}
      />
      <Stack.Screen
        name="advanced"
        options={{
          title: "Avancerade inställningar",
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: "Support",
        }}
      />
      <Stack.Screen
        name="offline-test"
        options={{
          title: 'Offline Test',
        }}
      />
    </Stack>
  );
};

export default ProfileLayout;