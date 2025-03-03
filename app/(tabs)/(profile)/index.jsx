// app/(tabs)/(profile)/index.jsx
import React, { useState } from 'react';
import { View, Text, Pressable, SafeAreaView, ScrollView } from 'react-native';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { SupportModal } from '../../../components/SupportModal';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

function ProfileScreen() {
  const [showSupportModal, setShowSupportModal] = useState(false);

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StyledScrollView className="flex-1">
        <StyledView className="px-4 pt-16 pb-6">
          <StyledText className="text-text-primary font-sans-bold text-2xl text-center">
            Min Profil
          </StyledText>
        </StyledView>

        <StyledView className="px-4 space-y-3">
          {/* Support button */}
          <StyledPressable 
            onPress={() => setShowSupportModal(true)}
            className="flex-row items-center p-4 bg-background-light/80 rounded-lg active:opacity-70"
          >
            <Ionicons name="help-circle-outline" size={24} color="#ffffff" />
            <StyledText className="text-text-primary font-sans-medium text-lg ml-3">
              Support
            </StyledText>
            <Ionicons 
              name="chevron-forward" 
              size={24} 
              color="#ffffff" 
              style={{ marginLeft: 'auto' }}
            />
          </StyledPressable>
        </StyledView>
      </StyledScrollView>

      {/* Support Modal */}
      <SupportModal
        visible={showSupportModal}
        onClose={() => setShowSupportModal(false)}
      />
    </StyledSafeAreaView>
  );
}

export default ProfileScreen;