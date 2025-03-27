/**
 * CacheService - Cachelagring för KoaLens
 * 
 * Denna service hanterar cachning av analysresultat för att:
 * 1. Minska API-anrop
 * 2. Förbättra användarupplevelsen med snabbare responstider
 * 3. Spara batteri och bandbredd genom att undvika upprepade analyser
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { AnalysisResult } from './analysisService';
import * as crypto from 'expo-crypto';

// Cache-nycklar
const CACHE_KEYS = {
  IMAGE_ANALYSIS: 'koalens_cache_image_analysis',
  TEXT_ANALYSIS: 'koalens_cache_text_analysis',
  CACHE_INDEX: 'koalens_cache_index',
  CACHE_METADATA: 'koalens_cache_metadata'
};

// Maximal cache-storlek i antal poster
const MAX_CACHE_ENTRIES = 50;

// Maximal livslängd för cache-poster (24 timmar i ms)
const CACHE_EXPIRY_TIME = 24 * 60 * 60 * 1000;

// Interface för cache-metadata
interface CacheMetadata {
  lastCleanup: number;
  version: string;
  totalEntries: number;
  hits: number;
  misses: number;
}

// Interface för cache-indexpost
interface CacheIndexEntry {
  key: string;
  timestamp: number;
  type: 'image' | 'text';
  hash: string;
  source: string; // Beskrivning av källa (t.ex. filsökväg eller ingredienstext)
  size?: number;
}

/**
 * CacheService - Hanterar cachning av analysresultat
 */
export class CacheService {
  private static instance: CacheService;
  private cacheIndex: CacheIndexEntry[] = [];
  private metadata: CacheMetadata = {
    lastCleanup: Date.now(),
    version: '1.0',
    totalEntries: 0,
    hits: 0,
    misses: 0
  };
  private initialized = false;

  /**
   * Privat konstruktor för Singleton-mönster
   */
  private constructor() {}

  /**
   * Hämta instans av CacheService (Singleton)
   */
  public static getInstance(): CacheService {
    if (!CacheService.instance) {
      CacheService.instance = new CacheService();
    }
    return CacheService.instance;
  }

  /**
   * Initialisera cache-service
   */
  public async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Ladda cache-index
      const indexJson = await AsyncStorage.getItem(CACHE_KEYS.CACHE_INDEX);
      if (indexJson) {
        this.cacheIndex = JSON.parse(indexJson);
      }

      // Ladda metadata
      const metadataJson = await AsyncStorage.getItem(CACHE_KEYS.CACHE_METADATA);
      if (metadataJson) {
        this.metadata = JSON.parse(metadataJson);
      }

      // Kontrollera om det är dags för städning
      const timeSinceLastCleanup = Date.now() - this.metadata.lastCleanup;
      if (timeSinceLastCleanup > CACHE_EXPIRY_TIME) {
        await this.cleanupCache();
      }

