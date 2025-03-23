/**
 * Analystjänst för att hantera produktanalyser
 */

import { ProductAnalysis, WatchedIngredient } from '../models/productModel';
import { getUserId } from '../stores/adapter';
import * as FileSystem from 'expo-file-system';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import { useStore } from '@/stores/useStore';
import { WatchedIngredient as UserWatchedIngredient } from '@/types/settingsTypes';

// Simulerad data (ersätt med faktisk API-anrop i produktion)
const mockVeganIngredients = [
  'Vatten', 'Socker', 'Salt', 'Vitaminberikat mjöl', 'Äppeljuice', 
  'Vetestärkelse', 'Majsstärkelse', 'Havremjöl', 'Sojalecitin', 
  'Vitamin C', 'Citronsyra', 'Pektin', 'Jästextrakt', 'Karoten'
];

const mockNonVeganIngredients = [
  'Mjölk', 'Laktos', 'Vassleprotein', 'Gelatin', 'Honung', 
  'Ägg', 'Äggvita', 'Äggulehinnspulver', 'Kasein', 'Ko-mjölk',
  'Grädde', 'Smör', 'Nötkött', 'Kyckling', 'Fisk'
];

const mockWatchOutIngredients: WatchedIngredient[] = [
  { name: 'E120', reason: 'Karmin, färgämne från insekter', description: 'Ett rött färgämne som utvinns från koschenillsköldlöss' },
  { name: 'E441', reason: 'Gelatin, från djurben', description: 'Protein från djurens bindväv, vanligtvis från grisar eller kor' },
  { name: 'E901', reason: 'Bivax, från bin', description: 'Naturligt vax producerat av honungsbin' },
  { name: 'E904', reason: 'Shellack, från insekter', description: 'Hartssekret från lacksköllusen, används som ytbehandling' },
  { name: 'E471', reason: 'Kan innehålla animaliska fetter', description: 'Mono- och diglycerider av fettsyror, kan vara vegetabiliska eller animaliska' },
  { name: 'E542', reason: 'Benfosfat, från djurben', description: 'Framställs ur ben från djur, främst kor' },
  { name: 'Naturlig arom', reason: 'Kan innehålla animaliska produkter', description: 'Ospecificerad "naturlig arom" kan innehålla animaliska komponenter' }
];

