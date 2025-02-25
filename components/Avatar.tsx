// components/Avatar.tsx - Uppdaterad för att hantera ekorre-avataren
import React from 'react';
import { View, Image, Platform, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';

const StyledView = styled(View);

type AvatarSize = 'small' | 'medium' | 'large';
type AvatarVariant = 'default' | 'selected' | 'locked';

interface AvatarProps {
  source: string;
  size?: AvatarSize;
  style?: AvatarStyle;
  variant?: AvatarVariant;
  isSelected?: boolean;
  bgColor?: string;
}

// Basbildstorlekar i pixlar
const BASE_SIZES = {
  small: 64,
  medium: 128,
  large: 256,
};

// Skalningsjusteringar för specifika avatarer
const SCALE_ADJUSTMENTS: Record<string, { [key in 'cute' | 'cool']: number }> = {
  'rabbit': {
    cute: 0.85,
    cool: 0.85
  },
  'koala': {
    cute: 0.83,
    cool: 0.88
  },
  'squirrel': {  // Lägg till skalningsjusteringar för ekorre
    cute: 0.85,
    cool: 0.85
  }
};

// Statiska bildimporter för supporter avatarer
const SUPPORTER_IMAGES = {
  small: {
    gorilla: require('@/assets/images/avatars/supporter/64/gorilla.png'),
    cow: require('@/assets/images/avatars/supporter/64/cow.png'),
    ostrich: require('@/assets/images/avatars/supporter/64/ostrich.png'),
    giraffe: require('@/assets/images/avatars/supporter/64/giraffe.png'),
    deer: require('@/assets/images/avatars/supporter/64/deer.png'),
    alpaca: require('@/assets/images/avatars/supporter/64/alpaca.png'),
    panda: require('@/assets/images/avatars/supporter/64/panda.png'),
    hippo: require('@/assets/images/avatars/supporter/64/hippo.png'),
    moose: require('@/assets/images/avatars/supporter/64/moose.png'),
  },
  medium: {
    gorilla: require('@/assets/images/avatars/supporter/128/gorilla_1.5x.png'),
    cow: require('@/assets/images/avatars/supporter/128/cow_1.5x.png'),
    ostrich: require('@/assets/images/avatars/supporter/128/ostrich_1.5x.png'),
    giraffe: require('@/assets/images/avatars/supporter/128/giraffe_1.5x.png'),
    deer: require('@/assets/images/avatars/supporter/128/deer_1.5x.png'),
    alpaca: require('@/assets/images/avatars/supporter/128/alpaca_1.5x.png'),
    panda: require('@/assets/images/avatars/supporter/128/panda_1.5x.png'),
    hippo: require('@/assets/images/avatars/supporter/128/hippo_1.5x.png'),
    moose: require('@/assets/images/avatars/supporter/128/moose_1.5x.png'),
  },
  large: {
    gorilla: require('@/assets/images/avatars/supporter/256/gorilla_3x.png'),
    cow: require('@/assets/images/avatars/supporter/256/cow_3x.png'),
    ostrich: require('@/assets/images/avatars/supporter/256/ostrich_3x.png'),
    giraffe: require('@/assets/images/avatars/supporter/256/giraffe_3x.png'),
    deer: require('@/assets/images/avatars/supporter/256/deer_3x.png'),
    alpaca: require('@/assets/images/avatars/supporter/256/alpaca_3x.png'),
    panda: require('@/assets/images/avatars/supporter/256/panda_3x.png'),
    hippo: require('@/assets/images/avatars/supporter/256/hippo_3x.png'),
    moose: require('@/assets/images/avatars/supporter/256/moose_3x.png'),
  },
};

// Statiska bildimporter för veganska avatarer
const VEGAN_IMAGES = {
  cute: {
    small: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cute/64/squirrel.png'),
      rabbit: require('@/assets/images/avatars/cute/64/rabbit.png'),
      koala: require('@/assets/images/avatars/cute/64/koala.png'),
      turtle: require('@/assets/images/avatars/cute/64/turtle.png'),
    },
    medium: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cute/128/squirrel_1.5x.png'),
      rabbit: require('@/assets/images/avatars/cute/128/rabbit_1.5x.png'),
      koala: require('@/assets/images/avatars/cute/128/koala_1.5x.png'),
      turtle: require('@/assets/images/avatars/cute/128/turtle_1.5x.png'),
    },
    large: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cute/256/squirrel_3x.png'),
      rabbit: require('@/assets/images/avatars/cute/256/rabbit_3x.png'),
      koala: require('@/assets/images/avatars/cute/256/koala_3x.png'),
      turtle: require('@/assets/images/avatars/cute/256/turtle_3x.png'),
    },
  },
  cool: {
    small: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cool/64/squirrel_cool.png'),
      rabbit: require('@/assets/images/avatars/cool/64/rabbit_cool.png'),
      koala: require('@/assets/images/avatars/cool/64/koala_cool.png'),
      turtle: require('@/assets/images/avatars/cool/64/turtle_cool.png'),
    },
    medium: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cool/128/squirrel_cool_1.5x.png'),
      rabbit: require('@/assets/images/avatars/cool/128/rabbit_cool_1.5x.png'),
      koala: require('@/assets/images/avatars/cool/128/koala_cool_1.5x.png'),
      turtle: require('@/assets/images/avatars/cool/128/turtle_cool_1.5x.png'),
    },
    large: {
      // Byt från sprout till squirrel
      squirrel: require('@/assets/images/avatars/cool/256/squirrel_cool_3x.png'),
      rabbit: require('@/assets/images/avatars/cool/256/rabbit_cool_3x.png'),
      koala: require('@/assets/images/avatars/cool/256/koala_cool_3x.png'),
      turtle: require('@/assets/images/avatars/cool/256/turtle_cool_3x.png'),
    },
  },
};

