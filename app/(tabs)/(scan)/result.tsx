/**
 * Resultatskärm för KoaLens
 * Visar analys av produktingredienser med fokus på säker textrendering och tydlig status
 */

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  Alert as RNAlert,
  StyleSheet,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  TouchableOpacity
} from 'react-native';
import { styled } from 'nativewind';
import { router, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useProducts } from '../../../hooks/useProducts';
import { useCounter } from '../../../hooks/useCounter';
import { Product, ProductAnalysis, WatchedIngredient, IngredientListItem } from '../../../models/productModel';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getUserId } from '@/stores/adapter';
import { AnalysisService } from '@/services/analysisService';
import { v4 as uuidv4 } from 'uuid';
import { ProductRepository } from '@/services/productRepository';
import { logScreenView, logEvent } from '@/lib/analyticsWrapper';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Video, ResizeMode } from 'expo-av';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
import { Alert } from '@/utils/alertUtils';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledImage = styled(Image);
const StyledTextInput = styled(TextInput);
const StyledTouchableOpacity = styled(TouchableOpacity);

// Styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa', // Ljusare bakgrund för bättre kontrast
  },
  card: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20, // Mer rundad
    alignSelf: 'flex-start',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  iconButton: {
    marginLeft: 16,
  },
  uncertaintyContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#FFF8E1', // Ljusgul bakgrund
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FFA000', // Mörkare orange kant
  },
  uncertaintyTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 6,
    color: '#FFA000',
  },
  uncertaintyReason: {
    flexDirection: 'row',
    alignItems: 'flex-start', // För bättre textbrytning
    marginVertical: 4,
  },
  uncertaintyText: {
    fontSize: 14,
    marginLeft: 8,
    color: '#555',
    flex: 1,
    lineHeight: 20,
  },
  reasoningContainer: {
    marginTop: 8,
  },
  reasoning: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  // Stilar för Watched Ingredients (ersätter nonVeganContainer etc.)
  watchedIngredientsContainer: {
    marginTop: 16, // Addera marginal ovanför
    padding: 12,
    backgroundColor: '#fff', // Neutral bakgrund
    borderRadius: 8,
    // borderLeftWidth: 4, // Ta bort kant för mindre rörighet
    // borderLeftColor: '#d32f2f',
  },
  watchedIngredientsTitle: {
    fontSize: 16, // Något större titel
    fontWeight: 'bold',
    marginBottom: 10, // Mer utrymme under titeln
    color: '#333', // Mörkare färg
    // textTransform: 'uppercase', // VERSALER för tydlighet
    // letterSpacing: 0.5,
  },
  watchedIngredientSectionTitle: {
      fontWeight: 'bold',
      marginTop: 8,
      marginBottom: 4,
      fontSize: 14,
  },
  watchedIngredientItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8, // Mer luft
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  watchedIngredientIcon: {
    marginRight: 10,
  },
  watchedIngredientTextContainer: {
    flex: 1,
  },
  watchedIngredientName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  watchedIngredientDescription: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
    fontStyle: 'italic',
  },
  // Generella stilar för kort, t.ex. ingredienskortet
  ingredientsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8, // Mindre marginal uppåt om Watched finns
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ingredientsTitle: {
    fontSize: 18, // Större titel för ingredienslistan
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  // Stilar för IngredientListItem i huvudlistan
  ingredientRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10, // Mer luft per rad
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  ingredientStatusIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 12,
  },
  ingredientName: {
    fontSize: 15,
    flex: 1, // Tar upp tillgängligt utrymme
  },
  ingredientReportButton: {
    marginLeft: 10,
    padding: 5,
  },
  // Stilar för Modal (behålls som de är)
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '85%',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  modalInput: { width: '100%', height: 100, borderColor: '#ccc', borderWidth: 1, borderRadius: 5, padding: 10, marginBottom: 20, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', justifyContent: 'space-between', width: '100%' },
  modalButton: { backgroundColor: '#007AFF', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 5, flex: 1, marginHorizontal: 5, alignItems: 'center' },
  modalButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  modalCancelButton: { backgroundColor: '#ccc' },
  // Mockdata banner (behålls)
  mockDataBanner: { backgroundColor: '#FF9800', padding: 10, borderRadius: 5, marginTop: 10, marginBottom: 10, alignItems: 'center' },
  mockDataText: { color: 'white', fontWeight: 'bold' },
});

/**
 * SafeText-komponent för att säkert rendera text
 * Garanterar att alla värden renderas inom Text-komponenter
 */
function SafeText({
  value,
  fallback = "",
  style = {},
  numberOfLines
}: {
  value: any,
  fallback?: string,
  style?: any,
  numberOfLines?: number
}) {
  let displayText = fallback;

  try {
    if (value === null || value === undefined) {
      displayText = fallback;
    } else if (typeof value === "string") {
      displayText = value;
    } else if (typeof value === "number" || typeof value === "boolean") {
      displayText = String(value);
    } else if (Array.isArray(value) || typeof value === "object") {
      // Försök ge en meningsfull representation av objekt/arrayer för loggning
      displayText = JSON.stringify(value, null, 2); // Indenterad för läsbarhet
    } else {
      displayText = String(value);
    }
  } catch (e) {
    // Om JSON.stringify misslyckas för komplexa objekt
    displayText = `[Error displaying value: ${e instanceof Error ? e.message : String(e)}]`;
  }

  return (
    <StyledText style={style} numberOfLines={numberOfLines} selectable={true}>
      {displayText}
    </StyledText>
  );
}

