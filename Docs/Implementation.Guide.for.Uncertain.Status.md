

# KoaLens: Frontend Implementation Guide for Uncertain Status

## Overview

The backend has been updated to include an `isUncertain` status for products that contain ingredients with uncertain vegan status. This document outlines the necessary frontend changes to support this new feature.

## Background

Currently, the KoaLens app has two product statuses: "Vegansk" (vegan) and "Ej vegansk" (not vegan). The backend now supports a third status, "Osäker" (uncertain), for products containing ingredients that could be either plant or animal-based.

## Required UI Changes

### 1. Update Result Screen (`result.tsx`)

The `result.tsx` file needs to be updated to display the new uncertain status:

```tsx
// In the main result display section, update the Vegansk-status View
<StyledView 
  className={`mx-4 my-5 p-6 rounded-xl shadow-sm ${
    product.analysis.isUncertain 
      ? 'bg-yellow-100' 
      : (product.analysis.isVegan ? 'bg-green-100' : 'bg-red-100')
  }`}
>
  <StyledView className="flex items-center justify-center mb-2">
    <StyledView 
      className={`w-16 h-16 rounded-full flex items-center justify-center ${
        product.analysis.isUncertain 
          ? 'bg-yellow-200' 
          : (product.analysis.isVegan ? 'bg-green-200' : 'bg-red-200')
      }`}
    >
      <Ionicons 
        name={
          product.analysis.isUncertain 
            ? "help-circle" 
            : (product.analysis.isVegan ? "checkmark-circle" : "close-circle")
        } 
        size={40} 
        color={
          product.analysis.isUncertain 
            ? "#d97706" // Amber-600
            : (product.analysis.isVegan ? "#15803d" : "#b91c1c")
        } 
      />
    </StyledView>
  </StyledView>
  
  <StyledText 
    className={`text-xl font-sans-bold text-center ${
      product.analysis.isUncertain 
        ? 'text-yellow-800' 
        : (product.analysis.isVegan ? 'text-green-800' : 'text-red-800')
    }`}
  >
    {product.analysis.isUncertain 
      ? 'Osäker' 
      : (product.analysis.isVegan ? 'Vegansk' : 'Ej vegansk')}
  </StyledText>
  
  {/* Display uncertainty reasons if they exist */}
  {product.analysis.isUncertain && product.analysis.uncertainReasons && (
    <StyledView className="mt-3 bg-yellow-50 p-3 rounded-lg">
      <StyledText className="text-amber-800 font-medium mb-1">
        Osäkra ingredienser:
      </StyledText>
      {product.analysis.uncertainReasons.map((reason, index) => (
        <StyledText key={index} className="text-amber-700 ml-2">
          • {reason}
        </StyledText>
      ))}
    </StyledView>
  )}
  
  {/* Rest of the code remains the same */}
  <StyledText 
    className={`mt-2 text-base text-center ${
      product.analysis.isUncertain 
        ? 'text-yellow-700' 
        : (product.analysis.isVegan ? 'text-green-700' : 'text-red-700')
    }`}
  >
    Säkerhet: {Math.round(product.analysis.confidence * 100)}%
  </StyledText>
  
  {/* Analysgrund */}
  <StyledView 
    className={`mt-4 ${
      product.analysis.isUncertain 
        ? 'bg-yellow-50' 
        : (product.analysis.isVegan ? 'bg-green-50' : 'bg-red-50')
    } p-4 rounded-lg`}
  >
    <SafeText 
      value={product.analysis.reasoning} 
      fallback="Ingen analysgrund tillgänglig"
      style={{ 
        color: product.analysis.isUncertain 
          ? '#92400e' // Amber-800
          : (product.analysis.isVegan ? '#166534' : '#991b1b'),
        fontSize: 15,
        lineHeight: 22,
        textAlign: 'center'
      }}
    />
  </StyledView>
</StyledView>
```

### 2. Update the ProductModel Interface

Update the `models/productModel.ts` file to include the new uncertain fields:

```typescript
export interface ProductAnalysis {
  isVegan: boolean;
  isUncertain?: boolean; // New field for uncertain status
  confidence: number;
  watchedIngredients: WatchedIngredient[]; // Ingredients with comments
  reasoning?: string; // Analysis explanation
  detectedLanguage?: string; 
  detectedNonVeganIngredients?: string[];
  uncertainReasons?: string[]; // Reasons for uncertain status
}
```

### 3. Update the IngredientsList Component

Enhance the `IngredientsList` component in `result.tsx` to display uncertain ingredients with a different style:

