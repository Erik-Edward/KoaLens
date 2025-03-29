# KoaLens Video-analys: Implementationsplan och Testning

## Översikt
Detta dokument beskriver den kompletta implementationsplanen för videoanalysfunktionen i KoaLens, från lokal utveckling till produktionsdeployment. Dokumentet är avsett att koordinera arbetet mellan backend och frontend för att säkerställa en konsekvent implementation.

## Implementationsstatus

### Backend (Klar)
- ✅ VideoOptimizer - Komplett implementation av videooptimering med ffmpeg
- ✅ TempFileCleaner - Schemalagd rensning av temporära filer
- ✅ VideoAnalysisService - Komplett videoanalys med Gemini 2.5 Pro
- ✅ API endpoints - `/api/video/analyze-video` implementerad
- ✅ Lokal testning - Validerad genom direkta API-anrop via PowerShell

### Frontend (Pågående)
- 🔄 Video inspelning/uppladdning - Implementera videoinspelning i UI
- 🔄 API-integrering - Anslut frontend till backend
- 🔄 Användarupplevelse - Laddningsindikatorer, felmeddelanden, etc.
- ⏳ Produktionsintegration - Anslut till produktionsbackend

## Implementation- och Testplan

### Fas 1: Lokal Utveckling och Testning

#### Steg 1: Förbered testmiljö
1. **Backend**:
   - Kör backend-servern lokalt på port 3000
   - Säkerställ att ffmpeg är installerat lokalt
   - Verifiera att videoanalysfunktionen fungerar med direkta API-anrop

2. **Frontend**:
   - Konfigurera API-basURL till `http://localhost:3000` i utvecklingsmiljön
   - Implementera videoinspelning/uppladdningsfunktionalitet
   - Skapa användargränssnitt för att visa resultat av videoanalys

#### Steg 2: Lokal Integration
1. Implementera frontend-videoanalys-API-klient:
   ```typescript
   // API-klient i frontend
   export async function analyzeVideo(videoBlob: Blob): Promise<AnalysisResult> {
     try {
       // Konvertera videoblob till Base64
       const base64Data = await blobToBase64(videoBlob);
       
       // Skapa API-request
       const response = await fetch('/api/video/analyze-video', {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           'Accept': 'application/json'
         },
         body: JSON.stringify({
           base64Data,
           mimeType: videoBlob.type,
           preferredLanguage: 'sv' // eller från användarinställningar
         })
       });
       
       // Validera svar
       if (!response.ok) {
         throw new Error(`HTTP error: ${response.status}`);
       }
       
       // Returnera data
       return await response.json();
     } catch (error) {
       console.error('Video analysis error:', error);
       
       // Vid utveckling, använd mockdata vid fel
       if (process.env.NODE_ENV === 'development') {
         return mockVideoAnalysis();
       }
       
       throw error;
     }
   }
   
   // Hjälpfunktion för Base64-konvertering
   function blobToBase64(blob: Blob): Promise<string> {
     return new Promise((resolve, reject) => {
       const reader = new FileReader();
       reader.onloadend = () => {
         const base64String = reader.result as string;
         // Extrahera endast Base64-delen utan MIME-prefix
         // t.ex. från "data:video/mp4;base64,ACTUAL_DATA" till "ACTUAL_DATA"
         const base64Data = base64String.split(',')[1];
         resolve(base64Data);
       };
       reader.onerror = reject;
       reader.readAsDataURL(blob);
     });
   }
   ```

2. Integrera API-klienten i frontendkomponenter:
   ```typescript
   // Exempel på React-komponent
   function VideoScanner() {
     const [isAnalyzing, setIsAnalyzing] = useState(false);
     const [result, setResult] = useState<AnalysisResult | null>(null);
     const [error, setError] = useState<string | null>(null);
     
     async function handleVideoCapture(videoBlob: Blob) {
       setIsAnalyzing(true);
       setError(null);
       
       try {
         const analysisResult = await analyzeVideo(videoBlob);
         setResult(analysisResult);
       } catch (err) {
         setError('Kunde inte analysera video: ' + (err as Error).message);
       } finally {
         setIsAnalyzing(false);
       }
     }
     
     // ... resten av komponenten
   }
   ```

