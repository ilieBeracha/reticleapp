import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { OrgMembership } from "@/types/organizations";
export interface OrganizationInvitation {
  id: string;
  emailAddress: string;
  role: string;
  status: "pending" | "accepted" | "revoked" | "expired";
  createdAt: number;
  updatedAt: number;
}

export function useOrgInvitations() {
  const { user } = useAuth();
  const memberships =  useOrganizationsStore.getState().fetchMemberships(user?.id ?? "");

  return memberships?.then((memberships: OrgMembership[] | null) => memberships?.filter((membership: OrgMembership) => membership.role === "member") || []);
}
