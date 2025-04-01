/**
 * Förbättrad produktmodell med tydligare struktur
 * Denna ersätter den tidigare ScannedProduct-typen
 */

export interface WatchedIngredient {
  name: string;
  description?: string;
  reason?: string; // Vegansk/icke-vegansk/gråzon
  status?: string; // Nytt fält för tydligare status (uncertain, non-vegan, vegan)
}

export interface ProductAnalysis {
  isVegan: boolean;
  isUncertain?: boolean; // Ny status för osäker vegan-status
  confidence: number;
  watchedIngredients: WatchedIngredient[]; // Ingredienser med anmärkningar
  reasoning?: string; // Förklaring av analysen
  detectedLanguage?: string; // Detected language of the ingredients (sv, en, unknown)
  detectedNonVeganIngredients?: string[]; // Array of specifically detected non-vegan ingredients
  uncertainReasons?: string[]; // Orsaker till osäker status
}

export interface ProductMetadata {
  userId?: string;
  scanDate: string; // ISO date string
  isFavorite: boolean;
  isSavedToHistory: boolean;
  source?: string; // Manuell, skanning, etc.
  imageUri?: string; // URI till produktbild
  videoUri?: string; // URI till produktvideo
  croppedImageUri?: string; // URI till beskuren produktbild
  name?: string; // Produktnamn
}

export interface Product {
  id: string;
  timestamp: string; // ISO date string för bakåtkompatibilitet
  ingredients: string[]; // Lista med alla ingredienser
  analysis: ProductAnalysis;
  metadata: ProductMetadata;
}

/**
 * Interface för att skapa en ny produkt 
 * utan de automatiskt genererade fälten (id, timestamp, etc.)
 */
export interface NewProduct {
  ingredients: string[];
  analysis: ProductAnalysis;
  metadata: ProductMetadata;
}

/**
 * Konverterar en äldre ScannedProduct till vår nya Product-modell
 */
export function convertFromLegacyProduct(legacy: any): Product {
  // Skapa en lista med WatchedIngredient från legacy.nonVeganIngredients
  const watchedIngredients: WatchedIngredient[] = [];
  
  // Lägg till icke-veganska ingredienser
  if (Array.isArray(legacy.nonVeganIngredients)) {
    legacy.nonVeganIngredients.forEach((ingredient: string) => {
      watchedIngredients.push({
        name: ingredient,
        description: "Icke-vegansk ingrediens",
        reason: "non-vegan"
      });
    });
  }
  
  // Lägg till potentiellt icke-veganska ingredienser
  if (Array.isArray(legacy.maybeNonVeganIngredients)) {
    legacy.maybeNonVeganIngredients.forEach((ingredient: string) => {
      watchedIngredients.push({
        name: ingredient,
        description: "Potentiellt icke-vegansk ingrediens",
        reason: "maybe-non-vegan"
      });
    });
  }
  
  const scanDate = legacy.timestamp || new Date().toISOString();
  
  return {
    id: legacy.id || generateId(),
    timestamp: scanDate, // Använd samma värde för timestamp och scanDate
    ingredients: Array.isArray(legacy.allIngredients) ? legacy.allIngredients : [],
    analysis: {
      isVegan: legacy.isVegan ?? false,
      confidence: legacy.confidence ?? 0.5,
      watchedIngredients,
      reasoning: legacy.reasoning || undefined,
      detectedLanguage: legacy.detectedLanguage,
      detectedNonVeganIngredients: legacy.detectedNonVeganIngredients,
    },
    metadata: {
      userId: legacy.userId,
      scanDate: scanDate,
      isFavorite: legacy.isFavorite ?? false,
      isSavedToHistory: true, // Antag att alla legacy-produkter är i historiken
      source: legacy.source || "Legacy import",
      imageUri: legacy.imageUri,
      videoUri: legacy.videoUri,
      croppedImageUri: legacy.croppedImageUri,
      name: legacy.name || legacy.productName,
    }
  };
}

/**
 * Konverterar en Product till ett äldre ScannedProduct-format
 * för att behålla bakåtkompatibilitet
 */
export function convertToLegacyProduct(product: Product): any {
  // Extrahera non-vegan och maybe-non-vegan ingredienser från watchedIngredients
  const nonVeganIngredients = product.analysis.watchedIngredients
    .filter(i => i.reason === "non-vegan")
    .map(i => i.name);
  
  const maybeNonVeganIngredients = product.analysis.watchedIngredients
    .filter(i => i.reason === "maybe-non-vegan")
    .map(i => i.name);
  
  return {
    id: product.id,
    allIngredients: product.ingredients,
    nonVeganIngredients,
    maybeNonVeganIngredients,
    isVegan: product.analysis.isVegan,
    confidence: product.analysis.confidence,
    reasoning: product.analysis.reasoning,
    timestamp: product.timestamp || product.metadata.scanDate, // Använd timestamp om det finns, annars scanDate
    isFavorite: product.metadata.isFavorite,
    userId: product.metadata.userId,
    source: product.metadata.source,
    imageUri: product.metadata.imageUri,
    videoUri: product.metadata.videoUri,
    productName: product.metadata.name,
    detectedLanguage: product.analysis.detectedLanguage,
    detectedNonVeganIngredients: product.analysis.detectedNonVeganIngredients,
  };
}

/**
 * Genererar ett unikt ID för nya produkter
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
} 