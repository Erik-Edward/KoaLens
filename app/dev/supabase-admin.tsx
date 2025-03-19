/**
 * Administrativt gränssnitt för att hantera Supabase-tabeller och synkronisering
 */

import React, { useState, useCallback } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { ProductRepository } from '@/services/productRepository';
import { ProductSyncService } from '@/services/productSyncService';
import { useStore } from '@/stores/useStore';
import * as Clipboard from 'expo-clipboard';

export default function SupabaseAdminScreen() {
  const [loading, setLoading] = useState(false);
  const [tableStatus, setTableStatus] = useState<{[key: string]: boolean}>({});
  const [statusMessage, setStatusMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  
  const userId = useStore(state => state.userId);
  const productRepository = ProductRepository.getInstance();
  const syncService = ProductSyncService.getInstance();
  
  // Verifiera om en tabell existerar i Supabase
  const checkTable = useCallback(async (tableName: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Gör en enkel förfrågan till tabellen för att se om den finns
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);
      
      if (error) {
        if (error.code === '42P01' || error.message.includes('does not exist')) {
          setTableStatus(prev => ({ ...prev, [tableName]: false }));
          console.warn(`Tabell ${tableName} existerar inte i Supabase`);
          return false;
        }
        
        console.error(`Fel vid kontroll av tabell ${tableName}:`, error);
        setError(`Fel vid kontroll av tabell ${tableName}: ${error.message}`);
        return false;
      }
      
      setTableStatus(prev => ({ ...prev, [tableName]: true }));
      console.log(`Tabell ${tableName} existerar i Supabase`, data);
      return true;
    } catch (error) {
      console.error(`Undantag vid kontroll av tabell ${tableName}:`, error);
      setError(`Kunde inte kontrollera tabell ${tableName}: ${error instanceof Error ? error.message : String(error)}`);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);
  
  // Kontrollera alla tabeller
  const checkAllTables = useCallback(async () => {
    setStatusMessage('Kontrollerar tabeller...');
    const scannedProductsExists = await checkTable('scanned_products');
    const userUsageExists = await checkTable('user_usage');
    
    setStatusMessage(
      `Status: scanned_products: ${scannedProductsExists ? 'Finns' : 'Saknas'}, ` +
      `user_usage: ${userUsageExists ? 'Finns' : 'Saknas'}`
    );
  }, [checkTable]);
  
  // Hämta information om antalet produkter
  const getProductsCount = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setStatusMessage('Hämtar produktstatistik...');
      
      // Produkter i Supabase
      const { data: supabaseData, error: supabaseError } = await supabase
        .from('scanned_products')
        .select('id', { count: 'exact' });
      
      if (supabaseError) {
        console.error('Fel vid hämtning av produkter från Supabase:', supabaseError);
        setError(`Fel vid hämtning från Supabase: ${supabaseError.message}`);
        return;
      }
      
      const supabaseCount = supabaseData?.length || 0;
      
      // Produkter lokalt för användaren
      let localCount = 0;
      if (userId) {
        const userProducts = await productRepository.getProductsByUserId(userId);
        localCount = userProducts.length;
      }
      
      setStatusMessage(`Produkter i Supabase: ${supabaseCount}, Lokala produkter: ${localCount}`);
    } catch (error) {
      console.error('Fel vid hämtning av produktstatistik:', error);
      setError(`Kunde inte hämta produktstatistik: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [userId, productRepository]);
  
  // Synkronisera produkter till Supabase
  const syncToSupabase = useCallback(async () => {
    try {
      if (!userId) {
        Alert.alert('Info', 'Du måste vara inloggad för att synkronisera produkter.');
        return;
      }
      
      setLoading(true);
      setError(null);
      setStatusMessage('Synkroniserar produkter till Supabase...');
      
      const success = await productRepository.syncProductsToSupabase();
      
      setStatusMessage(`Synkronisering till Supabase ${success ? 'lyckades' : 'misslyckades'}`);
    } catch (error) {
      console.error('Fel vid synkronisering till Supabase:', error);
      setError(`Kunde inte synkronisera till Supabase: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [userId, productRepository]);
  
  // Hämta produkter från Supabase
  const fetchFromSupabase = useCallback(async () => {
    try {
      if (!userId) {
        Alert.alert('Info', 'Du måste vara inloggad för att hämta produkter.');
        return;
      }
      
      setLoading(true);
      setError(null);
      setStatusMessage('Hämtar produkter från Supabase...');
      
      const success = await productRepository.fetchProductsFromSupabase(userId);
      
      setStatusMessage(`Hämtning från Supabase ${success ? 'lyckades' : 'misslyckades'}`);
    } catch (error) {
      console.error('Fel vid hämtning från Supabase:', error);
      setError(`Kunde inte hämta från Supabase: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [userId, productRepository]);
  
  // Tvåvägssynkronisering
  const syncBidirectional = useCallback(async () => {
    try {
      if (!userId) {
        Alert.alert('Info', 'Du måste vara inloggad för att synkronisera produkter.');
        return;
      }
      
      setLoading(true);
      setError(null);
      setStatusMessage('Synkroniserar produkter i båda riktningarna...');
      
      const success = await productRepository.syncProductsBidirectional(userId);
      
      setStatusMessage(`Tvåvägssynkronisering ${success ? 'lyckades' : 'misslyckades'}`);
    } catch (error) {
      console.error('Fel vid tvåvägssynkronisering:', error);
      setError(`Kunde inte synkronisera i båda riktningarna: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [userId, productRepository]);
  
  // Kör checkAllTables när komponenten laddas
  React.useEffect(() => {
    checkAllTables();
  }, [checkAllTables]);
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen options={{ title: 'Supabase Admin' }} />
      
      <Text style={styles.title}>Supabase Administrator</Text>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Status</Text>
        <Text style={styles.infoText}>
          User ID: {userId || 'Inte inloggad'}
        </Text>
        <Text style={styles.infoText}>
          Tabeller: {Object.entries(tableStatus).map(([table, exists]) => 
            `${table}: ${exists ? '✅' : '❌'}`
          ).join(', ')}
        </Text>
        
        {statusMessage ? (
          <Text style={styles.statusMessage}>{statusMessage}</Text>
        ) : null}
        
        {error ? (
          <Text style={styles.errorMessage}>{error}</Text>
        ) : null}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Tabellhantering</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={checkAllTables}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Kontrollera tabeller</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={getProductsCount}
          disabled={loading}
        >
          <Text style={styles.buttonText}>Visa produktstatistik</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synkronisering</Text>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={syncToSupabase}
          disabled={loading || !userId}
        >
          <Text style={styles.buttonText}>Synkronisera till Supabase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button} 
          onPress={fetchFromSupabase}
          disabled={loading || !userId}
        >
          <Text style={styles.buttonText}>Hämta från Supabase</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.buttonPrimary]} 
          onPress={syncBidirectional}
          disabled={loading || !userId}
        >
          <Text style={styles.buttonTextPrimary}>Synkronisera i båda riktningarna</Text>
        </TouchableOpacity>
      </View>
      
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Arbetar...</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#111827',
  },
  infoCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#111827',
  },
  infoText: {
    fontSize: 14,
    color: '#374151',
    marginBottom: 6,
  },
  statusMessage: {
    fontSize: 14,
    color: '#047857',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#ECFDF5',
    borderRadius: 4,
  },
  errorMessage: {
    fontSize: 14,
    color: '#B91C1C',
    marginTop: 10,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.41,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#111827',
  },
  button: {
    backgroundColor: '#E5E7EB',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 10,
  },
  buttonPrimary: {
    backgroundColor: '#4F46E5',
  },
  buttonText: {
    fontWeight: '600',
    color: '#374151',
  },
  buttonTextPrimary: {
    fontWeight: '600',
    color: '#FFFFFF',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#4F46E5',
    fontWeight: '600',
  },
}); 