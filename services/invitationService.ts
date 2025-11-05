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
 * @returns Created invitation
 */
export async function createInvitationService(
  inviteCode: string,
  orgId: string,
  role: "commander" | "member" | "viewer",
  invitedBy: string
): Promise<Invitation> {
  try {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("invitations")
      .insert({
        email: inviteCode, // Store invite code in email field
        organization_id: orgId,
        role,
        invited_by: invitedBy,
        status: "pending",
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
      .eq("email", inviteCode.toUpperCase()) // Code stored in email field
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
 * Finds invitation by code, creates org membership, and updates invitation status
 *
 * @param inviteCode - 6-character invite code
 * @param userId - User ID accepting the invitation
 * @returns Accepted invitation with org details
 */
export async function acceptInvitationService(
  inviteCode: string,
  userId: string
): Promise<{ invitation: Invitation; orgName: string }> {
  try {
    const client = await AuthenticatedClient.getClient();

    // 1. Find invitation by code
    const invitation = await getInvitationByCodeService(inviteCode);
    if (!invitation) {
      throw new DatabaseError("Invalid or expired invitation code");
    }

    // 2. Check if already a member
    const { data: existingMembership } = await client
      .from("org_memberships")
      .select("id")
      .eq("user_id", userId)
      .eq("org_id", invitation.organization_id)
      .single();

    if (existingMembership) {
      throw new DatabaseError("You are already a member of this organization");
    }

    // 3. Create org membership
    const { error: membershipError } = await client
      .from("org_memberships")
      .insert({
        user_id: userId,
        org_id: invitation.organization_id,
        role: invitation.role,
      });

    if (membershipError) throw new DatabaseError(membershipError.message);

    // 4. Update invitation status
    const { data, error } = await client
      .from("invitations")
      .update({ 
        status: "accepted", 
        accepted_at: new Date().toISOString() 
      })
      .eq("id", invitation.id)
      .select("*, organizations(*)")
      .single();

    if (error) throw new DatabaseError(error.message);

    return {
      invitation: data as Invitation,
      orgName: (data as any).organizations?.name || "Organization",
    };
  } catch (err: any) {
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