import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { UserOrg } from "@/types/organizations";
import { useMemo } from "react";

/**
 * Check if current user is commander of the SELECTED organization
 * Returns false if in a child org where user is only a member
 */
export function useIsOrganizationCommander(): boolean {
  const { user } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!user?.id || !selectedOrgId) return false;

    const membership = userOrgs.find((org: UserOrg) => org.org_id === selectedOrgId);
    return membership?.role === "commander";
  }, [user?.id, selectedOrgId, userOrgs]);
}
