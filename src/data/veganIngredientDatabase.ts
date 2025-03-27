/**
 * Typ som representerar information om en ingrediens
 */
export interface IngredientInfo {
  isVegan: boolean | null;  // true = vegansk, false = icke-vegansk, null = osäker
  confidence: number;       // 0-1, där 1 är 100% säkerhet
  notes?: string;           // Extra information om ingrediensen
}

/**
 * Databas över ingredienser och deras veganska status
 */
export class VeganIngredientDatabase {
  private database: Map<string, IngredientInfo> = new Map();
  
  constructor() {
    this.initializeDatabase();
  }
  
  /**
   * Initialiserar databasen med kända ingredienser
   */
  private initializeDatabase(): void {
    // Icke-veganska ingredienser
    this.addNonVeganIngredient('mjölk', 'Mjölk är en animalisk produkt');
    this.addNonVeganIngredient('ägg', 'Ägg är en animalisk produkt');
    this.addNonVeganIngredient('honung', 'Honung kommer från bin');
    this.addNonVeganIngredient('gelatin', 'Gelatin framställs från djurkollagen');
    this.addNonVeganIngredient('vassle', 'Vassle är en mjölkprodukt');
    this.addNonVeganIngredient('laktos', 'Laktos kommer från mjölk');
    this.addNonVeganIngredient('kasein', 'Kasein är ett protein som finns i mjölk');
    this.addNonVeganIngredient('ostlöpe', 'Ostlöpe kommer från kalvmagar');
    this.addNonVeganIngredient('skummjölkspulver', 'Skummjölkspulver kommer från mjölk');
    this.addNonVeganIngredient('smör', 'Smör är en mjölkprodukt');
    this.addNonVeganIngredient('grädde', 'Grädde är en mjölkprodukt');
    this.addNonVeganIngredient('yoghurt', 'Yoghurt är en mjölkprodukt');
    this.addNonVeganIngredient('ost', 'Ost är en mjölkprodukt');
    this.addNonVeganIngredient('kött', 'Kött är en animalisk produkt');
    this.addNonVeganIngredient('fisk', 'Fisk är en animalisk produkt');
    this.addNonVeganIngredient('räkor', 'Räkor är en animalisk produkt');
    this.addNonVeganIngredient('skaldjur', 'Skaldjur är en animalisk produkt');
    this.addNonVeganIngredient('bivax', 'Bivax kommer från bin');
    this.addNonVeganIngredient('shellack', 'Shellack kommer från insekter');
    this.addNonVeganIngredient('karmin', 'Karmin utvinns från koschenillsköldlöss');
    this.addNonVeganIngredient('e120', 'E120 (karmin) utvinns från koschenillsköldlöss');
    this.addNonVeganIngredient('lanolin', 'Lanolin kommer från ullfett');
    
    // Engelska motsvarigheter
    this.addNonVeganIngredient('milk', 'Milk is an animal product');
    this.addNonVeganIngredient('eggs', 'Eggs are an animal product');
    this.addNonVeganIngredient('honey', 'Honey comes from bees');
    this.addNonVeganIngredient('gelatin', 'Gelatin is derived from animal collagen');
    this.addNonVeganIngredient('whey', 'Whey is a milk product');
    this.addNonVeganIngredient('lactose', 'Lactose comes from milk');
    this.addNonVeganIngredient('casein', 'Casein is a protein found in milk');
    this.addNonVeganIngredient('rennet', 'Rennet comes from calf stomachs');
    this.addNonVeganIngredient('skim milk powder', 'Skim milk powder comes from milk');
    this.addNonVeganIngredient('butter', 'Butter is a milk product');
    this.addNonVeganIngredient('cream', 'Cream is a milk product');
    this.addNonVeganIngredient('yogurt', 'Yogurt is a milk product');
    this.addNonVeganIngredient('cheese', 'Cheese is a milk product');
    this.addNonVeganIngredient('meat', 'Meat is an animal product');
    this.addNonVeganIngredient('fish', 'Fish is an animal product');
    this.addNonVeganIngredient('shrimp', 'Shrimp is an animal product');
    this.addNonVeganIngredient('shellfish', 'Shellfish is an animal product');
    this.addNonVeganIngredient('beeswax', 'Beeswax comes from bees');
    this.addNonVeganIngredient('shellac', 'Shellac comes from insects');
    this.addNonVeganIngredient('carmine', 'Carmine is extracted from cochineal insects');
    this.addNonVeganIngredient('e120', 'E120 (carmine) is extracted from cochineal insects');
    this.addNonVeganIngredient('lanolin', 'Lanolin comes from wool fat');
    
    // Veganska ingredienser
    this.addVeganIngredient('sojaprotein', 'Sojaprotein är växtbaserat');
    this.addVeganIngredient('tofu', 'Tofu är gjord av sojabönor');
    this.addVeganIngredient('seitan', 'Seitan är gjord av vetegluten');
    this.addVeganIngredient('quinoa', 'Quinoa är ett frö från en ört');
    this.addVeganIngredient('linser', 'Linser är baljväxter');
    this.addVeganIngredient('kikärtor', 'Kikärtor är baljväxter');
    this.addVeganIngredient('sojamjölk', 'Sojamjölk är växtbaserad');
    this.addVeganIngredient('havremjölk', 'Havremjölk är växtbaserad');
    this.addVeganIngredient('mandelmjölk', 'Mandelmjölk är växtbaserad');
    this.addVeganIngredient('rismjölk', 'Rismjölk är växtbaserad');
    this.addVeganIngredient('kokosgrädde', 'Kokosgrädde är växtbaserad');
    this.addVeganIngredient('olivolja', 'Olivolja är växtbaserad');
    this.addVeganIngredient('rapsolja', 'Rapsolja är växtbaserad');
    
    // Engelska motsvarigheter
    this.addVeganIngredient('soy protein', 'Soy protein is plant-based');
    this.addVeganIngredient('tofu', 'Tofu is made from soybeans');
    this.addVeganIngredient('seitan', 'Seitan is made from wheat gluten');
    this.addVeganIngredient('quinoa', 'Quinoa is a seed from an herb');
    this.addVeganIngredient('lentils', 'Lentils are legumes');
    this.addVeganIngredient('chickpeas', 'Chickpeas are legumes');
    this.addVeganIngredient('soy milk', 'Soy milk is plant-based');
    this.addVeganIngredient('oat milk', 'Oat milk is plant-based');
    this.addVeganIngredient('almond milk', 'Almond milk is plant-based');
    this.addVeganIngredient('rice milk', 'Rice milk is plant-based');
    this.addVeganIngredient('coconut cream', 'Coconut cream is plant-based');
    this.addVeganIngredient('olive oil', 'Olive oil is plant-based');
    this.addVeganIngredient('rapeseed oil', 'Rapeseed oil is plant-based');
    
    // Osäkra ingredienser (kan vara veganska eller inte)
    this.addUncertainIngredient('lecitin', 'Lecitin kan vara både växt- och djurbaserad');
    this.addUncertainIngredient('e471', 'E471 kan vara både växt- och djurbaserad');
    this.addUncertainIngredient('glycerol', 'Glycerol kan vara både växt- och djurbaserad');
    this.addUncertainIngredient('e422', 'E422 (glycerol) kan vara både växt- och djurbaserad');
    this.addUncertainIngredient('naturlig arom', 'Naturlig arom kan innehålla både växt- och djurbaserade beståndsdelar');
    this.addUncertainIngredient('d-vitamin', 'D-vitamin kan vara både växt- och djurbaserad');
    this.addUncertainIngredient('omega-3', 'Omega-3 kan komma från både fisk och växter');
    
    // Engelska motsvarigheter
    this.addUncertainIngredient('lecithin', 'Lecithin can be both plant-based and animal-based');
    this.addUncertainIngredient('e471', 'E471 can be both plant-based and animal-based');
    this.addUncertainIngredient('glycerol', 'Glycerol can be both plant-based and animal-based');
    this.addUncertainIngredient('e422', 'E422 (glycerol) can be both plant-based and animal-based');
    this.addUncertainIngredient('natural flavor', 'Natural flavor can contain both plant-based and animal-based components');
    this.addUncertainIngredient('vitamin d', 'Vitamin D can be both plant-based and animal-based');
    this.addUncertainIngredient('omega-3', 'Omega-3 can come from both fish and plants');
  }
  
