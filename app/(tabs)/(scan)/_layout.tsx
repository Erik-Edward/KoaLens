import { FC } from 'react';
import { Stack } from 'expo-router';
import theme from '@/constants/theme';

const ScanLayout: FC = () => {
  return (
    <Stack 
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: theme.colors.background.main,
        }
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: 'Skanna produkt',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="home"
        options={{
          title: 'Skanna produkt',
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="camera"
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade',
        }}
      />
      {/* Ny skärm för beskärning */}
      <Stack.Screen
        name="crop"
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade',
          gestureEnabled: false, // Förhindra att användaren kan swipa tillbaka under beskärning
        }}
      />
      <Stack.Screen
        name="result"
        options={{
          presentation: 'modal',
          headerShown: false,
          animation: 'fade',
        }}
      />
    </Stack>
  );
};

export default ScanLayout;