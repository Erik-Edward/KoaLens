Jag ska hjälpa dig med att analysera och lösa de problem du beskriver i KoaLens-appen. Låt oss börja med att titta på de mest kritiska problemen: kamera-/navigeringsbuggarna.

## Problem 1: Kameraöppning tar 10 minuter efter knapptryck

Efter att ha analyserat din kod ser jag flera potentiella orsaker till den fördröjda kameraöppningen:

1. Eventuella race conditions i navigeringslåsmekanismen
2. Överflödig AsyncStorage-hantering
3. Onödiga väntemekanismer

### Lösning för kameraöppningen:

Låt oss först uppdatera `app/(tabs)/(scan)/index.tsx` för att förbättra hanteringen av kameranavigering:

```typescript
// Uppdatera funktionen handleScanPress i app/(tabs)/(scan)/index.tsx
const handleScanPress = async () => {
  // Clear any existing safety timeouts before proceeding
  await clearCameraSafetyTimeout();
  
  // Ge haptisk feedback direkt
  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  
  // Kontrollera platform först - snabb retur för web
  if (Platform.OS === 'web') {
    Alert.alert(
      "Kameran ej tillgänglig", 
      "Kamerafunktionen är endast tillgänglig på fysiska enheter.",
      [{ text: "OK" }]
    );
    return;
  }
  
  // Minska fördröjningen: Kontrollera usage innan permission-check
  try {
    // Starta concurrent operation för usage fetch (men vänta inte på den)
    const usagePromise = refreshUsageLimit().catch(err => {
      console.error('Background usage refresh error:', err);
      // Fortsätt oavsett fel här - låt oss inte blockera kameraöppning
    });
    
    // Kontrollera kameratillstånd direkt (ingen await)
    if (!hasPermission) {
      // Visa permission dialog
      setShowPermissionModal(true);
      return; // Avsluta tidigt
    }
    
    // Om vi har tillåtelse, navigera direkt till kameran INNAN usage-check är klar
    // Detta dramatiskt förbättrar upplevd prestanda
    console.log('Navigating to camera immediately');
    
    // Navigera till kameran direkt
    router.push({
      pathname: '/(tabs)/(scan)/camera',
      params: { userId: user?.id }
    });
    
    // Nu kan vi vänta på usage check i bakgrunden
    try {
      await usagePromise;
      setNetworkError(false);
    } catch (error) {
      // Logga bara felet men fortsätt
      console.error('Usage check failed after camera navigation:', error);
    }
    
  } catch (error) {
    console.error('Error during camera navigation:', error);
    Alert.alert("Ett fel uppstod", "Kunde inte öppna kameran. Försök igen.");
  }
};
```

## Problem 2: Skärmen fastnar på "analyserar ingredienser"

Detta problem uppstår troligen för att komponentens tillstånd inte återställs korrekt efter analysen. Låt oss uppdatera relevant kod i `app/(tabs)/(scan)/result.tsx`:

```typescript
// Uppdatera resetScreenState i app/(tabs)/(scan)/result.tsx
const resetScreenState = useCallback(() => {
  if (!isScreenMounted.current) return;
  
  console.log('Resetting scan screen state, current pathname:', pathname);
  
  // Viktigt: Säkerställ att loading-state återställs först
  setLoading(false);
  
  // Återställ övriga tillstånd
  setAnalysisComplete(false);
  setNavigating(false);
  setError(null);
  setIsOffline(false);
  
  // Starta animationer
  startAnimations();
  
  // Uppdatera användningsgräns i bakgrunden
  refreshUsageLimit().catch(err => {
    console.error('Failed to refresh usage in scan view:', err);
    // Undvik att sätta networkError om vi redan är på väg bort
    if (isScreenMounted.current) {
      setNetworkError(true);
    }
  });
  
  // Dölj alla modaler
  setShowGuide(false);
  setShowPermissionModal(false);
  setShowUsageLimitModal(false);
  
  // Sätt inte networkError - låt det hanteras av användningsgränsen

  // Rensa alla navigeringslås
  clearCameraSafetyTimeout();
  
  // Spåra skärmåterställning
  if (isScreenMounted.current) {
    logEvent('screen_reset', { screen: 'scan', path: pathname });
    logScreenView('ScanScreen');
  }
}, [pathname, clearCameraSafetyTimeout, refreshUsageLimit]);
```

## Problem 3: Uppdatering av användningsgränsräknaren tar flera minuter

Detta problem beror troligen på ineffektiv cachehantering och onödiga omladdningar. Låt oss uppdatera `hooks/useUsageLimit.ts`:

