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

// =====================================================
// LEGACY EXPORTS - For backwards compatibility
// =====================================================

/** @deprecated Use usePermissions() instead */
export function useWorkspacePermissions() {
  const perms = usePermissions();
  return {
    canManageWorkspace: perms.canManageTeam,
    canDeleteWorkspace: perms.canDeleteTeam,
    canInviteMembers: perms.canInviteMembers,
    canManageTeams: perms.canManageTeam,
    canViewTeams: true,
    canViewMembers: true,
    canViewOrgTrainings: true,
    canCreateTraining: perms.canCreateTraining,
    canManageTraining: perms.canManageTraining,
    canViewAllProgress: perms.canViewAllProgress,
    canCreateSession: perms.canCreateSession,
    canViewAllSessions: perms.canViewAllSessions,
    isOwner: perms.isOwner,
    isAdmin: perms.isOwner,
    isInstructor: perms.isCommander,
    isMember: perms.isSoldier || perms.isSquadCommander,
    isAttached: false,
    role: perms.role || 'soldier',
  };
}

/** @deprecated Use usePermissions() instead */
export function useTeamPermissions() {
  const perms = usePermissions();
  return {
    canManageTeam: perms.canManageTeam,
    canAddMembers: perms.canInviteMembers,
    canRemoveMembers: perms.canRemoveMembers,
    canCreateTeamSession: perms.canCreateSession,
    isTeamLead: perms.isOwner || perms.isCommander,
  };
}
