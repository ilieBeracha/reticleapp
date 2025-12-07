import { useAuth } from "@/contexts/AuthContext";
import { useTeamStore } from "@/store/teamStore";
import type { TeamWithRole, TeamRole } from "@/types/workspace";
import { router } from "expo-router";
import { useCallback, useMemo } from "react";

export interface AppContext {
  // User
  userId: string | null;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
  
  // Team (primary entity)
  activeTeamId: string | null;
  activeTeam: TeamWithRole | null;
  myRole: TeamRole | null;
  
  // All my teams
  teams: TeamWithRole[];
  hasTeams: boolean;
  
  // Actions
  switchTeam: (teamId: string | null) => Promise<void>;
  
  // Loading states
  loading: boolean;
  isAuthenticated: boolean;
  
  // Permissions helpers
  canManageTeam: boolean;  // owner or commander
  isOwner: boolean;
  isCommander: boolean;
}

/**
 * ✨ THE SINGLE SOURCE OF TRUTH ✨
 * 
 * Use this hook in ALL components to get user and team context.
 * NEVER access user or team data directly from other sources.
 * 
 * TEAM-FIRST ARCHITECTURE:
 * - Teams are the primary entity
 * - Users create and manage teams directly
 * - No organization layer
 */
export function useAppContext(): AppContext {
  const { user, loading: authLoading } = useAuth();
  const { 
    teams, 
    activeTeamId,    
    loading: teamsLoading,
    setActiveTeam,
    setIsSwitching,
  } = useTeamStore();

  /**
   * Switch team - Updates state
   */
  const handleSwitchTeam = useCallback(async (teamId: string | null) => {
    setIsSwitching(true);
    setActiveTeam(teamId);
    
    // Small delay for smooth transition
    setTimeout(() => {
      setIsSwitching(false);
    }, 300);
  }, [setActiveTeam, setIsSwitching]);

  // Calculate derived values with memoization
  const context = useMemo<AppContext>(() => {
    if (!user) {
      return {
        // User
        userId: null,
        email: null,
        fullName: null,
        avatarUrl: null,
        
        // Team
        activeTeamId: null,
        activeTeam: null,
        myRole: null,
        
        // All teams
        teams: [],
        hasTeams: false,
        
        // Actions
        switchTeam: handleSwitchTeam,
        
        // Loading
        loading: authLoading,
        isAuthenticated: false,
        
        // Permissions
        canManageTeam: false,
        isOwner: false,
        isCommander: false,
      };
    }

    // Active team
    const activeTeam = activeTeamId 
      ? teams.find(t => t.id === activeTeamId) || null
      : null;
    
    const myRole = activeTeam?.my_role || null;
    const isOwner = myRole === 'owner';
    const isCommander = myRole === 'commander';
    const canManageTeam = isOwner || isCommander;

    return {
      // User
      userId: user.id,
      email: user.email ?? null,
      fullName: user.user_metadata?.full_name ?? null,
      avatarUrl: user.user_metadata?.avatar_url ?? null,
      
      // Team
      activeTeamId,
      activeTeam,
      myRole,
      
      // All teams
      teams,
      hasTeams: teams.length > 0,
      
      // Actions
      switchTeam: handleSwitchTeam,
      
      // Loading
      loading: authLoading || teamsLoading,
      isAuthenticated: true,
      
      // Permissions
      canManageTeam,
      isOwner,
      isCommander,
    };
  }, [
    user,
    teams,
    activeTeamId,
    authLoading,
    teamsLoading,
    handleSwitchTeam,
  ]);

  return context;
}

// =====================================================
// LEGACY EXPORTS - For backwards compatibility
// =====================================================

/** @deprecated Use activeTeamId instead */
export const useActiveWorkspaceId = () => useAppContext().activeTeamId;

/** @deprecated Use activeTeam instead */
export const useActiveWorkspace = () => useAppContext().activeTeam;

/** @deprecated Use teams instead */
export const useWorkspaces = () => useAppContext().teams;
