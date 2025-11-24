import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types/workspace";
import { useRouter } from "expo-router";
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
 * Org-Only Model: Users must belong to organizations
 * - No personal workspaces
 * - Can view different orgs they have access to
 * - If user has no orgs, they need to create or join one
 * 
 * Examples:
 * ```
 * const { userId, activeWorkspaceId, activeWorkspace } = useAppContext()
 * ```
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { 
    workspaces, 
    activeWorkspaceId,    
    loading: workspacesLoading,
    setActiveWorkspace
  } = useWorkspaceStore();

  // Stable switchWorkspace callback
  const handleSwitchWorkspace = useCallback(async (workspaceId: string | null) => {
    setActiveWorkspace(workspaceId);
    router.replace('/(protected)/workspace');
  }, [setActiveWorkspace, router]);

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
    handleSwitchWorkspace
  ]);

  return context;
}
