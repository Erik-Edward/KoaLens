import { veganIngredientDatabase } from '../data/veganIngredientDatabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { CacheService } from './cacheService';

/**
 * Interface för att representera information om en övervakad ingrediens
 */
export interface WatchedIngredient {
  name: string;
  reason: 'non-vegan' | 'maybe-non-vegan' | 'watched';
  description?: string;
}

/**
 * Interface för analysresultat
 */
export interface AnalysisResult {
  isVegan: boolean;
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
  ingredientList?: string[]; // Lägg till för Gemini 2.5 Pro kompatibilitet
  nonVeganIngredients?: string[]; // Lägg till för Gemini 2.5 Pro kompatibilitet
  imageQualityIssues?: string[]; // Information om bildkvalitetsproblem
  detectedLanguage?: 'sv' | 'en' | 'unknown'; // Detekterat språk
}

/**
 * Interface för att spåra analysstatistik
 */
export interface AnalysisStats {
  startTime: number;
  endTime?: number;
  duration?: number;
  retryCount: number;
  imageSize?: number;
  success: boolean;
  errorMessage?: string;
  events: Array<{time: number, event: string, data?: any}>;
}

// Exporterade felkoder för bättre felhantering
export enum AnalysisErrorCode {
  NETWORK_ERROR = 'network_error',
  SERVER_ERROR = 'server_error',
  INVALID_IMAGE = 'invalid_image',
  NO_INGREDIENTS_FOUND = 'no_ingredients_found',
  API_LIMIT_EXCEEDED = 'api_limit_exceeded',
  DEPRECATED_FEATURE = 'deprecated_feature',
  UNKNOWN_ERROR = 'unknown_error'
}

// Anpassade fel för AnalysisService
export class AnalysisError extends Error {
  code: AnalysisErrorCode;
  details?: any;
  
  constructor(message: string, code: AnalysisErrorCode, details?: any) {
    super(message);
    this.name = 'AnalysisError';
    this.code = code;
    this.details = details;
  }
}

export class AnalysisService {
  // Endpoint för tjänsten
  private API_ENDPOINT = 'https://koalens-backend.fly.dev/analyze';
  private TEXT_ANALYSIS_ENDPOINT = 'https://koalens-backend.fly.dev/api/ai/analyze-text';
  private DETECT_LANGUAGE_ENDPOINT = 'https://koalens-backend.fly.dev/api/ai/detect-language';

  // Endpoint för Gemini API-bildanalys
  private IMAGE_ANALYSIS_ENDPOINT = 'https://koalens-backend.fly.dev/api/ai/analyze-image';

  // Current language for analysis - can be overridden by the user
  private currentLanguage: 'sv' | 'en' | 'auto' = 'auto';
  
  // Lägg till variabel för analysframsteg (0-100%)
  public analysisProgress: number = 0;
  
  // Lägg till variabel för att spåra analysstatistik
  private analysisStats: AnalysisStats = {
    startTime: 0,
    retryCount: 0,
    success: false,
    events: []
  };
  
  // Kvalitetsproblem som upptäckts under analysen
  private detectedQualityIssues: string[] = [];
  
  // Cache-service
  private cacheService: CacheService;
  
  // Om caching är aktiverad
  private cachingEnabled: boolean = true;

  constructor() {
    // Använd Singleton-instansen av CacheService
    this.cacheService = CacheService.getInstance();
  }

  /**
   * Aktivera eller inaktivera caching
   */
  public setCachingEnabled(enabled: boolean): void {
    this.cachingEnabled = enabled;
    console.log(`[AnalysisService] Caching ${enabled ? 'aktiverad' : 'inaktiverad'}`);
  }

  /**
   * Set the preferred language for analysis
   */
  setPreferredLanguage(language: 'sv' | 'en' | 'auto'): void {
    this.currentLanguage = language;
    console.log(`Analysis language set to: ${language}`);
  }

  /**
   * Get the current language setting
   */
  getPreferredLanguage(): 'sv' | 'en' | 'auto' {
    return this.currentLanguage;
  }
  
  /**
   * Logga en analysrelaterad händelse för spårning och debugging
   */
  private logEvent(event: string, data?: any): void {
    this.analysisStats.events.push({
      time: Date.now(),
      event,
      data
    });
    
    console.log(`[AnalysisEvent] ${event}`, data || '');
  }
  
