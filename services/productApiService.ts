/**
 * Service för att kommunicera med backend API för produkter
 * Detta är en del av migrationen från lokal analyslogik till backend-baserad
 */

import { Product, NewProduct, ProductAnalysis, WatchedIngredient } from '@/models/productModel';
import { AnalysisService } from './analysisService';

// API bas URL - bör flyttas till en config-fil i produktion
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://api.koalens.app';

interface AnalyzeIngredientsResponse {
  isVegan: boolean | null; // Allow null from API
  isUncertain: boolean; // Expect this from API now
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
  // Add other potential fields from ProductAnalysis if the API returns them
  detectedLanguage?: string;
  uncertainReasons?: string[];
}

export class ProductApiService {
  private static instance: ProductApiService;
  private fallbackAnalysisService: AnalysisService;
  
  private constructor() {
    // Skapa en fallback service för offline-läge
    this.fallbackAnalysisService = new AnalysisService();
  }
  
  /**
   * Hämta singleton-instans av servicen
   */
  public static getInstance(): ProductApiService {
    if (!ProductApiService.instance) {
      ProductApiService.instance = new ProductApiService();
    }
    return ProductApiService.instance;
  }
  
  /**
   * Analysera ingredienser via backend API
   * Med fallback till lokal analys om API-anropet misslyckas
   */
  public async analyzeIngredients(ingredients: string[]): Promise<ProductAnalysis> {
    try {
      // Försök med backend API först
      const response = await fetch(`${API_BASE_URL}/api/ingredients/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ingredients }),
      });
      
      if (!response.ok) {
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      const data: AnalyzeIngredientsResponse = await response.json();
      
      const isUncertainApi = data.isUncertain ?? (data.isVegan === null);

      return {
        isVegan: data.isVegan,
        isUncertain: isUncertainApi,
        confidence: data.confidence,
        watchedIngredients: data.watchedIngredients || [],
        reasoning: data.reasoning,
        detectedLanguage: data.detectedLanguage,
        uncertainReasons: data.uncertainReasons
      };
    } catch (error) {
      console.warn('Kunde inte analysera med backend, använder lokal fallback:', error);
      
      // Fix: Use await to get the result from the promise
      try {
          const fallbackResult = await this.fallbackAnalysisService.analyzeIngredients(ingredients);
          
          // Map legacy watched ingredients (missing status) to the new type
          const mappedWatchedIngredients: WatchedIngredient[] = (fallbackResult.watchedIngredients || []).map(legacyWatched => {
            let status: 'vegan' | 'non-vegan' | 'uncertain' = 'uncertain'; // Default to uncertain
            if (legacyWatched.reason === 'non-vegan') {
              status = 'non-vegan';
            } else if (legacyWatched.reason === 'maybe-non-vegan') {
              status = 'uncertain';
            } // Add other mappings if legacy service used different reasons
            
            return {
               ...legacyWatched,
               status: status // Add the required status field
            };
          });

          const isUncertainFallback = fallbackResult.isVegan === false && 
              (fallbackResult.reasoning?.toLowerCase().includes('osäker') || 
              mappedWatchedIngredients.some(w => w.status === 'uncertain')); // Check mapped status
          
          return {
            isVegan: isUncertainFallback ? null : fallbackResult.isVegan,
            isUncertain: isUncertainFallback,
            confidence: fallbackResult.confidence ?? 0.5,
            // Use the mapped watched ingredients
            watchedIngredients: mappedWatchedIngredients,
            reasoning: fallbackResult.reasoning,
            detectedLanguage: undefined,
            uncertainReasons: isUncertainFallback ? [fallbackResult.reasoning || 'Osäker status från lokal analys'] : undefined
          };
      } catch (fallbackError) {
           console.error('Lokal fallback-analys misslyckades också:', fallbackError);
           // Return a default uncertain result if fallback also fails
           return { 
                isVegan: null, 
                isUncertain: true, 
                confidence: 0, 
                watchedIngredients: [], 
                reasoning: 'Kunde inte analysera ingredienser (API och lokal fallback misslyckades).' 
           };
      }
    }
  }
  
  /**
   * Hämta produkt från backend baserat på ID
   */
  public async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null; // Produkt hittades inte
        }
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fel vid hämtning av produkt från API:', error);
      throw error;
    }
  }
  
  /**
   * Spara en ny produkt till backend
   */
  public async createProduct(newProduct: NewProduct): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newProduct),
      });
      
      if (!response.ok) {
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fel vid skapande av produkt via API:', error);
      throw error;
    }
  }
  
  /**
   * Hämta produkter för en användare
   */
  public async getProductsByUserId(userId: string): Promise<Product[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/users/${userId}/products`);
      
      if (!response.ok) {
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fel vid hämtning av användarprodukter från API:', error);
      throw error;
    }
  }
  
  /**
   * Uppdatera en produkt
   */
  public async updateProduct(product: Product): Promise<Product> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${product.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(product),
      });
      
      if (!response.ok) {
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      return await response.json();
    } catch (error) {
      console.error('Fel vid uppdatering av produkt via API:', error);
      throw error;
    }
  }
  
  /**
   * Ta bort en produkt
   */
  public async deleteProduct(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/products/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        throw new Error(`API svarade med status: ${response.status}`);
      }
      
      return true;
    } catch (error) {
      console.error('Fel vid borttagning av produkt via API:', error);
      throw error;
    }
  }
} 