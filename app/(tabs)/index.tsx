import React from 'react';
import { Redirect } from 'expo-router';

// Detta är huvudkomponenten för hemskärmen, som är default route
export default function TabsIndex() {
  // Vi loggar här för att se om denna sida besöks vid navigering
  console.log('INDEX: Rendered TabsIndex page');
  
  // Omdirigera till skanna-fliken
  return <Redirect href="/(tabs)/(scan)/home" />;
}
