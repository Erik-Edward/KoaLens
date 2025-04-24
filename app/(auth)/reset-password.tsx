import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { Alert as CustomAlert } from '../../utils/alertUtils';
import { useAuth } from '../../providers/AuthProvider';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();

  const updatePassword = async () => {
    Keyboard.dismiss();
    if (password !== confirmPassword) {
      CustomAlert.alert('Fel', 'Lösenorden matchar inte.', undefined, 'error');
      return;
    }
    if (password.length < 8) {
      CustomAlert.alert('Fel', 'Lösenordet måste vara minst 8 tecken långt.', undefined, 'error');
      return;
    }

    setLoading(true);
    console.log('ResetPasswordScreen: Försöker uppdatera lösenord...');
    
    try {
      // Använd Supabase för att uppdatera lösenordet
      const { error } = await supabase.auth.updateUser({ password: password });

      if (error) {
        console.error('ResetPasswordScreen: Fel vid lösenordsuppdatering:', error);
        CustomAlert.alert('Fel', `Kunde inte uppdatera lösenord: ${error.message}`, undefined, 'error');
      } else {
        console.log('ResetPasswordScreen: Lösenordet uppdaterades framgångsrikt!');
        CustomAlert.alert(
          'Lösenord uppdaterat',
          'Ditt lösenord har ändrats. Du kan nu logga in med ditt nya lösenord.',
          [
            { 
              text: 'OK', 
              onPress: () => router.replace('/(tabs)') 
            }
          ],
          'success'
        );
      }
    } catch (err) {
      console.error('ResetPasswordScreen: Oväntat fel vid lösenordsuppdatering:', err);
      CustomAlert.alert('Fel', 'Ett oväntat fel inträffade. Försök igen senare.', undefined, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    console.log('ResetPasswordScreen: Användaren avbröt lösenordsåterställning');
    setLoading(true);
    try {
      // Logga ut användaren först för att säkerställa att de inte förblir inloggade med temporära token
      await signOut();
      console.log('ResetPasswordScreen: Utloggning genomförd, navigerar till login');
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('ResetPasswordScreen: Fel vid utloggning:', error);
      // Även vid fel försöker vi navigera tillbaka till login
      router.replace('/(auth)/login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar style="light" />
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.formContainer}>
          <Text style={styles.title}>Återställ lösenord</Text>
          <Text style={styles.subtitle}>
            Ange ditt nya lösenord nedan.
          </Text>

          {/* New Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Nytt lösenord</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#ffffff" />
              <TextInput
                style={styles.input}
                placeholder="Minst 8 tecken"
                placeholderTextColor="#9ca3af"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
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

          {/* Confirm Password Input */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Bekräfta lösenord</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="lock-closed-outline" size={20} color="#ffffff" />
              <TextInput
                style={styles.input}
                placeholder="Bekräfta nytt lösenord"
                placeholderTextColor="#9ca3af"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.showPasswordButton}
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons 
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} 
                  size={24} 
                  color="#9ca3af" 
                />
              </TouchableOpacity>
            </View>
          </View>

          {password && confirmPassword && password !== confirmPassword && (
            <Text style={styles.matchError}>Lösenorden matchar inte</Text>
          )}

          {/* Submit Button */}
          <TouchableOpacity
            style={[
              styles.button,
              (loading || !password || !confirmPassword || password !== confirmPassword) && styles.buttonDisabled,
            ]}
            onPress={updatePassword}
            disabled={loading || !password || !confirmPassword || password !== confirmPassword}
          >
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Uppdatera lösenord</Text>
            )}
          </TouchableOpacity>

           {/* Cancel Button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            disabled={loading}
          >
            <Text style={styles.cancelButtonText}>Avbryt</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

// Styles similar to LoginScreen for consistency
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#25292e',
  },
  safeArea: {
    flex: 1,
    justifyContent: 'center',
  },
  formContainer: {
    marginHorizontal: 24,
    padding: 24,
    backgroundColor: '#1f2937', 
    borderRadius: 12,
    gap: 20, // Lite mer luft mellan elementen
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
    color: '#d1d5db',
    textAlign: 'center',
    marginBottom: 16,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    fontSize: 16,
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
    paddingRight: 40,
  },
  showPasswordButton: {
    position: 'absolute',
    right: 16,
    padding: 5,
  },
  matchError: {
    color: Colors.error, // Använd en definierad färg
    fontSize: 14,
    textAlign: 'center',
    marginTop: -10, // Positionera närmare fälten
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8, // Minskat marginal
  },
  buttonDisabled: {
    backgroundColor: '#6b7280', // Tydligare disabled-färg
  },
  buttonText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 18,
  },
  cancelButton: {
    padding: 10, // Mindre padding än huvudknappen
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#60a5fa',
    fontFamily: 'PlusJakartaSans-Medium',
    fontSize: 14,
  },
}); 