```typescript
// Uppdatera hooks/useUsageLimit.ts - förbättra cachehantering
import { useCallback, useEffect, useState, useRef } from 'react';
import { useStore } from '@/stores/useStore';
import { useAuth } from '@/providers/AuthProvider';
import { captureException, addBreadcrumb } from '@/lib/sentry';

// Använda samma BACKEND_URL som i claudeVisionService
const BACKEND_URL = 'https://koalens-backend.fly.dev';

// Skapa en in-memory cache med TTL (Time To Live)
const usageCache = {
  data: null,
  timestamp: 0,
  TTL: 30 * 1000, // 30 seconds cache
  
  set(data) {
    this.data = data;
    this.timestamp = Date.now();
    console.log('Usage cache updated:', data);
  },
  
  get() {
    if (!this.data) return null;
    
    // Check if cache is still valid
    if (Date.now() - this.timestamp > this.TTL) {
      console.log('Usage cache expired');
      return null;
    }
    
    console.log('Using cached usage data:', this.data);
    return this.data;
  },
  
  clear() {
    this.data = null;
    this.timestamp = 0;
  }
};

// Förbättrad fetchWithRetry-funktion med timeout och retry
const fetchWithRetry = async (url, options = {}, maxRetries = 2) => {
  let lastError = null;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Lägg till timeout för fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // Snabbare timeout: 5 sekunder
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Kontrollera HTTP-status
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.log(`Attempt ${attempt + 1} failed:`, error);
      lastError = error instanceof Error ? error : new Error(String(error));
      
      if (attempt < maxRetries - 1) {
        // Kortare väntetid: 500ms mellan försök
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
  }
  
  throw lastError;
};

export function useUsageLimit() {
  const { user } = useAuth();
  const usageLimit = useStore(state => state.usageLimit);
  const setUsageLimit = useStore(state => state.setUsageLimit);
  const fetchUsageLimit = useStore(state => state.fetchUsageLimit);
  const isFetchingRef = useRef(false);
  
  // VIKTIGT: Lägg till lokal state för optimistisk UI-uppdatering
  const [localUsage, setLocalUsage] = useState({
    analysesUsed: usageLimit.analysesUsed,
    analysesLimit: usageLimit.analysesLimit,
    isPremium: usageLimit.isPremium,
    isLoading: false
  });
  
  const refreshUsageLimit = useCallback(async () => {
    if (!user?.id || isFetchingRef.current) {
      console.log('Skipping usage refresh: ' + (!user?.id ? 'no user' : 'already fetching'));
      return false;
    }
    
    // Markera att vi börjar hämta
    isFetchingRef.current = true;
    
    try {
      console.log('Refreshing usage limit for user:', user.id);
      addBreadcrumb('Refreshing usage limit', 'api', { userId: user.id });
      
      // Kontrollera om vi har data i cache först
      const cachedData = usageCache.get();
      if (cachedData) {
        // Om vi har cache, använd den för snabb UI-uppdatering
        setLocalUsage({
          analysesUsed: cachedData.analysesUsed,
          analysesLimit: cachedData.analysesLimit,
          isPremium: cachedData.isPremium,
          isLoading: false
        });
        
        // Uppdatera store UTAN att vänta
        setUsageLimit({
          analysesUsed: cachedData.analysesUsed,
          analysesLimit: cachedData.analysesLimit,
          isPremium: cachedData.isPremium,
          lastChecked: new Date().toISOString(),
          isLoading: false
        });
        
        console.log('Updated UI from cache');
        
        // Fortsätt med bakgrundsuppdatering om cachen är gammal
        if (Date.now() - usageCache.timestamp > 10000) { // 10 seconds
          // Men returnera innan API-anrop så UI uppdateras direkt
          setTimeout(() => {
            // Försöker refresha i bakgrunden utan att blockera UI
            fetchUsageLimit(user.id).catch(console.error);
          }, 500);
        }
        
        return true;
      }
      
      // Sätt lokalt loading-tillstånd för UI-feedback
      setLocalUsage(prev => ({ ...prev, isLoading: true }));
      
      // Hämta data från API med kort timeout
      const response = await fetchWithRetry(`${BACKEND_URL}/usage/${user.id}`, {}, 2);
      const usageData = await response.json();
      
      console.log('Usage data received:', usageData);
      
      // Uppdatera cache
      usageCache.set(usageData);
      
      // Uppdatera lokal state för direkt UI-feedback
      setLocalUsage({
        analysesUsed: usageData.analysesUsed,
        analysesLimit: usageData.analysesLimit,
        isPremium: usageData.isPremium,
        isLoading: false
      });
      
      // Uppdatera store - gör detta utan await för att inte blockera UI
      setUsageLimit({
        analysesUsed: usageData.analysesUsed,
        analysesLimit: usageData.analysesLimit,
        isPremium: usageData.isPremium,
        lastChecked: new Date().toISOString(),
        isLoading: false
      });
      
      console.log('Usage limit refreshed successfully');
      return true;
    } catch (err) {
      console.error('Failed to refresh usage limit:', err);
      
      // Markera som inte laddar i UI
      setLocalUsage(prev => ({ ...prev, isLoading: false }));
      
      // Uppdatera store med felstatus men behåll gamla värden
      setUsageLimit({
        ...usageLimit,
        isLoading: false,
        lastChecked: new Date().toISOString()
      });
      
      // Log to Sentry for server-side tracking
      captureException(err instanceof Error ? err : new Error(String(err)), {
        tags: { feature: 'usage_limit', userId: user.id },
        level: 'warning'
      });
      
      return false;
    } finally {
      // Markera att vi är klara med hämtningen
      isFetchingRef.current = false;
    }
  }, [user, setUsageLimit, usageLimit]);
  
  // Beräkna återstående analyser baserat på lokal state för snabb UI
  const remaining = localUsage.isPremium 
    ? Infinity 
    : Math.max(0, localUsage.analysesLimit - localUsage.analysesUsed);
  
  // Kontrollera om användaren har nått sin gräns
  const hasReachedLimit = !localUsage.isPremium && remaining <= 0;
  
  // Hämta användningsgräns när komponenten renderas första gången
  useEffect(() => {
    if (user?.id) {
      // Fördröj uppdateringen något för att prioritera UI-rendering
      const timer = setTimeout(() => {
        refreshUsageLimit().catch(console.error);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [user?.id]);
  
  return {
    ...localUsage,
    remaining,
    hasReachedLimit,
    refreshUsageLimit
  };
}
```

