// app/(tabs)/(history)/[id].tsx
import { View, Text, ScrollView, Image, Share, Pressable, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useStore } from '@/stores/useStore';
import { format } from 'date-fns';
import { sv } from 'date-fns/locale';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect } from 'react';
import { styled } from 'nativewind';
// Lägg till import för Analytics
import { logEvent, Events, logScreenView } from '@/lib/analytics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledImage = styled(Image);

// Sektion-komponent för bättre struktur
const Section: React.FC<{
  title: string;
  icon?: string;
  iconColor?: string;
  children: React.ReactNode;
  className?: string;
}> = ({ title, icon, iconColor = '#ffffff', children, className = '' }) => (
  <StyledView className={`mb-6 ${className}`}>
    <StyledView className="flex-row items-center mb-2">
      {icon && (
        <Ionicons 
          name={icon as any} 
          size={20} 
          color={iconColor}
          style={{ marginRight: 8 }}
        />
      )}
      <StyledText className="text-text-primary font-sans-medium text-lg">
        {title}
      </StyledText>
    </StyledView>
    {children}
  </StyledView>
);

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  const product = useStore(useCallback(
    (state) => state.products.find((p) => p.id === id),
    [id]
  ));
  
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const removeProduct = useStore((state) => state.removeProduct);
  
  // Logga skärmvisning när komponenten monteras
  useEffect(() => {
    if (product) {
      logScreenView('ProductDetail');
      
      // Logga produktdetaljer
      logEvent('view_product_details', {
        is_vegan: product.isVegan,
        is_favorite: product.isFavorite,
        confidence: Math.round(product.confidence * 100),
        non_vegan_ingredients_count: product.nonVeganIngredients.length,
        watched_ingredients_count: product.watchedIngredientsFound.length,
        total_ingredients: product.allIngredients.length
      });
    }
  }, [product]);

  if (!product) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <StyledText className="text-text-primary font-sans">
          Produkten hittades inte
        </StyledText>
      </StyledView>
    );
  }

  const handleShare = async () => {
    try {
      const message = `
KoaLens Analys
${product.isVegan ? '✓ Produkten är vegansk' : '✗ Produkten är inte vegansk'}
Säkerhet: ${Math.round(product.confidence * 100)}%

${product.nonVeganIngredients.length > 0 ? `Ej veganska ingredienser:\n${product.nonVeganIngredients.join(', ')}\n` : ''}
${product.watchedIngredientsFound.length > 0 ? `\nBevakade ingredienser:\n${product.watchedIngredientsFound.map(ing => `${ing.name} - ${ing.description}`).join('\n')}\n` : ''}
Ingredienslista:
${product.allIngredients.join(', ')}

Analys:
${product.reasoning}`;

      await Share.share({ message });
      
      // Logga delningshändelse
      logEvent(Events.SHARE_RESULT, {
        is_vegan: product.isVegan,
        confidence: Math.round(product.confidence * 100),
        content_length: message.length
      });
      
    } catch (error) {
      console.error('Error sharing product:', error);
      
      // Logga delningsfel
      logEvent('share_error', {
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  };

  const handleRemove = () => {
    Alert.alert(
      'Ta bort produkt',
      'Är du säker på att du vill ta bort denna produkt från historiken?',
      [
        {
          text: 'Avbryt',
          style: 'cancel'
        },
        {
          text: 'Ta bort',
          style: 'destructive',
          onPress: () => {
            // Logga borttagnigshändelse
            logEvent(Events.DELETE_PRODUCT, {
              is_vegan: product.isVegan,
              is_favorite: product.isFavorite
            });
            
            removeProduct(product.id);
            router.back();
          }
        }
      ]
    );
  };

  const handleToggleFavorite = () => {
    // Logga favoritändring
    logEvent(Events.TOGGLE_FAVORITE, {
      product_id: product.id,
      is_vegan: product.isVegan,
      previous_state: product.isFavorite ? 'favorite' : 'not_favorite',
      new_state: product.isFavorite ? 'not_favorite' : 'favorite'
    });
    
    toggleFavorite(product.id);
  };

  const formattedDate = format(new Date(product.timestamp), 'PPP', {
    locale: sv,
  });

  return (
    <StyledScrollView className="flex-1 bg-background-main">
      {/* Produktbild */}
      <StyledView className="w-full aspect-square bg-gray-900">
        <StyledImage
          source={{ uri: product.imageUri }}
          className="w-full h-full"
          resizeMode="contain"
        />
      </StyledView>

      {/* Innehåll */}
      <StyledView className="p-4">
        {/* Status header */}
        <StyledView className={`p-4 rounded-lg mb-6 ${
          product.isVegan ? 'bg-status-success/20' : 'bg-status-error/20'
        }`}>
          <StyledView className="flex-row items-center justify-between">
            <StyledView className="flex-row items-center">
              <StyledView className={`w-3 h-3 rounded-full mr-2 ${
                product.isVegan ? 'bg-status-success' : 'bg-status-error'
              }`} />
              <StyledText className="text-text-primary font-sans-medium text-xl">
                {product.isVegan ? 'Vegansk' : 'Inte vegansk'}
              </StyledText>
            </StyledView>
            <StyledPressable
              onPress={handleToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={product.isFavorite ? 'star' : 'star-outline'}
                size={24}
                color={product.isFavorite ? '#ffd700' : '#ffffff'}
              />
            </StyledPressable>
          </StyledView>
          <StyledText className="text-text-secondary font-sans mt-2">
            Skannad: {formattedDate}
          </StyledText>
          <StyledText className="text-text-primary font-sans mt-2">
            Säkerhet: {Math.round(product.confidence * 100)}%
          </StyledText>
        </StyledView>

        {/* Icke-veganska ingredienser */}
        {!product.isVegan && product.nonVeganIngredients.length > 0 && (
          <Section 
            title="Ej veganska ingredienser"
            icon="alert-circle-outline"
            iconColor="#f44336"
          >
            {product.nonVeganIngredients.map((ingredient, index) => (
              <StyledText key={index} className="text-status-error/90 font-sans">
                • {ingredient}
              </StyledText>
            ))}
          </Section>
        )}

        {/* Bevakade ingredienser */}
        {product.watchedIngredientsFound.length > 0 && (
          <Section 
            title="Bevakade ingredienser"
            icon="eye-outline"
            iconColor="#ffd33d"
          >
            {product.watchedIngredientsFound.map((ingredient, index) => (
              <StyledView key={index} className="mb-3 bg-background-light/30 rounded-lg p-3">
                <StyledText className="text-primary font-sans-medium">
                  • {ingredient.name}
                </StyledText>
                <StyledText className="text-text-secondary font-sans text-sm mt-1 ml-4">
                  {ingredient.description}
                </StyledText>
              </StyledView>
            ))}
          </Section>
        )}

        {/* Alla ingredienser */}
        <Section 
          title="Ingredienslista"
          icon="list-outline"
        >
          {product.allIngredients.map((ingredient, index) => (
            <StyledText key={index} className="text-text-primary font-sans">
              • {ingredient}
            </StyledText>
          ))}
        </Section>

        {/* Analys */}
        <Section 
          title="Analys"
          icon="analytics-outline"
        >
          <StyledText className="text-text-primary font-sans">
            {product.reasoning}
          </StyledText>
        </Section>

        {/* Knappar */}
        <StyledView className="flex-row justify-between mt-4 gap-2">
          <StyledPressable
            onPress={handleShare}
            className="flex-1 bg-primary py-3 rounded-lg items-center active:opacity-80"
          >
            <StyledText className="text-text-inverse font-sans-medium">
              Dela
            </StyledText>
          </StyledPressable>
          <StyledPressable
            onPress={handleRemove}
            className="flex-1 bg-status-error py-3 rounded-lg items-center active:opacity-80"
          >
            <StyledText className="text-text-primary font-sans-medium">
              Ta bort
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    </StyledScrollView>
  );
}