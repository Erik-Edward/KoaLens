/**
 * User slice för att hantera användarens ID och andra uppgifter
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { StateCreator } from 'zustand';
import * as Crypto from 'expo-crypto';
import * as Application from 'expo-application';
import { Platform } from 'react-native';
import { StoreState } from '../types';
import { v4 as uuidv4 } from 'uuid';

// Konstanter för AsyncStorage nycklarna
const USER_ID_KEY = '@koalens:user_id';

// Interface för user slice
export interface UserSlice {
  userId: string | null;
  isUserLoading: boolean;
  userError: string | null;
  initializeUser: () => Promise<void>;
  getUserId: () => Promise<string>;
}

// Skapa ett anonymt användar-ID (används för att spåra användaren anonymt)
const createAnonymousUserId = async (): Promise<string> => {
  try {
    // Försök hämta enhets-ID som grund
    let deviceId = '';
    
    if (Platform.OS === 'android') {
      deviceId = await Application.getAndroidId() || '';
    } else if (Platform.OS === 'ios') {
      // På iOS kan vi inte få enhets-ID, så vi använder en annan approach
      deviceId = await Application.getIosIdForVendorAsync() || '';
    }
    
    if (!deviceId) {
      // Fallback på slumpmässigt ID om enhets-ID inte är tillgängligt
      deviceId = await Crypto.randomUUID();
    }
    
    // Kombinera med tidsstämpel för att säkerställa unikhet
    const timestamp = new Date().getTime().toString(36);
    const userId = `user_${deviceId}_${timestamp}`;
    
    // Spara användare till AsyncStorage
    await AsyncStorage.setItem(USER_ID_KEY, userId);
    
    return userId;
  } catch (error) {
    console.error('Fel vid skapande av användar-ID:', error);
    
    // Om allt annat misslyckas, skapa ett väldigt enkelt ID baserat på tid
    const fallbackId = `user_${new Date().getTime()}`;
    await AsyncStorage.setItem(USER_ID_KEY, fallbackId);
    
    return fallbackId;
  }
};

// Slice för att hantera användardata
export const createUserSlice: StateCreator<
  StoreState,
  [],
  [],
  UserSlice
> = (set, get) => ({
  userId: null,
  isUserLoading: true,
  userError: null,
  
  // Initialisera genom att hämta användar-ID från AsyncStorage eller skapa ett nytt
  initializeUser: async () => {
    try {
      set({ isUserLoading: true, userError: null });
      
      // Försök hämta existerande användar-ID
      const storedUserId = await AsyncStorage.getItem(USER_ID_KEY);
      
      if (storedUserId) {
        set({ userId: storedUserId, isUserLoading: false });
      } else {
        // Skapa ett nytt användar-ID om inget finns
        const newUserId = await createAnonymousUserId();
        set({ userId: newUserId, isUserLoading: false });
      }
    } catch (error) {
      console.error('Fel vid initialisering av användarlager:', error);
      set({ 
        userError: 'Kunde inte initialisera användardata',
        isUserLoading: false
      });
    }
  },
  
  // Hämta användar-ID, initialisera om nödvändigt
  getUserId: async () => {
    const { userId, initializeUser } = get();
    
    if (userId) {
      // Kontrollera om userId är ett giltigt UUID
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (uuidRegex.test(userId)) {
        return userId;
      } else {
        // Om det inte är ett giltigt UUID, skapa ett nytt
        console.log('Användar-ID är inte ett giltigt UUID, skapar ett nytt');
        const newUuid = uuidv4();
        
        // Spara det nya UUID:t
        await AsyncStorage.setItem(USER_ID_KEY, newUuid);
        set({ userId: newUuid });
        
        return newUuid;
      }
    }
    
    // Om användar-ID inte är satt, initialisera och returnera
    await initializeUser();
    const newUserId = get().userId;
    
    if (!newUserId) {
      // Fallback: om vi fortfarande inte har ett ID, skapa ett direkt
      const fallbackId = uuidv4();
      await AsyncStorage.setItem(USER_ID_KEY, fallbackId);
      set({ userId: fallbackId });
      return fallbackId;
    }
    
    return newUserId;
  }
});

// Hjälpfunktion för att enkelt hämta användar-ID från adapter
export const getUserIdFromStore = async (store: StoreState): Promise<string> => {
  return await store.getUserId();
}; 