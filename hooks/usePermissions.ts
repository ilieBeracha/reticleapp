/**
 * UNIFIED PERMISSIONS HOOK
 * 
 * Single source for all permission checks.
 * Replaces: useWorkspacePermissions, useTeamPermissions, useRolePermissions
 */

import { useTeamRoleFlags } from '@/store/teamStore';

export interface Permissions {
  // Role
  role: string | null;
  isOwner: boolean;
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;
  
  // Team management
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canDeleteTeam: boolean;
  
  // Training
  canCreateTraining: boolean;
  canManageTraining: boolean;
  canViewAllProgress: boolean;
  
  // Sessions
  canCreateSession: boolean;
  canViewAllSessions: boolean;
}

/**
 * Get all permissions for the current user in the active team
 */
export function usePermissions(): Permissions {
  const { role, isOwner, isCommander, isSquadCommander, isSoldier, canManage } = useTeamRoleFlags();
  
  return {
    // Role info
    role,
    isOwner,
    isCommander,
    isSquadCommander,
    isSoldier,
    
    // Team management - owner and commander
    canManageTeam: canManage,
    canInviteMembers: canManage,
    canRemoveMembers: canManage,
    canDeleteTeam: isOwner,
    
    // Training - owner and commander
    canCreateTraining: canManage,
    canManageTraining: canManage,
    canViewAllProgress: canManage,
    
    // Sessions - everyone can create, only leads can view all
    canCreateSession: true,
    canViewAllSessions: canManage,
  };
}