```typescript
// Add a new reason type to getIngredientStyles
const getIngredientStyles = (ingredient: string) => {
  // Find matching watched ingredient
  const watched = watchedIngredients.find(
    w => w.name.toLowerCase() === ingredient.toLowerCase()
  );
  
  // Determine colors based on status
  let textColor = '#333';
  let bgColor = 'transparent';
  let borderColor = 'transparent';
  
  if (watched) {
    if (watched.reason === 'non-vegan') {
      textColor = '#d32f2f';
      bgColor = '#ffebee';
      borderColor = '#ffcdd2';
    } else if (watched.reason === 'maybe-non-vegan' || watched.reason === 'uncertain') {
      textColor = '#ef6c00';
      bgColor = '#fff3e0';
      borderColor = '#ffe0b2';
    }
  }
  
  return { textColor, bgColor, borderColor };
};
```

### 4. Update the Help Dialog

Update the help dialog content to include information about uncertain ingredients:

```tsx
const helpDialogContent = (
  <StyledView className="p-2">
    <StyledText className="text-lg font-bold mb-4">Om ingrediensanalysen</StyledText>
    
    <StyledText className="text-base mb-2 font-medium">Vad betyder färgerna?</StyledText>
    <StyledView className="mb-4">
      <StyledText>• <StyledText className="text-red-600 font-medium">Röd</StyledText> - Icke-vegansk ingrediens</StyledText>
      <StyledText>• <StyledText className="text-orange-600 font-medium">Orange</StyledText> - Osäker eller potentiellt icke-vegansk ingrediens</StyledText>
      <StyledText>• <StyledText className="text-black">Svart</StyledText> - Vegansk ingrediens</StyledText>
    </StyledView>
    
    <StyledText className="text-base mb-2 font-medium">Osäkra ingredienser</StyledText>
    <StyledText className="mb-4">
      Vissa ingredienser kan vara antingen växtbaserade eller animaliska, 
      beroende på hur de tillverkas. Dessa markeras som "osäkra" i appen. 
      Du kan alltid kontakta tillverkaren för att få mer information.
    </StyledText>
    
    {/* Rest of the help dialog content */}
  </StyledView>
);
```

### 5. Update History Screen

If you have a history screen that shows previous scans, update it to display uncertain products with appropriate styling:

```tsx
// Example item renderer in history list
<StyledView 
  className={`p-4 rounded-lg mb-2 ${
    item.analysis.isUncertain 
      ? 'bg-yellow-50 border border-yellow-200'
      : (item.analysis.isVegan 
          ? 'bg-green-50 border border-green-200' 
          : 'bg-red-50 border border-red-200')
  }`}
>
  <StyledText className="text-lg font-semibold">
    {item.metadata.name || 'Produkt'}
  </StyledText>
  
  <StyledView className="flex-row items-center mt-1">
    <StyledView 
      className={`px-2 py-1 rounded-full ${
        item.analysis.isUncertain 
          ? 'bg-yellow-100' 
          : (item.analysis.isVegan ? 'bg-green-100' : 'bg-red-100')
      }`}
    >
      <StyledText 
        className={
          item.analysis.isUncertain 
            ? 'text-yellow-800' 
            : (item.analysis.isVegan ? 'text-green-800' : 'text-red-800')
        }
      >
        {item.analysis.isUncertain 
          ? 'Osäker' 
          : (item.analysis.isVegan ? 'Vegansk' : 'Ej vegansk')}
      </StyledText>
    </StyledView>
  </StyledView>
</StyledView>
```

## Implementation Notes

1. The backend now includes an `isUncertain` flag in the API response along with the traditional `isVegan` flag
2. Products may have `uncertainReasons` which explain why the product is marked as uncertain
3. The uncertainty is often based on ingredients that can be derived from either plant or animal sources
4. The `src/data/uncertain.csv` file contains a list of ingredients that may have uncertain vegan status

## Design Guidelines

- Use amber/yellow colors for uncertain status (similar to the warning color palette)
- Maintain a consistent user experience across the app
- Make sure the uncertainty is clearly communicated to users
- Provide helpful information about why certain ingredients are marked as uncertain

## Testing Recommendations

1. Test with products containing ingredients from `uncertain.csv` 
2. Verify the UI properly displays all three states (vegan, non-vegan, uncertain)
3. Ensure the transition between states works smoothly
4. Test with products that have multiple uncertain ingredients
5. Verify that the reasoning and uncertainty explanations are displayed correctly

By implementing these changes, KoaLens will provide users with more nuanced information about product ingredients, helping them make more informed decisions about the food they consume.
