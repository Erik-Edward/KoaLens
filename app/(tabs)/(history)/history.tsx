/**
 * Historikskärm för att visa scannade produkter
 * Använder den nya produktmodellen och våra custom hooks
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert } from 'react-native';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NewProductCard } from '@/components/NewProductCard';
import { useProducts } from '@/hooks/useProducts';
import { styled } from 'nativewind';
import { Product } from '@/models/productModel';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { router } from 'expo-router';
import { useStore } from '@/stores/useStore';
import { ProductRepository } from '@/services/productRepository';

// Styled komponenter
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export default function HistoryScreen() {
  // Prioritera auth.user.id före userId-slicen för konsekvens
  const authUser = useStore(state => state.user);
  const storeUserId = useStore(state => state.userId);
  
  // Använd samma prioritering som i useProducts men konvertera null till undefined
  const effectiveUserId = authUser?.id || (storeUserId || undefined);

  // Logga användare för debugging
  useEffect(() => {
    console.log('HistoryScreen: Inloggad användare:', effectiveUserId || 'ingen');
    
    // Även logga information om user-objektet för att se varför det kan vara tomt
    if (!authUser) {
      console.warn('HistoryScreen: Inget auth-användarobjekt tillgängligt i store');
    } else if (!authUser.id) {
      console.warn('HistoryScreen: Auth-användarobjekt finns men saknar ID:', authUser);
    }
    
    if (!storeUserId) {
      console.warn('HistoryScreen: Inget userId tillgängligt i store');
    }
  }, [effectiveUserId, authUser, storeUserId]);

  const { 
    products, 
    loading, 
    error, 
    refreshProducts, 
    toggleFavorite, 
    removeProduct 
  } = useProducts(effectiveUserId);

  const [refreshing, setRefreshing] = useState(false);
  const [refreshAttempts, setRefreshAttempts] = useState(0);

  // Logga produkter när de ändras för debugging
  useEffect(() => {
    console.log(`HistoryScreen: ${products.length} produkter laddade`);
    
    // Logga information om varje produkt för felsökning
    if (products.length === 0) {
      console.log('HistoryScreen: Inga produkter att visa');
    } else {
      products.forEach((p, index) => {
        console.log(`Produkt ${index + 1}: ID=${p.id}, Användar-ID=${p.metadata.userId || 'saknas'}, Sparad=${p.metadata.isSavedToHistory}, Favorit=${p.metadata.isFavorite}`);
      });
    }
  }, [products]);

  // Funktion för att hantera refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    setRefreshAttempts(prev => prev + 1);
    console.log(`HistoryScreen: Uppdaterar produkter (försök ${refreshAttempts + 1})...`);
    try {
      await refreshProducts();
      console.log('HistoryScreen: Produkter uppdaterade');
    } catch (error) {
      console.error('HistoryScreen: Fel vid uppdatering av produkter:', error);
      // Visa ett felmeddelande till användaren
      Alert.alert(
        'Uppdateringsfel',
        `Kunde inte uppdatera produktlistan: ${error instanceof Error ? error.message : 'Okänt fel'}`,
        [{ text: 'OK' }]
      );
    } finally {
      setRefreshing(false);
    }
  }, [refreshProducts, refreshAttempts]);

  // Hantera favorittoggle
  const handleToggleFavorite = useCallback(async (id: string) => {
    try {
      console.log(`HistoryScreen: Växlar favoritstatus för produkt ${id}`);
      await toggleFavorite(id);
    } catch (err) {
      console.error('HistoryScreen: Fel vid toggle av favorit:', err);
      Alert.alert(
        'Åtgärdsfel',
        'Kunde inte ändra favoritstatus. Försök igen.',
        [{ text: 'OK' }]
      );
    }
  }, [toggleFavorite]);

  // Hantera borttagning
  const handleDelete = useCallback(async (id: string) => {
    try {
      console.log(`HistoryScreen: Tar bort produkt ${id}`);
      await removeProduct(id);
    } catch (err) {
      console.error('HistoryScreen: Fel vid borttagning av produkt:', err);
      Alert.alert(
        'Borttagningsfel',
        'Kunde inte ta bort produkten. Försök igen.',
        [{ text: 'OK' }]
      );
    }
  }, [removeProduct]);

  // Rendrera en produktkort
  const renderItem = useCallback(({ item }: { item: Product }) => (
    <NewProductCard
      product={item}
      onFavoriteToggle={() => handleToggleFavorite(item.id)}
      onDelete={() => handleDelete(item.id)}
      useNewDetailPage={true}
    />
  ), [handleToggleFavorite, handleDelete]);

  // Rendrera tom lista
  const renderEmptyList = useCallback(() => (
    <StyledView className="flex-1 justify-center items-center p-4">
      <Ionicons name="camera-outline" size={64} color="#555" />
      <StyledText className="text-text-primary text-lg mt-4 text-center">
        {effectiveUserId ? 'Din historik är tom' : 'Logga in för att se din historik'}
      </StyledText>
      <StyledText className="text-text-secondary text-center mt-2">
        {effectiveUserId 
          ? 'Skanna produkter och tryck på "spara" för att se dem här' 
          : 'Du behöver vara inloggad för att spara produkter'}
      </StyledText>
      
      <StyledPressable
        onPress={() => router.push('/(tabs)/(scan)')}
        className="bg-primary p-4 rounded-full mt-6"
      >
        <StyledText className="text-white font-sans-medium">
          Skanna en produkt
        </StyledText>
      </StyledPressable>
      
      {effectiveUserId && (
        <StyledPressable
          onPress={handleRefresh}
          className="bg-secondary p-3 rounded-full mt-4 flex-row items-center"
        >
          <Ionicons name="refresh-outline" size={18} color="#fff" style={{ marginRight: 6 }} />
          <StyledText className="text-white font-sans-medium">
            Uppdatera manuellt
          </StyledText>
        </StyledPressable>
      )}

      {/* Diagnostisk information i utvecklingsläge */}
      {__DEV__ && effectiveUserId && (
        <StyledView className="mt-8 p-3 border border-gray-300 rounded-md w-full">
          <StyledText className="font-sans-medium">Diagnostisk information:</StyledText>
          <StyledText className="text-text-secondary text-sm mt-1">Användar-ID: {effectiveUserId}</StyledText>
          <StyledText className="text-text-secondary text-sm">Källa: {authUser?.id ? 'auth' : storeUserId ? 'store' : 'annan'}</StyledText>
          <StyledText className="text-text-secondary text-sm">Uppdateringsförsök: {refreshAttempts}</StyledText>
        </StyledView>
      )}
    </StyledView>
  ), [effectiveUserId, router, handleRefresh, refreshAttempts, authUser?.id, storeUserId]);

  return (
    <StyledView className="flex-1 bg-background-main">
      <ScreenHeader title="Historik" />
      
      {loading && !refreshing ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4FB4F2" />
        </StyledView>
      ) : error ? (
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={64} color="#f87171" />
          <StyledText className="text-status-error text-lg mt-4 text-center">
            Ett fel uppstod
          </StyledText>
          <StyledText className="text-text-secondary text-center mt-2">
            Kunde inte ladda produkter: {error}
          </StyledText>
          <StyledPressable
            onPress={handleRefresh}
            className="bg-primary p-4 rounded-full mt-6"
          >
            <StyledText className="text-white font-sans-medium">
              Försök igen
            </StyledText>
          </StyledPressable>
        </StyledView>
      ) : (
        <FlatList
          data={products}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4FB4F2']}
              tintColor="#4FB4F2"
            />
          }
        />
      )}
    </StyledView>
  );
} 