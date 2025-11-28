import type { WorkspaceRole } from "@/types/workspace";
import { useAppContext } from "./useAppContext";

type TeamRole = 'lead' | 'member';

export function useWorkspacePermissions() {
  const { activeWorkspace } = useAppContext();
  const role = (activeWorkspace?.access_role || 'member') as WorkspaceRole;

  // Check role types
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin';
  const isInstructor = role === 'instructor';
  const isMember = role === 'member';
  const isAttached = role === 'attached';

  // Attached members have very limited permissions
  // They can only see/create their own sessions, nothing else
  if (isAttached) {
    return {
      // Workspace-level permissions - none
      canManageWorkspace: false,
      canDeleteWorkspace: false,
      canInviteMembers: false,
      canManageTeams: false,
      
      // View permissions - none (can't see org data)
      canViewTeams: false,
      canViewMembers: false,
      canViewOrgTrainings: false,
      
      // Training permissions - own only
      canCreateTraining: true, // Can create own trainings linked to org
      canManageTraining: false,
      canViewAllProgress: false,
      
      // Session permissions - own only
      canCreateSession: true, // Can create own sessions linked to org
      canViewAllSessions: false,
      
      // Role checks
      isOwner: false,
      isAdmin: false,
      isInstructor: false,
      isMember: false,
      isAttached: true,
      role,
    };
  }

  // Regular organization workspace - role-based permissions
  return {
    // Workspace-level permissions
    canManageWorkspace: isOwner || isAdmin,
    canDeleteWorkspace: isOwner,
    canInviteMembers: isOwner || isAdmin,
    canManageTeams: isOwner || isAdmin,
    
    // View permissions - all regular members can view
    canViewTeams: true,
    canViewMembers: true,
    canViewOrgTrainings: true,
    
    // Training permissions
    canCreateTraining: isOwner || isAdmin || isInstructor,
    canManageTraining: isOwner || isAdmin || isInstructor,
    canViewAllProgress: isOwner || isAdmin || isInstructor,
    
    // Session permissions
    canCreateSession: true, // All members can create sessions
    canViewAllSessions: isOwner || isAdmin || isInstructor,
    
    // Role checks
    isOwner,
    isAdmin,
    isInstructor,
    isMember,
    isAttached: false,
    role,
  };
}

export function useTeamPermissions(teamRole?: TeamRole) {
  const workspacePerms = useWorkspacePermissions();

  // Attached members have no team permissions
  if (workspacePerms.isAttached) {
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