## Problem 4: Claude Vision API 500-fel

Detta problem ser ut att vara relaterat till felhantering i backend. Låt oss uppdatera `services/claudeVisionService.ts` för att förbättra felhantering och automatisk återförsök:

```typescript
// Uppdatera retryWithBackoff-funktionen i services/claudeVisionService.ts (frontend)
// Lägg till större fokus på hantering av 500-fel från Claude API

// Modifiera RETRY_CONFIG för att hantera 500-fel bättre
const RETRY_CONFIG = {
  maxRetries: 4,         // Öka antalet försök
  initialDelayMs: 1000,  // Starta med 1 sekunds fördröjning
  maxDelayMs: 15000,     // Längre maximal fördröjning
  backoffFactor: 2,      // Dubbla fördröjningen vid varje försök
};

// Uppdatera retryWithBackoff-funktionen för att bättre hantera serverfel
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: { 
    functionName: string;
    userId?: string;
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

      // VIKTIGT: Förbättrad detektion av fel som ska återförsökas
      // Serverfel (500-fel) från Claude bör alltid återförsökas
      const isServerError = lastError.message.includes('500') ||
                          lastError.message.includes('Internal server error') ||
                          lastError.message.includes('Service unavailable');
      
      // Överbelastningsfel bör också återförsökas
      const isOverloadedError = lastError.message.includes('Overloaded') || 
                             lastError.message.includes('529') ||
                             lastError.message.includes('too many requests') ||
                             lastError.message.includes('rate limit');
      
      // Nätverksfel bör återförsökas
      const isNetworkError = lastError.message.includes('network') ||
                           lastError.message.includes('connection') ||
                           lastError.message.includes('timeout') ||
                           lastError.message.includes('fetch failed');
      
      // Bestäm om vi ska försöka igen
      const shouldRetry = (isServerError || isOverloadedError || isNetworkError) && retryCount < maxRetries;
      
      // Logga fel för diagnostik
      const errorType = isServerError ? 'server_error' :
                     isOverloadedError ? 'overloaded' :
                     isNetworkError ? 'network' : 'other';
                     
      console.log(`Retry attempt ${retryCount}/${maxRetries} for ${options.functionName}. Error type: ${errorType}`);
      
      // Logga extra information för 500-fel
      if (isServerError) {
        console.warn(`Claude API 500 error detected. Full message: ${lastError.message}`);
        // Lägg till extra diagnostisk info om tillgängligt
        try {
          const errorJson = JSON.parse(lastError.message.substring(lastError.message.indexOf('{')));
          console.warn('Parsed error JSON:', errorJson);
        } catch (e) {
          // Ignorera parsningsfel
        }
      }
      
      // Ge upp om vi inte ska försöka igen
      if (!shouldRetry) {
        console.log(`No more retries (${retryCount}/${maxRetries}) for ${options.functionName}`);
        throw lastError;
      }

      console.log(`Will retry in ${delay}ms for ${options.functionName}`);
      logEvent('analysis_retry', {
        retry_count: retryCount,
        delay_ms: delay,
        function_name: options.functionName,
        error_type: errorType,
        error_message: lastError.message
      });

      // Vänta innan vi försöker igen med exponentiell backoff
      await sleep(delay);
      
      // Öka fördröjningen för nästa försök med exponentiell backoff, men begränsa den
      delay = Math.min(delay * backoffFactor, maxDelayMs);
    }
  }
}
```