// Ingredienser som ska flaggas
export const mockWatchedIngredients: WatchedIngredient[] = [
  {
    name: "gelatin",
    reason: "non-vegan",
    description: "Gelatin kommer från djurkollagen som extraheras från hud, ben och bindväv från djur, vanligtvis från grisar och kor."
  },
  {
    name: "mjölk",
    reason: "non-vegan",
    description: "Mjölk är en animalisk produkt som kommer från kor."
  },
  {
    name: "mjölkprotein",
    reason: "non-vegan",
    description: "Mjölkprotein är en animalisk ingrediens som kommer från komjölk."
  },
  {
    name: "mjölkpulver",
    reason: "non-vegan",
    description: "Mjölkpulver är en animalisk ingrediens som tillverkas av torkad mjölk."
  },
  {
    name: "ägg",
    reason: "non-vegan",
    description: "Ägg är en animalisk produkt från hönor och andra fåglar."
  },
  {
    name: "äggvita",
    reason: "non-vegan",
    description: "Äggvita är proteindelen av ett ägg och är inte vegansk."
  },
  {
    name: "äggula",
    reason: "non-vegan",
    description: "Äggula är den gula delen av ett ägg och är inte vegansk."
  },
  {
    name: "honung",
    reason: "non-vegan",
    description: "Honung är en produkt som produceras av bin."
  },
  {
    name: "vassle",
    reason: "non-vegan",
    description: "Vassle är en animalisk biprodukt från osttillverkning som innehåller mjölkprotein."
  },
  {
    name: "kasein",
    reason: "non-vegan",
    description: "Kasein är ett mjölkprotein som utvinns från mjölk."
  },
  {
    name: "laktos",
    reason: "non-vegan",
    description: "Laktos är en mjölksocker som finns i mjölk och mjölkprodukter."
  },
  {
    name: "bivax",
    reason: "non-vegan",
    description: "Bivax produceras av bin och används ibland som ytbehandling för frukt eller i godis."
  },
  {
    name: "shellack",
    reason: "non-vegan",
    description: "Shellack är ett hartsaktig ämne som produceras av insekter och används ibland som ytbehandling för godis eller frukt."
  },
  {
    name: "karmin",
    reason: "non-vegan",
    description: "Karmin är ett rött färgämne som utvinns från koschenillsköldlöss och används för att färga livsmedel."
  },
  {
    name: "e120",
    reason: "non-vegan",
    description: "E120 (Karmin) är ett rött färgämne som utvinns från koschenillsköldlöss."
  },
  {
    name: "lanolin",
    reason: "non-vegan",
    description: "Lanolin är ett vaxliknande ämne som utvinns från ullfett från får."
  },
  {
    name: "smör",
    reason: "non-vegan",
    description: "Smör är en animalisk produkt som tillverkas av grädde från komjölk."
  },
  {
    name: "ost",
    reason: "non-vegan",
    description: "Ost är en animalisk produkt som tillverkas av mjölk, vanligtvis från kor, getter eller får."
  },
  {
    name: "grädde",
    reason: "non-vegan",
    description: "Grädde är en animalisk produkt som separeras från mjölk."
  },
  {
    name: "köttextrakt",
    reason: "non-vegan",
    description: "Köttextrakt är en koncentrerad form av kött som används som smakförstärkare."
  },
  {
    name: "kycklingbuljong",
    reason: "non-vegan",
    description: "Kycklingbuljong innehåller extrakt från kyckling."
  },
  {
    name: "köttbuljong",
    reason: "non-vegan",
    description: "Köttbuljong innehåller extrakt från kött."
  },
  {
    name: "oxbuljong",
    reason: "non-vegan",
    description: "Oxbuljong innehåller extrakt från nötkött."
  },
  {
    name: "fiskbuljong",
    reason: "non-vegan",
    description: "Fiskbuljong innehåller extrakt från fisk."
  },
  {
    name: "skaldjursbuljong",
    reason: "non-vegan",
    description: "Skaldjursbuljong innehåller extrakt från skaldjur."
  },
  {
    name: "L-cystein",
    reason: "maybe-non-vegan",
    description: "L-cystein kan utvinnas från mänskligt hår eller fjädrar, men kan också vara syntetiskt framställt."
  },
  {
    name: "e631",
    reason: "maybe-non-vegan",
    description: "E631 (Dinatriuminosinat) kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "e627",
    reason: "maybe-non-vegan",
    description: "E627 (Dinatriumguanylat) kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "glycerin",
    reason: "maybe-non-vegan",
    description: "Glycerin kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "e422",
    reason: "maybe-non-vegan",
    description: "E422 (Glycerol) kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "e471",
    reason: "maybe-non-vegan",
    description: "E471 (Mono- och diglycerider av fettsyror) kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "e472",
    reason: "maybe-non-vegan",
    description: "E472 (Estrar av mono- och diglycerider) kan vara av animaliskt eller vegetabiliskt ursprung."
  },
  {
    name: "e904",
    reason: "non-vegan",
    description: "E904 (Shellack) är ett hartsaktig ämne som produceras av insekter."
  },
  {
    name: "ostlöpe",
    reason: "non-vegan",
    description: "Ostlöpe är ett enzym som traditionellt utvinns från kalvmagar och används vid osttillverkning."
  }
];

interface AnalysisResult {
  isVegan: boolean;
  confidence: number;
  watchedIngredients: WatchedIngredient[];
  reasoning?: string;
}

export class AnalysisService {
  // Endpoint för tjänsten
  private API_ENDPOINT = 'https://koalens-backend.fly.dev/analyze';

