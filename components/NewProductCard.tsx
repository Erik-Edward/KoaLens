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
  // --- ADD isUncertain STATUS --- 
  const isUncertain = product.analysis.isUncertain;
  // -----------------------------
  
  // Få watchedIngredients från analysen
  const watchedIngredients = product.analysis.watchedIngredients || [];
  
  // Hitta de icke-veganska ingredienserna
  const nonVeganIngredients = watchedIngredients
    .filter(item => item.reason === "non-vegan")
    .map(item => item.name);

  // --- NEW: Function to get status details (color, icon, text) ---
  const getStatusDetails = () => {
    if (isUncertain) {
      return {
        bgColor: 'bg-amber-500',
        icon: 'help-circle' as const, // Explicit type for Ionicons name
        iconColor: '#ffffff', // White icon on amber bg
        textColor: 'text-white',
        text: 'Osäker'
      };
    } else if (isVegan) {
      return {
        bgColor: 'bg-emerald-500', // Use emerald for consistency
        icon: 'checkmark-circle' as const,
        iconColor: '#ffffff',
        textColor: 'text-white',
        text: 'Vegansk'
      };
    } else {
      return {
        bgColor: 'bg-red-500',
        icon: 'close-circle' as const,
        iconColor: '#ffffff',
        textColor: 'text-white',
        text: 'Ej vegansk'
      };
    }
  };
  const statusDetails = getStatusDetails();

  // --- NEW: Function to get confidence level text ---
  const getConfidenceLevelText = (confidence: number): string => {
    if (confidence >= 0.8) return "Hög";
    if (confidence >= 0.5) return "Medel";
    return "Låg";
  };
  // ----------------------------------------------------

  return (
    <StyledPressable
      onPress={handlePress}
      // Use a slightly lighter background for the card itself
      className="bg-[#2a303c] rounded-xl mb-4 overflow-hidden" 
      style={({ pressed }) => ({
        opacity: pressed ? 0.85 : 1,
        // Removed transform scale for cleaner look
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 3,
        elevation: 3,
      })}
    >
      <StyledView className="flex-row">
        {/* --- NEW: Status Indicator Block (Left Side) --- */}
        <StyledView 
          className={`w-24 ${statusDetails.bgColor} justify-center items-center p-3`}
        >
          <Ionicons 
            name={statusDetails.icon} 
            size={32} 
            color={statusDetails.iconColor} 
          />
          <StyledText 
            className={`mt-1 ${statusDetails.textColor} font-sans-bold text-center text-sm`}
          >
            {statusDetails.text}
          </StyledText>
        </StyledView>
        {/* --------------------------------------------- */}

        {/* Product Information (Right Side) */}
        <StyledView className="flex-1 p-4">
          {/* Header - Name and Actions */}
          <StyledView className="flex-row justify-between items-start mb-1">
            {/* Product Name */}
            <StyledText 
              className="text-text-primary font-sans-bold text-lg flex-1 mr-2" 
              numberOfLines={2}
            >
              {product.metadata.name}
            </StyledText>

            {/* Action Buttons */}
            <StyledView className="flex-row">
              <StyledPressable
                onPress={handleToggleFavorite}
                className="p-1.5 ml-1" // Adjusted padding/margin
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={product.metadata.isFavorite ? 'star' : 'star-outline'}
                  size={20} // Slightly smaller icon
                  color={product.metadata.isFavorite ? '#ffcc00' : '#a0a0a0'} // Adjusted unfavorite color
                />
              </StyledPressable>
              
              {onDelete && (
                <StyledPressable
                  onPress={onDelete}
                  className="p-1.5 ml-1"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20} // Slightly smaller icon
                    color="#a0a0a0" // Adjusted color
                  />
                </StyledPressable>
              )}
            </StyledView>
          </StyledView>

          {/* Timestamp */}
          <StyledText className="text-text-secondary font-sans text-sm mb-1">
            {formattedDate}
          </StyledText>

          {/* --- UPDATED: Confidence Level --- */}
          <StyledView className="flex-row items-center">
            <StyledText className="text-text-secondary font-sans text-sm">
              Säkerhet: <StyledText className="font-sans-medium text-text-primary">{getConfidenceLevelText(product.analysis.confidence)}</StyledText>
            </StyledText>
          </StyledView>
          {/* --------------------------------- */}

          {/* Non-vegan Ingredients Info (Optional - Keep it concise) */}
          {!isVegan && !isUncertain && nonVeganIngredients.length > 0 && (
            <StyledText 
              numberOfLines={1} // More concise
              className="text-red-400 font-sans text-xs mt-1"
            >
              Innehåller icke-veganskt
            </StyledText>
          )}
          {isUncertain && (
             <StyledText 
              numberOfLines={1} // More concise
              className="text-amber-400 font-sans text-xs mt-1"
            >
              Innehåller osäkert
            </StyledText>
          )}

        </StyledView>
      </StyledView>
    </StyledPressable>
  );
}; 