  /**
   * Rapportera ett bildkvalitetsproblem som upptäckts under analysen
   */
  private reportQualityIssue(issue: string): void {
    if (!this.detectedQualityIssues.includes(issue)) {
      this.detectedQualityIssues.push(issue);
      this.logEvent('quality_issue_detected', { issue });
    }
  }
  
  /**
   * Hämta alla upptäckta bildkvalitetsproblem
   */
  getQualityIssues(): string[] {
    return [...this.detectedQualityIssues];
  }
  
  /**
   * Hämta analysstatistik för debugging och telemetri
   */
  getAnalysisStats(): AnalysisStats {
    return {...this.analysisStats};
  }

  /**
   * Detect the language of a text
   */
  async detectLanguage(text: string): Promise<'sv' | 'en' | 'unknown'> {
    try {
      console.log('Detecting language...');
      this.logEvent('language_detection_started', { textLength: text.length });
      
      // Enkel lokal detektion för vanliga svenska ord som en snabb första kontroll
      const commonSwedishWords = ['och', 'är', 'att', 'det', 'som', 'en', 'på', 'för', 'med', 'av', 'till'];
      const textLower = text.toLowerCase();
      
      let swedishWordCount = 0;
      for (const word of commonSwedishWords) {
        // Kontrollera om ordet förekommer som helt ord (med ordgränser)
        const regex = new RegExp(`\\b${word}\\b`, 'g');
        const matches = textLower.match(regex);
        if (matches) {
          swedishWordCount += matches.length;
        }
      }
      
      // Om vi har flera svenska ord, är det troligen svenska
      if (swedishWordCount >= 3) {
        this.logEvent('language_detected_locally', { language: 'sv', confidence: 'high' });
        return 'sv';
      }
      
      // Annars, kontrollera med server-API för mer exakt detektion
      const response = await fetch(this.DETECT_LANGUAGE_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new AnalysisError(
          `Language detection failed with status: ${response.status}`,
          AnalysisErrorCode.SERVER_ERROR,
          { status: response.status }
        );
      }
      
      const data = await response.json();
      this.logEvent('language_detection_completed', { result: data });
      
      if (data && data.language && (data.language === 'sv' || data.language === 'en')) {
        return data.language as 'sv' | 'en';
      }
      
      return 'unknown';
    } catch (error) {
      console.error('Language detection error:', error);
      this.logEvent('language_detection_failed', { error: String(error) });
      
      // Defaulta till engelska vid fel
      return 'en';
    }
  }

