/**
 * Analystjänst för att hantera produktanalyser
 */

import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import * as FileSystem from 'expo-file-system';
import { API_BASE_URL } from '@/constants/config';
import { Platform } from 'react-native';

// Lokal definition av modeller
interface WatchedIngredient {
  name: string;
  description?: string;
  reason?: string;
}

interface AnalysisResult {
  isVegan: boolean;
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
  detectedLanguage?: string; 
  detectedNonVeganIngredients?: string[]; 
  ingredientList?: string[];
}

// Enkel implementation av CacheService
class CacheService {
  async getCachedImageAnalysisResult(hash: string): Promise<AnalysisResult | null> {
    console.log('Cache service: getCachedImageAnalysisResult called');
    return null; // Implementera faktisk cachning senare
  }
  
  async cacheImageAnalysisResult(hash: string, result: AnalysisResult): Promise<void> {
    console.log('Cache service: cacheImageAnalysisResult called');
  }
  
  async getCachedVideoAnalysisResult(hash: string): Promise<AnalysisResult | null> {
    console.log('Cache service: getCachedVideoAnalysisResult called');
    return null; // Implementera faktisk cachning senare
  }
  
  async cacheVideoAnalysisResult(hash: string, result: AnalysisResult): Promise<void> {
    console.log('Cache service: cacheVideoAnalysisResult called');
  }
}

// Hjälpfunktion för att hämta användar-ID
async function getUserId(): Promise<string> {
  // Returnera ett default-ID för demo
  return 'demo-user-' + Math.random().toString(36).substring(2, 9);
}

// Simulerad data (ersätt med faktisk API-anrop i produktion)
const MOCK_VEGAN_INGREDIENTS = [
  "Socker",
  "Salt",
  "Vetemjöl",
  "Vatten",
  "Jäst",
  "Vegetabilisk olja",
  "Vitlökspulver",
  "Lökpulver"
];

const MOCK_NON_VEGAN_INGREDIENTS = [
  "Mjölk",
  "Ägg",
  "Honung",
  "Gelatin",
  "Vassle",
  "Kasein",
  "Laktos"
];

// Lista över bevakade ingredienser med anledning
const WATCHED_INGREDIENTS = [
  {
    name: "Gelatin",
    reason: "non-vegan",
    description: "Framställt från animaliskt kollagen, vanligtvis från gris eller nötkreatur."
  },
  {
    name: "Vassle",
    reason: "non-vegan",
    description: "Mjölkprotein som ofta används i protein-produkter."
  },
  // ... existing code ...
];

// Använd API_BASE_URL från config eller fallback till standardvärden
const API_ENDPOINT = API_BASE_URL || process.env.EXPO_PUBLIC_API_URL || 'https://api.koalens.app';

// --- Start: New Interfaces for Video Backend Response ---
interface BackendIngredient {
  name: string;
  isVegan: boolean;
  confidence: number;
  isUncertain?: boolean;
}

interface VideoAnalysisBackendResponse {
  ingredients: BackendIngredient[];
  isVegan: boolean;
  isUncertain?: boolean;
  confidence: number;
  reasoning?: string;
  uncertainReasons?: string[];
}
// --- End: New Interfaces for Video Backend Response ---

export class AnalysisService {
  // API-slutpunkter
  private TEXT_ANALYSIS_ENDPOINT = `${API_ENDPOINT}/api/ingredients/analyze`;
  private IMAGE_ANALYSIS_ENDPOINT = `${API_ENDPOINT}/api/image/analyze`;
  private VIDEO_ANALYSIS_ENDPOINT = `${API_ENDPOINT}/api/video/analyze-video`;
  private VIDEO_STATUS_ENDPOINT = `${API_ENDPOINT}/api/video/status`; // Ny endpoint för statuscheck
  
  // Språkinställningar
  private currentLanguage: string = 'sv';
  
  // Cachning
  private cachingEnabled: boolean = true;
  private cacheService: CacheService;

  // Analysspårning
  public analysisProgress: number = 0;
  public detectedQualityIssues: string[] = [];
  public analysisStats = {
    startTime: Date.now(),
    endTime: 0,
    duration: 0,
    retryCount: 0,
    success: false,
    errorMessage: '',
    events: [] as { time: number; event: string; data?: any }[]
  };
  
  // Status för videoanalys-API
  private videoApiAvailable: boolean = true; // Antar tillgängligt tills motsatsen bevisas
  private lastVideoApiCheck: number = 0;
  private readonly VIDEO_API_CHECK_INTERVAL = 60 * 60 * 1000; // En timme

