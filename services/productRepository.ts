/**
 * Produkt-repository för att hantera CRUD-operationer för produkter
 * Detta abstraherar bort datalagring från resten av applikationen
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { Product, NewProduct, convertFromLegacyProduct, WatchedIngredient, IngredientListItem } from '../models/productModel';
import { ProductSyncService } from './productSyncService';
import { getUserId } from '@/stores/adapter';

// Konstanter för AsyncStorage-nycklar
export const STORAGE_KEYS = {
  PRODUCTS: 'koalens_products',
  LATEST_PRODUCT: 'koalens_latest_product',
  USER_PRODUCTS_PREFIX: 'koalens_user_products_'
};

export class ProductRepository {
  private static instance: ProductRepository;
  private syncService: ProductSyncService;
  
  // Använd singletonstmönster för att säkerställa en enda instans
  static getInstance(): ProductRepository {
    if (!ProductRepository.instance) {
      ProductRepository.instance = new ProductRepository();
    }
    return ProductRepository.instance;
  }

  constructor() {
    this.syncService = ProductSyncService.getInstance();
  }
  
  // Skapa en ny produkt
  async createProduct(newProduct: NewProduct): Promise<Product> {
    const nowTimestamp = new Date().toISOString();
    // Säkerställ ett korrekt UUID-format för produkten
    const productId = uuidv4();
    console.log(`Generating UUID for new product: ${productId}`);
    
    // Säkerställ att användar-ID är ett giltigt UUID
    let userId = newProduct.metadata.userId;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (!userId || !uuidRegex.test(userId)) {
      console.warn(`Ogiltigt användar-ID format för produkt (${userId}), genererar nytt ID`);
      userId = uuidv4();
      console.log(`Genererat nytt användar-ID: ${userId}`);
    }
    
    // Product is now created with IngredientListItem[] from NewProduct
    const product: Product = {
      ...newProduct,
      id: productId,
      timestamp: nowTimestamp,
      metadata: {
        ...newProduct.metadata,
        userId: userId, // Använd det validerade användar-ID
        isFavorite: newProduct.metadata.isFavorite || false,
        isSavedToHistory: newProduct.metadata.isSavedToHistory || false,
        scanDate: newProduct.metadata.scanDate || nowTimestamp
      }
    };
    
    try {
      console.log(`Skapar ny produkt med ID ${product.id} för användare ${product.metadata.userId}`);
      
      // Hämta alla produkter
      const products = await this.getAllProducts();
      
      // Lägg till den nya produkten först i listan
      const updatedProducts = [product, ...products];
      
      // Spara uppdaterad lista
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      
      // Spara senaste produkt separat för enkel åtkomst
      await AsyncStorage.setItem(STORAGE_KEYS.LATEST_PRODUCT, JSON.stringify(product));
      
      // Om användar-ID finns, spara även i användarspecifik lista
      if (product.metadata.userId) {
        await this.addToUserProducts(product);
      }
      
      // Försök synkronisera till Supabase
      this.syncService.syncProductToSupabase(product).catch(err => {
        console.warn("Kunde inte synkronisera ny produkt med Supabase:", err);
      });
      
      return product;
    } catch (error) {
      console.error('Fel vid skapande av produkt:', error);
      throw new Error('Kunde inte skapa produkt');
    }
  }
  
  // Hämta alla produkter
  async getAllProducts(): Promise<Product[]> {
    try {
      console.log(`Hämtar alla produkter från AsyncStorage via ${STORAGE_KEYS.PRODUCTS}`);
      const json = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      
      if (!json) {
        console.log('Inga produkter hittades i AsyncStorage');
        return [];
      }
      
      const products = JSON.parse(json);
      
      if (!Array.isArray(products)) {
        console.warn('Produkt-data är inte en array som förväntat, återställer');
        return [];
      }
      
      console.log(`Hittade ${products.length} produkter i AsyncStorage`);
      
      // Fix: Ensure legacy products are converted and type is consistent
      const convertedProducts = products.map(p => 
          ('analysis' in p && 'metadata' in p) ? p as Product : convertFromLegacyProduct(p)
      );
      
      // Gå igenom de första 5 produkterna för debugging
      convertedProducts.slice(0, 5).forEach((product: Product, i: number) => {
        console.log(`Produkt ${i+1}/${convertedProducts.length}: ID=${product.id}, UserId=${product.metadata?.userId || 'saknas'}, Sparad=${product.metadata?.isSavedToHistory === true ? 'Ja' : 'Nej'}`);
      });
      
      return convertedProducts;
    } catch (error) {
      console.error('Fel vid hämtning av alla produkter:', error);
      return [];
    }
  }
  
  // Hämta produkt med specifikt ID
  async getProductById(id: string): Promise<Product | null> {
    try {
      // Först kolla om det är den senaste produkten för snabbare åtkomst
      const latestProductJson = await AsyncStorage.getItem(STORAGE_KEYS.LATEST_PRODUCT);
      if (latestProductJson) {
        const latestProductData = JSON.parse(latestProductJson);
        // Convert if necessary
        const latestProduct = ('analysis' in latestProductData && 'metadata' in latestProductData) 
            ? latestProductData as Product 
            : convertFromLegacyProduct(latestProductData);
        if (latestProduct && latestProduct.id === id) {
          return latestProduct;
        }
      }
      
      // Annars sök igenom alla produkter
      const products = await this.getAllProducts();
      return products.find(product => product.id === id) || null;
    } catch (error) {
      console.error('Fel vid hämtning av produkt med ID:', id, error);
      return null;
    }
  }
  
  // Hämta produkter för specifik användare
  async getProductsByUserId(userId: string): Promise<Product[]> {
    try {
      console.log(`Hämtar produkter för användare ${userId}...`);
      
      // Validera att vi har ett giltigt userId
      if (!userId) {
        console.warn('Inget användar-ID angett för produktfiltrering');
        return [];
      }
      
      // Försök hämta från användarspecifik cache först
      const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
      const userProductsJson = await AsyncStorage.getItem(userProductsKey);
      
      if (userProductsJson) {
        try {
          const parsedProducts = JSON.parse(userProductsJson);
          if (Array.isArray(parsedProducts) && parsedProducts.length > 0) {
            console.log(`Hittade ${parsedProducts.length} produkter från cache för användare ${userId}`);
            // Logga några produktdetaljer för debugging
            parsedProducts.slice(0, 3).forEach((p, i) => {
              console.log(`Cache-produkt ${i+1}/${parsedProducts.length}: ID=${p.id}, Sparad=${p.metadata.isSavedToHistory === true ? 'Ja' : 'Nej'}`);
            });
            // Convert legacy products if found in user cache
            const convertedProducts = parsedProducts.map(p => 
                ('analysis' in p && 'metadata' in p) ? p as Product : convertFromLegacyProduct(p)
            );
            return convertedProducts;
          }
          console.log(`Användarspecifik cache fanns men var tom för ${userId}`);
        } catch (parseError) {
          console.error(`Fel vid parsning av användarspecifik cache för ${userId}:`, parseError);
        }
      } else {
        console.log(`Ingen användarspecifik cache hittades för ${userId}`);
      }
      
      // Om vi kommer hit fanns ingen giltig cache, hämta från huvudlagring
      console.log(`Hämtar produkter för ${userId} från huvudlagring...`);
      const allProducts = await this.getAllProducts();
      console.log(`Hittade totalt ${allProducts.length} produkter i huvudlagring`);
      
      // Logga alla userId som finns i produkterna för debugging
      const uniqueUserIds = new Set<string>();
      allProducts.forEach(p => {
        if (p.metadata && p.metadata.userId) {
          uniqueUserIds.add(p.metadata.userId);
        }
      });
      console.log(`Unika användar-ID i produktlagring: [${Array.from(uniqueUserIds).join(', ')}]`);
      
      // Filtrera på användar-ID - bara exakt matchning
      const userProducts = allProducts.filter(product => 
        product.metadata && 
        product.metadata.userId && 
        product.metadata.userId === userId
      );
      
      console.log(`Hittade ${userProducts.length} produkter för användare ${userId} från alla produkter`);
      
      if (userProducts.length === 0) {
        console.log(`Inga produkter hittades för användare ${userId}`);
        
        // Extra kontroll: Leta efter produkter som saknar användar-ID eller har ogiltigt ID
        const productsWithMissingId = allProducts.filter(p => !p.metadata?.userId);
        const productsWithInvalidId = allProducts.filter(p => 
          p.metadata?.userId && p.metadata.userId !== userId && p.metadata.isSavedToHistory
        );
        
        if (productsWithMissingId.length > 0) {
          console.log(`${productsWithMissingId.length} produkter saknar användar-ID`);
        }
        
        if (productsWithInvalidId.length > 0) {
          console.log(`${productsWithInvalidId.length} sparade produkter har annat användar-ID än ${userId}`);
        }
      } else {
        userProducts.slice(0, 3).forEach((product, i) => {
          console.log(`Användarprodukt ${i+1}/${userProducts.length}: ID=${product.id}, Sparad=${product.metadata.isSavedToHistory === true ? 'Ja' : 'Nej'}`);
        });
        
        // Kontrollera om det finns produkter som är markerade som sparade i historiken
        const savedProducts = userProducts.filter(p => p.metadata.isSavedToHistory === true);
        console.log(`${savedProducts.length} av ${userProducts.length} produkter är markerade som sparade i historiken`);
      }
      
      // Spara för framtida snabb åtkomst, även om listan är tom
      console.log(`Uppdaterar användarspecifik cache för ${userId} med ${userProducts.length} produkter`);
      await AsyncStorage.setItem(userProductsKey, JSON.stringify(userProducts));
      
      return userProducts;
    } catch (error) {
      console.error('Fel vid hämtning av produkter för användare:', error);
      return [];
    }
  }
  
  // Uppdatera en produkt
  async updateProduct(updatedProduct: Product): Promise<Product> {
    try {
      console.log(`Uppdaterar produkt med ID ${updatedProduct.id}`);
      
      // Logga produkt för debugging
      console.log(`Produktdetaljer: isSavedToHistory=${updatedProduct.metadata.isSavedToHistory}, userId=${updatedProduct.metadata.userId}`);
      
      // Uppdatera produkttidsstämpel
      updatedProduct.timestamp = new Date().toISOString();
      
      // Säkerställ att vi har giltigt användar-ID om det är en produkt som ska sparas
      if (updatedProduct.metadata.isSavedToHistory && !updatedProduct.metadata.userId) {
        const userId = await getUserId();
        console.log(`Saknar användar-ID för produkt som sparas, tilldelar ${userId || 'nytt UUID'}`);
        updatedProduct.metadata.userId = userId || uuidv4();
      }
      
      // Hämta alla produkter för att kunna uppdatera
      const productsJson = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
      const products = productsJson ? JSON.parse(productsJson) : [];
      
      // Kontrollera om produkten redan finns
      const productIndex = products.findIndex((p: Product) => p.id === updatedProduct.id);
      
      if (productIndex !== -1) {
        console.log(`Produkt med ID ${updatedProduct.id} hittades i huvudlista, uppdaterar...`);
        // Uppdatera befintlig produkt
        products[productIndex] = updatedProduct;
      } else {
        console.log(`Produkt med ID ${updatedProduct.id} lades till i huvudlista`);
        // Lägg till den nya produkten först i listan
        products.unshift(updatedProduct);
      }
      
      // Spara hela listan
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
      console.log(`Alla produkter sparade till ${STORAGE_KEYS.PRODUCTS}, antal: ${products.length}`);
      
      // Om produkten har ett användar-ID, uppdatera även användarens produkter
      if (updatedProduct.metadata.userId) {
        console.log(`Uppdaterar användarens produktlista för ${updatedProduct.metadata.userId}`);
        await this.updateUserProducts(updatedProduct);
      }
      
      // Om det är den senaste produkten, spara den också separat
      await AsyncStorage.setItem(STORAGE_KEYS.LATEST_PRODUCT, JSON.stringify(updatedProduct));
      console.log(`Senaste produkt sparad till ${STORAGE_KEYS.LATEST_PRODUCT}`);
      
      // Försök synkronisera till Supabase
      if (updatedProduct.metadata.isSavedToHistory) {
        try {
          console.log(`Synkroniserar sparad produkt ${updatedProduct.id} till Supabase...`);
          await this.syncService.syncProductToSupabase(updatedProduct);
        } catch (syncError) {
          console.warn(`Kunde inte synkronisera produkt ${updatedProduct.id} med Supabase:`, syncError);
          // Fortsätt ändå, produkten är sparad lokalt
        }
      }
      
      return updatedProduct;
    } catch (error) {
      console.error('Fel vid uppdatering av produkt:', error);
      throw new Error('Kunde inte uppdatera produkt');
    }
  }
  
  // Ta bort en produkt
  async deleteProduct(id: string): Promise<boolean> {
    try {
      const products = await this.getAllProducts();
      const productToDelete = products.find(product => product.id === id);
      
      if (!productToDelete) return false;
      
      const updatedProducts = products.filter(product => product.id !== id);
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      
      // Ta bort från användarspecifik lista om användar-ID finns
      if (productToDelete.metadata.userId) {
        await this.removeFromUserProducts(productToDelete);
      }
      
      // Försök ta bort från Supabase
      this.syncService.deleteProductFromSupabase(id).catch(err => {
        console.warn("Kunde inte ta bort produkt från Supabase:", err);
      });
      
      return true;
    } catch (error) {
      console.error('Fel vid borttagning av produkt:', error);
      return false;
    }
  }
  
  // Importera gamla produkter från legacy-format
  async importLegacyProducts(): Promise<number> {
    let importedCount = 0;
    try {
      const keys = await AsyncStorage.getAllKeys();
      const legacyProductKeys = keys.filter(key => key.startsWith('product_') && !key.startsWith(STORAGE_KEYS.USER_PRODUCTS_PREFIX));
      
      if (legacyProductKeys.length === 0) {
        console.log('Inga legacy produktnycklar hittades för import.');
        return 0;
      }

      const legacyData = await AsyncStorage.multiGet(legacyProductKeys);
      const currentProducts = await this.getAllProducts(); // Get current Product[]
      const currentProductIds = new Set(currentProducts.map(p => p.id));
      const productsToSave: Product[] = [...currentProducts];

      legacyData.forEach(([key, value]) => {
        if (value) {
          try {
            const legacyProductData = JSON.parse(value);
            // Ensure it looks like a legacy product and not already imported
            if (legacyProductData && legacyProductData.id && !currentProductIds.has(legacyProductData.id) && !legacyProductData.analysis) {
              console.log(`Konverterar legacy produkt ${legacyProductData.id}`);
              const convertedProduct = convertFromLegacyProduct(legacyProductData);
              if (convertedProduct) {
                 productsToSave.push(convertedProduct);
                 currentProductIds.add(convertedProduct.id); // Add to set to avoid duplicates in this run
                 importedCount++;
              }
            }
          } catch (e) {
            console.warn(`Kunde inte parsea eller konvertera legacy produkt från ${key}:`, e);
          }
        }
      });

      if (importedCount > 0) {
        console.log(`Sparar ${importedCount} nya konverterade produkter...`);
        // Save the combined list (overwrite existing products with the updated list)
        await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(productsToSave));
        // Update user-specific caches if necessary (complex, might need re-filtering)
        console.warn('User-specific caches may need updating after legacy import.');
      }

    } catch (error) {
      console.error('Fel vid import av legacy produkter:', error);
    }
    return importedCount;
  }
  
  // Spara en produkt i historik (markera som sparad)
  async saveToHistory(productId: string): Promise<boolean> {
    try {
      const product = await this.getProductById(productId);
      if (!product) return false;
      
      // Om produkten redan är sparad i historik, gör ingenting
      if (product.metadata.isSavedToHistory) return true;
      
      // Uppdatera produkten
      const updatedProduct: Product = {
        ...product,
        metadata: {
          ...product.metadata,
          isSavedToHistory: true
        }
      };
      
      await this.updateProduct(updatedProduct);
      
      // Synkronisera till Supabase (updateProduct gör redan detta)
      
      return true;
    } catch (error) {
      console.error('Fel vid sparande av produkt till historik:', error);
      return false;
    }
  }
  
  // Växla favorit-status för en produkt
  async toggleFavorite(productId: string): Promise<boolean> {
    try {
      const product = await this.getProductById(productId);
      if (!product) return false;
      
      // Uppdatera favorit-status
      const updatedProduct: Product = {
        ...product,
        metadata: {
          ...product.metadata,
          isFavorite: !product.metadata.isFavorite
        }
      };
      
      await this.updateProduct(updatedProduct);
      
      // Synkronisera till Supabase (updateProduct gör redan detta)
      
      return true;
    } catch (error) {
      console.error('Fel vid växling av favorit-status:', error);
      return false;
    }
  }
  
  // Private helper methods
  
  // Lägg till produkt i användarspecifik lista
  async addToUserProducts(product: Product): Promise<void> {
    try {
      const userId = product.metadata.userId;
      if (!userId) {
        console.warn('Försöker lägga till produkt utan användar-ID');
        return;
      }
      
      const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
      
      // Hämta användarens produkter
      const productsJson = await AsyncStorage.getItem(userProductsKey);
      let userProducts: Product[] = [];
      
      if (productsJson) {
        try {
          userProducts = JSON.parse(productsJson);
          if (!Array.isArray(userProducts)) userProducts = [];
        } catch (e) {
          console.error('Fel vid parsning av användarens produkter:', e);
          userProducts = [];
        }
      }
      
      // Kontrollera om produkten redan finns
      const existingIndex = userProducts.findIndex(p => p.id === product.id);
      
      if (existingIndex >= 0) {
        // Uppdatera existerande produkt
        userProducts[existingIndex] = product;
      } else {
        // Lägg till ny produkt
        userProducts.unshift(product); // Lägg till först i listan
      }
      
      // Spara den uppdaterade listan
      await AsyncStorage.setItem(userProductsKey, JSON.stringify(userProducts));
      console.log(`Produkt ${product.id} sparad för användare ${userId}`);
    } catch (error) {
      console.error('Fel vid sparande av produkt till användare:', error);
      throw new Error('Kunde inte spara produkt för användaren');
    }
  }
  
  // Lägg till flera produkter i användarspecifik lista
  private async addMultipleToUserProducts(userId: string, products: Product[]): Promise<void> {
    if (!userId || products.length === 0) return;
    
    const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
    
    try {
      // Hämta nuvarande lista
      const userProductsJson = await AsyncStorage.getItem(userProductsKey);
      let userProducts: Product[] = [];
      
      if (userProductsJson) {
        userProducts = JSON.parse(userProductsJson);
        if (!Array.isArray(userProducts)) userProducts = [];
      }
      
      // Skapa en map för snabb kontroll av befintliga produkter
      const existingProducts = new Map<string, number>();
      userProducts.forEach((p, index) => existingProducts.set(p.id, index));
      
      // Lägg till eller uppdatera produkter
      for (const product of products) {
        if (existingProducts.has(product.id)) {
          // Uppdatera existerande produkt
          const index = existingProducts.get(product.id)!;
          userProducts[index] = product;
        } else {
          // Lägg till ny produkt
          userProducts.push(product);
        }
      }
      
      // Sortera efter timestamp (nyaste först)
      userProducts.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      // Spara uppdaterad lista
      await AsyncStorage.setItem(userProductsKey, JSON.stringify(userProducts));
      console.log(`Sparade ${products.length} produkter för användare ${userId}`);
    } catch (error) {
      console.error('Fel vid tillägg av flera produkter till användarspecifik lista:', error);
    }
  }
  
  // Uppdatera produkt i användarspecifik lista
  private async updateUserProducts(product: Product): Promise<void> {
    const userId = product.metadata.userId;
    if (!userId) {
      console.warn(`Produkt ${product.id} saknar användar-ID, kan inte uppdatera i användarspecifik lista`);
      return;
    }
    
    const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
    
    try {
      // Hämta nuvarande lista
      const userProductsJson = await AsyncStorage.getItem(userProductsKey);
      
      if (!userProductsJson) {
        // Om listan inte finns, skapa en ny lista med bara denna produkt
        console.log(`Ingen existerande produktlista för användare ${userId}, skapar ny med produkt ${product.id}`);
        await AsyncStorage.setItem(userProductsKey, JSON.stringify([product]));
        return;
      }
      
      let userProducts: Product[] = JSON.parse(userProductsJson);
      if (!Array.isArray(userProducts)) {
        console.warn(`Ogiltig användarproduktlista för ${userId}, ersätter med ny lista`);
        userProducts = [];
      }
      
      // Kolla om produkten redan finns i användarens lista
      const productIndex = userProducts.findIndex(p => p.id === product.id);
      
      if (productIndex >= 0) {
        // Uppdatera existerande produkt
        console.log(`Uppdaterar produkt ${product.id} i användarens lista`);
        userProducts[productIndex] = product;
      } else {
        // Lägg till produkt om den inte finns
        console.log(`Produkt ${product.id} saknas i användarens lista, lägger till`);
        userProducts.unshift(product); // Lägg till först i listan
      }
      
      // Spara uppdaterad lista
      await AsyncStorage.setItem(userProductsKey, JSON.stringify(userProducts));
      console.log(`Sparade ${userProducts.length} produkter för användare ${userId}, inklusive ${product.id}`);
      
      // Kontrollera att produkten verkligen finns i listan
      const updatedJson = await AsyncStorage.getItem(userProductsKey);
      if (updatedJson) {
        const updatedList = JSON.parse(updatedJson);
        if (Array.isArray(updatedList)) {
          const exists = updatedList.some(p => p.id === product.id);
          console.log(`Verifiering: produkt ${product.id} ${exists ? 'finns' : 'saknas'} i användarens produktlista (${updatedList.length} produkter)`);
        }
      }
    } catch (error) {
      console.error(`Fel vid uppdatering av användarspecifik lista för ${userId}:`, error);
    }
  }
  
  // Ta bort produkt från användarspecifik lista
  private async removeFromUserProducts(product: Product): Promise<void> {
    try {
      // Om användar-ID saknas, kan vi inte ta bort från användarspecifik lista
      if (!product.metadata.userId) return;
      
      const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${product.metadata.userId}`;
      const userProductsJson = await AsyncStorage.getItem(userProductsKey);
      
      if (!userProductsJson) return;
      
      const userProducts = JSON.parse(userProductsJson);
      if (!Array.isArray(userProducts)) return;
      
      // Filtrera bort produkten och spara tillbaka till AsyncStorage
      const updatedUserProducts = userProducts.filter(p => p.id !== product.id);
      await AsyncStorage.setItem(userProductsKey, JSON.stringify(updatedUserProducts));
      
      console.log(`Tog bort produkt ${product.id} från användarspecifik lista för ${product.metadata.userId}`);
    } catch (error) {
      console.error('Fel vid borttagning av produkt från användarspecifik lista:', error);
    }
  }
  
  /**
   * Synkronisera alla lokala produkter till Supabase
   */
  async syncProductsToSupabase(): Promise<boolean> {
    try {
      console.log('Synkroniserar alla produkter till Supabase...');
      return await this.syncService.syncAllProductsToSupabase();
    } catch (error) {
      console.error('Fel vid synkronisering av alla produkter till Supabase:', error);
      return false;
    }
  }
  
  /**
   * Hämta produkter från Supabase för en specifik användare
   */
  async fetchProductsFromSupabase(userId: string): Promise<boolean> {
    try {
      console.log(`Hämtar produkter från Supabase för användare ${userId}...`);
      
      // Validera användar-ID
      if (!userId) {
        console.warn('fetchProductsFromSupabase: Inget användar-ID angett');
        return false;
      }
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn(`fetchProductsFromSupabase: Ogiltigt användar-ID format: ${userId}`);
        return false;
      }
      
      // Hämta produkter från Supabase
      const supabaseProducts = await this.syncService.getProductsFromSupabase(userId);
      if (!supabaseProducts || supabaseProducts.length === 0) {
        console.log('Inga produkter hittades i Supabase');
        return false;
      }
      
      console.log(`Hittade ${supabaseProducts.length} produkter i Supabase`);
      
      // Normalisera produkterna för att säkerställa att de har korrekt format
      const normalizedProducts = supabaseProducts.map(product => {
        // Säkerställ att metadata-objektet existerar med alla nödvändiga egenskaper
        if (!product.metadata) {
          product.metadata = {
            userId: userId,
            scanDate: product.timestamp || new Date().toISOString(),
            isFavorite: false,
            isSavedToHistory: true
          };
        } else {
          // Uppdatera metadata om det redan finns
          product.metadata = {
            ...product.metadata,
            userId: product.metadata.userId || userId,
            scanDate: product.metadata.scanDate || product.timestamp || new Date().toISOString(),
            isFavorite: product.metadata.isFavorite || false,
            isSavedToHistory: true
          };
        }
        
        // Säkerställ att analysis-objektet existerar med alla nödvändiga egenskaper
        if (!product.analysis) {
          product.analysis = {
            isVegan: true, // Standard-antagande
            isUncertain: false, // Default to false when analysis is missing
            confidence: 1.0,
            watchedIngredients: [],
            reasoning: "Importerad från Supabase utan analys"
          };
        } else {
          // Uppdatera analysis om det redan finns
          product.analysis = {
            ...product.analysis,
            // Ensure isUncertain is present if updating existing analysis
            isUncertain: product.analysis.isUncertain !== undefined ? product.analysis.isUncertain : false,
            isVegan: product.analysis.isVegan !== undefined ? product.analysis.isVegan : true,
            confidence: product.analysis.confidence || 1.0,
            watchedIngredients: product.analysis.watchedIngredients || [],
            reasoning: product.analysis.reasoning || "Importerad från Supabase"
          };
        }
        
        // Säkerställ att ingredients finns
        if (!product.ingredients || !Array.isArray(product.ingredients)) {
          product.ingredients = [];
        }
        
        return product;
      });
      
      // Hämta alla lokala produkter
      const localProducts = await this.getAllProducts();
      const localProductIds = new Set(localProducts.map(p => p.id));
      
      // Filtrera bort produkter som redan finns lokalt
      const newProducts = normalizedProducts.filter(p => !localProductIds.has(p.id));
      
      if (newProducts.length === 0) {
        console.log('Alla Supabase-produkter finns redan lokalt');
        return true;
      }
      
      console.log(`Lägger till ${newProducts.length} nya produkter från Supabase`);
      
      // Spara alla nya produkter lokalt
      const updatedProducts = [...newProducts, ...localProducts];
      await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(updatedProducts));
      
      // Uppdatera användarspecifik lista
      await this.addMultipleToUserProducts(userId, newProducts);
      
      return true;
    } catch (error) {
      console.error('Fel vid hämtning av produkter från Supabase:', error);
      return false;
    }
  }
  
  /**
   * Synkronisera produkter i båda riktningar - uppdatera både lokalt och i Supabase
   */
  async syncProductsBidirectional(userId: string): Promise<boolean> {
    if (!userId) {
      console.warn('syncProductsBidirectional: Inget användar-ID angivet, kan inte synkronisera');
      return false;
    }
    
    console.log(`Utför tvåvägssynkronisering med Supabase för användare ${userId}...`);
    
    try {
      // Försök hämta produkter från Supabase först
      let fromSupabaseSuccess = false;
      try {
        fromSupabaseSuccess = await this.fetchProductsFromSupabase(userId);
        if (fromSupabaseSuccess) {
          console.log('Produkter framgångsrikt hämtade från Supabase');
        } else {
          console.log('Inga produkter hämtades från Supabase, eller operationen misslyckades');
        }
      } catch (fromError) {
        console.error('Fel vid hämtning från Supabase:', fromError);
        // Fortsätt med synkronisering till Supabase även om hämtning misslyckades
      }
      
      // Sedan skicka lokala produkter till Supabase
      let toSupabaseSuccess = false;
      try {
        toSupabaseSuccess = await this.syncProductsToSupabase();
        if (toSupabaseSuccess) {
          console.log('Produkter framgångsrikt synkroniserade till Supabase');
        } else {
          console.log('Ingen synkronisering till Supabase utfördes, eller operationen misslyckades');
        }
      } catch (toError) {
        console.error('Fel vid synkronisering till Supabase:', toError);
      }
      
      // Slutligen, uppdatera användarens produktcache för att säkerställa korrekt listan
      let userProductsUpdated = false;
      try {
        const allProducts = await this.getAllProducts();
        const userProducts = allProducts.filter(p => 
          p.metadata?.userId === userId && p.metadata?.isSavedToHistory === true
        );
        
        if (userProducts.length > 0) {
          console.log(`Uppdaterar användarens produktcache med ${userProducts.length} produkter`);
          const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
          await AsyncStorage.setItem(userProductsKey, JSON.stringify(userProducts));
          userProductsUpdated = true;
        }
      } catch (cacheError) {
        console.error('Fel vid uppdatering av användarens produktcache:', cacheError);
      }
      
      return fromSupabaseSuccess || toSupabaseSuccess || userProductsUpdated;
    } catch (error) {
      console.error('Fel vid tvåvägs-synkronisering av produkter:', error);
      return false;
    }
  }

  /**
   * Skapar demoexempel av produkter för teständamål
   * 
   * @param userId Användar-ID som produkterna ska associeras med
   * @param count Antal produkter att skapa
   * @returns Antal produkter som skapades
   */
  async createDemoProducts(userId: string, count: number = 5): Promise<number> {
    console.log(`Skapar ${count} demoprodukter för användare ${userId}`);
    
    try {
      const products: Product[] = [];
      const now = new Date();
      
      // Generera ett antal testprodukter
      for (let i = 0; i < count; i++) {
        const isVegan = Math.random() > 0.3; // 70% chans att vara vegansk
        const isUncertain = !isVegan && Math.random() > 0.5;
        const actualIsVegan = isUncertain ? null : isVegan;
        const id = `demo-${now.getTime()}-${i}`;
        
        // Gemensamma ingredienser
        const commonIngredients = [
          'Vatten',
          'Socker',
          'Salt',
          'Mjöl',
          'Jäst',
          'Vegetabiliskt fett',
          'Majsstärkelse',
          'Äpple',
          'Apelsinjuice',
          'Kakao',
        ];
        
        // Potentiellt icke-veganska ingredienser
        const nonVeganIngredients = ['Mjölk', 'Ägg', 'Honung', 'Gelatin', 'Vassle'];
        
        // Slumpa fram ingredienser
        const productIngredients = [...commonIngredients];
        
        // För icke-veganska produkter, lägg till en eller två icke-veganska ingredienser
        const watchedIngredients: WatchedIngredient[] = [];
        
        if (!isVegan) {
          // Lägg till 1-2 icke-veganska ingredienser
          const nonVeganCount = Math.floor(Math.random() * 2) + 1;
          for (let j = 0; j < nonVeganCount; j++) {
            const randIndex = Math.floor(Math.random() * nonVeganIngredients.length);
            const ingredient = nonVeganIngredients[randIndex];
            productIngredients.push(ingredient);
            
            watchedIngredients.push({
              name: ingredient,
              description: 'Icke-vegansk ingrediens',
              reason: 'non-vegan',
              status: 'non-vegan' as const
            });
          }
        } else if (isUncertain) {
          const uncertain = { 
            name: 'Arom', 
            description: 'Osäkert ursprung', 
            reason: 'uncertain-source', 
            status: 'uncertain' as const
          };
          watchedIngredients.push(uncertain);
        }
        
        // Skapa timestamp för denna produkt
        const timestamp = new Date(now.getTime() - i * 3600000).toISOString();
        
        // Skapa produkten
        const product: Product = {
          id,
          timestamp,
          ingredients: productIngredients.map(name => {
            const watchedItem = watchedIngredients.find(w => w.name === name);
            let status: IngredientListItem['status'] = 'vegan';
            if (watchedItem) {
              status = watchedItem.status;
            }
            return {
              name,
              status,
              statusColor: STATUS_COLORS[status] || STATUS_COLORS.unknown,
            };
          }),
          analysis: {
            isVegan: actualIsVegan,
            isUncertain: isUncertain,
            confidence: 0.7 + Math.random() * 0.3, // 70-100% konfidensgrad
            watchedIngredients,
            reasoning: actualIsVegan 
              ? 'Produkten innehåller inga icke-veganska ingredienser.'
              : isUncertain ? 'Osäker status' : 'Innehåller icke-veganska ämnen.'
          },
          metadata: {
            userId,
            scanDate: timestamp, // Använd samma tidsstämpel
            isFavorite: Math.random() > 0.7, // 30% chans att vara favorit
            isSavedToHistory: true,
            source: 'Demo',
            imageUri: `https://picsum.photos/seed/${id}/400/400`,
            name: `Demoprodukt ${i + 1}`
          }
        };
        
        products.push(product);
      }
      
      // Spara alla produkter
      for (const product of products) {
        await this.createProduct(product as NewProduct);
      }
      
      console.log(`Skapade ${products.length} demoprodukter`);
      return products.length;
    } catch (error) {
      console.error('Fel vid skapande av demoprodukter:', error);
      throw error;
    }
  }

  /**
   * Rensar alla produkter för en specifik användare från AsyncStorage
   * Anropas vid utloggning
   */
  async clearUserProducts(userId: string): Promise<boolean> {
    try {
      if (!userId) {
        console.warn('Inget användar-ID angett för rensning av produkter');
        return false;
      }
      
      console.log(`Rensar produkter för användare ${userId}...`);
      
      // Ta bort användarens produktcache
      const userProductsKey = `${STORAGE_KEYS.USER_PRODUCTS_PREFIX}${userId}`;
      await AsyncStorage.removeItem(userProductsKey);
      
      // Vi behåller produkterna i huvudlagringen men rensar användarens cache
      console.log(`Produkter för användare ${userId} rensade`);
      return true;
    } catch (error) {
      console.error('Fel vid rensning av användarprodukter:', error);
      return false;
    }
  }

  /**
   * Räknar antalet produkter för en specifik användare
   */
  async getProductCountForUser(userId: string): Promise<number> {
    try {
      const products = await this.getProductsByUserId(userId);
      return products.length;
    } catch (error) {
      console.error(`Fel vid räkning av produkter för användare ${userId}:`, error);
      return 0; // Return 0 in case of error
    }
  }
}

// Add STATUS_COLORS constant if needed by demo product generation
const STATUS_COLORS: Record<IngredientListItem['status'], string> = {
  vegan: '#4CAF50',
  'non-vegan': '#F44336',
  uncertain: '#FF9800',
  unknown: '#607D8B',
}; 