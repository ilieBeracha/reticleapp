import type { TeamMemberShip } from '@/types/workspace';
import { AuthenticatedClient } from './authenticatedClient';

export type OrgRole = 'owner' | 'admin' | 'instructor' | 'member';
export type TeamMemberDetails = { squad_id?: string; [key: string]: any };

export interface OrgInvitation {
  id: string;
  org_id: string;
  invite_code: string;
  role: OrgRole;
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  invited_by: string; // profile_id
  accepted_by?: string | null; // profile_id
  accepted_at?: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
  team_id?: string | null;
  team_role?: TeamMemberShip | null;
  details?: TeamMemberDetails;
}

export interface OrgInvitationWithDetails extends OrgInvitation {
  org_name?: string;
  invited_by_name?: string;
  accepted_by_name?: string;
  team_name?: string;
}

/**
 * Generate a unique 8-character invite code
 */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

/**
 * Create a new organization invitation
 * 
 * NEW BEHAVIOR: Creates invitation that will create a profile when accepted
 */
export async function createOrgInvitation(
  orgId: string,
  role: OrgRole = 'member',
  teamId?: string | null,
  teamRole?: TeamMemberShip | null,
  teamDetails?: TeamMemberDetails
): Promise<OrgInvitation> {
  const supabase = await AuthenticatedClient.getClient();

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let isUnique = false;
  let attempts = 0;

  // Ensure code is unique (max 5 attempts)
  while (!isUnique && attempts < 5) {
    const { data: existing } = await supabase
      .from('org_invitations')
      .select('id')
      .eq('invite_code', inviteCode)
      .single();

    if (!existing) {
      isUnique = true;
    } else {
      inviteCode = generateInviteCode();
      attempts++;
    }
  }

  if (!isUnique) {
    throw new Error('Failed to generate unique invite code. Please try again.');
  }

  // Set expiration to 7 days from now
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  // Get current user's profile ID for this org
  const context = await AuthenticatedClient.getContext();
  if (!context?.profileId) {
    throw new Error('You must have an active profile to create invitations');
  }

  // Enforce rule: Only members can be assigned to teams via invite
  const finalTeamId = role === 'member' ? teamId : null;
  const finalTeamRole = role === 'member' ? teamRole : null;
  const finalTeamDetails = role === 'member' && teamDetails ? teamDetails : {};

  // Create invitation
  const { data, error } = await supabase
    .from('org_invitations')
    .insert({
      org_id: orgId,
      invite_code: inviteCode,
      role,
      team_id: finalTeamId,
      team_role: finalTeamRole,
      details: finalTeamDetails,
      status: 'pending',
      invited_by: context.profileId, // Now references profile, not user
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating invitation:', error);
    throw new Error(error.message || 'Failed to create invitation');
  }

  return data;
}

/**
 * Get all invitations for an organization
 */
export async function getOrgInvitations(orgId: string): Promise<OrgInvitationWithDetails[]> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
    .from('org_invitations')
    .select(
      `
      *,
      invited_by_profile:profiles!org_invitations_invited_by_fkey(display_name, user_id),
      org:orgs!org_invitations_org_fkey(name),
      team:teams!org_invitations_team_id_fkey(name)
    `
    )
    .eq('org_id', orgId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    throw new Error(error.message || 'Failed to fetch invitations');
  }

  // Transform data to include friendly names
  return data.map((inv: any) => ({
    id: inv.id,
    org_id: inv.org_id,
    invite_code: inv.invite_code,
    role: inv.role,
    status: inv.status,
    invited_by: inv.invited_by,
    accepted_by: inv.accepted_by,
    accepted_at: inv.accepted_at,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
    org_name: inv.org?.name,
    invited_by_name: inv.invited_by_profile?.display_name,
    team_id: inv.team_id,
    team_role: inv.team_role,
    team_name: inv.team?.name,
    details: inv.details,
  }));
}

/**
 * Get pending invitations for an organization
 */
export async function getPendingOrgInvitations(orgId: string): Promise<OrgInvitationWithDetails[]> {
  const invitations = await getOrgInvitations(orgId);
  const now = new Date();

  return invitations.filter((inv) => inv.status === 'pending' && new Date(inv.expires_at) > now);
}

/**
 * Cancel an invitation
 */
export async function cancelOrgInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase
    .from('org_invitations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('status', 'pending');

  if (error) {
    console.error('Error cancelling invitation:', error);
    throw new Error(error.message || 'Failed to cancel invitation');
  }
}

/**
 * Validate an invite code
 * 
 * Checks if code is valid, not expired, and user can accept it
 */
export async function validateOrgInviteCode(inviteCode: string): Promise<OrgInvitationWithDetails> {
  const supabase = await AuthenticatedClient.getClient();

  const { data: invitation, error } = await supabase
    .from('org_invitations')
    .select(
      `
      *,
      org:orgs!org_invitations_org_fkey(id, name, slug)
    `
    )
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .eq('status', 'pending')
    .single();

  if (error || !invitation) {
    throw new Error('Invalid invitation code');
  }

  // Check if expired
  if (new Date(invitation.expires_at) < new Date()) {
    throw new Error('This invitation has expired');
  }

  // Check if user already has a profile in this org
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to accept invitations');
  }

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('user_id', user.id)
    .eq('org_id', invitation.org_id)
    .single();

  if (existingProfile) {
    throw new Error('You are already a member of this organization');
  }

  return {
    id: invitation.id,
    org_id: invitation.org_id,
    invite_code: invitation.invite_code,
    role: invitation.role,
    status: invitation.status,
    invited_by: invitation.invited_by,
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
    updated_at: invitation.updated_at,
    org_name: invitation.org?.name,
    team_id: invitation.team_id,
    team_role: invitation.team_role,
  };
}

/**
 * Accept an invitation
 * 
 * NEW BEHAVIOR: Creates a profile for the user in the organization
 * Uses the RPC function from migration which handles:
 * - Creating the profile
 * - Marking invitation as accepted
 * - Adding to team if specified
 */
export async function acceptOrgInvitation(inviteCode: string): Promise<{ profile_id: string; org_id: string }> {
  const supabase = await AuthenticatedClient.getClient();

  // Call RPC function to accept invitation
  const { data, error } = await supabase.rpc('accept_org_invite', {
    p_invite_code: inviteCode.toUpperCase().trim(),
  });

  if (error) {
    console.error('RPC error accepting invite:', error);
    throw new Error('Failed to accept invitation');
  }

  // Check response
  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to accept invitation');
  }

  return {
    profile_id: data.profile_id,
    org_id: data.org_id,
  };
}

/**
 * Delete an invitation (hard delete)
 */
export async function deleteOrgInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase.from('org_invitations').delete().eq('id', invitationId);

  if (error) {
    console.error('Error deleting invitation:', error);
    throw new Error(error.message || 'Failed to delete invitation');
  }
}

/**
 * Expire old invitations (utility function)
 */
export async function expireOldOrgInvitations(): Promise<number> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
    .from('org_invitations')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    console.error('Error expiring invitations:', error);
    return 0;
  }

  return data?.length || 0;
}

