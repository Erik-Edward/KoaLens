import { veganIngredientDatabase, IngredientInfo } from '../data/veganIngredientDatabase';

describe('VeganIngredientDatabase', () => {
  // Test för att säkerställa att databasen initialiseras korrekt
  test('should initialize with ingredients', () => {
    expect(veganIngredientDatabase.size).toBeGreaterThan(0);
  });

  // Test för exakt matchning av kända veganska ingredienser
  test('should correctly identify vegan ingredients', async () => {
    const veganIngredients = ['sojaprotein', 'tofu', 'havremjölk'];
    
    for (const ingredient of veganIngredients) {
      const result = await veganIngredientDatabase.checkIngredient(ingredient);
      expect(result.isVegan).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  // Test för exakt matchning av kända icke-veganska ingredienser
  test('should correctly identify non-vegan ingredients', async () => {
    const nonVeganIngredients = ['mjölk', 'ägg', 'honung', 'gelatin'];
    
    for (const ingredient of nonVeganIngredients) {
      const result = await veganIngredientDatabase.checkIngredient(ingredient);
      expect(result.isVegan).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(0.9);
    }
  });

  // Test för osäkra ingredienser
  test('should correctly identify uncertain ingredients', async () => {
    const uncertainIngredients = ['lecitin', 'e471', 'naturlig arom'];
    
    for (const ingredient of uncertainIngredients) {
      const result = await veganIngredientDatabase.checkIngredient(ingredient);
      expect(result.isVegan).toBeNull();
    }
  });

  // Test för delmatchningar
  test('should handle partial matches', async () => {
    // Ingredienser som innehåller kända icke-veganska ingredienser
    const partialMatches = [
      { ingredient: 'mjölkpulver', isVegan: false },
      { ingredient: 'äggviteprotein', isVegan: false },
      { ingredient: 'sojalecitin', isVegan: null } // osäker eftersom lecitin är osäker
    ];
    
    for (const { ingredient, isVegan } of partialMatches) {
      const result = await veganIngredientDatabase.checkIngredient(ingredient);
      expect(result.isVegan).toBe(isVegan);
    }
  });

  // Test för okända ingredienser
  test('should return null for unknown ingredients', async () => {
    const unknownIngredients = ['xylitol', 'citronsyra', 'pektin'];
    
    for (const ingredient of unknownIngredients) {
      const result = await veganIngredientDatabase.checkIngredient(ingredient);
      expect(result.isVegan).toBeNull();
      expect(result.confidence).toBe(0);
    }
  });

  // Test för analyser av hela ingredienslistor
  test('should analyze ingredient lists', async () => {
    // Vegansk ingredienslista
    const veganList = ['vatten', 'socker', 'havremjölk', 'sojalecitin', 'salt'];
    const veganResult = await veganIngredientDatabase.checkIngredients(veganList);
    expect(veganResult.nonVeganIngredients.length).toBe(0);
    
    // Icke-vegansk ingredienslista
    const nonVeganList = ['vatten', 'socker', 'mjölk', 'ägg', 'salt'];
    const nonVeganResult = await veganIngredientDatabase.checkIngredients(nonVeganList);
    expect(nonVeganResult.nonVeganIngredients.length).toBe(2);
    expect(nonVeganResult.nonVeganIngredients).toContain('mjölk');
    expect(nonVeganResult.nonVeganIngredients).toContain('ägg');
    
    // Blandad ingredienslista
    const mixedList = ['vatten', 'socker', 'lecitin', 'salt'];
    const mixedResult = await veganIngredientDatabase.checkIngredients(mixedList);
    expect(mixedResult.nonVeganIngredients.length).toBe(0);
    expect(mixedResult.uncertainIngredients.length).toBe(1);
    expect(mixedResult.uncertainIngredients).toContain('lecitin');
  });

  // Test för att lägga till nya ingredienser
  test('should allow adding new ingredients', async () => {
    // Lägg till en ny ingrediens
    const newIngredient = 'testingrediens' + Math.random().toString(36).substring(7);
    const newInfo: IngredientInfo = {
      isVegan: true,
      confidence: 1.0,
      notes: 'Test ingrediens'
    };
    
    const previousSize = veganIngredientDatabase.size;
    veganIngredientDatabase.addIngredient(newIngredient, newInfo);
    
    expect(veganIngredientDatabase.size).toBe(previousSize + 1);
    
    // Kontrollera att ingrediensen finns i databasen
    const result = await veganIngredientDatabase.checkIngredient(newIngredient);
    expect(result.isVegan).toBe(true);
    expect(result.confidence).toBe(1.0);
  });
}); 