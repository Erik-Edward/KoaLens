import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { ScannedProduct } from '@/stores/types';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/stores/useStore';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledImage = styled(Image);

interface ProductCardProps {
  product: ScannedProduct;
  onPress?: () => void;
  onFavoriteToggle?: () => void;
  onDelete?: () => void;
}

export const ProductCard: React.FC<ProductCardProps> = ({ 
  product, 
  onPress, 
  onFavoriteToggle, 
  onDelete 
}) => {
  const toggleFavorite = useStore((state) => state.toggleFavorite);

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      router.push({
        pathname: '/(tabs)/(history)/[id]',
        params: { id: product.id }
      });
    }
  };

  const handleToggleFavorite = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle();
    } else {
      toggleFavorite(product.id);
    }
  };

  const formattedDate = formatDistanceToNow(new Date(product.timestamp), {
    addSuffix: true,
    locale: sv,
  });

  return (
    <StyledPressable
      onPress={handlePress}
      className="bg-background-light/30 rounded-lg p-4 mb-4"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }]
      })}
    >
      <StyledView className="flex-row">
        {/* Product Image */}
        <StyledImage
          source={{ uri: product.imageUri }}
          className="w-16 h-16 rounded-lg bg-background-dark"
        />

        {/* Product Information */}
        <StyledView className="flex-1 ml-4">
          {/* Header with Status and Favorite */}
          <StyledView className="flex-row justify-between items-center">
            {/* Status Indicator */}
            <StyledView className="flex-row items-center">
              <StyledView
                className={`w-3 h-3 rounded-full mr-2 ${
                  product.isVegan ? 'bg-status-success' : 'bg-status-error'
                }`}
              />
              <StyledText className="text-text-primary font-sans-medium text-base">
                {product.isVegan ? 'Vegansk' : 'Ej vegansk'}
              </StyledText>
            </StyledView>

            {/* Favorite Button */}
            <StyledView className="flex-row">
              <StyledPressable
                onPress={handleToggleFavorite}
                className="p-2"
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={product.isFavorite ? 'star' : 'star-outline'}
                  size={24}
                  color={product.isFavorite ? '#ffd700' : '#ffffff'}
                />
              </StyledPressable>
              
              {onDelete && (
                <StyledPressable
                  onPress={onDelete}
                  className="p-2"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={22}
                    color="#ffffff"
                  />
                </StyledPressable>
              )}
            </StyledView>
          </StyledView>

          {/* Timestamp */}
          <StyledText className="text-text-secondary font-sans text-sm mt-1">
            {formattedDate}
          </StyledText>

          {/* Non-vegan Ingredients */}
          {!product.isVegan && product.nonVeganIngredients.length > 0 && (
            <StyledText 
              numberOfLines={2}
              className="text-status-error/90 font-sans text-sm mt-1"
            >
              Innehåller: {product.nonVeganIngredients.join(', ')}
            </StyledText>
          )}

          {/* Confidence */}
          <StyledView className="flex-row items-center mt-1">
            <StyledText className="text-text-secondary font-sans text-sm">
              Konfidensgrad: {Math.round(product.confidence * 100)}%
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledPressable>
  );
};