  /**
   * Lägg till en vegansk ingrediens i databasen
   */
  private addVeganIngredient(name: string, notes?: string): void {
    this.database.set(name.toLowerCase(), {
      isVegan: true,
      confidence: 1.0,
      notes
    });
  }
  
  /**
   * Lägg till en icke-vegansk ingrediens i databasen
   */
  private addNonVeganIngredient(name: string, notes?: string): void {
    this.database.set(name.toLowerCase(), {
      isVegan: false,
      confidence: 1.0,
      notes
    });
  }
  
  /**
   * Lägg till en osäker ingrediens i databasen
   */
  private addUncertainIngredient(name: string, notes?: string): void {
    this.database.set(name.toLowerCase(), {
      isVegan: null,
      confidence: 0.5,
      notes
    });
  }
  
  /**
   * Kontrollera om en ingrediens är vegansk
   */
  async checkIngredient(ingredient: string): Promise<IngredientInfo> {
    const normalizedName = ingredient.toLowerCase().trim();
    
    // Exakt matchning
    if (this.database.has(normalizedName)) {
      return this.database.get(normalizedName)!;
    }
    
    // Delmatchning för att hitta ingredienser som innehåller söksträngen
    for (const [key, info] of this.database.entries()) {
      if (normalizedName.includes(key) || key.includes(normalizedName)) {
        return {
          ...info,
          confidence: Math.max(0.7, info.confidence - 0.1) // Något lägre confidence för delmatchning
        };
      }
    }
    
    // Standardvärde om ingrediensen inte hittas
    return {
      isVegan: null,
      confidence: 0,
      notes: 'Okänd ingrediens, kunde inte avgöra vegansk status'
    };
  }
  