  /**
   * Extraherar ingredienser från en bild via Claude Vision
   * @param imagePath Sökväg till bilden som ska analyseras
   * @returns Lista med extraherade ingredienser
   */
  async extractIngredientsFromImage(imagePath: string): Promise<string[]> {
    try {
      console.log('Läser bildfil:', imagePath);
      
      // Validera att filstigen är giltig
      if (!imagePath || typeof imagePath !== 'string') {
        console.error('Ogiltig filsökväg:', imagePath);
        throw new Error('Ogiltig filsökväg för bildanalys');
      }
      
      // Läs filens innehåll som base64
      console.log('Läser fil som base64...');
      let base64 = '';
      try {
        base64 = await FileSystem.readAsStringAsync(imagePath, {
          encoding: FileSystem.EncodingType.Base64,
        });
        
        // Kontrollera att base64-strängen har innehåll
        if (!base64 || base64.length === 0) {
          console.error('Tom base64-sträng från bildfilen');
          throw new Error('Kunde inte läsa bilden korrekt');
        }
        
        console.log('Base64-kodning slutförd, längd:', base64.length);
      } catch (fileError) {
        console.error('Fel vid läsning av bildfil:', fileError);
        throw new Error('Kunde inte läsa bildfilen: ' + (fileError instanceof Error ? fileError.message : String(fileError)));
      }

      // Hämta användar-ID för API-anrop
      let userId = await getUserId();
      
      // Kontrollera att vi har ett giltigt UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!userId || !uuidRegex.test(userId)) {
        console.warn('Ogiltigt eller saknat UUID upptäckt, genererar nytt UUID för API-anrop');
        userId = uuidv4();
      }
      
      console.log('Användar-ID för API-anrop:', userId);

      // Förbered data för Claude Vision-analys
      const data = {
        userId: userId,
        image: base64,
        format: 'json' // Explicit format parameter
      };

      console.log('Skickar bild till Claude Vision-analys...', {
        endpoint: this.API_ENDPOINT,
        userId,
        imageSize: base64.length > 0 ? Math.round(base64.length * 0.75 / 1024) + 'KB' : 'N/A',
      });
      
      // Använd Axios med timeout och headers
      const response = await axios.post(this.API_ENDPOINT, data, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        timeout: 60000 // 60 seconds timeout
      });

      console.log('API-svar mottaget, status:', response.status);
      
      // Detaljerad loggning av svaret för felsökning
      if (response.data) {
        console.log('API-svarsdata:', {
          success: response.data.success,
          hasIngredients: Array.isArray(response.data.ingredients),
          ingredientsCount: Array.isArray(response.data.ingredients) ? response.data.ingredients.length : 0,
          hasAllIngredients: Array.isArray(response.data.allIngredients),
          allIngredientsCount: Array.isArray(response.data.allIngredients) ? response.data.allIngredients.length : 0,
          error: response.data.error || 'none',
          isVegan: response.data.isVegan
        });
      }

