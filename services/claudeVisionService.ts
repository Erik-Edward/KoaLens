// services/claudeVisionService.ts
import { OfflineRequestQueue } from '../app/providers/OfflinePersistenceProvider';
import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/stores/useStore';
import { WatchedIngredientFound } from '@/types/settingsTypes';
import { logEvent, Events } from '@/lib/analyticsWrapper';
import { captureException, addBreadcrumb } from '@/lib/sentry';

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

// Validera API-svar för robusthet
const validateApiResponse = (data: any): boolean => {
  if (!data) return false;
  
  try {
    // Kontrollera att objektet har rätt struktur
    const hasRequiredFields = 
      'isVegan' in data && 
      'confidence' in data && 
      'nonVeganIngredients' in data && 
      'allIngredients' in data && 
      'reasoning' in data;
      
    if (!hasRequiredFields) {
      console.error('API response missing required fields:', data);
      return false;
    }
    
    // Kontrollera typer
    if (typeof data.isVegan !== 'boolean') {
      console.error('isVegan is not a boolean:', data.isVegan);
      return false;
    }
    
    if (typeof data.confidence !== 'number' || isNaN(data.confidence)) {
      console.error('confidence is not a valid number:', data.confidence);
      return false; 
    }
    
    if (!Array.isArray(data.nonVeganIngredients)) {
      console.error('nonVeganIngredients is not an array:', data.nonVeganIngredients);
      return false;
    }
    
    if (!Array.isArray(data.allIngredients)) {
      console.error('allIngredients is not an array:', data.allIngredients);
      return false;
    }
    
    if (typeof data.reasoning !== 'string') {
      console.error('reasoning is not a string:', data.reasoning);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error validating API response:', error);
    return false;
  }
};

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { 
    functionName: string; // För loggning
    userId?: string;     // För användarkontext i loggning
    maxRetries?: number;
    initialDelayMs?: number;
    maxDelayMs?: number;
    backoffFactor?: number;
  } = { functionName: 'unknown' }
): Promise<T> {
  const maxRetries = options.maxRetries || RETRY_CONFIG.maxRetries;
  const initialDelayMs = options.initialDelayMs || RETRY_CONFIG.initialDelayMs;
  const maxDelayMs = options.maxDelayMs || RETRY_CONFIG.maxDelayMs;
  const backoffFactor = options.backoffFactor || RETRY_CONFIG.backoffFactor;
  
  let retryCount = 0;
  let delay = initialDelayMs;
  let lastError: Error | null = null;

  addBreadcrumb('Starting retry with backoff', 'api', {
    functionName: options.functionName,
    userId: options.userId,
    maxRetries,
  });

  while (true) {
    try {
      return await fn();
    } catch (error) {
      retryCount++;
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Add to Sentry breadcrumbs
      addBreadcrumb('API retry failed', 'api', {
        functionName: options.functionName,
        retryCount,
        errorMessage: lastError.message,
        userId: options.userId
      });

      // Check if it's an "Overloaded" error that we should retry
      const isOverloadedError = lastError.message.includes('Overloaded') || 
        lastError.message.includes('529') ||
        lastError.message.includes('too many requests') ||
        lastError.message.includes('rate limit');
      
      // Network errors should also be retried
      const isNetworkError = lastError.message.includes('network') ||
        lastError.message.includes('connection') ||
        lastError.message.includes('timeout') ||
        lastError.message.includes('fetch failed');
      
      const shouldRetry = (isOverloadedError || isNetworkError) && retryCount < maxRetries;
      
      // Check if we should retry
      if (!shouldRetry) {
        console.log(`No more retries (${retryCount}/${maxRetries}) for ${options.functionName}`);
        throw lastError;
      }

      console.log(`Retry ${retryCount}/${maxRetries} after ${delay}ms for ${options.functionName}`);
      logEvent('analysis_retry', {
        retry_count: retryCount,
        delay_ms: delay,
        function_name: options.functionName,
        error_type: isOverloadedError ? 'overloaded' : 'network',
        error_message: lastError.message
      });

      // Wait before retrying with exponential backoff
      await sleep(delay);
      
      // Increase delay for next retry with exponential backoff, but cap it
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }
}

export async function analyzeIngredients(imagePath: string, userId?: string): Promise<IngredientAnalysisResult> {
  try {
    console.log('Starting ingredient analysis for:', imagePath, 'userId:', userId);
    addBreadcrumb('Starting ingredient analysis', 'analysis', { userId });

    // Validera att sökvägen finns
    if (!imagePath) {
      console.error('No image path provided');
      throw new Error('Ingen bild angiven');
    }

    // FÖRBÄTTRING: Robustare bildkonvertering till base64
    let base64Data: string;
    try {
      const response = await fetch(`file://${imagePath}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      const blob = await response.blob();
      if (!blob || blob.size === 0) {
        throw new Error('Retrieved empty image blob');
      }
      
      base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          try {
            const result = reader.result as string;
            if (!result) {
              reject(new Error('FileReader returned empty result'));
              return;
            }
            
            // Kontrollera om resultatet redan är base64 eller behöver extraktion
            if (result.includes('base64,')) {
              resolve(result.split(',')[1]);
            } else {
              resolve(result);
            }
          } catch (err) {
            reject(err);
          }
        };
        reader.onerror = (err) => {
          console.error('FileReader error:', err);
          reject(new Error('FileReader error: ' + (err ? String(err) : 'unknown')));
        };
        reader.readAsDataURL(blob);
      });
      
      // Validera att base64-data faktiskt är strings och inte tom
      if (!base64Data || typeof base64Data !== 'string' || base64Data.length === 0) {
        throw new Error('Base64 conversion failed - empty result');
      }
    } catch (conversionError) {
      console.error('Error converting image to base64:', conversionError);
      addBreadcrumb('Image conversion error', 'error', { 
        error: conversionError instanceof Error ? conversionError.message : String(conversionError)
      });
      
      // Logga händelsen separerat för tydlighet
      logEvent(Events.ANALYSIS_ERROR, {
        error_type: 'image_conversion',
        error_message: conversionError instanceof Error ? 
          conversionError.message : 'Unknown conversion error',
        userId
      });
      
      throw new Error('Kunde inte läsa bilden. Försök igen med en annan bild.');
    }

    console.log('Image converted to base64, size:', Math.round((base64Data.length * 0.75) / 1024), 'KB');

    // FÖRBÄTTRING: Bättre nätverkskontroll
    const networkState = await NetInfo.fetch();
    const isConnected = networkState.isConnected && networkState.isInternetReachable !== false;
    console.log('Network state:', networkState, 'isConnected:', isConnected, 'userId:', userId);

    if (!isConnected) {
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
    addBreadcrumb('Sending analysis request', 'api', { userId });
    
    // FÖRBÄTTRING: Använda retry med backoff
    const analysisResult = await retryWithBackoff(
      async () => {
        // FÖRBÄTTRING: Bättre felhantering vid API-anrop
        try {
          const response = await fetch(`${BACKEND_URL}/analyze`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image: base64Data,
              isOfflineAnalysis: false,
              isCroppedImage: true,
              userId
            })
          });

          if (!response.ok) {
            // Försök läsa felmeddelandet
            let errorMessage: string;
            let errorData: any;
            
            try {
              errorData = await response.json();
              errorMessage = errorData.message || `Server responded with status: ${response.status}`;
            } catch (parseError) {
              errorMessage = `Failed to parse error response: ${response.status} ${response.statusText}`;
            }
            
            console.error('Backend error:', errorMessage, errorData);
            
            // Hantera specifika felkoder
            if (response.status === 429 || response.status === 529 || 
                errorMessage.includes('Overloaded') || errorMessage.includes('too many requests')) {
              throw new Error('CLAUDE_OVERLOADED');
            }
            
            if (errorData && errorData.error === 'USAGE_LIMIT_EXCEEDED') {
              logEvent(Events.ANALYSIS_ERROR, {
                error_type: 'usage_limit_exceeded',
                userId
              });
              
              throw new Error('USAGE_LIMIT_EXCEEDED');
            }
            
            // Logga API-fel
            logEvent(Events.ANALYSIS_ERROR, {
              error_type: 'api_error',
              error_status: response.status,
              error_message: errorMessage,
              userId
            });
            
            throw new Error(errorMessage);
          }

          // FÖRBÄTTRING: Säkrare JSON-parsning
          let result;
          try {
            result = await response.json();
            console.log('Raw response data received');
          } catch (parseError) {
            console.error('Failed to parse API response:', parseError);
            throw new Error('Fick ett ogiltigt svar från servern. Försök igen.');
          }
          
          return result;
        } catch (fetchError) {
          console.error('Fetch error:', fetchError);
          
          // Detaljer om nätverksfel för felsökning
          const errorDetails = {
            message: fetchError instanceof Error ? fetchError.message : String(fetchError),
            stack: fetchError instanceof Error ? fetchError.stack : undefined,
            userId
          };
          
          addBreadcrumb('Fetch error in analyzeIngredients', 'error', errorDetails);
          
          // Re-throw for retry handling
          throw fetchError;
        }
      },
      { 
        functionName: 'analyzeIngredients',
        userId
      }
    );
    
    console.log('Analysis completed, userId was:', userId);
    addBreadcrumb('Analysis API call succeeded', 'api', { userId });
    
    // FÖRBÄTTRING: Validera svaret innan vi använder det
    if (!validateApiResponse(analysisResult)) {
      console.error('Received invalid API response:', analysisResult);
      throw new Error('Fick ett ogiltigt svar från servern. Försök igen.');
    }
    
    // FÖRBÄTTRING: Skapa ett säkert resultatobjekt med default-värden för saknade fält
    const sanitizedResult: IngredientAnalysisResult = {
      isVegan: typeof analysisResult.isVegan === 'boolean' ? analysisResult.isVegan : false,
      confidence: typeof analysisResult.confidence === 'number' && !isNaN(analysisResult.confidence) ? 
        analysisResult.confidence : 0.5,
      nonVeganIngredients: Array.isArray(analysisResult.nonVeganIngredients) ? 
        analysisResult.nonVeganIngredients : [],
      allIngredients: Array.isArray(analysisResult.allIngredients) ? 
        analysisResult.allIngredients : [],
      reasoning: typeof analysisResult.reasoning === 'string' ? 
        analysisResult.reasoning : 'Ingen analystext tillgänglig',
      watchedIngredientsFound: [] // Vi fyller i detta senare
    };
    
    console.log('Sanitized result created with values:', {
      isVegan: sanitizedResult.isVegan,
      confidence: sanitizedResult.confidence,
      ingredients: sanitizedResult.allIngredients.length
    });
    
    // FÖRBÄTTRING: Robustare watchedIngredients-kontroll
    try {
      // Fortsätt med att bearbeta bevakade ingredienser
      const { preferences } = useStore.getState();
      const watchedIngredients = preferences?.watchedIngredients || {};
      const watchedIngredientsFound: WatchedIngredientFound[] = [];
      
      if (sanitizedResult.allIngredients && sanitizedResult.allIngredients.length > 0) {
        sanitizedResult.allIngredients.forEach((ingredient: string) => {
          if (!ingredient) return; // Hoppa över tomma ingredienser
          
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
        console.log('Found watched ingredients:', watchedIngredientsFound.length);
      }
      
      // Lägg till de bevakade ingredienserna i resultatet
      sanitizedResult.watchedIngredientsFound = watchedIngredientsFound;
      
    } catch (watchedError) {
      console.error('Error processing watched ingredients:', watchedError);
      // Lägg till en breadcrumb för detta specifika fel
      addBreadcrumb('Error processing watched ingredients', 'error', { 
        error: watchedError instanceof Error ? watchedError.message : String(watchedError),
        userId
      });
      
      // Fortsätt med tomt watchedIngredientsFound-fält istället för att avbryta hela analysen
      sanitizedResult.watchedIngredientsFound = [];
    }
    
    // Logga framgångsrik analys för spårning
    logEvent(Events.ANALYSIS_COMPLETED, {
      is_vegan: sanitizedResult.isVegan,
      confidence: Math.round(sanitizedResult.confidence * 100),
      ingredient_count: sanitizedResult.allIngredients.length,
      non_vegan_count: sanitizedResult.nonVeganIngredients.length,
      watched_found: sanitizedResult.watchedIngredientsFound.length,
      userId
    });
    
    console.log('Analysis successful, returning sanitized result');
    return sanitizedResult;
    
  } catch (error) {
    console.error('API analysis failed:', error, 'userId:', userId);
    
    // FÖRBÄTTRING: Bättre felhantering för specifika feltyper
    if (error instanceof Error) {
      // Undvik att modifiera specialfallsfel - låt dem passera oförändrade
      if (error.message === 'OFFLINE_MODE' || 
          error.message === 'USAGE_LIMIT_EXCEEDED' ||
          error.message === 'CLAUDE_OVERLOADED') {
        throw error;
      }
      
      // Lägg till i Sentry för spårning
      captureException(error, {
        tags: { userId },
        level: 'error'
      });
      
      // Logga API-felet
      logEvent(Events.ANALYSIS_ERROR, {
        error_type: 'api_error',
        error_message: error.message,
        userId
      });
      
      // Kontrollera efter vanliga nätverksfel
      const errorMessage = error.message.toLowerCase();
      
      // Hantera timeout-fel
      if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
        throw new Error('Anslutningen tog för lång tid. Kontrollera din internetanslutning och försök igen.');
      }
      
      // Hantera nätverksfel
      if (errorMessage.includes('network') || 
          errorMessage.includes('connection') || 
          errorMessage.includes('fetch')) {
        throw new Error('Kunde inte ansluta till servern. Kontrollera din internetanslutning och försök igen.');
      }
      
      // Vidarebefordra ursprungliga användarvänliga felmeddelanden
      throw error;
    }
    
    // Generiskt felmeddelande för okända fel
    captureException(new Error('Unknown analysis error: ' + String(error)), {
      tags: { userId },
      level: 'error'
    });
    
    throw new Error('Kunde inte analysera ingredienslistan. Kontrollera att bilden är tydlig och försök igen.');
  }
}

// FÖRBÄTTRING: Lagt till stark typning för getPendingAnalyses
export async function getPendingAnalyses(): Promise<PendingAnalysis[]> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const analysisKeys = allKeys.filter(key => key.startsWith('KOALENS_ANALYSIS_'));
    console.log('Found analysis keys:', analysisKeys);

    const analyses = await Promise.all(
      analysisKeys.map(async (key) => {
        try {
          const data = await AsyncStorage.getItem(key);
          if (!data) return null;
          
          const parsed = JSON.parse(data);
          // Validera minimidata i pendingAnalysis
          if (!parsed.id || !parsed.imageUri || !parsed.base64Data) {
            console.warn('Invalid pending analysis found, skipping:', key);
            return null;
          }
          
          return parsed as PendingAnalysis;
        } catch (err) {
          console.error('Error parsing analysis data:', err);
          return null;
        }
      })
    );
    
    const validAnalyses = analyses.filter((analysis): analysis is PendingAnalysis => analysis !== null);
    console.log('Valid pending analyses:', validAnalyses.length);
    
    return validAnalyses;
  } catch (error) {
    console.error('Error getting pending analyses:', error);
    // Lägg till i Sentry
    captureException(error instanceof Error ? error : new Error('Failed to get pending analyses'));
    return [];
  }
}