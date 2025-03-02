// app/(onboarding)/avatar.tsx - Med mindre avatar och mer mellanrum
import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  Pressable, 
  SafeAreaView, 
  Platform, 
  ScrollView, 
  StyleSheet,
  useWindowDimensions 
} from 'react-native';
import { router } from 'expo-router';
import Slider from '@react-native-community/slider';
import { useStore } from '@/stores/useStore';
import { getSupporterAvatars, getAvailableAvatars, AvatarOption } from '@/utils/avatarUtils';
import { AvatarStyle } from '@/stores/slices/createAvatarSlice';
import * as Haptics from 'expo-haptics';
import { Avatar } from '@/components/Avatar';
import { AvatarCarousel } from '@/components/AvatarCarousel';

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

  // Determine if user is vegan
  const isVegan = veganStatus === 'vegan';

  // Get appropriate avatars based on veganStatus and years
  const availableAvatars = isVegan 
    ? getAvailableAvatars(years, selectedStyle)
    : getSupporterAvatars();

  // Select initial avatar, but only once
  useEffect(() => {
    if (!initializedRef.current && availableAvatars.length > 0) {
      if (isVegan) {
        // For vegan users, select the latest available avatar based on years
        const latestAvatar = availableAvatars[availableAvatars.length - 1];
        setSelectedAvatar(latestAvatar);
      } else {
        // For supporters, select the first avatar
        setSelectedAvatar(availableAvatars[0]);
      }
      initializedRef.current = true;
    }
  }, [availableAvatars, isVegan]);

  const handleStyleChange = async (style: StyleType) => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStyle(style);
    
    // When style changes, update avatar based on new style and current years
    const newAvatars = getAvailableAvatars(years, style);
    if (newAvatars.length > 0) {
      setSelectedAvatar(newAvatars[newAvatars.length - 1]);
    }
  };

  const handleYearChange = (value: number) => {
    setYears(value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // When year slider is dragged, manually update selectedAvatar
    if (isVegan) {
      const newAvatars = getAvailableAvatars(value, selectedStyle);
      if (newAvatars.length > 0) {
        // Select the latest avatar available for this year count
        const latestAvatar = newAvatars[newAvatars.length - 1];
        
        // Only update if the avatar has actually changed
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

    // Use the selected avatar or the first available one
    const avatar = selectedAvatar || (availableAvatars.length > 0 ? availableAvatars[0] : null);
    
    if (avatar) {
      // For vegan users we use selectedStyle, for supporters we use 'supporter'
      const avatarStyle = isVegan ? selectedStyle : 'supporter';
      
      await setVeganYears(isVegan ? years : 0);
      await setAvatar(avatarStyle, avatar.id);
      router.push('/(onboarding)/guide');
    }
  };

  // Customize UI elements based on veganStatus
  const headerText = isVegan ? "Hur länge har du varit vegan?" : "Välj din karaktär";
  const yearsText = years === 0 
    ? "Nybliven vegan" 
    : years === 5 
      ? "5+ år" 
      : `${years} år`;

  // Function to render vegan page UI
  const renderVeganUI = () => (
    <View style={styles.container}>
      {/* Style selection buttons with fixed size and spacing */}
      <View style={styles.styleButtonContainer}>
        <Pressable
          onPress={() => handleStyleChange('cute')}
          style={[
            styles.styleButton,
            selectedStyle === 'cute' ? styles.activeStyleButton : styles.inactiveStyleButton
          ]}
        >
          <Text 
            style={[
              styles.styleButtonText,
              selectedStyle === 'cute' ? styles.activeStyleButtonText : styles.inactiveStyleButtonText
            ]}
          >
            Lekfull
          </Text>
        </Pressable>

        <Pressable
          onPress={() => handleStyleChange('cool')}
          style={[
            styles.styleButton,
            selectedStyle === 'cool' ? styles.activeStyleButton : styles.inactiveStyleButton
          ]}
        >
          <Text 
            style={[
              styles.styleButtonText,
              selectedStyle === 'cool' ? styles.activeStyleButtonText : styles.inactiveStyleButtonText
            ]}
          >
            Stilren
          </Text>
        </Pressable>
      </View>

      {/* Very large spacer to ensure separation */}
      <View style={styles.spacer50} />

      {/* Avatar display section with much smaller size */}
      {selectedAvatar && (
        <View style={styles.avatarSection}>
          <View style={styles.avatarCircleContainer}>
            <Avatar
              source={selectedAvatar.filename}
              size="medium" // Using medium instead of large
              style={selectedStyle}
            />
          </View>

          {/* Extra large fixed gap to ensure avatar name is outside the circle */}
          <View style={styles.spacer40} />
          
          {/* Name outside the circle */}
          <Text style={styles.avatarName}>
            {selectedAvatar.name}
          </Text>

          {/* Description with fixed margins */}
          <Text style={styles.avatarDescription}>
            {selectedAvatar.description}
          </Text>

          {/* Larger spacer before year selector */}
          <View style={styles.spacer24} />

          {/* Year selector section */}
          <Text style={styles.yearText}>
            {yearsText}
          </Text>

          <View style={styles.sliderContainer}>
            <Slider
              style={styles.slider}
              minimumValue={0}
              maximumValue={5}
              step={0.5}
              value={years}
              onValueChange={handleYearChange}
              minimumTrackTintColor="#4CAF50"
              maximumTrackTintColor="#3a3f44"
              thumbTintColor="#ffd33d"
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabel}>
                Nybliven
              </Text>
              <Text style={styles.sliderLabel}>
                Veteran
              </Text>
            </View>
          </View>
        </View>
      )}
    </View>
  );

  // Function to render supporter page UI
  const renderSupporterUI = () => (
    <View style={styles.container}>
      <AvatarCarousel 
        avatars={availableAvatars} 
        onSelectAvatar={handleSelectAvatar} 
        selectedAvatarId={selectedAvatar?.id || null}
        showTitle={false}
      />
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.screen}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {isVegan ? (
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={styles.header}>
                <Text
                  style={styles.headerText}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {headerText}
                </Text>
              </View>
              {renderVeganUI()}
              <View style={styles.bottomSpace} />
            </View>
          ) : (
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={styles.header}>
                <Text
                  style={styles.headerText}
                  numberOfLines={1}
                  adjustsFontSizeToFit={true}
                  minimumFontScale={0.7}
                >
                  {headerText}
                </Text>
              </View>
              {renderSupporterUI()}
              <View style={styles.bottomSpace} />
            </View>
          )}
        </ScrollView>

        <View style={styles.buttonContainer}>
          <Pressable
            onPress={handleContinue}
            style={styles.continueButton}
            android_ripple={{ color: 'rgba(0,0,0,0.2)' }}
          >
            <Text style={styles.continueButtonText}>
              Fortsätt
            </Text>
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Using fixed StyleSheet with much smaller avatar and more spacing
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  screen: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 100, // Extra padding to ensure content doesn't hide behind button
  },
  container: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    marginTop: 40,
    marginBottom: 24,
    paddingHorizontal: 8,
    width: '100%',
    alignItems: 'center',
  },
  headerText: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    textAlign: 'center',
  },
  styleButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    width: '100%',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  styleButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginHorizontal: 6,
  },
  activeStyleButton: {
    backgroundColor: '#ffd33d',
  },
  inactiveStyleButton: {
    backgroundColor: 'rgba(58, 63, 68, 0.3)',
  },
  styleButtonText: {
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
  },
  activeStyleButtonText: {
    color: '#000000',
  },
  inactiveStyleButtonText: {
    color: '#ffffff',
  },
  spacer50: {
    height: 50, // Much larger spacer
  },
  spacer40: {
    height: 40, // Very large spacer
  },
  spacer24: {
    height: 24,
  },
  avatarSection: {
    alignItems: 'center',
    width: '100%',
  },
  avatarCircleContainer: {
    width: 100, // Much smaller avatar (was 120px)
    height: 100, // Much smaller avatar (was 120px)
    borderRadius: 50,
    backgroundColor: 'rgba(58, 63, 68, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarName: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: '#ffd33d',
    marginBottom: 8,
    textAlign: 'center',
  },
  avatarDescription: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14, // Smaller font size for description
    color: '#cccccc',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
    maxWidth: 280, // Limit width to ensure text doesn't stretch too wide
  },
  yearText: {
    fontFamily: 'PlusJakartaSans-Bold',
    fontSize: 22,
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  sliderContainer: {
    width: '100%',
    marginBottom: 32,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  sliderLabel: {
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 14,
    color: '#cccccc',
  },
  buttonContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#25292e',
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
  },
  bottomSpace: {
    height: 60, // Extra large bottom space
  },
});