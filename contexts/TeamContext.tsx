/**
 * Team Context - Team-First Architecture
 * 
 * Provides team role and permissions for the active team.
 * Simplified from OrgRoleContext - no organization layer.
 */

import { useTeamStore } from '@/store/teamStore';
import type { TeamRole, TeamMemberWithProfile } from '@/types/workspace';
import React, { createContext, useContext, useMemo } from 'react';

interface TeamContextValue {
  // Team info
  teamId: string | null;
  teamName: string | null;
  
  // My role in the team
  myRole: TeamRole | null;
  isOwner: boolean;
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
  
  // Permissions
  canManageTeam: boolean;      // owner or commander
  canInviteMembers: boolean;   // owner or commander
  canCreateTrainings: boolean; // owner or commander
  canManageMembers: boolean;   // owner or commander
  
  // Members
  members: TeamMemberWithProfile[];
  memberCount: number;
  
  // Loading state
  loading: boolean;
  
  // Is there an active team?
  hasActiveTeam: boolean;
}

const DEFAULT_TEAM_CONTEXT: TeamContextValue = {
  teamId: null,
  teamName: null,
  myRole: null,
  isOwner: false,
  isCommander: false,
  isSquadCommander: false,
  isSoldier: false,
  canManageTeam: false,
  canInviteMembers: false,
  canCreateTrainings: false,
  canManageMembers: false,
  members: [],
  memberCount: 0,
  loading: false,
  hasActiveTeam: false,
};

const TeamContext = createContext<TeamContextValue>(DEFAULT_TEAM_CONTEXT);

export function TeamProvider({ children }: { children: React.ReactNode }) {
  const { 
    activeTeamId, 
    activeTeam,
    members,
    loading,
    teams,
  } = useTeamStore();

  const value = useMemo<TeamContextValue>(() => {
    // Find my role in active team
    const myTeam = teams.find(t => t.id === activeTeamId);
    const myRole = myTeam?.my_role || null;
    
    const isOwner = myRole === 'owner';
    const isCommander = myRole === 'commander';
    const isSquadCommander = myRole === 'squad_commander';
    const isSoldier = myRole === 'soldier';
    
    const canManageTeam = isOwner || isCommander;
    
    return {
      teamId: activeTeamId,
      teamName: activeTeam?.name || myTeam?.name || null,
      myRole,
      isOwner,
      isCommander,
      isSquadCommander,
      isSoldier,
      canManageTeam,
      canInviteMembers: canManageTeam,
      canCreateTrainings: canManageTeam,
      canManageMembers: canManageTeam,
      members,
      memberCount: members.length || activeTeam?.member_count || myTeam?.member_count || 0,
      loading,
      hasActiveTeam: !!activeTeamId,
    };
  }, [activeTeamId, activeTeam, members, loading, teams]);

  return (
    <TeamContext.Provider value={value}>
      {children}
    </TeamContext.Provider>
  );
}

/**
 * Hook to access team context
 */
export function useTeamContext(): TeamContextValue {
  return useContext(TeamContext);
}

/**
 * Check if user can manage the current team
 */
export function useCanManageTeam(): boolean {
  const { canManageTeam } = useTeamContext();
  return canManageTeam;
}

/**
 * Get current user's role in the active team
 */
export function useMyTeamRole(): TeamRole | null {
  const { myRole } = useTeamContext();
  return myRole;
}

