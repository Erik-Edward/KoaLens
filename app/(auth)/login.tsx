// app/(auth)/login.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, TouchableOpacity } from 'react-native';
import { Link, useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../providers/AuthProvider';
import { Alert } from '../../utils/alertUtils';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  
  // Tillstånd för att hantera vyn för "glömt lösenord"
  const [showForgotPasswordForm, setShowForgotPasswordForm] = useState(false);
  
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
        [{ text: 'OK' }],
        'success'
      );
    }
  }, [verified, emailFromParams]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Fel', 'Var god fyll i både e-post och lösenord.', undefined, 'error');
      return;
    }
    
    setIsLoading(true);
    try {
      // Direkta anropet till Supabase istället för att använda signIn från AuthProvider
      // Detta ger oss tillgång till det direkta felmeddelandet
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        console.error('Login error from Supabase:', error);
        
        // Hantera olika felmeddelanden från Supabase
        let errorMessage = 'Kunde inte logga in. Försök igen.';
        
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'E-postadressen eller lösenordet är felaktigt. Kontrollera dina uppgifter och försök igen.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Din e-post har inte bekräftats. Kontrollera din inkorg för ett verifieringsmail.';
        }
        
        Alert.alert('Inloggningsfel', errorMessage, undefined, 'error');
        return;
      }
      
      // Om ingen error, fortsätt med signIn för att uppdatera appens tillstånd
      if (data.session) {
        await signIn(email, password);
      }
    } catch (error: any) {
      console.error('Login error:', error);
      Alert.alert('Inloggningsfel', 'Ett oväntat fel inträffade. Försök igen senare.', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    // Använd e-postadressen från parametrar om e-postfältet är tomt
    const emailToUse = email || emailFromParams;
    
    if (!emailToUse) {
      Alert.alert('E-post saknas', 'Ange din e-postadress för att skicka ett nytt verifieringsmail.', undefined, 'warning');
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
        Alert.alert('Fel', error.message, undefined, 'error');
      } else {
        Alert.alert('Verifieringsmail skickat', 'Kolla din inkorg och klicka på länken i mailet.', undefined, 'success');
      }
    } catch (error) {
      console.error('Error resending verification email:', error);
      Alert.alert('Fel', 'Kunde inte skicka verifieringsmail', undefined, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Funktion för att hantera begäran om glömt lösenord (visar formuläret)
  const handlePasswordResetRequest = async () => {
    if (!email) {
      Alert.alert('E-post saknas', 'Var god ange din e-postadress.', undefined, 'warning');
      return;
    }

    setIsLoading(true);
    try {
      // Nu använder vi standardflödet utan redirectTo
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) {
        console.error('Error requesting password reset:', error);
      }
      
      // Visa alltid samma meddelande för att inte avslöja om e-posten finns
      Alert.alert(
        'Begäran skickad',
        'Om ett konto med den angivna e-postadressen finns, har ett återställningsmail skickats. Kolla din inkorg (och skräppost).',
        [{ text: 'OK', onPress: () => setShowForgotPasswordForm(false) }],
        'info'
      );
    } catch (err) {
      console.error('Unexpected error during password reset request:', err);
      Alert.alert(
        'Ett fel inträffade',
        'Kunde inte skicka begäran om lösenordsåterställning. Försök igen senare.',
        [{ text: 'OK' }],
        'error'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.formContainer}>
        {!showForgotPasswordForm ? (
          // Vanliga inloggningsformuläret
          <>
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
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  textContentType="password"
                />
                <TouchableOpacity 
                  style={styles.eyeIcon}
                  onPress={() => setShowPassword(!showPassword)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons 
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'} 
                    size={24} 
                    color="#9ca3af" 
                  />
                </TouchableOpacity>
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
            
            {/* Forgot Password Link */}
            <View style={styles.linkContainer}> 
              <Pressable onPress={() => {
                console.log('ForgotPassword knapp klickad - visar inline formulär');
                setShowForgotPasswordForm(true);
              }}>
                <Text style={styles.linkButton}>Glömt lösenord?</Text>
              </Pressable>
            </View>
            
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
          </>
        ) : (
          // Formulär för glömt lösenord
          <>
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
            
            {/* Back Button */}
            <View style={styles.linkContainer}>
              <Pressable onPress={() => setShowForgotPasswordForm(false)}>
                <Text style={styles.linkButton}>Tillbaka till inloggning</Text>
              </Pressable>
            </View>
          </>
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
    paddingRight: 30,
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
  eyeIcon: {
    position: 'absolute',
    right: 16,
    padding: 5,
  },
});