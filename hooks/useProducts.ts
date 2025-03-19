/**
 * Custom hook för att använda produktrepository i React-komponenter
 */

import { useState, useEffect, useCallback } from 'react';
import { ProductRepository } from '../services/productRepository';
import { Product, NewProduct } from '../models/productModel';
import { useStore } from '../stores/useStore';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';
import { getUserId } from '@/stores/adapter';

export const useProducts = (userId?: string) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Hämta användar-ID från store - OBS! först kollar vi auth.user.id, sedan userId-paramtern, sist userSlice
  const authUser = useStore(state => state.user);
  const storeUserId = useStore(state => state.userId);
  
  // Prioritera alltid auth.user.id för att säkerställa koppling till inloggad användare
  const effectiveUserId = authUser?.id || userId || storeUserId;
  
  useEffect(() => {
    if (effectiveUserId) {
      console.log(`useProducts: Använder användar-ID: ${effectiveUserId}, källa: ${authUser?.id ? 'auth' : userId ? 'parameter' : 'store'}`);
    } else {
      console.warn('useProducts: Inget användar-ID tillgängligt från någon källa (auth, parameter eller store)');
    }
  }, [effectiveUserId, authUser?.id, userId, storeUserId]);
  
  // Hämta repository-instans
  const repository = ProductRepository.getInstance();
  
  // Ladda produkter
  const loadProducts = useCallback(async () => {
    try {
      console.log('useProducts: Laddar produkter...');
      setLoading(true);
      setError(null);
      
      // Om inget användar-ID finns, visa inga produkter
      if (!effectiveUserId) {
        console.warn('useProducts: Användar-ID saknas, visar inga produkter');
        setProducts([]);
        setLoading(false);
        return;
      }
      
      console.log(`useProducts: Använder användar-ID: ${effectiveUserId}`);
      
      // Försök att synkronisera med Supabase först
      try {
        console.log(`useProducts: Börjar synkronisera produkter för användare ${effectiveUserId}`);
        await repository.syncProductsBidirectional(effectiveUserId);
        console.log('useProducts: Synkronisering slutförd');
      } catch (syncError) {
        console.warn('useProducts: Kunde inte synkronisera med Supabase:', syncError);
        // Fortsätt ändå, vi kan använda lokala produkter
      }
      
      // Hämta produkter från repository
      const userProducts = await repository.getProductsByUserId(effectiveUserId);
      console.log(`useProducts: ${userProducts.length} produkter hämtades för användare ${effectiveUserId}`);

      // Logga information om varje produkt för felsökning
      userProducts.forEach((p, index) => {
        console.log(`Produkt ${index + 1}: ID=${p.id}, UserId=${p.metadata.userId}, Sparad=${p.metadata.isSavedToHistory}, Favorit=${p.metadata.isFavorite}`);
      });
      
      // Filtrera produkter som är markerade som sparade i historiken
      const historyProducts = userProducts.filter(p => p.metadata.isSavedToHistory === true);
      console.log(`useProducts: ${historyProducts.length} av ${userProducts.length} produkter är markerade som sparade i historiken`);
      
      // Sortera efter scanDate (nyast först)
      historyProducts.sort((a, b) => {
        return new Date(b.metadata.scanDate || b.timestamp).getTime() - new Date(a.metadata.scanDate || a.timestamp).getTime();
      });
      
      setProducts(historyProducts);
    } catch (error) {
      console.error('useProducts: Fel vid hämtning av produkter:', error);
      setError(`Kunde inte hämta produkter: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setLoading(false);
    }
  }, [repository, effectiveUserId]);
  
  // Ladda produkter när hooken används eller användar-ID ändras
  useEffect(() => {
    loadProducts();
  }, [loadProducts, effectiveUserId]);
  
  // Funktion för att uppdatera produktlistan
  const refreshProducts = useCallback(async () => {
    try {
      console.log('useProducts: Uppdaterar produkter...');
      setRefreshing(true);
      await loadProducts();
    } finally {
      setRefreshing(false);
    }
  }, [loadProducts]);
  
  // Importera legacy-produkter
  const importLegacyProducts = useCallback(async () => {
    try {
      setLoading(true);
      const count = await repository.importLegacyProducts();
      console.log(`useProducts: Importerade ${count} legacy-produkter`);
      await loadProducts();
      return count;
    } catch (error) {
      console.error('useProducts: Fel vid import av legacy-produkter:', error);
      setError('Kunde inte importera gamla produkter');
      return 0;
    } finally {
      setLoading(false);
    }
  }, [repository, loadProducts]);
  
  // Funktion för att hämta en specifik produkt
  const getProductById = useCallback(async (id: string) => {
    try {
      // Rensa bort eventuellt -new suffix från ID
      const cleanId = id.toString().replace('-new', '');
      console.log(`useProducts: Försöker hämta produkt med ID: ${cleanId}`);
      
      // Försök först från repository
      const product = await repository.getProductById(cleanId);
      
      if (product) {
        console.log(`useProducts: Hittade produkt med ID ${cleanId} i repository`);
        return product;
      }
      
      console.warn(`useProducts: Produkt med ID ${cleanId} hittades inte i repository`);
      
      // Om produkten inte hittas, försök hämta alla produkter och leta igenom dem
      // Detta är en fallback om produkt-ID har ändrats eller om det finns någon annan diskrepans
      const allProducts = await repository.getAllProducts();
      console.log(`useProducts: Letar igenom ${allProducts.length} produkter efter ID ${cleanId}`);
      
      const foundProduct = allProducts.find(p => p.id === cleanId);
      if (foundProduct) {
        console.log(`useProducts: Hittade produkt med ID ${cleanId} i alla produkter`);
        return foundProduct;
      }
      
      // Om vi kommer hit hittades inget
      console.error(`useProducts: Kunde inte hitta produkt med ID ${cleanId} i någon lagring`);
      return null;
    } catch (error) {
      console.error(`useProducts: Fel vid hämtning av produkt med ID ${id}:`, error);
      return null;
    }
  }, [repository]);
  
  // Spara produkt till historik
  const saveToHistory = useCallback(async (product: string | NewProduct) => {
    try {
      let productToSave: Product;
      console.log(`Sparar produkt till historik med ID/objekt: ${typeof product === 'string' ? product : 'newProduct'}`);
      
      if (typeof product === 'string') {
        // Om produkten är ett ID, hämta den först
        console.log(`Hämtar befintlig produkt med ID ${product} för att spara till historik`);
        const existingProduct = await repository.getProductById(product);
        if (!existingProduct) {
          const errorMsg = `Produkt med ID ${product} kunde inte hittas`;
          console.error(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Uppdatera metadata för att markera som sparad
        productToSave = {
          ...existingProduct,
          metadata: {
            ...existingProduct.metadata,
            isSavedToHistory: true,
            // Behåll befintligt userId om det finns, annars använd effectiveUserId
            userId: existingProduct.metadata.userId || effectiveUserId || undefined
          }
        };
        console.log(`Markerar befintlig produkt ${productToSave.id} som sparad i historik med användare ${productToSave.metadata.userId || 'ingen'}`);
      } else {
        // Om produkten är ett objekt, konvertera det till en full produkt
        const id = (product as any).id || uuidv4();
        const timestamp = new Date().toISOString();
        
        console.log(`Skapar ny produkt med ID ${id} för historik`);
        
        // Säkerställ att vi har userId
        let userId = effectiveUserId || product.metadata.userId;
        
        // Om inget användar-ID finns, hämta det från getUserId() funktionen
        if (!userId) {
          try {
            userId = await getUserId();
            console.log(`Användar-ID hämtades: ${userId}`);
          } catch (error) {
            console.warn('Kunde inte hämta användar-ID, genererar nytt:', error);
            userId = uuidv4();
          }
        }
        
        productToSave = {
          id,
          timestamp, 
          ingredients: product.ingredients || [],
          analysis: product.analysis,
          metadata: {
            ...product.metadata,
            userId, // Typerna matchar nu ProductMetadata.userId?: string
            isSavedToHistory: true,
            scanDate: product.metadata.scanDate || timestamp
          }
        };
        console.log(`Förberedd produkt för historik: ID=${productToSave.id}, användar-ID=${productToSave.metadata.userId || 'ingen'}, isSavedToHistory=${productToSave.metadata.isSavedToHistory}`);
      }
      
      // Spara produkten
      console.log(`Sparar produkt ${productToSave.id} till repository`);
      await repository.updateProduct(productToSave);
      
      // Uppdatera lokal lista
      setProducts(prevProducts => {
        // Kolla om produkten redan finns i listan
        const exists = prevProducts.some(p => p.id === productToSave.id);
        if (exists) {
          console.log(`Produkt ${productToSave.id} fanns redan i listan, uppdaterar`);
          // Uppdatera existerande produkt
          return prevProducts.map(p => 
            p.id === productToSave.id ? productToSave : p
          );
        } else {
          console.log(`Produkt ${productToSave.id} var ny, lägger till överst i listan`);
          // Lägg till ny produkt
          return [productToSave, ...prevProducts];
        }
      });
      
      // Ladda om alla produkter för att säkerställa att vi ser den senaste listan
      await loadProducts();
      
      return productToSave;
    } catch (error) {
      console.error('Fel vid sparande till historik:', error);
      setError('Kunde inte spara produkten till historik');
      throw error;
    }
  }, [repository, effectiveUserId, loadProducts]);
  
  // Funktion för att växla favorit-status
  const toggleFavorite = useCallback(async (productId: string) => {
    try {
      const success = await repository.toggleFavorite(productId);
      if (success) {
        // Uppdatera lokal produktlista utan att behöva hämta allt på nytt
        setProducts(prevProducts => 
          prevProducts.map(product => 
            product.id === productId
              ? {
                  ...product,
                  metadata: {
                    ...product.metadata,
                    isFavorite: !product.metadata.isFavorite
                  }
                }
              : product
          )
        );
      }
      return success;
    } catch (error) {
      console.error('Fel vid ändring av favorit-status:', error);
      return false;
    }
  }, [repository]);
  
  // Funktion för att ta bort en produkt
  const removeProduct = useCallback(async (productId: string) => {
    try {
      const success = await repository.deleteProduct(productId);
      if (success) {
        // Uppdatera lokal produktlista
        setProducts(prevProducts => 
          prevProducts.filter(product => product.id !== productId)
        );
      }
      return success;
    } catch (error) {
      console.error('Fel vid borttagning av produkt:', error);
      return false;
    }
  }, [repository]);
  
  // Funktion för att få senaste produkten
  const getLatestProduct = useCallback(async () => {
    try {
      const latestProductJson = await AsyncStorage.getItem('koalens_latest_product');
      if (!latestProductJson) return null;
      
      return JSON.parse(latestProductJson) as Product;
    } catch (error) {
      console.error('Fel vid hämtning av senaste produkt:', error);
      return null;
    }
  }, []);
  
  // Funktion för att skapa en ny produkt direkt från analysdata
  const createProductFromAnalysis = useCallback(async (analysisData: any, imageUri: string) => {
    try {
      if (!effectiveUserId) {
        throw new Error('Användar-ID saknas, kan inte skapa produkt');
      }
      
      const newProduct: NewProduct = {
        ingredients: [], // Tom ingredienslista om ingen tillgänglig
        analysis: analysisData,
        metadata: {
          userId: effectiveUserId,
          isFavorite: false,
          isSavedToHistory: true,
          scanDate: new Date().toISOString(),
          imageUri, // Lägg till imageUri i metadata istället 
          source: 'New Analysis'
        }
      };
      
      const createdProduct = await repository.createProduct(newProduct);
      
      // Uppdatera lokal lista utan full refresh
      setProducts(prevProducts => [createdProduct, ...prevProducts]);
      
      // Försök synkronisera med Supabase
      try {
        console.log('Synkroniserar ny produkt med Supabase...');
        await repository.syncProductsToSupabase();
      } catch (syncError) {
        console.warn('Kunde inte synkronisera ny produkt med Supabase:', syncError);
        // Fortsätt ändå, produkten är sparad lokalt
      }
      
      return createdProduct;
    } catch (error) {
      console.error('Fel vid skapande av produkt från analys:', error);
      setError('Kunde inte spara analysresultat');
      throw error;
    }
  }, [repository, effectiveUserId]);
  
  // Lyssna på AsyncStorage-ändringar för realtidsuppdateringar
  useEffect(() => {
    // Vi kan inte lyssna direkt på AsyncStorage, så vi använder ett intervall
    const checkInterval = setInterval(() => {
      if (effectiveUserId) {
        // Kolla antalet produkter i AsyncStorage för denna användare
        const checkProductCount = async () => {
          try {
            const userProductsKey = `koalens_user_products_${effectiveUserId}`;
            const productsJson = await AsyncStorage.getItem(userProductsKey);
            
            if (productsJson) {
              const storedProducts = JSON.parse(productsJson);
              if (Array.isArray(storedProducts) && storedProducts.length !== products.length) {
                // Antalet produkter har ändrats, uppdatera listan
                console.log(`useProducts: Produktantal har ändrats (${products.length} -> ${storedProducts.length}), uppdaterar`);
                await loadProducts();
              }
            }
          } catch (error) {
            console.error('useProducts: Fel vid kontroll av produktantal:', error);
          }
        };
        
        checkProductCount();
      }
    }, 2000); // Kontrollera var 2:a sekund
    
    return () => {
      clearInterval(checkInterval);
    };
  }, [effectiveUserId, loadProducts, products.length]);
  
  return {
    products,
    loading,
    error,
    refreshing,
    refreshProducts,
    getProductById,
    saveToHistory,
    toggleFavorite,
    removeProduct,
    importLegacyProducts,
    getLatestProduct,
    createProductFromAnalysis
  };
}; 