  /**
   * Verify and enhance analysis results using the vegan ingredient database
   */
  private async verifyAndEnhanceResults(
    result: AnalysisResult, 
    ingredients: string[]
  ): Promise<AnalysisResult> {
    try {
      console.log('Verifying and enhancing analysis results with local database');
      this.logEvent('database_verification_started', { ingredientCount: ingredients.length });
      
      // Check each ingredient against our database
      const databaseResult = await veganIngredientDatabase.checkIngredients(ingredients);
      
      // Extract the results
      const { nonVeganIngredients, uncertainIngredients, confidence: dbConfidence } = databaseResult;
      
      // If the database contains additional non-vegan ingredients not found by AI
      if (nonVeganIngredients.length > 0) {
        console.log('Database found additional non-vegan ingredients:', nonVeganIngredients);
        this.logEvent('database_found_nonvegan', { ingredients: nonVeganIngredients });
        
        // Add these to the result's watched ingredients
        const additionalNonVegan = nonVeganIngredients
          .filter(item => !result.watchedIngredients.some((w: WatchedIngredient) => w.name.toLowerCase() === item.toLowerCase()))
          .map(item => ({
            name: item,
            reason: 'non-vegan' as const,
            description: 'Identifierad som icke-vegansk av lokal databas.'
          }));
        
        if (additionalNonVegan.length > 0) {
          result.watchedIngredients = [...result.watchedIngredients, ...additionalNonVegan];
          
          // If any non-vegan ingredients were found, the product is not vegan
          if (result.isVegan) {
            result.isVegan = false;
            result.reasoning = `${result.reasoning || ''} Vår databas identifierade icke-veganska ingredienser: ${nonVeganIngredients.join(', ')}.`;
          }
        }
      }
      
      // If the database contains uncertain ingredients
      if (uncertainIngredients.length > 0) {
        console.log('Database found uncertain ingredients:', uncertainIngredients);
        this.logEvent('database_found_uncertain', { ingredients: uncertainIngredients });
        
        // Add uncertain ingredients to the result
        const additionalUncertain = uncertainIngredients
          .filter(item => !result.watchedIngredients.some((w: WatchedIngredient) => w.name.toLowerCase() === item.toLowerCase()))
          .map(item => ({
            name: item,
            reason: 'maybe-non-vegan' as const,
            description: 'Kan vara icke-vegansk beroende på källa.'
          }));
        
        if (additionalUncertain.length > 0) {
          result.watchedIngredients = [...result.watchedIngredients, ...additionalUncertain];
          
          // Adjust reasoning if needed
          if (!result.reasoning?.includes('osäker') && !result.reasoning?.includes('uncertain')) {
            result.reasoning = `${result.reasoning || ''} Produkten innehåller ingredienser som kan vara icke-veganska beroende på källa: ${uncertainIngredients.join(', ')}.`;
          }
        }
      }
      
      // Adjust confidence based on database results
      if (dbConfidence > 0) {
        // Weight the AI confidence (2/3) and database confidence (1/3)
        const combinedConfidence = (result.confidence * 2 + dbConfidence) / 3;
        result.confidence = Math.min(0.99, Math.max(0.1, combinedConfidence));
      }
      
      // Remove duplicate ingredients
      result.watchedIngredients = result.watchedIngredients.filter((item: WatchedIngredient, index: number, self: WatchedIngredient[]) => 
        index === self.findIndex((i: WatchedIngredient) => i.name.toLowerCase() === item.name.toLowerCase())
      );
      
      this.logEvent('database_verification_completed', { 
        nonVeganCount: nonVeganIngredients.length,
        uncertainCount: uncertainIngredients.length,
        finalConfidence: result.confidence
      });
      
      return result;
    } catch (error) {
      console.error('Error while verifying results with database:', error);
      this.logEvent('database_verification_failed', { error: String(error) });
      // Return original result if verification fails
      return result;
    }
  }

  /**
   * Local fallback method for ingredient analysis
   */
  private async localAnalyzeIngredients(ingredients: string[]): Promise<AnalysisResult> {
    console.log('Using local ingredient analysis with database');
    this.logEvent('local_analysis_started', { ingredientCount: ingredients.length });
    
    try {
      // Check ingredients against our local database
      const databaseResult = await veganIngredientDatabase.checkIngredients(ingredients);
      
      // Extract results
      const { nonVeganIngredients, uncertainIngredients, confidence } = databaseResult;
      
      // Determine if the product is vegan
      const isVegan = nonVeganIngredients.length === 0;
      
      // Generate reasoning
      let reasoning = '';
      if (nonVeganIngredients.length > 0) {
        reasoning = `Produkten innehåller ${nonVeganIngredients.length} icke-veganska ingredienser: ${nonVeganIngredients.join(', ')}.`;
      } else if (uncertainIngredients.length > 0) {
        reasoning = `Produkten kan vara vegansk, men innehåller ${uncertainIngredients.length} ingredienser som kan vara icke-veganska beroende på källa: ${uncertainIngredients.join(', ')}.`;
      } else if (ingredients.length === 0) {
        reasoning = 'Inga ingredienser kunde identifieras.';
      } else {
        reasoning = 'Inga icke-veganska ingredienser hittades i den lokala databasen.';
      }
      
      // Create watchedIngredients from the non-vegan and uncertain ingredients
      const watchedIngredients = [
        ...nonVeganIngredients.map(item => ({
          name: item,
          reason: 'non-vegan' as const,
          description: 'Identifierad som icke-vegansk av lokal databas.'
        })),
        ...uncertainIngredients.map(item => ({
          name: item,
          reason: 'maybe-non-vegan' as const,
          description: 'Kan vara icke-vegansk beroende på källa.'
        }))
      ];
      
      const result = {
        isVegan,
        confidence: Math.max(0.5, confidence), // Ensure minimum confidence of 0.5
        watchedIngredients,
        reasoning: reasoning + ' (Analys utförd lokalt med databas)',
        ingredientList: ingredients,
        nonVeganIngredients
      };
      
      this.logEvent('local_analysis_completed', { 
        isVegan,
        confidence: result.confidence,
        watchedCount: watchedIngredients.length
      });
      
      return result;
    } catch (error) {
      console.error('Error in local ingredient analysis:', error);
      this.logEvent('local_analysis_failed', { error: String(error) });
      
      // Super simple fallback if even the database fails
      return {
        isVegan: false,
        confidence: 0.5,
        watchedIngredients: [],
        reasoning: 'Analys utförd lokalt (fallback). Resultatet kan vara mindre tillförlitligt.',
        ingredientList: ingredients
      };
    }
  }
  
