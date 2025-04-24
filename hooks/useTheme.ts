import { useColorScheme } from 'react-native';
import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ThemeColors {
  primary: string;
  secondary: string;
  background: string;
  lightBackground: string;
  darkBackground: string;
  text: string;
  secondaryText: string;
  border: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  cancelButtonBackground: string;
  cancelButtonText: string;
}

const lightColors: ThemeColors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  background: '#FFFFFF',
  lightBackground: '#FFFFFF',
  darkBackground: '#F2F2F7',
  text: '#000000',
  secondaryText: '#3C3C43',
  border: '#E5E5EA',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
  info: '#007AFF',
  cancelButtonBackground: '#F2F2F7',
  cancelButtonText: '#3C3C43',
};

const darkColors: ThemeColors = {
  primary: '#0A84FF',
  secondary: '#5E5CE6',
  background: '#000000',
  lightBackground: '#1C1C1E',
  darkBackground: '#2C2C2E',
  text: '#FFFFFF',
  secondaryText: '#EBEBF5',
  border: '#38383A',
  success: '#30D158',
  error: '#FF453A',
  warning: '#FF9F0A',
  info: '#0A84FF',
  cancelButtonBackground: '#2C2C2E',
  cancelButtonText: '#EBEBF5',
};

export function useTheme() {
  const systemColorScheme = useColorScheme();
  const [themePreference, setThemePreference] = useState<'light' | 'dark' | 'system'>('system');
  const [isDarkMode, setIsDarkMode] = useState(systemColorScheme === 'dark');

  useEffect(() => {
    // Load saved theme preference
    const loadThemePreference = async () => {
      try {
        const savedPreference = await AsyncStorage.getItem('@theme_preference');
        if (savedPreference) {
          setThemePreference(savedPreference as 'light' | 'dark' | 'system');
          
          if (savedPreference === 'light') {
            setIsDarkMode(false);
          } else if (savedPreference === 'dark') {
            setIsDarkMode(true);
          } else {
            setIsDarkMode(systemColorScheme === 'dark');
          }
        }
      } catch (error) {
        console.error('Error loading theme preference', error);
      }
    };

    loadThemePreference();
  }, [systemColorScheme]);

  // Update dark mode status when system theme changes
  useEffect(() => {
    if (themePreference === 'system') {
      setIsDarkMode(systemColorScheme === 'dark');
    }
  }, [systemColorScheme, themePreference]);

  // Save theme preference
  const setTheme = async (theme: 'light' | 'dark' | 'system') => {
    try {
      await AsyncStorage.setItem('@theme_preference', theme);
      setThemePreference(theme);
      
      if (theme === 'light') {
        setIsDarkMode(false);
      } else if (theme === 'dark') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(systemColorScheme === 'dark');
      }
    } catch (error) {
      console.error('Error saving theme preference', error);
    }
  };

  const colors = isDarkMode ? darkColors : lightColors;

  return {
    isDarkMode,
    themePreference,
    setTheme,
    colors,
    toggleTheme: () => setTheme(isDarkMode ? 'light' : 'dark'),
  };
} 