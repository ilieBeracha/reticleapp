/**
 * 🔄 ROLE TRANSITION SERVICE
 * 
 * Handles complex role changes that involve team membership conflicts
 */

import { Profile } from '@/contexts/ProfileContext';
import { supabase } from '@/lib/supabase';
import { OrgRole, TeamRole } from './roleService';

export interface RoleTransitionPlan {
  currentOrgRole: OrgRole;
  targetOrgRole: OrgRole;
  currentTeamRole: TeamRole | null;
  requiresTeamExit: boolean;
  requiresCommanderReplacement: boolean;
  canProceedDirectly: boolean;
  blockers: string[];
  steps: TransitionStep[];
}

export interface TransitionStep {
  order: number;
  action: 'assign_new_commander' | 'remove_from_team' | 'update_org_role';
  description: string;
  requires_confirmation?: boolean;
}

/**
 * Analyze what's needed to transition a profile's org role
 */
export function planRoleTransition(
  profile: Profile,
  targetOrgRole: OrgRole
): RoleTransitionPlan {
  const currentOrgRole = profile.role as OrgRole;
  const currentTeamRole = profile.team_role as TeamRole | null;
  const isInTeam = !!profile.team_id;
  const isCommander = currentTeamRole === 'commander';
  
  const plan: RoleTransitionPlan = {
    currentOrgRole,
    targetOrgRole,
    currentTeamRole,
    requiresTeamExit: false,
    requiresCommanderReplacement: false,
    canProceedDirectly: true,
    blockers: [],
    steps: []
  };

  // If not in team, can proceed directly
  if (!isInTeam) {
    plan.steps.push({
      order: 1,
      action: 'update_org_role',
      description: `Update role from ${currentOrgRole} to ${targetOrgRole}`
    });
    return plan;
  }

  // If in team but target role allows team membership (member->member), can proceed directly
  if (targetOrgRole === 'member') {
    plan.steps.push({
      order: 1,
      action: 'update_org_role',
      description: `Update role from ${currentOrgRole} to ${targetOrgRole}`
    });
    return plan;
  }

  // If promoting from member to higher role, must exit team
  plan.requiresTeamExit = true;
  plan.canProceedDirectly = false;

  // If they're a commander, need to replace them first
  if (isCommander) {
    plan.requiresCommanderReplacement = true;
    plan.blockers.push('Team needs a new commander before promotion');
    
    plan.steps.push({
      order: 1,
      action: 'assign_new_commander',
      description: 'Assign a new commander to the team',
      requires_confirmation: true
    });
  }

  plan.steps.push({
    order: 2,
    action: 'remove_from_team',
    description: `Remove from team to enable ${targetOrgRole} role`
  });

  plan.steps.push({
    order: 3,
    action: 'update_org_role',
    description: `Promote to ${targetOrgRole}`
  });

  return plan;
}

/**
 * Execute a role transition plan
 */
export async function executeRoleTransition(
  profileId: string,
  targetOrgRole: OrgRole,
  newCommanderProfileId?: string
): Promise<void> {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', profileId)
    .single();
    
  if (profileError || !profile) {
    throw new Error('Profile not found');
  }

  const plan = planRoleTransition(profile, targetOrgRole);
  
  if (plan.requiresCommanderReplacement && !newCommanderProfileId) {
    throw new Error('New commander must be assigned before role change');
  }

  // Execute in transaction
  const { error } = await supabase.rpc('execute_role_transition', {
    p_profile_id: profileId,
    p_target_org_role: targetOrgRole,
    p_new_commander_id: newCommanderProfileId || null,
    p_requires_commander_replacement: plan.requiresCommanderReplacement
  });

  if (error) {
    throw new Error(`Role transition failed: ${error.message}`);
  }
}

export interface CommanderCandidate {
  profile_id: string;
  display_name: string | null;
  team_role: string;
  org_role: string;
}

/**
 * Get eligible candidates to replace a team commander
 */
export async function getCommanderReplacementCandidates(
  teamId: string
): Promise<CommanderCandidate[]> {
  const { data: teamMembers, error } = await supabase
    .rpc('get_commander_replacement_candidates', {
      p_team_id: teamId
    });

  if (error) {
    throw new Error(`Failed to get replacement candidates: ${error.message}`);
  }

  return teamMembers || [];
}

/**
 * Check if a role change would cause conflicts
 */
export function validateRoleTransition(
  profile: Profile,
  targetOrgRole: OrgRole
): { valid: boolean; reason?: string } {
  const plan = planRoleTransition(profile, targetOrgRole);
  
  if (plan.requiresCommanderReplacement) {
    return {
      valid: false,
      reason: 'Cannot promote team commander without assigning replacement'
    };
  }
  
  return { valid: true };
}
