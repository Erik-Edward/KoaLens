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
          await NavigationBar.setBackgroundColorAsync('#121212');
          await NavigationBar.setBorderColorAsync('#2a2a2a');
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
        tabBarActiveTintColor: '#4ECDC4',
        tabBarInactiveTintColor: '#8A8A8A',
        tabBarStyle: {
          backgroundColor: '#121212',
          borderTopColor: '#2a2a2a',
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
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
        name="(enumbers)"
        options={{
          title: 'E-nr',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="search-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="dev"
        options={{
          title: 'Utveckling',
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="code-outline" color={color} size={size} />
          ),
          href: null, // Dölj denna tab i produktion
        }}
      />
    </Tabs>
  );
}