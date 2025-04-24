import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Switch, ScrollView, Pressable, Modal } from 'react-native';
import { Stack } from 'expo-router';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/stores/useStore';
import { useShallow } from 'zustand/react/shallow';
// import { useHydration } from '@/hooks/useHydration'; // Removed hydration dependency
import theme from '@/constants/theme';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisService } from '@/services/analysisService';
import { WatchedIngredient, IngredientCategory } from '@/types/settingsTypes';

// Language preference storage key
const LANGUAGE_STORAGE_KEY = 'KOALENS_LANGUAGE_PREFERENCE';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);

export default function SettingsScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  const watchedIngredients = useStore(useShallow(state => 
    state.preferences?.watchedIngredients || {}
  )) as { [key: string]: WatchedIngredient };
  
  // --- DEBUG LOG --- 
  console.log("SettingsScreen - Watched Ingredients from Store:", JSON.stringify(watchedIngredients, null, 2));
  // --------------- 

  const toggleWatchedIngredient = useStore(state => state.toggleWatchedIngredient);
  // const resetPreferences = useStore(state => state.resetPreferences); // Reset function removed
  
  // --- TEMPORARY RESET LOGIC REMOVED --- 
  /*
  useEffect(() => {
      if (watchedIngredients.palmolja && watchedIngredients.palmolja.keywords === undefined) {
          console.log("!!! Old settings data (missing keywords) detected, resetting preferences !!!");
          resetPreferences();
      }
  }, [watchedIngredients, resetPreferences]);
  */
  // -----------------------------------

  // Group ingredients by category and sub-category for Allergens
  const groupedIngredients = useMemo(() => {
    // Define which keys belong to the Nuts & Seeds subcategory
    const nutSeedKeys = ['jordnot', 'mandel', 'hasselnöt', 'valnöt', 'cashewnöt', 'pistagenöt', 'sesamfrö'];
    
    // Initial grouping structure 
    type GroupedStructure = { 
        [key in IngredientCategory]?: 
            | { key: string, ingredient: WatchedIngredient }[] // Standard list for other categories
            | { // Specific structure for Allergens
                'Övriga Allergener': { key: string, ingredient: WatchedIngredient }[];
                'Nötter & Frön': { key: string, ingredient: WatchedIngredient }[];
              }
    };

    const groups: GroupedStructure = {};

    Object.entries(watchedIngredients).forEach(([key, ingredient]) => {
        const category = ingredient.category;
        
        if (category === 'Allergener & Intoleranser') {
            // Initialize allergen sub-groups if they don't exist
            if (!groups[category]) {
                 groups[category] = { 'Övriga Allergener': [], 'Nötter & Frön': [] };
            }
            // Type assertion to access sub-groups safely
            const allergenGroups = groups[category] as { 'Övriga Allergener': any[], 'Nötter & Frön': any[] };

            if (nutSeedKeys.includes(key)) {
                allergenGroups['Nötter & Frön'].push({ key, ingredient });
            } else {
                allergenGroups['Övriga Allergener'].push({ key, ingredient });
            }
        } else {
            // Handle other categories normally
            if (!groups[category]) {
                groups[category] = [];
            }
             // Type assertion to handle the array case
            (groups[category] as { key: string, ingredient: WatchedIngredient }[]).push({ key, ingredient });
        }
    });
    
    const categoryOrder: IngredientCategory[] = ['Allergener & Intoleranser', 'Hälsa & Kost', 'Miljö & Etik'];
    
    const sortedGroups = categoryOrder.reduce((acc, categoryName) => {
        if (groups[categoryName]) {
            acc[categoryName] = groups[categoryName];
        }
        return acc;
    }, {} as GroupedStructure);
    
    console.log("SettingsScreen - Grouped Ingredients Result:", JSON.stringify(sortedGroups, null, 2));

    return sortedGroups;
  }, [watchedIngredients]);
  
  const handleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <>
      <Stack.Screen 
        options={{
          title: "Inställningar",
          headerStyle: {
            backgroundColor: theme.colors.background.dark,
          },
          headerTintColor: theme.colors.text.primary,
        }} 
      />
      
      <StyledScrollView className="flex-1 bg-background-main">
        <StyledView className="px-4 pt-4">
          <StyledView className="mb-3">
            <StyledText className="text-text-primary font-sans-semibold text-lg mb-2">
              Bevakade ingredienser
            </StyledText>
            <StyledText className="text-text-secondary font-sans text-sm">
              Markera ingredienser du vill hålla extra koll på i dina analyser
            </StyledText>
          </StyledView>

          {Object.entries(groupedIngredients).map(([category, categoryData]) => (
            <StyledView key={category} className="mb-5">
              {/* Main Category Header */}
              <StyledText className="text-base font-semibold text-gray-400 mb-3 border-b border-gray-700 pb-1">
                {category}
              </StyledText>

              {/* Render based on category structure */}
              {category === 'Allergener & Intoleranser' && typeof categoryData === 'object' && !Array.isArray(categoryData) ? (
                  // --- Render Allergen Sub-groups --- 
                  <>
                    {/* Disclaimer first */}
                    <StyledView className="mb-3 px-2 py-2 bg-red-800/20 border border-red-600/30 rounded-md">
                      <StyledView className="flex-row items-start space-x-2">
                        <Ionicons name="warning-outline" size={16} color={theme.colors.status.error} className="mt-0.5"/>
                        <StyledText className="text-xs text-red-300/90 flex-1">
                          <StyledText className="font-bold">Viktigt:</StyledText> Denna funktion är ett hjälpmedel, inte en garanti. Kontrollera <StyledText className="italic">alltid</StyledText> produktens officiella ingrediensförteckning vid allergier/intoleranser. Appen kan innehålla fel.
                        </StyledText>
                      </StyledView>
                    </StyledView>

                    {/* Render 'Övriga Allergener' */}
                    <StyledView className="space-y-3 mb-4">
                       {(categoryData['Övriga Allergener'] || []).map(({ key, ingredient }) => (
                         <IngredientRow 
                           key={key} 
                           itemKey={key} 
                           ingredient={ingredient} 
                           expandedId={expandedId} 
                           handleExpand={handleExpand} 
                           toggleWatchedIngredient={toggleWatchedIngredient} 
                         />
                       ))}
                     </StyledView>

                    {/* Render 'Nötter & Frön' Sub-header and list */}
                    {categoryData['Nötter & Frön'] && categoryData['Nötter & Frön'].length > 0 && (
                         <StyledView className="mb-4"> 
                            <StyledText className="text-sm font-semibold text-gray-500 mb-2 ml-1">
                                Nötter & Frön
                            </StyledText>
                            <StyledView className="space-y-3">
                                {categoryData['Nötter & Frön'].map(({ key, ingredient }) => (
                                     <IngredientRow 
                                       key={key} 
                                       itemKey={key} 
                                       ingredient={ingredient} 
                                       expandedId={expandedId} 
                                       handleExpand={handleExpand} 
                                       toggleWatchedIngredient={toggleWatchedIngredient} 
                                     />
                                ))}
                            </StyledView>
                         </StyledView>
                     )}
                  </>
              ) : (
                 // --- Render Standard Category List (Hälsa & Kost, Miljö & Etik) --- 
                 <StyledView className="space-y-3">
                    {(Array.isArray(categoryData) ? categoryData : []).map(({ key, ingredient }) => (
                         <IngredientRow 
                           key={key} 
                           itemKey={key} 
                           ingredient={ingredient} 
                           expandedId={expandedId} 
                           handleExpand={handleExpand} 
                           toggleWatchedIngredient={toggleWatchedIngredient} 
                         />
                    ))}
                </StyledView>
              )}
            </StyledView>
          ))}

          <StyledView className="mt-6 bg-background-light/20 rounded-lg p-4 mb-4">
            <StyledView className="flex-row space-x-3">
              <Ionicons 
                name="information-circle-outline" 
                size={20} 
                color="#9ca3af" 
              />
              <StyledText className="text-text-secondary font-sans text-sm flex-1">
                Markerade ingredienser visas i analysresultatet för din kännedom. 
                Detta påverkar inte det övergripande resultatet om produkten är 
                vegansk eller inte.
              </StyledText>
            </StyledView>
          </StyledView>
        </StyledView>
      </StyledScrollView>
    </>
  );
} 