3. Testa det fullständiga flödet lokalt:
   - Spela in/ladda upp en video
   - Verifiera att videon skickas till backend
   - Verifiera att backend analyserar videon korrekt
   - Verifiera att frontend visar resultatet korrekt

### Fas 2: Förberedelser för Produktion

#### Steg 1: Backend-förberedelser
1. **Verifiera miljövariabler**:
   - Säkerställ att alla miljövariabler (GEMINI_API_KEY, etc.) är konfigurerade för produktion
   - Verifiera att inga hårda kodade lokala sökvägar används

2. **Förbered deployment-skript**:
   - Säkerställ att ffmpeg installeras i produktionscontainern:
   ```
   # Dockerfile eller fly.toml tillägg
   RUN apt-get update && apt-get install -y ffmpeg
   ```

3. **Förbättrad loggning**:
   - Lägg till detaljerad loggning för att underlätta felsökning i produktion
   - Implementera statuspunkt för självdiagnostik:
   ```typescript
   // Status-endpoint för videoanalystjänsten
   router.get('/status', (req, res) => {
     res.json({
       version: process.env.npm_package_version || 'unknown',
       ffmpeg: checkFfmpegInstalled() ? 'Available' : 'Missing',
       tempDir: os.tmpdir(),
       geminiApiConfigured: !!process.env.GEMINI_API_KEY
     });
   });
   ```

#### Steg 2: Frontend-förberedelser
1. **Konfigurera miljövariabler**:
   - Skapa system för att växla mellan lokal och produktions-API:
   ```typescript
   // api-config.ts
   export const API_BASE_URL = process.env.NODE_ENV === 'production' 
     ? 'https://koalens-backend.fly.dev'
     : 'http://localhost:3000';
   ```

2. **Implementera fallback-hantering**:
   - Skapa stöd för fallback till bildanalys om videoanalys misslyckas:
   ```typescript
   async function analyzeIngredients(media: Blob, isVideo: boolean) {
     try {
       if (isVideo) {
         return await analyzeVideo(media);
       } else {
         return await analyzeImage(media);
       }
     } catch (error) {
       console.error(`${isVideo ? 'Video' : 'Image'} analysis failed:`, error);
       
       // Om videoanalys misslyckas, prova bildanalys istället
       if (isVideo) {
         // Extrahera en frame från videon och försök med bildanalys
         const imageBlob = await extractFrameFromVideo(media);
         return await analyzeImage(imageBlob);
       }
       
       throw error;
     }
   }
   ```

### Fas 3: Produktions-Deployment och Testning

#### Steg 1: Backend-deployment
1. **Deploy till fly.io**:
   ```bash
   fly deploy
   ```

2. **Verifiera deployment**:
   - Kontrollera startloggar för att se att servern startar korrekt
   - Testa hälsokontrollpunkten: `https://koalens-backend.fly.dev/api/health`
   - Testa videoanalys-statuspunkten: `https://koalens-backend.fly.dev/api/video/status`

3. **Felsökning**:
   - Kontrollera logs för eventuella fel: `fly logs`
   - Testa direkt anslutning till servern: `fly ssh console`
   - Verifiera att ffmpeg är installerat: `ffmpeg -version`

#### Steg 2: Frontend-produktion
1. **Uppdatera konfiguration**:
   - Säkerställ att API_BASE_URL pekar på produktionsservern
   - Verifiera CORS-konfiguration om nödvändigt

2. **Deploy frontend**:
   - Deploy frontend till lämplig hosting-plattform
   - Verifiera att frontend kan ansluta till produktionsbackenden

