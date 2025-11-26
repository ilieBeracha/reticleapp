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
 * 
 * NOTE: useOrgRole() now returns a default "personal mode" value when
 * used outside OrgRoleProvider. This allows global modals to render
 * without crashing.
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
  
  // Is this a real org context or default personal mode?
  isInOrgMode: boolean;
}

/**
 * Default value for when useOrgRole is used outside OrgRoleProvider
 * This represents "personal mode" - no org permissions
 */
const DEFAULT_ORG_ROLE_VALUE: OrgRoleContextValue = {
  orgRole: 'member',
  isAdmin: false,
  canManageWorkspace: false,
  canManageTeams: false,
  canInviteMembers: false,
  hasTeam: false,
  teamRole: null,
  teamInfo: null,
  allTeams: [],
  isCommander: false,
  isSquadCommander: false,
  isSoldier: false,
  currentUserId: null,
  loading: false,
  isInOrgMode: false, // Indicates we're NOT in org mode
};

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
      
      // We ARE in org mode since we're inside the provider
      isInOrgMode: true,
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
 * 
 * IMPORTANT: This hook now returns a default "personal mode" value
 * when used outside OrgRoleProvider. Check `isInOrgMode` to know
 * if you're actually in an org context.
 */
export function useOrgRole(): OrgRoleContextValue {
  const context = useContext(OrgRoleContext);
  
  // Return default value when outside provider (personal mode)
  if (context === undefined) {
    return DEFAULT_ORG_ROLE_VALUE;
  }
  
  return context;
}

/**
 * Hook that returns null when outside OrgRoleProvider
 * Use this when you need to explicitly check if org context exists
 */
export function useOrgRoleOptional(): OrgRoleContextValue | null {
  const context = useContext(OrgRoleContext);
  return context ?? null;
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
