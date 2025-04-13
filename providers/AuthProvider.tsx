// providers/AuthProvider.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { Session, AuthError, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Alert, AppState } from 'react-native'
import { router, useRouter, useSegments } from 'expo-router'
import { useStore } from '@/stores/useStore'
import * as Linking from 'expo-linking';
import { FirstLoginOverlay } from '@/components/FirstLoginOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setUserContext, clearUserContext, captureException, addBreadcrumb } from '@/lib/sentry';
import { ProductRepository } from '@/services/productRepository'
import { AvatarStyle } from '@/stores/slices/createAvatarSlice'
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice'
import * as SecureStore from 'expo-secure-store';
import { useRootNavigation } from 'expo-router';
import * as Sentry from '@sentry/react-native'
import { SupabaseHelper, UserProfile } from '../lib/supabase/supabase.service'
import { userSlice } from '../state/userSlice/user.slice'
import { veganStatusSlice } from '../state/veganStatusSlice/veganStatusSlice'
import { LoadingState } from '../types/loading'
import { DateTime } from 'luxon'
import { getStatusFromSupporterType } from '../utils/userProfile'

interface SignUpResult {
  data: {
    user: User | null;
    session: Session | null;
  } | null;
  error: AuthError | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  loading: boolean;
  loadingState: LoadingState;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  isInPasswordResetFlow: boolean;
  profile: UserProfile | null;
  anonymousSessionId: string | null;
  resendConfirmation: (email: string) => Promise<{
    success: boolean;
    error: any | null;
  }>;
  updateProfile: (
    data: Partial<UserProfile>
  ) => Promise<{ success: boolean; error: any | null }>;
  getNewNotificationsList: () => Promise<string[]>;
  isNavigatingToReset: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingState, setLoadingState] = useState<LoadingState>(LoadingState.LOADING)
  const [showFirstLoginOverlay, setShowFirstLoginOverlay] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const segments = useSegments();
  const router = useRouter();
  const rootNavigation = useRootNavigation();
  
  // Lägg till en räknare för att begränsa initialiseringar
  const initCountRef = useRef<number>(0);
  // Lägg till en flagga för att spåra om komponenten är monterad
  const isMountedRef = useRef<boolean>(false);
  const isNavigatingToResetPasswordRef = useRef<boolean>(false);

  // Markera komponenten som monterad i första render
  useEffect(() => {
    isMountedRef.current = true;
    
    // Cleanup vid unmount
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Hjälpfunktion för att markera onboarding som slutförd - använd useCallback för att memoizera
  const markOnboardingAsCompleted = useCallback(async () => {
    if (!isMountedRef.current) return false;
    
    const store = useStore.getState();
    if (!store.onboarding.hasCompletedOnboarding) {
      console.log('AuthProvider: Setting onboarding as completed');
      await store.setOnboardingCompleted(true);
      return true;
    }
    return false;
  }, []);

  // Uppdatera store med användardata när vi har en session - använd useCallback för att memoizera
  const updateStoreWithUserData = useCallback(async (userData: User | null) => {
    if (!isMountedRef.current) return;
    
    if (!userData) {
      console.log('AuthProvider: Inget användar-objekt att uppdatera store med');
      return;
    }
    
    const store = useStore.getState();
    console.log('AuthProvider: Uppdaterar store med användardata', {
      userId: userData.id,
      email: userData.email,
      hasMetadata: !!userData.user_metadata
    });
    
    // Uppdatera användar-ID direkt i userSlice
    try {
      await AsyncStorage.setItem('@koalens:user_id', userData.id);
      store.initializeUser();
      console.log(`AuthProvider: Sparade Supabase användar-ID ${userData.id} i AsyncStorage`);
    } catch (error) {
      console.error('AuthProvider: Kunde inte spara användar-ID:', error);
      captureException(error instanceof Error ? error : new Error('Failed to save user ID'));
    }
    
    // Uppdatera auth-slice
    store.login(userData as any, userData.id);
    console.log('AuthProvider: Store uppdaterad med användardata');
  }, []);
  
  // Lägg till detta i useEffect för sessionshantering, efter att vi uppdaterat session och user:
  useEffect(() => {
    if (user) {
      console.log('AuthProvider: User state uppdaterad, synkar med store');
      updateStoreWithUserData(user);
    }
  }, [user, updateStoreWithUserData]);

  // Lyssna på djuplänkar - placera denna useEffect EFTER updateStoreWithUserData deklarationen
  useEffect(() => {
    // Begränsa antal initialiseringar för att undvika oändliga loopar
    initCountRef.current += 1;
    if (initCountRef.current > 2) {
      console.log(`AuthProvider: Skipping deep link listener initialization (count: ${initCountRef.current})`);
      return;
    }
    
    console.log('AuthProvider: Lyssnar på deep links');
    
    // Funktion för att hantera deep links
    const handleDeepLink = async (event: { url: string }) => {
      console.log('[handleDeepLink] Handling deep link:', event.url);
      
      // NYTT: Hantera lösenordsåterställningslänkar (PKCE-flöde)
      if (event.url.includes('type=recovery')) {
        console.log('AuthProvider: Password reset deep link detected (type=recovery)');
        
        // Extrahera tokens från URL-fragmentet (#)
        let accessToken = null;
        let refreshToken = null;
        
        if (event.url.includes('#')) {
          const hashParams = new URLSearchParams(event.url.split('#')[1]);
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
        }
        
        if (accessToken && refreshToken) {
          console.log('AuthProvider: Found tokens in URL fragment, attempting to set session...');
          try {
            // Sätt ref FÖRE setSession
            isNavigatingToResetPasswordRef.current = true;
            console.log('AuthProvider: Setting isNavigatingToResetPasswordRef to true');
            
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            
            if (sessionError) {
              console.error('AuthProvider: Error setting session from recovery link:', sessionError);
              Alert.alert('Fel', 'Kunde inte verifiera återställningslänken. Försök igen eller begär en ny länk.');
              isNavigatingToResetPasswordRef.current = false; // Återställ vid fel
              router.replace('/(auth)/login'); // Skicka till login vid fel
            } else {
              console.log('AuthProvider: Session set successfully from recovery link. Navigating to reset password screen.');
              
              // Navigera till den dedikerade reset-password skärmen
              if (rootNavigation?.isReady()) {
                 router.replace('/(auth)/reset-password');
              } else {
                 console.log('AuthProvider: Navigation not ready, scheduling redirect to reset-password');
                 // Schemalägg navigering när navigation blir redo
                 const unsubscribe = rootNavigation?.addListener('state', () => {
                    if (rootNavigation?.isReady()) {
                       router.replace('/(auth)/reset-password');
                       unsubscribe?.();
                    }
                 });
              }
              // Återställ ref efter en kort stund så att AuthLayout hinner reagera
              setTimeout(() => {
                 isNavigatingToResetPasswordRef.current = false;
                 console.log('AuthProvider: Resetting isNavigatingToResetPasswordRef to false');
              }, 1000); // 1 sekund bör räcka
            }
          } catch (err) {
            console.error('AuthProvider: Unexpected error setting session from recovery link:', err);
            Alert.alert('Fel', 'Ett oväntat fel inträffade. Försök igen.');
            isNavigatingToResetPasswordRef.current = false; // Återställ vid fel
            router.replace('/(auth)/login');
          }
        } else {
          console.warn('AuthProvider: Recovery link detected but no tokens found in fragment.');
          Alert.alert('Fel', 'Ogiltig återställningslänk. Saknar nödvändig information.');
          router.replace('/(auth)/login');
        }
        return; // Avsluta hanteringen här för recovery-länkar
      }
      
      // Hantera felmeddelanden i länken (vanligtvis utgångna länkar)
      if (event.url.includes('error=') && (event.url.includes('error_code=otp_expired') || event.url.includes('error_code=access_denied'))) {
        console.log('AuthProvider: Error detected in deep link - expired or invalid link');
        
        // Markera onboarding som slutförd ändå
        await markOnboardingAsCompleted();
        
        // Visa felmeddelande till användaren och dirigera till login
        Alert.alert(
          'Verifieringslänk utgången',
          'Länken för att verifiera din e-post har gått ut. Vänligen logga in med ditt lösenord.',
          [{ text: 'OK' }]
        );
        
        router.replace('/(auth)/login');
        return;
      }
      
      // Autentiseringslänk från Supabase innehåller access_token
      if (event.url.includes('access_token') && event.url.includes('type=signup')) {
        console.log('AuthProvider: Verification deep link detected with token');
        
        // Sätt onboarding som slutförd omedelbart vid djuplänk
        await markOnboardingAsCompleted();
        
        try {
          // NYTT: Försök extrahera e-postadressen direkt från token
          // JWT-token är i formatet: xxxxx.PAYLOAD.xxxxx
          // Vi behöver extrahera och dekodera PAYLOAD-delen
          
          let email = null;
          
          // Extrahera access_token från URL
          const tokenMatch = event.url.match(/access_token=([^&]+)/);
          if (tokenMatch && tokenMatch[1]) {
            const accessToken = tokenMatch[1];
            console.log('AuthProvider: Found access token in URL');
            
            // Dela upp JWT i delar
            const tokenParts = accessToken.split('.');
            if (tokenParts.length === 3) {
              // Base64-dekodera payload-delen (del 2)
              try {
                // Konvertera base64url till standard base64
                const base64 = tokenParts[1]
                  .replace(/-/g, '+')
                  .replace(/_/g, '/');
                  
                // Dekodera base64 till en sträng och parsa som JSON
                const decodedPayload = JSON.parse(
                  decodeURIComponent(
                    atob(base64)
                      .split('')
                      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                      .join('')
                  )
                );
                
                // Extrahera e-postadressen från payload
                if (decodedPayload.email) {
                  email = decodedPayload.email;
                  console.log('AuthProvider: Successfully extracted email from token:', email);
                }
              } catch (error) {
                console.error('AuthProvider: Error decoding JWT payload:', error);
                // Lägg till Sentry-rapportering
                captureException(error instanceof Error ? error : new Error('Failed to decode JWT'));
              }
            }
          }
          
          // Försök refresha sessionen som tidigare
          console.log('AuthProvider: Attempting to refresh session with token');
          const { data: sessionData, error: refreshError } = await supabase.auth.refreshSession();
          
          if (refreshError) {
            console.error('AuthProvider: Error refreshing session:', refreshError);
            captureException(refreshError);
            
            // Om det finns en e-postadress, använd den ändå
            if (email) {
              console.log('AuthProvider: Using extracted email despite refresh error');
              router.replace({
                pathname: '/(auth)/login',
                params: { 
                  verified: 'true', 
                  email: encodeURIComponent(email)
                }
              });
            } else {
              router.replace('/(auth)/login?verified=true');
            }
            return;
          }
          
          const { session } = sessionData;
          
          if (session) {
            console.log('AuthProvider: Session refreshed after verification', { userId: session.user.id });
            setSession(session);
            setUser(session.user);
            
            // Uppdatera store med användardata
            await updateStoreWithUserData(session.user);
            
            // Sätt användarkontext i Sentry
            setUserContext(session.user.id, session.user.email || undefined);
            addBreadcrumb('User verified email', 'auth');
            
            // Om vi fick en e-postadress från token, använd den
            // Annars fall tillbaka på session.user.email om det finns
            const emailToUse = email || session.user?.email;
            
            // Navigera till login med e-postadressen
            if (emailToUse) {
              console.log('AuthProvider: Redirecting to login with email:', emailToUse);
              router.replace({
                pathname: '/(auth)/login',
                params: { 
                  verified: 'true', 
                  email: encodeURIComponent(emailToUse)
                }
              });
            } else {
              console.log('AuthProvider: No email found in session, redirecting to login');
              router.replace('/(auth)/login?verified=true');
            }
          } else {
            // Om vi inte kunde refresha sessionen men har e-postadressen från token
            if (email) {
              console.log('AuthProvider: No valid session but email extracted from token:', email);
              router.replace({
                pathname: '/(auth)/login',
                params: { 
                  verified: 'true', 
                  email: encodeURIComponent(email)
                }
              });
            } else {
              console.log('AuthProvider: No valid session and no email, redirecting to login');
              router.replace('/(auth)/login?verified=true');
            }
          }
          
        } catch (error) {
          console.error('AuthProvider: Error handling deep link:', error);
          // Lägg till Sentry-rapportering
          captureException(error instanceof Error ? error : new Error('Deep link error'));
          router.replace('/(auth)/login?verified=true');
        }
      }
    };

    // Lyssna på djuplänkar
    const subscription = Linking.addEventListener('url', handleDeepLink);
    
    // Kontrollera initialt URL när appen öppnas
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('AuthProvider: Initial URL detected:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
      console.log('AuthProvider: Städar upp deep link lyssnare');
    };
  }, [updateStoreWithUserData, markOnboardingAsCompleted]);

  // Lyssna på route-ändringar indirekt via en timer
  useEffect(() => {
    // Kontrollera periodiskt för djuplänkar
    const checkInterval = setInterval(async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url && url.includes('access_token') && url.includes('type=signup')) {
          console.log('AuthProvider: Verification link detected in periodic check');
          await markOnboardingAsCompleted();
          
          // Tvinga session-refresh
          try {
            await supabase.auth.refreshSession();
          } catch (error) {
            console.error('Error refreshing session:', error);
            // Lägg till Sentry-rapportering
            captureException(error instanceof Error ? error : new Error('Session refresh error'));
          }
          
          router.replace('/(auth)/login?verified=true');
          clearInterval(checkInterval); // Slutar kontrollera när vi hittat en länk
        }
      } catch (error) {
        console.error('Error checking URL:', error);
        // Lägg till Sentry-rapportering
        captureException(error instanceof Error ? error : new Error('URL check error'));
      }
    }, 1000);
    
    return () => clearInterval(checkInterval);
  }, []);

  // Huvudsaklig auth-setup
  useEffect(() => {
    // Begränsa antal initialiseringar för att undvika oändliga loopar
    if (initCountRef.current > 2) {
      console.log(`AuthProvider: Skipping auth state change listener (count: ${initCountRef.current})`);
      return () => {};
    }
    
    console.log('AuthProvider: Sätter upp autentiseringshantering');
    
    // Prenumerera på autentiseringshändelser
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state change:', event, {
          hasSession: !!session, 
          userId: session?.user?.id
        });
        
        if (event === 'INITIAL_SESSION') {
          // Initialt tillstånd vid appstart
          if (session) {
            setSession(session);
            setUser(session.user);
            setLoading(false);
          } else {
            setSession(null);
            setUser(null);
            setLoading(false);
          }
        } 
        else if (event === 'PASSWORD_RECOVERY') {
          console.log('AuthProvider: PASSWORD_RECOVERY event detected - ignored in this version');
        }
        else if (event === 'SIGNED_IN') {
          console.log('AuthProvider: User signed in, updating session');
          
          setUser(session?.user || null);
          // updateUser returnerar vanligtvis inte en session, så vi behöver hämta den aktuella sessionen
          supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            if (currentSession) {
              setSession(currentSession);
            }
          });
        } 
        else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out, clearing context');
          setSession(null);
          setUser(null);
          setLoading(true);
        } 
        else if (event === 'USER_UPDATED') {
          console.log('AuthProvider: User updated:', session?.user?.id);
          if (session && session.user) {
            // Uppdatera användarinformation
            setSession(session);
            setUser(session.user);
            
            // Kolla om användaren har verifierat sin e-post
            if (session.user.email_confirmed_at && !session.user.confirmed_at) {
              console.log('AuthProvider: User confirmed email for the first time');
              
              try {
                // Markera användarens e-post som bekräftad i databasen
                const { error } = await supabase.auth.updateUser({
                  data: { confirmed_at: new Date().toISOString() }
                });
                
                if (error) {
                  console.error('AuthProvider: Error updating confirmed_at:', error);
                  captureException(error);
                }
              } catch (error) {
                console.error('AuthProvider: Error in USER_UPDATED handling:', error);
                captureException(error instanceof Error ? error : new Error('USER_UPDATED handling error'));
              }
            }
          }
        } 
        else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: Token refreshed');
        }
      }
    );
    
    // Rensa prenumerationen när komponenten avmonteras
    return () => {
      console.log('AuthProvider: Städar upp auth state change lyssnare');
      subscription.unsubscribe();
    };
  }, [rootNavigation, router, markOnboardingAsCompleted, updateStoreWithUserData]);

  // Polling av sessionen när appen blir aktiv
  useEffect(() => {
    const appStateSubscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        console.log('AuthProvider: AppState "active" – startar polling för sessionuppdatering')
        let remainingTime = 30000 // 30 sekunder
        const interval = setInterval(() => {
          supabase.auth.getSession().then(({ data: { session } }) => {
            console.log('AuthProvider: Polling session', session)
            if (session && session.user.email_confirmed_at) {
              console.log('AuthProvider: Session uppdaterad med verifierad e-post')
              setSession(session)
              setUser(session.user)
              clearInterval(interval)
              
              // Sätt användarkontext i Sentry
              setUserContext(session.user.id, session.user.email || undefined);
              
              // Om vi har en verifierad session, sätt onboarding som slutförd
              markOnboardingAsCompleted();

              // Synkronisera avatar och användardata om det finns tillgängligt
              if (session.user.user_metadata) {
                const store = useStore.getState();
                const metadata = session.user.user_metadata;
                
                // Uppdatera avatar om info finns
                if (metadata.avatar_style && metadata.avatar_id) {
                  console.log('AuthProvider: Synkroniserar avatar från polling:', {
                    style: metadata.avatar_style,
                    id: metadata.avatar_id
                  });
                  
                  store.setAvatar(
                    metadata.avatar_style as AvatarStyle, 
                    metadata.avatar_id as string
                  );
                }
              }
            }
          })
          remainingTime -= 5000
          if (remainingTime <= 0) {
            clearInterval(interval)
          }
        }, 5000)
      }
    })
    return () => {
      appStateSubscription.remove()
    }
  }, [])

  // Funktioner för att hantera användarautentisering
  
  const signIn = async (email: string, password: string) => {
    try {
      setLoading(true)
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      
      if (error) throw error
      
      if (data.user) {
        // VIKTIGT: Lägg till validering av användarkontext i Sentry
        // när användaren loggar in
        setUserContext(data.user.id, data.user.email || undefined);
        addBreadcrumb('User signed in', 'auth');
        
        // Synkronisera användardata till store från supabase session
        const user = data.user;
        
        // Uppdatera store med användardata
        const store = useStore.getState();
        
        // Uppdatera lokala user context med data från user_metadata
        if (user.user_metadata) {
          // Synkronisera avatar-inställningar om de finns
          if (user.user_metadata.avatar_id && user.user_metadata.avatar_style) {
            store.setAvatar(
              user.user_metadata.avatar_style as AvatarStyle,
              user.user_metadata.avatar_id as string
            );
            
            if (typeof user.user_metadata.vegan_years === 'number') {
              store.setVeganYears(user.user_metadata.vegan_years);
            }
          }
          
          // Synkronisera vegan status om det finns
          if (user.user_metadata.vegan_status) {
            store.setVeganStatus(user.user_metadata.vegan_status as VeganStatus);
          }
        }
        
        // Vi måste uppdatera usage limit för den nya användaren
        // Detta görs i useUsageLimit hooken som finns på Result-sidan
        // Produktfiltrering sker nu automatiskt via getUserProducts funktionen
      }
    } catch (error) {
      console.error('AuthProvider: Fel vid inloggning', error)
      // Lägg till Sentry-rapportering
      captureException(error instanceof Error ? error : new Error(String(error)));
      setAuthError(error instanceof AuthError ? error.message : String(error))
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email: string, password: string): Promise<SignUpResult> => {
    console.log('AuthProvider: Startar registreringsprocess med email', { email })
    try {
      setLoading(true)
      
      // Hämta avatar och vegan-status från store
      const store = useStore.getState()
      
      console.log('AuthProvider: Förbereder användarmetadata', {
        avatarStyle: store.avatar.style,
        avatarId: store.avatar.id,
        veganYears: store.avatar.veganYears,
        veganStatus: store.veganStatus.status
      })
      
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `koalens://login?verified=true&email=${encodeURIComponent(email)}`,
          // Använd user_metadata istället för data för att lagra användarinformation
          data: { 
            avatar_style: store.avatar.style,
            avatar_id: store.avatar.id,
            vegan_years: store.avatar.veganYears,
            vegan_status: store.veganStatus.status
          }
        }
      })
      
      return { data, error }
    } catch (error) {
      console.error('AuthProvider: Fel vid registrering', error)
      // Lägg till Sentry-rapportering
      captureException(error instanceof Error ? error : new Error(String(error)));
      return { data: null, error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('AuthProvider: Försöker logga ut')
    try {
      setLoading(true)
      // Lägg till breadcrumb i Sentry
      addBreadcrumb('User signing out', 'auth');
      
      // Hämta användar-ID och rensa användarens produkter
      try {
        const userId = user?.id;
        if (userId) {
          console.log(`AuthProvider: Rensar produkter för användare ${userId} vid utloggning`);
          
          // Importera repository direkt istället för dynamiskt
          const repository = ProductRepository.getInstance();
          
          // Rensa användarens produkter
          await repository.clearUserProducts(userId);
        }
      } catch (clearError) {
        console.error('AuthProvider: Fel vid rensning av användarprodukter:', clearError);
        // Fortsätt ändå med utloggningen
      }
      
      // Rensa produkthistoriken innan utloggning
      const store = useStore.getState();
      store.clearHistory();

      console.log('AuthProvider: Produkthistorik rensad vid utloggning');
      
      const { error } = await supabase.auth.signOut()
      console.log('AuthProvider: Svar vid utloggning', { error: error?.message })
      
      if (error) throw error
      
      // Rensa användarkontext i Sentry vid utloggning
      clearUserContext();
      
      // Återställ navigationsspärren för att säkerställa att navigering fungerar
      if (global.isBlockingNavigation === true) {
        console.log('AuthProvider: Återställer navigationsspärr vid utloggning');
        global.isBlockingNavigation = false;
      }
      
      // Kontrollera onboarding-status innan omdirigering vid utloggning
      if (!store.onboarding.hasCompletedOnboarding) {
        console.log('AuthProvider: Navigerar till onboarding efter utloggning');
        router.replace('/(onboarding)');
      } else {
        console.log('AuthProvider: Navigerar till inloggning efter utloggning');
        router.replace('/(auth)/login');
      }
    } catch (error) {
      console.error('AuthProvider: Fel vid utloggning', error)
      // Lägg till Sentry-rapportering
      captureException(error instanceof Error ? error : new Error(String(error)));
      if (error instanceof AuthError) {
        setAuthError(error.message)
      }
    } finally {
      setLoading(false)
    }
  }

  // Google-inloggning är inaktiverad för MVP-versionen
  const signInWithGoogle = async () => {
    console.log('AuthProvider: Google-inloggning är inaktiverad för MVP')
    Alert.alert('Inaktiverad', 'Google inloggning är inte tillgänglig i denna MVP-version.')
  }

  // Asynkron funktion för att skicka bekräftelsemailet igen
  const resendConfirmation = async (email: string) => {
    try {
      setLoading(true)
      setLoadingState(LoadingState.LOADING)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      })

      if (error) {
        setLoading(false)
        setLoadingState(LoadingState.IDLE)
        console.error('AuthProvider: Resend confirmation error:', error.message)
        Sentry.captureException(error)
        return { success: false, error: error.message }
      }

      setLoading(false)
      setLoadingState(LoadingState.IDLE)
      return { success: true, error: null }
    } catch (err) {
      console.error('AuthProvider: Resend confirmation error:', err)
      Sentry.captureException(err)
      setLoading(false)
      setLoadingState(LoadingState.IDLE)
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // Asynkron funktion för att uppdatera användarens profil
  const updateProfile = async (data: Partial<UserProfile>) => {
    try {
      if (!user) {
        throw new Error('Cannot update profile - no user logged in')
      }

      setLoading(true)
      setLoadingState(LoadingState.LOADING)

      // Först: hämta den aktuella profilen för att se vad som behöver uppdateras
      const currentProfile = await SupabaseHelper.getFullProfile(user.id)
      if (!currentProfile) {
        throw new Error('Could not find user profile')
      }

      // Merge befintlig profil med nya data
      const updatedProfile = {
        ...currentProfile,
        ...data,
        updated_at: new Date().toISOString(),
      }

      // Uppdatera profilen i databasen
      const { error } = await SupabaseHelper.updateProfile(updatedProfile)

      if (error) {
        throw error
      }

      // Uppdatera lokal state
      setUser(updatedProfile as User);

      // Uppdatera app state
      const store = useStore.getState()

      setLoading(false)
      setLoadingState(LoadingState.IDLE)
      return { success: true, error: null }
    } catch (err) {
      console.error('AuthProvider: Update profile error:', err)
      Sentry.captureException(err)
      setLoading(false)
      setLoadingState(LoadingState.IDLE)
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      }
    }
  }

  // Funktion för att hämta användarens nya notifikationer
  const getNewNotificationsList = async () => {
    try {
      if (!user) {
        return []
      }

      // Hämta användarens notifikationer från databasen
      const { data, error } = await SupabaseHelper.getNotifications(user.id)

      if (error) {
        throw error
      }

      // Filtrera och mappa till en lista av meddelanden från olästa notifikationer
      const newNotifications =
        data
          ?.filter((n) => !n.is_read)
          .map((n) => n.message) || []

      return newNotifications
    } catch (err) {
      console.error('AuthProvider: Get notifications error:', err)
      Sentry.captureException(err)
      return [] // Returnera en tom lista vid fel
    }
  }

  const value = useMemo(
    () => ({
      session,
      user,
      loading,
      loadingState,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resendConfirmation,
      updateProfile,
      getNewNotificationsList,
      isInPasswordResetFlow: false,
      profile: null,
      anonymousSessionId: null,
      isNavigatingToReset: isNavigatingToResetPasswordRef.current,
    }),
    [
      session,
      user,
      loading,
      loadingState,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      resendConfirmation,
      updateProfile,
      getNewNotificationsList,
      isNavigatingToResetPasswordRef.current,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      <FirstLoginOverlay visible={showFirstLoginOverlay} />
      {children}
    </AuthContext.Provider>
  )
}

