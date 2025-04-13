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
  const saveToHistory = useCallback(async (productInput: Product | NewProduct) => {
    try {
      let productToSave: Product;
      console.log(`Sparar produkt till historik med ID/objekt: ${typeof productInput === 'string' ? productInput : (productInput as any).id || 'newProduct'}`);

      if ('id' in productInput && 'timestamp' in productInput) {
          const existingProduct = productInput as Product;
          console.log(`Använder befintligt Product-objekt ${existingProduct.id}`);
          productToSave = {
            ...existingProduct,
            metadata: {
              ...existingProduct.metadata,
              isSavedToHistory: true,
              userId: existingProduct.metadata.userId || effectiveUserId || undefined
            }
          };
          console.log(`Uppdaterar befintlig produkt ${productToSave.id} metadata för historik, användare ${productToSave.metadata.userId || 'ingen'}`);
      } else {
        const newProductData = productInput as NewProduct;
        const id = uuidv4();
        const timestamp = new Date().toISOString();
        console.log(`Skapar ny produkt med ID ${id} från NewProduct för historik`);
        let finalUserId = effectiveUserId || newProductData.metadata.userId;
        if (!finalUserId) {
            console.warn('Kunde inte fastställa användar-ID, sparar utan.');
            finalUserId = undefined;
        }
        productToSave = {
          id,
          timestamp,
          ingredients: newProductData.ingredients,
          analysis: newProductData.analysis,
          metadata: {
            ...newProductData.metadata,
            userId: finalUserId,
            isSavedToHistory: true,
            scanDate: newProductData.metadata.scanDate || timestamp
          }
        };
        console.log(`Förberedd ny produkt för historik: ID=${productToSave.id}, användar-ID=${productToSave.metadata.userId || 'ingen'}`);
      }

      console.log(`Sparar produkt ${productToSave.id} till repository`);
      await repository.updateProduct(productToSave);

      setProducts(prevProducts => {
        const exists = prevProducts.some(p => p.id === productToSave.id);
        if (exists) {
          console.log(`Produkt ${productToSave.id} fanns redan i listan, uppdaterar`);
          return prevProducts.map(p =>
            p.id === productToSave.id ? productToSave : p
          );
        } else {
          console.log(`Produkt ${productToSave.id} var ny, lägger till överst i listan`);
          return [productToSave, ...prevProducts];
        }
      });

      await loadProducts();

      return productToSave;
    } catch (error) {
      console.error('Fel vid sparande till historik:', error);
      setError(`Kunde inte spara produkten: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }, [repository, effectiveUserId, loadProducts, setProducts, setError]);
  
  // Växla favoritstatus
  const toggleFavorite = useCallback(async (productId: string) => {
    try {
      const product = await repository.getProductById(productId);
      if (!product) {
        throw new Error(`Produkt med ID ${productId} hittades inte`);
      }
      const updatedProduct = {
        ...product,
        metadata: {
          ...product.metadata,
          isFavorite: !product.metadata.isFavorite
        }
      };
      await repository.updateProduct(updatedProduct);
      setProducts(prev => prev.map(p => p.id === productId ? updatedProduct : p));
    } catch (error) {
      console.error(`Fel vid växling av favoritstatus för produkt ${productId}:`, error);
      throw error;
    }
  }, [repository, setProducts]);
  
  // Ta bort produkt
  const removeProduct = useCallback(async (productId: string) => {
    try {
      await repository.deleteProduct(productId);
      // Uppdatera lokala listan
      setProducts(prev => prev.filter(p => p.id !== productId));
    } catch (error) {
      console.error(`Fel vid borttagning av produkt ${productId}:`, error);
      // Kasta om felet
      throw error;
    }
  }, [repository, setProducts]);
  
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
  
  // Funktion för att skapa produkt från analys (används inte här längre?)
  const createProductFromAnalysis = useCallback(async (analysisData: any, imageUri: string) => {
    if (!effectiveUserId) {
        throw new Error("User ID not available to create product.");
    }
    
    const timestamp = new Date().toISOString();
    const product: Product = {
      id: uuidv4(),
      timestamp: timestamp,
      // This part needs attention: analysisData.allIngredients is string[] but Product expects IngredientListItem[]
      // For now, leave as is, but this will cause a type error if used.
      // A proper conversion would be needed similar to what's done in result.tsx
      ingredients: (analysisData.allIngredients || []).map((name: string) => ({ name, status: 'unknown', statusColor: '#607D8B' })), // Temporary conversion attempt
      analysis: {
        isVegan: analysisData.isVegan ?? null, // Handle null
        isUncertain: analysisData.isUncertain ?? (analysisData.isVegan === null), // Infer if null
        confidence: analysisData.confidence ?? 0.5,
        watchedIngredients: analysisData.watchedIngredients || [],
        reasoning: analysisData.reasoning,
        detectedLanguage: analysisData.detectedLanguage,
        uncertainReasons: analysisData.uncertainReasons,
      },
      metadata: {
        userId: effectiveUserId,
        scanDate: timestamp,
        isFavorite: false,
        isSavedToHistory: false, // Sparas inte automatiskt här
        source: 'analysis',
        imageUri: imageUri,
        name: analysisData.productName || 'Analyserad Produkt'
      }
    };
    
    return product;
  }, [effectiveUserId]);
  
  // Funktion för att kontrollera produktantal
  const checkProductCount = async () => {
    try {
      if (!effectiveUserId) {
        console.warn('checkProductCount: Användar-ID saknas.');
        return 0;
      }
      const count = await repository.getProductCountForUser(effectiveUserId);
      console.log(`Antal produkter för användare ${effectiveUserId}: ${count}`);
      return count;
    } catch (error) {
      console.error('Fel vid kontroll av produktantal:', error);
      return 0;
    }
  };

  return {
    products,
    loading,
    error,
    refreshing,
    refreshProducts,
    importLegacyProducts,
    getProductById,
    saveToHistory,
    toggleFavorite,
    removeProduct,
    createProductFromAnalysis,
    checkProductCount
  };
}; 