      this.initialized = true;
      console.log(`[CacheService] Initialiserad med ${this.cacheIndex.length} poster`);
    } catch (error) {
      console.error('[CacheService] Fel vid initialisering:', error);
      // Återställ till standardvärden vid fel
      this.cacheIndex = [];
      this.metadata = {
        lastCleanup: Date.now(),
        version: '1.0',
        totalEntries: 0,
        hits: 0,
        misses: 0
      };
    }
  }

  /**
   * Generera hash för en sträng eller ett objekt
   */
  private async generateHash(data: string | object): Promise<string> {
    const stringData = typeof data === 'string' ? data : JSON.stringify(data);
    return await crypto.digestStringAsync(
      crypto.CryptoDigestAlgorithm.SHA256,
      stringData
    );
  }

  /**
   * Cachea resultat från bildanalys
   */
  public async cacheImageAnalysisResult(
    imageUri: string,
    result: AnalysisResult
  ): Promise<void> {
    await this.initialize();

    try {
      // Generera en hash baserat på bildens innehåll
      const imageHash = await this.generateHash(imageUri);
      
      // Spara resultatet i AsyncStorage
      const key = `${CACHE_KEYS.IMAGE_ANALYSIS}_${imageHash}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));
      
      // Uppdatera cache-index
      const entry: CacheIndexEntry = {
        key,
        timestamp: Date.now(),
        type: 'image',
        hash: imageHash,
        source: imageUri,
      };
      
      this.cacheIndex.push(entry);
      this.metadata.totalEntries++;
      
      // Spara uppdaterad index
      await this.saveIndex();
      
      // Om vi har för många poster, ta bort de äldsta
      if (this.cacheIndex.length > MAX_CACHE_ENTRIES) {
        await this.cleanupCache();
      }
      
      console.log(`[CacheService] Cachade bildanalysresultat för ${imageUri.substring(0, 30)}...`);
    } catch (error) {
      console.error('[CacheService] Fel vid cachning av bildanalysresultat:', error);
    }
  }

  /**
   * Hämta cachat resultat från bildanalys
   */
  public async getCachedImageAnalysisResult(
    imageUri: string
  ): Promise<AnalysisResult | null> {
    await this.initialize();

    try {
      // Generera en hash baserat på bildens innehåll
      const imageHash = await this.generateHash(imageUri);
      
      // Kontrollera om vi har ett cachat resultat
      const entry = this.cacheIndex.find(
        entry => entry.hash === imageHash && entry.type === 'image'
      );
      
      if (!entry) {
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Kontrollera om posten har gått ut
      if (Date.now() - entry.timestamp > CACHE_EXPIRY_TIME) {
        // Ta bort utgången post
        await AsyncStorage.removeItem(entry.key);
        this.cacheIndex = this.cacheIndex.filter(e => e.key !== entry.key);
        await this.saveIndex();
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Hämta resultatet från AsyncStorage
      const resultJson = await AsyncStorage.getItem(entry.key);
      if (!resultJson) {
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Uppdatera timestamp för cachad post
      entry.timestamp = Date.now();
      await this.saveIndex();
      
      // Uppdatera statistik
      this.metadata.hits++;
      await this.saveMetadata();
      
      console.log(`[CacheService] Cachad träff för bild ${imageUri.substring(0, 30)}...`);
      return JSON.parse(resultJson) as AnalysisResult;
    } catch (error) {
      console.error('[CacheService] Fel vid hämtning av cachad bildanalys:', error);
      return null;
    }
  }

  /**
   * Cachea resultat från textanalys
   */
  public async cacheTextAnalysisResult(
    ingredients: string,
    result: AnalysisResult
  ): Promise<void> {
    await this.initialize();

    try {
      // Normalisera ingredienstexten (trim, lowercase, sortera)
      const normalizedText = this.normalizeIngredientText(ingredients);
      
      // Generera en hash baserat på den normaliserade texten
      const textHash = await this.generateHash(normalizedText);
      
      // Spara resultatet i AsyncStorage
      const key = `${CACHE_KEYS.TEXT_ANALYSIS}_${textHash}`;
      await AsyncStorage.setItem(key, JSON.stringify(result));
      
      // Uppdatera cache-index
      const entry: CacheIndexEntry = {
        key,
        timestamp: Date.now(),
        type: 'text',
        hash: textHash,
        source: ingredients.substring(0, 100) + (ingredients.length > 100 ? '...' : ''),
        size: ingredients.length
      };
      
      this.cacheIndex.push(entry);
      this.metadata.totalEntries++;
      
      // Spara uppdaterad index
      await this.saveIndex();
      
      // Om vi har för många poster, ta bort de äldsta
      if (this.cacheIndex.length > MAX_CACHE_ENTRIES) {
        await this.cleanupCache();
      }
      
      console.log(`[CacheService] Cachade textanalysresultat (${ingredients.length} tecken)`);
    } catch (error) {
      console.error('[CacheService] Fel vid cachning av textanalysresultat:', error);
    }
  }

  /**
   * Hämta cachat resultat från textanalys
   */
  public async getCachedTextAnalysisResult(
    ingredients: string
  ): Promise<AnalysisResult | null> {
    await this.initialize();

    try {
      // Normalisera ingredienstexten (trim, lowercase, sortera)
      const normalizedText = this.normalizeIngredientText(ingredients);
      
      // Generera en hash baserat på den normaliserade texten
      const textHash = await this.generateHash(normalizedText);
      
      // Kontrollera om vi har ett cachat resultat
      const entry = this.cacheIndex.find(
        entry => entry.hash === textHash && entry.type === 'text'
      );
      
      if (!entry) {
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Kontrollera om posten har gått ut
      if (Date.now() - entry.timestamp > CACHE_EXPIRY_TIME) {
        // Ta bort utgången post
        await AsyncStorage.removeItem(entry.key);
        this.cacheIndex = this.cacheIndex.filter(e => e.key !== entry.key);
        await this.saveIndex();
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Hämta resultatet från AsyncStorage
      const resultJson = await AsyncStorage.getItem(entry.key);
      if (!resultJson) {
        this.metadata.misses++;
        await this.saveMetadata();
        return null;
      }
      
      // Uppdatera timestamp för cachad post
      entry.timestamp = Date.now();
      await this.saveIndex();
      
      // Uppdatera statistik
      this.metadata.hits++;
      await this.saveMetadata();
      
      console.log(`[CacheService] Cachad träff för text (${ingredients.length} tecken)`);
      return JSON.parse(resultJson) as AnalysisResult;
    } catch (error) {
      console.error('[CacheService] Fel vid hämtning av cachad textanalys:', error);
      return null;
    }
  }

  /**
   * Normalisera ingredienstext för bättre träffar
   */
  private normalizeIngredientText(text: string): string {
    // Konvertera till lowercase, ta bort extra mellanrum och sortera ingredienser
    // Detta ger träffar även om ingredienserna kommer i olika ordning
    return text
      .toLowerCase()
      .split(',')
      .map(i => i.trim())
      .filter(i => i.length > 0)
      .sort()
      .join(',');
  }

  /**
   * Spara cache-index till AsyncStorage
   */
  private async saveIndex(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.CACHE_INDEX,
        JSON.stringify(this.cacheIndex)
      );
    } catch (error) {
      console.error('[CacheService] Fel vid sparande av cache-index:', error);
    }
  }

  /**
   * Spara cache-metadata till AsyncStorage
   */
  private async saveMetadata(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        CACHE_KEYS.CACHE_METADATA,
        JSON.stringify(this.metadata)
      );
    } catch (error) {
      console.error('[CacheService] Fel vid sparande av cache-metadata:', error);
    }
  }

  /**
   * Rensa utgångna och överflödiga cache-poster
   */
  public async cleanupCache(): Promise<void> {
    try {
      console.log('[CacheService] Städar cache...');
      
      // Sortera index efter timestamp (äldst först)
      this.cacheIndex.sort((a, b) => a.timestamp - b.timestamp);
      
      // Ta bort utgångna poster
      const now = Date.now();
      const expiredEntries = this.cacheIndex.filter(
        entry => now - entry.timestamp > CACHE_EXPIRY_TIME
      );
      
      // Ta bort överflödiga poster om vi har för många
      const surplusCount = Math.max(0, this.cacheIndex.length - MAX_CACHE_ENTRIES);
      const entriesToRemove = [
        ...expiredEntries,
        ...this.cacheIndex.slice(0, surplusCount)
      ];
      
      // Skapa en array med unika nycklar att ta bort
      const keysToRemove = [...new Set(entriesToRemove.map(e => e.key))];
      
      // Ta bort från AsyncStorage
      for (const key of keysToRemove) {
        await AsyncStorage.removeItem(key);
      }
      
      // Uppdatera index
      this.cacheIndex = this.cacheIndex.filter(
        entry => !keysToRemove.includes(entry.key)
      );
      
      // Uppdatera metadata
      this.metadata.lastCleanup = now;
      this.metadata.totalEntries = this.cacheIndex.length;
      
      // Spara uppdaterad index och metadata
      await this.saveIndex();
      await this.saveMetadata();
      
      console.log(`[CacheService] Cache städad, ${keysToRemove.length} poster borttagna. Kvarvarande: ${this.cacheIndex.length}`);
    } catch (error) {
      console.error('[CacheService] Fel vid städning av cache:', error);
    }
  }

  /**
   * Rensa hela cachen (används vid logout eller för felsökning)
   */
  public async clearCache(): Promise<void> {
    try {
      console.log('[CacheService] Rensar cache...');
      
      // Ta bort alla cache-poster
      for (const entry of this.cacheIndex) {
        await AsyncStorage.removeItem(entry.key);
      }
      
      // Återställ index och metadata
      this.cacheIndex = [];
      this.metadata = {
        lastCleanup: Date.now(),
        version: this.metadata.version,
        totalEntries: 0,
        hits: 0,
        misses: 0
      };
      
      // Spara uppdaterad index och metadata
      await this.saveIndex();
      await this.saveMetadata();
      
      console.log('[CacheService] Cache rensad.');
    } catch (error) {
      console.error('[CacheService] Fel vid rensning av cache:', error);
    }
  }

  /**
   * Hämta cache-statistik
   */
  public getCacheStats(): {
    totalEntries: number;
    hits: number;
    misses: number;
    hitRatio: number;
    imageEntries: number;
    textEntries: number;
  } {
    const imageEntries = this.cacheIndex.filter(e => e.type === 'image').length;
    const textEntries = this.cacheIndex.filter(e => e.type === 'text').length;
    const totalHits = this.metadata.hits;
    const totalMisses = this.metadata.misses;
    const hitRatio = totalHits + totalMisses === 0 
      ? 0 
      : totalHits / (totalHits + totalMisses);
    
    return {
      totalEntries: this.cacheIndex.length,
      hits: totalHits,
      misses: totalMisses,
      hitRatio,
      imageEntries,
      textEntries
    };
  }
} 