  /**
   * Kontrollera en lista av ingredienser
   */
  async checkIngredients(ingredients: string[]): Promise<{
    nonVeganIngredients: string[];
    uncertainIngredients: string[];
    confidence: number;
  }> {
    const results = await Promise.all(
      ingredients.map(ingredient => this.checkIngredient(ingredient))
    );
    
    const nonVeganIngredients: string[] = [];
    const uncertainIngredients: string[] = [];
    let totalConfidence = 0;
    
    // Gå igenom alla resultat
    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const ingredient = ingredients[i];
      
      if (result.isVegan === false) {
        nonVeganIngredients.push(ingredient);
      } else if (result.isVegan === null && result.confidence > 0) {
        uncertainIngredients.push(ingredient);
      }
      
      totalConfidence += result.confidence;
    }
    
    // Beräkna genomsnittlig confidence
    const avgConfidence = results.length > 0
      ? totalConfidence / results.length
      : 0;
    
    return {
      nonVeganIngredients,
      uncertainIngredients,
      confidence: avgConfidence
    };
  }
  
  /**
   * Expandera databasen med nya ingredienser
   */
  addIngredient(name: string, info: IngredientInfo): void {
    this.database.set(name.toLowerCase(), info);
  }
  
  /**
   * Hämta alla ingredienser i databasen
   */
  getAllIngredients(): Map<string, IngredientInfo> {
    return new Map(this.database);
  }
  
  /**
   * Antalet ingredienser i databasen
   */
  get size(): number {
    return this.database.size;
  }
}

// Exportera en singleton-instans för enkel användning
export const veganIngredientDatabase = new VeganIngredientDatabase(); 