import { Stack } from 'expo-router';
import theme from '@/constants/theme';

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: theme.colors.background.main,
        },
        headerTintColor: theme.colors.text.primary,
        contentStyle: {
          backgroundColor: theme.colors.background.main,
        },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="settings"
        options={{
          title: 'Inställningar',
          headerBackTitle: 'Tillbaka',
        }}
      />
      <Stack.Screen
        name="support"
        options={{
          title: 'Support',
          headerBackTitle: 'Tillbaka',
        }}
      />
    </Stack>
  );
} 