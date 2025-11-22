// contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
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
  switchProfile: (profileId: string, skipNavigation?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * ✨ SIMPLIFIED AUTH CONTEXT ✨
 * 
 * Handles ONLY global authentication (auth.users)
 * - Login/logout
 * - Profile selection (which profile is active)
 * - Global user data (email, name from auth.users)
 * 
 * All org-related data is handled by ProfileContext!
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null)

  /**
   * Handle user sign out
   */
  const handleSignOut = () => {
    router.replace("/auth/sign-in")
  }

  /**
   * Handle initial session (app startup)
   */
  const handleInitialSession = async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false)
      router.replace("/auth/sign-in")
      return
    }

    // Check if user has selected a profile
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
   * Handle new sign in
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.user) return
    setLoading(false)
    router.replace("/auth/select-profile")
  }

  /**
   * Switch active profile (THE MAIN USER OF THE APP)
   * @param profileId - The profile to switch to
   * @param skipNavigation - If true, don't navigate (useful for org page switches)
   */
  const switchProfile = async (profileId: string, skipNavigation: boolean = false) => {
    if (!user) return

    try {
      console.log('🔄 AUTH: Switching to profile:', profileId);
      
      // Update metadata (source of truth)
      await supabase.auth.updateUser({
        data: { active_profile_id: profileId }
      })

      // IMMEDIATELY update local state
      setActiveProfileId(profileId);
      
      // Refresh user object
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
      }

      console.log('✅ AUTH: Profile switched - app will transform');
      
      // Only navigate if requested (prevents unwanted redirects from org pages)
      if (!skipNavigation) {
        router.replace("/(protected)")
      }
    } catch (error) {
      console.error("Switch profile error:", error)
      throw error
    }
  }

  /**
   * Auth state change handler
   */
  const handleAuthStateChange = async (
    event: string,
    session: Session | null
  ) => {
    console.log("Auth event:", event)

    setSession(session)
    setUser(session?.user ?? null)
    
    // Update active profile from metadata
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
        setLoading(false)
        break
    }
  }

  // Setup auth listener
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      
      if (session?.user?.user_metadata?.active_profile_id) {
        setActiveProfileId(session.user.user_metadata.active_profile_id)
      }
      
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      handleAuthStateChange
    )

    return () => subscription.unsubscribe()
  }, [])

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
    setActiveProfileId(null)
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