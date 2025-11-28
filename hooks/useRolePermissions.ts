import {
  OrgRole,
  TeamRole,
  canBeAssignedToTeam,
  canModifyRole,
  canModifyTeamRole,
  getOrgPermissions,
  getTeamPermissions,
  hasOrgPermission,
  hasTeamPermission,
  validateRoleChange,
  type OrgPermissions,
  type TeamPermissions,
} from '@/services/roleService';
import { useMemo } from 'react';

/**
 * 🎭 USE ROLE PERMISSIONS HOOK
 * 
 * Comprehensive hook for managing role-based permissions
 * 
 * ARCHITECTURE:
 * 
 * 1. ORGANIZATION LEVEL (Profile → Org)
 *    - Role stored in: profiles.role
 *    - Scope: Entire organization
 *    - Roles: owner, admin, instructor, member
 * 
 * 2. TEAM LEVEL (Profile → Team)
 *    - Role stored in: team_members.role
 *    - Scope: Specific team
 *    - Roles: commander, squad_commander, soldier
 *    - Only 'member' org role can have team roles
 * 
 * USAGE:
 * 
 * const { org, team, can, getRoleInfo } = useRolePermissions();
 * 
 * // Check org permissions
 * if (org.canCreateTeams) { ... }
 * if (can.org('canInviteMembers')) { ... }
 * 
 * // Check team permissions (if in a team)
 * if (team.canManageTeam) { ... }
 * if (can.team('canAddSessionsToTeam')) { ... }
 * 
 * // Get role information
 * const roleColor = getRoleInfo.org.color;
 * const roleIcon = getRoleInfo.team.icon;
 */

interface UseRolePermissionsReturn {
  // Current roles
  roles: {
    org: OrgRole | null;
    team: TeamRole | null;
  };
  
  // Organization permissions
  org: OrgPermissions;
  
  // Team permissions (if user is in a team)
  team: TeamPermissions | null;
  
  // Quick permission checkers
  can: {
    org: (permission: keyof OrgPermissions) => boolean;
    team: (permission: keyof TeamPermissions) => boolean;
    modifyRole: (targetRole: OrgRole) => boolean;
    modifyTeamRole: (targetRole: TeamRole) => boolean;
    beAssignedToTeam: () => boolean;
  };
  
  // Validation
  validate: {
    roleChange: (targetOrgRole: OrgRole, newOrgRole: OrgRole) => { valid: boolean; reason?: string };
  };
  
  // Role information
  getRoleInfo: {
    org: {
      role: OrgRole | null;
      level: number;
      color: string;
      icon: string;
      displayName: string;
    };
    team: {
      role: TeamRole | null;
      level: number;
      color: string;
      icon: string;
      displayName: string;
    } | null;
  };
  
  // Convenience flags
  isOwner: boolean;
  isAdmin: boolean;
  isInstructor: boolean;
  isMember: boolean;
  isTeamCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
}

/**
 * Hook to get comprehensive role permissions
 * 
 * SIMPLIFIED ARCHITECTURE:
 * - Team info is stored directly on profile (team_id, team_role, squad_id)
 * - Each profile can only be in ONE team at a time
 * - No need to pass teamRole parameter - it's read from activeProfile
 */
