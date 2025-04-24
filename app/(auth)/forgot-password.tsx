import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert as RNAlert } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { Alert as CustomAlert } from '../../utils/alertUtils';

// Logging the import
console.log('ForgotPasswordScreen: CustomAlert import loaded');

export default function ForgotPasswordScreen() {
  // Lägg till loggning för att bekräfta att komponenten laddas
  console.log('ForgotPasswordScreen: Komponenten laddas');
  
  useEffect(() => {
    console.log('ForgotPasswordScreen: useEffect körs - komponenten har monterats');
    
    return () => {
      console.log('ForgotPasswordScreen: useEffect cleanup - komponenten avmonteras');
    };
  }, []);
  
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  // Validera email-format
  const validateEmail = (email: string): boolean => {
    // Snabb grundläggande validering
    if (!email || !email.includes('@') || !email.includes('.')) {
      return false;
    }
    
    // Mer omfattande validering med regex
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Funktion för att visa validerings-fel med React Native's inbyggda Alert
  const showValidationError = () => {
    console.log('ForgotPasswordScreen: Visar valideringsfel för e-post');
    RNAlert.alert(
      'Ogiltigt format',
      'Ange en giltig e-postadress med korrekt format.',
      [{ text: 'OK' }]
    );
  };

  // Funktion för att hantera lösenordsåterställning
  const handlePasswordResetRequest = async () => {
    console.log('ForgotPasswordScreen: handlePasswordResetRequest anropad med email:', email);
    
    // Validera e-post på klientsidan
    if (!validateEmail(email)) {
      showValidationError();
      return;
    }
    
    setIsLoading(true);
    try {
      console.log('ForgotPasswordScreen: Anropar supabase.auth.resetPasswordForEmail');
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      
      if (error) {
        console.error('ForgotPasswordScreen: Fel vid återställning:', error);
        
        // Kontrollera om felet handlar om validering av e-postadressen
        if (String(error).toLowerCase().includes('invalid') || 
            String(error).toLowerCase().includes('validate') ||
            String(error).toLowerCase().includes('format')) {
          console.log('ForgotPasswordScreen: Serverfel för e-postvalidering, visar felmeddelande');
          RNAlert.alert(
            'Ogiltigt format',
            'E-postadressen har ett ogiltigt format. Kontrollera att du angett en giltig e-postadress.',
            [{ text: 'OK' }]
          );
        } else {
          // För andra typer av fel visar vi ändå bekräftelsemeddelandetför att inte avslöja om kontot existerar
          console.log('ForgotPasswordScreen: Annat fel, visar generiskt meddelande');
          CustomAlert.alert(
            'Begäran skickad',
            'Om ett konto med den angivna e-postadressen finns, har ett återställningsmail skickats.',
            [{ text: 'OK', onPress: () => router.back() }],
            'info'
          );
        }
      } else {
        // Vid framgång
        console.log('ForgotPasswordScreen: Återställningsförfrågan lyckades, visar bekräftelse');
        CustomAlert.alert(
          'Begäran skickad',
          'Om ett konto med den angivna e-postadressen finns, har ett återställningsmail skickats. Kolla din inkorg (och skräppost).',
          [{ text: 'OK', onPress: () => router.back() }],
          'success'
        );
      }
    } catch (err) {
      console.error('ForgotPasswordScreen: Oväntat fel:', err);
      RNAlert.alert(
        'Ett fel inträffade',
        'Kunde inte skicka begäran om lösenordsåterställning. Försök igen senare.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        <Text style={styles.title}>Glömt lösenord?</Text>
        <Text style={styles.subtitle}>
          Ange din e-postadress nedan så skickar vi en länk för att återställa ditt lösenord.
        </Text>

        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>E-post</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="mail-outline" size={20} color="#ffffff" />
            <TextInput
              style={styles.input}
              placeholder="din@email.com"
              placeholderTextColor="#9ca3af"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
              textContentType="emailAddress"
            />
          </View>
        </View>

        {/* Submit Button */}
        <Pressable
          style={({ pressed }) => [
            styles.button,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={handlePasswordResetRequest}
          disabled={isLoading}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="send-outline" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>
              {isLoading ? 'Skickar...' : 'Skicka återställningslänk'}
            </Text>
          </View>
        </Pressable>

        {/* Back to Login Link */}
        <View style={styles.linkContainer}>
           <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.linkButton}>Tillbaka till inloggning</Text>
            </Pressable>
          </Link>
        </View>
      </View>
    </View>
  );
}

// Styles similar to LoginScreen for consistency
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    padding: 16,
    justifyContent: 'center', // Centrera innehållet
  },
  formContainer: {
    gap: 24,
    backgroundColor: '#1f2937', // Lite mörkare bakgrund för formuläret
    padding: 24,
    borderRadius: 12,
  },
   title: {
    fontSize: 24,
    fontFamily: 'PlusJakartaSans-Bold',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'PlusJakartaSans-Regular',
    color: '#d1d5db', // Ljusare grå
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16, // Något mindre label
    fontFamily: 'PlusJakartaSans-Medium',
    color: '#ffffff',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#374151',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  input: {
    flex: 1,
    marginLeft: 8,
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 16,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  buttonPressed: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 0.98 }],
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 18,
    textAlign: 'center',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16, // Mer utrymme ovanför länken
  },
  linkButton: {
    color: '#60a5fa', // Ljusare blå för länkar
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 16,
  },
}); 