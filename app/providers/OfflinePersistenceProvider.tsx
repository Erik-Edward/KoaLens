// app/providers/OfflinePersistenceProvider.tsx
import { FC, ReactNode, useEffect } from 'react';
import { QueryClient } from '@tanstack/react-query';
import type { PersistedClient } from '@tanstack/react-query-persist-client';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { router } from 'expo-router';
import { useStore } from '@/stores/useStore';
import 'expo-dev-client';

// Backend URL från config eller env
const BACKEND_URL = __DEV__ ? 'http://192.168.1.67:3000' : 'https://din-produktions-url.com';

interface Props {
  children: ReactNode;
}

// Konfigurera QueryClient med längre cache-tid för offline-stöd
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      gcTime: 1000 * 60 * 60 * 24, // 24 timmar
      networkMode: 'offlineFirst',
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      networkMode: 'offlineFirst',
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
  },
});

// Skapa en AsyncStorage persister med anpassad serialisering
const asyncStoragePersister = createAsyncStoragePersister({
  storage: AsyncStorage,
  key: 'KOALENS_QUERY_CACHE',
  throttleTime: 2000,
  serialize: (data: PersistedClient) => JSON.stringify({
    ...data,
    timestamp: Date.now(),
  }),
  deserialize: (cachedString: string) => {
    const data = JSON.parse(cachedString);
    const maxAge = 1000 * 60 * 60 * 24; // 24 timmar
    if (Date.now() - data.timestamp > maxAge) {
      throw new Error('Cache expired');
    }
    return data;
  },
});

// Interface för offline request
interface OfflineRequest {
  key: string;
  type: 'analysis';
  data: {
    analysisId: string;
    base64Data: string;
  };
  timestamp: number;
}

// Utility för att hantera offline mutations
class OfflineRequestQueueManager {
  private static queue: OfflineRequest[] = [];
  private static isProcessing = false;

  static async addToQueue(key: string, type: 'analysis', data: any) {
    console.log('Adding to offline queue:', { key, type });
    
    const request: OfflineRequest = {
      key,
      type,
      data,
      timestamp: Date.now(),
    };
    
    this.queue.push(request);
    await this.persistQueue();
    console.log('Request added to queue and persisted');
  }

