import { useAuth } from "@/contexts/AuthContext";
import { useWorkspaceStore } from "@/store/useWorkspaceStore";
import { useMemo } from "react";

export interface AppContext {
  // User
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  
  // Workspace
  workspaceId: string | null;
  activeWorkspace: {
    id: string;
    name: string;
    workspace_type: "personal" | "organization";
    description: string | null;
  } | null;
  
  // Context type
  isPersonal: boolean;
  isOrganization: boolean;
  
  // All workspaces
  workspaces: any[];
  
  // Actions
  switchWorkspace: (workspaceId: string | null) => Promise<void>;
  switchToPersonal: () => Promise<void>;
  
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
 * Examples:
 * ```
 * const { userId, workspaceId, activeWorkspace, isPersonal } = useAppContext()
 * ```
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading, switchWorkspace, switchToPersonal } = useAuth();
  const { workspaces, getActiveWorkspace, loading: workspacesLoading } = useWorkspaceStore();

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
        workspaceId: null,
        activeWorkspace: null,
        
        // Context type
        isPersonal: true,
        isOrganization: false,
        
        // All workspaces
        workspaces: [],
        
        // Actions
        switchWorkspace: async () => {},
        switchToPersonal: async () => {},
        
        // Loading
        loading: authLoading,
        isAuthenticated: false,
      };
    }

    // ✅ SINGLE SOURCE OF TRUTH: user.user_metadata
    const activeWorkspaceId = user.user_metadata?.active_workspace_id;
    const activeWorkspace = getActiveWorkspace(activeWorkspaceId);
    
    // ✅ Check workspace TYPE, not ID!
    const isPersonal = !activeWorkspace || activeWorkspace.workspace_type === "personal";
    const isOrganization = !!activeWorkspace && activeWorkspace.workspace_type === "organization";
    
    console.log('🔍 useAppContext - activeWorkspaceId:', activeWorkspaceId);
    console.log('🔍 useAppContext - activeWorkspace:', activeWorkspace);
    console.log('🔍 useAppContext - isPersonal:', isPersonal);
    console.log('🔍 useAppContext - isOrganization:', isOrganization);

    return {
      // User
      userId: user.id,
      email: user.email ?? null,
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      
      // Workspace
      workspaceId: isOrganization ? activeWorkspaceId ?? null : null,  // null for personal
      activeWorkspace,
      
      // Context type
      isPersonal,
      isOrganization,
      
      // All workspaces
      workspaces,
      
      // Actions
      switchWorkspace,
      switchToPersonal,
      
      // Loading
      loading: authLoading || workspacesLoading,
      isAuthenticated: true,
    };
  }, [user, workspaces, authLoading, workspacesLoading, getActiveWorkspace, switchWorkspace, switchToPersonal]);

  return context;
}

