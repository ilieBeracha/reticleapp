import type { TeamRole } from "@/types/workspace";
import { useAppContext } from "./useAppContext";

/**
 * Team-first permissions hook
 * Returns permissions based on the user's role in the active team
 */
export function useWorkspacePermissions() {
  const { activeTeam, myRole, canManageTeam, isOwner, isCommander } = useAppContext();
  const role = myRole || 'soldier';

  // Role checks
  const isSquadCommander = role === 'squad_commander';
  const isSoldier = role === 'soldier';

  return {
    // Team-level permissions
    canManageWorkspace: canManageTeam,
    canDeleteWorkspace: isOwner,
    canInviteMembers: canManageTeam,
    canManageTeams: canManageTeam,
    
    // View permissions
    canViewTeams: true,
    canViewMembers: true,
    canViewOrgTrainings: true,
    
    // Training permissions
    canCreateTraining: canManageTeam,
    canManageTraining: canManageTeam,
    canViewAllProgress: canManageTeam,
    
    // Session permissions
    canCreateSession: true, // All team members can create sessions
    canViewAllSessions: canManageTeam,
    
    // Role checks
    isOwner,
    isAdmin: isOwner, // For backwards compatibility
    isInstructor: isCommander, // Commander acts as instructor
    isMember: isSoldier || isSquadCommander,
    isAttached: false, // No attached concept in team-first
    role,
  };
}

export function useTeamPermissions(teamRole?: TeamRole) {
  const workspacePerms = useWorkspacePermissions();

  const isTeamLead = teamRole === 'owner' || teamRole === 'commander';

  return {
    // Team-level permissions
    canManageTeam: workspacePerms.canManageWorkspace || isTeamLead,
    canAddMembers: workspacePerms.canManageWorkspace || isTeamLead,
    canRemoveMembers: workspacePerms.canManageWorkspace || isTeamLead,
    canCreateTeamSession: true, // All team members can create sessions
    
    // Role check
    isTeamLead,
  };
}
