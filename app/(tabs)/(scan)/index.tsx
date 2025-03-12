// app/(tabs)/(scan)/index.tsx - Förbättrad design med konsekvent utseende och test-knapp
import { FC, useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, useWindowDimensions, Animated, Easing, Platform, Alert, Modal } from 'react-native';
import { router, useNavigation, usePathname, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { CameraGuide } from '@/components/CameraGuide';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { UsageLimitIndicator } from '@/components/UsageLimitIndicator';
import { UsageLimitModal } from '@/components/UsageLimitModal';
import { useAuth } from '@/providers/AuthProvider';
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';
import { testUsageAPI, showTestResult } from '@/utils/usageApiTester';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermission } from '@/lib/visionCameraWrapper';
import { useStore } from '@/stores/useStore';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledAnimatedView = styled(Animated.View);

const ScanScreen: FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [debugMode] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const { hasReachedLimit, refreshUsageLimit } = useUsageLimit();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const navigation = useNavigation();
  const pathname = usePathname();
  const segments = useSegments();
  const isScreenMounted = useRef(true);
  const safetyTimeoutId = useRef<NodeJS.Timeout | null>(null);
  
  // Get camera permission status directly in the scan tab
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // Animation values
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const floatAnimation = useRef(new Animated.Value(0)).current;
  const innerGlowAnimation = useRef(new Animated.Value(0)).current;

  // Function to clear any camera safety timeouts
  const clearCameraSafetyTimeout = useCallback(() => {
    // Clear any timeout we're tracking in memory
    if (safetyTimeoutId.current) {
      clearTimeout(safetyTimeoutId.current);
      safetyTimeoutId.current = null;
      console.log('Cleared existing camera safety timeout from memory');
    }
    
    // No longer using AsyncStorage for timeout IDs - this was causing significant delays
  }, []);

  // Function to reset the screen state - enhanced to be more reliable
  const resetScreenState = useCallback(() => {
    if (!isScreenMounted.current) return;
    
    console.log('Resetting scan screen state, current pathname:', pathname);
    
    // Ensure animations are running
    if (startAnimations) {
      startAnimations();
    }
    
    // Refresh usage limit data in background, don't block UI
    refreshUsageLimit().catch(err => {
      console.error('Failed to refresh usage in scan view:', err);
      setNetworkError(true);
    });
    
    // Make sure we're on the right UI state - hide ALL modals
    setShowGuide(false);
    setShowPermissionModal(false);
    setShowUsageLimitModal(false);
    
    // Reset network error state (will be set again if refresh fails)
    setNetworkError(false);
    
    // Clear any navigation safety timeouts
    clearCameraSafetyTimeout();
    
    // If we detect we're not on the main scan screen, force navigate to it
    // This is a safety mechanism in case we get stuck between views
    if (pathname.includes('scan') && (pathname.includes('result') || pathname.includes('crop'))) {
      console.log('Detected we are on a sub-route, forcing navigation to main scan screen');
      router.replace('/(tabs)/(scan)');
    }
  }, [refreshUsageLimit, pathname, clearCameraSafetyTimeout, router, setNetworkError]);

  // Global function to clear ALL app navigation locks and states but WITHOUT any navigation
  const forceResetAllAppState = useCallback(async () => {
    console.log('Performing a global app state reset');
    
    try {
      // Använd multiRemove för att rensa alla lås i en operation
      await AsyncStorage.multiRemove([
        'KOALENS_CAMERA_NAV_LOCK',
        'KOALENS_RESULT_NAV_LOCK',
        'KOALENS_CAMERA_TIMEOUT'
      ]);
      
      console.log('Global app state reset completed');
    } catch (err) {
      console.error('Error during global app state reset:', err);
    }
  }, []);

  // Reset screen state and ensure we see the scan button
  useEffect(() => {
    console.log('ScanScreen component mounted, pathname:', pathname);
    isScreenMounted.current = true;
    
    // Reset state once on mount (no navigation)
    forceResetAllAppState();
    resetScreenState();
    
    // Add a debounce mechanism to prevent multiple rapid resets
    let isResetting = false;
    let resetTimeout: NodeJS.Timeout | null = null;
    
    const debouncedReset = () => {
      if (isResetting || !isScreenMounted.current) return;
      
      isResetting = true;
      console.log('Starting debounced reset');
      
      // Clear any existing timeout
      if (resetTimeout) clearTimeout(resetTimeout);
      
      // Set a new timeout to perform the reset
      resetTimeout = setTimeout(() => {
        if (isScreenMounted.current) {
          console.log('Performing debounced reset now');
          forceResetAllAppState();
          resetScreenState();
        }
        isResetting = false;
      }, 300); // Small delay to batch multiple reset requests
    };
    
    // Handle tab focus events with debounce and force more cleanup
    const unsubscribeTabFocus = navigation.addListener('focus', async () => {
      if (!isScreenMounted.current) return;
      
      console.log('Scan tab focused, ensuring clean state');
      
      // Force immediate cleanup of any result screens that might be in the background
      try {
        // Explicitly remove result-related locks
        await AsyncStorage.removeItem('KOALENS_RESULT_NAV_LOCK');
        
        // Check the current route/path to see if we're coming from result
        const isComingFromResult = pathname.includes('result') || pathname.includes('crop');
        
        // If we're coming directly from a result screen, wait slightly longer before reset
        if (isComingFromResult) {
          console.log('Detected coming from result screen, giving extra time');
          
          // Brief delay to let the transition complete before resetting state
          setTimeout(() => {
            if (isScreenMounted.current) {
              debouncedReset();
            }
          }, 100);
        } else {
          // Normal path - just debounce the reset
          debouncedReset();
        }
      } catch (err) {
        console.error('Error in tab focus handler:', err);
        // Still try to reset even if there was an error
        debouncedReset();
      }
    });
    
    // Listen for navigation state changes with better state tracking
    const unsubscribeNavState = navigation.addListener('state', () => {
      // Only reset if we're on the main scan screen, not a sub-route
      if (!isScreenMounted.current) return;
      
      const isCameraOrSubRoute = pathname.includes('/camera') || 
                             pathname.includes('/crop') || 
                             pathname.includes('/result');
                             
      console.log('Navigation state changed, pathname:', pathname, 'isCameraOrSubRoute:', isCameraOrSubRoute);
      
      if (pathname === '/(tabs)/(scan)' && !isCameraOrSubRoute) {
        console.log('Main scan screen detected, scheduling reset');
        debouncedReset();
      } else if (pathname === '/(tabs)/(scan)' && isCameraOrSubRoute) {
        // When navigating to camera/crop/result, clear locks but don't reset UI
        console.log('Scan sub-route detected, clearing locks only');
        forceResetAllAppState().catch(err => console.error('Error clearing locks:', err));
      }
    });
    
    return () => {
      console.log('ScanScreen component unmounting');
      isScreenMounted.current = false;
      
      // Clear any pending timeout
      if (resetTimeout) clearTimeout(resetTimeout);
      
      // Clean up all listeners
      unsubscribeTabFocus();
      unsubscribeNavState();
      
      // Clear any safety timeouts when unmounting
      clearCameraSafetyTimeout();
    };
  }, [navigation, pathname, resetScreenState, clearCameraSafetyTimeout, forceResetAllAppState]);

  // Start all animations
  const startAnimations = () => {
    // Stop any running animations first
    pulseAnimation.stopAnimation();
    floatAnimation.stopAnimation();
    innerGlowAnimation.stopAnimation();
    
    // Reset animation values
    pulseAnimation.setValue(1);
    floatAnimation.setValue(0);
    innerGlowAnimation.setValue(0);
    
    // Restart animations
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
  };

  // Start animations when component mounts
  useEffect(() => {
    startAnimations();
  }, []);

  // Update usage information when component mounts
  useEffect(() => {
    // Log screen view when component mounts
    logScreenView('ScanScreen');
    
    // Refresh usage limit when we open the screen
    refreshUsageLimit().catch(err => {
      console.error('Failed to refresh usage in scan view:', err);
      setNetworkError(true);
    });
  }, [refreshUsageLimit]);

  // Test function for usage API
  const testUsageLimitAPI = async () => {
    if (!user?.id) {
      Alert.alert('Ingen användare', 'Du måste vara inloggad för att testa');
      return;
    }
    
    try {
      const result = await testUsageAPI(user.id);
      showTestResult(result);
      
      // Uppdatera UI efter test
      try {
        await refreshUsageLimit();
        setNetworkError(false); // Clear any network error on success
      } catch (error) {
        console.error('Failed to refresh usage after test:', error);
        setNetworkError(true);
      }
    } catch (error) {
      console.error('Test execution error:', error);
      Alert.alert('Testfel', String(error));
      setNetworkError(true);
    }
  };

  // Add new useEffect for auto-testing
  useEffect(() => {
    if (debugMode && user?.id) {
      Alert.alert('Debug Mode Active', 'Usage API testing is available. The test will run automatically in 3 seconds.');
      
      console.log('Debug mode active with user ID:', user.id);
      
      const timer = setTimeout(() => {
        console.log('Auto-running usage API test...');
        testUsageLimitAPI();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [debugMode, user?.id]);

  // Function to handle camera permission request
  const handleRequestCameraPermission = useCallback(async () => {
    try {
      setIsRequestingPermission(true);
      
      // Provide haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      
      console.log('Requesting camera permission from scan tab...');
      const result = await requestPermission();
      console.log('Permission result:', result);
      
      // Log the permission request
      logEvent('camera_permission', { 
        granted: result,
        source: 'scan_tab'
      });
      
      if (result) {
        // If permission was granted, proceed to camera
        navigateToCamera();
      } else {
        // If permission was denied, show info and stay on scan tab
        Alert.alert(
          "Kamerabehörighet nekad",
          "Du behöver ge KoaLens tillgång till kameran för att kunna skanna ingredienslistor.",
          [{ text: "OK" }]
        );
      }
    } catch (err) {
      console.error('Error requesting camera permission:', err);
    } finally {
      setIsRequestingPermission(false);
      setShowPermissionModal(false);
    }
  }, [requestPermission]);

  // Function to navigate to camera after permissions are granted
  const navigateToCamera = useCallback(() => {
    // Ge direkt haptisk feedback
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(console.error);
    
    console.log('Navigating to camera with permissions already granted');
    
    // Navigate to camera screen - use push (not replace) for better back navigation
    router.push({
      pathname: '/(tabs)/(scan)/camera',
      params: { userId: user?.id }
    });
    
    // We no longer need a safety timeout as it's causing navigation issues
  }, [router, user]);

  const handleScanPress = async () => {
    // Clear any existing safety timeouts in memory
    clearCameraSafetyTimeout();
    
    // Ge direkt haptisk feedback
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    
    // Check platform first - quick return for web
    if (Platform.OS === 'web') {
      Alert.alert(
        "Kameran ej tillgänglig", 
        "Kamerafunktionen är endast tillgänglig på fysiska enheter.",
        [{ text: "OK" }]
      );
      return;
    }
    
    // Kontrollera användningsgräns innan vi fortsätter
    try {
      // Använd variabeln från useUsageLimit-hooken
      if (hasReachedLimit) {
        setShowUsageLimitModal(true);
        // Logga händelse
        logEvent('usage_limit_reached', {
          source: 'scan_button'
        });
        return;
      }
      
      // Uppdatera användningsgräns i bakgrunden utan att blockera
      refreshUsageLimit().catch(err => {
        console.warn('Background usage refresh failed');
        // Fortsätt med kameranavigering trots fel
      });
    } catch (error) {
      // Fortsätt med kameranavigering trots fel med användningsgränskontrollen
      console.warn('Usage check failed but proceeding with camera');
    }
    
    // Kontrollera kameratillstånd innan navigering
    if (!hasPermission) {
      // Visa tillståndsmodal istället för att navigera
      setShowPermissionModal(true);
      return;
    }
    
    // Om vi kommer hit har tillstånd beviljats, navigera till kameran
    navigateToCamera();
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

  // Add the permission request modal
  const renderPermissionModal = () => {
    return (
      <Modal
        visible={showPermissionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPermissionModal(false)}
      >
        <StyledView className="flex-1 justify-center items-center bg-black/80">
          <StyledView className="w-5/6 bg-background-main rounded-lg p-6 items-center">
            <Ionicons name="camera-outline" size={48} color="#ffd33d" />
            <StyledText className="text-text-primary font-sans-medium text-lg text-center mt-4 mb-2">
              Kamerabehörighet
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-center mb-6">
              KoaLens behöver tillgång till kameran för att kunna skanna ingredienslistor.
            </StyledText>
            
            <StyledView className="flex-row gap-4">
              <StyledPressable 
                onPress={() => setShowPermissionModal(false)}
                className="bg-gray-700 px-6 py-3 rounded-lg"
                disabled={isRequestingPermission}
              >
                <StyledText className="text-text-primary font-sans-medium">
                  Avbryt
                </StyledText>
              </StyledPressable>
              
              <StyledPressable 
                onPress={handleRequestCameraPermission}
                className="bg-primary px-6 py-3 rounded-lg"
                disabled={isRequestingPermission}
              >
                <StyledText className="text-text-inverse font-sans-medium">
                  {isRequestingPermission ? 'Bearbetar...' : 'Ge tillgång till kamera'}
                </StyledText>
              </StyledPressable>
            </StyledView>
          </StyledView>
        </StyledView>
      </Modal>
    );
  };

  return (
    <StyledSafeAreaView 
      className="flex-1 bg-background-main"
      accessibilityLabel="Skanna produkt skärm"
    >
      {debugMode && (
        <View 
          style={{
            position: 'absolute',
            top: 100,
            left: 0,
            right: 0,
            zIndex: 9999,
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <Pressable
            onPress={testUsageLimitAPI}
            style={{
              backgroundColor: 'red',
              padding: 15,
              borderRadius: 8,
              width: 250,
              borderWidth: 3,
              borderColor: 'white'
            }}
          >
            <Text style={{
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18,
              textAlign: 'center'
            }}>
              TEST USAGE API NOW
            </Text>
          </Pressable>
        </View>
      )}
      {showGuide ? (
        <CameraGuide onClose={() => setShowGuide(false)} isTransparent={false} />
      ) : (
        <StyledView 
          className="flex-1 justify-between items-center px-4 pb-8"
          accessibilityLabel="Skanna produkt skärm"
        >
          {/* Title Section */}
          <StyledView className="w-full items-center mt-12 mb-4">
            <UsageLimitIndicator />
            <StyledText className="text-text-primary font-sans-bold text-2xl text-center mb-2">
              KoaLens
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-base text-center">
              Skanna ingredienser för att kontrollera om produkten är vegansk!
            </StyledText>
            
            {/* Network Error UI */}
            {networkError && (
              <StyledView className="bg-status-error/20 p-4 rounded-lg mt-4 w-full">
                <StyledText className="text-status-error font-sans-medium text-center">
                  Kunde inte ansluta till servern. Vänligen kontrollera din internetanslutning.
                </StyledText>
                <StyledPressable 
                  onPress={() => { 
                    setNetworkError(false); 
                    refreshUsageLimit().catch(err => setNetworkError(true)); 
                  }}
                  className="bg-primary mt-2 py-2 rounded-lg"
                >
                  <StyledText className="text-text-inverse font-sans text-center">
                    Försök igen
                  </StyledText>
                </StyledPressable>
              </StyledView>
            )}
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
            
            {/* Test button - only shown in development mode */}
            {__DEV__ && (
              <StyledView className="mt-4">
                <StyledPressable 
                  onPress={testUsageLimitAPI}
                  className="bg-status-error px-4 py-3 rounded-lg active:opacity-80"
                >
                  <StyledText className="text-white font-sans-medium text-center">
                    Testa användningsgräns API
                  </StyledText>
                </StyledPressable>
              </StyledView>
            )}
          </StyledView>
          <UsageLimitModal 
            visible={showUsageLimitModal} 
            onClose={() => setShowUsageLimitModal(false)} 
          />
        </StyledView>
      )}
      
      {/* Camera permission modal */}
      {renderPermissionModal()}
    </StyledSafeAreaView>
  );
};

export default ScanScreen;