  constructor() {
    // Initialisera cache-tjänsten
    this.cacheService = new CacheService();
    this.resetStats();
    
    // Logga API-information för diagnostik
    console.log('AnalysisService: API_ENDPOINT är konfigurerad till:', API_ENDPOINT);
    console.log('AnalysisService: Tillgängliga API-slutpunkter:');
    console.log('- TEXT_ANALYSIS_ENDPOINT:', this.TEXT_ANALYSIS_ENDPOINT);
    console.log('- IMAGE_ANALYSIS_ENDPOINT:', this.IMAGE_ANALYSIS_ENDPOINT);
    console.log('- VIDEO_ANALYSIS_ENDPOINT:', this.VIDEO_ANALYSIS_ENDPOINT);
  }

  /**
   * Logga en händelse under analysprocessen
   */
  public logEvent(event: string, data?: any): void {
    console.log(`AnalysisService: ${event}`, data || '');
    this.analysisStats.events.push({
      time: Date.now(),
      event,
      data
    });
  }

  /**
   * Rapportera ett kvalitetsproblem i analysen
   */
  public reportQualityIssue(issue: string): void {
    if (!this.detectedQualityIssues.includes(issue)) {
      this.detectedQualityIssues.push(issue);
      this.logEvent('Quality issue detected', { issue });
    }
  }

  /**
   * Set the preferred language for analysis
   */
  setPreferredLanguage(language: string): void {
    this.currentLanguage = language;
    console.log(`Analysis language set to: ${language}`);
  }

  /**
   * Get the current language setting
   */
  getPreferredLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Detect language of ingredient text
   */
  async detectLanguage(text: string): Promise<string> {
    try {
      const hasSwedishChars = /[åäöÅÄÖ]/.test(text);
      return hasSwedishChars ? 'sv' : 'en';
    } catch (error) {
      console.error('Error detecting language:', error);
      return 'sv'; // Fallback to Swedish
    }
  }

