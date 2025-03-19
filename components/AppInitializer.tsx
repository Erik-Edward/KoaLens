import React, { useEffect } from 'react';
import { useAppInitialization } from '@/hooks/useAppInitialization';

interface AppInitializerProps {
  onInitialized?: () => void;
}

/**
 * Komponent för att initialisera appen
 * Ansvarar för att ladda användardata, importera legacy-produkter och
 * förbereda appen för användning
 */
export const AppInitializer: React.FC<AppInitializerProps> = ({ onInitialized }) => {
  const { isInitialized, error } = useAppInitialization();

  // Anropa callback när initialiseringen är slutförd
  useEffect(() => {
    if (isInitialized && onInitialized) {
      onInitialized();
    }
  }, [isInitialized, onInitialized]);

  // Logga fel om något går fel under initialiseringen
  useEffect(() => {
    if (error) {
      console.error('Fel vid appinitialisering:', error);
    }
  }, [error]);

  // Denna komponent renderar inget synligt
  return null;
}; 