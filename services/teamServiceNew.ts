/**
 * 🏗️ ENHANCED TEAM SERVICE
 * 
 * Updated for simplified team membership structure (profiles-based)
 * Includes smart team building and member assignment
 */

import { supabase } from '@/lib/supabase';

// =====================================================
// TYPES
// =====================================================

export interface TeamMember {
  profile_id: string;
  display_name: string | null;
  role: 'commander' | 'squad_commander' | 'soldier';
  squad_id: string | null;
  avatar_url: string | null;
}

export interface CreateTeamWithMembersInput {
  org_id: string;
  name: string;
  team_type?: 'field' | 'back_office';
  description?: string;
  squads?: string[];
  members?: TeamMember[]; // Members to assign during creation
}

export interface AvailableMember {
  profile_id: string;
  display_name: string | null;
  org_role: string; // org role
  experience_score: number; // calculated based on sessions, role, etc.
  is_eligible_commander: boolean;
  avatar_url: string | null;
}

export interface TeamStructurePreview {
  team_name: string;
  commander: TeamMember | null;
  squad_commanders: TeamMember[];
  soldiers: TeamMember[];
  squads: string[];
  validation_errors: string[];
  is_valid: boolean;
}

// =====================================================
// TEAM CREATION
// =====================================================

/**
 * Create team and assign members atomically
 */
export async function createTeamWithMembers(input: CreateTeamWithMembersInput): Promise<string> {
  const { data, error } = await supabase.rpc('create_team_with_members', {
    p_org_id: input.org_id,
    p_name: input.name,
    p_team_type: input.team_type || 'field',
    p_description: input.description || null,
    p_squads: input.squads || [],
    p_members: JSON.stringify(input.members || [])
  });

  if (error) {
    throw new Error(error.message);
  }

  return data.team_id;
}

/**
 * Get all available members for team assignment
 */
export async function getAvailableMembers(orgId: string): Promise<AvailableMember[]> {
  const { data, error } = await supabase.rpc('get_available_team_members', {
    p_org_id: orgId
  });

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Calculate team member suggestions based on experience
 */
export function suggestTeamRoles(members: AvailableMember[]): {
  suggested_commander: AvailableMember | null;
  suggested_squad_commanders: AvailableMember[];
  suggested_soldiers: AvailableMember[];
} {
  // Sort by experience score
  const sortedMembers = [...members].sort((a, b) => b.experience_score - a.experience_score);
  
  // Find eligible commanders
  const eligibleCommanders = sortedMembers.filter(m => m.is_eligible_commander);
  
  // Suggest commander (highest experience among eligible)
  const suggested_commander = eligibleCommanders.length > 0 ? eligibleCommanders[0] : null;
  
  // Remove commander from available pool
  const remainingMembers = sortedMembers.filter(m => m.profile_id !== suggested_commander?.profile_id);
  
  // Suggest squad commanders (next highest experience, max 3)
  const suggested_squad_commanders = remainingMembers
    .slice(0, Math.min(3, Math.max(1, Math.floor(remainingMembers.length / 3))))
    .filter(m => m.experience_score > 20); // Minimum experience threshold
  
  // Everyone else becomes soldiers
  const suggested_soldiers = remainingMembers.filter(m => 
    !suggested_squad_commanders.some(sc => sc.profile_id === m.profile_id)
  );

  return {
    suggested_commander,
    suggested_squad_commanders,
    suggested_soldiers
  };
}

/**
 * Validate team structure before creation
 */
export function validateTeamStructure(members: TeamMember[], squads: string[]): {
  errors: string[];
  warnings: string[];
  is_valid: boolean;
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check for exactly one commander
  const commanders = members.filter(m => m.role === 'commander');
  if (commanders.length === 0) {
    errors.push("Team must have one commander");
  } else if (commanders.length > 1) {
    errors.push("Team can only have one commander");
  }

  // Check squad commanders have squads if squads exist
  if (squads.length > 0) {
    const squadCommanders = members.filter(m => m.role === 'squad_commander');
    const squadCommandersWithSquads = squadCommanders.filter(m => m.squad_id);
    
    if (squadCommanders.length > squadCommandersWithSquads.length) {
      warnings.push("Some squad commanders don't have assigned squads");
    }
    
    if (squadCommanders.length > squads.length) {
      warnings.push("More squad commanders than available squads");
    }
  }

  // Check team size
  if (members.length < 2) {
    warnings.push("Teams work best with at least 2 members");
  }

  // Check for members in same squad with same role
  const squadRoleMap = new Map<string, Set<string>>();
  members.forEach(member => {
    if (member.squad_id && member.role === 'squad_commander') {
      if (!squadRoleMap.has(member.squad_id)) {
        squadRoleMap.set(member.squad_id, new Set());
      }
      squadRoleMap.get(member.squad_id)!.add(member.role);
    }
  });

  squadRoleMap.forEach((roles, squadId) => {
    if (roles.size > 1) {
      warnings.push(`Squad ${squadId} has multiple squad commanders`);
    }
  });

  return {
    errors,
    warnings,
    is_valid: errors.length === 0
  };
}

/**
 * Create a preview of the team structure
 */
export function createTeamPreview(
  teamName: string,
  members: TeamMember[],
  squads: string[]
): TeamStructurePreview {
  const validation = validateTeamStructure(members, squads);
  
  return {
    team_name: teamName,
    commander: members.find(m => m.role === 'commander') || null,
    squad_commanders: members.filter(m => m.role === 'squad_commander'),
    soldiers: members.filter(m => m.role === 'soldier'),
    squads,
    validation_errors: validation.errors,
    is_valid: validation.is_valid
  };
}
