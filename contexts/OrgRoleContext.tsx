import { useAppContext } from '@/hooks/useAppContext';
import { useWorkspacePermissions } from '@/hooks/usePermissions';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

/**
 * ORGANIZATION ROLE CONTEXT
 * Automatically detects and provides both org role AND team role
 * Fetches data immediately when user navigates to org workspace
 * 
 * OPTIMIZED:
 * - Memoized values to prevent unnecessary re-renders
 * - Single async operation for user ID
 * - Derived values computed only when dependencies change
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
  
  // Track if we've already fetched user to prevent duplicate calls
  const userFetchedRef = useRef(false);

  // Get current user ID from auth - only once
  useEffect(() => {
    if (userFetchedRef.current) return;
    
    const getCurrentUser = async () => {
      const { supabase } = await import('@/lib/supabase');
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        if (__DEV__) console.log('🎯 OrgRoleContext: User ID:', user.id);
        setCurrentUserId(user.id);
        userFetchedRef.current = true;
      }
    };
    getCurrentUser();
  }, []);

  // Load workspace members when entering org workspace
  useEffect(() => {
    if (activeWorkspace?.id && currentUserId) {
      loadWorkspaceMembers().finally(() => setLoading(false));
    } else if (!activeWorkspace?.id) {
      // Personal mode - not loading
      setLoading(false);
    }
  }, [activeWorkspace?.id, currentUserId, loadWorkspaceMembers]);

  // Memoize the current member lookup
  const currentMember = useMemo(
    () => workspaceMembers.find(m => m.member_id === currentUserId),
    [workspaceMembers, currentUserId]
  );

  // Memoize team role info extraction
  const allTeams = useMemo<TeamRoleInfo[]>(() => {
    if (!currentMember?.teams) return [];
    
    return currentMember.teams.map(t => ({
      teamId: t.team_id,
      teamName: t.team_name,
      teamRole: t.team_role as 'commander' | 'squad_commander' | 'soldier',
      squadId: t.squads?.[0],
    }));
  }, [currentMember?.teams]);

  // Memoize the context value to prevent unnecessary re-renders
  const value = useMemo<OrgRoleContextValue>(() => {
    const teamInfo = allTeams[0] || null;
    const teamRole = teamInfo?.teamRole || null;
    
    const isAdmin = permissions.role === 'owner' || permissions.role === 'admin';
    const hasTeam = allTeams.length > 0;
    const isCommander = teamRole === 'commander';
    const isSquadCommander = teamRole === 'squad_commander';
    const isSoldier = teamRole === 'soldier';

    return {
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
  }, [
    permissions.role,
    permissions.canManageWorkspace,
    permissions.canManageTeams,
    permissions.canInviteMembers,
    allTeams,
    currentUserId,
    loading,
  ]);

  // Debug logging - only in dev
  useEffect(() => {
    if (__DEV__ && !loading && currentUserId) {
      console.log('🎯 OrgRoleContext: Role Detection Complete:', {
        orgRole: value.orgRole,
        isAdmin: value.isAdmin,
        hasTeam: value.hasTeam,
        teamRole: value.teamRole,
        teamsCount: value.allTeams.length,
      });
    }
  }, [loading, currentUserId, value.orgRole, value.isAdmin, value.hasTeam, value.teamRole, value.allTeams.length]);

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
