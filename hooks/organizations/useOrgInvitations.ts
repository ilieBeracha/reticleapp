import { useOrganization } from "@clerk/clerk-expo";

export interface OrganizationInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: number;
  updatedAt: number;
}

export function useOrgInvitations() {
  const { invitations, isLoaded } = useOrganization({
    invitations: {
      pageSize: 50,
      keepPreviousData: true,
    },
  });

  const pendingInvitations =
    invitations?.data?.filter((inv) => inv.status === "pending") || [];

  const refetch = async () => {
    if (invitations?.revalidate) {
      await invitations.revalidate();
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    try {
      // Find the invitation to revoke
      const invitation = invitations?.data?.find(
        (inv) => inv.id === invitationId
      );
      if (invitation?.revoke) {
        await invitation.revoke();
        await refetch();
      } else {
        throw new Error("Cannot revoke invitation");
      }
    } catch (error) {
      console.error("Error revoking invitation:", error);
      throw error;
    }
  };

  return {
    pendingInvitations,
    loading: !isLoaded,
    refetch,
    revokeInvitation,
  };
}
