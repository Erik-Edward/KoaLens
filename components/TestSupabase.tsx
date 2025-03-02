// components/TestSupabase.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { supabase } from '@/lib/supabase';
import { styled } from 'nativewind';

const StyledView = styled(View);
const StyledText = styled(Text);
const StyledPressable = styled(Pressable);

export default function TestSupabase() {
  const [info, setInfo] = useState<string>('Tryck på knappen för att testa Supabase');
  const [error, setError] = useState<string | null>(null);
  const [platform, setPlatform] = useState<string>('');
  
  useEffect(() => {
    // Identifiera plattformen som körs
    setPlatform(`Running on: ${Platform.OS}`);
  }, []);

  const handleTestSupabase = async () => {
    try {
      setInfo('Testar Supabase anslutning...');
      setError(null);
      
      // Försök hämta ett anonymt session-id för att verifiera att Supabase fungerar
      const { data, error: authError } = await supabase.auth.getSession();
      
      if (authError) {
        throw authError;
      }
      
      // Skapa ett formaterat resultat
      const result = {
        hasSession: !!data.session,
        isAuthenticated: !!data.session?.user,
        platform: Platform.OS
      };
      
      setInfo(`Test lyckades:\n${JSON.stringify(result, null, 2)}`);
    } catch (err) {
      console.error('Supabase test error:', err);
      setError(`Test misslyckades: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  return (
    <StyledView className="p-4 bg-background-light/30 rounded-lg">
      <StyledText className="text-text-primary font-sans-bold text-lg mb-2">
        Supabase Test
      </StyledText>
      
      <StyledText className="text-text-secondary font-sans mb-4">
        {platform}
      </StyledText>
      
      <StyledPressable
        onPress={handleTestSupabase}
        className="bg-primary px-4 py-3 rounded-lg items-center mb-4"
      >
        <StyledText className="text-text-inverse font-sans-medium">
          Testa Supabase
        </StyledText>
      </StyledPressable>
      
      <StyledView className="bg-background-dark/50 p-3 rounded-lg">
        <StyledText className="text-text-primary font-sans">
          {info}
        </StyledText>
        
        {error && (
          <StyledText className="text-status-error font-sans-medium mt-2">
            {error}
          </StyledText>
        )}
      </StyledView>
    </StyledView>
  );
}