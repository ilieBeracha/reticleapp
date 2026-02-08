/**
 * UNIFIED PERMISSIONS HOOK
 *
 * Single source for all permission checks.
 * Replaces: useWorkspacePermissions, useTeamPermissions, useRolePermissions
 *
 * SQUAD COMMANDER SCOPE:
 *   - Can manage soldiers in their own squad
 *   - Can view progress of their squad members
 *   - Cannot manage members outside their squad
 *
 * PERMISSION OVERRIDES:
 *   - Commanders can grant specific permissions to individual users
 *   - Stored in team_members.permissions JSONB column
 *   - Example: { canCreateTraining: true }
 */

import { useAuth } from '@/contexts/AuthContext';
import { useTeamRoleFlags, useTeamStore } from '@/stores/teamStore';
import { useMemo } from 'react';
import type { TeamRole } from '@/services/roleService';
import { canManageMember, canViewMemberProgress, type TeamMemberInfo } from '@/services/roleService';
import type { MemberPermissions } from '@/types/workspace';

export interface Permissions {
  // Role
  role: string | null;
  squadId: string | null;
  isOwner: boolean;
  isCommander: boolean;
  isSquadCommander: boolean;
  isSoldier: boolean;

  // Team management
  canManageTeam: boolean;
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canDeleteTeam: boolean;

  // Squad management (for squad commanders)
  canManageSquadMembers: boolean;
  canViewSquadProgress: boolean;

  // Training
  canCreateTraining: boolean;
  canManageTraining: boolean;
  canViewAllProgress: boolean;

  // Sessions
  canCreateSession: boolean;
  canViewAllSessions: boolean;

  // Member-specific checks (functions)
  canManageMember: (targetUserId: string, targetRole: TeamRole, targetSquadId?: string | null) => boolean;
  canViewMemberProgress: (targetUserId: string, targetRole: TeamRole, targetSquadId?: string | null) => boolean;

  // Per-user permission overrides (granted by commander)
  grantedPermissions: MemberPermissions;
}

/**
 * Get all permissions for the current user in the active team
 */
export function usePermissions(): Permissions {
  const { role, isOwner, isCommander, isSquadCommander, isSoldier, canManage, squadId } = useTeamRoleFlags();
  const { activeTeamId, members } = useTeamStore();
  const { user } = useAuth();
  const userId = user?.id;

  // Get current user's granted permissions from team_members
  const grantedPermissions: MemberPermissions = useMemo(() => {
    if (!userId || !activeTeamId) return {};
    const myMember = members.find(m => m.user_id === userId);
    return myMember?.permissions || {};
  }, [userId, activeTeamId, members]);

  // Build actor info for permission checks
  const actorInfo: TeamMemberInfo | null = useMemo(() => {
    if (!userId || !role) return null;
    return {
      user_id: userId,
      role: role as TeamRole,
      squad_id: squadId,
    };
  }, [userId, role, squadId]);

  // Member-specific permission check functions
  const checkCanManageMember = useMemo(() => {
    return (targetUserId: string, targetRole: TeamRole, targetSquadId?: string | null): boolean => {
      if (!actorInfo) return false;
      return canManageMember(actorInfo, {
        user_id: targetUserId,
        role: targetRole,
        squad_id: targetSquadId,
      });
    };
  }, [actorInfo]);

  const checkCanViewMemberProgress = useMemo(() => {
    return (targetUserId: string, targetRole: TeamRole, targetSquadId?: string | null): boolean => {
      if (!actorInfo) return false;
      return canViewMemberProgress(actorInfo, {
        user_id: targetUserId,
        role: targetRole,
        squad_id: targetSquadId,
      });
    };
  }, [actorInfo]);

  // Check if user has permission via role OR granted override
  const hasCreateTrainingPermission = canManage || grantedPermissions.canCreateTraining === true;

  return {
    // Role info
    role,
    squadId,
    isOwner,
    isCommander,
    isSquadCommander,
    isSoldier,

    // Team management - owner and commander only
    canManageTeam: canManage,
    canInviteMembers: canManage || isSquadCommander, // Squad cmdr can invite to their squad
    canRemoveMembers: canManage,
    canDeleteTeam: isOwner,

    // Squad management - squad commanders can manage their squad
    canManageSquadMembers: isSquadCommander && !!squadId,
    canViewSquadProgress: isSquadCommander && !!squadId,

    // Training - owner, commander, OR granted permission
    canCreateTraining: hasCreateTrainingPermission,
    canManageTraining: canManage,
    canViewAllProgress: canManage,

    // Sessions - everyone can create, leaders can view all
    canCreateSession: true,
    canViewAllSessions: canManage || isSquadCommander,

    // Member-specific check functions
    canManageMember: checkCanManageMember,
    canViewMemberProgress: checkCanViewMemberProgress,

    // Expose granted permissions for UI
    grantedPermissions,
  };
}
