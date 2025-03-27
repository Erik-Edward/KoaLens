# KoaLens Backend AI Implementation

This document provides an overview of the AI integration implemented in the KoaLens Backend application.

## Architecture Overview

The backend implements a flexible AI service architecture that allows for multiple AI providers to be used interchangeably. The current implementation supports two AI providers:

1. **Claude (Anthropic)** - The original AI provider
2. **Gemini (Google)** - The newly integrated AI provider

The architecture follows these design principles:
- **Provider-agnostic interface** - Common interface for all AI services
- **Factory pattern** for service instantiation
- **Utility classes** for prompt management and output parsing
- **Configuration-driven** provider selection

## Key Components

### 1. AI Provider Interface

The `AIProvider` interface defines the contract that all AI service implementations must follow, ensuring they can be used interchangeably.

**Location:** `src/types/aiProvider.ts`

```typescript
export interface AIProvider {
  generateContent(prompt: string): Promise<any>;
  generateContentFromMedia(prompt: string, mediaBase64: string, mimeType: string): Promise<any>;
  countTokens(prompt: string): Promise<number>;
}
```

### 2. AI Services

#### Gemini Service

**Location:** `src/services/geminiService.ts`

The Gemini service implements the AIProvider interface using Google's Generative AI SDK. It provides:
- Text generation from prompts
- Multimodal content generation from images/media
- Token counting for prompts

Key features:
- Safety settings configuration
- Error handling and logging
- Token usage tracking

#### Claude Service

**Location:** `src/services/claudeService.ts`

The Claude service implements the AIProvider interface using Anthropic's SDK. It provides similar functionality to the Gemini service but uses the Claude API.

### 3. AI Service Factory

**Location:** `src/services/aiServiceFactory.ts`

The factory class provides a single entry point for getting the currently configured AI service.

Key features:
- Dynamic provider selection based on configuration
- Lazy loading of service implementations
- Singleton instances for efficient resource use

### 4. Prompt Manager

**Location:** `src/utils/promptManager.ts`

The prompt manager handles:
- Storage and management of prompt templates
- Variable substitution in templates
- Default templates for common use cases like ingredient analysis

Usage example:
```typescript
// Load default templates (ingredient analysis, etc.)
promptManager.loadDefaultTemplates();

// Format a prompt with variables
const prompt = promptManager.format('ingredientsAnalysis', {
  ingredients: "Water, sugar, flour, eggs"
});
```

### 5. Output Parser

**Location:** `src/utils/outputParser.ts`

The output parser standardizes AI responses:
- Extracts JSON from text responses
- Validates and normalizes the structure
- Provides type safety for parsed results

### 6. Test Endpoints

**Location:** `src/routes/testGemini.ts`

Two test endpoints have been implemented:
- `/api/ai/test-gemini` - A simple endpoint to test the Gemini API with a prompt
- `/api/ai/test-ingredients` - An endpoint to test ingredient analysis

These endpoints demonstrate the full pipeline from request to response, including prompt formatting and output parsing.

## Configuration

The AI services are configured via environment variables and the `ai-config.js` file. Key configuration settings include:

- **AI Provider:** Determines which AI service to use (gemini/claude)
- **API Keys:** Authentication keys for the respective services
- **Model Names:** Specifies which model variant to use
- **Generation Parameters:** Settings like temperature, max tokens, etc.

## Testing

Tests have been implemented to verify the functionality of the Gemini service:
- Service initialization
- Content generation
- Result parsing
- Token counting

Tests can be run with: `npm test -- geminiService`

## API Usage

### Basic Text Generation

```typescript
const aiService = await AIServiceFactory.getService();
const result = await aiService.generateContent("What is Gemini AI?");
```

### Ingredient Analysis

```typescript
// Format the prompt with ingredients
const prompt = promptManager.format('ingredientsAnalysis', {
  ingredients: "Water, sugar, flour, eggs"
});

// Get the AI service
const aiService = await AIServiceFactory.getService();

// Generate content
const result = await aiService.generateContent(prompt);

// Parse the result
const parsedResult = outputParser.parseAnalysisResult(result);
```

## Gemini 2.5 Pro Migration

To streamline development and improve performance, we have migrated the backend from a hybrid Claude/Gemini solution to exclusively using Gemini 2.5 Pro. This migration includes:

### Backend Changes (Completed)

1. **Configuration Updates**
   - Modified `ai-config.js` to exclusively use Gemini 2.5 Pro
   - Removed claude-specific configuration options
   - Optimized Gemini parameters for better performance

2. **Service Simplification**
   - Simplified `AIServiceFactory` to focus only on Gemini
   - Maintained claude-related components (inactive) for backwards compatibility
   - Enhanced GeminiService with improved error handling and retry mechanisms

3. **Prompt Optimization**
   - Updated image and text analysis prompts for Gemini 2.5 Pro
   - Enhanced language detection capabilities
   - Optimized response formatting for more reliable parsing

4. **Image Processing**
   - Enhanced image preprocessing for Gemini's computer vision capabilities
   - Updated compression settings and format handling
   - Improved OCR capabilities for ingredient text extraction

### Frontend Changes (Implemented)

