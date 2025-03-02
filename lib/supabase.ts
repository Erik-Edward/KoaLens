// lib/supabase.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Platform, AppState } from 'react-native';

const supabaseUrl = 'https://liziujohdkdmaogfogje.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpeml1am9oZGtkbWFvZ2ZvZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MjQ5MzUsImV4cCI6MjA1MjAwMDkzNX0.qYotprdjkPL_mSi69xAHHlb6RMT5iNfu6vWp0ioJY4U';

// Lazy initialize Supabase
let supabaseClient: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient => {
  if (supabaseClient) return supabaseClient;
  
  console.log(`Initializing Supabase client for platform: ${Platform.OS}`);
  
  // Konfigurera korrekt storage beroende på plattform
  const storage = Platform.OS === 'web' 
    ? localStorage 
    : AsyncStorage;
  
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      storage: storage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === 'web'
    }
  });
  
  // Hantera sessionen baserat på app state för native platformar
  if (Platform.OS !== 'web') {
    AppState.addEventListener('change', (state) => {
      if (!supabaseClient) return;
      
      if (state === 'active') {
        supabaseClient.auth.startAutoRefresh();
      } else {
        supabaseClient.auth.stopAutoRefresh();
      }
    });
  }
  
  return supabaseClient;
};

// För bakåtkompatibilitet, exportera en direkt referens till klienten
// Detta gör att befintlig kod som använder 'supabase' fortfarande fungerar
// men initieringen sker nu lazy för att undvika "window is not defined" på Expo Go
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get: (target, prop) => {
    // Garantera att supabaseClient initieras när någon försöker använda den
    const client = getSupabase();
    // @ts-ignore - Vi vet att client[prop] existerar
    return client[prop];
  }
});