3. **Integrationstestning**:
   - Testa videoanalys i produktionsmiljön
   - Verifiera felhanteringsscenarier
   - Säkerställ att användargränssnittet visar laddningsindikationer korrekt

### Fas 4: Övervakning och Underhåll

1. **Konfigurera övervakning**:
   - Implementera proaktiv övervakning av API-slutpunkten
   - Konfigurera varningar för hög latens eller error rates

2. **Förbättringar**:
   - Implementera caching av analysresultat för vanliga produkter
   - Optimera videoparsning för snabbare svarstider
   - Förbättra felhanterings- och återförsöksmekanismer

## API-dokumentation

### Videoanalys-API
- **Endpoint**: `/api/video/analyze-video`
- **Metod**: POST
- **Headers**:
  - Content-Type: application/json
  - Accept: application/json
- **Request Body**:
  ```json
  {
    "base64Data": "BASE64_ENCODED_VIDEO_DATA",
    "mimeType": "video/mp4",
    "preferredLanguage": "sv"
  }
  ```
- **Response Format**:
  ```json
  {
    "success": true,
    "result": {
      "ingredients": [
        {
          "name": "Ingrediensnamn",
          "isVegan": true,
          "confidence": 0.95
        },
        // Fler ingredienser...
      ],
      "isVegan": true,
      "confidence": 0.92
    },
    "processingTime": 15.34
  }
  ```
- **Felresponse**:
  ```json
  {
    "success": false,
    "error": "Felbeskrivning"
  }
  ```

### Statusmonitoring-API
- **Endpoint**: `/api/video/status`
- **Metod**: GET
- **Response Format**:
  ```json
  {
    "version": "1.0.0",
    "ffmpeg": "Available",
    "tempDir": "/tmp",
    "geminiApiConfigured": true
  }
  ```

## Tekniska Begränsningar
- **Videolängd**: Rekommenderad maxlängd är 5 sekunder
- **Videostorlek**: Maximal filstorlek är cirka 20MB efter optimering (upp till 80MB före optimering)
- **Videoformat**: MP4 (H.264) rekommenderas, andra format konverteras automatiskt
- **Upplösning**: Optimal upplösning 720p (högre upplösningar nedskalas automatiskt)
- **Processtid**: Typiskt 10-30 sekunder beroende på videolängd och kvalitet

## Riktlinjer för Användare
1. **Filma i bra belysning** - Säkerställ att ingredienslistan är väl belyst
2. **Håll kameran stilla** - Undvik skakiga videor för bästa resultat
3. **Fokusera på ingredienslistan** - Inkludera hela ingredienslistan i bild
4. **Begränsa videolängd** - 3-5 sekunder är optimalt
5. **Visa varning för stora videofiler** - Informera användare om att stora filer kan ta längre tid att bearbeta

## Felsökning
### Vanliga Problem och Lösningar
1. **404 Not Found**:
   - Verifiera att `/api/video/analyze-video` är korrekt registrerad
   - Kontrollera att routern är inkluderad i `src/routes/index.ts`

2. **CORS-fel**:
   - Verifiera CORS-konfiguration på backend
   - Säkerställ att frontend använder korrekt API-URL

3. **Timeout**:
   - Videofilen kan vara för stor
   - Öka timeout-värden på både client och server

4. **Analysmisslyckande**:
   - Kontrollera att ffmpeg är installerat
   - Verifiera att Gemini API-nyckeln är korrekt konfigurerad
   - Säkerställ att MIME-typen är korrekt

## Kontaktpersoner
- **Backend-utvecklare**: [Backend AI/Eric]
- **Frontend-utvecklare**: [Frontend AI/Eric]
- **DevOps-ansvarig**: [Eric]

---

Genom att följa denna plan och dokumentation kommer implementationen av videoanalysfunktionen att ske strukturerat med tydlig koordination mellan frontend- och backend-teamen. Detta säkerställer en smidig övergång från lokal utveckling till produktionsdeployment.
