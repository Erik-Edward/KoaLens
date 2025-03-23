/**
 * Product slice för den nya arkitekturen
 * Denna fil använder zustand slices för att hantera produkter
 */

import { StateCreator } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Product, NewProduct, convertFromLegacyProduct, convertToLegacyProduct } from '@/models/productModel';
import { StoreState, ScannedProduct, MixedProductArray } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { productsToScannedProducts, scannedProductsToProducts } from '../adapter';

// Konstant för AsyncStorage nyckel
const PRODUCTS_STORAGE_KEY = '@koalens:products';

// Define a compatible store type for our slice
// This matches the type in useStore.ts
type CompatibleStore = Omit<StoreState, 'products'> & {
  products: (Product | ScannedProduct)[];
};

// Interface för product slice
export interface ProductSlice {
  products: Product[];
  isProductsLoading: boolean;
  productsError: string | null;
  
  // Hämtningsfunktioner
  getProducts: () => Promise<Product[]>;
  getProductById: (id: string) => Promise<Product | null>;
  getProductsByUserId: (userId?: string) => Promise<Product[]>;
  
  // Mutationsfunktioner
  addProduct: (product: NewProduct) => Promise<Product>;
  updateProduct: (product: Product) => Promise<Product>;
  removeProduct: (id: string) => Promise<void>;
  toggleFavorite: (id: string) => Promise<void>;
  
  // Legacy-stöd
  importLegacyProducts: () => Promise<number>;
}

// Skapa product slice
export const createProductSlice: StateCreator<
  StoreState,
  [],
  [],
  ProductSlice
