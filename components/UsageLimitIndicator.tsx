// components/UsageLimitIndicator.tsx
import React from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useUsageLimit } from '@/hooks/useUsageLimit';
import { styled } from 'nativewind';
import { Ionicons } from '@expo/vector-icons';

const StyledView = styled(View);
const StyledText = styled(Text);

interface UsageLimitIndicatorProps {
  compact?: boolean; // För att visa en mer kompakt version i headers
}

export function UsageLimitIndicator({ compact = false }: UsageLimitIndicatorProps) {
  const { remaining, analysesLimit, isLoading, isPremium } = useUsageLimit();
  
  if (isLoading) {
    return (
      <StyledView className={compact ? "flex-row items-center" : "p-4 bg-background-light/30 rounded-lg"}>
        <ActivityIndicator size="small" color="#ffd33d" />
      </StyledView>
    );
  }
  
  if (isPremium) {
    return (
      <StyledView className={compact 
        ? "flex-row items-center space-x-1" 
        : "p-4 bg-background-light/30 rounded-lg"
      }>
        <Ionicons name="infinite" size={compact ? 16 : 20} color="#ffd33d" />
        <StyledText className={compact 
          ? "text-primary text-xs font-sans-medium" 
          : "text-primary text-base font-sans-medium"
        }>
          Premium
        </StyledText>
      </StyledView>
    );
  }
  
  // Beräkna status för färgkodning
  const status = 
    remaining === 0 ? 'empty' :
    remaining < 5 ? 'low' :
    'normal';
    
  const statusColors = {
    empty: 'text-status-error',
    low: 'text-status-warning',
    normal: 'text-text-primary'
  };
  
  const iconColors = {
    empty: '#f44336',
    low: '#ff9800',
    normal: '#ffffff'
  };
  
  return (
    <StyledView className={compact 
      ? "flex-row items-center space-x-1" 
      : "p-4 bg-background-light/30 rounded-lg"
    }>
      <Ionicons 
        name="analytics-outline" 
        size={compact ? 16 : 20} 
        color={iconColors[status]} 
      />
      <StyledText className={`${statusColors[status]} ${compact ? "text-xs" : "text-base"} font-sans-medium`}>
        {remaining} / {analysesLimit} analyser kvar
      </StyledText>
    </StyledView>
  );
}