  static async processQueue() {
    if (this.isProcessing || this.queue.length === 0) {
      if (this.queue.length > 0) {
        console.log('Queue processing skipped: Already processing');
      }
      return;
    }

    const networkState = await NetInfo.fetch();
    if (!networkState.isConnected) {
      console.log('Not connected to network, skipping queue processing');
      return;
    }

    if (this.queue.length > 0) {
      console.log('Starting to process offline queue:', this.queue.length, 'items');
    }
    this.isProcessing = true;

    try {
      while (this.queue.length > 0) {
        const request = this.queue[0];
        console.log('Processing request:', {
          key: request.key,
          type: request.type,
          analysisId: request.data.analysisId,
          timestamp: new Date(request.timestamp).toISOString()
        });
        
        try {
          if (request.type === 'analysis') {
            const { base64Data, analysisId } = request.data;
            console.log('Sending analysis request to backend...');
            
            // Perform the analysis
            const result = await fetch(`${BACKEND_URL}/analyze`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: base64Data,
                isOfflineAnalysis: true
              })
            });

            if (!result.ok) {
              const errorText = await result.text();
              console.error('Analysis request failed:', errorText);
              throw new Error('Analysis failed: ' + errorText);
            }

            const analysisResult = await result.json();
            console.log('Received analysis result:', {
              isVegan: analysisResult.isVegan,
              confidence: analysisResult.confidence,
              ingredientCount: analysisResult.allIngredients?.length
            });
            
            // Get watchedIngredients from store
            const store = useStore.getState();
            const watchedIngredients = store.preferences?.watchedIngredients || {};

            // Check for watched ingredients in the analysis result
            const watchedIngredientsFound = analysisResult.allIngredients.reduce((found: any[], ingredient: string) => {
              const lowerIngredient = ingredient.toLowerCase().trim();
              Object.entries(watchedIngredients).forEach(([key, watched]) => {
                if (watched.enabled && lowerIngredient.includes(key.toLowerCase())) {
                  found.push({
                    name: watched.name,
                    description: watched.description,
                    reason: `Hittade "${watched.name}" i ingrediensen "${ingredient}"`
                  });
                }
              });
              return found;
            }, []);
            
            // Add to history
            const addProduct = store.addProduct;
            addProduct({
              imageUri: `data:image/jpeg;base64,${base64Data}`,
              isVegan: analysisResult.isVegan,
              confidence: analysisResult.confidence,
              nonVeganIngredients: analysisResult.nonVeganIngredients,
              allIngredients: analysisResult.allIngredients,
              reasoning: analysisResult.reasoning,
              watchedIngredientsFound
            });

            console.log('Analysis completed and saved to history');

            router.replace('/(tabs)/(history)');
            
            // Remove from queue
            this.queue.shift();
            await this.persistQueue();
            console.log('Request removed from queue');
            
            // Clean up saved analysis data
            await AsyncStorage.removeItem(`KOALENS_ANALYSIS_${analysisId}`);
            console.log('Cleaned up analysis data');
          }
        } catch (error) {
          console.error('Error processing request:', error);
          const isNetErr = this.isNetworkError(error);
          console.log('Is network error:', isNetErr);
          
          if (!isNetErr) {
            this.queue.shift();
            await this.persistQueue();
            console.log('Request removed from queue due to non-network error');
          } else {
            console.log('Keeping request in queue due to network error');
          }
          break;
        }
      }
    } finally {
      this.isProcessing = false;
      console.log('Queue processing completed');
    }
  }

  private static isNetworkError(error: any): boolean {
    if (!error) return false;

    const errorString = error.toString().toLowerCase();
    const messageString = error.message?.toLowerCase() || '';
    
    const networkErrorIndicators = [
      'network', 'connection', 'offline', 'internet', 'connect',
      'econnaborted', 'networkerror', 'fetch failed'
    ];

    return networkErrorIndicators.some(indicator => 
      errorString.includes(indicator) || messageString.includes(indicator)
    );
  }

  private static async persistQueue() {
    try {
      await AsyncStorage.setItem(
        'KOALENS_OFFLINE_QUEUE',
        JSON.stringify(this.queue)
      );
      console.log('Queue persisted, remaining items:', this.queue.length);
    } catch (error) {
      console.error('Failed to persist offline queue:', error);
    }
  }

  static async loadPersistedQueue() {
    try {
      const persistedQueue = await AsyncStorage.getItem('KOALENS_OFFLINE_QUEUE');
      if (persistedQueue) {
        this.queue = JSON.parse(persistedQueue);
        console.log('Loaded persisted queue:', this.queue.length, 'items');
      }
    } catch (error) {
      console.error('Failed to load persisted offline queue:', error);
    }
  }
}

const OfflinePersistenceProvider: FC<Props> = ({ children }) => {
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout;

    const unsubscribe = NetInfo.addEventListener(state => {
      if (state.isConnected) {
        // Vänta lite innan vi synkar
        console.log('Network connected, scheduling sync...');
        syncTimeout = setTimeout(async () => {
          console.log('Executing scheduled sync...');
          try {
            await OfflineRequestQueueManager.processQueue();
          } catch (error) {
            console.error('Error during sync:', error);
          }
        }, 2000);
      } else {
        console.log('Network disconnected');
      }
    });

    return () => {
      unsubscribe();
      if (syncTimeout) clearTimeout(syncTimeout);
    };
  }, []);

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister: asyncStoragePersister,
        maxAge: 1000 * 60 * 60 * 24,
        buster: 'v1',
      }}
      onSuccess={() => {
        console.log('PersistQueryClientProvider initialized successfully');
        OfflineRequestQueueManager.processQueue();
      }}
    >
      {children}
    </PersistQueryClientProvider>
  );
};

export default OfflinePersistenceProvider;
export { OfflineRequestQueueManager as OfflineRequestQueue };