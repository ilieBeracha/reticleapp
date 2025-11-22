import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import React, { createContext, useContext, useEffect, useState } from 'react';

/**
 * ORGANIZATION ROLE CONTEXT
 * Automatically detects and provides both org role AND team role
 * Fetches data immediately when user navigates to org workspace
 */

interface TeamRoleInfo {
  teamId: string;
  teamName: string;
  teamRole: 'commander' | 'squad_commander' | 'soldier';
  squadId?: string;
}

interface OrgRoleContextValue {
  // Organization role
  orgRole: 'owner' | 'admin' | 'instructor' | 'member';
  isAdmin: boolean;
  canManageWorkspace: boolean;
  canManageTeams: boolean;
  canInviteMembers: boolean;
  
  // Team role (if member)
  hasTeam: boolean;
  teamRole: 'commander' | 'squad_commander' | 'soldier' | null;
  teamInfo: TeamRoleInfo | null;
  allTeams: TeamRoleInfo[]; // For multi-team members
  
  // Computed helpers
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
  
  // Current user ID
  currentUserId: string | null;
  
  // Loading state
  loading: boolean;
}

const OrgRoleContext = createContext<OrgRoleContextValue | undefined>(undefined);

export function OrgRoleProvider({ children }: { children: React.ReactNode }) {
  const { activeWorkspace } = useAppContext();
  const permissions = useWorkspacePermissions();
  const { workspaceMembers, loadWorkspaceMembers } = useWorkspaceStore();
  
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Get current user ID from auth
  useEffect(() => {
    const getCurrentUser = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        console.log('🎯 OrgRoleContext: User ID:', user.id);
        setCurrentUserId(user.id);
      }
    };
    getCurrentUser();
  }, []);

  // Load workspace members when entering org workspace
  useEffect(() => {
    if (activeWorkspace?.id && currentUserId) {
      loadWorkspaceMembers().finally(() => setLoading(false));
    }
  }, [activeWorkspace?.id, currentUserId, loadWorkspaceMembers]);

  // Find current user's member data
  const currentMember = workspaceMembers.find(m => m.member_id === currentUserId);

  // Extract team role info
  const allTeams: TeamRoleInfo[] = currentMember?.teams.map(t => ({
    teamId: t.team_id,
    teamName: t.team_name,
    teamRole: t.team_role as 'commander' | 'squad_commander' | 'soldier',
    squadId: t.squads?.[0], // If squad info is stored
  })) || [];

  const teamInfo = allTeams[0] || null; // Primary team
  const teamRole = teamInfo?.teamRole || null;

  // Compute role booleans
  const isAdmin = permissions.role === 'owner' || permissions.role === 'admin';
  const hasTeam = allTeams.length > 0;
  const isCommander = teamRole === 'commander';
  const isSquadCommander = teamRole === 'squad_commander';
  const isSoldier = teamRole === 'soldier';

  // Debug logging
  useEffect(() => {
    if (!loading && currentUserId) {
      console.log('🎯 OrgRoleContext: Role Detection Complete:', {
        orgRole: permissions.role,
        isAdmin,
        hasTeam,
        teamRole,
        teamsCount: allTeams.length,
      });
    }
  }, [loading, currentUserId, permissions.role, isAdmin, hasTeam, teamRole, allTeams.length]);

  const value: OrgRoleContextValue = {
    // Org role
    orgRole: permissions.role,
    isAdmin,
    canManageWorkspace: permissions.canManageWorkspace,
    canManageTeams: permissions.canManageTeams,
    canInviteMembers: permissions.canInviteMembers,
    
    // Team role
    hasTeam,
    teamRole,
    teamInfo,
    allTeams,
    
    // Helpers
    isCommander,
    isSquadCommander,
    isSoldier,
    
    // User
    currentUserId,
    
    // State
    loading,
  };

  return (
    <OrgRoleContext.Provider value={value}>
      {children}
    </OrgRoleContext.Provider>
  );
}

/**
 * Hook to use org role context
 * Provides all role information in one place
 */
export function useOrgRole() {
  const context = useContext(OrgRoleContext);
  if (context === undefined) {
    throw new Error('useOrgRole must be used within OrgRoleProvider');
  }
  return context;
}

/**
 * HOC to wrap components that need role context
 */
export function withOrgRole<P extends object>(
  Component: React.ComponentType<P>
) {
  return function WithOrgRoleComponent(props: P) {
    return (
      <OrgRoleProvider>
        <Component {...props} />
      </OrgRoleProvider>
    );
  };
}

