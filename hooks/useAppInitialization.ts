/**
 * Custom hook för appinitialisering
 * Ansvarar för att ladda användardata, importera legacy-produkter och
 * förbereda appen för användning
 */

import { useState, useEffect, useCallback } from 'react';
import { useStore } from '@/stores/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function useAppInitialization() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [importStats, setImportStats] = useState<{
    importedProducts: number;
    importDate: string | null;
  }>({
    importedProducts: 0,
    importDate: null
  });

  // Hämta init-funktion från den konsoliderade store
  const initializeUser = useStore(state => state.initializeUser);
  
  // Hämta importLegacyProducts från den konsoliderade store
  const importLegacyProducts = useStore(state => state.importLegacyProducts);

  // Vi behöver veta om vi redan har importerat produkter för att undvika dubbla importer
  const checkPreviousImport = useCallback(async () => {
    try {
      const importData = await AsyncStorage.getItem('@koalens:legacy_import_stats');
      if (importData) {
        return JSON.parse(importData);
      }
      return null;
    } catch (error) {
      console.error('Fel vid kontroll av tidigare import:', error);
      return null;
    }
  }, []);
  
  // Markera att vi har genomfört en import
  const markImportComplete = useCallback(async (count: number) => {
    try {
      const stats = {
        importedProducts: count,
        importDate: new Date().toISOString()
      };
      await AsyncStorage.setItem('@koalens:legacy_import_stats', JSON.stringify(stats));
      setImportStats(stats);
    } catch (error) {
      console.error('Fel vid markering av import som slutförd:', error);
    }
  }, []);

  // Initialisera appen
  const initialize = useCallback(async () => {
    if (isInitialized) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Steg 1: Initialisera användardata
      console.log('Initialiserar användardata...');
      await initializeUser();
      
      // Steg 2: Kontrollera om vi redan har importerat produkter
      console.log('Kontrollerar tidigare import...');
      const previousImport = await checkPreviousImport();
      
      // Steg 3: Importera legacy-produkter om vi inte redan har gjort det
      if (!previousImport) {
        console.log('Importerar legacy-produkter...');
        const importCount = await importLegacyProducts();
        console.log(`Importerade ${importCount} produkter`);
        
        if (importCount > 0) {
          await markImportComplete(importCount);
        }
      } else {
        console.log('Legacy-produkter redan importerade:', previousImport);
        setImportStats(previousImport);
      }
      
      // Steg 4: Markera initialiseringen som slutförd
      setIsInitialized(true);
    } catch (error) {
      console.error('Fel vid appinitialisering:', error);
      setError(error instanceof Error ? error : new Error('Ett fel inträffade vid initialisering'));
    } finally {
      setIsLoading(false);
    }
  }, [isInitialized, initializeUser, importLegacyProducts, checkPreviousImport, markImportComplete]);

  // Initialisera automatiskt vid första användning av hooken
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Force-importera legacy-produkter (för administrativ användning)
  const forceImportLegacyProducts = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Force-importerar legacy-produkter...');
      const importCount = await importLegacyProducts();
      console.log(`Importerade ${importCount} produkter`);
      
      await markImportComplete(importCount);
      return importCount;
    } catch (error) {
      console.error('Fel vid force-import av legacy-produkter:', error);
      setError(error instanceof Error ? error : new Error('Ett fel inträffade vid import'));
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [importLegacyProducts, markImportComplete]);

  return {
    isInitialized,
    isLoading,
    error,
    importStats,
    initialize,
    forceImportLegacyProducts
  };
} 