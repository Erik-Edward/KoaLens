import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../models/productModel';

// Nyckel för lagring av produkter i AsyncStorage
const PRODUCT_STORAGE_KEY = '@koalens:products';

/**
 * Service för att hantera lagring och hämtning av produkter
 */
export class StorageService {
  // Sparar en ny produkt
  saveProduct = async (product: Product): Promise<void> => {
    try {
      // Säkerställ att vi har ett giltigt userId
      if (!product.metadata?.userId) {
        console.warn('Produkt saknar userId, genererar tillfälligt ID');
        if (!product.metadata) {
          product.metadata = { 
            userId: uuidv4(),
            scanDate: new Date().toISOString(),
            isFavorite: false,
            isSavedToHistory: true
          };
        } else {
          product.metadata.userId = uuidv4();
        }
      } else {
        // Kontrollera att userId är ett giltigt UUID
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(product.metadata.userId)) {
          console.warn('Produkt har ett ogiltigt userId-format, ersätter med UUID');
          product.metadata.userId = uuidv4();
        }
      }

      // Vi behöver alltid ha en array att arbeta med
      let products = await this.getProducts(product.metadata.userId);
      if (!products) {
        products = [];
      }

      // Lägg till produkten och spara
      products.push(product);
      await AsyncStorage.setItem(
        `${PRODUCT_STORAGE_KEY}_${product.metadata.userId}`,
        JSON.stringify(products)
      );
      console.log('Produkt sparad framgångsrikt');
    } catch (error) {
      console.error('Fel vid sparande av produkt:', error);
      throw error;
    }
  };

  // Hämtar alla produkter för en användare
  getProducts = async (userId?: string): Promise<Product[]> => {
    try {
      if (!userId) {
        console.warn('useProducts: Inget användar-ID tillgängligt', new Error().stack);
        return [];
      }

      const data = await AsyncStorage.getItem(`${PRODUCT_STORAGE_KEY}_${userId}`);
      if (data) {
        return JSON.parse(data);
      }
      return [];
    } catch (error) {
      console.error('Fel vid hämtning av produkter:', error);
      return [];
    }
  };
}

// Exportera en singleton-instans av StorageService
export const storageService = new StorageService(); 