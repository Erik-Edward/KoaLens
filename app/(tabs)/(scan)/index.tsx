// app/(tabs)/(scan)/index.tsx - Förbättrad design med konsekvent utseende
import { FC, useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, SafeAreaView, useWindowDimensions, Animated, Easing, Platform, Alert } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { CameraGuide } from '@/components/CameraGuide';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledAnimatedView = styled(Animated.View);

const ScanScreen: FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const { width, height } = useWindowDimensions();
  
  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const innerGlowAnimation = useRef(new Animated.Value(0)).current;

  // Start animations when component mounts
  useEffect(() => {
    // Pulsating animation for the scan button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.05,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1800,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Floating animation for the scan button
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnimation, {
          toValue: -6,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(floatAnimation, {
          toValue: 0,
          duration: 2200,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start();
    
    // Inner glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(innerGlowAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(innerGlowAnimation, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    ).start();
  }, []);

  const handleScanPress = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Kontrollera om vi kör på web-plattform
    if (Platform.OS === 'web') {
      Alert.alert(
        "Kameran ej tillgänglig", 
        "Kamerafunktionen är endast tillgänglig på fysiska enheter. Använd en fysisk enhet eller EAS build för att testa kamerafunktionen.",
        [{ text: "OK" }]
      );
      return;
    }
    
    router.push('./camera');
  };

  const handleShowGuide = async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowGuide(true);
  };

  // Calculate button size based on screen dimensions
  const buttonSize = Math.min(width, height) * 0.28;
  const innerButtonSize = buttonSize * 0.9;

  // Animation styles
  const scanButtonAnimatedStyle = {
    transform: [
      { scale: pulseAnimation },
      { translateY: floatAnimation }
    ]
  };
  
  // Inner glow animated style
  const innerGlowStyle = {
    opacity: innerGlowAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 0.9]
    })
  };

  return (
    <StyledSafeAreaView 
      className="flex-1 bg-background-main"
      accessibilityLabel="Skanna produkt skärm"
    >
      {showGuide ? (
        <CameraGuide onClose={() => setShowGuide(false)} isTransparent={false} />
      ) : (
        <StyledView 
          className="flex-1 justify-between items-center px-4 pb-8"
          accessibilityLabel="Skanna produkt skärm"
        >
          {/* Title Section */}
          <StyledView className="w-full items-center mt-12 mb-4">
            <StyledText className="text-text-primary font-sans-bold text-2xl text-center mb-2">
              KoaLens
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-base text-center">
              Skanna ingredienser för att kontrollera om produkten är vegansk
            </StyledText>
          </StyledView>

          {/* Main Scan Button - Enhanced with better animations and gradient */}
          <StyledView className="flex-1 justify-center items-center">
            <StyledAnimatedView 
              style={[
                scanButtonAnimatedStyle,
                {
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                }
              ]}
              className="items-center justify-center shadow-xl"
            >
              <StyledPressable 
                onPress={handleScanPress}
                className="items-center justify-center active:opacity-90"
                style={{
                  width: buttonSize,
                  height: buttonSize,
                  borderRadius: buttonSize / 2,
                  overflow: 'hidden'
                }}
                accessibilityLabel="Öppna kamera för att skanna ingredienslista"
                accessibilityRole="button"
              >
                {/* Outer gradient */}
                <LinearGradient
                  colors={['#ffe066', '#ffd33d', '#ffc107']}
                  style={{
                    position: 'absolute',
                    width: '100%',
                    height: '100%',
                    borderRadius: buttonSize / 2,
                  }}
                />
                
                {/* Inner shadow overlay */}
                <StyledView 
                  className="absolute inset-0 justify-center items-center"
                  style={{
                    borderRadius: buttonSize / 2,
                    borderWidth: 1,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.27,
                    shadowRadius: 4.65,
                    elevation: 6
                  }}
                />
                
                {/* Inner button with glowing effect */}
                <StyledView 
                  style={{
                    width: innerButtonSize,
                    height: innerButtonSize,
                    borderRadius: innerButtonSize / 2,
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                  className="bg-primary justify-center items-center overflow-hidden"
                >
                  {/* Animated inner glow */}
                  <StyledAnimatedView 
                    style={[
                      innerGlowStyle,
                      {
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: innerButtonSize / 2,
                      }
                    ]}
                  >
                    <LinearGradient
                      colors={['rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0)']}
                      style={{
                        width: '100%',
                        height: '100%',
                      }}
                    />
                  </StyledAnimatedView>
                  
                  {/* Camera icon */}
                  <Ionicons 
                    name="camera-outline" 
                    size={buttonSize * 0.36}
                    color="#ffffff"
                  />
                </StyledView>
              </StyledPressable>
            </StyledAnimatedView>
            
            {/* Scan Caption */}
            <StyledView className="mt-8 mb-4 bg-background-light/30 backdrop-blur-sm rounded-xl px-8 py-5 max-w-xs shadow-lg">
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0.05)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 8
                }}
              />
              <StyledText 
                className="text-text-primary font-sans-medium text-center text-base leading-relaxed"
                accessibilityRole="text"
              >
                Tryck för att skanna en ingredienslista
              </StyledText>
            </StyledView>
          </StyledView>

          {/* Bottom Instructions */}
          <StyledView className="w-full max-w-md px-4">
            {/* Instruction card with improved gradient */}
            <StyledView className="bg-background-light/20 rounded-lg overflow-hidden mb-4">
              <LinearGradient
                colors={['rgba(255,255,255,0.1)', 'rgba(58,63,68,0.3)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 8
                }}
              />
              <StyledView className="p-5">
                <StyledText 
                  className="text-text-primary font-sans-medium text-base text-center mb-1"
                >
                  Tips för bättre resultat
                </StyledText>
                <StyledText 
                  className="text-text-secondary font-sans text-sm text-center"
                >
                  Håll telefonen stilla och se till att ingredienslistan är väl belyst och tydligt synlig
                </StyledText>
              </StyledView>
            </StyledView>
            
            {/* Guide button with improved style */}
            <StyledPressable 
              onPress={handleShowGuide}
              className="flex-row justify-center items-center py-3 rounded-lg active:opacity-70 overflow-hidden"
              accessibilityLabel="Visa guide för skanning"
              accessibilityRole="button"
            >
              <LinearGradient
                colors={['rgba(255,211,61,0.2)', 'rgba(255,211,61,0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 0,
                  bottom: 0,
                  borderRadius: 8
                }}
              />
              <Ionicons 
                name="help-circle-outline" 
                size={20} 
                color="#ffd33d"
              />
              <StyledText className="text-primary font-sans-medium text-sm ml-2">
                Visa guide för skanning
              </StyledText>
            </StyledPressable>
          </StyledView>
        </StyledView>
      )}
    </StyledSafeAreaView>
  );
};

export default ScanScreen;