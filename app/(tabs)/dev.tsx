/**
 * Utvecklingsskärm för testning av nya funktioner
 * Denna skärm visas endast i utvecklingsläge
 */

import React, { useState } from 'react';
import { View, Text, SafeAreaView, ScrollView, Pressable, Alert, Switch } from 'react-native';
import { styled } from 'nativewind';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useStore } from '@/stores/useStore';
import { ProductRepository } from '../../services/productRepository';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);
const StyledSwitch = styled(Switch);

// Test-länkar
const TEST_LINKS = [
  {
    title: 'Historikskärmen',
    description: 'Visa historikskärmen med produkter',
    route: '/(tabs)/(history)/history',
    icon: 'time-outline'
  },
  {
    title: 'Skapa Testprodukter',
    description: 'Skapa testprodukter i nya arkitekturen',
    route: '/dev/create-products',
    icon: 'add-circle-outline'
  },
  {
    title: 'Testa Analytics',
    description: 'Testa analysräknaren och statistikfunktioner',
    route: '/dev/analytics',
    icon: 'analytics-outline'
  },
  {
    title: 'Testa Resultatskärm',
    description: 'Testa den nya analysresultatskärmen med demodata',
    route: '/dev/test-result',
    icon: 'flask-outline'
  }
];

// Verktyg/actions
const TOOLS = [
  {
    title: 'Rensa AsyncStorage',
    description: 'Ta bort all data från AsyncStorage',
    action: 'clear-storage',
    icon: 'trash-outline',
    danger: true
  },
  {
    title: 'Visa användar-ID',
    description: 'Visa ditt anonyma användar-ID',
    action: 'show-user-id',
    icon: 'person-outline',
    danger: false
  },
  {
    title: 'Skapa demoprodukter',
    description: 'Skapa några testprodukter för historiken',
    action: 'create-demo-products',
    icon: 'construct-outline',
    danger: false
  },
  {
    title: 'Fixa UserID för produkter',
    description: 'Lägg till användar-ID på produkter som saknar det',
    action: 'fix-user-id',
    icon: 'build-outline',
    danger: false
  }
];

// Navigation link komponent
const NavLink: React.FC<{
  title: string;
  description: string;
  icon: string;
  onPress: () => void;
  danger?: boolean;
}> = ({ title, description, icon, onPress, danger = false }) => (
  <StyledPressable
    onPress={onPress}
    className={`${danger ? 'bg-status-error/5' : 'bg-background-light'} rounded-lg mb-4 p-4 shadow-sm`}
  >
    <StyledView className="flex-row items-center">
      <StyledView className={`${danger ? 'bg-status-error/10' : 'bg-primary/10'} rounded-full w-10 h-10 items-center justify-center mr-3`}>
        <Ionicons name={icon} size={20} color={danger ? '#ef4444' : '#6366f1'} />
      </StyledView>
      <StyledView className="flex-1">
        <StyledText className={`font-sans-bold text-lg ${danger ? 'text-status-error' : 'text-text-primary'}`}>
          {title}
        </StyledText>
        <StyledText className="text-text-secondary font-sans text-sm">
          {description}
        </StyledText>
      </StyledView>
      <Ionicons name="chevron-forward" size={24} color="#9CA3AF" />
    </StyledView>
  </StyledPressable>
);

