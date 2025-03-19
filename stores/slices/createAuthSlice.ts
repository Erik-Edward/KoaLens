// stores/slices/createAuthSlice.ts
import { StateCreator } from 'zustand'
import { AuthSlice, StoreState } from '../types'

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set, get) => ({
  user: null,
  session: null,
  isAuthenticated: false,

  login: (user: AuthSlice['user'], session: string) => {
    console.log('AuthSlice: Uppdaterar user-objekt vid inloggning', {
      userId: user?.id,
      email: user?.email
    });
    
    // Uppdatera auth-slice med användardata
    set({ 
      user, 
      session, 
      isAuthenticated: true 
    });
    
    // Uppdatera även userId i store för att vara konsekvent
    if (user?.id) {
      // Synkronisera med userSlice-userId
      get().initializeUser().then(() => {
        console.log('AuthSlice: Användar-ID initialiserades');
      }).catch(err => {
        console.error('AuthSlice: Fel vid initialisering av användar-ID', err);
      });
    }
  },

  logout: () => 
    set({ 
      user: null, 
      session: null, 
      isAuthenticated: false 
    }),

  updateSession: (session: string) => 
    set({ session })
})