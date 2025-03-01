// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  
  // Hämta URL-parametrar för att se om användaren kommer från verifiering
  const params = useLocalSearchParams();
  const verified = params.verified === 'true';
  // Viktigt: Dekodera e-postadressen om den finns med som parameter
  const emailFromParams = params.email ? decodeURIComponent(params.email as string) : '';
  const justRegistered = params.registered === 'true';
  
  useEffect(() => {
    // Automatiskt fyll i e-postadressen från URL-parametrar
    if (emailFromParams) {
      console.log('Login: Fyller i e-postadress från URL-parametrar:', emailFromParams);
      setEmail(emailFromParams);
    }
    
    // Visa ett välkomstmeddelande om användaren kommer från e-postverifiering
    if (verified) {
      const message = emailFromParams
        ? `Din e-post ${emailFromParams} har verifierats. Ange ditt lösenord för att logga in.`
        : 'Din e-post har verifierats. Ange ditt lösenord för att logga in.';
      
      Alert.alert(
        'E-post verifierad',
        message,
        [{ text: 'OK' }]
      );
    }
  }, [verified, emailFromParams]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fel', 'Var god fyll i både e-post och lösenord.');
      return;
    }
    
    setIsLoading(true);
    try {
      await signIn(email, password);
    } catch (error) {
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    // Använd e-postadressen från parametrar om e-postfältet är tomt
    const emailToUse = email || emailFromParams;
    
    if (!emailToUse) {
      Alert.alert('E-post saknas', 'Ange din e-postadress för att skicka ett nytt verifieringsmail.');
      return;
    }

    setIsLoading(true);
    try {
      console.log('Login: Skickar nytt verifieringsmail till:', emailToUse);
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: emailToUse,
        options: {
          emailRedirectTo: `koalens://login?verified=true&email=${encodeURIComponent(emailToUse)}`
        }
      });

      if (error) {
        Alert.alert('Fel', error.message);
      } else {
        Alert.alert('Verifieringsmail skickat', 'Kolla din inkorg och klicka på länken i mailet.');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      Alert.alert('Fel', 'Kunde inte skicka verifieringsmail');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
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
        {/* Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Lösenord</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#ffffff" />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password"
              textContentType="password"
            />
          </View>
        </View>
        {/* Login Button */}
        <Pressable 
          style={({pressed}) => [
            styles.button,
            pressed && styles.buttonPressed,
            isLoading && styles.buttonDisabled
          ]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          <View style={styles.buttonContent}>
            <Ionicons name="log-in-outline" size={20} color="#ffffff" />
            <Text style={styles.buttonText}>
              {isLoading ? 'Loggar in...' : 'Logga in'}
            </Text>
          </View>
        </Pressable>
        
        {/* Register Link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Har du inte ett konto?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.linkButton}>Registrera</Text>
            </Pressable>
          </Link>
        </View>
        
        {/* Resend verification section - only shown when needed */}
        {(justRegistered || verified || emailFromParams) && (
          <View style={styles.resendContainer}>
            <Text style={styles.resendText}>Fick du inget verifieringsmail?</Text>
            <Pressable onPress={resendVerificationEmail} disabled={isLoading}>
              <Text style={[styles.linkButton, isLoading && styles.disabledText]}>
                Skicka igen
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
    padding: 16,
  },
  formContainer: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 18,
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
    backgroundColor: '#2563EB', // Mörkare blå nyans vid tryck
    transform: [{ scale: 0.98 }], // Lätt skalning för tryckeffekt
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
    gap: 4,
    marginTop: 8,
  },
  linkText: {
    color: '#9ca3af',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  linkButton: {
    color: '#3B82F6',
    fontFamily: 'PlusJakartaSans-Medium',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#374151',
  },
  resendText: {
    color: '#9ca3af',
    fontFamily: 'PlusJakartaSans-Regular',
  },
  disabledText: {
    opacity: 0.7,
  }
});