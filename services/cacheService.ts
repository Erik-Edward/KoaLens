/**
 * Cache-tjänst för att spara analyseresultat och förbättra prestanda
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult } from '../models/analysisModel';

// Konstanter för cache-nycklar
const CACHE_PREFIX = 'koalens_cache_';
const IMAGE_CACHE_PREFIX = `${CACHE_PREFIX}image_`;
const VIDEO_CACHE_PREFIX = `${CACHE_PREFIX}video_`;
const MAX_CACHE_AGE = 7 * 24 * 60 * 60 * 1000; // 7 dagar i millisekunder

/**
 * Lagringsobjekt för cache med timestamp
 */
interface CacheEntry<T> {
  timestamp: number;
  data: T;
}

export class CacheService {
  /**
   * Kontrollerar om cachen är aktiverad
   */
  public async isCacheEnabled(): Promise<boolean> {
    try {
      const cacheEnabled = await AsyncStorage.getItem(`${CACHE_PREFIX}enabled`);
      return cacheEnabled !== 'false'; // Default är true
    } catch (error) {
      console.error('Fel vid kontroll av cache-inställning:', error);
      return true; // Default till true om det blir fel
    }
  }

  /**
   * Aktivera eller inaktivera cachen
   */
  public async setCacheEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(`${CACHE_PREFIX}enabled`, enabled ? 'true' : 'false');
    } catch (error) {
      console.error('Fel vid ändring av cache-inställning:', error);
    }
  }

  /**
   * Rensa hela cachen
   */
  public async clearCache(): Promise<void> {
    try {
      // Hämta alla nycklar
      const keys = await AsyncStorage.getAllKeys();
      
      // Filtrera fram cache-nycklar
      const cacheKeys = keys.filter(key => key.startsWith(CACHE_PREFIX));
      
      // Ta bort alla cache-nycklar
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
        console.log(`${cacheKeys.length} cache-poster har rensats.`);
      }
    } catch (error) {
      console.error('Fel vid rensning av cache:', error);
    }
  }

  /**
   * Hämta och kontrollera en cachad post
   */
  private async getCacheEntry<T>(key: string): Promise<T | null> {
    try {
      const cacheEnabled = await this.isCacheEnabled();
      if (!cacheEnabled) {
        return null;
      }
      
      const jsonValue = await AsyncStorage.getItem(key);
      if (!jsonValue) {
        return null;
      }
      
      const cacheEntry: CacheEntry<T> = JSON.parse(jsonValue);
      
      // Kontrollera att cachen inte är för gammal
      const now = Date.now();
      if (now - cacheEntry.timestamp > MAX_CACHE_AGE) {
        console.log(`Cache för ${key} har upphört att gälla. Tar bort.`);
        await AsyncStorage.removeItem(key);
        return null;
      }
      
      console.log(`Cachad data hittad för ${key}`);
      return cacheEntry.data;
    } catch (error) {
      console.error(`Fel vid hämtning av cache för ${key}:`, error);
      return null;
    }
  }

  /**
   * Spara en post i cachen
   */
  private async setCacheEntry<T>(key: string, data: T): Promise<void> {
    try {
      const cacheEnabled = await this.isCacheEnabled();
      if (!cacheEnabled) {
        return;
      }
      
      const cacheEntry: CacheEntry<T> = {
        timestamp: Date.now(),
        data
      };
      
      await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log(`Data sparad i cache för ${key}`);
    } catch (error) {
      console.error(`Fel vid cachning av data för ${key}:`, error);
    }
  }

  /**
   * Hämta cachad bildanalys
   */
  public async getCachedImageAnalysisResult(imageHash: string): Promise<AnalysisResult | null> {
    return this.getCacheEntry<AnalysisResult>(`${IMAGE_CACHE_PREFIX}${imageHash}`);
  }

  /**
   * Spara bildanalys i cache
   */
  public async cacheImageAnalysisResult(imageHash: string, result: AnalysisResult): Promise<void> {
    await this.setCacheEntry<AnalysisResult>(`${IMAGE_CACHE_PREFIX}${imageHash}`, result);
  }

  /**
   * Hämta cachad videoanalys
   */
  public async getCachedVideoAnalysisResult(videoHash: string): Promise<AnalysisResult | null> {
    return this.getCacheEntry<AnalysisResult>(`${VIDEO_CACHE_PREFIX}${videoHash}`);
  }

  /**
   * Spara videoanalys i cache
   */
  public async cacheVideoAnalysisResult(videoHash: string, result: AnalysisResult): Promise<void> {
    await this.setCacheEntry<AnalysisResult>(`${VIDEO_CACHE_PREFIX}${videoHash}`, result);
  }
} 