export const Avatar: React.FC<AvatarProps> = ({ 
  source, 
  size = 'medium',
  style = 'cute',
  variant = 'default',
  isSelected = false,
  bgColor
}) => {
  const getContainerStyles = () => {
    const baseStyles = "overflow-hidden relative justify-center items-center";
    const sizeStyles = {
      small: "w-16 h-16",
      medium: "w-32 h-32",
      large: "w-64 h-64"
    }[size];

    // Skapa grundläggande variant styles
    const baseVariantStyles = {
      default: "rounded-full",
      selected: "rounded-full border-2 border-primary",
      locked: "rounded-full opacity-50"
    }[variant];

    const shadowStyles = Platform.select({
      ios: "shadow-lg",
      android: "elevation-4"
    });

    // Kombinera alla styles
    return `${baseStyles} ${sizeStyles} ${baseVariantStyles} ${shadowStyles}`;
  };

  const getImageSource = () => {
    // Rensa bort eventuella filändelser och "_cool" suffix från sourcenamnet
    const baseName = source.replace(/(_cool)?\.png$/, '');
    
    try {
      // Kontrollera om detta är en supporteravatar
      if (style === 'supporter') {
        // För supporter-stil, hämta från SUPPORTER_IMAGES
        if (SUPPORTER_IMAGES[size] && SUPPORTER_IMAGES[size][baseName as keyof typeof SUPPORTER_IMAGES[typeof size]]) {
          return SUPPORTER_IMAGES[size][baseName as keyof typeof SUPPORTER_IMAGES[typeof size]];
        } else {
          console.warn(`Kunde inte hitta supporter-avatar för ${baseName} med storlek ${size}`);
          // Returnera en fallback-bild (första supporter-avataren)
          const fallbackKey = Object.keys(SUPPORTER_IMAGES[size])[0] as keyof typeof SUPPORTER_IMAGES[typeof size];
          return SUPPORTER_IMAGES[size][fallbackKey];
        }
      } else {
        // För veganska avatarer (cute eller cool), hämta från VEGAN_IMAGES
        // Kontrollera att stilen är antingen 'cute' eller 'cool'
        const avatarStyle = (style === 'cute' || style === 'cool') ? style : 'cute';
        
        // Säkerställ att baseName är en giltig nyckel för den valda stilen och storleken
        if (VEGAN_IMAGES[avatarStyle][size] && 
            baseName in VEGAN_IMAGES[avatarStyle][size]) {
          return VEGAN_IMAGES[avatarStyle][size][baseName as keyof typeof VEGAN_IMAGES[typeof avatarStyle][typeof size]];
        } else {
          console.warn(`Kunde inte hitta avatar för ${baseName} med stil ${avatarStyle} och storlek ${size}`);
          // Returnera en fallback-bild om den begärda bilden inte finns
          return VEGAN_IMAGES.cute[size].squirrel; // Ändrat från sprout till squirrel
        }
      }
    } catch (error) {
      console.error(`Fel vid hämtning av avatar: ${error}`);
      // Returnera en säker fallback vid fel
      return VEGAN_IMAGES.cute[size].squirrel; // Ändrat från sprout till squirrel
    }
  };

  const getImageDimensions = () => {
    const baseSize = BASE_SIZES[size];
    const baseName = source.replace(/(_cool)?\.png$/, '');
    
    if (style === 'supporter') {
      return {
        width: baseSize,
        height: baseSize,
      };
    } else {
      const adjustments = SCALE_ADJUSTMENTS[baseName];
      const scale = adjustments ? adjustments[style as 'cute' | 'cool'] : 1;
      
      return {
        width: baseSize * scale,
        height: baseSize * scale,
      };
    }
  };

  const containerStyle = {
    backgroundColor: style === 'supporter' && bgColor ? bgColor : '#3a3f44' // Använd bgColor för supporter-läge, annars default bakgrund
  };

  return (
    <StyledView className={getContainerStyles()} style={containerStyle}>
      <StyledView className="absolute inset-0 flex items-center justify-center">
        <Image
          source={getImageSource()}
          style={[
            styles.image,
            getImageDimensions(),
          ]}
          resizeMode="contain"
        />
      </StyledView>
      {variant === 'locked' && (
        <StyledView className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <StyledView className="w-8 h-8 bg-background-dark/80 rounded-full items-center justify-center">
            <Ionicons name="lock-closed" size={16} color="#ffffff" />
          </StyledView>
        </StyledView>
      )}
    </StyledView>
  );
};

const styles = StyleSheet.create({
  image: {
    position: 'absolute',
  },
});