The frontend changes to fully leverage the Gemini migration have been completed:

1. **Direct Analysis Implementation**
   - Created optimized `analyzeImageDirectly` method in AnalysisService
   - Simplified the camera-to-analysis flow
   - Implemented better error handling and fallback options

2. **UI/UX Improvements**
   - Streamlined scanning process with improved user feedback
   - Rebuilt the results screen with focus on safe text rendering
   - Implemented SafeText component to prevent rendering issues
   - Added detailed progress indicators during analysis

3. **Image Preprocessing**
   - Implemented client-side image optimization for Gemini
   - Enhanced image compression before API transmission
   - Added permanent image storage for history items

4. **Error Handling and Recovery**
   - Implemented robust JSON parsing for various API response formats
   - Added specialized handling for Gemini API error responses
   - Enhanced logging for troubleshooting
   - Improved navigation between scan and result screens

## Safe Text Rendering Solution

A critical issue in the application was text rendering errors ("Text strings must be rendered within a <Text> component"). To address this, we implemented:

1. **SafeText Component**
   ```jsx
   function SafeText({ value, fallback = "", style = {} }) {
     let displayText = fallback;
     
     try {
       if (value === null || value === undefined) {
         displayText = fallback;
       } else if (typeof value === "string") {
         displayText = value;
       } else if (typeof value === "number" || typeof value === "boolean") {
         displayText = String(value);
       } else if (Array.isArray(value) || typeof value === "object") {
         displayText = JSON.stringify(value);
       } else {
         displayText = String(value);
       }
     } catch (e) {
       displayText = fallback;
     }
     
     return (
       <StyledText style={style}>
         {displayText}
       </StyledText>
     );
   }
   ```

2. **Robust JSON Parsing Strategy**
   ```javascript
   // Multiple parsing attempts to handle different API response formats
   try {
     // Direct parsing
     analysisResult = JSON.parse(rawData);
   } catch (parseError) {
     try {
       // Handle double-stringified JSON
       const cleaned = rawData.replace(/^"|"$/g, '').replace(/\\"/g, '"');
       analysisResult = JSON.parse(cleaned);
     } catch (innerError) {
       // Handle plain text error messages
       if (typeof rawData === 'string' && 
           (rawData.includes('Error:') || 
            rawData.includes('overloaded'))) {
         throw new Error(`API Error: ${rawData.substring(0, 100)}`);
       }
       throw new Error('Could not parse analysis result');
     }
   }
   ```

3. **API Error Detection**
   - Added specific checks for Gemini API errors
   - Implemented human-readable error messages
   - Enhanced logging for API-related errors

## Permanent Image Storage

To ensure images are preserved between sessions, we implemented:

1. **Image Copy to Permanent Storage**
   ```javascript
   // Create a unique filename based on product ID
   const timestamp = new Date().getTime();
   const newFileName = `${product.id}_${timestamp}.jpg`;
   const permanentDir = `${FileSystem.documentDirectory}images/`;
   
   // Create images directory if it doesn't exist
   await FileSystem.makeDirectoryAsync(permanentDir, { intermediates: true });
   
   // Copy the image to the permanent location
   await FileSystem.copyAsync({
     from: temporaryImageUri,
     to: `${permanentDir}${newFileName}`
   });
   ```

2. **Robust Error Handling**
   - Fallback mechanisms if image copying fails
   - Detailed logging for debugging image-related issues
   - Graceful degradation when images cannot be saved

## Steg 5: Anpassning av textanalys

### Genomfört
- ✅ Språkdetektering - Implementerat med stöd för engelska och svenska
- ✅ Anpassade prompter baserade på språk - Implementerat i PromptManager
- ✅ Grundläggande Gemini-integration - API-integration med Google AI-tjänst
- ✅ Vegansk ingrediensdatabas - Implementerat lokal databas med veganska/icke-veganska ingredienser
- ✅ Databas-verifiering - Verifiering och förbättring av AI-resultat med databas
- ✅ Robust textrendering - Implementerat SafeText-komponent för säker rendering
- ✅ Förbättrad JSON-parsning - Robust parsning av olika API-svarsformat

### Kvarstår
- 🔲 Förbättrade verifieringsalgoritmer
- 🔲 Omfattande testning och finjustering
- 🔲 Återintegrering av analysräknare
- 🔲 Stöd för fler språk
- 🔲 Offline-analysfunktionalitet

## Enhanced Logging System

To facilitate debugging and monitoring, we've implemented comprehensive logging throughout the application:

1. **Structured Logging Format**
   - Prefixed logs for easy filtering (e.g., "RESULT SCREEN:")
   - Consistent error logging with context information
   - Performance metrics for critical operations

2. **Navigation Tracking**
   - Detailed logging of screen transitions
   - Parameter passing validation
   - Screen initialization tracking

3. **API Communication Logging**
   - Request and response logging
   - Error response capture
   - Timing information for performance analysis

## Conclusion

The AI integration architecture continues to evolve with enhanced text analysis capabilities and language support. The system has successfully migrated to Gemini 2.5 Pro, with significant improvements in reliability, user experience, and error handling. The frontend has been updated to safely handle the diverse response formats from the AI service, ensuring a robust user experience.