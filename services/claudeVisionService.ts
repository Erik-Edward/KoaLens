// services/claudeVisionService.ts
import { OfflineRequestQueue } from '../app/providers/OfflinePersistenceProvider';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/stores/useStore';
import { WatchedIngredientFound } from '@/types/settingsTypes';
import { logEvent, Events } from '@/lib/analyticsWrapper';

interface IngredientAnalysisResult {
  isVegan: boolean;
  confidence: number;
  nonVeganIngredients: string[];
  allIngredients: string[];
  reasoning: string;
  watchedIngredientsFound: WatchedIngredientFound[];
}

interface PendingAnalysis {
  id: string;
  imageUri: string;
  base64Data: string;
  timestamp: number;
}

const BACKEND_URL = __DEV__ ? 'http://192.168.1.67:3000' : 'https://koalens-backend.fly.dev';

export async function analyzeIngredients(imagePath: string, userId?: string): Promise<IngredientAnalysisResult> {
  try {
    console.log('Starting ingredient analysis for:', imagePath);

    const response = await fetch(`file://${imagePath}`);
    const blob = await response.blob();
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    console.log('Image converted to base64, size:', (base64Data.length * 0.75) / 1024, 'KB');

    const networkState = await NetInfo.fetch();
    console.log('Network state:', networkState);

    if (!networkState.isConnected) {
      console.log('Device is offline, saving analysis for later');
      
      logEvent('analysis_saved_offline', {
        timestamp: Date.now(),
        image_size_kb: Math.round((base64Data.length * 0.75) / 1024)
      });
      
      const analysisId = Date.now().toString();
      const pendingAnalysis: PendingAnalysis = {
        id: analysisId,
        imageUri: imagePath,
        base64Data,
        timestamp: Date.now(),
      };

      console.log('Created pending analysis:', analysisId);

      const analysisKey = `KOALENS_ANALYSIS_${analysisId}`;
      await AsyncStorage.setItem(
        analysisKey,
        JSON.stringify(pendingAnalysis)
      );
      console.log('Saved analysis data to AsyncStorage:', analysisKey);

      console.log('Adding analysis to offline queue:', analysisId);
      await OfflineRequestQueue.addToQueue(
        `analyze_${analysisId}`,
        'analysis',
        {
          analysisId,
          base64Data
        }
      );

      throw new Error('OFFLINE_MODE');
    }

    console.log('Starting API analysis request with cropped image', { hasUserId: !!userId });
    try {
      const analysisResponse = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          isOfflineAnalysis: true,
          isCroppedImage: true,
          userId
        })
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json();
        console.error('Backend error:', errorData);
        
        if (errorData.error === 'USAGE_LIMIT_EXCEEDED') {
          logEvent(Events.ANALYSIS_ERROR, {
            error_type: 'usage_limit_exceeded',
            analyses_used: errorData.details?.analysesUsed,
            analyses_limit: errorData.details?.analysesLimit
          });
          
          throw new Error('USAGE_LIMIT_EXCEEDED');
        }
        
        logEvent(Events.ANALYSIS_ERROR, {
          error_type: 'api_error',
          error_status: analysisResponse.status,
          error_message: errorData.message || 'Unknown API error'
        });
        
        throw new Error(errorData.message || 'Analysis failed');
      }

      const result = await analysisResponse.json();
      console.log('Received analysis result:', {
        isVegan: result.isVegan,
        confidence: result.confidence,
        ingredientCount: result.allIngredients?.length
      });

      if (!result || typeof result.isVegan !== 'boolean' || !Array.isArray(result.allIngredients)) {
        console.error('Invalid response format:', result);
        
        logEvent(Events.ANALYSIS_ERROR, {
          error_type: 'format_error',
          error_message: 'Invalid response format from server'
        });
        
        throw new Error('Invalid response format from server');
      }

      const { preferences } = useStore.getState();
      const watchedIngredients = preferences.watchedIngredients;
      const watchedIngredientsFound: WatchedIngredientFound[] = [];
      
      result.allIngredients.forEach((ingredient: string) => {
        const lowerIngredient = ingredient.toLowerCase().trim();
        
        Object.entries(watchedIngredients).forEach(([key, watched]) => {
          if (watched.enabled && lowerIngredient.includes(key.toLowerCase())) {
            watchedIngredientsFound.push({
              name: watched.name,
              description: watched.description,
              reason: `Hittade "${watched.name}" i ingrediensen "${ingredient}"`
            });
          }
        });
      });

      if (watchedIngredientsFound.length > 0) {
        console.log('Found watched ingredients:', watchedIngredientsFound);
      }

      const addProduct = useStore.getState().addProduct;
      addProduct({
        imageUri: `data:image/jpeg;base64,${base64Data}`,
        isVegan: result.isVegan,
        confidence: result.confidence,
        nonVeganIngredients: result.nonVeganIngredients,
        allIngredients: result.allIngredients,
        reasoning: result.reasoning,
        watchedIngredientsFound
      });

      return {
        ...result,
        watchedIngredientsFound
      };

    } catch (error) {
      console.error('API analysis failed:', error);
      
      if (error instanceof Error && error.message === 'USAGE_LIMIT_EXCEEDED') {
        throw error;
      }
      
      logEvent(Events.ANALYSIS_ERROR, {
        error_type: 'api_error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Kunde inte analysera ingredienslistan. Kontrollera att bilden är tydlig och försök igen.');
    }

  } catch (error) {
    console.error('Error in analyzeIngredients:', error);
    throw error;
  }
}

export async function getPendingAnalyses(): Promise<PendingAnalysis[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const analysisKeys = allKeys.filter(key => key.startsWith('KOALENS_ANALYSIS_'));
    console.log('Found analysis keys:', analysisKeys);

    const analyses = await Promise.all(
      analysisKeys.map(async (key) => {
        const data = await AsyncStorage.getItem(key);
        return data ? JSON.parse(data) as PendingAnalysis : null;
      })
    );
    
    const validAnalyses = analyses.filter((analysis): analysis is PendingAnalysis => analysis !== null);
    console.log('Valid pending analyses:', validAnalyses.length);
    
    return validAnalyses;
  } catch (error) {
    console.error('Error getting pending analyses:', error);
    return [];
  }
}