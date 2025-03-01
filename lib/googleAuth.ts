// lib/googleAuth.ts
import { useState } from 'react'
import * as Google from 'expo-auth-session/providers/google'
import { supabase } from './supabase'
import { maybeCompleteAuthSession } from 'expo-web-browser'

// Slutför web browser auth session
maybeCompleteAuthSession()

const clientIds = {
  android: '880878962670-lmknf32a0qkvfiad1fe84v02qk2kke43.apps.googleusercontent.com',
  ios: '880878962670-drs8ta7556lgkd4bkbi2nkbh79jl0tn5.apps.googleusercontent.com',
  web: '880878962670-21hvu7v8749p2jqmuo0qdv5s23mbo2cq.apps.googleusercontent.com'
}

export function useGoogleAuth() {
  const [loading, setLoading] = useState(false)

  const [_request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: clientIds.android,
    iosClientId: clientIds.ios,
    webClientId: clientIds.web,
    selectAccount: true,
  })

  async function signInWithGoogle() {
    try {
      setLoading(true)
      const result = await promptAsync()
      
      if (result?.type === 'success' && result.authentication) {
        // Kontrollera att authentication finns och har idToken
        const idToken = result.authentication.idToken
        if (!idToken) throw new Error('No ID token present')
        
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: idToken
        })

        if (error) throw error
      }
    } catch (error) {
      console.error('Google auth error:', error)
      throw error
    } finally {
      setLoading(false)
    }
  }

  return {
    signInWithGoogle,
    loading
  }
}