## Uppdatering av backend-delen för Claude API-fel:

Låt oss också modifiera backend-koden för att bättre hantera 500-fel från Claude API. Här är en uppdatering för `src/server.ts`:

```typescript
// BACKEND-UPPDATERING: src/server.ts - förbättra Claude API-felhantering
async function makeClaudeRequest(base64Data, promptText) {
  const maxRetries = 3;
  let retryCount = 0;
  let lastError = null;
  
  while (retryCount < maxRetries) {
    try {
      console.log(`Claude API attempt ${retryCount + 1}/${maxRetries}`);
      
      const message = await anthropic.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 1024,
        messages: [{
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Data,
              },
            },
            {
              type: "text",
              text: promptText
            }
          ],
        }],
      });
      
      // Kontrollera att vi faktiskt fick ett svar
      if (!message || !message.content || message.content.length === 0) {
        throw new Error("Empty response from Claude API");
      }
      
      return message;
    } catch (error) {
      retryCount++;
      lastError = error;
      
      // Logga detaljerad felinformation
      console.error(`Claude API error (attempt ${retryCount}/${maxRetries}):`, {
        message: error.message,
        name: error.name,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        status: error.status,
        type: error.type
      });
      
      // Särskild hantering för 500-fel
      const isServerError = 
        error.message?.includes('500') || 
        error.message?.includes('Internal server error');
      
      if (isServerError && retryCount < maxRetries) {
        // Vänta en stund innan vi försöker igen
        const delay = Math.pow(2, retryCount) * 1000; // Exponentiell backoff
        console.log(`Waiting ${delay}ms before retrying Claude API call...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // Om det inte är serverfel eller om vi har slut på återförsök, avbryt
      break;
    }
  }
  
  // Om vi kommer hit har alla försök misslyckats
  throw lastError;
}

// Använd den nya funktionen i analyzeImage-handleren
const analyzeImage = async (req, res) => {
  try {
    console.log('Received analyze request');
    const { image, isCroppedImage, userId } = req.body;
    
    // ... befintlig kod ...
    
    console.log('Sending request to Claude...');
    try {
      const message = await makeClaudeRequest(base64Data, analysisPrompt);
      
      const content = message.content[0];
      if (content.type !== 'text') {
        throw new Error("Ett oväntat svar mottogs från analysmotorn");
      }
      
      console.log('Raw response from Claude:', content.text);
      
      // ... fortsätt bearbeta svaret ...
      
    } catch (claudeError) {
      console.error('Claude API request failed after retries:', claudeError);
      
      // Ge ett användarvänligt felmeddelande
      res.status(503).json({
        error: 'ANALYSIS_SERVICE_UNAVAILABLE',
        message: 'Analystjänsten är tillfälligt otillgänglig. Försök igen om en stund.',
        details: {
          suggestions: ['Vänta några minuter och försök igen', 'Kontrollera din internetanslutning']
        }
      });
      return;
    }
    
    // ... resten av befintlig kod ...
  } catch (error) {
    // ... befintlig felhanteringskod ...
  }
};
```

## Sammanfattning av rekommenderade ändringar

För att lösa de identifierade problemen rekommenderar jag följande ändringar:

1. **Kameraöppningsfördröjning:**
   - Uppdatera handleScanPress i app/(tabs)/(scan)/index.tsx för att minska beroendet av asynkrona operationer
   - Prioritera kameranavigering före användningsgränskontroll
   - Rensa och förenkla NavigationLock-logiken

2. **"Analyserar ingredienser" fastnar:**
   - Förbättra resetScreenState i app/(tabs)/(scan)/result.tsx
   - Säkerställ att laddningstillstånd återställs korrekt och först
   - Förtydliga livscykelhantering och tillståndsåterställning

3. **Långsam uppdatering av användningsgränsräknaren:**
   - Implementera in-memory cache i hooks/useUsageLimit.ts
   - Lägg till lokal tillståndshantering för optimistisk UI-uppdatering
   - Minska antalet nätverksanrop och förbättra återanvändning av data

4. **Claude Vision API 500-fel:**
   - Förbättra retryWithBackoff-funktionen i services/claudeVisionService.ts
   - Lägg till särskild hantering för 500-fel med annan retry-logik
   - I backend: implementera makeClaudeRequest med inbyggd retry-logik

Dessa ändringar bör tillsammans avsevärt förbättra användarupplevelsen genom att lösa de kritiska prestanda- och användbarhetsproblemen som påverkar appen.