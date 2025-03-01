// components/AvatarCarousel.tsx - Förbättrad centrering
import React, { useState, useRef, useEffect } from 'react';
import { View, Text, Dimensions, FlatList, TouchableOpacity } from 'react-native';
import { styled } from 'nativewind';
import { AvatarOption } from '@/utils/avatarUtils';
import { Avatar } from '@/components/Avatar';
import * as Haptics from 'expo-haptics';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledTouchableOpacity = styled(TouchableOpacity);

interface AvatarCarouselProps {
  avatars: AvatarOption[];
  onSelectAvatar: (avatar: AvatarOption) => void;
  selectedAvatarId: string | null;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8; // 80% av skärmbredden

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ 
  avatars, 
  onSelectAvatar, 
  selectedAvatarId 
}) => {
  const [activeIndex, setActiveIndex] = useState(
    selectedAvatarId ? avatars.findIndex(a => a.id === selectedAvatarId) : 0
  );
  const flatListRef = useRef<FlatList>(null);

  // Beräkna offsets för varje item för att säkerställa korrekt centrering
  const itemOffsets = avatars.map((_, index) => {
    // Beräkna offset för varje item så att det centreras på skärmen
    return index * ITEM_WIDTH;
  });

  // Hantera val av avatar
  const handleSelectAvatar = (avatar: AvatarOption, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveIndex(index);
    onSelectAvatar(avatar);
    scrollToIndex(index);
  };

  // Funktion för att scrolla till ett specifikt index
  const scrollToIndex = (index: number) => {
    if (flatListRef.current && index >= 0 && index < avatars.length) {
      flatListRef.current.scrollToOffset({ 
        offset: index * ITEM_WIDTH,
        animated: true 
      });
    }
  };

  // Scrolla till activeIndex vid första renderingen
  useEffect(() => {
    // Använd en kort timeout för att säkerställa att komponenten har monterats helt
    const timer = setTimeout(() => {
      scrollToIndex(activeIndex);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Hantera när scrollningen slutar
  const handleMomentumScrollEnd = (event: any) => {
    // Beräkna vilket index användaren scrollat till
    const contentOffset = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffset / ITEM_WIDTH);
    
    if (index !== activeIndex && index >= 0 && index < avatars.length) {
      setActiveIndex(index);
      onSelectAvatar(avatars[index]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Rendera en enskild avatar
  const renderAvatar = ({ item, index }: { item: AvatarOption; index: number }) => {
    const isSelected = index === activeIndex;

    return (
      <StyledView 
        style={{ 
          width: ITEM_WIDTH,
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <StyledTouchableOpacity 
          onPress={() => handleSelectAvatar(item, index)}
          className="items-center"
        >
          <StyledView className="mb-6">
            <Avatar
              source={item.filename}
              size="large"
              style="supporter"
              variant={isSelected ? 'selected' : 'default'}
            />
          </StyledView>
          
          <StyledText className={`text-${isSelected ? 'primary' : 'text-primary'} font-sans-bold text-2xl mb-2`}>
            {item.name}
          </StyledText>
          
          <StyledText className="text-text-secondary font-sans text-center px-6 mb-4 max-w-xs">
            {item.description}
          </StyledText>
        </StyledTouchableOpacity>
      </StyledView>
    );
  };

  // Navigera till föregående/nästa avatar
  const navigateToAvatar = (index: number) => {
    if (index >= 0 && index < avatars.length) {
      scrollToIndex(index);
      setActiveIndex(index);
      onSelectAvatar(avatars[index]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

  // Prickar för navigation
  const renderDots = () => {
    return (
      <StyledView className="flex-row justify-center mt-4 space-x-2">
        {avatars.map((_, index) => (
          <StyledTouchableOpacity
            key={index}
            onPress={() => navigateToAvatar(index)}
            className={`w-2.5 h-2.5 rounded-full ${
              index === activeIndex ? 'bg-primary' : 'bg-background-light'
            }`}
          />
        ))}
      </StyledView>
    );
  };

  return (
    <StyledView className="flex-1 px-0">
      <FlatList
        ref={flatListRef}
        data={avatars}
        renderItem={renderAvatar}
        keyExtractor={(item) => item.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={handleMomentumScrollEnd}
        contentContainerStyle={{ 
          paddingHorizontal: (width - ITEM_WIDTH) / 2,
        }}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
      />
      
      {/* Navigationsprickar */}
      {renderDots()}
    </StyledView>
  );
};