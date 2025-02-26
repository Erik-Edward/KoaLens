// app/(auth)/register.tsx
import { View, Text, TextInput, StyleSheet, Pressable, Alert } from 'react-native';
import { useState } from 'react';
import { useAuth } from '../../providers/AuthProvider';
import { Link, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '@/stores/useStore';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signUp, loading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Fel', 'Vänligen fyll i alla fält');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Fel', 'Lösenorden matchar inte');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Fel', 'Lösenordet måste vara minst 6 tecken långt');
      return;
    }

    // Kontrollera att onboarding har slutförts
    const onboardingCompleted = useStore.getState().onboarding.hasCompletedOnboarding;
    const avatarSelected = useStore.getState().avatar.id !== null;
    const veganStatusSet = useStore.getState().veganStatus.status !== null;
    
    if (!onboardingCompleted || !avatarSelected || !veganStatusSet) {
      Alert.alert(
        'Ofullständig profil',
        'Du behöver slutföra onboarding och välja en avatar innan du kan registrera dig.',
        [
          { 
            text: 'Gå till onboarding', 
            onPress: () => router.replace('/(onboarding)') 
          },
          { 
            text: 'Avbryt', 
            style: 'cancel' 
          }
        ]
      );
      return;
    }

    setIsSubmitting(true);
    try {
      // Använd await på signUp direkt
      const { data, error } = await signUp(email, password);
      
      if (error) {
        Alert.alert('Registreringsfel', error.message);
        return;
      }
      
      if (!data?.session) {
        // Om vi inte får en session betyder det vanligtvis att e-postverifiering krävs
        Alert.alert(
          'Verifiera din e-post',
          'Ett verifieringsmail har skickats till din e-postadress. Klicka på länken i mailet för att verifiera ditt konto.',
          [
            { 
              text: 'OK',
              onPress: () => {
                // Navigera till login med flaggan registered=true och e-postadressen
                router.replace({
                  pathname: '/(auth)/login',
                  params: { 
                    registered: 'true',
                    email: encodeURIComponent(email)
                  }
                });
              }
            }
          ]
        );
      } else {
        // Om vi får en session betyder det att användaren är inloggad direkt
        Alert.alert(
          'Konto skapat',
          'Ditt konto har skapats och du är nu inloggad.',
          [{ text: 'OK' }]
        );
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      Alert.alert('Registreringsfel', error?.message || 'Ett fel uppstod vid registrering. Försök igen senare.');
    } finally {
      setIsSubmitting(false);
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
              autoComplete="password-new"
              textContentType="newPassword"
            />
          </View>
          {/* Hjälptext för lösenordskrav */}
          <View style={styles.helpTextContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#9ca3af" />
            <Text style={styles.helpText}>Lösenordet måste vara minst 6 tecken långt</Text>
          </View>
        </View>

        {/* Confirm Password Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Bekräfta lösenord</Text>
          <View style={styles.inputWrapper}>
            <Ionicons name="lock-closed-outline" size={20} color="#ffffff" />
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#9ca3af"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
              autoCapitalize="none"
              autoComplete="password-new"
              textContentType="newPassword"
            />
          </View>
        </View>

        {/* Register Button */}
        <Pressable
          onPress={handleRegister}
          disabled={loading || isSubmitting}
          style={({pressed}) => [
            styles.button,
            (loading || isSubmitting) && styles.buttonDisabled,
            pressed && styles.buttonPressed
          ]}
        >
          <Text style={styles.buttonText}>
            {loading || isSubmitting ? 'Registrerar...' : 'Registrera'}
          </Text>
        </Pressable>

        {/* Login Link */}
        <View style={styles.linkContainer}>
          <Text style={styles.linkText}>Har du redan ett konto?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={styles.linkButton}>Logga in</Text>
            </Pressable>
          </Link>
        </View>
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
  // Nya stilar för hjälptext
  helpTextContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginLeft: 4,
  },
  helpText: {
    marginLeft: 4,
    color: '#9ca3af',
    fontFamily: 'PlusJakartaSans-Regular',
    fontSize: 12,
  },
  button: {
    backgroundColor: '#3B82F6',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonPressed: {
    backgroundColor: '#2563EB',
    transform: [{ scale: 0.98 }],
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
});