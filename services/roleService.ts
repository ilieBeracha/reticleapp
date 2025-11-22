/**
 * 🎭 ROLE MANAGEMENT SERVICE
 * 
 * Comprehensive role hierarchy and permissions system
 * 
 * TWO-LEVEL ROLE SYSTEM:
 * 1. Organization Roles (stored in `profiles` table)
 * 2. Team Roles (stored in `team_members` table)
 */

// =====================================================
// ROLE DEFINITIONS
// =====================================================

/**
 * Organization-level roles
 * Stored in: profiles.role
 * Scope: Entire organization
 */
export type OrgRole = 'owner' | 'admin' | 'instructor' | 'member';

/**
 * Team-level roles
 * Stored in: team_members.role
 * Scope: Specific team within organization
 */
export type TeamRole = 'commander' | 'squad_commander' | 'soldier';

// =====================================================
// ROLE HIERARCHY & PERMISSIONS
// =====================================================

/**
 * Organization Role Hierarchy (Top to Bottom)
 * Each role inherits permissions from roles below it
 */
export const ORG_ROLE_HIERARCHY: Record<OrgRole, number> = {
  owner: 4,       // Highest level - can do everything
  admin: 3,       // Can do almost everything (except delete org, remove owner)
  instructor: 2,  // Can view all teams, create trainings, view progress
  member: 1,      // Basic access, can be assigned to teams
};

/**
 * Team Role Hierarchy (Top to Bottom)
 * Within a specific team
 */
export const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
  commander: 3,       // Leads entire team
  squad_commander: 2, // Leads a specific squad
  soldier: 1,         // Regular team member
};

// =====================================================
// PERMISSION DEFINITIONS
// =====================================================

export interface OrgPermissions {
  // Organization Management
  canDeleteOrg: boolean;
  canUpdateOrgSettings: boolean;
  canViewOrgSettings: boolean;
  
  // Member Management
  canInviteMembers: boolean;
  canRemoveMembers: boolean;
  canUpdateMemberRoles: boolean;
  canViewAllMembers: boolean;
  canRemoveOwner: boolean;
  
  // Team Management
  canCreateTeams: boolean;
  canDeleteTeams: boolean;
  canUpdateTeams: boolean;
  canViewAllTeams: boolean;
  canAssignMembersToTeams: boolean;
  
  // Training/Session Management
  canCreateTrainings: boolean;
  canViewAllProgress: boolean;
  canViewAllSessions: boolean;
  
  // Team Membership
  canBeTeamMember: boolean;
}

export interface TeamPermissions {
  // Team Management (within the team)
  canManageTeam: boolean;
  canViewTeamDetails: boolean;
  
  // Member Management (within the team)
  canInviteToTeam: boolean;
  canRemoveFromTeam: boolean;
  canUpdateTeamMemberRoles: boolean;
  
  // Squad Management
  canManageSquads: boolean;
  canManageOwnSquad: boolean;
  canViewAllSquads: boolean;
  
  // Sessions & Training
  canCreateTeamTraining: boolean;
  canAddSessionsToTeam: boolean;
  canViewTeamProgress: boolean;
  canViewOwnProgress: boolean;
}

// =====================================================
// PERMISSION CALCULATION
// =====================================================

/**
 * Get all permissions for an organization role
 */
export function getOrgPermissions(role: OrgRole): OrgPermissions {
  const level = ORG_ROLE_HIERARCHY[role];
  
  return {
    // Organization Management
    canDeleteOrg: level >= ORG_ROLE_HIERARCHY.owner,
    canUpdateOrgSettings: level >= ORG_ROLE_HIERARCHY.admin,
    canViewOrgSettings: level >= ORG_ROLE_HIERARCHY.instructor,
    
    // Member Management
    canInviteMembers: level >= ORG_ROLE_HIERARCHY.admin,
    canRemoveMembers: level >= ORG_ROLE_HIERARCHY.admin,
    canUpdateMemberRoles: level >= ORG_ROLE_HIERARCHY.admin,
    canViewAllMembers: level >= ORG_ROLE_HIERARCHY.instructor,
    canRemoveOwner: false, // Only owner can remove owner (handled separately)
    
    // Team Management
    canCreateTeams: level >= ORG_ROLE_HIERARCHY.admin,
    canDeleteTeams: level >= ORG_ROLE_HIERARCHY.admin,
    canUpdateTeams: level >= ORG_ROLE_HIERARCHY.admin,
    canViewAllTeams: level >= ORG_ROLE_HIERARCHY.instructor,
    canAssignMembersToTeams: level >= ORG_ROLE_HIERARCHY.admin,
    
    // Training/Session Management
    canCreateTrainings: level >= ORG_ROLE_HIERARCHY.instructor,
    canViewAllProgress: level >= ORG_ROLE_HIERARCHY.instructor,
    canViewAllSessions: level >= ORG_ROLE_HIERARCHY.instructor,
    
    // Team Membership
    canBeTeamMember: role === 'member', // Only members can be assigned to teams
  };
}

/**
 * Get all permissions for a team role
 */
