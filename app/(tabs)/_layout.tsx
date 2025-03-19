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
          await NavigationBar.setBorderColorAsync(theme.colors.background.dark);
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
        headerShown: false,
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#6b7280',
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#e5e7eb',
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Hem',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(scan)"
        options={{
          title: 'Skanna',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="scan-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(history)"
        options={{
          title: 'Historik',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Inställningar',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dev"
        options={{
          title: 'Utveckling',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="code-outline" color={color} size={size} />
          )
        }}
      />
    </Tabs>
  );
}