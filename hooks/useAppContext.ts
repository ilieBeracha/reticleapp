import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import type { Workspace } from "@/types/workspace";
import { useMemo } from "react";

export interface AppContext {
  // User
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  
  // Workspace (user IS a workspace)
  myWorkspaceId: string | null;  // Always my profile.id
  activeWorkspaceId: string | null;  // Currently viewing workspace (could be mine or someone else's)
  activeWorkspace: Workspace | null;
  
  // Context type
  isMyWorkspace: boolean;  // Viewing my own workspace
  isOtherWorkspace: boolean;  // Viewing someone else's workspace
  
  // All accessible workspaces
  workspaces: Workspace[];
  
  // Actions
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  switchToMyWorkspace: () => Promise<void>;
  
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
 * Simplified Model: User = Workspace
 * - Every user's profile IS their workspace
 * - Can view own workspace or other workspaces they have access to
 * 
 * Examples:
 * ```
 * const { userId, myWorkspaceId, activeWorkspaceId, isMyWorkspace } = useAppContext()
 * ```
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading } = useAuth();
  const { 
    workspaces, 
    activeWorkspaceId, 
    setActiveWorkspace,
    loading: workspacesLoading 
  } = useWorkspaceStore();

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
        myWorkspaceId: null,
        activeWorkspaceId: null,
        activeWorkspace: null,
        
        // Context type
        isMyWorkspace: true,
        isOtherWorkspace: false,
        
        // All workspaces
        workspaces: [],
        
        // Actions
        switchWorkspace: async () => {},
        switchToMyWorkspace: async () => {},
        
        // Loading
        loading: authLoading,
        isAuthenticated: false,
      };
    }

    // In simplified model: user.id IS their workspace ID
    const myWorkspaceId = user.id;
    
    // Active workspace could be mine or someone else's
    const currentActiveId = activeWorkspaceId || myWorkspaceId;
    const activeWorkspace = workspaces.find(w => w.id === currentActiveId) || null;
    
    // Check if viewing my workspace
    const isMyWorkspace = currentActiveId === myWorkspaceId;
    const isOtherWorkspace = !isMyWorkspace;
    
    console.log('🔍 useAppContext:');
    console.log('  - myWorkspaceId:', myWorkspaceId);
    console.log('  - activeWorkspaceId:', currentActiveId);
    console.log('  - activeWorkspace:', activeWorkspace?.workspace_name);
    console.log('  - isMyWorkspace:', isMyWorkspace);
    console.log('  - workspaces count:', workspaces.length);

    return {
      // User
      userId: user.id,
      email: user.email ?? null,
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      
      // Workspace
      myWorkspaceId,
      activeWorkspaceId: currentActiveId,
      activeWorkspace,
      
      // Context type
      isMyWorkspace,
      isOtherWorkspace,
      
      // All workspaces
      workspaces,
      
      // Actions
      switchWorkspace: async (workspaceId: string | null) => {
        setActiveWorkspace(workspaceId || myWorkspaceId);
      },
      switchToMyWorkspace: async () => {
        setActiveWorkspace(myWorkspaceId);
      },
      
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
    setActiveWorkspace
  ]);

  return context;
}