// Huvudkomponent
export default function DevScreen() {
  const [creating, setCreating] = useState(false);
  const userId = useStore(state => state.userId);
  
  // Hantera verktygsåtgärder
  const handleToolAction = async (action: string) => {
    switch (action) {
      case 'clear-storage':
        Alert.alert(
          'Rensa AsyncStorage',
          'Är du säker på att du vill rensa all lagrad data? Detta kan inte ångras.',
          [
            {
              text: 'Avbryt',
              style: 'cancel'
            },
            {
              text: 'Rensa',
              style: 'destructive',
              onPress: async () => {
                try {
                  await AsyncStorage.clear();
                  Alert.alert('Klart', 'All data har rensats från AsyncStorage');
                } catch (error) {
                  console.error('Fel vid rensning av AsyncStorage:', error);
                  Alert.alert('Fel', 'Kunde inte rensa data');
                }
              }
            }
          ]
        );
        break;
        
      case 'show-user-id':
        Alert.alert(
          'Användar-ID',
          `Ditt anonyma användar-ID är:\n\n${userId || 'Inte tillgängligt'}`,
          [{ text: 'OK' }]
        );
        break;
        
      case 'create-demo-products':
        if (!userId) {
          Alert.alert('Fel', 'Inget användar-ID tillgängligt. Skapa en användare först.');
          return;
        }
        
        Alert.alert(
          'Skapa demoprodukter',
          'Hur många produkter vill du skapa?',
          [
            { text: 'Avbryt', style: 'cancel' },
            { 
              text: '5 produkter', 
              onPress: () => createDemoProducts(5) 
            },
            { 
              text: '10 produkter', 
              onPress: () => createDemoProducts(10) 
            }
          ]
        );
        break;
        
      case 'fix-user-id':
        if (!userId) {
          Alert.alert('Fel', 'Inget användar-ID tillgängligt. Skapa en användare först.');
          return;
        }
        
        Alert.alert(
          'Fixa UserID för produkter',
          'Detta kommer att lägga till ditt användar-ID på alla produkter som saknar det. Vill du fortsätta?',
          [
            { text: 'Avbryt', style: 'cancel' },
            { 
              text: 'Fortsätt', 
              onPress: () => fixUserIdForProducts(userId) 
            }
          ]
        );
        break;
    }
  };
  
  // Skapa demoprodukter med ProductRepository
  const createDemoProducts = async (count: number) => {
    if (!userId) return;
    
    try {
      setCreating(true);
      const repository = ProductRepository.getInstance();
      const createdCount = await repository.createDemoProducts(userId, count);
      
      Alert.alert(
        'Produkter skapade',
        `${createdCount} produkter har skapats och sparats i historiken.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Fel vid skapande av demoprodukter:', error);
      Alert.alert('Fel', 'Kunde inte skapa demoprodukter');
    } finally {
      setCreating(false);
    }
  };
  
  // Fixa användar-ID för produkter
  const fixUserIdForProducts = async (userId: string) => {
    try {
      const repository = ProductRepository.getInstance();
      
      // Hämta alla produkter
      const allProducts = await repository.getAllProducts();
      
      // Hitta produkter utan användar-ID
      const productsWithoutUserId = allProducts.filter(p => !p.metadata.userId);
      
      if (productsWithoutUserId.length === 0) {
        Alert.alert('Info', 'Inga produkter hittades som saknar användar-ID.');
        return;
      }
      
      // Uppdatera produkter med användar-ID
      let updatedCount = 0;
      for (const product of productsWithoutUserId) {
        const updatedProduct = {
          ...product,
          metadata: {
            ...product.metadata,
            userId
          }
        };
        
        await repository.updateProduct(updatedProduct);
        updatedCount++;
      }
      
      Alert.alert(
        'Klart',
        `Lade till användar-ID på ${updatedCount} produkter.`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Fel vid fixning av användar-ID:', error);
      Alert.alert('Fel', 'Kunde inte uppdatera produkter');
    }
  };

  const navigateToScreen = (path: string) => {
    router.push(path as any);
  };

  return (
    <StyledSafeAreaView className="flex-1 bg-background-main">
      <StyledScrollView className="flex-1 px-4 pt-6">
        <StyledText className="text-2xl font-sans-bold text-text-primary mb-6">
          Utvecklingsverktyg
        </StyledText>
        
        {/* Test-länkar */}
        <StyledText className="text-lg font-sans-bold mb-2">Test-funktioner</StyledText>
        {TEST_LINKS.map((link, index) => (
          <NavLink
            key={index}
            title={link.title}
            description={link.description}
            icon={link.icon}
            onPress={() => navigateToScreen(link.route)}
          />
        ))}
        
        {/* Verktyg */}
        <StyledText className="text-lg font-sans-bold mt-6 mb-2">Verktyg</StyledText>
        {TOOLS.map((tool, index) => (
          <NavLink
            key={index}
            title={tool.title}
            description={tool.description}
            icon={tool.icon}
            danger={tool.danger}
            onPress={() => handleToolAction(tool.action)}
          />
        ))}
        
        {/* Debug-information */}
        <StyledView className="mt-8 mb-20 p-4 bg-background-light rounded-lg">
          <StyledText className="text-lg font-sans-bold mb-2">Debug-information</StyledText>
          <StyledText className="text-text-secondary">Användar-ID: {userId || 'ej inloggad'}</StyledText>
          <StyledText className="text-text-secondary mt-1">Version: {process.env.NODE_ENV === 'development' ? 'Utveckling' : 'Produktion'}</StyledText>
        </StyledView>
      </StyledScrollView>
    </StyledSafeAreaView>
  );
} 