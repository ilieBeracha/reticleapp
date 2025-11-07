// contexts/AuthContext.tsx
import { AuthenticatedClient } from '@/lib/authenticatedClient'
import { supabase } from '@/lib/supabase'
import { Session, User } from '@supabase/supabase-js'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { router } from 'expo-router'
import React, { createContext, useContext, useEffect, useState } from 'react'

// Warm up the browser for faster OAuth
WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signUp: (email: string, password: string) => Promise<void>
  signIn: (email: string, password: string) => Promise<void>
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('🔵 Initial session:', session?.user?.email || 'none')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
    })

    

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('🔵 Auth state changed:', _event, session?.user?.email || 'none')
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)

      // Check for pending invite code after successful sign in
      if (_event === 'SIGNED_IN' && session?.user) {
        const { default: AsyncStorage } = await import('@react-native-async-storage/async-storage')
        const pendingInviteCode = await AsyncStorage.getItem('pending_invite_code')

        if (pendingInviteCode) {
          console.log('✅ Found pending invite code, redirecting to accept invite...')
          // Clear the stored code
          await AsyncStorage.removeItem('pending_invite_code')

          // Redirect to protected invite page to accept
          setTimeout(() => {
            router.replace(`/(protected)/invite?token=${pendingInviteCode}`)
          }, 500)
        }
      }
    })

  

    return () => subscription.unsubscribe()
  }, [])

  // Initialize AuthenticatedClient with token provider
  useEffect(() => {
    AuthenticatedClient.initialize(async () => {
      const { data: { session } } = await supabase.auth.getSession()
      return session?.access_token ?? ''
    })
  }, [])

  // Handle OAuth deep links
  useEffect(() => {
    const handleDeepLink = async (event: Linking.EventType) => {
      const url = event.url
      console.log('🔗 Deep link received:', url)

      // Check if this is an OAuth callback
      if (url.includes('auth/callback')) {
        console.log('🔗 Processing OAuth callback...')
        
        try {
          // Parse URL to get tokens from hash fragment
          const urlObj = new URL(url)
          const hash = urlObj.hash.substring(1) // Remove #
          const params = new URLSearchParams(hash)
          
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')
          
          console.log('🔗 Tokens found:', { 
            hasAccess: !!accessToken, 
            hasRefresh: !!refreshToken 
          })

          if (accessToken && refreshToken) {
            console.log('🔗 Setting session...')
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            })
            
            if (error) {
              console.error('❌ Error setting session:', error)
            } else {
              console.log('✅ Session set successfully:', data.user?.email)
            }
          } else {
            console.warn('⚠️ No tokens found in URL')
          }
        } catch (parseError) {
          console.error('❌ Error parsing OAuth callback:', parseError)
        }
      }
    }

    // Get initial URL (if app opened from link)
    Linking.getInitialURL().then((url) => {
      if (url) {
        console.log('🔗 Initial URL:', url)
        handleDeepLink({ url })
      }
    })

    // Listen for deep links while app is running
    const subscription = Linking.addEventListener('url', handleDeepLink)

    return () => {
      subscription.remove()
    }
  }, [])

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
  }

const signInWithOAuth = async (provider: 'google' | 'apple') => {
  try {
    console.log('🔵 Starting OAuth with', provider)
    
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'reticle://auth/callback',
        skipBrowserRedirect: true,
      },
    })
    
    if (error) throw error
    if (!data?.url) throw new Error('No OAuth URL returned')

    console.log('🔵 Opening browser...')
    const result = await WebBrowser.openAuthSessionAsync(
      data.url,
      'reticle://auth/callback'
    )
    
    console.log('🔵 Browser result type:', result.type)
    
    if (result.type === 'success' && result.url) {
      console.log('✅ OAuth success! Callback URL:', result.url)
      
      // Extract tokens from URL hash
      const url = new URL(result.url)
      const hash = url.hash.substring(1) // Remove #
      const params = new URLSearchParams(hash)
      
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')
      
      console.log('🔵 Extracted tokens:', { 
        hasAccess: !!accessToken, 
        hasRefresh: !!refreshToken 
      })

      if (accessToken && refreshToken) {
        console.log('🔵 Setting session...')
        const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        
        if (sessionError) {
          console.error('❌ Session error:', sessionError)
          throw sessionError
        }
        
        console.log('✅ Session set! User:', sessionData.user?.email)
      } else {
        throw new Error('No tokens in OAuth callback')
      }
    } else if (result.type === 'cancel') {
      console.log('⚠️ User cancelled OAuth')
    }
  } catch (err) {
    console.error('❌ OAuth error:', err)
    throw err
  }
}

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  return (
    <AuthContext.Provider 
      value={{ 
        user, 
        session, 
        loading, 
        signUp, 
        signIn, 
        signInWithOAuth,
        signOut 
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}