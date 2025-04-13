/**
 * Adapter för att låta gamla koder använda den nya store-strukturen
 * Detta är ett övergångslager som kommer tas bort när migrationen är klar
 */

import { ScannedProduct } from './types';
import { Product, NewProduct, convertFromLegacyProduct, convertToLegacyProduct } from '@/models/productModel';
import { useStore } from './useStore';

/**
 * Konverterar en ny produkt till gammal för bakåtkompatibilitet
 */
export async function getUserProducts(): Promise<ScannedProduct[]> {
  try {
    // Hämta produkter via nya produktlagret
    const products = await useStore.getState().getProducts();
    
    // Konvertera till gamla formatet för bakåtkompatibilitet
    return products.map(product => convertToLegacyProduct(product));
  } catch (error) {
    console.error('Fel vid hämtning av produkter via adapter:', error);
    return [];
  }
}

/**
 * Hämtar en produkt med ID
 */
export async function getProductById(id: string): Promise<ScannedProduct | null> {
  try {
    const product = await useStore.getState().getProductById(id);
    return product ? convertToLegacyProduct(product) : null;
  } catch (error) {
    console.error(`Fel vid hämtning av produkt med ID ${id} via adapter:`, error);
    return null;
  }
}

/**
 * Lägger till en produkt
 */
export async function addProduct(scannedProduct: Partial<ScannedProduct>): Promise<ScannedProduct | null> {
  try {
    // Konvertera från gamla formatet till nya
    const product = convertFromLegacyProduct(scannedProduct);
    
    // Skapa en NewProduct utan ID
    const newProduct: NewProduct = {
      ingredients: product.ingredients,
      analysis: product.analysis,
      metadata: product.metadata
    };
    
    // Använd nya produktlagret för att lägga till produkten
    const savedProduct = await useStore.getState().addProduct(newProduct);
    
    // Konvertera tillbaka till gamla formatet
    return convertToLegacyProduct(savedProduct);
  } catch (error) {
    console.error('Fel vid tillägg av produkt via adapter:', error);
    return null;
  }
}

/**
 * Tar bort en produkt
 */
export async function removeProduct(id: string): Promise<void> {
  try {
    await useStore.getState().removeProduct(id);
  } catch (error) {
    console.error(`Fel vid borttagning av produkt med ID ${id} via adapter:`, error);
  }
}

/**
 * Växlar favorit-status för en produkt
 */
export async function toggleFavorite(id: string): Promise<void> {
  try {
    await useStore.getState().toggleFavorite(id);
  } catch (error) {
    console.error(`Fel vid växling av favorit-status för produkt med ID ${id} via adapter:`, error);
  }
}

/**
 * Returnerar användar-ID från nya userStore
 */
export async function getCurrentUserId(): Promise<string> {
  return await useStore.getState().getUserId();
}

/**
 * Exporterar även den gamla userStore funktionen för bakåtkompatibilitet
 */
export const getUserId = getCurrentUserId;

/**
 * Konverterar en lista med Product-objekt till ScannedProduct-objekt
 */
export function productsToScannedProducts(products: Product[] | Promise<Product[]>): ScannedProduct[] {
  // Om products är en Promise, returnera tom array
  if (products instanceof Promise) {
    console.log('Cannot convert Promise<Product[]> to ScannedProduct[]');
    return [];
  }
  
  // Filtrera bort eventuella null/undefined poster
  const validProducts = products.filter(p => p != null);
  
  return validProducts.map(product => {
    try {
      const legacyProduct = convertToLegacyProduct(product);
      return {
        id: legacyProduct.id || '',
        timestamp: legacyProduct.timestamp || '',
        imageUri: legacyProduct.imageUri || '',
        isVegan: typeof legacyProduct.isVegan === 'boolean' ? legacyProduct.isVegan : false,
        confidence: typeof legacyProduct.confidence === 'number' ? legacyProduct.confidence : 0,
        nonVeganIngredients: Array.isArray(legacyProduct.nonVeganIngredients) 
          ? legacyProduct.nonVeganIngredients 
          : [],
        allIngredients: Array.isArray(legacyProduct.allIngredients) 
          ? legacyProduct.allIngredients 
          : [],
        reasoning: legacyProduct.reasoning || '',
        isFavorite: legacyProduct.isFavorite || false,
        watchedIngredientsFound: Array.isArray(legacyProduct.watchedIngredientsFound) 
          ? legacyProduct.watchedIngredientsFound 
          : [],
        userId: legacyProduct.userId
      };
    } catch (error) {
      console.error('Error converting Product to ScannedProduct:', error);
      // Returnera ett säkert fallback-objekt vid fel
      return {
        id: product.id,
        timestamp: product.timestamp,
        imageUri: product.metadata.imageUri || '',
        isVegan: product.analysis.isVegan,
        confidence: product.analysis.confidence,
        nonVeganIngredients: [],
        allIngredients: product.ingredients,
        reasoning: product.analysis.reasoning || '',
        isFavorite: product.metadata.isFavorite,
        watchedIngredientsFound: [],
        userId: product.metadata.userId
      };
    }
  });
}

/**
 * Konverterar en lista med ScannedProduct-objekt till Product-objekt
 */
export function scannedProductsToProducts(scannedProducts: ScannedProduct[] | Promise<ScannedProduct[]>): Product[] {
  // Om scannedProducts är en Promise, returnera tom array
  if (scannedProducts instanceof Promise) {
    console.log('Cannot convert Promise<ScannedProduct[]> to Product[]');
    return [];
  }
  
  // Filtrera bort eventuella null/undefined poster
  const validProducts = scannedProducts.filter(p => p != null);
  
  return validProducts.map(scannedProduct => {
    try {
      return convertFromLegacyProduct(scannedProduct);
    } catch (error) {
      console.error('Error converting ScannedProduct to Product:', error);
      // Returnera ett säkert fallback-objekt vid fel
      return {
        id: scannedProduct.id,
        timestamp: scannedProduct.timestamp,
        // Map string[] to IngredientListItem[]
        ingredients: Array.isArray(scannedProduct.allIngredients)
          ? scannedProduct.allIngredients.map(name => ({
              name: name,
              status: 'unknown' as const, // Assign a default status
              statusColor: '#607D8B' // Default color for unknown
            }))
          : [],
        analysis: {
          isVegan: typeof scannedProduct.isVegan === 'boolean'
            ? scannedProduct.isVegan
            : false,
          isUncertain: false,
          confidence: typeof scannedProduct.confidence === 'number'
            ? scannedProduct.confidence
            : 0,
          watchedIngredients: [],
          reasoning: scannedProduct.reasoning
        },
        metadata: {
          userId: scannedProduct.userId,
          scanDate: scannedProduct.timestamp,
          isFavorite: !!scannedProduct.isFavorite,
          isSavedToHistory: true,
          imageUri: scannedProduct.imageUri
        }
      };
    }
  });
} 