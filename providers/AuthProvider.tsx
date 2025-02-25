// providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { Session, AuthError, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { Alert, AppState } from 'react-native'
import { router } from 'expo-router'
import { useStore } from '@/stores/useStore'
import * as Linking from 'expo-linking';

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

  // Lyssna på djuplänkar
  useEffect(() => {
    // Hantera deep links
    const handleDeepLink = async (event: { url: string }) => {
      console.log('AuthProvider: Deep link detected:', event.url);
      
      // Identifiera verifieringslänk baserat på innehåll snarare än specifik parameter
      if (event.url.includes('access_token') && event.url.includes('type=signup')) {
        console.log('AuthProvider: Verification deep link detected with token');
        
        // Tvinga session-refresh för att få den nya sessionen
        try {
          const { data } = await supabase.auth.refreshSession();
          const { session } = data;
          
          if (session) {
            console.log('AuthProvider: Session refreshed after verification');
            setSession(session);
            setUser(session.user);
          }
        } catch (error) {
          console.error('AuthProvider: Error refreshing session:', error);
        }
        
        // Sätt onboarding som slutförd
        await markOnboardingAsCompleted();
        
        // VIKTIGT: Vi måste direkt omdirigera användaren innan andra checks körs
        console.log('AuthProvider: Redirecting to login from deep link handler');
        router.replace('/(auth)/login?verified=true');
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
  }, []);

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

    // Lyssnar på auth-ändringar och synkroniserar store med användardata
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('AuthProvider: Auth state change', { event, hasSession: !!session })
      setSession(session)
      setUser(session?.user ?? null)

      // Synkronisera användardata med Zustand store när vi har en session
      if (session?.user) {
        const userData = session.user
        const store = useStore.getState()
        
        // Om användaren har verifierad e-post, sätt onboarding till slutförd
        if (userData.email_confirmed_at) {
          await markOnboardingAsCompleted();
        }
        
        if (userData.user_metadata) {
          const metadata = userData.user_metadata
          
          // Uppdatera avatar-information om den finns
          if (metadata.avatar_style && metadata.avatar_id) {
            console.log('AuthProvider: Synkroniserar avatar från user_metadata vid auth change:', {
              style: metadata.avatar_style,
              id: metadata.avatar_id
            });
            
            await store.setAvatar(
              metadata.avatar_style as AvatarStyle, 
              metadata.avatar_id as string
            )
            
            if (typeof metadata.vegan_years === 'number') {
              await store.setVeganYears(metadata.vegan_years)
            }
          }
          
          // Uppdatera vegan-status om den finns
          if (metadata.vegan_status) {
            await store.setVeganStatus(metadata.vegan_status as VeganStatus)
          }
          console.log('AuthProvider: Användarprofil synkroniserad med store vid auth change')
        }
      }

      switch (event) {
        case 'SIGNED_OUT':
          console.log('AuthProvider: Användare loggad ut')
          if (!useStore.getState().onboarding.hasCompletedOnboarding) {
            router.replace('/(onboarding)')
          } else {
            router.replace('/(auth)/login')
          }
          break
          case 'USER_UPDATED':
  console.log('AuthProvider: Användare uppdaterad', {
    emailConfirmed: session?.user.email_confirmed_at,
    hasAvatar: !!session?.user.user_metadata?.avatar_id,
    isAvatarUpdate: session?.user.user_metadata?.avatar_update === true,
    isNavigationBlocked: global.isBlockingNavigation === true
  })
  
  // VIKTIG FÖRBÄTTRING: Kontrollera avatarflaggan FÖRST, innan navigationsspärren
  // Detta gör att även om navigationsspärren har inaktiverats, så avbryts
  // ändå navigeringen om det är en avataruppdatering
  if (session?.user.user_metadata?.avatar_update === true) {
    console.log('AuthProvider: Avatar update detected, staying on current screen');
    break;
  }
  
  // Sekundär kontroll: Om navigationsspärren är aktiv, utför inte någon navigering
  if (global.isBlockingNavigation === true) {
    console.log('AuthProvider: Navigationsspärr aktiv, ignorerar navigationsförsök');
    break;
  }
  
  // Om användaren just har uppdaterats, synkronisera data från Supabase
  if (session?.user) {
    const userData = session.user;
    const store = useStore.getState();
    const metadata = userData.user_metadata;
    
    if (metadata) {
      // Synkronisera avatar om den finns i metadata
      if (metadata.avatar_id && metadata.avatar_style) {
        console.log('AuthProvider: Synkroniserar avatar efter USER_UPDATED:', {
          style: metadata.avatar_style,
          id: metadata.avatar_id
        });
        
        // Använd await för att säkerställa att denna operation slutförs
        await store.setAvatar(
          metadata.avatar_style as AvatarStyle, 
          metadata.avatar_id as string
        );
      }
      
      // Synkronisera vegan-status och år
      if (metadata.vegan_status) {
        await store.setVeganStatus(metadata.vegan_status as VeganStatus);
        
        if (typeof metadata.vegan_years === 'number') {
          await store.setVeganYears(metadata.vegan_years);
        }
      }
    }
  }
  
  // Fortsätt med normal navigering för e-postverifiering
  if (session?.user.email_confirmed_at) {
    // Sätt onboarding som slutförd
    await markOnboardingAsCompleted();
    
    // Avgör om det är första gången användaren loggar in efter verifiering
    if (!session.user.last_sign_in_at) {
      console.log('AuthProvider: First verification via auth state, redirecting to login')
      router.replace('/(auth)/login?verified=true')
    } else {
      console.log('AuthProvider: User updated with verified email, redirecting to scan')
      router.replace('/(tabs)/(scan)')
    }
  }
  break
        case 'SIGNED_IN':
          console.log('AuthProvider: Användare inloggad', {
            emailConfirmed: session?.user.email_confirmed_at,
            email: session?.user.email,
            hasAvatar: !!session?.user.user_metadata?.avatar_id
          })
          if (session?.user.email_confirmed_at) {
            router.replace('/(tabs)/(scan)')
          } else {
            console.log('AuthProvider: Oververifierad inloggning upptäckt – tvingar utloggning')
            supabase.auth.signOut()
            router.replace('/(auth)/login')
          }
          break
        case 'TOKEN_REFRESHED':
          console.log('AuthProvider: Token uppdaterad')
          break
        default:
          console.log('AuthProvider: Hanterar ej auth event', event)
      }
    })

    return () => {
      console.log('AuthProvider: Städar upp - avregistrerar prenumeration')
      subscription.unsubscribe()
    }
  }, [])

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
          }
          
          router.replace('/(auth)/login?verified=true');
          clearInterval(checkInterval); // Slutar kontrollera när vi hittat en länk
        }
      } catch (error) {
        console.error('Error checking URL:', error);
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

  const signIn = async (email: string, password: string) => {
    console.log('AuthProvider: Försöker logga in med email', { email })
    try {
      setLoading(true)
      const { error, data } = await supabase.auth.signInWithPassword({ email, password })
      
      console.log('AuthProvider: Svar för inloggning', {
        error: error?.message,
        hasData: !!data,
        emailConfirmed: data?.user?.email_confirmed_at
      })
      if (data) {
        console.log('AuthProvider: Fullt svar från inloggning:', data)
      }
      if (error) throw error
      
      // Synkronisera Zustand store med användardata om metadata finns
      if (data?.user) {
        const userData = data.user
        if (userData.user_metadata) {
          const store = useStore.getState()
          const metadata = userData.user_metadata
          
          // Uppdatera avatar-information om den finns
          if (metadata.avatar_style && metadata.avatar_id) {
            console.log('AuthProvider: Synkroniserar avatar från inloggning:', {
              style: metadata.avatar_style,
              id: metadata.avatar_id
            });
            
            await store.setAvatar(
              metadata.avatar_style as AvatarStyle, 
              metadata.avatar_id as string
            )
            
            if (typeof metadata.vegan_years === 'number') {
              await store.setVeganYears(metadata.vegan_years)
            }
          }
          
          // Uppdatera vegan-status om den finns
          if (metadata.vegan_status) {
            await store.setVeganStatus(metadata.vegan_status as VeganStatus)
          }
          
          console.log('AuthProvider: Användarprofil synkroniserad med store')
        }
      }
      
      // Tvinga en session-refresh efter inloggning
      const refreshed = await supabase.auth.getSession()
      console.log('AuthProvider: Refreshed session efter inloggning:', refreshed.data.session)
      setSession(refreshed.data.session)
      setUser(refreshed.data.session?.user ?? null)
      
      if (!refreshed.data.session || !refreshed.data.session.user.email_confirmed_at) {
        console.log('AuthProvider: Inloggad session saknar verifierad e-post', { email })
        Alert.alert(
          'E-post ej verifierad',
          'Ett verifieringsmail har skickats till din e-postadress. Vänligen verifiera din e-postadress innan inloggning. Om du vill kunna skicka ett nytt verifieringsmail, använd knappen nedan.',
          [
            {
              text: 'Skicka nytt verifieringsmail',
              onPress: async () => {
                console.log('AuthProvider: Försöker skicka nytt verifieringsmail')
                const { error: resendError } = await supabase.auth.resend({
                  type: 'signup',
                  email,
                  options: {
                    emailRedirectTo: `koalens://login?verified=true&email=${encodeURIComponent(email)}`
                  }
                })
                console.log('AuthProvider: Svar från nytt verifieringsmail', { error: resendError?.message })
                if (resendError) {
                  Alert.alert('Fel', 'Kunde inte skicka nytt verifieringsmail')
                } else {
                  Alert.alert('', 'Nytt verifieringsmail har skickats')
                }
              }
            },
            { text: 'OK', style: 'cancel' }
          ]
        )
        await supabase.auth.signOut()
        return
      }
      
      console.log('AuthProvider: Inloggning lyckades, omdirigerar')
      router.replace('/(tabs)/(scan)')
    } catch (error) {
      console.error('AuthProvider: Fel vid inloggning', error)
      if (error instanceof AuthError) {
        Alert.alert('Inloggningsfel', error.message)
      } else {
        Alert.alert('Fel', 'Ett oväntat fel inträffade vid inloggning')
      }
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
      return { data: null, error: error as AuthError }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    console.log('AuthProvider: Försöker logga ut')
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      console.log('AuthProvider: Svar vid utloggning', { error: error?.message })
      if (error) throw error
      
      // Kontrollera onboarding-status innan omdirigering vid utloggning
      const store = useStore.getState()
      if (!store.onboarding.hasCompletedOnboarding) {
        router.replace('/(onboarding)')
      } else {
        router.replace('/(auth)/login')
      }
    } catch (error) {
      console.error('AuthProvider: Fel vid utloggning', error)
      if (error instanceof AuthError) {
        Alert.alert('Utloggningsfel', error.message)
      } else {
        Alert.alert('Fel', 'Ett oväntat fel inträffade vid utloggning')
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
    session,
    user,
    loading,
    signIn,
    signUp,
    signOut,
    signInWithGoogle
  }

  return (
    <AuthContext.Provider value={value}>
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