export function useRolePermissions(): UseRolePermissionsReturn {
  const { workspaceMembers } = useWorkspaceStore();
  const { userId } = useAppContext();
  const currentMember = workspaceMembers.find(m => m.member_id === userId || m.profile_id === userId);
  const orgRole = currentMember?.role as OrgRole | null;
  const teamRole = currentMember?.teams[0]?.team_role as TeamRole | undefined;
  
  // Get organization permissions
  const orgPermissions = useMemo(() => {
    if (!orgRole) {
      // Return default permissions (all false)
      return {
        canDeleteOrg: false,
        canUpdateOrgSettings: false,
        canViewOrgSettings: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canUpdateMemberRoles: false,
        canViewAllMembers: false,
        canRemoveOwner: false,
        canCreateTeams: false,
        canDeleteTeams: false,
        canUpdateTeams: false,
        canViewAllTeams: false,
        canAssignMembersToTeams: false,
        canCreateTrainings: false,
        canViewAllProgress: false,
        canViewAllSessions: false,
        canBeTeamMember: false,
      };
    }
    return getOrgPermissions(orgRole);
  }, [orgRole]);
  
  // Get team permissions (if user has a team role)
  const teamPermissions = useMemo(() => {
    if (!teamRole) return null;
    return getTeamPermissions(teamRole);
  }, [teamRole]);
  
  // Permission checkers
  const can = useMemo(() => ({
    org: (permission: keyof OrgPermissions) => {
      if (!orgRole) return false;
      return hasOrgPermission(orgRole, permission);
    },
    team: (permission: keyof TeamPermissions) => {
      if (!teamRole) return false;
      return hasTeamPermission(teamRole, permission);
    },
    modifyRole: (targetRole: OrgRole) => {
      if (!orgRole) return false;
      return canModifyRole(orgRole, targetRole);
    },
    modifyTeamRole: (targetRole: TeamRole) => {
      if (!teamRole) return false;
      return canModifyTeamRole(teamRole, targetRole);
    },
    beAssignedToTeam: () => {
      if (!orgRole) return false;
      return canBeAssignedToTeam(orgRole);
    },
  }), [orgRole, teamRole]);
  
  // Validation helpers
  const validate = useMemo(() => ({
    roleChange: (targetOrgRole: OrgRole, newOrgRole: OrgRole) => {
      if (!orgRole) return { valid: false, reason: 'No active role' };
      return validateRoleChange(orgRole, targetOrgRole, newOrgRole);
    },
  }), [orgRole]);
  
  // Role information
  const getRoleInfo = useMemo(() => {
    const orgInfo = orgRole ? {
      role: orgRole,
      level: getOrgRoleLevel(orgRole),
      color: getOrgRoleColorHelper(orgRole),
      icon: getOrgRoleIconHelper(orgRole),
      displayName: getOrgRoleDisplayNameHelper(orgRole),
    } : {
      role: null,
      level: 0,
      color: '#6B8FA3',
      icon: 'person',
      displayName: 'No Role',
    };
    
    const teamInfo = teamRole ? {
      role: teamRole,
      level: getTeamRoleLevel(teamRole),
      color: getTeamRoleColorHelper(teamRole),
      icon: getTeamRoleIconHelper(teamRole),
      displayName: getTeamRoleDisplayNameHelper(teamRole),
    } : null;
    
    return {
      org: orgInfo,
      team: teamInfo,
    };
  }, [orgRole, teamRole]);
  
  // Convenience flags
  const isOwner = orgRole === 'owner';
  const isAdmin = orgRole === 'admin';
  const isInstructor = orgRole === 'instructor';
  const isMember = orgRole === 'member';
  const isTeamCommander = teamRole === 'commander';
  const isSquadCommander = teamRole === 'squad_commander';
  const isSoldier = teamRole === 'soldier';
  
  return {
    roles: {
      org: orgRole,
      team: teamRole || null,
    },
    org: orgPermissions,
    team: teamPermissions,
    can,
    validate,
    getRoleInfo,
    isOwner,
    isAdmin,
    isInstructor,
    isMember,
    isTeamCommander,
    isSquadCommander,
    isSoldier,
  };
}

// Helper functions (importing from roleService)
import {
  ORG_ROLE_HIERARCHY,
  TEAM_ROLE_HIERARCHY,
  getOrgRoleColor,
  getOrgRoleDisplayName,
  getOrgRoleIcon,
  getTeamRoleColor,
  getTeamRoleDisplayName,
  getTeamRoleIcon,
} from '@/services/roleService';
import { useWorkspaceStore } from '@/store/useWorkspaceStore';
import { useAppContext } from './useAppContext';

function getOrgRoleLevel(role: OrgRole): number {
  return ORG_ROLE_HIERARCHY[role];
}

function getTeamRoleLevel(role: TeamRole): number {
  return TEAM_ROLE_HIERARCHY[role];
}

function getOrgRoleColorHelper(role: OrgRole): string {
  return getOrgRoleColor(role);
}

function getTeamRoleColorHelper(role: TeamRole): string {
  return getTeamRoleColor(role);
}

function getOrgRoleIconHelper(role: OrgRole): string {
  return getOrgRoleIcon(role);
}

function getTeamRoleIconHelper(role: TeamRole): string {
  return getTeamRoleIcon(role);
}

function getOrgRoleDisplayNameHelper(role: OrgRole): string {
  return getOrgRoleDisplayName(role);
}

function getTeamRoleDisplayNameHelper(role: TeamRole): string {
  return getTeamRoleDisplayName(role);
}

/**
 * Simple hook to check if user has specific org permission
 */
export function useCanDo(permission: keyof OrgPermissions): boolean {
  const { can } = useRolePermissions();
  return can.org(permission);
}

/**
 * Simple hook to check if user has specific team permission
 * Note: Team role is automatically read from profile (simplified architecture)
 */
export function useCanDoInTeam(permission: keyof TeamPermissions): boolean {
  const { can } = useRolePermissions();
  return can.team(permission);
}

