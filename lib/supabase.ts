import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'
import { AppState } from 'react-native'

const supabaseUrl = 'https://liziujohdkdmaogfogje.supabase.co'
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imxpeml1am9oZGtkbWFvZ2ZvZ2plIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzY0MjQ5MzUsImV4cCI6MjA1MjAwMDkzNX0.qYotprdjkPL_mSi69xAHHlb6RMT5iNfu6vWp0ioJY4U'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})

// Hantera sessionen baserat på app state
AppState.addEventListener('change', (state) => {
  if (state === 'active') {
    supabase.auth.startAutoRefresh()
  } else {
    supabase.auth.stopAutoRefresh()
  }
})
