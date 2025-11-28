// contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
import { AuthenticatedClient } from '@/services/authenticatedClient'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
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
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signInWithOAuth: (provider: 'google' | 'apple') => Promise<void>;
  signOut: () => Promise<void>;
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  switchToPersonal: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [transitioning, setTransitioning] = useState(false)

  // ═══════════════════════════════════════════════════
  // AUTH EVENT HANDLERS
  // ═══════════════════════════════════════════════════

  /**
   * Handle user sign out - clear state and redirect to login
   */
  const handleSignOut = () => {
    useWorkspaceStore.getState().reset()
    setTransitioning(true)
    setTimeout(() => {
      router.replace("/auth/sign-in")
      setTransitioning(false)
    }, 500)
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
    setLoading(false)
    
    // Load workspaces in background (don't reset activeWorkspace - let store preserve it)
    useWorkspaceStore.getState().loadWorkspaces().catch(err => 
      console.error("Background workspace load error:", err)
    )
    
    // Navigate to personal mode ONLY if no active workspace is set
    const currentActiveWorkspace = useWorkspaceStore.getState().activeWorkspaceId
    
    setTimeout(() => {
      if (currentActiveWorkspace) {
        // User was in an org, stay there
        if (__DEV__) console.log("📱 Auth: Preserving active workspace:", currentActiveWorkspace)
      } else {
        // No active workspace, go to personal
        router.replace("/(protected)/personal" as any)
      }
      setTransitioning(false)
    }, 100) // Reduced delay since we're not always navigating
  }

  /**
   * Handle new sign in - redirect to personal mode
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.user) return

    setTransitioning(true)
    setLoading(false)
    
    // Load workspaces in background
    useWorkspaceStore.getState().loadWorkspaces().catch(err => 
      console.error("Background workspace load error:", err)
    )
    
    // Navigate to personal mode
    setTimeout(() => {
      router.replace("/(protected)/personal" as any)
      setTransitioning(false)
    }, 800)
  }

  /**
   * Switch active workspace - updates user metadata and navigates
   */
  const switchWorkspace = async (workspaceId: string | null) => {
    if (__DEV__) console.log("switchWorkspace", workspaceId)
    
    try {
      // Update user metadata
      await supabase.auth.updateUser({
        data: { active_workspace_id: workspaceId }
      })

      // Refresh user to get updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
      }

      // Update workspace store
      useWorkspaceStore.getState().setActiveWorkspace(workspaceId)
      
      // Navigate to appropriate route
      if (workspaceId) {
        router.replace('/(protected)/org' as any)
      } else {
        router.replace('/(protected)/personal' as any)
      }
    } catch (error) {
      console.error("Switch workspace error:", error)
      throw error
    }
  }

  /**
   * Switch to personal mode
   */
  const switchToPersonal = async () => {
    if (__DEV__) console.log("switchToPersonal")
    await switchWorkspace(null)
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session)
      setUser(session?.user ?? null)
      setLoading(false)
      
      if (session?.user) {
        useWorkspaceStore.getState().loadWorkspaces().catch((err: Error) => 
          console.error("Background workspace load error:", err)
        )
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      handleAuthStateChange
    )

    return () => subscription.unsubscribe()
  }, [])

  // Initialize AuthenticatedClient
  useEffect(() => {
    AuthenticatedClient.initialize(
      async () => {
        const { data: { session } } = await supabase.auth.getSession()
        return session?.access_token ?? ""
      },
      () => {
        const currentUser = user
        if (!currentUser) return null
        
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId
        const isMyWorkspace = activeWorkspaceId === currentUser.id || !activeWorkspaceId
        
        return {
          userId: currentUser.id,
          workspaceId: isMyWorkspace ? null : activeWorkspaceId
        }
      }
    )
  }, [user])

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
    useWorkspaceStore.getState().reset()
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      transitioning,
      signUp,
      signIn,
      signInWithOAuth,
      signOut,
      switchWorkspace,
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
