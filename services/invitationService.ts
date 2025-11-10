import { AuthenticatedClient } from "@/lib/authenticatedClient";
import { DatabaseError, handleServiceError } from "@/lib/errors";
import { Invitation } from "@/types/database";

/**
 * Create an invitation to join an organization using invite code
 * RLS Policy: Only commanders can create invitations for their orgs
 *
 * @param inviteCode - 6-character invite code
 * @param orgId - Organization ID to invite to
 * @param role - Role to assign (commander, member, viewer)
 * @param invitedBy - User ID of the inviter
 * @param maxUses - Maximum number of uses (default: 1 for commander, optional for members)
 * @returns Created invitation
 */
export async function createInvitationService(
  inviteCode: string,
  orgId: string,
  role: "commander" | "member" | "viewer",
  invitedBy: string,
  maxUses?: number | null
): Promise<Invitation> {
  try {
    const client = await AuthenticatedClient.getClient();

    // Validate: Commander invites must be single-use
    if (role === "commander" && maxUses !== undefined && maxUses !== 1) {
      throw new Error("Commander invitations must be single-use");
    }

    const { data, error } = await client
      .from("invitations")
      .insert({
        code: inviteCode,
        organization_id: orgId,
        role,
        invited_by: invitedBy,
        status: "pending",
        max_uses: role === "commander" ? 1 : (maxUses || 1), // Commander = 1, Member = custom
        current_uses: 0,
      })
      .select()
      .single();

    if (error) throw new DatabaseError(error.message);
    return data as Invitation;
  } catch (err: any) {
    handleServiceError(err, "Failed to create invitation");
  }
}

/**
 * Get all invitations for an organization
 * RLS Policy: Only org members can view invitations for their org
 *
 * @param orgId - Organization ID
 * @returns Array of invitations
 */
export async function getInvitationsService(
  orgId: string
): Promise<Invitation[]> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("invitations")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });

    if (error) throw new DatabaseError(error.message);
    return (data as Invitation[]) || [];
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch invitations");
  }
}

/**
 * Get invitation by invite code
 * Used when user clicks magic link or enters code
 *
 * @param inviteCode - 6-character invite code
 * @returns Invitation with organization details
 */
export async function getInvitationByCodeService(
  inviteCode: string
): Promise<Invitation | null> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("invitations")
      .select("*, organizations(*)")
      .eq("code", inviteCode.toUpperCase()) // Code stored in code field
      .eq("status", "pending")
      .single();

    if (error) {
      if (error.code === "PGRST116") return null; // Not found
      throw new DatabaseError(error.message);
    }
    return data as Invitation;
  } catch (err: any) {
    handleServiceError(err, "Failed to fetch invitation");
  }
}

/**
 * Accept an invitation by invite code
 * Uses RPC to bypass RLS policies and handle all logic server-side
 *
 * @param inviteCode - 6-character invite code
 * @param userId - User ID accepting the invitation (not used, JWT determines user)
 * @returns Accepted invitation with org details
 */
export async function acceptInvitationService(
  inviteCode: string,
  userId: string
): Promise<{ invitation: Invitation; orgName: string }> {
  try {
    const client = await AuthenticatedClient.getClient();

    console.log('🔵 Calling accept_org_invite RPC with token:', inviteCode.toUpperCase());

    // Call the RPC function which handles all the logic server-side
    // This bypasses RLS policies since RPCs run with elevated permissions
    const { data, error } = await client.rpc("accept_org_invite", {
      p_token: inviteCode.toUpperCase(),
    });

    console.log('🔵 RPC response:', { data, error });

    if (error) {
      console.error('❌ RPC error:', error);
      
      // Parse error messages from RPC
      if (error.message?.includes("not found") || error.message?.includes("expired")) {
        throw new DatabaseError("Invalid or expired invitation code");
      } else if (error.message?.includes("already a member")) {
        throw new DatabaseError("You are already a member of this organization");
      }
      
      throw new DatabaseError(error.message || "Failed to accept invitation");
    }

    if (!data) {
      throw new DatabaseError("No data returned from invitation acceptance");
    }

    console.log('✅ Invitation accepted successfully:', data);

    // Parse the JSONB response from the RPC
    const result = typeof data === 'string' ? JSON.parse(data) : data;

    return {
      invitation: result.invitation as Invitation,
      orgName: result.org_name || result.invitation?.organizations?.name || "Organization",
    };
  } catch (err: any) {
    console.error('❌ Error in acceptInvitationService:', err);
    handleServiceError(err, "Failed to accept invitation");
  }
}

/**
 * Decline/Cancel an invitation
 *
 * @param invitationId - Invitation ID to cancel
 * @returns void
 */
export async function cancelInvitationService(
  invitationId: string
): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("invitations")
      .update({ status: "cancelled" })
      .eq("id", invitationId);

    if (error) throw new DatabaseError(error.message);
  } catch (err: any) {
    handleServiceError(err, "Failed to cancel invitation");
  }
}

/**
 * Delete an invitation (hard delete)
 * RLS Policy: Only the inviter can delete their own invitations
 *
 * @param invitationId - Invitation ID to delete
 * @returns void
 */
export async function deleteInvitationService(
  invitationId: string
): Promise<void> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("invitations")
      .delete()
      .eq("id", invitationId);

    if (error) throw new DatabaseError(error.message);
  } catch (err: any) {
    handleServiceError(err, "Failed to delete invitation");
  }
}