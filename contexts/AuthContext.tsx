// contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
import { AuthenticatedClient } from '@/services/authenticatedClient'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import React, { createContext, useContext, useEffect, useState } from 'react'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  activeProfileId: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  switchProfile: (profileId: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

  // ═══════════════════════════════════════════════════
  // AUTH EVENT HANDLERS
  // ═══════════════════════════════════════════════════

  /**
   * Handle user sign out - clear state and redirect to login
   */
  const handleSignOut = () => {
    router.replace("/auth/sign-in")
  }

  /**
   * Handle initial session (app startup with existing session)
   * Check if user has selected a profile, otherwise show profile selector
   */
  const handleInitialSession = async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false)
      router.replace("/auth/sign-in")
      return
    }

    // Check if user has an active profile selected
    const savedProfileId = session.user.user_metadata?.active_profile_id
    
    if (savedProfileId) {
      setActiveProfileId(savedProfileId)
      setLoading(false)
      router.replace("/(protected)")
    } else {
      // No profile selected, show profile selector
      setLoading(false)
      router.replace("/auth/select-profile")
    }
  }

  /**
   * Handle new sign in - redirect to profile selector
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.user) return

    setLoading(false)
    
    // Redirect to profile selector
    router.replace("/auth/select-profile")
  }

  /**
   * Switch active profile
   * Updates user.user_metadata.active_profile_id (SINGLE SOURCE OF TRUTH)
   */
  const switchProfile = async (profileId: string) => {
    if (!user) return

    try {
      // Update user metadata
      await supabase.auth.updateUser({
        data: { active_profile_id: profileId }
      })

      // Refresh user to get updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
        setActiveProfileId(profileId)
      }

      // Redirect to home to refresh with new profile context
      router.replace("/(protected)")
    } catch (error) {
      console.error("Switch profile error:", error)
      throw error
    }
  }

  /**
   * Main auth state change handler - routes to specific handlers
   */
  const handleAuthStateChange = async (
    event: string,
    session: Session | null
  ) => {
    console.log("Auth event:", event)

    setSession(session)
    setUser(session?.user ?? null)
    
    // Update active profile from user metadata
    if (session?.user?.user_metadata?.active_profile_id) {
      setActiveProfileId(session.user.user_metadata.active_profile_id)
    } else {
      setActiveProfileId(null)
    }

    switch (event) {
      case "SIGNED_OUT":
        setLoading(false)
        setActiveProfileId(null)
        handleSignOut()
        break

      case "INITIAL_SESSION":
        await handleInitialSession(session)
        break

      case "SIGNED_IN":
        await handleSignIn(session)
        break

      default:
        // Handle other events (TOKEN_REFRESHED, etc.)
        setLoading(false)
        break
    }
  }

  // ═══════════════════════════════════════════════════
  // SETUP AUTH LISTENER
  // ═══════════════════════════════════════════════════

  useEffect(() => {
    // Initialize session on mount
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      // Set active profile from metadata
      if (session?.user?.user_metadata?.active_profile_id) {
        setActiveProfileId(session.user.user_metadata.active_profile_id)
      }
      
      setLoading(false)
    })

    // Subscribe to auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      handleAuthStateChange
    )

    return () => subscription.unsubscribe()
  }, [])

  // Initialize AuthenticatedClient ONCE when component mounts
  useEffect(() => {
    AuthenticatedClient.initialize(
      // Token provider
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? ""
      },
      // Context provider - provides active profile ID
      () => {
        if (!user) return null
        
        return {
          userId: user.id,
          profileId: activeProfileId  // Currently active profile
        }
      }
    )
  }, []) // Only initialize ONCE

  // Update context when user or profile changes
  useEffect(() => {
    if (user) {
      // Re-initialize with fresh context provider
      AuthenticatedClient.initialize(
        async () => {
          const { data: { session } } = await supabase.auth.getSession()
          return session?.access_token ?? ""
        },
        () => {
          if (!user) return null
          
          return {
            userId: user.id,
            profileId: activeProfileId
          }
        }
      )
    }
  }, [user?.id, activeProfileId]) // When user or active profile changes

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (error) throw error
  }

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signInWithOAuth = async (provider: 'google' | 'apple') => {
    const { data } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: 'retic://auth/callback',
        skipBrowserRedirect: true,
      },
    })

    const result = await WebBrowser.openAuthSessionAsync(
      data.url ?? '',
      'retic://auth/callback'
    )

    if (result.type === "success" && result.url) {
      const params = new URLSearchParams(result.url.split('#')[1])
      await supabase.auth.setSession({
        access_token: params.get("access_token")!,
        refresh_token: params.get("refresh_token")!,
      })
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
    router.replace('/auth/sign-in')
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      activeProfileId,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      switchProfile
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
