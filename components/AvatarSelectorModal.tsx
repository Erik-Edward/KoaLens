// components/AvatarSelectorModal.tsx - med swipe-baserad layout
import React, { useState, useRef } from 'react';
import { View, Text, Modal, Pressable, FlatList, Dimensions } from 'react-native';
import { styled } from 'nativewind';
import { Avatar } from '@/components/Avatar';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

// Gruppera avatarerna efter kategori för bättre organisation
const AVATAR_GROUPS = [
  {
    title: "Cute stil",
    data: [
      { id: 'squirrel-cute', filename: 'squirrel', style: 'cute' as AvatarStyle },
      { id: 'rabbit-cute', filename: 'rabbit', style: 'cute' as AvatarStyle },
      { id: 'koala-cute', filename: 'koala', style: 'cute' as AvatarStyle },
      { id: 'turtle-cute', filename: 'turtle', style: 'cute' as AvatarStyle },
    ]
  },
  {
    title: "Cool stil",
    data: [
      { id: 'squirrel-cool', filename: 'squirrel', style: 'cool' as AvatarStyle },
      { id: 'rabbit-cool', filename: 'rabbit', style: 'cool' as AvatarStyle },
      { id: 'koala-cool', filename: 'koala', style: 'cool' as AvatarStyle },
      { id: 'turtle-cool', filename: 'turtle', style: 'cool' as AvatarStyle },
    ]
  },
  {
    title: "Djur",
    data: [
      { id: 'gorilla', filename: 'gorilla', style: 'supporter' as AvatarStyle },
      { id: 'cow', filename: 'cow', style: 'supporter' as AvatarStyle },
      { id: 'ostrich', filename: 'ostrich', style: 'supporter' as AvatarStyle },
      { id: 'giraffe', filename: 'giraffe', style: 'supporter' as AvatarStyle },
      { id: 'deer', filename: 'deer', style: 'supporter' as AvatarStyle },
      { id: 'alpaca', filename: 'alpaca', style: 'supporter' as AvatarStyle },
      { id: 'panda', filename: 'panda', style: 'supporter' as AvatarStyle },
      { id: 'hippo', filename: 'hippo', style: 'supporter' as AvatarStyle },
      { id: 'moose', filename: 'moose', style: 'supporter' as AvatarStyle },
    ]
  }
];

interface AvatarSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelectAvatar: (filename: string, style: AvatarStyle) => void;
  currentAvatarId?: string | null;
  currentAvatarStyle?: AvatarStyle;
}

export const AvatarSelectorModal: React.FC<AvatarSelectorModalProps> = ({
  visible,
  onClose,
  onSelectAvatar,
  currentAvatarId,
  currentAvatarStyle = 'cute',
}) => {
  const { width } = Dimensions.get('window');
  const itemSize = width / 3 - 20; // 3 avatarer per rad med mellanrum
  
  const handleAvatarSelect = (avatar: { filename: string; style: AvatarStyle }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelectAvatar(avatar.filename, avatar.style);
    onClose();
  };

  // Avgör om en avatar är den nuvarande valda
  const isCurrentAvatar = (avatar: { filename: string; style: AvatarStyle }) => {
    return avatar.filename === currentAvatarId && avatar.style === currentAvatarStyle;
  };

  // Rendera en enskild avatar
  const renderAvatar = ({ item }: { item: { id: string; filename: string; style: AvatarStyle } }) => (
    <StyledPressable
      onPress={() => handleAvatarSelect(item)}
      className="items-center justify-center my-2"
      style={{ width: itemSize }}
    >
      <Avatar
        source={item.filename}
        size="medium"
        style={item.style}
        variant={isCurrentAvatar(item) ? 'selected' : 'default'}
      />
    </StyledPressable>
  );

  // Rendera en grupp med avatarer
  const renderGroup = ({ item }: { item: typeof AVATAR_GROUPS[0] }) => (
    <StyledView className="mb-6">
      <StyledText className="text-text-primary font-sans-medium text-lg px-4 mb-2">
        {item.title}
      </StyledText>
      <FlatList
        data={item.data}
        renderItem={renderAvatar}
        keyExtractor={(avatar) => avatar.id}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 10 }}
        snapToInterval={itemSize}
        decelerationRate="fast"
      />
    </StyledView>
  );

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <StyledView className="flex-1 justify-end bg-black/70">
        <StyledView className="bg-background-main rounded-t-3xl pt-4 pb-10">
          {/* Header */}
          <StyledView className="flex-row justify-between items-center px-6 mb-4">
            <StyledText className="text-text-primary font-sans-bold text-xl">
              Välj avatar
            </StyledText>
            <StyledPressable
              onPress={onClose}
              className="p-2 rounded-full bg-background-light/50"
            >
              <Ionicons name="close" size={24} color="#ffffff" />
            </StyledPressable>
          </StyledView>

          {/* Grouped avatar lists with horizontal scroll */}
          <FlatList
            data={AVATAR_GROUPS}
            renderItem={renderGroup}
            keyExtractor={(group) => group.title}
            showsVerticalScrollIndicator={false}
            style={{ maxHeight: 450 }}
          />
        </StyledView>
      </StyledView>
    </Modal>
  );
};