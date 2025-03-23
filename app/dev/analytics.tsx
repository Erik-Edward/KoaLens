/**
 * Testsida för analytics-funktionaliteten
 * Visar och manipulerar användarens analysstatistik
 */

import React, { useState, useCallback } from 'react';
import { 
  View, Text, SafeAreaView, ScrollView, 
  Pressable, ActivityIndicator, Alert 
} from 'react-native';
import { styled } from 'nativewind';
import { Stack, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useCounter } from '../../hooks/useCounter';

// Styled components
const StyledView = styled(View);
const StyledText = styled(Text);
const StyledScrollView = styled(ScrollView);
const StyledPressable = styled(Pressable);
const StyledSafeAreaView = styled(SafeAreaView);

// StatCard komponent för att visa statistik
const StatCard: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  color: string;
}> = ({ title, value, icon, color }) => (
  <StyledView className="bg-background-light rounded-lg p-4 mb-4 shadow-sm">
    <StyledView className="flex-row items-center mb-2">
      <StyledView className={`w-10 h-10 rounded-full items-center justify-center mr-3`} style={{ backgroundColor: `${color}10` }}>
        <Ionicons name={icon as any} size={20} color={color} />
      </StyledView>
      <StyledText className="text-text-primary font-sans-medium">
        {title}
      </StyledText>
    </StyledView>
    <StyledText className="text-text-primary font-sans-bold text-2xl">
      {value}
    </StyledText>
  </StyledView>
);

// ActionButton komponent för att utföra åtgärder
const ActionButton: React.FC<{
  title: string;
  onPress: () => void;
  icon: string;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
}> = ({ title, onPress, icon, color = '#6366f1', disabled = false, loading = false }) => (
  <StyledPressable
    onPress={onPress}
    disabled={disabled || loading}
    className={`rounded-lg p-4 mb-3 flex-row items-center ${
      disabled ? 'bg-gray-200' : 'bg-background-light'
    }`}
  >
    {loading ? (
      <ActivityIndicator size="small" color={color} style={{ marginRight: 12 }} />
    ) : (
      <Ionicons name={icon as any} size={20} color={disabled ? '#9ca3af' : color} style={{ marginRight: 12 }} />
    )}
    <StyledText className={`font-sans-medium ${disabled ? 'text-text-secondary' : 'text-text-primary'}`}>
      {title}
    </StyledText>
  </StyledPressable>
);

// Huvudkomponent
export default function AnalyticsTestScreen() {
  // State
  const [isPerformingAction, setIsPerformingAction] = useState(false);
  
  // Använd counter hook
  const { 
    value, 
    limit, 
    remaining, 
    hasReachedLimit, 
    loading,
    fetchCounter,
    incrementCounter,
    canPerformOperation,
    recordAnalysis,
    checkLimit
  } = useCounter('analysis_count');
  
  // Beräkna statistik för visning
  const usageStatus = {
    total: value,
    limit,
    remaining,
    allowed: !hasReachedLimit
  };

  // Hantera registrering av en ny analys
  const handleRecordAnalysis = useCallback(async () => {
    try {
      setIsPerformingAction(true);
      
      // Kontrollera om användaren kan utföra en analys
      const checkResult = await checkLimit();
      
      if (!checkResult.allowed) {
        Alert.alert(
          'Analysgräns uppnådd',
          checkResult.reason || 'Du har nått din gräns för analyser denna period.',
          [{ text: 'OK' }]
        );
        return;
      }
      
      // Registrera en ny analys
      await recordAnalysis();
      
      Alert.alert('Framgång', 'Ny analys registrerad!');
    } catch (error) {
      console.error('Fel vid registrering av analys:', error);
      Alert.alert('Fel', 'Kunde inte registrera analys');
    } finally {
      setIsPerformingAction(false);
    }
  }, [checkLimit, recordAnalysis]);
  
  // Simulera synkronisering av väntande analyser (finns inte i nya implementationen)
  const handleSyncPendingAnalyses = useCallback(async () => {
    try {
      setIsPerformingAction(true);
      
      // Simulera en synkronisering
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      Alert.alert(
        'Synkronisering klar',
        `0 väntande analyser synkroniserades. (Funktionen är inte längre nödvändig med nya counter-systemet.)`
      );
    } catch (error) {
      console.error('Fel vid synkronisering:', error);
      Alert.alert('Fel', 'Kunde inte synkronisera väntande analyser');
    } finally {
      setIsPerformingAction(false);
    }
  }, []);
  
  // Hantera återgång
  const handleBack = () => {
    router.back();
  };
  
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <StyledSafeAreaView className="flex-1 bg-background-main">
        {/* Header */}
        <StyledView className="p-4 flex-row items-center">
          <StyledPressable
            onPress={handleBack}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="chevron-back" size={24} color="#6366f1" />
          </StyledPressable>
          <StyledText className="text-text-primary font-sans-bold text-lg ml-2">
            Testar Counter
          </StyledText>
        </StyledView>
        
        {loading ? (
          <StyledView className="flex-1 justify-center items-center p-4">
            <ActivityIndicator size="large" color="#6366f1" />
            <StyledText className="text-text-secondary font-sans mt-2">
              Hämtar statistik...
            </StyledText>
          </StyledView>
        ) : (
          <StyledScrollView className="flex-1 px-4">
            <StyledView className="bg-background-light rounded-lg p-4 mb-6 shadow-sm">
              <StyledText className="text-text-primary font-sans-medium mb-2">
                Innevarande period
              </StyledText>
              <StyledView className="flex-row justify-between">
                <StyledView className="items-center">
                  <StyledText className="text-text-primary font-sans-bold text-2xl">
                    {usageStatus?.total || 0}
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-xs">
                    Använda
                  </StyledText>
                </StyledView>
                <StyledView className="items-center">
                  <StyledText className="text-text-primary font-sans-bold text-2xl">
                    {usageStatus?.limit || 0}
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-xs">
                    Max
                  </StyledText>
                </StyledView>
                <StyledView className="items-center">
                  <StyledText className="text-text-primary font-sans-bold text-2xl">
                    {usageStatus?.remaining || 0}
                  </StyledText>
                  <StyledText className="text-text-secondary font-sans text-xs">
                    Återstående
                  </StyledText>
                </StyledView>
              </StyledView>
            </StyledView>
            
            <StatCard
              title="Totalt antal analyser"
              value={usageStatus?.total || 0}
              icon="analytics-outline"
              color="#6366f1"
            />
            
            <StatCard
              title="Status"
              value={hasReachedLimit ? "Gräns nådd" : "Kan användas"}
              icon={hasReachedLimit ? "close-circle-outline" : "checkmark-circle-outline"}
              color={hasReachedLimit ? "#ef4444" : "#10b981"}
            />
            
            <StyledText className="text-text-primary font-sans-medium mb-2 mt-4">
              Åtgärder
            </StyledText>
            
            <ActionButton
              title="Registrera en ny analys"
              onPress={handleRecordAnalysis}
              icon="add-circle-outline"
              loading={isPerformingAction}
            />
            
            <ActionButton
              title="Uppdatera statistik"
              onPress={() => fetchCounter(true)}
              icon="refresh-outline"
              loading={loading}
            />
          </StyledScrollView>
        )}
      </StyledSafeAreaView>
    </>
  );
} 