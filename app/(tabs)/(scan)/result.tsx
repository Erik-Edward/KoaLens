// app/(tabs)/(scan)/result.tsx
import { useEffect, useState, useCallback, useRef } from 'react';
import { View, Text, ActivityIndicator, Pressable, Share } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { analyzeIngredients } from '@/services/claudeVisionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { styled } from 'nativewind';
import { useStore } from '@/stores/useStore';
import { captureException, addBreadcrumb } from '@/lib/sentry';
// Ändra importen till vår wrapper
import { logEvent, Events, logScreenView } from '@/lib/analyticsWrapper';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export default function ResultScreen() {
  const { photoPath } = useLocalSearchParams<{ photoPath: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(false);
  const router = useRouter();
  const hasAnalyzed = useRef(false);
  const initialProductCount = useRef<number | null>(null);
  const products = useStore((state) => state.products);

  // Logga skärmvisning när komponenten monteras
  useEffect(() => {
    logScreenView('AnalysisResult');
  }, []);

  useEffect(() => {
    if (initialProductCount.current === null) {
      initialProductCount.current = products.length;
    } else if (products.length > initialProductCount.current && loading) {
      // Vi har fått en ny produkt och är fortfarande i laddningsläge
      const newProduct = products[0];
      
      // Logga att analysen är klar med produktdetaljer
      logEvent(Events.ANALYSIS_COMPLETED, {
        is_vegan: newProduct.isVegan,
        confidence: Math.round(newProduct.confidence * 100),
        ingredient_count: newProduct.allIngredients.length,
        non_vegan_ingredient_count: newProduct.nonVeganIngredients.length,
        watched_ingredients_count: newProduct.watchedIngredientsFound.length
      });
      
      router.dismissTo('/(tabs)/(scan)');
      router.push({
        pathname: '/(tabs)/(history)/[id]',
        params: { id: newProduct.id }
      });
    }
  }, [products, loading, router]);

  useEffect(() => {
    async function analyze() {
      if (!photoPath || hasAnalyzed.current) {
        return;
      }
  
      try {
        hasAnalyzed.current = true;
        addBreadcrumb('Starting ingredient analysis', 'analysis', { photoPath });
        
        // Logga att analysen har påbörjats
        logEvent(Events.ANALYSIS_STARTED);
        
        await analyzeIngredients(photoPath);
        
        addBreadcrumb('Analysis completed', 'analysis');
      } catch (err) {
        console.log('Analysis error:', err);
        
        if (err instanceof Error) {
          if (err.message === 'OFFLINE_MODE') {
            setIsOffline(true);
            addBreadcrumb('App in offline mode', 'analysis', { status: 'offline' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            
            // Logga offline-händelse
            logEvent('analysis_offline', {
              timestamp: new Date().toISOString()
            });
          } else {
            setError(err.message);
            captureException(err, { context: 'ingredient_analysis' });
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            
            // Logga analysfel
            logEvent(Events.ANALYSIS_ERROR, {
              error_message: err.message,
              error_type: 'analysis_error'
            });
          }
        } else {
          setError('Ett oväntat fel uppstod');
          captureException(new Error('Unexpected analysis error'), { context: 'ingredient_analysis' });
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          
          // Logga oväntat fel
          logEvent(Events.ANALYSIS_ERROR, {
            error_message: 'Unexpected error',
            error_type: 'unknown_error'
          });
        }
      } finally {
        setLoading(false);
      }
    }
  
    analyze();
  }, [photoPath]);

  const handleNavigateToHistory = () => {
    // Logga navigation
    logEvent('navigation', { 
      from: 'offline_result', 
      to: 'history' 
    });
    
    router.dismissTo('/(tabs)/(scan)');
    router.replace('/(tabs)/(history)');
  };

  const handleTakeNewPhoto = () => {
    // Logga ny fotoåtgärd
    logEvent('new_photo_from_result', { 
      result_state: isOffline ? 'offline' : (error ? 'error' : 'success') 
    });
    
    router.dismissTo('/(tabs)/(scan)');
  };

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

  if (error) {
    return (
      <StyledView className="flex-1 justify-center items-center bg-background-main p-4">
        <Ionicons name="alert-circle-outline" size={48} color="#f44336" />
        <StyledText className="text-text-primary font-sans text-center mt-4">
          {error}
        </StyledText>
        <StyledPressable 
          onPress={handleTakeNewPhoto}
          className="mt-6 bg-primary px-6 py-3 rounded-lg"
        >
          <StyledText className="text-text-inverse font-sans-medium">
            Försök igen
          </StyledText>
        </StyledPressable>
      </StyledView>
    );
  }

  return null; // Resultatet visas i historikfliken
}