// app/(tabs)/(history)/index.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView, Alert } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/stores/useStore';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
// Lägg till import för Analytics
import { logEvent, Events, logScreenView } from '@/lib/analytics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTextInput = styled(TextInput);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledScrollView = styled(ScrollView);

export default function HistoryScreen() {
  const products = useStore((state) => state.products);
  const clearHistory = useStore((state) => state.clearHistory);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  // Lägg till för debugging
  console.log('Current products in store:', products);
  
  // Logga skärmvisning när komponenten monteras
  useEffect(() => {
    logScreenView('History');
    
    // Logga statusstatistik
    logEvent('history_stats', {
      total_products: products.length,
      vegan_products: products.filter(p => p.isVegan).length,
      favorite_products: products.filter(p => p.isFavorite).length
    });
  }, []);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.allIngredients
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFavorites = showFavoritesOnly ? product.isFavorite : true;
    return matchesSearch && matchesFavorites;
  });
  
  // Hantera töming av historik med bekräftelse och loggning
  const handleClearHistory = () => {
    if (products.length === 0) return;
    
    Alert.alert(
      'Rensa historik',
      'Är du säker på att du vill rensa hela historiken? Detta kan inte ångras.',
      [
        {
          text: 'Avbryt',
          style: 'cancel'
        },
        {
          text: 'Rensa',
          style: 'destructive',
          onPress: () => {
            // Logga händelsen innan historiken rensas
            logEvent(Events.CLEAR_HISTORY, { 
              product_count: products.length,
              vegan_product_count: products.filter(p => p.isVegan).length,
              favorite_product_count: products.filter(p => p.isFavorite).length
            });
            
            clearHistory();
          }
        }
      ]
    );
  };
  
  // Hantera favorit-filter med loggning
  const handleToggleFavoritesFilter = () => {
    const newValue = !showFavoritesOnly;
    setShowFavoritesOnly(newValue);
    
    // Logga filterhändelse
    logEvent('toggle_filter', {
      filter_name: 'favorites_only',
      new_value: newValue ? 'true' : 'false',
      matches_count: newValue ? 
        products.filter(p => p.isFavorite).length : 
        products.length
    });
  };
  
  // Hantera sökning med loggning
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    
    // Logga sökhändelse när användaren skriver minst 3 tecken
    if (text.length >= 3) {
      logEvent('search_history', {
        search_term_length: text.length
      });
    }
  };

  return (
    <StyledView className="flex-1 bg-background-main">
      {/* Fixed header section */}
      <StyledView className="pt-12">
        {/* Search Bar */}
        <StyledView className="px-4 mb-4">
          <StyledView className="flex-row items-center bg-background-light/30 rounded-lg px-4 py-3">
            <Ionicons name="search" size={20} color="#9ca3af" />
            <StyledTextInput
              className="flex-1 ml-3 text-text-primary font-sans"
              placeholder="Sök i historik..."
              placeholderTextColor="#9ca3af"
              value={searchQuery}
              onChangeText={handleSearch}
            />
            {searchQuery.length > 0 && (
              <StyledPressable 
                onPress={() => setSearchQuery('')}
                onPressIn={() => {
                  // Logga när användaren rensar sökningen
                  if (searchQuery.length > 0) {
                    logEvent('clear_search', {
                      search_term_length: searchQuery.length
                    });
                  }
                }}
              >
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </StyledPressable>
            )}
          </StyledView>
        </StyledView>

        {/* Filters */}
        <StyledView className="flex-row justify-between px-4 mb-4">
          <StyledPressable
            onPress={handleToggleFavoritesFilter}
            className={`flex-row items-center p-2 rounded-lg ${
              showFavoritesOnly ? 'bg-primary' : 'bg-background-light/30'
            }`}
          >
            <Ionicons
              name={showFavoritesOnly ? 'star' : 'star-outline'}
              size={20}
              color="#ffffff"
            />
            <StyledText className="text-text-primary font-sans ml-2">
              Visa favoriter
            </StyledText>
          </StyledPressable>

          {products.length > 0 && (
            <StyledPressable
              onPress={handleClearHistory}
              className="bg-status-error/80 p-2 rounded-lg"
            >
              <StyledText className="text-text-primary font-sans">
                Rensa historik
              </StyledText>
            </StyledPressable>
          )}
        </StyledView>
      </StyledView>

      {/* Scrollable content */}
      <StyledScrollView className="flex-1">
        <StyledView className="px-4">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))
          ) : (
            <StyledView className="py-12">
              <StyledView className="bg-background-light/20 p-6 rounded-lg items-center">
                <Ionicons name="scan-outline" size={48} color="#9ca3af" />
                <StyledText className="text-text-secondary text-center mt-4 font-sans">
                  {products.length === 0
                    ? 'Inga skanningar än. Börja med att skanna en produkt!'
                    : 'Inga produkter matchar din sökning.'}
                </StyledText>
              </StyledView>
            </StyledView>
          )}
        </StyledView>
        <StyledView className="h-4" />
      </StyledScrollView>
    </StyledView>
  );
}