// Hook för enkel åtkomst till auth context
export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth måste användas inom en AuthProvider')
  }
  return context
}

// Funktion som skyddar rutter som kräver autentisering
export function useProtectedRoute() {
  const segments = useSegments();
  const { session, loading } = useAuth();
  const router = useRouter();
  const isNavigatingRef = useRef(false); // Förhindra dubbla navigeringar

  useEffect(() => {
    // För att förhindra oändliga loopar, kontrollera om vi redan navigerar
    if (isNavigatingRef.current) {
      return;
    }

    // Logga alla aktuella värden för felsökning
    console.log('useProtectedRoute kördes med segments:', segments);
    console.log('useProtectedRoute session status:', session ? 'inloggad' : 'inte inloggad');
    console.log('useProtectedRoute loading status:', loading);

    // Kontrollera onboarding-status
    const store = useStore.getState();
    const hasCompletedOnboarding = store.onboarding.hasCompletedOnboarding;
    console.log('useProtectedRoute hasCompletedOnboarding:', hasCompletedOnboarding);

    // Kontrollera om nuvarande segment är en auth-route
    const isAuthGroup = segments[0] === '(auth)';
    // Kontrollera om nuvarande segment är en onboarding-route
    const isOnboardingGroup = segments[0] === '(onboarding)';

    // Nya kontroller för specifika auth-sidor
    const isForgotPasswordPage = segments[0] === '(auth)' && segments[1] === 'forgot-password';
    const isLoginPage = segments[0] === '(auth)' && segments[1] === 'login';

    console.log('useProtectedRoute routes:', {
      isAuthGroup,
      isOnboardingGroup,
      isForgotPasswordPage,
      isLoginPage
    });

    // Skapa en lista över tillåtna sidor som inte kräver autentisering
    const allowedUnauthenticatedPages = isForgotPasswordPage || isLoginPage;
    console.log('useProtectedRoute allowedUnauthenticatedPages:', allowedUnauthenticatedPages);

    // Första navigeringsprioritet: Onboarding om den inte är klar
    if (!hasCompletedOnboarding && !isOnboardingGroup && !loading) {
      console.log('useProtectedRoute: Redirecting to onboarding');
      isNavigatingRef.current = true;
      router.replace('/(onboarding)');
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
      return;
    }

    // Andra prioriteten: Om onboarding är klar men användaren inte är inloggad
    if (hasCompletedOnboarding && !session && !loading && !isAuthGroup) {
      console.log('useProtectedRoute: Redirecting to login');
      isNavigatingRef.current = true;
      router.replace('/(auth)/login');
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
      return;
    }

    // Tredje prioriteten: Om användaren inte är inloggad och befinner sig på en skyddad auth-route
    if (hasCompletedOnboarding && !session && !loading && isAuthGroup && !allowedUnauthenticatedPages) {
      console.log('useProtectedRoute: På en skyddad auth-sida utan inloggning, omdirigerar till login');
      isNavigatingRef.current = true;
      router.replace('/(auth)/login');
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
      return;
    }

    // Fjärde prioriteten: Om användaren är inloggad men fortfarande på en auth-route,
    // omdirigera ENDAST om det INTE är forgot-password eller reset-password (reset hanteras av AuthLayout)
    if (hasCompletedOnboarding && session && !loading && isAuthGroup && !isForgotPasswordPage) {
      // Vi behöver inte kontrollera isResetPasswordPage här eftersom AuthLayout redan skyddar den.
      console.log('useProtectedRoute: Redirecting to scan from auth page (not forgot-password)');
      isNavigatingRef.current = true;
      router.replace('/(tabs)');
      setTimeout(() => {
        isNavigatingRef.current = false;
      }, 500);
      return;
    }
  }, [segments, session, loading, router]);
}