      // Kontrollera svaret och extrahera ingredienser
      if (response.data && response.data.success === true && Array.isArray(response.data.ingredients) && response.data.ingredients.length > 0) {
        // Exakt samma format som förväntat
        console.log('Ingredienser extraherade framgångsrikt från ingredients:', response.data.ingredients.length);
        return response.data.ingredients;
      } else if (response.data && Array.isArray(response.data.allIngredients) && response.data.allIngredients.length > 0) {
        // Nytt API-format med allIngredients (Claude Vision-format)
        console.log('Ingredienser extraherade framgångsrikt från allIngredients:', response.data.allIngredients.length);
        return response.data.allIngredients;
      } else if (response.data && response.data.success === false) {
        // Explicit felmeddelande från API
        console.error('API svarade med explicit fel:', response.data.error || 'Inget felmeddelande');
        throw new Error(response.data.error || 'API svarade med ett fel');
      } else {
        // Okänt svarformat
        console.error('Oväntat API-svarsformat:', JSON.stringify(response.data).substring(0, 500));
        throw new Error('Fick ett oväntat svar från servern, kunde inte analysera bilden');
      }
    } catch (error) {
      // Förbättrad felhantering för olika typer av fel
      console.error('Fel vid extraktion av ingredienser:', error);
      
      // Hantera axios-specifika fel
      if (axios.isAxiosError(error)) {
        const axiosError = error;
        if (axiosError.response) {
          // Servern svarade med en felstatus
          console.error('API svarade med felstatus:', 
            axiosError.response.status, 
            axiosError.response.data
          );
          throw new Error(`Serverfel (${axiosError.response.status}): ${
            typeof axiosError.response.data === 'string' 
              ? axiosError.response.data 
              : axiosError.response.data?.error || 'Okänt fel'
          }`);
        } else if (axiosError.request) {
          // Begäran gjordes men inget svar mottogs
          console.error('Inget svar från servern:', axiosError.message);
          throw new Error('Kunde inte nå servern. Kontrollera din internetanslutning och försök igen.');
        } else {
          // Något gick fel vid förberedelse av begäran
          console.error('Fel vid förberedelse av API-anrop:', axiosError.message);
          throw new Error('Kunde inte förbereda begäran: ' + axiosError.message);
        }
      }
      
      // Hantera övriga fel
      throw error;
    }
  }

  /**
   * Analysera en lista med ingredienser för att avgöra om produkten är vegansk
   * @param ingredients Lista med ingredienser att analysera
   * @returns Ett analysobjekt med resultatet
   */
  async analyzeIngredients(ingredients: string[]): Promise<AnalysisResult> {
    // Normalisera ingredienser
    const normalizedIngredients = ingredients.map(i => i.toLowerCase().trim());
    
    // Hitta icke-veganska ingredienser i listan
    const foundNonVegan: WatchedIngredient[] = [];
    
    // Kontrollera ingredienser mot våra kända icke-veganska ingredienser
    for (const ingredient of normalizedIngredients) {
      // Sök direkt matchning
      const directMatch = mockWatchedIngredients.find(watched => 
        ingredient === watched.name.toLowerCase()
      );
      
      if (directMatch) {
        foundNonVegan.push(directMatch);
        continue;
      }
      
      // Sök partiell matchning (t.ex. "mjölkpulver" när vi har "mjölk" i vår lista)
      const partialMatches = mockWatchedIngredients.filter(watched => 
        ingredient.includes(watched.name.toLowerCase())
      );
      
      foundNonVegan.push(...partialMatches);
    }
    
    // Ta bort duplicerade ingredienser
    const uniqueNonVegan = foundNonVegan.filter((item, index, self) => 
      index === self.findIndex(i => i.name === item.name)
    );
    
    // Lägg till bevakade ingredienser från användarinställningar
    const { preferences } = useStore.getState();
    const watchedIngredients = preferences?.watchedIngredients || {};
    const watchedFoundFromSettings: WatchedIngredient[] = [];
    
    // Gå igenom alla ingredienser och leta efter matchningar mot användarens bevakade ingredienser
    normalizedIngredients.forEach((ingredient) => {
      Object.entries(watchedIngredients).forEach(([key, watched]) => {
        // Kontrollera att watched är definierad och enabled är true
        if (watched && watched.enabled && ingredient.includes(key.toLowerCase())) {
          watchedFoundFromSettings.push({
            name: watched.name || key,
            description: watched.description || '',
            reason: 'watched'  // Anger att detta är en bevakad ingrediens, inte nödvändigtvis icke-vegansk
          });
        }
      });
    });
    
    // Kombinera icke-veganska ingredienser med bevakade ingredienser
    const allWatchedIngredients = [...uniqueNonVegan, ...watchedFoundFromSettings];
    
    // Ta bort eventuella dupliceringar
    const finalWatchedIngredients = allWatchedIngredients.filter((item, index, self) => 
      index === self.findIndex(i => i.name === item.name)
    );
    
    // Klassificera produkten som vegansk eller inte (baserat på icke-veganska ingredienser, inte bevakade)
    const nonVeganCount = uniqueNonVegan.filter(i => i.reason === 'non-vegan').length;
    const maybeNonVeganCount = uniqueNonVegan.filter(i => i.reason === 'maybe-non-vegan').length;
    
    // Bestäm om produkten är vegansk baserat på ingredienserna
    const isVegan = nonVeganCount === 0;
    
    // Beräkna konfidens 
    let confidence = 0.8; // Standardvärde
    
    if (nonVeganCount > 0) {
      // Om det finns tydligt icke-veganska ingredienser, hög konfidens
      confidence = 0.9 + (Math.min(nonVeganCount, 3) / 30); // Max 0.99
    } else if (maybeNonVeganCount > 0) {
      // Om det finns potentiellt icke-veganska ingredienser, lägre konfidens
      confidence = 0.6 - (Math.min(maybeNonVeganCount, 3) / 30); // Min 0.5
    } else if (normalizedIngredients.length === 0) {
      // Om inga ingredienser hittades, låg konfidens
      confidence = 0.3;
    } else if (normalizedIngredients.length < 3) {
      // Om få ingredienser hittades, något lägre konfidens
      confidence = 0.7;
    }
    
    // Generera resonemang
    let reasoning = '';
    
    if (nonVeganCount > 0) {
      reasoning = `Produkten innehåller ${nonVeganCount} icke-veganska ${nonVeganCount === 1 ? 'ingrediens' : 'ingredienser'}.`;
    } else if (maybeNonVeganCount > 0) {
      reasoning = `Produkten kan vara vegansk, men innehåller ${maybeNonVeganCount} ${maybeNonVeganCount === 1 ? 'ingrediens' : 'ingredienser'} som kan vara icke-veganska beroende på källa.`;
    } else if (normalizedIngredients.length === 0) {
      reasoning = 'Inga ingredienser kunde identifieras.';
    } else {
      reasoning = 'Inga icke-veganska ingredienser hittades.';
    }
    
    return {
      isVegan,
      confidence,
      watchedIngredients: finalWatchedIngredients,
      reasoning
    };
  }
}