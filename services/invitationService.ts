import type { WorkspaceInvitation, WorkspaceInvitationWithDetails, WorkspaceRole } from '@/types/workspace';
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
  role: WorkspaceRole = 'member'
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
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to create an invitation');
  }

  // Create invitation
  const { data, error } = await supabase
    .from('workspace_invitations')
    .insert({
      org_workspace_id: orgWorkspaceId,
      invite_code: inviteCode,
      role,
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
export async function getWorkspaceInvitations(
  orgWorkspaceId: string
): Promise<WorkspaceInvitationWithDetails[]> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
    .from('workspace_invitations')
    .select(`
      *,
      invited_by_profile:profiles!workspace_invitations_invited_by_fkey(full_name, email),
      accepted_by_profile:profiles!workspace_invitations_accepted_by_fkey(full_name, email),
      workspace:org_workspaces!workspace_invitations_org_workspace_fkey(name)
    `)
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
  }));
}

/**
 * Get pending invitations for a workspace (not expired, not accepted, not cancelled)
 */
export async function getPendingInvitations(
  orgWorkspaceId: string
): Promise<WorkspaceInvitationWithDetails[]> {
  const invitations = await getWorkspaceInvitations(orgWorkspaceId);
  const now = new Date();
  
  return invitations.filter(
    (inv) =>
      inv.status === 'pending' &&
      new Date(inv.expires_at) > now
  );
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
 * Validate an invite code
 */
export async function validateInviteCode(
  inviteCode: string
): Promise<WorkspaceInvitationWithDetails | null> {
    const supabase = await AuthenticatedClient.getClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to validate an invitation');
  }

  const { data, error } = await supabase
    .from('workspace_invitations')
    .select(`
      *,
      invited_by_profile:profiles!workspace_invitations_invited_by_fkey(full_name, email),
      workspace:org_workspaces!workspace_invitations_org_workspace_fkey(name, description)
    `)
    .eq('invite_code', inviteCode.toUpperCase())
    .single();

  if (error || !data) {
    return null;
  }

  // Check if user is trying to validate their own invitation
  if (data.invited_by === user.id) {
    throw new Error('You cannot use your own invitation code');
  }

  // Check if invitation is valid
  const now = new Date();
  const expiresAt = new Date(data.expires_at);

  if (data.status !== 'pending') {
    throw new Error(
      data.status === 'accepted'
        ? 'This invitation has already been used'
        : data.status === 'cancelled'
        ? 'This invitation has been cancelled'
        : 'This invitation has expired'
    );
  }

  if (expiresAt <= now) {
    // Auto-expire the invitation
    await supabase
      .from('workspace_invitations')
      .update({ status: 'expired', updated_at: new Date().toISOString() })
      .eq('id', data.id);
    
    throw new Error('This invitation has expired');
  }

  // Check if user is already a member of this workspace
  const { data: existingAccess } = await supabase
    .from('workspace_access')
    .select('id')
    .eq('org_workspace_id', data.org_workspace_id)
    .eq('member_id', user.id)
    .single();

  if (existingAccess) {
    throw new Error('You are already a member of this workspace');
  }

  // Transform data
  return {
    id: data.id,
    org_workspace_id: data.org_workspace_id,
    invite_code: data.invite_code,
    role: data.role,
    status: data.status,
    invited_by: data.invited_by,
    accepted_by: data.accepted_by,
    accepted_at: data.accepted_at,
    expires_at: data.expires_at,
    created_at: data.created_at,
    updated_at: data.updated_at,
    workspace_name: data.workspace?.name,
    invited_by_name: data.invited_by_profile?.full_name || data.invited_by_profile?.email,
  };
}

/**
 * Accept an invitation and add user to workspace
 */
export async function acceptInvitation(inviteCode: string): Promise<void> {
    const supabase = await AuthenticatedClient.getClient();

  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to accept an invitation');
  }

  // Validate the invite code
  const invitation = await validateInviteCode(inviteCode);
  if (!invitation) {
    throw new Error('Invalid invitation code');
  }

  // Check if user is trying to accept their own invitation
  if (invitation.invited_by === user.id) {
    throw new Error('You cannot accept your own invitation code');
  }

  // Check if user is already a member of this workspace
  const { data: existingAccess } = await supabase
    .from('workspace_access')
    .select('id')
    .eq('org_workspace_id', invitation.org_workspace_id)
    .eq('member_id', user.id)
    .single();

  if (existingAccess) {
    throw new Error('You are already a member of this workspace');
  }

  // Start a transaction-like operation
  // 1. Add user to workspace_access
  const { error: accessError } = await supabase
    .from('workspace_access')
    .insert({
      workspace_type: 'org',
      org_workspace_id: invitation.org_workspace_id,
      member_id: user.id,
      role: invitation.role,
    });

  if (accessError) {
    console.error('Error adding workspace access:', accessError);
    throw new Error(accessError.message || 'Failed to join workspace');
  }

  // 2. Update invitation status
  const { error: updateError } = await supabase
    .from('workspace_invitations')
    .update({
      status: 'accepted',
      accepted_by: user.id,
      accepted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', invitation.id);

  if (updateError) {
    console.error('Error updating invitation:', updateError);
    // Note: workspace access was already added, so user is now a member
    // This is not a critical error
  }
}

/**
 * Delete an invitation (hard delete)
 */
export async function deleteInvitation(invitationId: string): Promise<void> {
    const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase
    .from('workspace_invitations')
    .delete()
    .eq('id', invitationId);

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