  /**
   * Analyze text-based ingredients using the enhanced backend API
   */
  async analyzeTextIngredients(ingredients: string): Promise<AnalysisResult> {
    try {
      console.log('Analyzing text ingredients with enhanced API...');
      this.logEvent('text_analysis_started', { ingredientsLength: ingredients.length });
      
      // Kontrollera om vi har ett cachat resultat
      if (this.cachingEnabled) {
        const cachedResult = await this.cacheService.getCachedTextAnalysisResult(ingredients);
        if (cachedResult) {
          this.logEvent('text_analysis_cache_hit', {});
          console.log('Använder cachat textanalysresultat');
          return cachedResult;
        }
        this.logEvent('text_analysis_cache_miss', {});
      }
      
      // Determine which language to use
      let targetLanguage = this.currentLanguage;
      
      // If auto-detect is enabled, detect the language
      if (targetLanguage === 'auto') {
        const detectedLanguage = await this.detectLanguage(ingredients);
        targetLanguage = detectedLanguage === 'unknown' ? 'en' : detectedLanguage;
        console.log(`Auto-detected language: ${targetLanguage}`);
        this.logEvent('language_auto_detected', { language: targetLanguage });
      }
      
      // Call the appropriate API endpoint
      const response = await fetch(this.TEXT_ANALYSIS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          ingredients,
          language: targetLanguage
        }),
      });
      
      if (!response.ok) {
        // Hantera olika HTTP-felkoder på lämpligt sätt
        if (response.status === 429) {
          throw new AnalysisError(
            'API-begränsningar har överskridits. Försök igen senare.',
            AnalysisErrorCode.API_LIMIT_EXCEEDED
          );
        } else if (response.status >= 500) {
          throw new AnalysisError(
            `Serverfel vid analys: ${response.status}`,
            AnalysisErrorCode.SERVER_ERROR,
            { status: response.status }
          );
        } else {
          throw new AnalysisError(
            `Text analysis failed with status: ${response.status}`,
            AnalysisErrorCode.UNKNOWN_ERROR,
            { status: response.status }
          );
        }
      }
      
      const data = await response.json();
      console.log('Text analysis result:', data);
      this.logEvent('text_analysis_api_completed', { 
        isVegan: data.isVegan,
        confidence: data.confidence
      });
      
      // Create result from API response
      const result: AnalysisResult = {
        isVegan: data.isVegan,
        confidence: data.confidence,
        watchedIngredients: data.nonVeganIngredients.map((ingredient: string) => ({
          name: ingredient,
          reason: 'non-vegan' as const,
          description: 'Identifierad som icke-vegansk av AI-analys.'
        })),
        reasoning: data.reasoning,
        ingredientList: ingredients.split(',').map((i: string) => i.trim()),
        nonVeganIngredients: data.nonVeganIngredients,
        detectedLanguage: targetLanguage
      };
      
      // Verify and enhance the results with our local database
      const ingredientsList = ingredients.split(',').map(i => i.trim());
      const enhancedResult = await this.verifyAndEnhanceResults(result, ingredientsList);
      
      // Cachea resultatet om caching är aktiverad
      if (this.cachingEnabled) {
        await this.cacheService.cacheTextAnalysisResult(ingredients, enhancedResult);
        this.logEvent('text_analysis_cached', {});
      }
      
      return enhancedResult;
    } catch (error) {
      console.error('Text analysis error:', error);
      this.logEvent('text_analysis_failed', { 
        error: error instanceof Error ? error.message : String(error),
        errorCode: error instanceof AnalysisError ? error.code : AnalysisErrorCode.UNKNOWN_ERROR
      });
      
      // Om det är ett nätverksfel, försök med lokal analys
      if (error instanceof AnalysisError && error.code === AnalysisErrorCode.NETWORK_ERROR) {
        console.warn('Falling back to local analysis due to network error');
        return this.localAnalyzeIngredients(ingredients.split(',').map(i => i.trim()));
      }
      
      // Om det är ett API-gränsfel, kasta vidare felet
      if (error instanceof AnalysisError && error.code === AnalysisErrorCode.API_LIMIT_EXCEEDED) {
        throw error;
      }
      
      // För andra fel, försök med lokal analys
      console.warn('Falling back to local analysis due to API error');
      return this.localAnalyzeIngredients(ingredients.split(',').map(i => i.trim()));
    }
  }

  /**
   * Analysera en bild direkt för att få ingredienser och vegansk status
   * Optimerad version för Gemini 2.5 Pro
   */
  async analyzeImageDirectly(imageUri: string): Promise<AnalysisResult> {
    // Kasta ett fel som informerar användaren om förändringen
    throw new AnalysisError(
      'Bildanalys har inaktiverats. Använd videoanalys för bättre resultat.',
      AnalysisErrorCode.DEPRECATED_FEATURE
    );
  }
  
  /**
   * Förbereder en bild för analys genom att optimera den
   */
  private async prepareImageForAnalysis(imageUri: string): Promise<string> {
    try {
      console.log('Förbereder bild för analys...');
      this.analysisProgress = 15;
      
      // Konvertera URI till base64
      const originalBase64 = await this.convertImageToBase64(imageUri);
      this.analysisProgress = 25;
      
      // Optimera bilden för bättre OCR och mindre storlek
      // Använd samma inställningar som backend för konsekvent analys
      const optimizedImage = await this.optimizeImage(originalBase64);
      this.analysisProgress = 35;
      
      return optimizedImage;
    } catch (error) {
      console.error('Bildberedning misslyckades:', error);
      // Vid fel, försök använda originalbilden
      return await this.convertImageToBase64(imageUri);
    }
  }
  
  /**
   * Optimerar en bild för bättre OCR och mindre datastorlek
   * Anpassad för Gemini 2.5 Pro
   */
  private async optimizeImage(base64Image: string): Promise<string> {
    try {
      console.log('Optimerar bild för Gemini 2.5 Pro OCR...');
      
      // Skapa en temporär fil med base64-datan
      const tempFilePath = FileSystem.cacheDirectory + 'temp_image_' + Date.now() + '.jpg';
      
      // Konvertera base64 till fil
      await FileSystem.writeAsStringAsync(tempFilePath, base64Image, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Anpassa bildens storlek för Gemini 2.5 Pro
      const manipResult = await ImageManipulator.manipulateAsync(
        tempFilePath,
        [
          // Anpassa storlek för bättre analysresultat
          { resize: { width: 1200, height: 1200 } }, // Anpassat för Gemini 2.5 Pro
        ],
        {
          compress: 0.85, // 85% kvalitet för bra balans mellan storlek och kvalitet
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      
      // Läs resultatet som base64
      const optimizedBase64 = await FileSystem.readAsStringAsync(manipResult.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      // Ta bort temporära filer
      await FileSystem.deleteAsync(tempFilePath, { idempotent: true });
      await FileSystem.deleteAsync(manipResult.uri, { idempotent: true });
      
      console.log('Bild optimerad framgångsrikt');
      return optimizedBase64;
    } catch (error) {
      console.error('Bildoptimering misslyckades:', error);
      // Vid fel, returnera originalbilden
      return base64Image;
    }
  }

  /**
   * Extract ingredients from an image
   */
  async extractIngredientsFromImage(imageUri: string): Promise<string[]> {
    // Kasta ett fel som informerar användaren om förändringen
    throw new AnalysisError(
      'Bildanalys har inaktiverats. Använd videoanalys för bättre resultat.',
      AnalysisErrorCode.DEPRECATED_FEATURE
    );
  }
  
  /**
   * Helper method to convert image URI to base64
   */
  private async convertImageToBase64(uri: string): Promise<string> {
    try {
      // Om URLen redan är en base64-sträng, returnera den direkt
      if (uri.startsWith('data:image')) {
        return uri.split(',')[1];
      }
      
      // Lägg till file:// om det saknas för lokala sökvägar
      const fullUri = uri.startsWith('file://') ? uri : `file://${uri}`;
      
      // Läs filen som base64
      const base64 = await FileSystem.readAsStringAsync(fullUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      
      return base64;
    } catch (error) {
      console.error('Error converting image to base64:', error);
      throw new Error('Could not convert image to base64');
    }
  }
} 