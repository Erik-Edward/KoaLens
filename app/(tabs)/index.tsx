import React from 'react';
import { Redirect } from 'expo-router';

// Detta är huvudkomponenten för hemskärmen, som är default route
export default function IndexScreen() {
  // Omdirigera till skanna-fliken
  return <Redirect href="/(tabs)/(scan)/home" />;
}
