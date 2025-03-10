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

// Backoff logic configuration
const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000, // Start with 1 second delay
  maxDelayMs: 10000,    // Max delay of 10 seconds
  backoffFactor: 2,     // Double the delay each time
};

// Helper for exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const BACKEND_URL = __DEV__ ? 'http://192.168.1.67:3000' : 'https://koalens-backend.fly.dev';

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  retryConfig = RETRY_CONFIG
): Promise<T> {
  let retryCount = 0;
  let delay = retryConfig.initialDelayMs;

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retryCount++;

      // Check if it's an "Overloaded" error that we should retry
      const isOverloadedError = error instanceof Error &&
        (error.message.includes('Overloaded') || 
         error.message.includes('529') ||
         error.message.includes('too many requests') ||
         error.message.includes('rate limit'));
      
      // Check if we should retry
      if (!isOverloadedError || retryCount >= retryConfig.maxRetries) {
        throw error;
      }

      console.log(`Retry ${retryCount}/${retryConfig.maxRetries} after ${delay}ms due to overload`);
      logEvent('analysis_retry', {
        retry_count: retryCount,
        delay_ms: delay,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Wait before retrying with exponential backoff
      await sleep(delay);
      
      // Increase delay for next retry with exponential backoff, but cap it
      delay = Math.min(delay * retryConfig.backoffFactor, retryConfig.maxDelayMs);
    }
  }
}

export async function analyzeIngredients(imagePath: string, userId?: string): Promise<IngredientAnalysisResult> {
  try {
    console.log('Starting ingredient analysis for:', imagePath, 'userId:', userId);

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
    console.log('Network state:', networkState, 'userId:', userId);

    if (!networkState.isConnected) {
      console.log('Device is offline, saving analysis for later. userId:', userId);
      
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

    console.log(`Sending analysis request to ${BACKEND_URL} with userId:`, userId);
    
    // Use retryWithBackoff to handle potential overloaded errors
    return await retryWithBackoff(async () => {
      const analysisResponse = await fetch(`${BACKEND_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: base64Data,
          isOfflineAnalysis: true,
          isCroppedImage: true,
          userId // Include user ID in request
        })
      });

      if (!analysisResponse.ok) {
        const errorData = await analysisResponse.json().catch(() => ({ 
          message: `Server responded with status: ${analysisResponse.status}` 
        }));
        console.error('Backend error:', errorData);
        
        // Handle "Overloaded" errors specifically to allow retry
        if (errorData.error?.type === 'overloaded_error' || 
            errorData.message?.includes('Overloaded') ||
            analysisResponse.status === 529) {
          console.log('Claude API is overloaded, will retry with backoff');
          throw new Error('CLAUDE_OVERLOADED');
        }
        
        if (errorData.error === 'USAGE_LIMIT_EXCEEDED') {
          logEvent(Events.ANALYSIS_ERROR, {
            error_type: 'usage_limit_exceeded',
            analyses_used: errorData.details?.analysesUsed,
            analyses_limit: errorData.details?.analysesLimit
          });
          
          throw new Error('USAGE_LIMIT_EXCEEDED');
        }
        
        // Log all API errors
        logEvent(Events.ANALYSIS_ERROR, {
          error_type: 'api_error',
          error_status: analysisResponse.status,
          error_message: errorData.message || 'Unknown API error'
        });
        
        // Provide a user-friendly error message
        throw new Error('Vi kunde inte analysera bilden just nu. Försök igen senare.');
      }

      // Try to parse the result, with error handling
      let result;
      try {
        result = await analysisResponse.json();
        console.log('Raw response data:', JSON.stringify(result));
      } catch (parseError) {
        console.error('Failed to parse API response:', parseError);
        throw new Error('Fick ett ogiltigt svar från servern. Försök igen.');
      }
      
      console.log('Analysis completed, userId was:', userId);
      
      // Validate and sanitize the response to ensure it matches our expected format
      const sanitizedResult: IngredientAnalysisResult = {
        isVegan: typeof result.isVegan === 'boolean' ? result.isVegan : false,
        confidence: typeof result.confidence === 'number' ? result.confidence : 0,
        nonVeganIngredients: Array.isArray(result.nonVeganIngredients) ? result.nonVeganIngredients : [],
        allIngredients: Array.isArray(result.allIngredients) ? result.allIngredients : [],
        reasoning: typeof result.reasoning === 'string' ? result.reasoning : '',
        watchedIngredientsFound: [] // We'll populate this separately
      };
      
      console.log('Sanitized result:', sanitizedResult);
      
      // Continue with processing the watched ingredients
      const { preferences } = useStore.getState();
      const watchedIngredients = preferences?.watchedIngredients || {};
      const watchedIngredientsFound: WatchedIngredientFound[] = [];
      
      try {
        if (sanitizedResult.allIngredients && sanitizedResult.allIngredients.length > 0) {
          sanitizedResult.allIngredients.forEach((ingredient: string) => {
            if (!ingredient) return; // Skip empty ingredients
            
            const lowerIngredient = ingredient.toLowerCase().trim();
            
            Object.entries(watchedIngredients).forEach(([key, watched]) => {
              if (watched && watched.enabled && lowerIngredient.includes(key.toLowerCase())) {
                watchedIngredientsFound.push({
                  name: watched.name || key,
                  description: watched.description || '',
                  reason: `Hittade "${watched.name || key}" i ingrediensen "${ingredient}"`
                });
              }
            });
          });
        }
        
        if (watchedIngredientsFound.length > 0) {
          console.log('Found watched ingredients:', watchedIngredientsFound);
        }
        
        // Add the watched ingredients to the result
        sanitizedResult.watchedIngredientsFound = watchedIngredientsFound;
        
        return sanitizedResult;
      } catch (watchedError) {
        console.error('Error processing watched ingredients:', watchedError);
        // Still return the sanitized result even if processing watched ingredients fails
        sanitizedResult.watchedIngredientsFound = [];
        return sanitizedResult;
      }
    });
  } catch (error) {
    console.error('API analysis failed:', error, 'userId:', userId);
    
    if (error instanceof Error) {
      // Special handling for overloaded errors
      if (error.message === 'CLAUDE_OVERLOADED') {
        logEvent(Events.ANALYSIS_ERROR, {
          error_type: 'claude_overloaded',
          error_message: 'Claude API är överbelastad. Försök igen om en stund.'
        });
        
        throw new Error('Claude-tjänsten är för tillfället överbelastad. Vänligen försök igen om en stund.');
      }
    
      if (error.message === 'USAGE_LIMIT_EXCEEDED') {
        throw error; // Let the usage limit error pass through unchanged
      }
      
      // Log the API error
      logEvent(Events.ANALYSIS_ERROR, {
        error_type: 'api_error',
        error_message: error instanceof Error ? error.message : 'Unknown error'
      });
      
      // Check for common network errors
      const errorMessage = error.message.toLowerCase();
      
      // Handle timeout errors
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        throw new Error('Anslutningen tog för lång tid. Kontrollera din internetanslutning och försök igen.');
      }
      
      // Handle network errors
      if (errorMessage.includes('network') || errorMessage.includes('connection')) {
        throw new Error('Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.');
      }
      
      // Pass through the error if it's already user-friendly
      throw error;
    }
    
    // Generic fallback error message
    throw new Error('Kunde inte analysera ingredienslistan. Kontrollera att bilden är tydlig och försök igen.');
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