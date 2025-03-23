// app/(tabs)/(history)/_layout.tsx
import { FC } from 'react';
import { Stack } from 'expo-router';

const HistoryLayout: FC = () => {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#25292e'
        }
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          headerShown: false
        }}
      />
    </Stack>
  );
};

export default HistoryLayout;