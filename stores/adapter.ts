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
export function productsToScannedProducts(products: Product[]): ScannedProduct[] {
  return products.map(product => {
    try {
      const legacyProduct = convertToLegacyProduct(product);
      return legacyProduct as ScannedProduct;
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
export function scannedProductsToProducts(scannedProducts: ScannedProduct[]): Product[] {
  return scannedProducts.map(scannedProduct => {
    try {
      return convertFromLegacyProduct(scannedProduct);
    } catch (error) {
      console.error('Error converting ScannedProduct to Product:', error);
      // Returnera ett säkert fallback-objekt vid fel
      return {
        id: scannedProduct.id,
        timestamp: scannedProduct.timestamp,
        ingredients: scannedProduct.allIngredients,
        analysis: {
          isVegan: scannedProduct.isVegan,
          confidence: scannedProduct.confidence,
          watchedIngredients: [],
          reasoning: scannedProduct.reasoning
        },
        metadata: {
          userId: scannedProduct.userId,
          scanDate: scannedProduct.timestamp,
          isFavorite: scannedProduct.isFavorite,
          isSavedToHistory: true,
          imageUri: scannedProduct.imageUri
        }
      };
    }
  });
} 