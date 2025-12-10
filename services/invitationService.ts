import type { TeamInvitation, TeamInvitationWithDetails, TeamMemberShip } from '@/types/workspace';
import { AuthenticatedClient } from './authenticatedClient';
import { notifyInviteAccepted } from './notifications';

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
 * Create a new team invitation (team-first architecture)
 */
export async function createInvitation(
    _orgWorkspaceId: string | null, // Legacy param, ignored in team-first
    _role: string = 'member', // Legacy param, ignored in team-first
    teamId: string | null,
    teamRole?: TeamMemberShip | null,
    teamDetails?: Record<string, any>
  ): Promise<TeamInvitation> {
  const supabase = await AuthenticatedClient.getClient();

  if (!teamId) {
    throw new Error('Team ID is required to create an invitation');
  }

  // Generate unique invite code
  let inviteCode = generateInviteCode();
  let isUnique = false;
  let attempts = 0;

  // Ensure code is unique (max 5 attempts)
  while (!isUnique && attempts < 5) {
    const { data: existing } = await supabase
      .from('team_invitations')
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

  // Create team invitation
  const { data, error } = await supabase
    .from('team_invitations')
    .insert({
      team_id: teamId,
      invite_code: inviteCode,
      team_role: teamRole || 'soldier',
      details: teamDetails || {},
      status: 'pending',
      invited_by: user.id,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating team invitation:', error);
    throw new Error(error.message || 'Failed to create invitation');
  }

  return data;
}

/**
 * Get all invitations for a team (team-first architecture)
 */
export async function getTeamInvitations(teamId: string): Promise<TeamInvitationWithDetails[]> {
  const supabase = await AuthenticatedClient.getClient();

  const { data, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      invited_by_profile:profiles!invited_by(full_name, email),
      accepted_by_profile:profiles!accepted_by(full_name, email),
      team:teams(name)
    `)
    .eq('team_id', teamId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching team invitations:', error);
    throw new Error(error.message || 'Failed to fetch invitations');
  }

  // Transform data to include friendly names (map team_role to role for type consistency)
  return data.map((inv: any) => ({
    id: inv.id,
    team_id: inv.team_id,
    invite_code: inv.invite_code,
    role: inv.team_role || 'soldier', // DB uses team_role, type uses role
    status: inv.status,
    invited_by: inv.invited_by,
    accepted_by: inv.accepted_by,
    accepted_at: inv.accepted_at,
    expires_at: inv.expires_at,
    created_at: inv.created_at,
    updated_at: inv.updated_at,
    team_name: inv.team?.name,
    invited_by_name: inv.invited_by_profile?.full_name || inv.invited_by_profile?.email,
    accepted_by_name: inv.accepted_by_profile?.full_name || inv.accepted_by_profile?.email,
  }));
}

/**
 * @deprecated Use getTeamInvitations instead
 */
export async function getWorkspaceInvitations(orgWorkspaceId: string): Promise<TeamInvitationWithDetails[]> {
  // Legacy function - return empty array since workspace_invitations table no longer exists
  console.warn('getWorkspaceInvitations is deprecated, use getTeamInvitations instead');
  return [];
}

/**
 * Get pending invitations for a team (not expired, not accepted, not cancelled)
 */
export async function getPendingInvitations(teamId: string): Promise<TeamInvitationWithDetails[]> {
  const invitations = await getTeamInvitations(teamId);
  if (__DEV__) console.log('team invitations', invitations);
  const now = new Date();

  return invitations.filter((inv) => inv.status === 'pending' && new Date(inv.expires_at) > now);
}

/**
 * Cancel an invitation
 */
export async function cancelInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase
    .from('team_invitations')
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
 * Validate an invite code - direct query approach
 */
export async function validateInviteCode(inviteCode: string): Promise<TeamInvitationWithDetails | null> {
  const supabase = await AuthenticatedClient.getClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to validate an invitation');
  }

  // Direct query for the invitation (RLS allows viewing pending invitations)
  const { data: invitation, error } = await supabase
    .from('team_invitations')
    .select(`
      *,
      invited_by_profile:profiles!invited_by(full_name, email),
      team:teams(name)
    `)
    .eq('invite_code', inviteCode.toUpperCase().trim())
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .single();

  if (error || !invitation) {
    throw new Error('Invalid or expired invitation code');
  }

  // Check if user is already a member
  const { data: existingMember } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', invitation.team_id)
    .eq('user_id', user.id)
    .single();

  if (existingMember) {
    throw new Error('You are already a member of this team');
  }

  // Return transformed invitation data
  return {
    id: invitation.id,
    team_id: invitation.team_id,
    invite_code: invitation.invite_code,
    role: invitation.team_role || 'soldier',
    status: 'pending',
    invited_by: invitation.invited_by,
    invited_by_name: invitation.invited_by_profile?.full_name || invitation.invited_by_profile?.email,
    expires_at: invitation.expires_at,
    created_at: invitation.created_at,
    updated_at: invitation.updated_at,
    team_name: invitation.team?.name,
  };
}

/**
 * Accept an invitation and add user to team using RPC (atomic operation)
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

  // Call RPC function to accept team invitation (includes validation)
  const { data, error } = await supabase.rpc('accept_team_invitation', {
    p_invite_code: inviteCode.toUpperCase().trim(),
  });

  console.log('Accept team invite response:', JSON.stringify(data));

  if (error) {
    console.error('Accept team invite error:', error);
    throw new Error(error.message || 'Failed to accept invitation');
  }

  // Check response - the RPC returns { success: boolean, ... }
  if (!data || !data.success) {
    const errorMsg = 'Failed to accept invitation';
    console.error('Accept team invite failed:', errorMsg);
    throw new Error(errorMsg);
  }

  // Get user profile for notification
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  const memberName = profile?.full_name || 'A new member';

  // Send local notification confirmation (for the user who accepted)
  // The actual notification to commanders/owners needs server-side push
  // TODO: Create Supabase Edge Function to notify team owners/commanders
  
  // For now, we can at least log it - the user who accepted sees a success UI
  console.log(`[Notification] ${memberName} accepted invite to team`);
  
  // If the RPC returns team info, we could send local notification
  if (data.team_id && data.team_name) {
    // This notifies the current user (who accepted) - confirmation
    notifyInviteAccepted(data.team_id, data.team_name, memberName).catch(console.error);
  }
}

/**
 * Delete an invitation (hard delete)
 */
export async function deleteInvitation(invitationId: string): Promise<void> {
  const supabase = await AuthenticatedClient.getClient();

  const { error } = await supabase.from('team_invitations').delete().eq('id', invitationId);

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
    .from('team_invitations')
    .update({
      status: 'expired',
      updated_at: new Date().toISOString(),
    })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select();

  if (error) {
    console.error('Error expiring team invitations:', error);
    return 0;
  }

  return data?.length || 0;
}
