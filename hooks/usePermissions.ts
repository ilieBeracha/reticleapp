import { useAppContext } from "./useAppContext";

type WorkspaceRole = 'owner' | 'admin' | 'instructor' | 'member';
type TeamRole = 'lead' | 'member';

export function useWorkspacePermissions() {
  const { activeWorkspace, isMyWorkspace } = useAppContext();
  const role = (activeWorkspace?.access_role || 'member') as WorkspaceRole;

  // Personal workspace - user has full control
  if (isMyWorkspace) {
    return {
      // Workspace-level permissions
      canManageWorkspace: true,
      canDeleteWorkspace: true,
      canInviteMembers: false,  // No members in personal workspace
      canManageTeams: false,     // No teams in personal workspace
      
      // Training permissions
      canCreateTraining: true,
      canManageTraining: true,
      canViewAllProgress: true,
      
      // Session permissions
      canCreateSession: true,
      canViewAllSessions: true,
      
      // Role checks
      isOwner: true,
      isAdmin: false,
      isInstructor: false,
      isMember: false,
      role: 'owner' as WorkspaceRole,
    };
  }

  // Organization workspace - role-based permissions
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isMember = role === 'member';

  return {
    // Workspace-level permissions
    canManageWorkspace: isOwner || isAdmin,
    canDeleteWorkspace: isOwner,
    canInviteMembers: isOwner || isAdmin,
    canManageTeams: isOwner || isAdmin,
    
    // Training permissions
    canCreateTraining: isOwner || isAdmin || isInstructor,
    canManageTraining: isOwner || isAdmin || isInstructor,
    canViewAllProgress: isOwner || isAdmin || isInstructor,
    
    // Session permissions
    canCreateSession: true,  // All members can create sessions
    canViewAllSessions: isOwner || isAdmin || isInstructor,
    
    // Role checks
    isOwner,
    isAdmin,
    isInstructor,
    isMember,
    role,
  };
}

export function useTeamPermissions(teamRole?: TeamRole) {
  const { isMyWorkspace } = useAppContext();
  const workspacePerms = useWorkspacePermissions();

  // Personal workspace - no teams
  if (isMyWorkspace) {
    return {
      canManageTeam: false,
      canAddMembers: false,
      canRemoveMembers: false,
      canCreateTeamSession: false,
      isTeamLead: false,
    };
  }

  const isTeamLead = teamRole === 'lead';

  return {
    // Team-level permissions
    canManageTeam: workspacePerms.canManageWorkspace || isTeamLead,
    canAddMembers: workspacePerms.canManageWorkspace || isTeamLead,
    canRemoveMembers: workspacePerms.canManageWorkspace || isTeamLead,
    canCreateTeamSession: workspacePerms.canCreateTraining || isTeamLead || teamRole === 'member',
    
    // Role check
    isTeamLead,
  };
}