import React from 'react';
import { View, Text, Pressable, Image } from 'react-native';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { Product } from '@/models/productModel';
import { HISTORY_HEADER_COLOR } from '@/app/(tabs)/(history)/history';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledImage = styled(Image);

interface NewProductCardProps {
  product: Product;
  onPress?: () => void;
  onFavoriteToggle?: () => void;
  onDelete?: () => void;
  useNewDetailPage?: boolean;
}

export const NewProductCard: React.FC<NewProductCardProps> = ({ 
  product, 
  onPress, 
  onFavoriteToggle, 
  onDelete,
  useNewDetailPage = false
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Navigera till detaljsidan - använd alltid den vanliga [id] routen
      router.push({
        pathname: '/(tabs)/(history)/[id]',
        params: { id: product.id }
      });
    }
  };

  const handleToggleFavorite = () => {
    if (onFavoriteToggle) {
      onFavoriteToggle();
    }
  };

  // Formatera datum för visning
  const formattedDate = formatDistanceToNow(
    new Date(product.metadata.scanDate), 
    { addSuffix: true, locale: sv }
  );

  // Få isVegan status från analysen
  const isVegan = product.analysis.isVegan;
  
  // Få watchedIngredients från analysen
  const watchedIngredients = product.analysis.watchedIngredients || [];
  
  // Hitta de icke-veganska ingredienserna
  const nonVeganIngredients = watchedIngredients
    .filter(item => item.reason === "non-vegan")
    .map(item => item.name);

  return (
    <StyledPressable
      onPress={handlePress}
      className="bg-[#232A35]/40 rounded-xl p-4 mb-4 border border-[#232A35]/60"
      style={({ pressed }) => ({
        opacity: pressed ? 0.7 : 1,
        transform: [{ scale: pressed ? 0.98 : 1 }],
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
      })}
    >
      <StyledView className="flex-row">
        {/* Product Image */}
        <StyledImage
          source={{ uri: product.metadata.imageUri }}
          className="w-16 h-16 rounded-lg bg-background-dark border border-[#ffffff]/10"
        />

        {/* Product Information */}
        <StyledView className="flex-1 ml-4">
          {/* Header with Status and Favorite */}
          <StyledView className="flex-row justify-between items-center">
            {/* Status Indicator */}
            <StyledView className="flex-row items-center">
              <StyledView
                className={`w-3 h-3 rounded-full mr-2 ${
                  isVegan ? 'bg-[#4CAF50]' : 'bg-[#ff6b6b]'
                }`}
              />
              <StyledText className="text-text-primary font-sans-medium text-base">
                {isVegan ? 'Vegansk' : 'Ej vegansk'}
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
                  name={product.metadata.isFavorite ? 'star' : 'star-outline'}
                  size={24}
                  color={product.metadata.isFavorite ? '#ffcc00' : '#ffffff'}
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
          {!isVegan && nonVeganIngredients.length > 0 && (
            <StyledText 
              numberOfLines={2}
              className="text-[#ff6b6b]/90 font-sans text-sm mt-1"
            >
              Innehåller: {nonVeganIngredients.join(', ')}
            </StyledText>
          )}

          {/* Confidence */}
          <StyledView className="flex-row items-center mt-1">
            <StyledText className="text-text-secondary font-sans text-sm">
              Konfidensgrad: <StyledText className="text-[#ffcc00]">{Math.round(product.analysis.confidence * 100)}%</StyledText>
            </StyledText>
          </StyledView>
        </StyledView>
      </StyledView>
    </StyledPressable>
  );
}; 