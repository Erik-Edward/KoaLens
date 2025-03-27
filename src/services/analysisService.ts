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
    // Återställ analysframsteg och statistik
    this.analysisProgress = 0;
    this.detectedQualityIssues = [];
    this.analysisStats = {
      startTime: Date.now(),
      retryCount: 0,
      success: false,
      events: []
    };
    
    this.logEvent('analysis_started', { imageUri: imageUri.substring(0, 50) + '...' });
    
    try {
      console.log('Utför optimerad bildanalys med Gemini 2.5 Pro...');
      this.analysisProgress = 5;
      
      // Kontrollera om vi har ett cachat resultat
      if (this.cachingEnabled) {
        // Försök få resultat från cachen först
        const cachedResult = await this.cacheService.getCachedImageAnalysisResult(imageUri);
        if (cachedResult) {
          this.logEvent('image_analysis_cache_hit', {});
          console.log('Använder cachat bildanalysresultat');
          this.analysisProgress = 100;
          return cachedResult;
        }
        this.logEvent('image_analysis_cache_miss', {});
        this.analysisProgress = 10;
      } else {
        this.analysisProgress = 10;
      }
      
      this.logEvent('preparing_image');
      
      // Konvertera bilden till base64 och optimera för analys
      const imageBase64 = await this.prepareImageForAnalysis(imageUri);
      this.analysisProgress = 40;
      
      // Om bilden är väldigt stor, rapportera en kvalitetsvarning
      if (imageBase64.length > 500000) {
        this.reportQualityIssue('Bilden är stor vilket kan påverka analyshastigheten');
      }
      
      // Avgör vilket språk som ska användas
      let targetLanguage = this.currentLanguage;
      
      // Om auto-detect är aktiverat, använd engelska som standard för bildanalys
      if (targetLanguage === 'auto') {
        targetLanguage = 'en';
        this.logEvent('using_default_language', { language: targetLanguage });
      }
      
      console.log(`Skickar bilden till Gemini (språk: ${targetLanguage})...`);
      this.analysisProgress = 50;
      this.logEvent('sending_to_gemini', { language: targetLanguage });
      
      // Implementera återförsökslogik för nätverksfel
      let response;
      let retryCount = 0;
      const maxRetries = 2;
      
      while (retryCount <= maxRetries) {
        try {
          // Anropa API-endpoint för bildanalys
          const startRequestTime = Date.now();
          this.logEvent('api_request_started', { attempt: retryCount + 1 });
          
          const abortController = new AbortController();
          const timeoutId = setTimeout(() => abortController.abort(), 30000); // 30 sekunder timeout
          
          response = await fetch(this.IMAGE_ANALYSIS_ENDPOINT, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              image: imageBase64,
              language: targetLanguage
            }),
            signal: abortController.signal
          });
          
          clearTimeout(timeoutId);
          
          this.logEvent('api_request_completed', { 
            status: response.status,
            duration: Date.now() - startRequestTime
          });
          
          // Om svaret är OK, avbryt återförsöksloopen
          if (response.ok) break;
          
          // Kasta ett AnalysisError med lämplig felkod beroende på HTTP-statuskod
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
              `Bildanalys misslyckades med status: ${response.status}`,
              AnalysisErrorCode.UNKNOWN_ERROR,
              { status: response.status }
            );
          }
        } catch (error) {
          retryCount++;
          this.analysisStats.retryCount = retryCount;
          
          // Hantera timeout särskilt
          let errorMessage = error instanceof Error ? error.message : String(error);
          let errorCode = AnalysisErrorCode.UNKNOWN_ERROR;
          
          if (error && typeof error === 'object' && 'name' in error && error.name === 'AbortError') {
            errorMessage = 'Analysen tog för lång tid, tidsfristen överskreds.';
            errorCode = AnalysisErrorCode.NETWORK_ERROR;
          } else if (error instanceof AnalysisError) {
            errorCode = error.code;
          } else if (errorMessage.toLowerCase().includes('network') || 
                     errorMessage.toLowerCase().includes('internet') ||
                     errorMessage.toLowerCase().includes('offline') ||
                     errorMessage.toLowerCase().includes('connection')) {
            errorCode = AnalysisErrorCode.NETWORK_ERROR;
          }
          
          this.logEvent('api_request_failed', { 
            attempt: retryCount,
            error: errorMessage,
            code: errorCode
          });
          
          console.warn(`Analys misslyckades, försök ${retryCount} av ${maxRetries}`, error);
          
          // Sluta försök om vi nått maxgränsen eller det inte är ett nätverksfel
          if (retryCount > maxRetries || errorCode !== AnalysisErrorCode.NETWORK_ERROR) {
            throw new AnalysisError(errorMessage, errorCode);
          }
          
          // Vänta lite längre tid mellan varje försök (exponentiell backoff)
          const waitTime = 1000 * retryCount;
          await new Promise(resolve => setTimeout(resolve, waitTime));
          
          // Uppdatera framsteg med återförsöksinformation
          this.analysisProgress = 50 + (retryCount * 5); 
        }
      }
      
      if (!response || !response.ok) {
        throw new AnalysisError(
          `Bildanalys misslyckades med status: ${response?.status || 'ingen response'}`,
          AnalysisErrorCode.SERVER_ERROR
        );
      }
      
      this.analysisProgress = 80;
      this.logEvent('parsing_response');
      
      const data = await response.json();
      this.analysisProgress = 90;
      
      console.log('Bildanalys resultat:', {
        isVegan: data.isVegan,
        confidence: data.confidence,
        ingredientListLength: data.ingredientList?.length || 0,
        nonVeganCount: data.nonVeganIngredients?.length || 0
      });
      
      // Skapa resultat från API-svar med bättre felhantering
      const result: AnalysisResult = {
        isVegan: typeof data.isVegan === 'boolean' ? data.isVegan : false,
        confidence: typeof data.confidence === 'number' ? data.confidence : 0.5,
        watchedIngredients: (data.nonVeganIngredients || []).map((ingredient: string) => ({
          name: ingredient,
          reason: 'non-vegan' as const,
          description: 'Identifierad som icke-vegansk av AI-bildanalys.'
        })),
        reasoning: data.reasoning || 'Ingen analysgrund tillgänglig.',
        ingredientList: data.ingredientList || [],
        nonVeganIngredients: data.nonVeganIngredients || [],
        imageQualityIssues: [...this.detectedQualityIssues],
        detectedLanguage: data.detectedLanguage || targetLanguage as 'sv' | 'en'
      };
      
      this.logEvent('verifying_results', { 
        ingredientCount: result.ingredientList?.length || 0 
      });
      
      // Verifiera och förbättra resultaten med lokal databas
      let enhancedResult: AnalysisResult;
      
      if (data.ingredientList && data.ingredientList.length > 0) {
        enhancedResult = await this.verifyAndEnhanceResults(result, data.ingredientList);
      } else {
        enhancedResult = result;
      }
      
      this.analysisProgress = 100;
      
      // Uppdatera analysstatistik
      this.analysisStats.endTime = Date.now();
      this.analysisStats.duration = this.analysisStats.endTime - this.analysisStats.startTime;
      this.analysisStats.success = true;
      
      this.logEvent('analysis_completed', {
        duration: this.analysisStats.duration,
        isVegan: enhancedResult.isVegan,
        confidence: enhancedResult.confidence
      });
      
      // Cachea resultatet om caching är aktiverad
      if (this.cachingEnabled) {
        await this.cacheService.cacheImageAnalysisResult(imageUri, enhancedResult);
        this.logEvent('image_analysis_cached', {});
      }
      
      return enhancedResult;
    } catch (error) {
      // Konvertera till AnalysisError om det inte redan är det
      const analysisError = error instanceof AnalysisError 
        ? error 
        : new AnalysisError(
            error instanceof Error ? error.message : String(error),
            AnalysisErrorCode.UNKNOWN_ERROR
          );
            
      const errorMessage = analysisError.message;
      console.error('Bildanalys misslyckades:', errorMessage);
      
      // Uppdatera analysstatistik med fel
      this.analysisStats.endTime = Date.now();
      this.analysisStats.duration = this.analysisStats.endTime - this.analysisStats.startTime;
      this.analysisStats.success = false;
      this.analysisStats.errorMessage = errorMessage;
      
      this.logEvent('analysis_failed', { 
        error: errorMessage,
        code: analysisError.code
      });
      
      // Om API-gräns har överskridits, kasta vidare felet
      if (analysisError.code === AnalysisErrorCode.API_LIMIT_EXCEEDED) {
        throw analysisError;
      }
      
      // Om direktanalys misslyckas, prova den gamla metoden
      console.warn('Återgår till traditionell analys via API...');
      this.analysisProgress = 60;
      
      // Extrahera ingredienser och analysera dem som text
      try {
        this.logEvent('falling_back_to_text_analysis');
        const ingredients = await this.extractIngredientsFromImage(imageUri);
        this.analysisProgress = 80;
        
        if (ingredients && ingredients.length > 0) {
          const joinedIngredients = ingredients.join(', ');
          const textResult = await this.analyzeTextIngredients(joinedIngredients);
          this.analysisProgress = 100;
          
          // Uppdatera analysstatistik med fallback-resultat
          this.analysisStats.endTime = Date.now();
          this.analysisStats.duration = this.analysisStats.endTime - this.analysisStats.startTime;
          this.analysisStats.success = true;
          
          this.logEvent('fallback_analysis_completed', {
            duration: this.analysisStats.duration,
            isVegan: textResult.isVegan
          });
          
          return textResult;
        } else {
          throw new AnalysisError(
            'Inga ingredienser hittades i bilden',
            AnalysisErrorCode.NO_INGREDIENTS_FOUND
          );
        }
      } catch (fallbackError) {
        const fallbackErrorMsg = fallbackError instanceof Error 
          ? fallbackError.message 
          : String(fallbackError);
          
        console.error('Även fallback-analys misslyckades:', fallbackErrorMsg);
        this.analysisProgress = 85;
        
        this.logEvent('fallback_analysis_failed', { error: fallbackErrorMsg });
      }
      
      // Om även detta misslyckas, använd lokalanalys
      this.analysisProgress = 90;
      this.logEvent('using_local_analysis');
      
      const localResult = await this.localAnalyzeIngredients(['Okänd ingrediens']);
      this.analysisProgress = 100;
      
      // Uppdatera analysstatistik med lokal analys
      this.analysisStats.endTime = Date.now();
      this.analysisStats.duration = this.analysisStats.endTime - this.analysisStats.startTime;
      this.analysisStats.success = true;
      
      this.logEvent('local_analysis_completed');
      
      return localResult;
    }
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
    try {
      console.log('Extracting ingredients from image...');
      
      // Convert local URI to base64 if needed
      const imageBase64 = imageUri.startsWith('data:') 
        ? imageUri.split(',')[1] 
        : await this.convertImageToBase64(imageUri);
      
      const response = await fetch(`${this.API_ENDPOINT}/image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image: imageBase64,
        }),
      });
      
      if (!response.ok) {
        throw new Error(`Image analysis failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Image analysis result (ingredients):', data.ingredients ? data.ingredients.length : 0);
      
      return data.ingredients || [];
    } catch (error) {
      console.error('Image analysis error:', error);
      throw new Error(`Kunde inte analysera bilden: ${error instanceof Error ? error.message : 'Okänt fel'}`);
    }
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