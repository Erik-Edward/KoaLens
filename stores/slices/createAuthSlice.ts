// stores/slices/createAuthSlice.ts
import { StateCreator } from 'zustand'
import { AuthSlice, StoreState } from '../types'

export const createAuthSlice: StateCreator<StoreState, [], [], AuthSlice> = (set) => ({
  user: null,
  session: null,
  isAuthenticated: false,

  login: (user: AuthSlice['user'], session: string) => 
    set({ 
      user, 
      session, 
      isAuthenticated: true 
    }),

  logout: () => 
    set({ 
      user: null, 
      session: null, 
      isAuthenticated: false 
    }),

  updateSession: (session: string) => 
    set({ session })
})