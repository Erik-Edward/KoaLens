/**
 * Förbättrad produktmodell med tydligare struktur
 * Denna ersätter den tidigare ScannedProduct-typen
 */

export interface WatchedIngredient {
  name: string;
  description?: string;
  reason?: string; // Behålls för eventuell bakåtkompatibilitet eller extra info
  status: 'vegan' | 'non-vegan' | 'uncertain';
}

export interface ProductAnalysis {
  isVegan: boolean | null;
  isUncertain: boolean;
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
  detectedLanguage?: string;
  uncertainReasons?: string[];
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
  ingredients: IngredientListItem[];
  analysis: ProductAnalysis;
  metadata: ProductMetadata;
}

/**
 * Interface för att skapa en ny produkt 
 * utan de automatiskt genererade fälten (id, timestamp, etc.)
 */
export interface NewProduct {
  ingredients: IngredientListItem[];
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
        reason: "non-vegan",
        status: 'non-vegan'
      });
    });
  }
  
  // Lägg till potentiellt icke-veganska ingredienser (mappa till uncertain)
  if (Array.isArray(legacy.maybeNonVeganIngredients)) {
    legacy.maybeNonVeganIngredients.forEach((ingredient: string) => {
      watchedIngredients.push({
        name: ingredient,
        description: "Potentiellt icke-vegansk ingrediens",
        reason: "maybe-non-vegan",
        status: 'uncertain'
      });
    });
  }
  
  const scanDate = legacy.timestamp || new Date().toISOString();
  
  // Beräkna isUncertain baserat på legacy-data
  const isUncertain = legacy.isUncertain ?? (legacy.maybeNonVeganIngredients?.length > 0);
  
  return {
    id: legacy.id || generateId(),
    timestamp: scanDate,
    ingredients: Array.isArray(legacy.allIngredients) ? legacy.allIngredients.map((ingredient: string): IngredientListItem => ({
      name: ingredient,
      status: 'unknown',
      statusColor: '#333333',
      description: undefined
    })) : [],
    analysis: {
      isVegan: legacy.isVegan === undefined || legacy.isVegan === null ? null : legacy.isVegan,
      isUncertain: isUncertain,
      confidence: legacy.confidence ?? 0.5,
      watchedIngredients,
      reasoning: legacy.reasoning || undefined,
      detectedLanguage: legacy.detectedLanguage,
      uncertainReasons: legacy.uncertainReasons ?? (isUncertain ? ["Äldre produkt, status osäker"] : undefined)
    },
    metadata: {
      userId: legacy.userId,
      scanDate: scanDate,
      isFavorite: legacy.isFavorite ?? false,
      isSavedToHistory: true,
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
    allIngredients: product.ingredients.map(i => i.name),
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
  };
}

/**
 * Genererar ett unikt ID för nya produkter
 */
function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substring(2);
}

export interface IngredientListItem {
  name: string;
  status: 'vegan' | 'non-vegan' | 'uncertain' | 'unknown';
  statusColor: string;
  description?: string;
} 