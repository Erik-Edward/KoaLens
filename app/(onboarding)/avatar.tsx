// app/(onboarding)/avatar.tsx - Förbättrad för alla enhetsstorlekar
import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView, useWindowDimensions, StyleSheet } from 'react-native';
import { styled } from 'nativewind';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useStore } from '@/stores/useStore';
import { getSupporterAvatars, getAvailableAvatars, AvatarOption } from '@/utils/avatarUtils';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { AvatarCarousel } from '@/components/AvatarCarousel';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledScrollView = styled(ScrollView);
const StyledSafeAreaView = styled(SafeAreaView);

type StyleType = 'cute' | 'cool';

export default function AvatarScreen() {
  const [years, setYears] = useState(0);
  const [selectedStyle, setSelectedStyle] = useState<StyleType>('cute');
  const [selectedAvatar, setSelectedAvatar] = useState<AvatarOption | null>(null);
  const initializedRef = useRef(false);
  const { height, width } = useWindowDimensions();
  
  const setVeganYears = useStore((state) => state.setVeganYears);
  const setAvatar = useStore((state) => state.setAvatar);
  const veganStatus = useStore((state) => state.veganStatus.status);

  // Avgör om användaren är vegan
  const isVegan = veganStatus === 'vegan';

  // Hämta rätt avatarer baserat på veganStatus och år
  const availableAvatars = isVegan 
    ? getAvailableAvatars(years, selectedStyle)
    : getSupporterAvatars();

  // Välj initial avatar, men bara en gång
  useEffect(() => {
    if (!initializedRef.current && availableAvatars.length > 0) {
      if (isVegan) {
        // För veganska användare, välj den senaste tillgängliga avataren baserat på år
        const latestAvatar = availableAvatars[availableAvatars.length - 1];
        setSelectedAvatar(latestAvatar);
      } else {
        // För supporter, välj första avataren
        setSelectedAvatar(availableAvatars[0]);
      }
      initializedRef.current = true;
    }
  }, [availableAvatars, isVegan]);

  const handleStyleChange = async (style: StyleType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyle(style);
    
    // När stilen ändras, uppdatera avataren baserat på den nya stilen och nuvarande år
    const newAvatars = getAvailableAvatars(years, style);
    if (newAvatars.length > 0) {
      setSelectedAvatar(newAvatars[newAvatars.length - 1]);
    }
  };

  const handleYearChange = (value: number) => {
    setYears(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // När års-slidern dras, uppdatera manuellt selectedAvatar
    if (isVegan) {
      const newAvatars = getAvailableAvatars(value, selectedStyle);
      if (newAvatars.length > 0) {
        // Välj den senaste avataren som är tillgänglig för detta årsantal
        const latestAvatar = newAvatars[newAvatars.length - 1];
        
        // Endast uppdatera om avataren faktiskt har ändrats
        if (!selectedAvatar || selectedAvatar.id !== latestAvatar.id) {
          setSelectedAvatar(latestAvatar);
        }
      }
    }
  };

  const handleSelectAvatar = (avatar: AvatarOption) => {
    setSelectedAvatar(avatar);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleContinue = async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    
    if (!selectedAvatar && availableAvatars.length > 0) {
      setSelectedAvatar(availableAvatars[0]);
    }

    // Använd den valda avataren eller den första tillgängliga
    const avatar = selectedAvatar || (availableAvatars.length > 0 ? availableAvatars[0] : null);
    
    if (avatar) {
      // För veganska användare använder vi selectedStyle, för supporter används 'supporter'
      const avatarStyle = isVegan ? selectedStyle : 'supporter';
      
      await setVeganYears(isVegan ? years : 0);
      await setAvatar(avatarStyle, avatar.id);
      router.push('/(onboarding)/guide');
    }
  };

  // Anpassa UI-element baserat på veganStatus
  const headerText = isVegan ? "Hur länge har du varit vegan" : "Välj din karaktär";
  const yearsText = years === 0 
    ? "Nybliven vegan" 
    : years === 5 
      ? "5+ år" 
      : `${years} år`;

  // Beräkna adaptiva dimensioner
  const headerTop = Math.max(height * 0.05, 20);
  const avatarContainerSize = Math.min(width * 0.5, height * 0.2, 200);
  const avatarSize = avatarContainerSize * 0.9;
  const spacingVertical = Math.max(height * 0.02, 12);

  // Funktion för att rendera vegansidans UI
  const renderVeganUI = () => (
    <>
      {/* Style val knappar */}
      <StyledView className="flex-row justify-center space-x-3 px-6 mb-6">
        <StyledPressable
          onPress={() => handleStyleChange('cute')}
          className={`px-6 py-3 rounded-xl ${
            selectedStyle === 'cute' ? 'bg-primary' : 'bg-background-light/30'
          }`}
        >
          <StyledText 
            className={`font-sans-medium ${
              selectedStyle === 'cute' ? 'text-text-inverse' : 'text-text-primary'
            }`}
          >
            Lekfull
          </StyledText>
        </StyledPressable>

        <StyledPressable
          onPress={() => handleStyleChange('cool')}
          className={`px-6 py-3 rounded-xl ${
            selectedStyle === 'cool' ? 'bg-primary' : 'bg-background-light/30'
          }`}
        >
          <StyledText 
            className={`font-sans-medium ${
              selectedStyle === 'cool' ? 'text-text-inverse' : 'text-text-primary'
            }`}
          >
            Stilren
          </StyledText>
        </StyledPressable>
      </StyledView>

      {/* Avatar visning */}
      {selectedAvatar && (
        <StyledView className="items-center px-6" style={{marginBottom: spacingVertical * 2}}>
          <StyledView 
            className="bg-background-light/30 rounded-full justify-center items-center"
            style={{ 
              width: avatarContainerSize, 
              height: avatarContainerSize,
              marginBottom: spacingVertical
            }}
          >
            <Avatar
              source={selectedAvatar.filename}
              size="large"
              style={selectedStyle}
            />
          </StyledView>

          <StyledText className="text-primary font-sans-bold text-2xl mb-2">
            {selectedAvatar.name}
          </StyledText>
          <StyledText className="text-text-secondary font-sans text-center mb-4">
            {selectedAvatar.description}
          </StyledText>

          {/* Årsväljar-sektion */}
          <StyledText className="text-text-primary font-sans-bold text-2xl mb-3">
            {yearsText}
          </StyledText>

          <StyledView className="w-full mb-4">
            <Slider
              style={{ height: 36 }}
              minimumValue={0}
              maximumValue={5}
              step={0.5}
              value={years}
              onValueChange={handleYearChange}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#3a3f44"
              thumbTintColor="#ffd33d"
            />
            <StyledView className="flex-row justify-between mt-2">
              <StyledText className="text-text-secondary font-sans">
                Nybliven
              </StyledText>
              <StyledText className="text-text-secondary font-sans">
                Veteran
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      )}
    </>
  );

  // Funktion för att rendera supporter-sidans UI
  const renderSupporterUI = () => (
    <StyledView className="flex-1 mb-4">
      {/* Endast AvatarCarousel, utan extra rubrik */}
      <AvatarCarousel 
        avatars={availableAvatars} 
        onSelectAvatar={handleSelectAvatar} 
        selectedAvatarId={selectedAvatar?.id || null}
        showTitle={false} // Sätt denna property till false om din AvatarCarousel har detta
      />
    </StyledView>
  );

  return (
    <SafeAreaView style={{flex: 1, backgroundColor: '#25292e'}}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{flex: 1}}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          {/* Header med anpassad padding - gemensam för båda användartyperna */}
          <View style={[styles.header, {marginTop: headerTop}]}>
            <Text style={styles.headerText}>
              {headerText}
            </Text>
          </View>

          {/* Villkorlig rendering baserat på användartyp */}
          {isVegan ? renderVeganUI() : renderSupporterUI()}

          {/* Fortsättningsknapp - alltid synlig på botten */}
          <View style={styles.bottomContainer}>
            <Pressable
              onPress={handleContinue}
              style={styles.continueButton}
              android_ripple={{color: 'rgba(0,0,0,0.2)'}}
            >
              <Text style={styles.continueButtonText}>
                Fortsätt
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// Använda vanlig StyleSheet istället för NativeWind för mer exakt kontroll
const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 28,
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  bottomContainer: {
    marginTop: 'auto',
    paddingVertical: 16,
  },
  continueButton: {
    backgroundColor: '#ffd33d',
    paddingVertical: 16,
    borderRadius: 8,
  },
  continueButtonText: {
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#000000',
    textAlign: 'center',
    fontSize: 16,
  }
});