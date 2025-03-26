/**
 * Historikskärm för att visa scannade produkter
 * Använder den nya produktmodellen och våra custom hooks
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Alert, StatusBar, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScreenHeader } from '@/components/ScreenHeader';
import { NewProductCard } from '@/components/NewProductCard';
import { useProducts } from '@/hooks/useProducts';
import { styled } from 'nativewind';
import { Product } from '@/models/productModel';
import { Ionicons } from '@expo/vector-icons';
import { Pressable } from 'react-native';
import { router, useNavigation } from 'expo-router';
import { useStore } from '@/stores/useStore';
import { ProductRepository } from '@/services/productRepository';

// Färgkonstanter
export const HISTORY_HEADER_COLOR = '#232A35';
export const HISTORY_ACCENT_COLOR = '#FFD700';

// Styled komponenter
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);

export default function HistoryScreen() {
  const navigation = useNavigation();
  
  // StatusBar hantering - återställs när skärmen lämnas
  useEffect(() => {
    // Sätt StatusBar för denna skärm
    StatusBar.setBarStyle('light-content');
    StatusBar.setBackgroundColor(HISTORY_HEADER_COLOR);
    
    // Lyssna på när denna skärm får fokus för att återställa StatusBar
    const unsubscribeFocus = navigation.addListener('focus', () => {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(HISTORY_HEADER_COLOR);
    });
    
    // Lyssna på när denna skärm tappar fokus (om vi vill städa upp)
    const unsubscribeBlur = navigation.addListener('blur', () => {
      // Vi städar inte upp här - låter nästa skärm sätta sina egna inställningar
    });
    
    return () => {
      unsubscribeFocus();
      unsubscribeBlur();
    };
  }, [navigation]);

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
      <Ionicons name="camera-outline" size={64} color="#4ECDC4" />
      <StyledText className="text-text-primary text-lg mt-4 text-center font-sans-medium">
        {effectiveUserId ? 'Din historik är tom' : 'Logga in för att se din historik'}
      </StyledText>
      <StyledText className="text-text-secondary text-center mt-2">
        {effectiveUserId 
          ? 'Skanna produkter och tryck på "spara" för att se dem här' 
          : 'Du behöver vara inloggad för att spara produkter'}
      </StyledText>
      
      <StyledPressable
        onPress={() => router.push('/(tabs)/(scan)')}
        className="bg-[#3D4250] p-4 rounded-full mt-6 shadow-md"
      >
        <StyledText className="text-white font-sans-medium">
          Skanna en produkt
        </StyledText>
      </StyledPressable>
      
      {effectiveUserId && (
        <StyledPressable
          onPress={handleRefresh}
          className="bg-[#232A35] p-3 rounded-full mt-4 flex-row items-center border border-[#353E4A]"
        >
          <Ionicons name="refresh-outline" size={18} color="#4ECDC4" style={{ marginRight: 6 }} />
          <StyledText className="text-white font-sans-medium">
            Uppdatera manuellt
          </StyledText>
        </StyledPressable>
      )}

      {/* Diagnostisk information i utvecklingsläge */}
      {__DEV__ && effectiveUserId && (
        <StyledView className="mt-8 p-3 border border-[#353E4A] rounded-md w-full bg-[#232A35]/50">
          <StyledText className="font-sans-medium">Diagnostisk information:</StyledText>
          <StyledText className="text-text-secondary text-sm mt-1">Användar-ID: {effectiveUserId}</StyledText>
          <StyledText className="text-text-secondary text-sm">Källa: {authUser?.id ? 'auth' : storeUserId ? 'store' : 'annan'}</StyledText>
          <StyledText className="text-text-secondary text-sm">Uppdateringsförsök: {refreshAttempts}</StyledText>
        </StyledView>
      )}
    </StyledView>
  ), [effectiveUserId, router, handleRefresh, refreshAttempts, authUser?.id, storeUserId]);

  return (
    <StyledView className="flex-1 bg-[#121212]">
      {/* Vi behöver inte ha StatusBar-komponenten här då vi använder StatusBar API i useEffect */}
      
      {/* Header som täcker hela statusfältsområdet */}
      <StyledView 
        className="bg-[#232A35] absolute top-0 left-0 right-0 rounded-b-xl" 
        style={{ 
          height: Platform.OS === 'ios' ? 120 : 100,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4
        }} 
      />
      
      {/* Header innehåll med SafeAreaView för korrekt padding */}
      <StyledSafeAreaView className="bg-[#232A35] rounded-b-xl" edges={['top']}>
        <StyledView className="px-6 pb-4">
          <StyledText className="text-white text-2xl font-bold mb-1">Historik</StyledText>
          <StyledText className="text-white/90 text-base">Dina sparade produktanalyser</StyledText>
        </StyledView>
      </StyledSafeAreaView>
      
      {/* Extra utrymme efter headern för att ge plats till innehållet */}
      <StyledView className="h-6" />
      
      {loading && !refreshing ? (
        <StyledView className="flex-1 justify-center items-center">
          <ActivityIndicator size="large" color="#4ECDC4" />
        </StyledView>
      ) : error ? (
        <StyledView className="flex-1 justify-center items-center p-4">
          <Ionicons name="alert-circle-outline" size={64} color="#ff6b6b" />
          <StyledText className="text-[#ff6b6b] text-lg mt-4 text-center">
            Ett fel uppstod
          </StyledText>
          <StyledText className="text-text-secondary text-center mt-2">
            Kunde inte ladda produkter: {error}
          </StyledText>
          <StyledPressable
            onPress={handleRefresh}
            className="bg-[#3D4250] p-4 rounded-full mt-6 shadow-md"
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
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 16, paddingBottom: 100 }}
          ListEmptyComponent={renderEmptyList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#4ECDC4']}
              tintColor="#4ECDC4"
            />
          }
        />
      )}
    </StyledView>
  );
} 