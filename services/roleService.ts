/**
 * 🎭 ROLE MANAGEMENT SERVICE
 *
 * Team-first role hierarchy and permissions system.
 * Roles are stored in `team_members` table.
 */

// =====================================================
// ROLE DEFINITIONS
// =====================================================

/**
 * Team roles
 * Stored in: team_members.role
 * Scope: Specific team
 */
export type TeamRole = 'owner' | 'commander' | 'squad_commander' | 'soldier';

/**
 * Team Role Hierarchy (Top to Bottom)
 * Within a specific team
 */
export const TEAM_ROLE_HIERARCHY: Record<TeamRole, number> = {
  owner: 4,           // Team owner - full control
  commander: 3,       // Leads entire team
  squad_commander: 2, // Leads a specific squad
  soldier: 1,         // Regular team member
};



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
 * Get all permissions for a team role
 */
export function getTeamPermissions(role: TeamRole): TeamPermissions {
  const level = TEAM_ROLE_HIERARCHY[role];
  
  return {
    // Team Management
    canManageTeam: level >= TEAM_ROLE_HIERARCHY.owner,
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


export function hasTeamPermission(
  role: TeamRole,
  permission: keyof TeamPermissions
): boolean {
  return getTeamPermissions(role)[permission];
}

/**
 * Check if role A can modify role B
 * (Used for role updates and member removal)
 */
export function canModifyRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  const targetLevel = TEAM_ROLE_HIERARCHY[targetRole];

  // Owners can modify anyone
  if (actorRole === 'owner') return true;

  // Commanders can modify squad_commander and soldier
  if (actorRole === 'commander') {
    return targetLevel < TEAM_ROLE_HIERARCHY.commander;
  }

  // Squad commanders and soldiers cannot modify roles
  return false;
}

/**
 * Check if team role A can modify team role B
 */
export function canModifyTeamRole(actorRole: TeamRole, targetRole: TeamRole): boolean {
  const actorLevel = TEAM_ROLE_HIERARCHY[actorRole];
  const targetLevel = TEAM_ROLE_HIERARCHY[targetRole];
  
  // Owners can modify anyone in their team
  if (actorRole === 'owner') return true;
  
  // Commanders can modify anyone except owner
  if (actorRole === 'commander' && targetRole !== 'owner') return true;
  
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
  actorTeamRole: TeamRole,
  targetTeamRole: TeamRole,
  newTeamRole: TeamRole
): { valid: boolean; reason?: string } {
  // Cannot change your own role
  if (actorTeamRole === targetTeamRole) {
    return { valid: false, reason: 'Cannot change your own role' };
  }
  
  // Check if actor can modify target's current role
  if (!canModifyRole(actorTeamRole, targetTeamRole)) {
    return { valid: false, reason: `${actorTeamRole}s cannot modify ${targetTeamRole}s` };
  }
  
  // Check if actor can assign the new role
  if (TEAM_ROLE_HIERARCHY[newTeamRole] >= TEAM_ROLE_HIERARCHY[actorTeamRole]) {
    return { valid: false, reason: `Cannot assign a role equal to or higher than your own` };
  }
  
  return { valid: true };
}

/**
 * Check if a role can be assigned when joining a team
 */
export function canBeAssignedToTeam(teamRole: TeamRole): boolean {
  // New members typically join as soldiers
  return teamRole === 'soldier';
}

// =====================================================
// DISPLAY HELPERS
// =====================================================

/**
 * Get color for team role
 */
export function getTeamRoleColor(role: TeamRole): string {
  switch (role) {
    case 'owner':
      return '#FFD700'; // Gold
    case 'commander':
      return '#FF6B6B'; // Red
    case 'squad_commander':
      return '#4ECDC4'; // Teal
    case 'soldier':
      return '#6B8FA3'; // Blue-gray
  }
}


/**
 * Get icon for team role
 */
export function getTeamRoleIcon(role: TeamRole): string {
  switch (role) {
    case 'owner':
      return 'shield-checkmark';
    case 'commander':
      return 'star';
    case 'squad_commander':
      return 'ribbon';
    case 'soldier':
      return 'shield';
  }
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