> = (set, get) => ({
  products: [],
  isProductsLoading: false,
  productsError: null,
  
  // Hämta alla produkter
  getProducts: async () => {
    try {
      // Use the compatible store type cast
      const compatibleStore = get() as unknown as CompatibleStore;
      
      // Filter products that have the required fields for Product type
      return compatibleStore.products.filter(p => 
        p && typeof p === 'object' && 
        'ingredients' in p && 
        'analysis' in p && 
        'metadata' in p
      ) as Product[];
    } catch (error) {
      console.error('Fel vid hämtning av produkter:', error);
      (set as any)({ productsError: 'Kunde inte hämta produkter' });
      return [];
    }
  },
  
  // Hämta produkt med ID
  getProductById: async (id: string) => {
    try {
      // Use the compatible store type cast
      const compatibleStore = get() as unknown as CompatibleStore;
      
      // Filter products that have the required fields for Product type
      const products = compatibleStore.products.filter(p => 
        p && typeof p === 'object' && 
        'ingredients' in p && 
        'analysis' in p && 
        'metadata' in p
      ) as Product[];
      
      return products.find(product => product.id === id) || null;
    } catch (error) {
      console.error(`Fel vid hämtning av produkt med ID ${id}:`, error);
      (set as any)({ productsError: `Kunde inte hämta produkt med ID ${id}` });
      return null;
    }
  },
  
  // Hämta produkter för specifik användare
  getProductsByUserId: async (userId?: string) => {
    try {
      // Use the compatible store type cast
      const compatibleStore = get() as unknown as CompatibleStore;
      
      // Filter products that have the required fields for Product type
      const products = compatibleStore.products.filter(p => 
        p && typeof p === 'object' && 
        'ingredients' in p && 
        'analysis' in p && 
        'metadata' in p
      ) as Product[];
      
      const effectiveUserId = userId || await get().getUserId();
      
      // Utvecklingsläge: Visa alla produkter om DEV_SHOW_ALL_PRODUCTS är true
      if (process.env.NODE_ENV === 'development' && (global as any).__DEV_SHOW_ALL_PRODUCTS) {
        return products;
      }
      
      // Filtrera på användar-ID
      if (effectiveUserId) {
        return products.filter(product => 
          product.metadata && product.metadata.userId === effectiveUserId
        );
      }
      
      return products;
    } catch (error) {
      console.error('Fel vid hämtning av produkter för användare:', error);
      (set as any)({ productsError: 'Kunde inte hämta produkter för användaren' });
      return [];
    }
  },
  
  // Lägg till en ny produkt
  addProduct: async (productData: NewProduct) => {
    try {
      (set as any)({ isProductsLoading: true });
      
      const product: Product = {
        ...productData,
        id: uuidv4(),
        timestamp: new Date().toISOString(),
        metadata: {
          ...productData.metadata,
          scanDate: productData.metadata?.scanDate || new Date().toISOString(),
        }
      };
      
      // Use the compatible store type cast for the update
      const compatibleStore = get() as unknown as CompatibleStore;
      (set as any)({ 
        products: [...compatibleStore.products, product] as MixedProductArray,
        isProductsLoading: false 
      });
      
      // Spara till AsyncStorage
      try {
        const existingData = await AsyncStorage.getItem(PRODUCTS_STORAGE_KEY);
        const existingProducts: Product[] = existingData ? JSON.parse(existingData) : [];
        const updatedProducts = [...existingProducts, product];
        await AsyncStorage.setItem(PRODUCTS_STORAGE_KEY, JSON.stringify(updatedProducts));
      } catch (storageError) {
        console.error('Fel vid lagring av produkt:', storageError);
      }
      
      return product;
    } catch (error) {
      console.error('Fel vid tillägg av produkt:', error);
      (set as any)({
        productsError: 'Kunde inte lägga till produkt',
        isProductsLoading: false
      });
      throw error;
    }
  },
  
  // Uppdatera existerande produkt
  updateProduct: async (updatedProduct: Product) => {
    try {
      // Verifiera att produkten existerar
      const existingProduct = await get().getProductById(updatedProduct.id);
      if (!existingProduct) {
        throw new Error(`Produkt med ID ${updatedProduct.id} hittades inte`);
      }
      
      // Uppdatera state
      const compatibleStore = get() as unknown as CompatibleStore;
      (set as any)({
        products: compatibleStore.products.map(product => 
          product.id === updatedProduct.id ? updatedProduct : product
        ) as MixedProductArray
      });
      
      return updatedProduct;
    } catch (error) {
      console.error(`Fel vid uppdatering av produkt med ID ${updatedProduct.id}:`, error);
      set({ productsError: `Kunde inte uppdatera produkt med ID ${updatedProduct.id}` });
      throw error;
    }
  },
  
  // Ta bort produkt
  removeProduct: async (id: string) => {
    try {
      // Verifiera att produkten existerar
      const existingProduct = await get().getProductById(id);
      if (!existingProduct) {
        throw new Error(`Produkt med ID ${id} hittades inte`);
      }
      
      // Uppdatera state
      const compatibleStore = get() as unknown as CompatibleStore;
      (set as any)({
        products: compatibleStore.products.filter(product => product.id !== id) as MixedProductArray
      });
    } catch (error) {
      console.error(`Fel vid borttagning av produkt med ID ${id}:`, error);
      set({ productsError: `Kunde inte ta bort produkt med ID ${id}` });
      throw error;
    }
  },
  
  // Växla favorit-status
  toggleFavorite: async (id: string) => {
    try {
      // Hämta produkten
      const product = await get().getProductById(id);
      if (!product) {
        throw new Error(`Produkt med ID ${id} hittades inte`);
      }
      
      // Skapa en uppdaterad version med motsatt favorit-status
      const updatedProduct: Product = {
        ...product,
        metadata: {
          ...product.metadata,
          isFavorite: !product.metadata.isFavorite
        }
      };
      
      // Använd updateProduct för att uppdatera state
      await get().updateProduct(updatedProduct);
    } catch (error) {
      console.error(`Fel vid växling av favorit-status för produkt med ID ${id}:`, error);
      set({ productsError: `Kunde inte växla favorit-status för produkt med ID ${id}` });
      throw error;
    }
  },
  
  // Importera produkter från gamla lagret
  importLegacyProducts: async () => {
    try {
      set({ isProductsLoading: true, productsError: null });
      
      // Hämta produkter från det gamla AsyncStorage-nyckeln
      const legacyStorageKey = 'koalens-storage';
      const jsonData = await AsyncStorage.getItem(legacyStorageKey);
      if (!jsonData) {
        console.log('Inga gamla produkter hittades att importera');
        set({ isProductsLoading: false });
        return 0;
      }
      
      // Försök parsa JSON-data
      const parsedData = JSON.parse(jsonData);
      if (!parsedData.state || !Array.isArray(parsedData.state.products)) {
        console.log('Ingen giltig produktdata hittades i det gamla lagret');
        set({ isProductsLoading: false });
        return 0;
      }
      
      // Konvertera gamla produkter till nya formatet
      const legacyProducts = parsedData.state.products;
      const convertedProducts: Product[] = [];
      
      for (const legacyProduct of legacyProducts) {
        try {
          const product = convertFromLegacyProduct(legacyProduct);
          convertedProducts.push(product);
        } catch (error) {
          console.error('Fel vid konvertering av produkt:', error);
          // Fortsätt med nästa produkt
        }
      }
      
      // Uppdatera state med de importerade produkterna
      if (convertedProducts.length > 0) {
        set(state => {
          // Filtrera bort dubletter baserat på ID
          const existingIds = new Set(state.products.map(p => p.id));
          const uniqueNewProducts = convertedProducts.filter(p => !existingIds.has(p.id));
          
          console.log(`Importerade ${uniqueNewProducts.length} unika gamla produkter`);
          
          return {
            products: [...state.products, ...uniqueNewProducts],
            isProductsLoading: false
          };
        });
        
        return convertedProducts.length;
      }
      
      set({ isProductsLoading: false });
      return 0;
    } catch (error) {
      console.error('Fel vid import av gamla produkter:', error);
      set({ productsError: 'Kunde inte importera gamla produkter', isProductsLoading: false });
      return 0;
    }
  }
}); 