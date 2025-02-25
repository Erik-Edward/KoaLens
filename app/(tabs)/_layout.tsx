// app/(tabs)/_layout.tsx
import { useEffect } from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import * as NavigationBar from 'expo-navigation-bar';
import theme from '@/constants/theme';

interface TabBarIconProps {
  color: string;
  size: number;
}

export default function TabLayout() {
  useEffect(() => {
    if (Platform.OS === 'android') {
      const setupNavigationBar = async () => {
        try {
          await NavigationBar.setBackgroundColorAsync(theme.colors.background.dark);
          await NavigationBar.setBorderColorAsync(theme.colors.background.dark); // Matcha bakgrundsfärgen
          await NavigationBar.setButtonStyleAsync('light');
        } catch (error) {
          console.log('Error setting navigation bar:', error);
        }
      };
      
      setupNavigationBar();
    }
  }, []);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary.DEFAULT,
        tabBarInactiveTintColor: theme.colors.text.secondary,
        tabBarStyle: {
          backgroundColor: theme.colors.background.dark,
          borderTopWidth: 0, // Ta bort top border helt
          elevation: 0,
          shadowOpacity: 0,
          height: 60, // Ge lite mer höjd för bättre touch targets
          paddingBottom: 8, // Lägg till padding i botten för bättre placering av innehåll
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="(scan)"
        options={{
          title: 'Skanna',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="camera-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(history)"
        options={{
          title: 'Historik',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }: TabBarIconProps) => (
            <Ionicons name="person-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}