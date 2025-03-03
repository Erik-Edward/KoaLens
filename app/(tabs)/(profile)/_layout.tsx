// app/(tabs)/(profile)/_layout.jsx
import React from 'react';
import { Stack } from 'expo-router';

function ProfileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: '#25292e',
        },
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
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="advanced"
        options={{
          title: "Avancerade inställningar",
          headerShown: true,
        }}
      />
      <Stack.Screen
        name="offline-test"
        options={{
          title: 'Offline Test',
          headerShown: true,
        }}
      />
    </Stack>
  );
}

export default ProfileLayout;