// Funktion för att parse JSON säkert
function safeJsonParse(jsonString: string | undefined, fallback: any = null) {
  if (!jsonString) return fallback;

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    console.error('Kunde inte tolka JSON:', error, jsonString);
    return fallback;
  }
}

// Konstant för färger - Justerad osäker färg för bättre distinktion
const STATUS_COLORS: Record<IngredientListItem['status'], string> = {
  vegan: '#1B5E20', // Mörkare grön
  'non-vegan': '#C62828', // Mörkare röd
  uncertain: '#B57E00', // Mörk senap/guld för bättre distinktion från röd
  unknown: '#455A64', // Mörkare gråblå
};

/**
 * Uppdaterad IngredientsList komponent
 * Hanterar lista med IngredientListItem, visar status med färgindikator,
 * och inkluderar rapporteringsfunktionalitet.
 */
function IngredientsList({
  ingredients, // Nu IngredientListItem[]
  onReportIngredient // Funktion för att rapportera en ingrediens
}: {
  ingredients: IngredientListItem[],
  onReportIngredient?: (ingredientName: string) => void
}) {

  useEffect(() => {
    // Logga endast en gång vid montering eller när ingredients ändras
    console.log('[DEBUG] IngredientsList props (Updated):', {
      ingredientsCount: ingredients?.length || 0,
      // Logga bara de första 5 för att undvika för stora loggar
      ingredientsPreview: ingredients?.slice(0, 5),
    });
  }, [ingredients]);

  // Funktion för att ta bort duplicerade ingredienser (baserat på namn, case-insensitive)
  const deduplicateIngredients = (ingredientList: IngredientListItem[]): IngredientListItem[] => {
    if (!Array.isArray(ingredientList)) return []; // Säkerhetskontroll
    const normalizedSet = new Set<string>();
    const result: IngredientListItem[] = [];

    for (const item of ingredientList) {
       // Säkerställ att item och item.name finns
       if (item && typeof item.name === 'string') {
           const normalized = item.name.toLowerCase().trim();
           if (!normalizedSet.has(normalized)) {
               normalizedSet.add(normalized);
               result.push(item);
           }
       } else {
           console.warn('[Deduplicate] Ogiltigt ingrediensobjekt hittat:', item);
       }
    }
    return result;
  };

  // Använd useMemo för att bara deduplicera när ingredients ändras
  const uniqueIngredients = useMemo(() => deduplicateIngredients(ingredients || []), [ingredients]);

  if (!uniqueIngredients || uniqueIngredients.length === 0) {
    return <SafeText value="Inga ingredienser kunde identifieras." style={styles.reasoning} />;
  }

  return (
    <StyledView>
      {uniqueIngredients.map((item, index) => {
        // Hämta färg baserat på status från vår uppdaterade STATUS_COLORS
        const statusColor = STATUS_COLORS[item.status] || STATUS_COLORS.unknown;
        return (
          <StyledView key={`${item.name}-${index}`} style={styles.ingredientRow}>
            {/* Statusindikator (färgad prick) - Använder nu statusColor variabeln */}
            <StyledView
              style={[
                styles.ingredientStatusIndicator,
                { backgroundColor: statusColor }, // Använd den bestämda statusColor
              ]}
            />
            {/* Ingrediensnamn - Använder nu statusColor variabeln */}
            <StyledText
              style={[styles.ingredientName, { color: statusColor }]} // Använd den bestämda statusColor
              selectable={true}
            >
              {item.name}
            </StyledText>
            {/* Rapporteringsknapp - Changed icon and color */}
            {onReportIngredient && (
              <StyledPressable
                style={styles.ingredientReportButton}
                onPress={() => onReportIngredient(item.name)}
                hitSlop={10}
              >
                {/* Changed to flag icon and neutral grey color */}
                <Ionicons name="flag-outline" size={20} color="#666666" /> 
              </StyledPressable>
            )}
          </StyledView>
        );
      })}
    </StyledView>
  );
}

/**
 * WatchedIngredientsDisplay komponent
 * Visar ingredienser flaggade av backend (non-vegan/uncertain/watched)
 * Indikerar nu om de är spårämnen baserat på reason-fältet.
 */
function WatchedIngredientsDisplay({ watchedIngredients }: { watchedIngredients: WatchedIngredient[] }) {
  // Ta bort intern filtrering - komponenten visar nu allt som skickas in.
  // const nonVegan = (watchedIngredients || []).filter(i => i.status === 'non-vegan');
  // const uncertain = (watchedIngredients || []).filter(i => i.status === 'uncertain');

  // Ta bort logik baserad på overallStatus och intern filtrering
  // const shouldRenderNonVegan = overallStatus === false && nonVegan.length > 0;
  // const shouldRenderUncertain = overallStatus === null && uncertain.length > 0;

  // Rendera bara om det faktiskt finns ingredienser att visa
  if (!watchedIngredients || watchedIngredients.length === 0) {
    return null;
  }

  // Uppdaterad renderIngredient för att hantera spårämnen och använda neutral färg
  const renderIngredient = (ingredient: WatchedIngredient) => {
    // Ikon baseras på status
    const isNonVegan = ingredient.status === 'non-vegan';
    const isUncertain = ingredient.status === 'uncertain';
    // Använd informationsikon för 'unknown' (troligen spårämne matchat av user config)
    const iconName = isNonVegan ? 'close-circle' : (isUncertain ? 'help-circle' : 'information-circle-outline'); 
    
    const notedColor = '#007AFF'; // Konsekvent blå färg

    // Kontrollera om reason indikerar spårämne
    const isTrace = ingredient.reason?.includes("(spårämne)") ?? false;
    const displayName = isTrace ? `${ingredient.name} (spårämne)` : ingredient.name;
    const nameStyle = isTrace ? { fontStyle: 'italic' } : {};

    return (
      <StyledView key={`${ingredient.name}-${ingredient.status}-${isTrace}`} style={[styles.watchedIngredientItem, { paddingLeft: 5 }]}>
        <Ionicons name={iconName} size={20} color={notedColor} style={styles.watchedIngredientIcon} />
        <StyledView style={styles.watchedIngredientTextContainer}>
          <SafeText 
            value={displayName} 
            style={[styles.watchedIngredientName, { color: notedColor }, nameStyle]} 
          />
        </StyledView>
      </StyledView>
    );
  };

  return (
    <StyledView style={styles.ingredientsCard}>
      <SafeText value={"Noterade ingredienser"} style={styles.watchedIngredientsTitle} />
      {/* Förklarande text - Kortare och enklare */}
       <StyledText style={[styles.watchedIngredientDescription, {marginBottom: 8}]}>
         Här visas ingredienser som matchar din bevakningslista, inklusive de från "kan innehålla"-varningar (märkta med "spårämne").
       </StyledText>
      
      {watchedIngredients.map(renderIngredient)}
    </StyledView>
  );
}

