// providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, AuthError, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Alert, AppState } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '@/stores/useStore'
import * as Linking from 'expo-linking';
import { FirstLoginOverlay } from '@/components/FirstLoginOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';
// Lägg till denna import för Sentry
import { setUserContext, clearUserContext, captureException, addBreadcrumb } from '@/lib/sentry';
// Lägg till import för ProductRepository
import { ProductRepository } from '@/services/productRepository'

// Imports för avatar och vegan-status
import { AvatarStyle } from '@/stores/slices/createAvatarSlice'
import { VeganStatus } from '@/stores/slices/createVeganStatusSlice'

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
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [showFirstLoginOverlay, setShowFirstLoginOverlay] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Hjälpfunktion för att markera onboarding som slutförd
  const markOnboardingAsCompleted = async () => {
    const store = useStore.getState();
    if (!store.onboarding.hasCompletedOnboarding) {
      console.log('AuthProvider: Setting onboarding as completed');
      await store.setOnboardingCompleted(true);
      return true;
    }
    return false;
  };

  // Uppdatera store med användardata när vi har en session
  const updateStoreWithUserData = useCallback(async (userData: User | null) => {
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
    // Hantera deep links
    const handleDeepLink = async (event: { url: string }) => {
      console.log('AuthProvider: Deep link detected:', event.url);
      
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
    Linking.getInitialURL().then(url => {
      if (url) {
        console.log('AuthProvider: Initial URL detected:', url);
        handleDeepLink({ url });
      }
    });

    return () => {
      subscription.remove();
    };
  }, [updateStoreWithUserData]);

  // Huvudsaklig auth-setup
  useEffect(() => {
    console.log('AuthProvider: Initial setup');
    
    // VIKTIGT: Kontrollera omedelbart om det finns en djuplänk
    Linking.getInitialURL().then(async (url) => {
      if (url && url.includes('access_token') && url.includes('type=signup')) {
        console.log('AuthProvider: Initial URL is verification link:', url);
        
        // Sätt onboarding som slutförd
        await markOnboardingAsCompleted();
        
        // Omdirigera till inloggning
        console.log('AuthProvider: Redirecting to login from initial URL handler');
        router.replace('/(auth)/login?verified=true');
        setLoading(false);
        return; // Avbryt resten av useEffect-koden
      }
    }).catch(error => {
      console.error('AuthProvider: Error checking initial URL:', error);
      // Lägg till Sentry-rapportering
      captureException(error instanceof Error ? error : new Error('Initial URL check error'));
    });
    
    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('AuthProvider: Initial session check', { 
        hasSession: !!session,
        emailConfirmed: session?.user?.email_confirmed_at,
        hasAvatar: !!session?.user?.user_metadata?.avatar_id
      })

      setSession(session)
      setUser(session?.user ?? null)

      // Sätt användarkontext i Sentry om vi har en session
      if (session?.user) {
        setUserContext(session.user.id, session.user.email || undefined);
        addBreadcrumb('Initial session check', 'auth', {
          email_confirmed: !!session.user.email_confirmed_at
        });
      }

      // Vänta tills Zustand store är redo
      await new Promise(resolve => setTimeout(resolve, 100))

      // VIKTIG ÄNDRING: Hantera verifierad e-post först
      if (session?.user?.email_confirmed_at) {
        console.log('AuthProvider: Session has verified email')
        
        // Sätt onboarding som slutförd om användaren har verifierad e-post
        await markOnboardingAsCompleted();

        // Synkronisera avatardata från Supabase (om den finns)
        const userData = session.user;
        const store = useStore.getState();
        const metadata = userData.user_metadata;
        
        if (metadata) {
          // Om det finns avatar-information i metadata, uppdatera Zustand store
          if (metadata.avatar_id && metadata.avatar_style) {
            console.log('AuthProvider: Synkroniserar avatar vid session check:', {
              style: metadata.avatar_style,
              id: metadata.avatar_id
            });
            
            await store.setAvatar(
              metadata.avatar_style as AvatarStyle, 
              metadata.avatar_id as string
            );
            
            if (typeof metadata.vegan_years === 'number') {
              await store.setVeganYears(metadata.vegan_years);
            }
          }
          
          // Synkronisera vegan-status
          if (metadata.vegan_status) {
            await store.setVeganStatus(metadata.vegan_status as VeganStatus);
          }
        }
        
        // Om detta är första inloggningen efter verifiering
        if (!session.user.last_sign_in_at) {
          console.log('AuthProvider: First verification, redirecting to login')
          router.replace('/(auth)/login?verified=true')
        } else {
          console.log('AuthProvider: Verified user with previous login, redirecting to scan')
          router.replace('/(tabs)/(scan)')
        }
        setLoading(false)
        return
      }

      // Om vi kommer hit har vi ingen session eller en ej verifierad session
      
      // Kontrollera om onboarding har slutförts
      const store = useStore.getState()
      const onboardingStatus = store.onboarding
      console.log('AuthProvider: Checking onboarding status:', onboardingStatus)

      if (!onboardingStatus.hasCompletedOnboarding) {
        console.log('AuthProvider: Onboarding not completed, redirecting to onboarding')
        router.replace('/(onboarding)')
        setLoading(false)
        return
      }

      if (!session) {
        console.log('AuthProvider: No session, redirecting to login')
        router.replace('/(auth)/login')
        setLoading(false)
        return
      }

      if (!session.user.email_confirmed_at) {
        console.log('AuthProvider: Email not verified')
        Alert.alert(
          'E-post ej verifierad',
          'Ett verifieringsmail har skickats till din e-post. Vänligen verifiera din e-postadress för att fortsätta.',
          [{ text: 'OK', style: 'cancel' }]
        )
        await supabase.auth.signOut()
        return
      }

      console.log('AuthProvider: Valid session, redirecting to tabs')
      router.replace('/(tabs)/(scan)')
      setLoading(false)
    })
  }, []);
  
  // Hantera auth-ändringar från Supabase - flyttad utanför den andra useEffect för att undvika nästlade useEffect
  useEffect(() => {
    console.log('AuthProvider: Konfigurerar auth-ändringshanterare');
    
    // Lyssna på auth-ändringar
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state change:', event, {
        hasSession: !!session,
        userId: session?.user?.id
      });
      
      switch (event) {
        case 'SIGNED_IN':
          if (session) {
            console.log('AuthProvider: User signed in, updating session');
            setSession(session);
            setUser(session.user);
            
            // Uppdatera store direkt vid inloggning
            await updateStoreWithUserData(session.user);
            
            // Lägg till Sentry-rapportering
            setUserContext(session.user.id, session.user.email || undefined);
            addBreadcrumb('User signed in', 'auth');
          }
          break;
        case 'SIGNED_OUT':
          console.log('AuthProvider: Användare loggad ut')
          // Rensa användarkontext i Sentry
          clearUserContext();
          addBreadcrumb('User signed out', 'auth');
          
          // Ta bort router.replace-anropet härifrån eftersom det också finns i signOut-funktionen
          // vilket kan orsaka navigationsproblem
          setSession(null);
          setUser(null);
          break;
        case 'USER_UPDATED':
          // Ta bort flagghantering helt
          /*
          let wasAvatarUpdate = false;
          if (session?.user.user_metadata?.avatar_update === true) { ... }
          */

          // Ta bort den gamla (utkommenterade) synkroniseringslogiken helt
          // Inget behöver göras här för avatar/status-uppdatering
          // då ProfileScreen hanterar det direkt i storen.
          console.log('AuthProvider: USER_UPDATED event received. Handled by ProfileScreen/other logic.');

          // Behåll navigationslogiken för t.ex. e-postverifiering
          // (Den körs nu alltid, men router.replace har inbyggd logik för att inte navigera om man redan är på målsidan)
          console.log('AuthProvider: Checking navigation logic after USER_UPDATED.');
          // Kontrollera navigationsblockering
          if (global.isBlockingNavigation === true) {
            console.log('AuthProvider: Navigationsspärr aktiv, ignorerar navigationsförsök');
          } else {
              // Fortsätt med normal navigering för e-postverifiering etc.
              if (session?.user.email_confirmed_at) {
                await markOnboardingAsCompleted();
                if (!session.user.last_sign_in_at) {
                  console.log('AuthProvider: First verification after USER_UPDATED, redirecting to login')
                  const userEmail = session.user.email;
                  if (userEmail) {
                    router.replace({
                      pathname: '/(auth)/login',
                      params: { 
                        verified: 'true', 
                        email: encodeURIComponent(userEmail)
                      }
                    });
                  } else {
                    router.replace('/(auth)/login?verified=true');
                  }
                } else {
                  // Kommenterar bort denna omdirigering för att förhindra att appen navigerar till scan-sidan efter profiluppdateringar
                  /*
                  console.log('AuthProvider: User updated with verified email (not first time), redirecting to scan')
                  router.replace('/(tabs)/(scan)')
                  */
                }
              } else {
                 console.log('AuthProvider: Användare uppdaterad men e-post ej verifierad, ingen navigering.');
              }
          }

          break; // Slut på USER_UPDATED case
        case 'TOKEN_REFRESHED':
          console.log('AuthProvider: Token uppdaterad')
          break
        default:
          console.log('AuthProvider: Hanterar ej auth event', event)
      }
    });

    return () => {
      console.log('AuthProvider: Städar upp - avregistrerar prenumeration')
      subscription.unsubscribe()
    }
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

  // Extra useEffect: Om inloggningen är klar men ingen session finns, tvinga användaren till login
  useEffect(() => {
    if (!loading && !session) {
      // Kontrollera onboarding-status innan omdirigering
      const store = useStore.getState()
      if (!store.onboarding.hasCompletedOnboarding) {
        console.log('AuthProvider: No session but onboarding not completed, staying in onboarding')
        return
      }
      console.log('AuthProvider: Ingen giltig session, tvingar omdirigering till login')
      router.replace('/(auth)/login')
    }
  }, [loading, session])

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

  const value = {
    session: session,
    user: user,
    loading: loading,
    signIn: signIn,
    signUp: signUp,
    signOut: signOut,
    signInWithGoogle: signInWithGoogle
  };

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