// stores/slices/createHistorySlice.ts
import 'react-native-get-random-values'; // Denna import MÅSTE vara först!
import { StateCreator } from 'zustand';
import { HistorySlice, ScannedProduct, StoreState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { captureException, addBreadcrumb } from '@/lib/sentry';
import * as adapter from '../adapter';
import { productsToScannedProducts, scannedProductsToProducts } from '../adapter';
import { Product } from '@/models/productModel';

// Helper för produktvalidering
const validateProductData = (data: Partial<ScannedProduct>): boolean => {
  // Kontrollera nödvändiga fält
  if (!data.imageUri || typeof data.imageUri !== 'string') {
    console.error('Invalid product data: Missing or invalid imageUri');
    return false;
  }
  
  // Kontrollera att isVegan och confidence finns och har rätt typ
  if (typeof data.isVegan !== 'boolean') {
    console.error('Invalid product data: Missing or invalid isVegan');
    return false;
  }
  
  if (typeof data.confidence !== 'number' || isNaN(data.confidence)) {
    console.error('Invalid product data: Missing or invalid confidence');
    return false;
  }
  
  // Kontrollera att arrays finns
  if (!Array.isArray(data.nonVeganIngredients)) {
    console.error('Invalid product data: Missing or invalid nonVeganIngredients');
    return false;
  }
  
  if (!Array.isArray(data.allIngredients)) {
    console.error('Invalid product data: Missing or invalid allIngredients');
    return false;
  }
  
  return true;
};

// Helper för säker produktskapande
const createValidProduct = (productData: Partial<ScannedProduct>): ScannedProduct => {
  try {
    // Validera data innan vi fortsätter
    const isValid = validateProductData(productData);
    if (!isValid) {
      console.warn('Creating product with invalid data - using safe defaults');
      addBreadcrumb('Created product with invalid data', 'store', {
        imageUri: productData.imageUri || 'unknown',
        invalidFields: JSON.stringify(productData)
      });
    }
    
    // Skapa ett unikt ID för produkten
    const id = uuidv4();
    console.log('Creating valid product:', id, {
      confidence: productData.confidence || 0,
      isVegan: productData.isVegan ?? false,
      ingredients: (productData.allIngredients?.length || 0)
    });
    
    // Skapa produkten med standardvärden där data saknas
    const product: ScannedProduct = {
      id,
      timestamp: new Date().toISOString(),
      imageUri: productData.imageUri || '',
      isVegan: typeof productData.isVegan === 'boolean' ? productData.isVegan : false,
      confidence: typeof productData.confidence === 'number' ? productData.confidence : 0,
      nonVeganIngredients: Array.isArray(productData.nonVeganIngredients) 
        ? productData.nonVeganIngredients 
        : [],
      allIngredients: Array.isArray(productData.allIngredients) 
        ? productData.allIngredients 
        : [],
      reasoning: typeof productData.reasoning === 'string' ? productData.reasoning : '',
      isFavorite: false,
      watchedIngredientsFound: Array.isArray(productData.watchedIngredientsFound)
        ? productData.watchedIngredientsFound
        : [],
      userId: productData.userId // Lägg till användar-ID
    };
    
    return product;
  } catch (error) {
    console.error('Error creating product:', error);
    captureException(error instanceof Error ? error : new Error('Error creating product'));
    
    // Returnera en säker fallback-produkt vid fel
    return {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      imageUri: productData.imageUri || '',
      isVegan: false,
      confidence: 0,
      nonVeganIngredients: [],
      allIngredients: [],
      reasoning: 'Error creating product',
      isFavorite: false,
      watchedIngredientsFound: [],
      userId: productData.userId // Lägg till användar-ID här också
    };
  }
};

// Uppdatera createHistorySlice för att delegera till den nya implementationen
export const createHistorySlice: StateCreator<StoreState, [], [], HistorySlice> = (set, get) => ({
  // Använd produktadapter för att konvertera Product[] till ScannedProduct[]
  products: [],

  // Nya implementationer som använder adapter-funktioner
  getUserProducts: () => {
    try {
      // Produkter kommer från produktslice
      const products = get().getProducts();
      if (!Array.isArray(products)) {
        // Om getProducts inte returnerarar array, försök med async-funktionen
        console.log('Using async method to get products');
        return [];
      }
      
      // Kontrollera om products är en Promise (async funktion)
      if (products instanceof Promise) {
        console.log('Products is a Promise, cannot convert directly');
        return [];
      }
      
      // Konvertera till ScannedProduct format
      return productsToScannedProducts(products);
    } catch (error) {
      console.error('Error in getUserProducts:', error);
      return [];
    }
  },

  addProduct: (productData) => {
    if (!productData) {
      console.warn('Attempted to add null/undefined product!');
      return;
    }

    try {
      const product = createValidProduct(productData);
      
      // Get the mixed products array from the store
      const compatibleStore = get() as unknown as { products: (ScannedProduct | Product)[] };
      
      // Update products using any to bypass type checking limitations
      (set as any)((state: any) => ({ 
        products: [...compatibleStore.products, product] 
      }));
      
      // Försök uppdatera även i nya systemet
      adapter.addProduct(product).catch(error => {
        console.warn('Failed to add product to new system:', error);
      });
    } catch (error) {
      console.error('Error in addProduct:', error);
      captureException(error instanceof Error ? error : new Error('Error in addProduct'));
    }
  },

  removeProduct: (id) => {
    // Get the mixed products array from the store
    const compatibleStore = get() as unknown as { products: (ScannedProduct | Product)[] };
    
    // Update products using any to bypass type checking limitations
    (set as any)((state: any) => ({
      products: compatibleStore.products.filter(p => p.id !== id),
    }));
    
    // Försök radera även i nya systemet
    adapter.removeProduct(id).catch(error => {
      console.warn('Failed to remove product from new system:', error);
    });
  },

  toggleFavorite: (id) => {
    // Get the mixed products array from the store
    const compatibleStore = get() as unknown as { products: (ScannedProduct | Product)[] };
    
    // Update products using any to bypass type checking limitations
    (set as any)((state: any) => ({
      products: compatibleStore.products.map(p => {
        if (p.id === id) {
          // Handle both ScannedProduct and Product types
          if ('isFavorite' in p) {
            // It's a ScannedProduct
            return { ...p, isFavorite: !p.isFavorite };
          } else if (p.metadata && typeof p.metadata === 'object') {
            // It's a Product
            return {
              ...p,
              metadata: {
                ...p.metadata,
                isFavorite: !p.metadata.isFavorite
              }
            };
          }
        }
        return p;
      }),
    }));
    
    // Försök uppdatera även i nya systemet
    adapter.toggleFavorite(id).catch(error => {
      console.warn('Failed to toggle favorite in new system:', error);
    });
  },

  clearHistory: () => {
    set({ products: [] });
  },

  clearProductsWithoutUser: () => {
    let count = 0;
    
    set(state => {
      const filtered = state.products.filter(p => {
        // Check for userId in both ScannedProduct and Product types
        const shouldKeep = 
          ('userId' in p && !!p.userId) || 
          ('metadata' in p && p.metadata && typeof p.metadata === 'object' && 'userId' in p.metadata && !!p.metadata.userId);
        
        if (!shouldKeep) count++;
        return shouldKeep;
      });
      
      return { products: filtered };
    });
    
    return count;
  },
});