// --- Extracted Ingredient Row Component --- 
// To avoid repeating the JSX for rendering each ingredient row
const IngredientRow = ({ itemKey, ingredient, expandedId, handleExpand, toggleWatchedIngredient }: {
    itemKey: string;
    ingredient: WatchedIngredient;
    expandedId: string | null;
    handleExpand: (id: string) => void;
    toggleWatchedIngredient: (key: string) => void;
}) => {
    return (
        <StyledView className="bg-background-light/30 rounded-lg p-4">
            <StyledView className="flex-row items-center justify-between">
                <StyledView className="flex-1 pr-2">
                    <StyledText className="text-text-primary font-sans-medium capitalize">
                        {ingredient.name}
                    </StyledText>
                </StyledView>
                
                <StyledView className="flex-row items-center space-x-3">
                    <Switch
                        value={ingredient.enabled}
                        onValueChange={() => toggleWatchedIngredient(itemKey)}
                        trackColor={{ false: '#3a3f44', true: '#ffd33d' }}
                        thumbColor={ingredient.enabled ? '#ffffff' : '#cccccc'}
                        style={{ transform: [{ scaleX: .8 }, { scaleY: .8 }] }}
                    />
                    <StyledPressable 
                        onPress={() => handleExpand(itemKey)} 
                        hitSlop={10}
                    >
                        <Ionicons 
                            name={expandedId === itemKey ? "information-circle" : "information-circle-outline"} 
                            size={24}
                            color={theme.colors.primary.DEFAULT}
                        />
                    </StyledPressable>
                </StyledView>
            </StyledView>
            
            {expandedId === itemKey && (
                <StyledView className="mt-3 bg-background-light/20 rounded p-3">
                    <StyledText className="text-text-secondary font-sans text-sm">
                        {ingredient.description}
                    </StyledText>
                </StyledView>
            )}
        </StyledView>
    );
}; 