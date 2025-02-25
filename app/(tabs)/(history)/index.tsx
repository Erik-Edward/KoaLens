import React, { useState } from 'react';
import { View, Text, ScrollView, TextInput, Pressable, SafeAreaView } from 'react-native';
import { ProductCard } from '@/components/ProductCard';
import { useStore } from '@/stores/useStore';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';

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

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.allIngredients
      .join(' ')
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesFavorites = showFavoritesOnly ? product.isFavorite : true;
    return matchesSearch && matchesFavorites;
  });

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
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <StyledPressable onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#9ca3af" />
              </StyledPressable>
            )}
          </StyledView>
        </StyledView>

        {/* Filters */}
        <StyledView className="flex-row justify-between px-4 mb-4">
          <StyledPressable
            onPress={() => setShowFavoritesOnly(!showFavoritesOnly)}
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
              onPress={clearHistory}
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