/**
 * TraceIngredientsList komponent
 * Visar en enkel lista över ingredienser som identifierats 
 * från "kan innehålla spår av"-varningar.
 */
function TraceIngredientsList({ traceIngredients }: { traceIngredients: string[] }) {
  if (!traceIngredients || traceIngredients.length === 0) {
    return null; // Rendera inget om listan är tom
  }

  return (
    <StyledView style={styles.ingredientsCard} className="mt-1 mb-2"> {/* Lite mindre marginal */}
      <SafeText value={"Kan innehålla spår av"} style={styles.ingredientsTitle} />
      <StyledText style={[styles.watchedIngredientDescription, {marginBottom: 8}]}>
        Följande ämnen nämndes i "kan innehålla"-varningar på produkten:
      </StyledText>
      {traceIngredients.map((name, index) => (
        <StyledView key={`${name}-${index}`} style={[styles.watchedIngredientItem, { borderBottomWidth: index === traceIngredients.length - 1 ? 0 : 1 }]}>
           {/* Använd en neutral ikon eller ingen alls */}
          <Ionicons name="information-circle-outline" size={20} color="#888" style={styles.watchedIngredientIcon} />
          <StyledView style={styles.watchedIngredientTextContainer}>
            <SafeText value={name} style={[styles.watchedIngredientName, { color: '#555', fontWeight: 'normal' }]} />
          </StyledView>
        </StyledView>
      ))}
    </StyledView>
  );
}