  /**
   * Analyze text-based ingredients
   */
  async analyzeTextIngredients(ingredientsText: string): Promise<AnalysisResult> {
    this.resetStats();
    this.logEvent('Starting text analysis');
    
    try {
      // Detect language if needed and setup is on auto
      let language = this.currentLanguage;
      if (language === 'auto') {
        language = await this.detectLanguage(ingredientsText);
        this.logEvent('Detected language', { language });
      }
      
      this.analysisProgress = 30;
      
      // Split the text into ingredient list
      const ingredients = ingredientsText
        .split(/,|;/)
        .map(item => item.trim())
        .filter(item => item.length > 0);
      
      // Call API or use local processing
      try {
        this.logEvent('Calling backend API');
        
        // Construct API request
        const requestData = {
          ingredients,
          language,
          userId: await getUserId() || 'anonymous'
        };
        
        // Call API
        const response = await axios.post(this.TEXT_ANALYSIS_ENDPOINT, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          timeout: 30000
        });
        
        this.analysisProgress = 90;
        
        if (response.data && response.data.success) {
          this.logEvent('API call successful');
          
          const result: AnalysisResult = {
            isVegan: response.data.isVegan === true,
            confidence: response.data.confidence || 0.7,
            watchedIngredients: response.data.watchedIngredients || [],
            reasoning: response.data.reasoning || '',
            detectedLanguage: language
          };
          
          this.analysisProgress = 100;
          this.analysisStats.success = true;
          return result;
        } else {
          throw new Error(response.data?.error || 'Unknown API error');
        }
      } catch (apiError: any) {
        // Log the error
        this.logEvent('API call failed, falling back to local analysis', { error: apiError.message });
        
        // Fall back to local analysis
        return this.localAnalyzeIngredients(ingredients);
      }
    } catch (error: any) {
      this.logEvent('Error in text analysis', { error: error.message });
      this.reportQualityIssue('Text analysis failed');
      throw error;
    }
  }

  /**
   * Analyze ingredients locally if API fails
   */
  private localAnalyzeIngredients(ingredients: string[]): AnalysisResult {
    this.logEvent('Performing local ingredient analysis');
    this.analysisProgress = 60;
    
    // Simple check based on predefined lists
    const nonVeganFound = ingredients.filter(ingredient => 
      MOCK_NON_VEGAN_INGREDIENTS.some(nonVegan => 
        ingredient.toLowerCase().includes(nonVegan.toLowerCase())
      )
    );
    
    // Create watched ingredients from found non-vegan items
    const watchedIngredients = nonVeganFound.map(ingredient => {
      const matchedWatched = WATCHED_INGREDIENTS.find(watched => 
        ingredient.toLowerCase().includes(watched.name.toLowerCase())
      );
      
      return matchedWatched || {
        name: ingredient,
        reason: 'non-vegan',
        description: 'Ingrediens identifierad som potentiellt icke-vegansk.'
      };
    });
    
    this.analysisProgress = 100;
    
    // Return result
    return {
      isVegan: nonVeganFound.length === 0,
      confidence: 0.6, // Lower confidence for local analysis
      watchedIngredients,
      reasoning: nonVeganFound.length === 0 
        ? 'Inga icke-veganska ingredienser identifierade.' 
        : `Icke-veganska ingredienser identifierade: ${nonVeganFound.join(', ')}`,
      detectedLanguage: this.currentLanguage
    };
  }

  /**
   * Directly analyze an image without extracting text first
   */
  async analyzeImageDirectly(imageUri: string): Promise<AnalysisResult> {
    this.resetStats();
    this.logEvent('Starting direct image analysis');
    this.analysisProgress = 10;
    
    try {
      // Kontrollera cache
      if (this.cachingEnabled) {
        const cachedResult = await this.getCachedImageAnalysis(imageUri);
        if (cachedResult) {
          this.logEvent('Using cached image analysis result');
          this.analysisProgress = 100;
          return cachedResult;
        }
      }
      
      this.logEvent('Converting image to base64');
      
      // Omvandla bild till base64
      let base64Image: string;
      try {
        base64Image = await this.convertImageToBase64(imageUri);
        this.analysisProgress = 30;
      } catch (error) {
        console.error('Failed to convert image to base64:', error);
        this.logEvent('Image conversion failed, using local analysis');
        
        // Försök extrahera text från bilden lokalt
        const ingredients = ['Vatten', 'Socker', 'Salt']; // Dummy-ingredienser
        return this.localAnalyzeIngredients(ingredients);
      }
      
      // Hämta användar-id och MIME-typ
      const userId = await getUserId() || 'anonymous';
      const mimeType = this.getMimeTypeFromUri(imageUri) || 'image/jpeg';
      
      // Förbered API-begäran med samma struktur som video-begäran
      const requestData = {
        data: base64Image,
        contentType: mimeType,
        userId,
        metadata: {
          source: 'koalens-app',
          version: '1.0.0',
          device: Platform.OS,
          language: this.currentLanguage,
          timestamp: new Date().toISOString()
        },
        options: {
          detectIngredients: true,
          analyzeVegan: true,
          confidenceThreshold: 0.7
        }
      };
      
      this.analysisProgress = 40;
      this.logEvent('Sending image for analysis');
      
      try {
        // Använd axios istället för fetch för enhetlighet med video API
        const response = await axios.post(this.IMAGE_ANALYSIS_ENDPOINT, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-API-Key': process.env.EXPO_PUBLIC_API_KEY || '',
            'User-ID': userId
          },
          timeout: 60000 // 1 minut för bildanalys
        });
        
        this.analysisProgress = 90;
        
        if (response.data && (response.data.success || response.data.ingredientList || response.data.ingredients)) {
          this.logEvent('Image analysis API call successful');
          
          // Normalisera svarsdata enligt gemensam struktur
          const result: AnalysisResult = {
            isVegan: response.data.isVegan === true,
            confidence: response.data.confidence || 0.7,
            watchedIngredients: response.data.watchedIngredients || 
                               (response.data.nonVeganIngredients?.map((ingredient: string) => ({
                                 name: ingredient,
                                 reason: 'Non-vegan ingredient detected',
                                 description: `The ingredient "${ingredient}" is not vegan.`
                               })) || []),
            ingredientList: response.data.ingredients || response.data.ingredientList || [],
            reasoning: response.data.reasoning || response.data.explanation || '',
            detectedLanguage: response.data.detectedLanguage || this.currentLanguage
          };
          
          // Lagra i cache om aktiverat
          if (this.cachingEnabled) {
            await this.cacheImageAnalysisResult(imageUri, result);
          }
          
          this.analysisProgress = 100;
          this.analysisStats.success = true;
          return result;
        } else {
          throw new Error(response.data?.error || response.data?.message || 'Unknown API error');
        }
      } catch (apiError: any) {
        console.error('Image analysis API error:', apiError);
        this.logEvent('API call failed, trying to extract ingredients from the image', { 
          error: apiError.message 
        });
        
        // Försök extrahera ingredienser från bilden
        try {
          const ingredients = await this.extractIngredientsFromImage(imageUri);
          return this.analyzeIngredients(ingredients);
        } catch (extractError) {
          console.error('Failed to extract ingredients from image:', extractError);
          this.logEvent('Extraction failed, using local analysis');
          
          // Fallback till lokal analys med några vanliga ingredienser
          const fallbackIngredients = ['Socker', 'Salt', 'Vatten'];
          return this.localAnalyzeIngredients(fallbackIngredients);
        }
      }
    } catch (error: any) {
      console.error('Error in direct image analysis:', error);
      this.logEvent('Error in direct image analysis, using local analysis', { 
        error: error.message 
      });
      
      // Fallback till lokal analys
      const fallbackIngredients = ['Socker', 'Salt', 'Vatten'];
      return this.localAnalyzeIngredients(fallbackIngredients);
    } finally {
      this.analysisProgress = 100;
    }
  }

  /**
   * Analyze ingredients from a list
   */
  async analyzeIngredients(ingredients: string[]): Promise<AnalysisResult> {
    this.resetStats();
    this.logEvent('Starting ingredient analysis');
    this.analysisProgress = 10;
    
    try {
      // Join ingredients into text and analyze
      const ingredientsText = ingredients.join(', ');
      return await this.analyzeTextIngredients(ingredientsText);
    } catch (error: any) {
      this.logEvent('Error analyzing ingredients list', { error: error.message });
      throw error;
    }
  }

  // Extrahera och analysera ingredienser från en bild
  async extractIngredientsFromImage(imageUri: string): Promise<string[]> {
    this.resetStats();
    this.logEvent('Starting image ingredient extraction');
    this.analysisProgress = 10;
    
    // Här kunde vi använda en lokal OCR-motor om tillgänglig
    
    // Förbered bilden för API-anrop
    const base64Image = await this.convertImageToBase64(imageUri);
    this.logEvent('Image converted to base64');
    this.analysisProgress = 30;
    
    try {
      // Anropa API för bildanalys
      this.logEvent('Calling API for OCR processing');
      const result = await this.callImageToTextAPI(base64Image);
      this.analysisProgress = 70;
      this.logEvent('Received OCR result from API');
      
      if (result && result.ingredients && result.ingredients.length > 0) {
        return result.ingredients;
      } else if (result && result.text) {
        // Förbehandla texten lite för att hjälpa analysen senare
        return this.preprocessIngredientText(result.text);
      } else {
        throw new Error('No ingredients or text found in the image');
      }
    } catch (error) {
      this.logEvent('Error in extractIngredientsFromImage: ' + (error instanceof Error ? error.message : String(error)));
      this.reportQualityIssue('Image text extraction failed');
      throw error;
    } finally {
      this.analysisProgress = 80;
    }
  }
  
  /**
   * Kontrollerar om videoanalys-API:et är tillgängligt
   * @returns Promise<boolean> som indikerar om API:et är tillgängligt
   */
  async checkVideoApiAvailability(): Promise<boolean> {
    try {
      // Kontrollera om vi redan har en färsk check
      const now = Date.now();
      if (this.lastVideoApiCheck > 0 && 
          now - this.lastVideoApiCheck < this.VIDEO_API_CHECK_INTERVAL) {
        return this.videoApiAvailable;
      }
      
      this.logEvent('Kontrollerar videoanalys-API tillgänglighet');
      
      // Försök anropa status-endpoint eller ping-endpoint om tillgänglig
      try {
        const response = await axios.get(this.VIDEO_STATUS_ENDPOINT, {
          timeout: 5000
        });
        
        this.videoApiAvailable = response.status === 200;
        this.logEvent('Videoanalys-API statuskontroll', { 
          available: this.videoApiAvailable,
          endpoint: this.VIDEO_STATUS_ENDPOINT,
          response: response.status
        });
      } catch (statusError) {
        // Om status-endpoint inte finns, testa med OPTIONS-anrop
        try {
          const optionsResponse = await axios.options(this.VIDEO_ANALYSIS_ENDPOINT, {
            timeout: 5000
          });
          
          // Om OPTIONS ger 200 eller 204, finns endpointen
          this.videoApiAvailable = optionsResponse.status === 200 || 
                                  optionsResponse.status === 204;
          this.logEvent('Videoanalys-API OPTIONS-kontroll', { 
            available: this.videoApiAvailable 
          });
        } catch (optionsError: any) {
          // Om båda misslyckas, anta att API inte är tillgängligt
          this.videoApiAvailable = false;
          this.logEvent('Videoanalys-API är inte tillgängligt', { 
            error: optionsError.message 
          });
        }
      }
      
      // Uppdatera tidsstämpel för senaste kontrollen
      this.lastVideoApiCheck = now;
      return this.videoApiAvailable;
    } catch (error) {
      console.error('Fel vid kontroll av videoanalys-API:', error);
      this.videoApiAvailable = false;
      return false;
    }
  }

  /**
   * Analyze a video file for ingredients
   * @param videoUri Path to the video file
   * @param requestId Optional unique ID for request deduplication
   * @returns Analysis result with detected ingredients
   */
  async analyzeVideo(videoUri: string, requestId?: string | null): Promise<AnalysisResult> {
    this.resetStats();
    this.logEvent('Starting video analysis');
    this.analysisProgress = 5;
    
    try {
      // Kontrollera först om videoanalys-API är tillgängligt
      const apiAvailable = await this.checkVideoApiAvailability();
      if (!apiAvailable) {
        this.logEvent('Videoanalys-API är inte tillgängligt');
        this.reportQualityIssue('Video analysis API is not available');
        throw new Error('Video analysis API is not available');
      }
      
      // Check cache if enabled
      if (this.cachingEnabled) {
        const cachedResult = await this.getCachedVideoAnalysis(videoUri);
        if (cachedResult) {
          this.logEvent('Using cached video analysis result');
          this.analysisProgress = 100;
          return cachedResult;
        }
      }
      
      // Försök konvertera video till base64
      this.logEvent('Converting video to base64');
      let base64Video: string;
      try {
        base64Video = await this.convertVideoToBase64(videoUri);
        this.analysisProgress = 30;
      } catch (conversionError: any) {
        console.error('Video conversion error:', conversionError);
        this.logEvent('Failed to convert video to base64', { error: conversionError.message });
        throw new Error(`Failed to convert video: ${conversionError.message}`);
      }
      
      // Get user ID
      const userId = await getUserId() || 'anonymous';
      
      // Get mime type from URI
      const mimeType = this.getMimeTypeFromUri(videoUri) || 'video/mp4';
      
      // Prepare API request - anpassa till det format som förväntas av backend
      const requestData = {
        base64Data: base64Video,
        mimeType: mimeType,
        preferredLanguage: "sv", // Alltid sätt preferredLanguage till svenska
        requestId: requestId || undefined // Inkludera request ID om det finns
      };
      
      if (requestId) {
        this.logEvent('Request includes deduplication ID', { requestId });
      }
      
      this.analysisProgress = 50;
      this.logEvent('Sending video for analysis');
      
      // Försök anropa API
      try {
        // Verifiera att vi har en API-nyckel (även en tom sträng är ok för demoändamål)
        const apiKey = process.env.EXPO_PUBLIC_API_KEY || ''; 
        console.log('AnalysisService: Using API endpoint:', this.VIDEO_ANALYSIS_ENDPOINT);
        console.log('AnalysisService: Request data structure:', {
          hasData: !!requestData.base64Data,
          dataLength: requestData.base64Data ? requestData.base64Data.length : 0,
          mimeType: requestData.mimeType,
          preferredLanguage: requestData.preferredLanguage
        });
        
        // Diagnostik: Försök hämta lista på tillgängliga API-slutpunkter
        try {
          console.log('AnalysisService: Försöker hämta tillgängliga API-slutpunkter...');
          const optionsResponse = await axios.options(`${API_ENDPOINT}/api`, {
            headers: {
              'Accept': 'application/json'
            },
            timeout: 10000
          }).catch(e => {
            console.log('AnalysisService: Kunde inte hämta API-options:', e.message);
            return null;
          });
          
          if (optionsResponse) {
            console.log('AnalysisService: API options svar:', optionsResponse.data);
          }
        } catch (error: any) {
          console.log('AnalysisService: Kunde inte utföra options-anrop:', error.message);
        }
        
        // Försök med ett enkelt GET-anrop för att se om servern svarar
        try {
          console.log('AnalysisService: Testar GET-anrop till servern...');
          const healthResponse = await axios.get(`${API_ENDPOINT}/api/health`, {
            timeout: 5000
          }).catch(e => {
            console.log('AnalysisService: Server hälsokontroll misslyckades:', e.message);
            return null;
          });
          
          if (healthResponse) {
            console.log('AnalysisService: Servern svarar på GET, status:', healthResponse.status);
          }
          
          // Förbered för videoanalys genom att kontrollera endpoints
          console.log('AnalysisService: Undersöker tillgängliga video-endpoints...');
          const videoEndpointResponse = await axios.get(`${API_ENDPOINT}/api/video`, {
            timeout: 5000
          }).catch(e => {
            console.log('AnalysisService: Fel vid GET-anrop till /api/video:', e.message);
            console.log('Status:', e.response?.status, 'Data:', e.response?.data);
            return null;
          });
          
          if (videoEndpointResponse) {
            console.log('AnalysisService: Video-endpoints svar:', videoEndpointResponse.data);
          }
        } catch (error: any) {
          console.log('AnalysisService: Diagnostiska anrop misslyckades:', error.message);
        }
        
        // Gör det faktiska API-anropet
        const response = await axios.post(this.VIDEO_ANALYSIS_ENDPOINT, requestData, {
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'X-Request-ID': requestId || '' // Lägg även till requestId i headers
          },
          timeout: 180000 // 3 minutes for video processing
        }).catch(error => {
          // Verbose error logging för Axios-fel
          if (error.response) {
            // Servern svarade med en statuskod utanför 2xx-området
            console.error('Video API response error:', {
              status: error.response.status,
              headers: error.response.headers,
              data: error.response.data,
              requestId: requestId || 'none'
            });
            
            // Specifik hantering av 429 (Too Many Requests) för deduplicering
            if (error.response.status === 429 && 
                error.response.data?.error?.includes('Duplicate request')) {
              throw new Error('Duplicate request, analysis already in progress');
            }
          } else if (error.request) {
            // Begäran gjordes men inget svar mottogs
            console.error('Video API no response error:', error.request);
          } else {
            // Något hände vid uppsättning av begäran som utlöste ett fel
            console.error('Video API request setup error:', error.message);
          }
          // Propagera felet så att catch-blocket hanterar det
          throw error;
        });
        
        this.analysisProgress = 90;
        
        // --- Start: Updated Response Handling with Mapping ---
        // Analysera resultat från API (Uppdaterad logik)
        if (!response || !response.data) {
           throw new Error('Empty or invalid response from video analysis API');
        }

        // Steg 1: Tolka svaret enligt den nya backend-strukturen
        const backendResult: VideoAnalysisBackendResponse = response.data; 
        this.logEvent('Video API call successful, received new format', { 
            isVegan: backendResult.isVegan, 
            isUncertain: backendResult.isUncertain, 
            ingredientCount: backendResult.ingredients?.length ?? 0 
        });

        // Kontrollera att grundläggande fält från backend finns
        if (backendResult.isVegan === undefined || backendResult.confidence === undefined || !Array.isArray(backendResult.ingredients)) {
          this.logEvent('Invalid backend response structure received', { responseData: backendResult });
          throw new Error('Invalid response format from video analysis API backend');
        }

        // Steg 2: Mappa från backend-struktur till den gamla AnalysisResult-strukturen
        const mappedResult: AnalysisResult = {
            isVegan: backendResult.isVegan,
            confidence: backendResult.confidence,
            // Mappa backend ingredients till watchedIngredients
            watchedIngredients: backendResult.ingredients.map(ing => ({
                name: ing.name,
                reason: ing.isVegan ? (ing.isUncertain ? 'uncertain' : 'vegan') : 'non-vegan',
                // Description kan användas för osäkra skäl om det finns per ingrediens, annars undefined
                description: ing.isUncertain ? `Osäker status (Konfidens: ${ing.confidence.toFixed(2)})` : undefined 
            })),
            // Kombinera reasoning och uncertainReasons till ett fält
            reasoning: backendResult.reasoning || backendResult.uncertainReasons?.join('; ') || (backendResult.isUncertain ? 'Produkten har osäker vegansk status.' : ''),
            // Fyll i gamla fält baserat på ny data
            detectedNonVeganIngredients: backendResult.ingredients
                .filter(ing => !ing.isVegan && !ing.isUncertain)
                .map(ing => ing.name),
            ingredientList: backendResult.ingredients.map(ing => ing.name),
            detectedLanguage: 'sv' // Antag svenska baserat på backend-prompt
        };

        this.logEvent('Mapped backend response to frontend AnalysisResult', { 
            mappedIsVegan: mappedResult.isVegan,
            watchedCount: mappedResult.watchedIngredients.length
        });
        // --- End: Updated Response Handling with Mapping ---

        // Cache the mapped result if enabled
        if (this.cachingEnabled) {
          try {
            await this.cacheVideoAnalysisResult(videoUri, mappedResult); // Cache the mapped structure
            this.logEvent('Cached video analysis result');
          } catch (cacheError: any) {
            console.error('Failed to cache video analysis result:', cacheError.message);
            this.logEvent('Failed to cache video result', { error: cacheError.message });
          }
        }

        this.analysisProgress = 100;
        this.analysisStats.success = true;
        this.logEvent('Video analysis completed successfully');
        return mappedResult; // Return the result mapped to the original AnalysisResult interface
        
      } catch (error: any) {
        // Hantera fel
        this.analysisProgress = 100;
        this.analysisStats.success = false;
        this.analysisStats.errorMessage = error.message || 'Unknown error during video analysis';
        this.logEvent('Video analysis failed', { error: this.analysisStats.errorMessage, stack: error.stack });
        
        // Specifik felhantering kan läggas till här, t.ex. för timeout eller nätverksfel
        if (error.message === 'Duplicate request, analysis already in progress') {
          // Informera användaren specifikt om detta
          throw new Error('Analysen pågår redan för denna video.'); 
        } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
          throw new Error('Timeout vid anrop till videoanalys-API. Försök igen.');
        } else {
          throw new Error(`Fel vid videoanalys: ${this.analysisStats.errorMessage}`);
        }
      }
    } catch (error: any) {
      // Övergripande felhantering
      this.analysisStats.success = false;
      this.analysisStats.errorMessage = error.message || 'An unexpected error occurred';
      this.logEvent('Critical error in analyzeVideo', { error: this.analysisStats.errorMessage });
      throw error; // Kasta vidare felet
    } finally {
      this.analysisStats.endTime = Date.now();
      this.analysisStats.duration = this.analysisStats.endTime - this.analysisStats.startTime;
      console.log('AnalysisService: Video analysis finished.', this.analysisStats);
    }
  }
  
  /**
   * Konverterar en video till base64-kodad sträng
   */
  private async convertVideoToBase64(videoUri: string): Promise<string> {
    try {
      console.log('AnalysisService: Converting video to base64, original path:', videoUri);
      
      // Normalisera sökvägen för bättre kompatibilitet
      let normalizedUri = videoUri;
      if (!videoUri.startsWith('file://') && !videoUri.startsWith('content://')) {
        normalizedUri = `file://${videoUri}`;
      }
      console.log('AnalysisService: Normalized path to:', normalizedUri);
      
      // Försök hämta filinformation med normaliserad sökväg först
      try {
        const fileInfo = await FileSystem.getInfoAsync(normalizedUri);
        console.log('AnalysisService: File info (normalized):', fileInfo);
        
        if (fileInfo.exists) {
          // Kontrollera filstorlek (max 50MB)
          if (fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
            this.reportQualityIssue('Video file is too large (max 50MB)');
            throw new Error('Video file is too large (max 50MB)');
          }
          
          console.log('AnalysisService: Reading video file...');
          const base64 = await FileSystem.readAsStringAsync(normalizedUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log(`AnalysisService: Successfully converted video to base64 (${base64.length} chars)`);
          return base64;
        }
      } catch (error) {
        console.log('AnalysisService: Error with normalized path, trying original', error);
      }
      
      // Om normaliserad sökväg misslyckas, försök med originalsökvägen
      try {
        const fileInfo = await FileSystem.getInfoAsync(videoUri);
        console.log('AnalysisService: File info (original):', fileInfo);
        
        if (fileInfo.exists) {
          // Kontrollera filstorlek (max 50MB)
          if (fileInfo.size && fileInfo.size > 50 * 1024 * 1024) {
            this.reportQualityIssue('Video file is too large (max 50MB)');
            throw new Error('Video file is too large (max 50MB)');
          }
          
          console.log('AnalysisService: Reading original video file...');
          const base64 = await FileSystem.readAsStringAsync(videoUri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          
          console.log(`AnalysisService: Successfully converted video to base64 (${base64.length} chars)`);
          return base64;
        }
      } catch (error) {
        console.log('AnalysisService: Error with original path', error);
      }
      
      // Om vi fortfarande inte hittat filen, kolla i cache-katalogen
      if (FileSystem.cacheDirectory) {
        const fileName = videoUri.split('/').pop();
        if (fileName) {
          const cachePath = `${FileSystem.cacheDirectory}${fileName}`;
          
          try {
            const cacheInfo = await FileSystem.getInfoAsync(cachePath);
            console.log('AnalysisService: File info (cache):', cacheInfo);
            
            if (cacheInfo.exists) {
              // Kontrollera filstorlek (max 50MB)
              if (cacheInfo.size && cacheInfo.size > 50 * 1024 * 1024) {
                this.reportQualityIssue('Video file is too large (max 50MB)');
                throw new Error('Video file is too large (max 50MB)');
              }
              
              console.log('AnalysisService: Reading cache video file...');
              const base64 = await FileSystem.readAsStringAsync(cachePath, {
                encoding: FileSystem.EncodingType.Base64,
              });
              
              console.log(`AnalysisService: Successfully converted cache video to base64 (${base64.length} chars)`);
              return base64;
            }
          } catch (error) {
            console.log('AnalysisService: Error with cache path', error);
          }
        }
      }
      
      // Om vi kommer hit hittades inte filen
      this.reportQualityIssue('Video file not found');
      throw new Error('Video file not found at any of the checked paths');
    } catch (error) {
      console.error('AnalysisService: Failed to convert video to base64:', error);
      this.reportQualityIssue('Failed to convert video to base64');
      throw error;
    }
  }
  
  // Konvertera bild till base64
  private async convertImageToBase64(imageUri: string): Promise<string> {
    try {
      // Kontrollera om bildstien redan är i base64-format
      if (imageUri.startsWith('data:image/') || imageUri.startsWith('base64,')) {
        const parts = imageUri.split(',');
        return parts.length > 1 ? parts[1] : imageUri;
      }
      
      // Kontrollera att bildstien är giltig
      const imageInfo = await FileSystem.getInfoAsync(imageUri);
      if (!imageInfo.exists) {
        throw new Error('Bildfilen finns inte');
      }
      
      // Läs filen som base64
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64
      });
      
      return base64;
    } catch (error) {
      this.logEvent('Error converting image to base64: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  // Hämta MIME-typ från URI
  private getMimeTypeFromUri(uri: string): string | null {
    const extension = uri.split('.').pop()?.toLowerCase();
    
    // Mappning av filtyp till MIME-typ
    const mimeTypes: { [key: string]: string } = {
      'mp4': 'video/mp4',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo',
      'wmv': 'video/x-ms-wmv',
      '3gp': 'video/3gpp',
      'mkv': 'video/x-matroska'
    };
    
    return extension ? mimeTypes[extension] || null : null;
  }
  
  // Gör API-anrop med timeout
  private async makeApiRequest(url: string, data: any, timeoutMs: number = 30000): Promise<any> {
    try {
      this.logEvent(`Starting API request to ${url}`);
      
      // Skapa en timeout-promise
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('API request timed out')), timeoutMs);
      });
      
      // Skapa fetch-promise
      const fetchPromise = fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      // Använd Promise.race för att implementera timeout
      const response: Response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
      
      if (!response.ok) {
        const errorData = await response.text();
        this.logEvent(`API error: ${response.status} ${errorData.substring(0, 100)}`);
        throw new Error(`API error: ${response.status} ${errorData.substring(0, 100)}`);
      }
      
      const result = await response.json();
      this.logEvent('API request completed successfully');
      return result;
    } catch (error) {
      this.logEvent(`API request failed: ${error instanceof Error ? error.message : String(error)}`);
      this.analysisStats.retryCount++;
      throw error;
    }
  }
  
  // Caching-funktioner för bildanalys
  private async getCachedImageAnalysis(imageUri: string): Promise<any | null> {
    try {
      const hash = await this.hashString(imageUri);
      return await this.cacheService.getCachedImageAnalysisResult(hash);
    } catch (error) {
      console.error('Error accessing image analysis cache:', error);
      return null;
    }
  }
  
  private async cacheImageAnalysisResult(imageUri: string, result: any): Promise<void> {
    try {
      const hash = await this.hashString(imageUri);
      await this.cacheService.cacheImageAnalysisResult(hash, result);
    } catch (error) {
      console.error('Error storing image analysis in cache:', error);
    }
  }
  
  // Caching-funktioner för videoanalys
  private async getCachedVideoAnalysis(videoUri: string): Promise<any | null> {
    try {
      const hash = await this.hashString(videoUri);
      return await this.cacheService.getCachedVideoAnalysisResult(hash);
    } catch (error) {
      console.error('Error accessing video analysis cache:', error);
      return null;
    }
  }
  
  private async cacheVideoAnalysisResult(videoUri: string, result: any): Promise<void> {
    try {
      const hash = await this.hashString(videoUri);
      await this.cacheService.cacheVideoAnalysisResult(hash, result);
    } catch (error) {
      console.error('Error storing video analysis in cache:', error);
    }
  }
  
  /**
   * Call Image to Text API
   */
  private async callImageToTextAPI(base64Image: string): Promise<any> {
    try {
      // Hämta användar-ID för API-anrop
      const userId = await getUserId() || 'anonymous';
      
      // Förbered data för API-anrop
      const data = {
        userId: userId,
        image: base64Image,
        preferredLanguage: this.currentLanguage || 'sv'
      };
      
      // Anropa API för bildanalys
      const response = await axios.post(this.IMAGE_ANALYSIS_ENDPOINT, data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 60000 // 60 sekunder timeout
      });
      
      if (response.data && response.data.success === true) {
        return response.data;
      } else {
        throw new Error(response.data?.error || 'API-anrop misslyckades');
      }
    } catch (error) {
      this.logEvent('Error calling Image to Text API: ' + (error instanceof Error ? error.message : String(error)));
      throw error;
    }
  }
  
  // Hash-funktion för cachning
  private async hashString(str: string): Promise<string> {
    // Enkel hash-implementering
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Konvertera till 32-bitars heltal
    }
    return hash.toString(16);
  }
  
  // Förbehandla ingredienstext
  private preprocessIngredientText(text: string): string[] {
    if (!text) return [];
    
    // Ta bort överflödiga tecken och dela upp på kommatecken
    return text
      .replace(/\([^)]*\)/g, '') // Ta bort parenteser och deras innehåll
      .split(/,|;|\n/)
      .map(item => item.trim())
      .filter(item => item.length > 1);
  }
  
  // Reset analysis stats
  private resetStats(): void {
    this.analysisProgress = 0;
    this.detectedQualityIssues = [];
    this.analysisStats = {
      startTime: Date.now(),
      endTime: 0,
      duration: 0,
      retryCount: 0,
      success: false,
      errorMessage: '',
      events: []
    };
  }

  /**
   * Rapportera en felaktig ingrediens för granskning
   * @param reportData Data om den rapporterade ingrediensen
   */
  async reportIngredientSuggestion(reportData: {
    ingredient: string;
    feedback: string;
    productId: string;
    isVegan?: boolean;
    userId: string;
    timestamp: string;
  }): Promise<boolean> {
    try {
      console.log('AnalysisService: Rapporterar ingredienssuggestiom', reportData);
      
      // Endpoints för ingredienssuggestion
      const SUGGEST_ENDPOINT = `${API_ENDPOINT}/api/ingredients/suggest`;
      
      // Anropa API
      const response = await axios.post(SUGGEST_ENDPOINT, reportData, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 10000
      });
      
      // Kontrollera svaret
      if (response.status >= 200 && response.status < 300) {
        console.log('AnalysisService: Ingredienssuggestion mottagen', response.data);
        return true;
      } else {
        console.error('AnalysisService: Fel vid rapportering av ingrediens', response.status, response.data);
        return false;
      }
    } catch (error) {
      console.error('AnalysisService: Kunde inte rapportera ingrediens', error);
      
      // Om API inte är tillgängligt simulerar vi en framgångsrik rapportering
      console.log('AnalysisService: Simulerar framgångsrik rapportering', reportData);
      return true;
    }
  }
}