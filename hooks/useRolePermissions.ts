import {
  TeamRole,
  getTeamPermissions,
  hasTeamPermission,
  canModifyTeamRole,
  type TeamPermissions,
} from '@/services/roleService';
import { useTeamStore } from '@/store/teamStore';
import { useAppContext } from './useAppContext';
import { useMemo } from 'react';

/**
 * 🎭 USE ROLE PERMISSIONS HOOK (Team-First Architecture)
 * 
 * Simplified hook for team-based permissions
 * 
 * ARCHITECTURE:
 * 
 * TEAM LEVEL (User → Team)
 *   - Role stored in: team_members.role
 *   - Scope: Specific team
 *   - Roles: owner, commander, squad_commander, soldier
 * 
 * USAGE:
 * 
 * const { team, can, getRoleInfo } = useRolePermissions();
 * 
 * // Check team permissions
 * if (team.canManageTeam) { ... }
 * if (can.team('canAddSessionsToTeam')) { ... }
 * 
 * // Get role information
 * const roleColor = getRoleInfo.color;
 * const roleIcon = getRoleInfo.icon;
 */

interface UseRolePermissionsReturn {
  // Current role
  role: TeamRole | null;
  
  // Team permissions
  team: TeamPermissions | null;
  
  // Quick permission checkers
  can: {
    team: (permission: keyof TeamPermissions) => boolean;
    modifyTeamRole: (targetRole: TeamRole) => boolean;
  };
  
  // Role information
  getRoleInfo: {
    role: TeamRole | null;
    level: number;
    color: string;
    icon: string;
    displayName: string;
  };
  
  // Convenience flags
  isOwner: boolean;
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
}

/**
 * Hook to get comprehensive role permissions
 * 
 * Team-First Architecture:
 * - Each user can be in multiple teams
 * - Role is per-team (stored in team_members.role)
 * - Permissions are checked against active team
 */
export function useRolePermissions(): UseRolePermissionsReturn {
  const { activeTeamId, teams } = useTeamStore();
  const { userId } = useAppContext();
  
  // Get role from active team
  const activeTeam = teams.find(t => t.id === activeTeamId);
  const teamRole = activeTeam?.my_role as TeamRole | undefined;
  
  // Get team permissions
  const teamPermissions = useMemo(() => {
    if (!teamRole) return null;
    return getTeamPermissions(teamRole);
  }, [teamRole]);
  
  // Permission checkers
  const can = useMemo(() => ({
    team: (permission: keyof TeamPermissions) => {
      if (!teamRole) return false;
      return hasTeamPermission(teamRole, permission);
    },
    modifyTeamRole: (targetRole: TeamRole) => {
      if (!teamRole) return false;
      return canModifyTeamRole(teamRole, targetRole);
    },
  }), [teamRole]);
  
  // Role information
  const getRoleInfo = useMemo(() => {
    if (!teamRole) {
      return {
        role: null,
        level: 0,
        color: '#6B8FA3',
        icon: 'person',
        displayName: 'No Role',
      };
    }
    
    return {
      role: teamRole,
      level: getTeamRoleLevel(teamRole),
      color: getTeamRoleColorHelper(teamRole),
      icon: getTeamRoleIconHelper(teamRole),
      displayName: getTeamRoleDisplayNameHelper(teamRole),
    };
  }, [teamRole]);
  
  // Convenience flags
  const isOwner = teamRole === 'owner';
  const isCommander = teamRole === 'commander';
  const isSquadCommander = teamRole === 'squad_commander';
  const isSoldier = teamRole === 'soldier';
  
  return {
    role: teamRole || null,
    team: teamPermissions,
    can,
    getRoleInfo,
    isOwner,
    isCommander,
    isSquadCommander,
    isSoldier,
  };
}

// Helper functions
import {
  TEAM_ROLE_HIERARCHY,
  getTeamRoleColor,
  getTeamRoleDisplayName,
  getTeamRoleIcon,
} from '@/services/roleService';

function getTeamRoleLevel(role: TeamRole): number {
  return TEAM_ROLE_HIERARCHY[role];
}

function getTeamRoleColorHelper(role: TeamRole): string {
  return getTeamRoleColor(role);
}

function getTeamRoleIconHelper(role: TeamRole): string {
  return getTeamRoleIcon(role);
}

function getTeamRoleDisplayNameHelper(role: TeamRole): string {
  return getTeamRoleDisplayName(role);
}

/**
 * Simple hook to check if user has specific team permission
 */
export function useCanDoInTeam(permission: keyof TeamPermissions): boolean {
  const { can } = useRolePermissions();
  return can.team(permission);
}
