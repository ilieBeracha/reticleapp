// contexts/AuthContext.tsx
import { supabase } from '@/lib/supabase'
import { AuthenticatedClient } from '@/services/authenticatedClient'
import { useWorkspaceStore } from '@/store/useWorkspaceStore'
import { Session, User } from '@supabase/supabase-js'
import { router } from 'expo-router'
import * as WebBrowser from 'expo-web-browser'
import React, { createContext, useContext, useEffect, useState } from 'react'

WebBrowser.maybeCompleteAuthSession()

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  transitioning: boolean;  // New: true during auth transitions (sign in/out)
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
    // Clear workspace store
    useWorkspaceStore.getState().reset()
    
    // Show transition loading
    setTransitioning(true)
    
    // Small delay for smooth transition, then navigate
    setTimeout(() => {
      router.replace("/auth/sign-in")
      setTransitioning(false)
    }, 500)
  }

  /**
   * Handle initial session (app startup with existing session)
   * Redirect to protected area and load workspaces in background
   */
  const handleInitialSession = async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false)
      router.replace("/auth/sign-in")
      return
    }

    // Show transition loading
    setTransitioning(true)
    setLoading(false)
    
    // ALWAYS clear the stored workspace ID on app start to force personal mode
    // This ensures users ALWAYS start with their personal profile
    await supabase.auth.updateUser({
      data: { active_workspace_id: null }
    }).catch(err => console.error("Failed to clear workspace ID:", err))
    
    // Force workspace store to personal mode
    useWorkspaceStore.getState().setActiveWorkspace(null)
    
    // Load workspaces in background (non-blocking)
    // This will also set activeWorkspaceId to null
    useWorkspaceStore.getState().loadWorkspaces().catch(err => 
      console.error("Background workspace load error:", err)
    )
    
    // Navigate with smooth transition
    setTimeout(() => {
      router.replace("/(protected)/workspace")
      setTransitioning(false)
    }, 800)
  }

  /**
   * Handle new sign in - redirect to protected area and load workspaces
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.user) return

    // Show transition loading
    setTransitioning(true)
    setLoading(false)
    
    // Load workspaces in background (non-blocking)
    useWorkspaceStore.getState().loadWorkspaces().catch(err => 
      console.error("Background workspace load error:", err)
    )
    
    // Navigate with smooth transition
    setTimeout(() => {
      router.replace("/(protected)/workspace")
      setTransitioning(false)
    }, 800)
  }

  /**
   * Switch active workspace
   * Updates user.user_metadata.active_workspace_id (SINGLE SOURCE OF TRUTH)
   */
  const switchWorkspace = async (workspaceId: string | null) => {
    console.log("switchWorkspace", workspaceId)
    
    try {
      // Update user metadata (SINGLE SOURCE OF TRUTH)
      await supabase.auth.updateUser({
        data: { active_workspace_id: workspaceId }  // null = personal mode
      })

      // Refresh user to get updated metadata
      const { data: { user: updatedUser } } = await supabase.auth.getUser()
      if (updatedUser) {
        setUser(updatedUser)
      }

      // Update workspace store to reflect the change
      useWorkspaceStore.getState().setActiveWorkspace(workspaceId)
    } catch (error) {
      console.error("Switch workspace error:", error)
      throw error
    }
  }

  /**
   * Switch to personal mode
   */
  const switchToPersonal = async () => {
    console.log("switchToPersonal")
    await switchWorkspace(null)
    console.log("switchToPersonal done")
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
      setLoading(false)
      
      // Load workspaces in background (non-blocking)
      if (session?.user) {
        useWorkspaceStore.getState().loadWorkspaces().catch((err: Error) => 
          console.error("Background workspace load error:", err)
        )
      }
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
      // Context provider - gets LATEST user from closure
      () => {
        // This function is called fresh each time getContext() is called
        // So it always has the latest user state
        if (!user) return null
        
        const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId
        
        // ✅ In new model: user.id is MY workspace
        // activeWorkspaceId is the workspace I'm currently viewing (mine or someone else's)
        const isMyWorkspace = activeWorkspaceId === user.id || !activeWorkspaceId
        
        return {
          userId: user.id,
          workspaceId: isMyWorkspace ? null : activeWorkspaceId  // null = my workspace, else = viewing someone else's
        }
      }
    )
  }, []) // Only initialize ONCE

  // Update context when user changes (for workspace switches)
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
          
          const activeWorkspaceId = useWorkspaceStore.getState().activeWorkspaceId
          
          // ✅ In new model: user.id is MY workspace
          const isMyWorkspace = activeWorkspaceId === user.id || !activeWorkspaceId
        
          return {
            userId: user.id,
            workspaceId: isMyWorkspace ? null : activeWorkspaceId
          }
        }
      )
    }
  }, [user?.id, useWorkspaceStore.getState().activeWorkspaceId]) // When user or active workspace changes

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
    // Clear workspace store FIRST
    useWorkspaceStore.getState().reset()
    
    // Sign out from Supabase (triggers SIGNED_OUT event)
    await supabase.auth.signOut()
    
    // Clear local state
    setUser(null)
    setSession(null)
    
    // Navigation will be handled by handleSignOut via SIGNED_OUT event
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