export function getTeamPermissions(role: TeamRole): TeamPermissions {
  const level = TEAM_ROLE_HIERARCHY[role];
  
  return {
    // Team Management
    canManageTeam: level >= TEAM_ROLE_HIERARCHY.commander,
    canViewTeamDetails: true, // All team members can view
    
    // Member Management
    canInviteToTeam: level >= TEAM_ROLE_HIERARCHY.commander,
    canRemoveFromTeam: level >= TEAM_ROLE_HIERARCHY.commander,
    canUpdateTeamMemberRoles: level >= TEAM_ROLE_HIERARCHY.commander,
    
    // Squad Management
    canManageSquads: level >= TEAM_ROLE_HIERARCHY.commander,
    canManageOwnSquad: level >= TEAM_ROLE_HIERARCHY.squad_commander,
    canViewAllSquads: true, // All team members can view squads
    
    // Sessions & Training
    canCreateTeamTraining: level >= TEAM_ROLE_HIERARCHY.commander,
    canAddSessionsToTeam: true, // All team members can add sessions
    canViewTeamProgress: level >= TEAM_ROLE_HIERARCHY.squad_commander,
    canViewOwnProgress: true, // Everyone can view their own progress
  };
}

/**
 * Check if user has specific org permission
 */
export function hasOrgPermission(
  role: OrgRole,
  permission: keyof OrgPermissions
): boolean {
  return getOrgPermissions(role)[permission];
}

/**
 * Check if user has specific team permission
 */
export function hasTeamPermission(
  role: TeamRole,
  permission: keyof TeamPermissions
): boolean {
  return getTeamPermissions(role)[permission];
}

/**
 * Check if org role A can modify org role B
 * (Used for role updates and member removal)
 */
export function canModifyRole(actorRole: OrgRole, targetRole: OrgRole): boolean {
  const actorLevel = ORG_ROLE_HIERARCHY[actorRole];
  const targetLevel = ORG_ROLE_HIERARCHY[targetRole];
  
  // Owners can modify anyone
  if (actorRole === 'owner') return true;
  
  // Admins can modify instructor and member, but not owner or other admins
  if (actorRole === 'admin') {
    return targetLevel < ORG_ROLE_HIERARCHY.admin;
  }
  
  // Instructors and members cannot modify roles
  return false;
}

/**
 * Check if team role A can modify team role B
 */
export function canModifyTeamRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  const actorLevel = TEAM_ROLE_HIERARCHY[actorRole];
  const targetLevel = TEAM_ROLE_HIERARCHY[targetRole];
  
  // Commanders can modify anyone in their team
  if (actorRole === 'commander') return true;
  
  // Squad commanders can modify soldiers in their squad (handled elsewhere)
  if (actorRole === 'squad_commander') {
    return targetRole === 'soldier';
  }
  
  return false;
}

// =====================================================
// ROLE VALIDATION
// =====================================================

/**
 * Validate if a role change is allowed
 */
export function validateRoleChange(
  actorOrgRole: OrgRole,
  targetOrgRole: OrgRole,
  newOrgRole: OrgRole
): { valid: boolean; reason?: string } {
  // Cannot change your own role
  if (actorOrgRole === targetOrgRole) {
    return { valid: false, reason: 'Cannot change your own role' };
  }
  
  // Check if actor can modify target's current role
  if (!canModifyRole(actorOrgRole, targetOrgRole)) {
    return { valid: false, reason: `${actorOrgRole}s cannot modify ${targetOrgRole}s` };
  }
  
  // Check if actor can assign the new role
  if (ORG_ROLE_HIERARCHY[newOrgRole] >= ORG_ROLE_HIERARCHY[actorOrgRole]) {
    return { valid: false, reason: `Cannot assign a role equal to or higher than your own` };
  }
  
  return { valid: true };
}

/**
 * Check if user can be assigned to a team based on org role
 */
export function canBeAssignedToTeam(orgRole: OrgRole): boolean {
  // Only members can be assigned to teams
  // Owners, admins, and instructors manage teams but don't join them
  return orgRole === 'member';
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

/**
 * Get color for organization role
 */
export function getOrgRoleColor(role: OrgRole): string {
  switch (role) {
    case 'owner':
      return '#FFD700'; // Gold
    case 'admin':
      return '#FF6B6B'; // Red
    case 'instructor':
      return '#4ECDC4'; // Teal
    case 'member':
      return '#6B8FA3'; // Blue-gray
  }
}

/**
 * Get color for team role
 */
export function getTeamRoleColor(role: TeamRole): string {
  switch (role) {
    case 'commander':
      return '#FFD700'; // Gold
    case 'squad_commander':
      return '#FF8A5C'; // Orange
    case 'soldier':
      return '#4CAF50'; // Green
  }
}

/**
 * Get icon for organization role
 */
export function getOrgRoleIcon(role: OrgRole): string {
  switch (role) {
    case 'owner':
      return 'shield-checkmark';
    case 'admin':
      return 'key';
    case 'instructor':
      return 'school';
    case 'member':
      return 'person';
  }
}

/**
 * Get icon for team role
 */
export function getTeamRoleIcon(role: TeamRole): string {
  switch (role) {
    case 'commander':
      return 'star';
    case 'squad_commander':
      return 'ribbon';
    case 'soldier':
      return 'shield';
  }
}

/**
 * Get display name for organization role
 */
export function getOrgRoleDisplayName(role: OrgRole): string {
  return role.charAt(0).toUpperCase() + role.slice(1);
}

/**
 * Get display name for team role
 */
export function getTeamRoleDisplayName(role: TeamRole): string {
  return role
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}


