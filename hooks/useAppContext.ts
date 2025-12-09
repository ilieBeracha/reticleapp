/**
 * APP CONTEXT HOOK
 * 
 * Simple hook combining auth user + team store basics.
 * For detailed team/permissions, use the store selectors directly.
 */

import { useAuth } from "@/contexts/AuthContext";
import { useTeamStore } from "@/store/teamStore";

export interface AppContext {
  // User info
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  isAuthenticated: boolean;
  
  // Basic team info (use store selectors for more)
  activeTeamId: string | null;
  hasTeams: boolean;
  
  // Loading
  loading: boolean;
}

/**
 * Get basic app context (user + team mode)
 * 
 * For team details: use useActiveTeam(), useMyTeamRole(), etc. from store
 * For permissions: use usePermissions()
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading } = useAuth();
  const { teams, activeTeamId, loading: teamsLoading } = useTeamStore();

  if (!user) {
    return {
      userId: null,
      email: null,
      fullName: null,
      avatarUrl: null,
      isAuthenticated: false,
      activeTeamId: null,
      hasTeams: false,
      loading: authLoading,
    };
  }

  return {
    userId: user.id,
    email: user.email ?? null,
    fullName: user.user_metadata?.full_name ?? null,
    avatarUrl: user.user_metadata?.avatar_url ?? null,
    isAuthenticated: true,
    activeTeamId,
    hasTeams: teams.length > 0,
    loading: authLoading || teamsLoading,
  };
}

// =====================================================
// LEGACY EXPORTS - For backwards compatibility
// =====================================================

/** @deprecated Use activeTeamId from useAppContext() or useTeamStore */
export const useActiveWorkspaceId = () => useTeamStore(s => s.activeTeamId);

/** @deprecated Use useActiveTeam() from store */
export const useActiveWorkspace = () => {
  const { teams, activeTeamId } = useTeamStore();
  return teams.find(t => t.id === activeTeamId) || null;
};

/** @deprecated Use useTeamStore().teams */
export const useWorkspaces = () => useTeamStore(s => s.teams);
