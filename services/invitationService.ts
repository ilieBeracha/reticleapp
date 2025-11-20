import type { TeamMemberDetails, TeamMemberShip, WorkspaceInvitation, WorkspaceInvitationWithDetails, WorkspaceRole } from '@/types/workspace';
import { AuthenticatedClient } from './authenticatedClient';

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
 * Create a new workspace invitation
 */
export async function createInvitation(
    orgWorkspaceId: string,
    role: WorkspaceRole = 'member',
    teamId?: string | null,
    teamRole?: TeamMemberShip | null,
    teamDetails?: TeamMemberDetails
  ): Promise<WorkspaceInvitation> {
  const supabase = await AuthenticatedClient.getClient();

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let isUnique = false;
  let attempts = 0;

  // Ensure code is unique (max 5 attempts)
  while (!isUnique && attempts < 5) {
    const { data: existing } = await supabase
      .from('workspace_invitations')
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

  // Get current user ID
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to create an invitation');
  }

  // Enforce rule: Only members can be assigned to teams via invite
  const finalTeamId = role === 'member' ? teamId : null;
  const finalTeamRole = role === 'member' ? teamRole : null;
  const finalTeamDetails = role === 'member' && teamDetails ? teamDetails : {};

  // Create invitation with squad details
  const { data, error } = await supabase
    .from('workspace_invitations')
    .insert({
      org_workspace_id: orgWorkspaceId,
      invite_code: inviteCode,
      role,
      team_id: finalTeamId,
      team_role: finalTeamRole,
      details: finalTeamDetails,
      status: 'pending',
      invited_by: user.id,
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
 * Get all invitations for a workspace
 */
export async function getWorkspaceInvitations(orgWorkspaceId: string): Promise<WorkspaceInvitationWithDetails[]> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
  .from('workspace_invitations')
  .select(
    `
    *,
    invited_by_profile:profiles!workspace_invitations_invited_by_fkey(full_name, email),
    accepted_by_profile:profiles!workspace_invitations_accepted_by_fkey(full_name, email),
    workspace:org_workspaces!workspace_invitations_org_workspace_fkey(name),
    team:teams!workspace_invitations_team_id_fkey(name)
  `
  )
    .eq('org_workspace_id', orgWorkspaceId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching invitations:', error);
    throw new Error(error.message || 'Failed to fetch invitations');
  }

  // Transform data to include friendly names
  return data.map((inv: any) => ({
    id: inv.id,
    org_workspace_id: inv.org_workspace_id,
    invite_code: inv.invite_code,
    role: inv.role,
    status: inv.status,
    invited_by: inv.invited_by,
    accepted_by: inv.accepted_by,
    accepted_at: inv.accepted_at,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
    workspace_name: inv.workspace?.name,
    invited_by_name: inv.invited_by_profile?.full_name || inv.invited_by_profile?.email,
    accepted_by_name: inv.accepted_by_profile?.full_name || inv.accepted_by_profile?.email,
    team_id: inv.team_id,
    team_role: inv.team_role,
    team_name: inv.team?.name, // NEW
  }));
}

/**
 * Get pending invitations for a workspace (not expired, not accepted, not cancelled)
 */
export async function getPendingInvitations(orgWorkspaceId: string): Promise<WorkspaceInvitationWithDetails[]> {
  const invitations = await getWorkspaceInvitations(orgWorkspaceId);
  const now = new Date();

  return invitations.filter((inv) => inv.status === 'pending' && new Date(inv.expires_at) > now);
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase
    .from('workspace_invitations')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitationId)
    .eq('status', 'pending'); // Only cancel pending invitations

  if (error) {
    console.error('Error cancelling invitation:', error);
    throw new Error(error.message || 'Failed to cancel invitation');
  }
}

/**
 * Validate an invite code using RPC (bypasses RLS)
 */
export async function validateInviteCode(inviteCode: string): Promise<WorkspaceInvitationWithDetails | null> {
  const supabase = await AuthenticatedClient.getClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to validate an invitation');
  }

  // Call RPC function
  const { data, error } = await supabase.rpc('validate_invite_code', {
    p_invite_code: inviteCode.toUpperCase().trim(),
    p_user_id: user.id,
  });

  if (error) {
    console.error('RPC error validating invite:', error);
    throw new Error('Failed to validate invitation code');
  }

  // Check response
  if (!data || !data.valid) {
    throw new Error(data?.error || 'Invalid invitation code');
  }

  // Return transformed invitation data
  return {
    id: data.invitation.id,
    org_workspace_id: data.invitation.org_workspace_id,
    invite_code: data.invitation.invite_code,
    role: data.invitation.role,
    status: 'pending',
    invited_by: data.invitation.invited_by,
    invited_by_name: data.invitation.invited_by_name,
    expires_at: data.invitation.expires_at,
    created_at: data.invitation.created_at,
    updated_at: data.invitation.created_at,
    workspace_name: data.invitation.workspace_name,
  };
}

/**
 * Accept an invitation and add user to workspace using RPC (atomic operation)
 */
export async function acceptInvitation(inviteCode: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to accept an invitation');
  }

  // Call RPC function to accept invitation (includes validation)
  const { data, error } = await supabase.rpc('accept_invite_code', {
    p_invite_code: inviteCode.toUpperCase().trim(),
    p_user_id: user.id,
  });

  if (error) {
    console.error('RPC error accepting invite:', error);
    throw new Error('Failed to accept invitation');
  }

  // Check response
  if (!data || !data.success) {
    throw new Error(data?.error || 'Failed to accept invitation');
  }
}

/**
 * Delete an invitation (hard delete)
 */
export async function deleteInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase.from('workspace_invitations').delete().eq('id', invitationId);

  if (error) {
    console.error('Error deleting invitation:', error);
    throw new Error(error.message || 'Failed to delete invitation');
  }
}

/**
 * Expire old invitations (utility function)
 */
export async function expireOldInvitations(): Promise<number> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
    .from('workspace_invitations')
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
