/**
 * 💌 INVITATION SERVICE
 * 
 * Handles organization invitations - creating, managing, and accepting invites
 */

import { supabase } from '@/lib/supabase';

export interface OrgInvitation {
  id: string;
  invite_code: string;
  role: 'member' | 'instructor' | 'admin';
  status: 'pending' | 'accepted' | 'cancelled' | 'expired';
  expires_at: string;
  team_id: string | null;
  team_role: 'commander' | 'squad_commander' | 'soldier' | null;
  created_at: string;
  inviter_name: string | null;
  team_name: string | null;
}

export interface CreateInvitationParams {
  orgId: string;
  role: 'member' | 'instructor' | 'admin';
  teamId?: string;
  teamRole?: 'commander' | 'squad_commander' | 'soldier';
  expiresHours?: number; // Default: 168 (7 days)
}

/**
 * Create a new organization invitation
 */
export async function createOrgInvitation(params: CreateInvitationParams): Promise<OrgInvitation> {
  const { data, error } = await supabase.rpc('create_org_invite', {
    p_org_id: params.orgId,
    p_role: params.role,
    p_team_id: params.teamId || null,
    p_team_role: params.teamRole || null,
    p_expires_hours: params.expiresHours || 168
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to create invitation');
  }

  const invitation = data.invitation;
  return {
    id: invitation.id,
    invite_code: invitation.invite_code,
    role: invitation.role,
    status: 'pending',
    expires_at: invitation.expires_at,
    team_id: invitation.team_id,
    team_role: invitation.team_role,
    created_at: new Date().toISOString(),
    inviter_name: null,
    team_name: null
  };
}

/**
 * Get all pending invitations for an organization
 */
export async function getOrgInvitations(orgId: string): Promise<OrgInvitation[]> {
  const { data, error } = await supabase.rpc('get_org_invitations', {
    p_org_id: orgId
  });

  if (error) {
    console.error('❌ getOrgInvitations RPC Error:', {
      orgId,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
    throw new Error(error.message);
  }

  return data || [];
}

/**
 * Cancel an invitation
 */
export async function cancelOrgInvitation(inviteId: string): Promise<void> {
  const { data, error } = await supabase.rpc('cancel_org_invite', {
    p_invite_id: inviteId
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to cancel invitation');
  }
}

/**
 * Accept an invitation (this already exists in the schema)
 */
export async function acceptOrgInvitation(inviteCode: string): Promise<void> {
  const { data, error } = await supabase.rpc('accept_org_invite', {
    p_invite_code: inviteCode
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.success) {
    throw new Error(data.error || 'Failed to accept invitation');
  }
}

/**
 * Validate an invitation code (check if it exists and is valid)
 */
export async function validateInviteCode(inviteCode: string): Promise<{
  valid: boolean;
  orgName?: string;
  role?: string;
  expiresAt?: string;
}> {
  console.log('🔍 Validating invite code:', inviteCode);
  
  // Use the simple RPC function to avoid RLS and JOIN issues
  const { data, error } = await supabase.rpc('validate_invite_simple', {
    p_invite_code: inviteCode
  });

  if (error) {
    console.error('❌ Invite validation RPC error:', error);
    return { valid: false };
  }

  if (!data || data.length === 0) {
    console.log('❌ No invitation data returned');
    return { valid: false };
  }

  const result = data[0];
  console.log('🔍 Validation result:', result);
  
  if (!result || !result.is_valid) {
    console.log('❌ Invitation is invalid or expired');
    return { valid: false };
  }

  console.log('✅ Invitation validated successfully:', {
    orgName: result.organization_name,
    role: result.invitation_role,
    expiresAt: result.expiration_time
  });

  return {
    valid: true,
    orgName: result.organization_name,
    role: result.invitation_role,
    expiresAt: result.expiration_time
  };
}
