// app/(tabs)/(scan)/result.tsx - Förbättrad timing för navigering
import { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, ActivityIndicator, Pressable, BackHandler, Platform } from 'react-native';
import { useLocalSearchParams, router, useNavigation, useRootNavigationState } from 'expo-router';
import { analyzeIngredients } from '@/services/claudeVisionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { useAuth } from '@/providers/AuthProvider';
import AsyncStorage from '@react-native-async-storage/async-storage';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

// Navigation lock key to prevent unwanted navigation
const NAV_LOCK_KEY = 'KOALENS_RESULT_NAV_LOCK';

export default function ResultScreen() {
  const { photoPath } = useLocalSearchParams<{ photoPath: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const [navLocked, setNavLocked] = useState(false);
  const hasAnalyzed = useRef(false);
  const navigationTimerRef = useRef<NodeJS.Timeout | null>(null);
  const navigationAttempts = useRef(0);
  const isScreenMounted = useRef(true);
  const { refreshUsageLimit } = useUsageLimit();
  const { user } = useAuth();
  const addProduct = useStore(state => state.addProduct);
  const products = useStore(state => state.products);
  const navigation = useNavigation();
  const navState = useRootNavigationState();
  
  // Track navigation state for debugging
  const [navigationLog, setNavigationLog] = useState<string[]>([]);
  const logNavigation = (message: string) => {
    const timestamp = new Date().toISOString().substr(11, 8); // HH:MM:SS
    const logMessage = `${timestamp} - ${message}`;
    console.log(`[Navigation]: ${logMessage}`);
    setNavigationLog(prev => {
      const newLog = [...prev, logMessage];
      // Keep only the last 10 logs to avoid memory issues
      return newLog.slice(-10);
    });
  };

  // Set navigation lock to prevent unwanted navigation
  useEffect(() => {
    const lockNavigation = async () => {
      try {
        await AsyncStorage.setItem(NAV_LOCK_KEY, 'true');
        setNavLocked(true);
        logNavigation('Result navigation locked');
      } catch (err) {
        console.error('Failed to set navigation lock:', err);
      }
    };
    
    lockNavigation();
    
    return () => {
      // Clear navigation lock when component unmounts
      AsyncStorage.removeItem(NAV_LOCK_KEY)
        .then(() => logNavigation('Result navigation lock cleared'))
        .catch(err => console.error('Failed to clear navigation lock:', err));
    };
  }, []);

  // Block navigator's automatic back navigation
  useEffect(() => {
    if (!navigation) return;
    
    const unsubscribe = navigation.addListener('beforeRemove', (e) => {
      if (navLocked && loading) {
        // Only allow navigation when analysis is complete or we have an error
        e.preventDefault();
        logNavigation('Prevented automatic navigation from result screen');
      }
    });
    
    return unsubscribe;
  }, [navigation, navLocked, loading]);

  // Prevent back button during analysis to avoid navigation issues
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (loading || (analysisComplete && !navigating)) {
        logNavigation('Back button pressed but prevented during analysis');
        return true; // Prevent default behavior
      }
      return false; // Let the default back action happen
    });

    return () => backHandler.remove();
  }, [loading, analysisComplete, navigating]);

  // Clean up timer when component unmounts
  useEffect(() => {
    logNavigation('Result component mounted');
    
    return () => {
      logNavigation('Result component unmounting, cleaning up timer');
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
      }
    };
  }, []);

  // Reset state when screen mounts and clean up when unmounting
  useEffect(() => {
    // Log screen view when component mounts
    logScreenView('AnalysisResult');
    logNavigation('ResultScreen mounted, initializing analysis');
    
    // Set mounted flag
    isScreenMounted.current = true;
    
    // Reset states
    setAnalysisComplete(false);
    setNavigating(false);
    setLoading(true);
    setError(null);
    setIsOffline(false);
    navigationAttempts.current = 0;
    
    // Clean up function runs when component unmounts
    return () => {
      logNavigation('ResultScreen unmounting, cleaning up');
      
      // Set unmounted flag
      isScreenMounted.current = false;
      
      // Clear any pending navigation timers
      if (navigationTimerRef.current) {
        clearTimeout(navigationTimerRef.current);
        navigationTimerRef.current = null;
      }
      
      // NOTE: We'll avoid the AsyncStorage call during unmount
      // as it might be causing issues in the cleanup phase
    };
  }, []);

  // Function to safely navigate to history detail (without requiring a product ID)
  const navigateToHistoryDetail = useCallback(() => {
    if (!isScreenMounted.current || navigationAttempts.current >= 3) {
      logNavigation(`Navigation aborted: mounted=${isScreenMounted.current}, attempts=${navigationAttempts.current}`);
      return;
    }
    
    navigationAttempts.current += 1;
    logNavigation(`Navigation attempt ${navigationAttempts.current}`);
    
    try {
      // Only clear nav lock if we're still mounted
      if (isScreenMounted.current) {
        // Unlock navigation
        setNavLocked(false);
        AsyncStorage.removeItem(NAV_LOCK_KEY)
          .catch(err => console.error('Failed to clear navigation lock:', err));
      }
      
      // Get the latest product info
      const currentProducts = useStore.getState().products;
      
      if (currentProducts.length === 0) {
        logNavigation('No products found for navigation, going to history tab');
        router.replace('/(tabs)/(history)');
        return;
      }
      
      const newestProduct = currentProducts[0];
      const productId = newestProduct.id;
      
      logNavigation(`Found product for navigation: ${productId}`);
      
      // Using a simple, direct approach to minimize rendering issues
      logNavigation(`Using simplified navigation to history detail`);
      
      // Navigate directly to history detail
      router.navigate('/(tabs)/(history)');
      setTimeout(() => {
        router.push({
          pathname: '/(tabs)/(history)/[id]',
          params: { id: productId }
        });
      }, 500);
    } catch (err) {
      logNavigation(`Navigation error: ${err instanceof Error ? err.message : 'Unknown error'}`);
      router.navigate('/(tabs)/(history)');
    }
  }, []);

  // Handle navigation after analysis completion
  useEffect(() => {
    // Only navigate when analysis is complete and not already navigating
    if (analysisComplete && !navigating && !error && !isOffline) {
      logNavigation(`Analysis complete state detected in useEffect`);
      
      // We no longer start navigation here since we do it in the render function
      // This is just for logging purposes now
    }
  }, [analysisComplete, navigating, error, isOffline]);

  // This useEffect handles the analysis when the screen loads
  useEffect(() => {
    if (!photoPath || hasAnalyzed.current) {
      logNavigation('Skipping analysis: No photoPath or already analyzed');
      return;
    }

    async function analyze() {
      try {
        hasAnalyzed.current = true;
        logNavigation(`Starting analysis with userId: ${user?.id}`);
        addBreadcrumb('Starting ingredient analysis', 'analysis', { photoPath });
        
        // Log that analysis has started
        logEvent(Events.ANALYSIS_STARTED);
        
        // Set a flag to identify what stage we're at
        let analysisStage = 'starting';
        
        try {
          // STAGE 1: Call API for analysis
          analysisStage = 'api_call';
          const result = await analyzeIngredients(photoPath, user?.id);
          console.log('Analysis API call successful', result);

          // STAGE 2: Validate result structure
          analysisStage = 'validation';
          if (!result) {
            throw new Error('API returned empty result');
          }
          
          console.log('Result structure validation passed');
          
          // STAGE 3: Add to product store
          analysisStage = 'store_add';
          console.log('Adding product to store', { 
            isVegan: result.isVegan,
            confidence: result.confidence
          });
          
          // Try to add the product and capture the result
          let productId;
          try {
            productId = addProduct({
              imageUri: `file://${photoPath}`,
              isVegan: result.isVegan !== undefined ? result.isVegan : false,
              confidence: result.confidence !== undefined ? result.confidence : 0,
              nonVeganIngredients: result.nonVeganIngredients || [],
              allIngredients: result.allIngredients || [],
              reasoning: result.reasoning || '',
              watchedIngredientsFound: result.watchedIngredientsFound || []
            });
            console.log('Product successfully added to store with ID:', productId);
          } catch (addError) {
            console.error('Error adding product to store:', addError);
            throw new Error('Kunde inte lägga till produkt i historik: ' + (addError instanceof Error ? addError.message : 'okänt fel'));
          }
          
          // STAGE 4: Update usage limit
          analysisStage = 'update_usage';
          await refreshUsageLimit();
          console.log('Usage limit updated');
          
          // STAGE 5: Update UI state
          analysisStage = 'update_ui';
          setLoading(false);
          setAnalysisComplete(true);
          console.log('UI state updated to show completion screen');
          
          // STAGE 6: Verify product was added
          analysisStage = 'verify_product';
          const newProducts = useStore.getState().products;
          console.log('Product count after addition:', newProducts.length);
          
          if (newProducts.length > 0) {
            const newestProduct = newProducts[0];
            logNavigation(`Product added successfully with ID: ${newestProduct.id}`);
            
            // Log that analysis is complete
            logEvent(Events.ANALYSIS_COMPLETED, {
              is_vegan: newestProduct.isVegan,
              confidence: Math.round((newestProduct.confidence || 0) * 100),
              ingredient_count: (newestProduct.allIngredients || []).length,
              non_vegan_ingredient_count: (newestProduct.nonVeganIngredients || []).length,
              watched_ingredients_count: (newestProduct.watchedIngredientsFound || []).length || 0
            });
            
            // Success haptic feedback
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            console.log('Analysis flow completed successfully');
          } else {
            console.error('No products found after adding to store');
            throw new Error('Produkten kunde inte läggas till i historik');
          }
        } catch (err) {
          // Log the specific stage where the error occurred
          console.error(`Error during analysis stage "${analysisStage}":`, err);
          throw new Error(`Fel i analysen (${analysisStage}): ${err instanceof Error ? err.message : 'Unknown error'}`);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        logNavigation(`Analysis error: ${errorMessage}`);
        console.error('Analysis error details:', err);
        
        // Capture exception for all errors with detailed context
        captureException(err instanceof Error ? err : new Error('Unknown analysis error'), { 
          context: 'ingredient_analysis',
          extra: { 
            photoPath, 
            userId: user?.id,
            error: errorMessage
          }
        });
        
        // Error haptic feedback
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        if (err instanceof Error) {
          if (err.message === 'OFFLINE_MODE') {
            setIsOffline(true);
            addBreadcrumb('App in offline mode', 'analysis', { status: 'offline' });
            
            // Log offline event
            logEvent('analysis_offline', {
              timestamp: new Date().toISOString()
            });
          } else if (err.message === 'USAGE_LIMIT_EXCEEDED') {
            setError('Du har nått din månatliga gräns för analyser.');
            
            // Log usage limit event
            logEvent('usage_limit_reached', {
              timestamp: new Date().toISOString()
            });
          } else {
            // Use the exact error message for debugging purposes in development
            const displayError = __DEV__ 
              ? `Fel: ${err.message}`
              : 'Ett fel uppstod vid analysen. Kontrollera bilden och försök igen.';
            
            setError(displayError);
            
            // Log analysis error
            logEvent(Events.ANALYSIS_ERROR, {
              error_message: err.message,
              error_type: 'analysis_error'
            });
          }
        } else {
          setError('Ett oväntat fel uppstod. Försök igen.');
          
          // Log unexpected error
          logEvent(Events.ANALYSIS_ERROR, {
            error_message: 'Unexpected error',
            error_type: 'unknown_error'
          });
        }
        
        // Ensure loading is always set to false in error cases
        setLoading(false);
      }
    }
  
    analyze();
  }, [photoPath, user, addProduct]);

  // Handle navigation to history tab
  const handleNavigateToHistory = () => {
    // Log navigation
    logEvent('navigation', { 
      from: 'offline_result', 
      to: 'history' 
    });
    
    // Unlock navigation before attempting to navigate
    AsyncStorage.removeItem(NAV_LOCK_KEY)
      .then(() => setNavLocked(false))
      .catch(err => console.error('Failed to clear navigation lock:', err));
      
    router.navigate('/(tabs)/(history)');
  };

  // Handle taking a new photo
  const handleTakeNewPhoto = () => {
    // Log new photo action
    logEvent('new_photo_from_result', { 
      result_state: isOffline ? 'offline' : (error ? 'error' : 'success') 
    });
    
    // Unlock navigation before attempting to navigate
    AsyncStorage.removeItem(NAV_LOCK_KEY)
      .then(() => setNavLocked(false))
      .catch(err => console.error('Failed to clear navigation lock:', err));
      
    router.navigate('/(tabs)/(scan)');
  };

  // Show loading screen
  if (loading) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <ActivityIndicator size="large" color="#ffd33d" />
        <StyledText className="text-text-primary font-sans mt-4">
          Analyserar ingredienser...
        </StyledText>
      </StyledView>
    );
  }

  // Show completion screen with a button to continue
  if (analysisComplete && !navigating) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main">
        <Ionicons name="checkmark-circle-outline" size={64} color="#4CAF50" />
        <StyledText className="text-text-primary font-sans-medium text-xl mt-6 text-center">
          Analysen är klar!
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mt-3 mb-8">
          Ingredienslistan har analyserats.
        </StyledText>
        
        {/* Continue button */}
        <StyledPressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setNavigating(true);
            logNavigation('User pressed Continue button, navigating to details');
            navigateToHistoryDetail();
          }}
          className="bg-primary px-8 py-3 rounded-lg mt-4"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Se resultat
          </StyledText>
        </StyledPressable>
        
        {/* For development troubleshooting - remove in production */}
        {__DEV__ && (
          <StyledView className="mt-8 px-4 py-2 bg-gray-800 rounded-lg max-w-[90%]">
            <StyledText className="text-yellow-400 font-mono text-xs">
              Navigation log:
            </StyledText>
            {navigationLog.slice(-8).map((log, i) => (
              <StyledText key={i} className="text-gray-300 font-mono text-[10px] mt-1">
                {log}
              </StyledText>
            ))}
          </StyledView>
        )}
      </StyledView>
    );
  }

  // Show offline screen
  if (isOffline) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main p-4">
        <Ionicons name="cloud-offline-outline" size={48} color="#ffd33d" />
        <StyledText className="text-text-primary font-sans-medium text-xl text-center mt-4">
          Offline-läge
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mt-2 mb-6">
          Bilden har sparats och kommer att analyseras automatiskt när du är online igen.
        </StyledText>
        <StyledView className="flex-row gap-4">
          <StyledPressable 
            onPress={handleNavigateToHistory}
            className="bg-primary px-6 py-3 rounded-lg"
          >
            <StyledText className="text-text-inverse font-sans-medium">
              Gå till historik
            </StyledText>
          </StyledPressable>
          <StyledPressable 
            onPress={handleTakeNewPhoto}
            className="bg-gray-700 px-6 py-3 rounded-lg"
          >
            <StyledText className="text-text-primary font-sans-medium">
              Ta ny bild
            </StyledText>
          </StyledPressable>
        </StyledView>
      </StyledView>
    );
  }

  // Show error screen
  if (error) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main p-4">
        <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
        <StyledText className="text-text-primary font-sans-medium text-xl text-center mt-4">
          Något gick fel
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-center mt-2 mb-6">
          {error}
        </StyledText>
        
        {/* Show debug info in development mode */}
        {__DEV__ && navigationLog.length > 0 && (
          <StyledView className="mt-2 mb-6 p-2 bg-gray-800 rounded-lg max-w-[90%]">
            <StyledText className="text-yellow-400 font-mono text-xs">
              Debug logs:
            </StyledText>
            {navigationLog.slice(-5).map((log, i) => (
              <StyledText key={i} className="text-gray-300 font-mono text-[10px] mt-1">
                {log}
              </StyledText>
            ))}
          </StyledView>
        )}
        
        <StyledPressable 
          onPress={() => {
            // First clear all navigation locks
            AsyncStorage.removeItem(NAV_LOCK_KEY)
              .catch(err => console.error('Error clearing navigation lock:', err));
              
            // Then navigate back to scan tab
            router.replace('/(tabs)/(scan)');
          }}
          className="mt-6 bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Återgå till huvudsidan
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  // Fallback screen (should not normally be reached)
  useEffect(() => {
    // If we reach this fallback state, log it and redirect to scan tab after a brief delay
    if (!loading && !analysisComplete && !error && !isOffline) {
      logNavigation('Reached unexpected fallback state, redirecting to scan tab');
      
      // After a small delay, redirect to scan tab
      const redirectTimer = setTimeout(() => {
        if (isScreenMounted.current) {
          router.replace('/(tabs)/(scan)');
        }
      }, 200);
      
      return () => clearTimeout(redirectTimer);
    }
  }, [loading, analysisComplete, error, isOffline]);
  
  // Fallback screen with a more informative message
  return (
    <StyledView className="flex-1 justify-center items-center bg-background-main">
      <Ionicons name="refresh-circle-outline" size={48} color="#ffd33d" />
      <StyledText className="text-text-primary font-sans text-center mt-4">
        Återställer vy...
      </StyledText>
    </StyledView>
  );
}