// app/(tabs)/(scan)/index.tsx - Förbättrad design med konsekvent utseende och test-knapp
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { View, Text, Pressable, SafeAreaView, useWindowDimensions, Animated, Easing, Platform, Alert, Modal, StatusBar } from 'react-native';
import { SafeAreaView as RNSafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation, usePathname, useSegments } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styled } from 'nativewind';
import { CameraGuide } from '@/components/CameraGuide';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { useCounter } from '@/hooks/useCounter';
import { UsageLimitIndicator } from '@/components/UsageLimitIndicator';
import { UsageLimitModal } from '@/components/UsageLimitModal';
import { useAuth } from '@/providers/AuthProvider';
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';
import { testUsageAPI, showTestResult } from '@/utils/usageApiTester';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCameraPermission } from '@/lib/visionCameraWrapper';
import { useStore } from '@/stores/useStore';

// Färgkonstanter för Skanna-sidan
export const SCAN_HEADER_COLOR = '#232A35';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledRNSafeAreaView = styled(RNSafeAreaView);
const StyledAnimatedView = styled(Animated.View);

const ScanScreen: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [showUsageLimitModal, setShowUsageLimitModal] = useState(false);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [isRequestingPermission, setIsRequestingPermission] = useState(false);
  const [debugMode] = useState(false);
  const [networkError, setNetworkError] = useState(false);
  const { hasReachedLimit, fetchCounter } = useCounter();
  const { width, height } = useWindowDimensions();
  const { user } = useAuth();
  const navigation = useNavigation();
  const pathname = usePathname();
  const segments = useSegments();
  const isScreenMounted = useRef(true);
  const safetyTimeoutId = useRef<NodeJS.Timeout | null>(null);
  
  // StatusBar hantering - återställs när skärmen lämnas
  useEffect(() => {
    // Sätt StatusBar för denna skärm
    if (Platform.OS === 'android') {
      StatusBar.setBarStyle('light-content');
      StatusBar.setBackgroundColor(SCAN_HEADER_COLOR);
    }
    
    // Lyssna på när denna skärm får fokus för att återställa StatusBar
    const unsubscribeFocus = navigation.addListener('focus', () => {
      if (Platform.OS === 'android') {
        StatusBar.setBarStyle('light-content');
        StatusBar.setBackgroundColor(SCAN_HEADER_COLOR);
      }
    });
    
    return () => {
      unsubscribeFocus();
    };
  }, [navigation]);
  
  // Get camera permission status directly in the scan tab
  const { hasPermission, requestPermission } = useCameraPermission();
  
  // New animation values
  // Get device dimensions for responsive sizing
  const buttonSize = Math.min(width, height) * 0.28;
  const innerButtonSize = buttonSize * 0.9;
  
  // Animation values
  const pulseAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const shimmerAnimation = useRef(new Animated.Value(0)).current;
  const accentRingAnimation = useRef(new Animated.Value(0)).current;
  
  // Interpolations for animations
  const pulseInterpolation = pulseAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.05]
  });
  
  const glowOpacity = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [0.5, 0.9]
  });
  
  const shimmerTranslateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-buttonSize, buttonSize]
  });
  
  const accentOpacity = accentRingAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.6, 1, 0.6]
  });
  
  const accentScale = accentRingAnimation.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.05, 1]
  });
  
  // Add state for tips accordion
  const [showTips, setShowTips] = useState(false);

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
    
    // OBS: Vi ska inte anropa fetchCounter här direkt, eftersom det kan leda till oändliga uppdateringar
    // Istället förlitar vi oss på useEffect-hooken nedan för att hantera counter uppdateringar
    
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
    
    console.log('Screen state reset completed');
  }, [pathname, clearCameraSafetyTimeout, router, setNetworkError]);

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

  // Function to start all animations
  const startAnimations = () => {
    // Reset animation values
    pulseAnimation.setValue(0);
    glowAnimation.setValue(0);
    shimmerAnimation.setValue(0);
    accentRingAnimation.setValue(0);
    
    // Pulse animation for button
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 0,
          duration: 2000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Glow animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        })
      ])
    ).start();
    
    // Shimmer effect animation
    Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 3000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
    
    // Accent ring animation
    Animated.loop(
      Animated.timing(accentRingAnimation, {
        toValue: 1,
        duration: 2500,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      })
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
    // Använd en timeout för att undvika för många samtidiga anrop
    const timerId = setTimeout(() => {
      if (isScreenMounted.current) {
        console.log('Scheduled fetchCounter is executing...');
        fetchCounter().catch(err => {
          console.error('Failed to refresh usage in scan view:', err);
          setNetworkError(true);
        });
      }
    }, 1000);
    
    // Cleanup: avbryt timer om komponenten avmonteras innan timeoutens slut
    return () => clearTimeout(timerId);
  }, []); // Ta bort fetchCounter från beroendearrayen

  // Test function for usage API
  const testUsageLimitAPI = async () => {
    try {
      if (networkError) {
        setNetworkError(false);
      }
      
      // Kontrollera användar-ID
      if (!user?.id) {
        Alert.alert('Ingen användare', 'Du måste vara inloggad för att testa');
        return;
      }
      
      // Kör testet
      const testResult = await testUsageAPI(user.id);
      
      // Visa resultatet
      await showTestResult(testResult);
      
      // Uppdatera UI efter test
      try {
        // Undvik direkt anrop här, vi använder en timeout istället
        console.log('Test avklarat, uppdatera räknare med timeout');
        setTimeout(() => {
          if (isScreenMounted.current) {
            fetchCounter().catch(err => {
              console.warn('Test update counter failed:', err);
            });
          }
        }, 1000);
        setNetworkError(false); // Clear any network error on success
      } catch (error) {
        console.error('Failed to refresh usage after test:', error);
      }
      
    } catch (err) {
      console.error('Usage API test failed:', err);
      Alert.alert('Test Failed', 'API test failed: ' + String(err));
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

  // Handle camera button press
  const handleScanPress = async () => {
    try {
      // Hantera analysgräns-kontroll
      if (hasReachedLimit) {
        console.log('Användare har nått analysgränsen, visar modal');
        setShowUsageLimitModal(true);
        return;
      }
      
      // Säkerställ att appen har kameratillstånd
      if (!hasPermission) {
        if (Platform.OS === 'ios' || Platform.OS === 'android') {
          // På mobila enheter, försök begära tillstånd
          console.log('Begär kameratillstånd...');
          setIsRequestingPermission(true);
          const permissionResult = await requestPermission();
          setIsRequestingPermission(false);
          
          if (!permissionResult) {
            console.log('Kameratillstånd nekades, visar modal');
            setShowPermissionModal(true);
            return;
          }
        } else {
          // På webben eller andra plattformar, visa en annan typ av feedback
          console.log('Plattformen stöder inte kamera eller saknar tillstånd');
          Alert.alert('Kameratillstånd krävs', 'Du behöver ge tillstånd för kameraåtkomst för att skanna produkter.');
          return;
        }
      }
      
      // Logga event
      logEvent(Events.SCAN_STARTED);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      
      // Uppdatera användningsgräns i bakgrunden utan att blockera
      // Vi använder en timeout för att undvika för många anrop
      if (isScreenMounted.current) {
        setTimeout(() => {
          fetchCounter().catch(err => {
            console.warn('Background usage refresh failed');
            // Fortsätt med kameranavigering trots fel
          });
        }, 500);
      }
      
      // Navigera till kameravyn
      navigateToCamera();
    } catch (error) {
      console.error('Usage check failed but proceeding with camera:', error);
    }
  };

  const handleShowGuide = async () => {
    try {
      // Add haptic feedback
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      console.log('Showing camera guide from button press');
      // Set state to show guide
      setShowGuide(true);
    } catch (error) {
      console.error('Error showing guide:', error);
      // Still try to show the guide even if haptics fail
      setShowGuide(true);
    }
  };

  // Animation styles
  const scanButtonAnimatedStyle = {
    transform: [{ scale: pulseInterpolation }]
  };
  
  // Inner glow animated style - simplified
  const innerGlowStyle = {
    opacity: glowOpacity
  };
  
  // Shimmer animation interpolation
  const shimmerInterpolation = shimmerTranslateX;

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
    <StyledView className="flex-1 bg-[#121212]">
      {/* Header som täcker hela statusfältsområdet */}
      <StyledView 
        className="bg-[#232A35] absolute top-0 left-0 right-0 rounded-b-xl" 
        style={{ 
          height: Platform.OS === 'ios' ? 120 : 100,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.2,
          shadowRadius: 6,
          elevation: 4
        }} 
      />
      
      {/* Header innehåll med SafeAreaView för korrekt padding */}
      <StyledRNSafeAreaView className="bg-[#232A35] rounded-b-xl" edges={['top']}>
        <StyledView className="px-6 pb-4">
          <StyledText className="text-white text-2xl font-bold mb-1">Skanna</StyledText>
          <StyledText className="text-white/90 text-base">Skanna en produkt för att analysera</StyledText>
        </StyledView>
      </StyledRNSafeAreaView>
      
      {/* Extra utrymme efter headern för att ge plats till innehållet */}
      <StyledView className="h-6" />

      {networkError && (
        <StyledView className="absolute top-0 left-0 right-0 bg-status-error py-2 px-4 z-50 mt-36">
          <StyledText className="text-white text-center font-sans-medium">
            Ingen internetanslutning. Vissa funktioner kan vara begränsade.
          </StyledText>
        </StyledView>
      )}

      {/* Debug mode button */}
      {debugMode && (
        <View 
          style={{
            position: 'absolute',
            top: 140,
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

      {/* Main content */}
      <StyledSafeAreaView 
        style={{display: showGuide ? 'none' : 'flex'}}
        className="flex-1 justify-between items-center px-4 pb-8 pt-2"
      >
        {/* Analysis Counter Section - Redesigned */}
        <StyledView className="w-full items-center mb-0">
          {/* Heading for analysis counter */}
          <StyledText className="text-text-primary font-sans-medium text-base mb-2">
            Analyser kvar denna månaden
          </StyledText>
          {/* Modern Analysis Counter */}
          <StyledView className="bg-background-light/15 py-2.5 px-6 rounded-full shadow-md border border-gray-700/20 flex-row items-center space-x-2">
            <Ionicons name="analytics-outline" size={16} color="#4ECDC4" />
            <StyledText className="text-[#4ECDC4] font-sans-medium text-sm tracking-wide">
              {useCounter().remaining} / {useCounter().limit}
            </StyledText>
          </StyledView>
          
          {/* Network Error UI */}
          {networkError && (
            <StyledView className="bg-status-error/20 p-4 rounded-lg mt-4 w-full">
              <StyledText className="text-status-error font-sans-medium text-center">
                Kunde inte ansluta till servern. Vänligen kontrollera din internetanslutning.
              </StyledText>
              <StyledPressable 
                onPress={() => { 
                  setNetworkError(false); 
                  setTimeout(() => {
                    if (isScreenMounted.current) {
                      fetchCounter().catch(err => setNetworkError(true)); 
                    }
                  }, 1000);
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

        {/* Main Scan Button */}
        <StyledView className="flex-1 justify-center items-center">
          {/* Outer glow container */}
          <StyledAnimatedView 
            style={[
              scanButtonAnimatedStyle,
              {
                width: buttonSize * 1.2,
                height: buttonSize * 1.2,
                borderRadius: buttonSize * 0.6,
                backgroundColor: 'rgba(255, 211, 61, 0.05)',
                justifyContent: 'center',
                alignItems: 'center',
              }
            ]}
          >
            {/* Pulsing accent ring */}
            <StyledAnimatedView
              style={{
                position: 'absolute',
                width: buttonSize * 1.1,
                height: buttonSize * 1.1,
                borderRadius: buttonSize * 0.55,
                borderWidth: 2,
                borderColor: '#4ECDC4',
                opacity: accentOpacity,
                transform: [{ scale: accentScale }]
              }}
            />
            
            {/* Outer glow effect */}
            <StyledAnimatedView
              style={{
                position: 'absolute',
                width: buttonSize * 1.15,
                height: buttonSize * 1.15,
                borderRadius: buttonSize * 0.575,
                backgroundColor: 'transparent',
                shadowColor: "#4ECDC4",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: glowOpacity,
                shadowRadius: 15,
                elevation: 5,
              }}
            />
            
            {/* Main button with elegant design */}
            <StyledPressable 
              onPress={handleScanPress}
              className="items-center justify-center active:opacity-70 overflow-hidden"
              style={{
                width: buttonSize,
                height: buttonSize,
                borderRadius: buttonSize / 2,
                backgroundColor: '#4ECDC4',
                shadowColor: "#000",
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 7,
              }}
              accessibilityLabel="Öppna kamera för att skanna ingredienslista"
              accessibilityRole="button"
            >
              {/* Frosted glass effect */}
              <LinearGradient
                colors={['rgba(255, 255, 255, 0.6)', 'rgba(255, 255, 255, 0.2)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                style={{
                  position: 'absolute',
                  width: '100%',
                  height: '100%',
                  borderRadius: buttonSize / 2,
                }}
              />
              
              {/* Shimmer effect overlay */}
              <StyledAnimatedView
                style={{
                  position: 'absolute',
                  width: buttonSize / 2,
                  height: '100%',
                  opacity: 0.6,
                  backgroundColor: 'transparent',
                  transform: [{ translateX: shimmerTranslateX }]
                }}
              >
                <LinearGradient
                  colors={['transparent', 'rgba(255, 255, 255, 0.8)', 'transparent']}
                  start={{ x: 0, y: 0.5 }}
                  end={{ x: 1, y: 0.5 }}
                  style={{
                    width: '100%',
                    height: '100%',
                  }}
                />
              </StyledAnimatedView>
              
              {/* Camera icon */}
              <Ionicons name="camera" size={buttonSize * 0.4} color="#000" />
            </StyledPressable>
          </StyledAnimatedView>
          
          {/* Small descriptive text below button with enhanced styling */}
          <StyledText className="text-text-secondary text-sm mt-5 font-sans-medium opacity-80">
            Tryck för att skanna
          </StyledText>
        </StyledView>

        {/* Bottom Instructions */}
        <StyledView className="w-full max-w-md px-4 mt-10 mb-2">
          {/* Instruction card - Collapsible */}
          <StyledPressable 
            onPress={() => setShowTips(!showTips)}
            className="bg-background-light/10 rounded-lg overflow-hidden mb-4 border border-gray-700/20"
          >
            <StyledView className="p-4 flex-row justify-between items-center">
              <StyledView className="flex-row items-center">
                <Ionicons 
                  name="information-circle-outline" 
                  size={18} 
                  color="#4ECDC4" 
                />
                <StyledText 
                  className="text-text-primary font-sans-medium text-base ml-2"
                >
                  Tips för bättre resultat
                </StyledText>
              </StyledView>
              <Ionicons 
                name={showTips ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#4ECDC4"
              />
            </StyledView>
            
            {showTips && (
              <StyledView className="px-4 pb-4">
                <StyledText 
                  className="text-text-secondary font-sans text-sm leading-5"
                >
                  Håll telefonen stilla och se till att ingredienslistan är väl belyst och tydligt synlig
                </StyledText>
              </StyledView>
            )}
          </StyledPressable>
          
          {/* Guide button with improved style */}
          <StyledPressable 
            onPress={handleShowGuide}
            className="flex-row justify-center items-center py-3 px-4 rounded-lg bg-background-light/10 active:opacity-70 border border-gray-700/20"
            accessibilityLabel="Visa guide för skanning"
            accessibilityRole="button"
          >
            <Ionicons 
              name="help-circle-outline" 
              size={20} 
              color="#4ECDC4"
            />
            <StyledText className="text-[#4ECDC4] font-sans-medium ml-2">
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
      </StyledSafeAreaView>

      {/* Camera Guide - displayed as overlay */}
      {showGuide && (
        <CameraGuide onClose={() => setShowGuide(false)} isTransparent={false} />
      )}
      
      {/* Usage Limit Modal */}
      <UsageLimitModal 
        visible={showUsageLimitModal} 
        onClose={() => setShowUsageLimitModal(false)} 
      />
      
      {/* Camera permission modal */}
      {renderPermissionModal()}
    </StyledView>
  );
};

export default ScanScreen;