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
  showTitle?: boolean;
}

const { width } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;

export const AvatarCarousel: React.FC<AvatarCarouselProps> = ({ 
  avatars, 
  onSelectAvatar, 
  selectedAvatarId 
}) => {
  const [activeIndex, setActiveIndex] = useState(
    selectedAvatarId ? avatars.findIndex(a => a.id === selectedAvatarId) : 0
  );
  const flatListRef = useRef<FlatList>(null);

  // onViewableItemsChanged ger en snabbare uppdatering
  const viewabilityConfig = { viewAreaCoveragePercentThreshold: 50 };
  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: any[] }) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index;
      if (index !== activeIndex && index !== null) {
        setActiveIndex(index);
        onSelectAvatar(avatars[index]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }
    }
  }).current;

  const scrollToIndex = (index: number) => {
    if (flatListRef.current && index >= 0 && index < avatars.length) {
      flatListRef.current.scrollToOffset({ 
        offset: index * ITEM_WIDTH,
        animated: true 
      });
    }
  };

  const handleSelectAvatar = (avatar: AvatarOption, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveIndex(index);
    onSelectAvatar(avatar);
    scrollToIndex(index);
  };

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
              style={item.style}
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

  const navigateToAvatar = (index: number) => {
    if (index >= 0 && index < avatars.length) {
      scrollToIndex(index);
      setActiveIndex(index);
      onSelectAvatar(avatars[index]);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  };

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
        keyExtractor={(item) => `${item.id}-${item.style}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        snapToAlignment="start"
        decelerationRate="fast"
        contentContainerStyle={{ 
          paddingHorizontal: (width - ITEM_WIDTH) / 2,
        }}
        initialScrollIndex={activeIndex}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
      />
      
      {/* Navigationsprickar */}
      {renderDots()}
    </StyledView>
  );
};