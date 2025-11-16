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
   * Redirect to protected area and load workspaces in background
   */
  const handleInitialSession = async (session: Session | null) => {
    if (!session?.user) {
      setLoading(false)
      router.replace("/auth/sign-in")
      return
    }

    setLoading(false)
    router.replace("/(protected)")
    
    // Load workspaces in background (non-blocking)
    useWorkspaceStore.getState().loadWorkspaces(session.user.id).catch(err => 
      console.error("Background workspace load error:", err)
    )
  }

  /**
   * Handle new sign in - redirect to protected area and load workspaces
   */
  const handleSignIn = async (session: Session | null) => {
    if (!session?.user) return

    setLoading(false)
    router.replace("/(protected)")
    
    // Load workspaces in background (non-blocking)
    useWorkspaceStore.getState().loadWorkspaces(session.user.id).catch(err => 
      console.error("Background workspace load error:", err)
    )
  }

  /**
   * Switch active workspace
   * Updates user.user_metadata.active_workspace_id (SINGLE SOURCE OF TRUTH)
   */
  const switchWorkspace = async (workspaceId: string | null) => {
    if (!user) return

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

      // ✨ No need to update workspace store!
      // workspaceStore is just a cache of available workspaces
      // Active workspace is determined by user.user_metadata.active_workspace_id
    } catch (error) {
      console.error("Switch workspace error:", error)
      throw error
    }
  }

  /**
   * Switch to personal mode
   */
  const switchToPersonal = async () => {
    await switchWorkspace(null)
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
        useWorkspaceStore.getState().loadWorkspaces(session.user.id).catch((err: Error) => 
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
        
        const activeWorkspaceId = user.user_metadata?.active_workspace_id
        
        // Get workspace to check type
        const activeWorkspace = useWorkspaceStore.getState().getActiveWorkspace(activeWorkspaceId)
        
        // ✅ Check workspace TYPE, not ID
        const isPersonal = !activeWorkspace || activeWorkspace.workspace_type === "personal"
        
        return {
          userId: user.id,
          workspaceId: isPersonal ? null : activeWorkspaceId ?? null
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
          
          const activeWorkspaceId = user.user_metadata?.active_workspace_id
          
          // Get workspace to check type
          const activeWorkspace = useWorkspaceStore.getState().getActiveWorkspace(activeWorkspaceId)
          
          // ✅ Check workspace TYPE, not ID
          const isPersonal = !activeWorkspace || activeWorkspace.workspace_type === "personal"
          
          console.log("🔍 AuthClient context - activeWorkspaceId:", activeWorkspaceId)
          console.log("🔍 AuthClient context - workspace_type:", activeWorkspace?.workspace_type)
          console.log("🔍 AuthClient context - returning workspaceId:", isPersonal ? null : activeWorkspaceId)
          
          return {
            userId: user.id,
            workspaceId: isPersonal ? null : activeWorkspaceId ?? null
          }
        }
      )
    }
  }, [user?.user_metadata?.active_workspace_id]) // Only when workspace changes

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
