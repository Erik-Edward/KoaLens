import React, { useEffect } from 'react';
import { setGlobalShowAlert, useAlert } from '@/utils/alertUtils';

/**
 * Komponent som initialiserar alert-systemet genom att koppla ihop
 * setGlobalShowAlert med showAlert-funktionen från AlertProvider
 */
export function AlertInitializer() {
  const { showAlert } = useAlert();

  useEffect(() => {
    // Koppla ihop den globala alert-funktionen med vår custom alert
    console.log('[AlertInitializer] Setting up global alert function');
    setGlobalShowAlert(showAlert);
    
    return () => {
      // Om komponenten unmountas, sätt globalShowAlert till null
      console.log('[AlertInitializer] Cleaning up global alert function');
      // @ts-ignore - Detta är säkert eftersom vi bara vill nollställa funktionen
      setGlobalShowAlert(null);
    };
  }, [showAlert]);

  // Denna komponent renderar ingenting
  return null;
} 