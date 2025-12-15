// contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
import { useTeamStore } from '@/store/teamStore'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import React, { createContext, useContext, useEffect, useRef, useState } from 'react'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  transitioning: boolean;
  profileFullName: string | null;
  profileAvatarUrl: string | null;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  switchTeam: (teamId: string | null) => Promise<void>;
  switchToPersonal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)
  const [profileFullName, setProfileFullName] = useState<string | null>(null)
  const [profileAvatarUrl, setProfileAvatarUrl] = useState<string | null>(null)

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', userId)
        .maybeSingle()

      if (error) {
        console.warn("Auth: profile fetch error:", error.message)
        return
      }

      setProfileFullName((data as any)?.full_name ?? null)
      setProfileAvatarUrl((data as any)?.avatar_url ?? null)
    } catch (e) {
      console.warn("Auth: profile fetch exception:", e)
    }
  }

  // ═══════════════════════════════════════════════════
  // AUTH EVENT HANDLERS
  // ═══════════════════════════════════════════════════

  /**
   * Handle user sign out - clear state and redirect to login
   */
  const handleSignOut = () => {
    // Reset team state
    useTeamStore.getState().reset()
    setProfileFullName(null)
    setProfileAvatarUrl(null)
    // Reset initial session handler so next login works correctly
    initialSessionHandledRef.current = false
    // Transition to login
    setTransitioning(true)
    
    setTimeout(() => {
      router.replace("/auth/sign-in")
      // Small delay before removing overlay to ensure navigation completes
      setTimeout(() => setTransitioning(false), 200)
    }, 100)
  }

  // Track if we've handled initial session to prevent re-triggers
  const initialSessionHandledRef = useRef(false)

  /**
   * Handle initial session (app startup with existing session)
   * Only runs ONCE on true app startup, not on re-triggers
   */
  const handleInitialSession = async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false)
      router.replace("/auth/sign-in")
      return
    }

    // Skip if already handled (prevents re-triggers from resetting state)
    if (initialSessionHandledRef.current) {
      if (__DEV__) console.log("📱 Auth: Initial session already handled, skipping")
      setLoading(false)
      return
    }
    initialSessionHandledRef.current = true

    setTransitioning(true)
    setLoading(true)
    
    // Load teams in background
    useTeamStore.getState().loadTeams().catch(err => 
      console.error("Background team load error:", err)
    )

    // Hydrate profile before rendering home to avoid "blank then name" flash
    await fetchProfile(session.user.id)
    setLoading(false)
    
    // Navigate to home (always start in personal mode)
    setTimeout(() => {
      router.replace("/(protected)/(tabs)")
      setTransitioning(false)
    }, 100)
  }

  /**
   * Handle new sign in - redirect to home
   * Note: We don't await fetchProfile here because the Supabase client
   * may not be fully ready for authenticated requests right after setSession.
   * The profile loads in background while user sees the home screen.
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.access_token) {
      setLoading(false)
      return
    }

    setTransitioning(true)
    
    // Load teams in background (don't await - let it happen while navigating)
    useTeamStore.getState().loadTeams().catch(err => 
      console.error("Background team load error:", err)
    )

    // Fetch profile in background (don't block navigation)
    fetchProfile(session.user.id).catch(err => 
      console.warn("Background profile fetch error:", err)
    )
    
    // Navigate to home immediately (profile will load in background)
    setLoading(false)
    setTimeout(() => {
      router.replace("/(protected)/(tabs)")
      setTransitioning(false)
    }, 300)
  }

  /**
   * Switch active team - updates store (no navigation needed, UI will update)
   */
  const switchTeam = async (teamId: string | null) => {
    if (__DEV__) console.log("switchTeam", teamId)
    
    try {
      // Update user metadata
      await supabase.auth.updateUser({
        data: { active_team_id: teamId }
      })

      // Refresh user to get updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
      }

      // Update workspace store
      useTeamStore.getState().setActiveTeam(teamId)
      
      // No navigation needed - UI updates reactively based on activeTeamId
    } catch (error) {
      console.error("Switch team error:", error)
      throw error
    }
  }

  /**
   * Switch to personal mode (no team context)
   */
  const switchToPersonal = async () => {
    if (__DEV__) console.log("switchToPersonal")
    await switchTeam(null)
    if (__DEV__) console.log("switchToPersonal done")
  }

  /**
   * Main auth state change handler
   */
  const handleAuthStateChange = async (
    event: string,
    session: Session | null
  ) => {
    if (__DEV__) console.log("Auth event:", event)

    setSession(session)
    setUser(session?.user ?? null)

    switch (event) {
      case "SIGNED_OUT":
        setLoading(false)
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

  // ═══════════════════════════════════════════════════
  // SETUP AUTH LISTENER
  // ═══════════════════════════════════════════════════

  useEffect(() => {
    // Only set up the auth state listener - let INITIAL_SESSION handle everything
    // This prevents duplicate session handling and race conditions
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
      const access_token = result.url.split('access_token=')[1].split('&')[0]
      const refresh_token = result.url.split('refresh_token=')[1].split('&')[0]
      await supabase.auth.setSession({
        access_token: access_token!,
        refresh_token: refresh_token!,
      })
    }
  }

  const signOut = async () => {
    useTeamStore.getState().reset()
    await supabase.auth.signOut(
      {scope: 'global'}
    )
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      transitioning,
      profileFullName,
      profileAvatarUrl,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      switchTeam,
      switchToPersonal
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