export default function ResultScreen() {
  const params = useLocalSearchParams<{
    productAnalysis?: string;
    ingredientList?: string;
    productId?: string;
    mediaUri?: string;
    isMock?: string;
  }>();
  const router = useRouter();
  const { saveToHistory, getProductById } = useProducts();
  const { incrementCounter } = useCounter();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const videoRef = useRef<Video>(null);
  const [showVideo, setShowVideo] = useState(false);

  // State for reporting ingredients
  const [isReportModalVisible, setReportModalVisible] = useState(false);
  const [ingredientToReport, setIngredientToReport] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // State for Save Modal
  const [isSaveModalVisible, setSaveModalVisible] = useState(false);
  const [saveName, setSaveName] = useState('');

  // State for Color Legend Expansion
  const [isLegendExpanded, setIsLegendExpanded] = useState(false);

  // --- Get user preferences for watched ingredients --- 
  const userPreferences = useStore(useShallow(state => state.preferences));
  
  const activeWatchedConfigs = useMemo(() => {
    if (!userPreferences?.watchedIngredients) return [];
    return Object.values(userPreferences.watchedIngredients)
                 .filter(details => details.enabled && details.keywords && details.keywords.length > 0);
  }, [userPreferences]);

  // *** NY useMemo hook för att filtrera baserat på ANVÄNDARENS inställningar ***
  const userWatchedDisplayItems = useMemo((): WatchedIngredient[] => {
    if (!product || !activeWatchedConfigs || activeWatchedConfigs.length === 0) {
      return [];
    }

    const filteredItems: WatchedIngredient[] = [];
    const addedNames = new Set<string>(); // För deduplicering

    // 1. Kolla backend-flaggade ingredienser (watchedIngredients)
    if (Array.isArray(product.analysis.watchedIngredients)) {
      product.analysis.watchedIngredients.forEach(item => {
        if (!item || !item.name) return;
        const lowerCaseItemName = item.name.toLowerCase().trim();
        
        const isUserWatching = activeWatchedConfigs.some(config => 
          config.keywords.some(keyword => lowerCaseItemName.includes(keyword.toLowerCase()))
        );

        if (isUserWatching && !addedNames.has(item.name)) {
          filteredItems.push(item); // Inkludera hela objektet från backend
          addedNames.add(item.name);
        }
      });
    }

    // 2. Kolla rena spårämnen (traceIngredients) som inte redan lagts till
    if (Array.isArray(product.analysis.traceIngredients)) {
      product.analysis.traceIngredients.forEach(traceName => {
        if (typeof traceName !== 'string' || traceName.trim() === '' || addedNames.has(traceName)) return; 
        const lowerCaseTraceName = traceName.toLowerCase().trim();

        const isUserWatching = activeWatchedConfigs.some(config => 
          config.keywords.some(keyword => lowerCaseTraceName.includes(keyword.toLowerCase()))
        );

        if (isUserWatching) {
          // Skapa ett nytt objekt för detta spårämne
          filteredItems.push({
            name: traceName,
            status: 'unknown', // Vi har ingen backend-status här, märk som unknown
            reason: '(spårämne)', // Markera som spårämne
            // description: 'Matchar din bevakningslista (från "kan innehålla")' // Valfri beskrivning
          });
          addedNames.add(traceName);
        }
      });
    }
    
     // 3. Kolla deklarerade ingredienser (product.ingredients) som inte redan lagts till
     // Detta behövs om användaren bevakar en normalt 'vegan' ingrediens som inte flaggades av backend.
     if (Array.isArray(product.ingredients)) {
        product.ingredients.forEach(item => {
          if (!item || !item.name || addedNames.has(item.name)) return;
          const lowerCaseItemName = item.name.toLowerCase().trim();

          const isUserWatching = activeWatchedConfigs.some(config => 
             config.keywords.some(keyword => lowerCaseItemName.includes(keyword.toLowerCase()))
          );

          if (isUserWatching) {
             filteredItems.push({
                 name: item.name,
                 status: item.status, // Använd status från huvudlistan
                 reason: 'Matchar din bevakningslista',
                 // description: item.description // Valfritt
             });
             addedNames.add(item.name);
          }
        });
     }

    console.log("[DEBUG] User Watched Display Items (Filtered):", JSON.stringify(filteredItems));
    return filteredItems;
  }, [product, activeWatchedConfigs]);

  const analysisService = useMemo(() => new AnalysisService(), []);
  const productRepository = useMemo(() => new ProductRepository(), []);
  const [isMockData, setIsMockData] = useState(false);

  useEffect(() => {
    logScreenView('ResultScreen');
    initialize();
  }, []);

  const initialize = async () => {
    setLoading(true);
    setError(null);
    try {
      const id = await getUserId();
      setUserId(id);

      // Check if we received full analysis data or just an ID
      if (params.productAnalysis) {
        // Case 1: Navigated from Scan/Video with full data
        console.log('[Initialize] Received full productAnalysis from params');
        const analysisContainer = safeJsonParse(params.productAnalysis);
        let backendResult: any = null;
        if (analysisContainer && analysisContainer.result) {
          backendResult = analysisContainer.result;
        } else if (analysisContainer && (analysisContainer.isVegan !== undefined || analysisContainer.status !== undefined)) {
          backendResult = analysisContainer;
        } else {
          throw new Error('Ogiltig analysdata struktur mottagen (från productAnalysis).');
        }
        const analysisData = backendResult;
        const ingredientListFromBackend = backendResult.ingredientList || [];
        setIsMockData(analysisContainer.isMock === true || backendResult.isMock === true);

        const newProduct = createProductFromAnalysis(
          analysisData, 
          ingredientListFromBackend,
          id,
          params.mediaUri, // Pass mediaUri as well
          undefined, // productName (handle default in createProductFromAnalysis)
          analysisContainer.isMock === true || backendResult.isMock === true,
          params.productId // Pass productId if available
        );
        setProduct(newProduct);
        
        // Note: Automatic saving logic removed previously, saving is now manual via modal

      } else if (params.productId) {
        // Case 2: Navigated from History with only productId
        console.log(`[Initialize] Received productId: ${params.productId} from params. Fetching data...`);
        const fetchedProduct = await getProductById(params.productId);
        if (fetchedProduct) {
          console.log('[Initialize] Successfully fetched product data by ID');
          setProduct(fetchedProduct);
          // Check if fetched data indicates mock status (if applicable)
          // setIsMockData(fetchedProduct.metadata?.source === 'mock'); // Example check if needed
        } else {
          console.error(`[Initialize] Failed to fetch product with ID: ${params.productId}`);
          throw new Error(`Kunde inte hitta produkten med ID ${params.productId} i historiken.`);
        }
      } else {
        // Case 3: Missing necessary parameters
        console.error('[Initialize] Missing productAnalysis or productId in params:', params);
        throw new Error('Nödvändig information (analysresultat eller produkt-ID) saknas för att visa sidan.');
      }

    } catch (err: any) {
      console.error("Fel vid initialisering av ResultScreen:", err);
      setError(`Kunde inte ladda resultat: ${err.message}`);
      logEvent('result_screen_init_error', { 
          error_message: err.message, 
          params_received: JSON.stringify(params) // Log received params for debugging
      });
    } finally {
      setLoading(false);
    }
  };

  /**
   * Uppdaterad funktion för att skapa ett Product-objekt från analysresultatet.
   * Tar emot ProductAnalysis och en lista med alla ingrediensnamn.
   * Hanterar den nya API-strukturen med isVegan: boolean | null och watchedIngredients.
   * Skapar IngredientListItem[] för visning.
   */
  const createProductFromAnalysis = (
      analysisResult: any,
      ingredientList: IngredientListItem[], // This is now ONLY declared ingredients
      userId: string | null,
      mediaUri?: string,
      productName?: string,
      isMock: boolean = false,
      existingId?: string
  ): Product => {
    console.log('[createProduct] Startar. Rått analysresultat från backend:', JSON.stringify(analysisResult, null, 2));
    console.log('[createProduct] Deklarerad IngredientList (från backend result.ingredientList):', ingredientList);

    if (!analysisResult) {
      console.error('[createProduct] Saknar analysisResult-objekt.');
      throw new Error('AnalysisResult object is missing.');
    }
    if (!Array.isArray(ingredientList)) {
        console.warn('[createProduct] ingredientList är inte en array. Använder tom lista.');
        ingredientList = [];
    }

    const now = new Date().toISOString();
    const productId = existingId || uuidv4();

    // Validera och extrahera watchedIngredients - se till att det är en array
    const validatedWatchedIngredients = Array.isArray(analysisResult.watchedIngredients) 
        ? analysisResult.watchedIngredients 
        : [];
    // Logga om det inte var en array
    if (!Array.isArray(analysisResult.watchedIngredients)) {
        console.warn('[createProduct] analysisResult.watchedIngredients var inte en array, använder tom lista. Mottaget värde:', analysisResult.watchedIngredients);
    }

    // Validera och extrahera traceIngredients - se till att det är en array av strängar
    const validatedTraceIngredients = Array.isArray(analysisResult.traceIngredients) 
        ? analysisResult.traceIngredients.filter((item: any) => typeof item === 'string')
        : [];
    // Logga om det inte var en array
    if (!Array.isArray(analysisResult.traceIngredients)) {
        console.warn('[createProduct] analysisResult.traceIngredients var inte en array, använder tom lista. Mottaget värde:', analysisResult.traceIngredients);
    }
    
    // Logga om filtering skedde (dvs om arrayen innehöll annat än strängar)
    if (Array.isArray(analysisResult.traceIngredients) && validatedTraceIngredients.length !== analysisResult.traceIngredients.length) {
        console.warn('[createProduct] Filtrerade bort icke-sträng värden från analysisResult.traceIngredients.');
    }

    const productData: Product = {
      id: productId,
      timestamp: now,
      ingredients: ingredientList, // Endast deklarerade här
      analysis: {
        isVegan: analysisResult.isVegan,
        isUncertain: analysisResult.isUncertain ?? (analysisResult.isVegan === null),
        confidence: analysisResult.confidence ?? 0.5,
        watchedIngredients: validatedWatchedIngredients, // Använd validerad lista
        traceIngredients: validatedTraceIngredients, // Använd validerad lista
        reasoning: analysisResult.reasoning || '',
        detectedLanguage: analysisResult.detectedLanguage || 'unknown',
        uncertainReasons: Array.isArray(analysisResult.uncertainReasons) ? analysisResult.uncertainReasons : [], // Säkerställ array
      },
      metadata: {
        userId: userId ?? undefined,
        scanDate: now,
        isFavorite: false,
        isSavedToHistory: false,
        source: 'scan',
        videoUri: undefined,
        imageUri: mediaUri,
        croppedImageUri: undefined,
        name: productName || `Skanning ${new Date().toLocaleTimeString()}`,
      },
    };

    console.log('[createProduct] Färdigt Product-objekt skapat med nya strukturen.');
    return productData;
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/(scan)/');
    }
  };

  const handleToggleFavorite = async () => {
    if (!product) return;
    try {
      setLoading(true);
      await saveToHistory(product);
      setProduct(prev => prev ? { ...prev, metadata: { ...prev.metadata, isFavorite: !prev.metadata.isFavorite } } : null);
      logEvent('toggle_favorite_success', { product_id: product.id, new_state: !product.metadata.isFavorite });
    } catch (err: any) {
      console.error('Fel vid växling av favorit:', err);
      setError(`Kunde inte uppdatera favorit: ${err.message}`);
      logEvent('toggle_favorite_error', { product_id: product.id, error_message: err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!product) return;

    try {
      let shareableContent = `Produkt: ${product.metadata.name || 'Okänd produkt'}\nStatus: ${getOverallStatusText()}\n\nIngredienser:\n`;
      product.ingredients.forEach(item => {
        shareableContent += `- ${item.name} (${item.status})\n`;
      });

      if (product.analysis.watchedIngredients.length > 0) {
        shareableContent += '\nObserverade Ingredienser:\n';
        product.analysis.watchedIngredients.forEach(item => {
          shareableContent += `- ${item.name} (${item.status})${item.description ? `: ${item.description}` : ''}\n`;
        });
      }

      shareableContent += `\nAnalyskonfidens: ${product.analysis.confidence.toFixed(2)}\n`;
      if(product.analysis.reasoning) {
          shareableContent += `Resonemang: ${product.analysis.reasoning}\n`;
      }

      const shareOptions: Sharing.SharingOptions = {
        dialogTitle: 'Dela produktanalys',
      };

      let fileToShare: string | undefined = undefined;
      const mediaUri = product.metadata.videoUri || product.metadata.imageUri;

      if (mediaUri) {
          try {
              const fileInfo = await FileSystem.getInfoAsync(mediaUri);
              if (fileInfo.exists) {
                  fileToShare = mediaUri;
              } else {
                  console.log('Mediafil finns inte:', mediaUri);
              }
          } catch (fileError) {
              console.error("Fel vid kontroll av mediafil:", fileError);
          }
      }

      if (fileToShare) {
        if (!(await Sharing.isAvailableAsync())) {
          Alert.alert('Delning ej tillgänglig', 'Kan inte dela filer på den här enheten.');
          return;
        }
        const mimeType = product.metadata.videoUri ? 'video/mp4' : 'image/jpeg';
        const UTI = product.metadata.videoUri ? 'public.movie' : 'public.image';
        await Sharing.shareAsync(fileToShare, { ...shareOptions, mimeType, UTI });
      } else {
        console.log('Delar endast textinformation.');
        await Sharing.shareAsync(shareableContent, shareOptions);
      }
      logEvent('product_shared', { product_id: product.id, shared_media: !!fileToShare });

    } catch (err: any) {
      console.error('Fel vid delning:', err);
      Alert.alert('Fel vid delning', `Ett problem uppstod: ${err.message}`);
      logEvent('share_error', { product_id: product?.id, error_message: err.message });
    }
  };

  const handleNewScan = () => {
    router.replace('/(tabs)/(scan)/');
  };

  const handleReportIngredient = (ingredientName: string) => {
    setIngredientToReport(ingredientName);
    setReportReason('');
    setReportModalVisible(true);
    logEvent('report_ingredient_modal_opened', { ingredient_name: ingredientName });
  };

  const submitIngredientReport = async () => {
    if (!product || !ingredientToReport || !userId) {
      Alert.alert('Fel', 'Nödvändig information saknas för att skicka rapport.');
      return;
    }

    setIsSubmittingReport(true);
    try {
      const reportData = {
        ingredient: ingredientToReport, // The ingredient name being reported
        feedback: reportReason,         // The reason provided by the user
        productId: product.id,         // ID of the product analysis
        userId: userId,                // Current user ID
        timestamp: new Date().toISOString(), // Current timestamp
        // isVegan: undefined, // Optional: We don't necessarily know the user's suggested status here
      };
      
      console.log('Skickar ingrediensrapport:', reportData);

      // Use the correct method name found in AnalysisService
      const success = await analysisService.reportIngredientSuggestion(reportData);

      if (success) {
          Alert.alert('Tack!', 'Din rapport har skickats!');
          setReportModalVisible(false);
          logEvent('ingredient_report_submitted', {
            product_id: product.id,
            ingredient_name: ingredientToReport,
            report_reason_length: reportReason.length
          });
      } else {
          // Handle case where the API call itself returns false (optional)
          throw new Error('API:et returnerade ett fel vid rapportering.');
      }

    } catch (err: any) {
      console.error('Fel vid rapportering av ingrediens:', err);
      Alert.alert('Fel', `Kunde inte skicka rapporten: ${err.message}`);
      logEvent('ingredient_report_error', {
        product_id: product.id,
        ingredient_name: ingredientToReport,
        error_message: err.message
      });
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const getOverallStatusStyle = useCallback((): { text: string; color: string } => {
    if (!product) return { text: 'Laddar...', color: STATUS_COLORS.unknown };
    const { isVegan, isUncertain } = product.analysis;
    if (isUncertain || isVegan === null) {
      return { text: 'Osäker', color: STATUS_COLORS.uncertain };
    }
    if (isVegan === true) {
      return { text: 'Vegansk', color: STATUS_COLORS.vegan };
    }
    return { text: 'Ej Vegansk', color: STATUS_COLORS['non-vegan'] };
  }, [product]);

   const getOverallStatusText = useCallback((): string => {
    if (!product) return 'Laddar...';
    const { isVegan, isUncertain } = product.analysis;
    if (isUncertain || isVegan === null) return 'Osäker';
    if (isVegan === true) return 'Vegansk';
    return 'Ej Vegansk';
  }, [product]);

  // Function to handle opening the save modal
  const handleOpenSaveModal = () => {
    if (!product) return;
    // Pre-fill with existing name if available, otherwise empty
    setSaveName(product.metadata.name || '');
    setSaveModalVisible(true);
    logEvent('result_save_modal_opened', { productId: product.id });
  };

  // Function to confirm saving with a name
  const handleConfirmSave = async () => {
    if (!product || !userId) {
      Alert.alert('Fel', 'Produktdata eller användar-ID saknas. Kan inte spara.');
      return;
    }
    if (!saveName.trim()) {
      Alert.alert('Namn saknas', 'Ange ett namn för att spara analysen.');
      return;
    }

    const trimmedName = saveName.trim();
    console.log(`Försöker spara produkt ${product.id} med namn: "${trimmedName}" för användare ${userId}`);
    setIsSaving(true); // Show saving indicator
    setSaveModalVisible(false); // Close modal immediately

    try {
      // 1. Create updated product object
      const updatedProduct: Product = {
        ...product,
        metadata: {
          ...product.metadata,
          name: trimmedName, // Set the user-provided name
          isSavedToHistory: true, // Ensure it's marked as saved
          userId: userId // Ensure userId is set correctly
        }
      };

      // 2. Call saveToHistory from the hook
      await saveToHistory(updatedProduct);

      // 3. Update local state to reflect the changes
      setProduct(updatedProduct);

      // 4. Show confirmation
      Alert.alert('Sparat!', `Analysen har sparats i historiken som "${trimmedName}".`);

      // 5. Log event
      logEvent('result_manually_saved', { productId: product.id, nameLength: trimmedName.length });

    } catch (err) {
      console.error(`Fel vid sparning av produkt ${product.id} med namn "${trimmedName}":`, err);
      Alert.alert('Fel', `Kunde inte spara analysen: ${err instanceof Error ? err.message : String(err)}`);
      logEvent('result_manual_save_error', { productId: product.id, error_message: err instanceof Error ? err.message : String(err) });
    } finally {
      setIsSaving(false); // Hide saving indicator
    }
  };

  if (loading || isSaving) {
    return (
      <StyledSafeAreaView style={styles.container} className="justify-center items-center">
        <ActivityIndicator size="large" color="#007AFF" />
        <SafeText value={isSaving ? "Sparar..." : "Analyseras..."} style={{ marginTop: 16, fontSize: 16, color: '#666' }} />
      </StyledSafeAreaView>
    );
  }

  if (error) {
    return (
      <StyledSafeAreaView style={styles.container} className="justify-center items-center p-5">
        <Ionicons name="alert-circle-outline" size={50} color={STATUS_COLORS['non-vegan']} />
        <SafeText value="Ett fel uppstod" style={{ marginTop: 16, fontSize: 18, fontWeight: 'bold', color: STATUS_COLORS['non-vegan'] }} />
        <SafeText value={error} style={{ textAlign: 'center', marginTop: 8, color: '#666', lineHeight: 20 }} />
        <StyledTouchableOpacity
          className="mt-6 bg-blue-500 py-3 px-6 rounded-lg"
          onPress={handleNewScan}
        >
          <StyledText className="text-white font-bold text-base">Ny skanning</StyledText>
        </StyledTouchableOpacity>
      </StyledSafeAreaView>
    );
  }

  if (!product) {
    return (
      <StyledSafeAreaView style={styles.container} className="justify-center items-center p-5">
        <Ionicons name="search-outline" size={50} color={STATUS_COLORS.unknown} />
        <SafeText value="Ingen produktdata att visa." style={{ marginTop: 16, fontSize: 16, color: '#666' }} />
        <StyledTouchableOpacity
          className="mt-6 bg-blue-500 py-3 px-6 rounded-lg"
          onPress={handleNewScan}
        >
          <StyledText className="text-white font-bold text-base">Ny skanning</StyledText>
        </StyledTouchableOpacity>
      </StyledSafeAreaView>
    );
  }

  const overallStatus = getOverallStatusStyle();

  return (
    <StyledSafeAreaView style={styles.container}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: product.metadata.name || 'Analysresultat',
          headerLeft: () => (
            <StyledPressable onPress={handleBack} className="ml-4">
              <Ionicons name="arrow-back" size={24} color="#007AFF" />
            </StyledPressable>
          ),
          headerRight: () => (
            <StyledView className="flex-row mr-4 items-center">
              <StyledPressable onPress={handleToggleFavorite} style={styles.iconButton}>
                <Ionicons
                  name={product.metadata.isFavorite ? "heart" : "heart-outline"}
                  size={26} 
                  color={product.metadata.isFavorite ? "#FF3B30" : "#007AFF"}
                />
              </StyledPressable>
              <StyledPressable onPress={handleShare} style={styles.iconButton}>
                <Ionicons name="share-outline" size={26} color="#007AFF" /> 
              </StyledPressable>
            </StyledView>
          ),
          headerTitleAlign: 'center',
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#000',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <StatusBar style="dark" />

      <StyledScrollView contentContainerStyle={{ paddingBottom: 30 }}>
        <StyledView style={styles.card}>
          <StyledView style={styles.cardHeader}>
            <StyledView style={[styles.statusContainer, { backgroundColor: overallStatus.color }]}>
              <SafeText value={overallStatus.text} style={styles.statusText} />
            </StyledView>
            <StyledView className="flex-row items-center">
                <StyledTouchableOpacity 
                    onPress={handleOpenSaveModal} 
                    className={`p-2 rounded-lg mr-2 ${product.metadata.isSavedToHistory ? 'bg-green-500' : 'bg-blue-500'}`}
                >
                    <Ionicons 
                        name={product.metadata.isSavedToHistory ? "checkmark-circle" : "save-outline"} 
                        size={22} 
                        color="#FFFFFF" 
                    />
                 </StyledTouchableOpacity>

                <StyledTouchableOpacity
                    className="bg-blue-500 py-2 px-4 rounded-lg flex-row items-center"
                    onPress={handleNewScan}
                >
                    <Ionicons name="scan-outline" size={18} color="white" style={{ marginRight: 6 }}/>
                    <StyledText className="text-white font-bold text-sm">Ny</StyledText>
                </StyledTouchableOpacity>
            </StyledView>
          </StyledView>

          {(product.metadata.imageUri || product.metadata.videoUri) && (
             <StyledView className="w-full h-48 rounded-lg overflow-hidden bg-gray-200 mb-4">
               {product.metadata.videoUri ? (
                  <Video
                    ref={videoRef}
                    style={{ flex: 1 }}
                    source={{ uri: product.metadata.videoUri }}
                    useNativeControls
                    resizeMode={ResizeMode.CONTAIN}
                    isLooping={false}
                  />
               ) : (
                  <StyledImage
                    source={{ uri: product.metadata.imageUri }}
                    className="w-full h-full"
                    resizeMode="contain"
                  />
               )}
            </StyledView>
          )}

          {isMockData && (
            <StyledView style={styles.mockDataBanner}>
              <SafeText value={"OBS: Detta är exempeldata"} style={styles.mockDataText} />
            </StyledView>
          )}

          {product.analysis.reasoning && (
            <StyledView style={styles.reasoningContainer}>
              <SafeText value={product.analysis.reasoning} style={styles.reasoning} />
            </StyledView>
          )}
        </StyledView>

        <WatchedIngredientsDisplay
            watchedIngredients={userWatchedDisplayItems} 
        />

        <TraceIngredientsList traceIngredients={product.analysis.traceIngredients} />

        <StyledView style={styles.ingredientsCard}>
          <StyledText style={styles.ingredientsTitle}>Ingredienser</StyledText>
          <IngredientsList
            ingredients={product.ingredients}
            onReportIngredient={handleReportIngredient}
          />
        </StyledView>

        <StyledView style={styles.ingredientsCard} className="mt-2 mb-4">
          <StyledTouchableOpacity onPress={() => setIsLegendExpanded(!isLegendExpanded)} className="flex-row justify-between items-center py-2">
            <StyledText className="text-base font-semibold text-gray-700">Vad betyder färgerna?</StyledText>
            <Ionicons name={isLegendExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" />
          </StyledTouchableOpacity>

          {isLegendExpanded && (
            <StyledView className="mt-3 pt-3 border-t border-gray-200">
              <StyledView className="flex-row items-start mb-2">
                <StyledView className="w-3 h-3 rounded-full mr-3 mt-1" style={{ backgroundColor: STATUS_COLORS.vegan }} />
                <StyledText className="flex-1 text-sm text-gray-600"><StyledText className="font-semibold">Grön:</StyledText> Ingrediensen bedöms vara vegansk.</StyledText>
              </StyledView>
              <StyledView className="flex-row items-start mb-2">
                 <StyledView className="w-3 h-3 rounded-full mr-3 mt-1" style={{ backgroundColor: STATUS_COLORS['non-vegan'] }} />
                 <StyledText className="flex-1 text-sm text-gray-600"><StyledText className="font-semibold">Röd:</StyledText> Ingrediensen bedöms vara icke-vegansk (animaliskt ursprung).</StyledText>
              </StyledView>
              <StyledView className="flex-row items-start mb-3">
                 <StyledView className="w-3 h-3 rounded-full mr-3 mt-1" style={{ backgroundColor: STATUS_COLORS.uncertain }} />
                 <StyledText className="flex-1 text-sm text-gray-600"><StyledText className="font-semibold">Gul/Orange:</StyledText> Ingrediensens ursprung är osäkert (kan vara växt- eller djurbaserad).</StyledText>
              </StyledView>
              <StyledView className="flex-row items-start mb-3">
                 <StyledView className="w-3 h-3 rounded-full mr-3 mt-1" style={{ backgroundColor: '#007AFF' }} /> 
                 <StyledText className="flex-1 text-sm text-gray-600"><StyledText className="font-semibold">Blå:</StyledText> Används för "Noterade ingredienser" (t.ex. icke-veganska, osäkra, spårämnen, eller de som matchar din bevakningslista). Ikonen visar den underliggande statusen.</StyledText>
              </StyledView>
              <StyledView className="mt-2 pt-2 border-t border-gray-100">
                 <StyledText className="text-xs text-gray-500 italic">
                     Tips: Är du osäker på en ingrediens? För att vara helt säker rekommenderar vi att du kontaktar tillverkaren direkt.
                 </StyledText>
               </StyledView>
            </StyledView>
          )}
        </StyledView>
      </StyledScrollView>

      <Modal
        animationType="slide"
        transparent={true}
        visible={isReportModalVisible}
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalContainer}
        >
          <StyledView style={styles.modalContent}>
            <SafeText value={"Rapportera ingrediens"} style={styles.modalTitle} />
            <SafeText 
                value={`Ingrediens: ${ingredientToReport}`}
                style={{ marginBottom: 10, textAlign: 'center' }}
            />
            <StyledTextInput
              style={styles.modalInput}
              placeholder="Beskriv varför du tror statusen är felaktig..."
              multiline
              value={reportReason}
              onChangeText={setReportReason}
            />
            <StyledView style={styles.modalButtons}>
              <StyledTouchableOpacity
                style={[styles.modalButton, styles.modalCancelButton]}
                onPress={() => setReportModalVisible(false)}
                disabled={isSubmittingReport}
              >
                <StyledText style={styles.modalButtonText}>Avbryt</StyledText>
              </StyledTouchableOpacity>
              <StyledTouchableOpacity
                style={[styles.modalButton, (!reportReason || isSubmittingReport) && { opacity: 0.5 }]}
                onPress={submitIngredientReport}
                disabled={isSubmittingReport || !reportReason}
              >
                {isSubmittingReport ? (
                  <ActivityIndicator color="#fff" size="small"/>
                ) : (
                  <StyledText style={styles.modalButtonText}>Skicka</StyledText>
                )}
              </StyledTouchableOpacity>
            </StyledView>
          </StyledView>
        </KeyboardAvoidingView>
      </Modal>

      {/* Save Analysis Modal */}
      <Modal
          visible={isSaveModalVisible}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setSaveModalVisible(false)}
      >
          <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)' }}
          >
              <StyledView className="bg-white p-6 rounded-lg w-11/12">
                  <StyledText className="text-lg font-bold mb-4">Spara analys</StyledText>
                  <StyledText className="mb-2">Ange ett namn för denna analys:</StyledText>
                  <StyledTextInput
                      className="border border-gray-300 p-3 rounded-md mb-5"
                      placeholder="t.ex. Min favoritglass"
                      value={saveName}
                      onChangeText={setSaveName}
                      autoFocus={true}
                  />
                  <StyledView className="flex-row justify-end space-x-3">
                        <StyledTouchableOpacity
                           className="bg-gray-300 py-2 px-5 rounded-md"
                           onPress={() => setSaveModalVisible(false)}
                       >
                           <StyledText className="text-black font-medium">Avbryt</StyledText>
                       </StyledTouchableOpacity>
                       <StyledTouchableOpacity
                           className="bg-indigo-600 py-2 px-5 rounded-md"
                            onPress={handleConfirmSave}
                       >
                           <StyledText className="text-white font-medium">Spara</StyledText>
                       </StyledTouchableOpacity>
                   </StyledView>
              </StyledView>
          </KeyboardAvoidingView>
      </Modal>
    </StyledSafeAreaView>
  );
}