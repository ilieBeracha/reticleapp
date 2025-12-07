import { useTeamStore } from '@/store/teamStore';
import type { TeamRole, TeamMemberWithProfile } from '@/types/workspace';
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

/**
 * TEAM ROLE CONTEXT
 * Provides current user's role and permissions in the active team
 * 
 * Simplified from OrgRoleContext - no organization layer
 */

interface TeamRoleContextValue {
  // Current user
  currentUserId: string | null;
  
  // Team role
  myRole: TeamRole | null;
  isOwner: boolean;
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
  
  // Permissions
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canCreateTrainings: boolean;
  canRemoveMembers: boolean;
  
  // Team info
  hasTeam: boolean;
  teamId: string | null;
  teamName: string | null;
  
  // Loading
  loading: boolean;
}

const DEFAULT_VALUE: TeamRoleContextValue = {
  currentUserId: null,
  myRole: null,
  isOwner: false,
  isCommander: false,
  isSquadCommander: false,
  isSoldier: false,
  canManageTeam: false,
  canInviteMembers: false,
  canCreateTrainings: false,
  canRemoveMembers: false,
  hasTeam: false,
  teamId: null,
  teamName: null,
  loading: true,
};

const TeamRoleContext = createContext<TeamRoleContextValue>(DEFAULT_VALUE);

export function TeamRoleProvider({ children }: { children: React.ReactNode }) {
  const { teams, activeTeamId, activeTeam, members, loading: storeLoading } = useTeamStore();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user ID
  useEffect(() => {
    const getUser = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
      setLoading(false);
    };
    getUser();
  }, []);

  const value = useMemo<TeamRoleContextValue>(() => {
    const currentTeam = teams.find(t => t.id === activeTeamId);
    const myRole = currentTeam?.my_role || null;
    
    const isOwner = myRole === 'owner';
    const isCommander = myRole === 'commander';
    const isSquadCommander = myRole === 'squad_commander';
    const isSoldier = myRole === 'soldier';
    
    // Owner and commander can manage
    const canManageTeam = isOwner || isCommander;
    const canInviteMembers = isOwner || isCommander;
    const canCreateTrainings = isOwner || isCommander;
    const canRemoveMembers = isOwner || isCommander;

    return {
      currentUserId,
      myRole,
      isOwner,
      isCommander,
      isSquadCommander,
      isSoldier,
      canManageTeam,
      canInviteMembers,
      canCreateTrainings,
      canRemoveMembers,
      hasTeam: teams.length > 0,
      teamId: activeTeamId,
      teamName: currentTeam?.name || null,
      loading: loading || storeLoading,
    };
  }, [teams, activeTeamId, currentUserId, loading, storeLoading]);

  return (
    <TeamRoleContext.Provider value={value}>
      {children}
    </TeamRoleContext.Provider>
  );
}

/**
 * Hook to access team role context
 */
export function useTeamRole(): TeamRoleContextValue {
  return useContext(TeamRoleContext);
}

/**
 * HOC to wrap components that need team role context
 */
export function withTeamRole<P extends object>(Component: React.ComponentType<P>) {
  return function WithTeamRoleComponent(props: P) {
    return (
      <TeamRoleProvider>
        <Component {...props} />
      </TeamRoleProvider>
    );
  };
}


