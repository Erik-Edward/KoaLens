// stores/slices/createHistorySlice.ts
import 'react-native-get-random-values'; // Denna import MÅSTE vara först!
import { StateCreator } from 'zustand';
import { HistorySlice, ScannedProduct, StoreState } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { captureException, addBreadcrumb } from '@/lib/sentry';

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

// Export the createHistorySlice creator function
export const createHistorySlice: StateCreator<StoreState, [], [], HistorySlice> = (set, get) => ({
  products: [],

  // Filtrerar produkter baserat på inloggad användare
  getUserProducts: () => {
    const allProducts = get().products;
    const currentUser = get().user;
    
    // Om ingen användare är inloggad, returnera tom array
    if (!currentUser) return [];
    
    // VIKTIGT: Filtrera ENDAST produkter som tillhör den inloggade användaren
    // Tidigare kod tillät produkter utan userId, vilket kunde orsaka läckage
    return allProducts.filter(product => 
      product.userId === currentUser.id
    );
  },

  addProduct: (productData: Omit<ScannedProduct, 'id' | 'timestamp' | 'isFavorite'>) => {
    try {
      // Hämta aktuell användare
      const currentUser = get().user;
      
      console.log('Adding product, data:', {
        imageUri: productData.imageUri ? 'provided' : 'missing',
        isVegan: productData.isVegan,
        confidence: productData.confidence,
        ingredientsCount: productData.allIngredients?.length || 0,
      });
      
      // Lägg till användar-ID i produktdata
      const productWithUserId = {
        ...productData,
        userId: currentUser?.id
      };
      
      // Skapa produktobjekt med säker validering och default-värden
      const validProduct = createValidProduct(productWithUserId);
      
      // Lägg till breadcrumb för spårning
      addBreadcrumb('Adding product to store', 'store', {
        productId: validProduct.id,
        isVegan: validProduct.isVegan,
        confidence: validProduct.confidence,
        userId: validProduct.userId
      });
      
      // Kontrollera aktuellt antal produkter före
      const currentCount = get().products.length;
      
      // Uppdatera butiken med den nya produkten först i listan
      set((state: StoreState) => ({
        products: [
          validProduct,
          ...state.products,
        ],
      }));
      
      // Verifiera att tillägg faktiskt fungerade
      const newCount = get().products.length;
      if (newCount <= currentCount) {
        console.warn('Product may not have been added correctly, counts:', { before: currentCount, after: newCount });
      } else {
        console.log('Product added successfully:', validProduct.id, 'New count:', newCount);
      }
      
      // Lägg till bekräftelse-breadcrumb
      addBreadcrumb('Product successfully added to store', 'store', {
        productId: validProduct.id,
        totalProducts: newCount,
        userId: validProduct.userId
      });
      
      return validProduct.id;
    } catch (error) {
      console.error('Error adding product to store:', error);
      captureException(error instanceof Error ? error : new Error('Error adding product to store'));
      throw error;
    }
  },

  removeProduct: (id: string) => {
    try {
      set((state: StoreState) => ({
        products: state.products.filter((product) => product.id !== id),
      }));
      console.log('Product removed successfully:', id);
    } catch (error) {
      console.error('Error removing product:', error);
      captureException(error instanceof Error ? error : new Error('Failed to remove product'));
    }
  },

  toggleFavorite: (id: string) => {
    try {
      set((state: StoreState) => ({
        products: state.products.map((product) =>
          product.id === id
            ? { ...product, isFavorite: !product.isFavorite }
            : product
        ),
      }));
      console.log('Product favorite status toggled:', id);
    } catch (error) {
      console.error('Error toggling favorite status:', error);
      captureException(error instanceof Error ? error : new Error('Failed to toggle favorite status'));
    }
  },

  clearHistory: () => {
    try {
      set({ products: [] });
      console.log('History cleared successfully');
    } catch (error) {
      console.error('Error clearing history:', error);
      captureException(error instanceof Error ? error : new Error('Failed to clear history'));
    }
  },

  // Rensa alla produkter som saknar användar-ID (administrativ funktion)
  clearProductsWithoutUser: () => {
    try {
      console.log('Clearing products without user ID');
      set((state: StoreState) => ({
        products: state.products.filter(product => !!product.userId)
      }));
      
      addBreadcrumb('Cleared products without user ID', 'store');
      
      // Kontrollera resultat
      const remainingProducts = get().products;
      console.log(`Remaining products after cleanup: ${remainingProducts.length}`);
      
      return remainingProducts.length;
    } catch (error) {
      console.error('Error clearing products without user ID:', error);
      captureException(error instanceof Error ? error : new Error('Error clearing products without user ID'));
      return -1;
    }
  },
});