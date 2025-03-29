/**
 * Modeller för analystjänsterna
 */

import { WatchedIngredient } from './productModel';

/**
 * Resultat av en ingrediensanalys
 */
export interface AnalysisResult {
  isVegan: boolean;
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
  detectedLanguage?: string;
  detectedNonVeganIngredients?: string[];
}

/**
 * Konfiguration för analystjänsten
 */
export interface AnalysisConfig {
  preferredLanguage: string;
  useCache: boolean;
  timeoutMs: number;
}

/**
 * Analys-statistik för spårning och debugging
 */
export interface AnalysisStats {
  startTime: number;
  endTime: number;
  duration: number;
  retryCount: number;
  success: boolean;
  errorMessage: string;
  events: Array<{
    time: number;
    event: string;
    data?: any;
  }>;
}

/**
 * Format för API-svar vid bildanalys
 */
export interface ImageAnalysisApiResponse {
  success: boolean;
  error?: string;
  ingredients?: string[];
  text?: string;
  allIngredients?: string[];
  isVegan?: boolean;
  confidence?: number;
  watchedIngredients?: WatchedIngredient[];
  nonVeganIngredients?: string[];
  reasoning?: string;
}

/**
 * Format för API-svar vid videoanalys
 */
export interface VideoAnalysisApiResponse {
  success: boolean;
  error?: string;
  isVegan: boolean;
  confidence: number;
  ingredients?: {
    name: string;
    isVegan: boolean;
    description?: string;
  }[];
  nonVeganIngredients?: string[];
  reasoning?: string;
} 