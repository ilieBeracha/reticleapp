import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types/workspace";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";

export interface AppContext {
  // User
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  
  // Workspace (org-only)
  activeWorkspaceId: string | null;  // Currently viewing organization
  activeWorkspace: Workspace | null;
  
  // All accessible organizations
  workspaces: Workspace[];
  
  // Actions
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  navigateToWorkspace: (workspaceId: string | null) => void;
  
  // Loading states
  loading: boolean;
  isAuthenticated: boolean;
}

/**
 * ✨ THE SINGLE SOURCE OF TRUTH ✨
 * 
 * Use this hook in ALL components to get user and workspace context.
 * NEVER access user or workspace data directly from other sources.
 * 
 * ROUTING MODEL:
 * - Personal mode: /(protected)/personal/*
 * - Org mode: /(protected)/org/* (store has activeWorkspaceId)
 * 
 * switchWorkspace now navigates to the appropriate route!
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading } = useAuth();
  const { 
    workspaces, 
    activeWorkspaceId,    
    loading: workspacesLoading,
    setActiveWorkspace
  } = useWorkspaceStore();

  /**
   * Navigate to a workspace or personal mode
   * This just does navigation, no state changes
   */
  const navigateToWorkspace = useCallback((workspaceId: string | null) => {
    if (workspaceId) {
      // Navigate to org mode (store has the active workspace ID)
      router.replace('/(protected)/org' as any);
    } else {
      // Navigate to personal mode
      router.replace('/(protected)/personal' as any);
    }
  }, []);

  /**
   * Switch workspace - Updates state AND navigates
   * Use this from UI actions (like workspace switcher)
   */
  const handleSwitchWorkspace = useCallback(async (workspaceId: string | null) => {
    // Update state
    setActiveWorkspace(workspaceId);
    
    // Navigate to the appropriate route
    navigateToWorkspace(workspaceId);
  }, [setActiveWorkspace, navigateToWorkspace]);

  // Calculate derived values with memoization
  const context = useMemo<AppContext>(() => {
    if (!user) {
      return {
        // User
        userId: null,
        email: null,
        fullName: null,
        avatarUrl: null,
        
        // Workspace
        activeWorkspaceId: null,
        activeWorkspace: null,
        
        // All workspaces
        workspaces: [],
        
        // Actions
        switchWorkspace: handleSwitchWorkspace,
        navigateToWorkspace,
        
        // Loading
        loading: authLoading,
        isAuthenticated: false,
      };
    }

    // Active workspace (only if activeWorkspaceId is not null)
    const activeWorkspace = activeWorkspaceId 
      ? workspaces.find(w => w.id === activeWorkspaceId) || null
      : null;

    return {
      // User
      userId: user.id,
      email: user.email ?? null,
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      
      // Workspace
      activeWorkspaceId: activeWorkspaceId,
      activeWorkspace,
      
      // All workspaces
      workspaces,
      
      // Actions
      switchWorkspace: handleSwitchWorkspace,
      navigateToWorkspace,
      
      // Loading
      loading: authLoading || workspacesLoading,
      isAuthenticated: true,
    };
  }, [
    user,
    workspaces,
    activeWorkspaceId,
    authLoading,
    workspacesLoading,
    handleSwitchWorkspace,
    navigateToWorkspace
  ]);

  return context;
}
