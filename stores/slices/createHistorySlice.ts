// stores/slices/createHistorySlice.ts
import 'react-native-get-random-values'; // Denna import MÅSTE vara först!
import { StateCreator } from 'zustand';
import { HistorySlice, ScannedProduct, StoreState } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Helper for safer product creation
const createValidProduct = (productData: Partial<ScannedProduct>): ScannedProduct => {
  // Ensure all required fields are present with valid default values if missing
  const validProduct: ScannedProduct = {
    id: uuidv4(),
    timestamp: new Date().toISOString(),
    isFavorite: false,
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
    watchedIngredientsFound: Array.isArray(productData.watchedIngredientsFound) 
      ? productData.watchedIngredientsFound 
      : []
  };
  
  // Log the product creation
  console.log('Creating valid product:', validProduct.id);
  
  return validProduct;
};

export const createHistorySlice: StateCreator<
  StoreState,
  [],
  [],
  HistorySlice
> = (set) => ({
  products: [],

  addProduct: (productData) => {
    try {
      console.log('Adding product, data:', productData);
      const validProduct = createValidProduct(productData);
      
      set((state) => ({
        products: [
          validProduct,
          ...state.products,
        ],
      }));
      
      // Log successful addition
      console.log('Product added successfully:', validProduct.id);
      return validProduct.id;
    } catch (error) {
      console.error('Error adding product to store:', error);
      throw new Error('Failed to add product to history');
    }
  },

  removeProduct: (id) =>
    set((state) => ({
      products: state.products.filter((product) => product.id !== id),
    })),

  toggleFavorite: (id) =>
    set((state) => ({
      products: state.products.map((product) =>
        product.id === id
          ? { ...product, isFavorite: !product.isFavorite }
          : product
      ),
    })),

  clearHistory: () => set({ products: [] }),
});