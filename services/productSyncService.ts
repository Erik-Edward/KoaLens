/**
 * ProductSyncService - Hanterar synkronisering av produkter mellan AsyncStorage och Supabase
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Product, WatchedIngredient } from '@/models/productModel';
import { STORAGE_KEYS } from './productRepository';
import { v4 as uuidv4 } from 'uuid';

// Supabase tabellnamn
const PRODUCTS_TABLE = 'products';

export class ProductSyncService {
  private static instance: ProductSyncService;

  static getInstance(): ProductSyncService {
    if (!ProductSyncService.instance) {
      ProductSyncService.instance = new ProductSyncService();
    }
    return ProductSyncService.instance;
  }

  constructor() {}

  /**
   * Kontrollera om produkttabellen existerar i Supabase
   */
  private async checkTableExists(): Promise<boolean> {
    try {
      // Utför en försiktig select för att se om tabellen finns
      const { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select('id')
        .limit(1);
      
      if (error) {
        // Kontrollera om felet indikerar att tabellen saknas
        if (error.code === '42P01' || error.message.includes("does not exist")) {
          console.log(`Tabellen '${PRODUCTS_TABLE}' existerar inte i Supabase`);
          return false;
        }
        
        // Annat fel
        console.error('Fel vid kontroll om tabell existerar:', error);
        return false;
      }
      
      // Om vi kom hit finns tabellen
      return true;
    } catch (error) {
      console.error('Fel vid kontroll om tabell existerar:', error);
      return false;
    }
  }

  /**
   * Validera att produkt-ID är i korrekt UUID-format
   */
  private validateProductId(productId: string): string {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    
    if (uuidRegex.test(productId)) {
      return productId;
    }
    
    // Om ID inte är ett giltigt UUID, generera ett nytt
    console.warn(`Ogiltigt produkt-ID format: ${productId}, genererar nytt UUID`);
    return uuidv4();
  }

  /**
   * Förbered produkt för Supabase genom att validera alla UUID
   */
  private prepareProductForSupabase(product: Product): Product {
    // Skapa en kopia för att inte ändra originalet
    const preparedProduct = {...product};
    
    // Validera produkt-ID
    preparedProduct.id = this.validateProductId(product.id);
    
    // Validera användar-ID om det finns
    if (product.metadata.userId) {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      
      if (!uuidRegex.test(product.metadata.userId)) {
        console.warn(`Ogiltigt användar-ID format: ${product.metadata.userId}, genererar nytt UUID`);
        preparedProduct.metadata = {
          ...product.metadata,
          userId: uuidv4()
        };
      }
    }
    
    return preparedProduct;
  }

  /**
   * Synkronisera en produkt till Supabase
   */
  async syncProductToSupabase(product: Product): Promise<boolean> {
    try {
      // Kontrollera om tabellen finns
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        console.log(`Kan inte synkronisera produkt - tabellen '${PRODUCTS_TABLE}' existerar inte`);
        return false;
      }
      
      console.log(`Synkroniserar produkt ${product.id} till Supabase...`);
      
      // Förbered produkt med validerade UUIDs
      const preparedProduct = this.prepareProductForSupabase(product);
      
      // Konvertera produktobjektet till ett format som passar Supabase-tabellen
      const supabaseProduct = {
        id: preparedProduct.id,
        user_id: preparedProduct.metadata.userId,  // Viktig: Använd userId från metadata som user_id kolumn
        timestamp: preparedProduct.timestamp,
        data: JSON.stringify(preparedProduct),
        analysis: preparedProduct.analysis || {},
        ingredients: preparedProduct.ingredients || [],
        metadata: preparedProduct.metadata || {},
        is_saved_to_history: preparedProduct.metadata.isSavedToHistory || false,
        is_favorite: preparedProduct.metadata.isFavorite || false,
        scan_date: preparedProduct.metadata.scanDate || preparedProduct.timestamp
      };
      
      console.log('Förberedd produkt för Supabase:', {
        id: supabaseProduct.id,
        user_id: supabaseProduct.user_id,
        is_saved: supabaseProduct.is_saved_to_history
      });
      
      // Upsert för att antingen skapa eller uppdatera
      const { error } = await supabase
        .from(PRODUCTS_TABLE)
        .upsert(supabaseProduct)
        .select();
      
      if (error) {
        console.error('Fel vid sparande av produkt till Supabase:', error);
        return false;
      }
      
      console.log(`Produkt ${preparedProduct.id} synkroniserades framgångsrikt till Supabase`);
      return true;
    } catch (error) {
      console.error('Fel vid sparande av produkt till Supabase:', error);
      return false;
    }
  }

  /**
   * Uppdatera en produkt i Supabase
   */
  async updateProductInSupabase(product: Product): Promise<boolean> {
    try {
      // Kontrollera om tabellen finns
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        console.log(`Kan inte uppdatera produkt - tabellen '${PRODUCTS_TABLE}' existerar inte`);
        return false;
      }
      
      console.log(`Uppdaterar produkt ${product.id} i Supabase...`);
      
      // Förbered produkt med validerade UUIDs
      const preparedProduct = this.prepareProductForSupabase(product);
      
      // Konvertera produktobjektet till ett format som passar Supabase-tabellen
      const supabaseProduct = {
        id: preparedProduct.id,
        user_id: preparedProduct.metadata.userId,
        timestamp: preparedProduct.timestamp,
        data: JSON.stringify(preparedProduct),
        analysis: preparedProduct.analysis || {},
        ingredients: preparedProduct.ingredients || [],
        metadata: preparedProduct.metadata || {},
        is_saved_to_history: preparedProduct.metadata.isSavedToHistory || false,
        is_favorite: preparedProduct.metadata.isFavorite || false,
        scan_date: preparedProduct.metadata.scanDate || preparedProduct.timestamp,
        last_synced: new Date().toISOString()
      };
      
      const { error } = await supabase
        .from(PRODUCTS_TABLE)
        .update(supabaseProduct)
        .eq('id', supabaseProduct.id);
      
      if (error) {
        console.error('Fel vid uppdatering av produkt i Supabase:', error);
        return false;
      }
      
      console.log(`Produkt ${preparedProduct.id} uppdaterades framgångsrikt i Supabase`);
      return true;
    } catch (error) {
      console.error('Fel vid uppdatering av produkt i Supabase:', error);
      return false;
    }
  }

  /**
   * Ta bort en produkt från Supabase
   */
  async deleteProductFromSupabase(productId: string): Promise<boolean> {
    try {
      // Kontrollera om tabellen finns
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        console.log(`Kan inte ta bort produkt - tabellen '${PRODUCTS_TABLE}' existerar inte`);
        return false;
      }
      
      console.log(`Tar bort produkt ${productId} från Supabase...`);
      
      // Validera produkt-ID
      const validProductId = this.validateProductId(productId);
      
      const { error } = await supabase
        .from(PRODUCTS_TABLE)
        .delete()
        .eq('id', validProductId);
      
      if (error) {
        console.error('Fel vid borttagning av produkt från Supabase:', error);
        return false;
      }
      
      console.log(`Produkt ${validProductId} togs bort framgångsrikt från Supabase`);
      return true;
    } catch (error) {
      console.error('Fel vid borttagning av produkt från Supabase:', error);
      return false;
    }
  }

  /**
   * Hämta alla produkter för en användare från Supabase
   */
  async getProductsFromSupabase(userId: string): Promise<Product[] | null> {
    try {
      // Kontrollera om tabellen finns
      const tableExists = await this.checkTableExists();
      if (!tableExists) {
        console.log(`Kan inte hämta produkter - tabellen '${PRODUCTS_TABLE}' existerar inte`);
        return null;
      }
      
      console.log(`Hämtar produkter för användare ${userId} från Supabase...`);
      
      // Validera användar-ID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(userId)) {
        console.warn(`Ogiltigt användar-ID format vid hämtning av produkter: ${userId}`);
        return null;
      }
      
      // VIKTIGT: Vi försöker först med user_id som är huvudkolumnen för användar-ID
      let { data, error } = await supabase
        .from(PRODUCTS_TABLE)
        .select('*')
        .eq('user_id', userId);
      
      // Om inga resultat hittades, försök med metadata->userId som fallback
      if ((!data || data.length === 0) && !error) {
        console.log('Inga produkter hittades med user_id, försöker med metadata->userId...');
        const response = await supabase
          .from(PRODUCTS_TABLE)
          .select('*')
          .eq('metadata->>userId', userId);
          
        data = response.data;
        error = response.error;
      }
      
      if (error) {
        console.error('Fel vid hämtning av produkter från Supabase:', error);
        return null;
      }
      
      if (!data || data.length === 0) {
        console.log('Inga produkter hittades i Supabase');
        return [];
      }
      
      console.log(`Hittade ${data.length} produkter i Supabase för användare ${userId}`);
      
      // Konvertera data till Product-objekt
      const products = data.map(item => {
        // Om produkten har analysen i 'data'-fältet (äldre struktur), flytta den
        if (item.data && !item.analysis) {
          item.analysis = item.data.analysis || {};
        }
        
        // Säkerställ att metadata innehåller användare-ID
        if (!item.metadata) {
          item.metadata = {};
        }
        
        if (!item.metadata.userId) {
          item.metadata.userId = userId;
        }
        
        return item as Product;
      });
      
      return products;
    } catch (error) {
      console.error('Fel vid hämtning av produkter från Supabase:', error);
      return null;
    }
  }

  /**
   * Synkronisera alla produkter till Supabase
   */
  async syncAllProductsToSupabase(): Promise<boolean> {
    // Denna metod implementeras i ProductRepository med hjälp av andra metoder
    // i denna klass, så vi behöver bara returnera true här
    return true;
  }
} 