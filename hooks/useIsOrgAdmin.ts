// hooks/useIsOrganizationCommander.ts
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth } from "@clerk/clerk-expo";
import { useMemo } from "react";

/**
 * Check if current user is commander of the SELECTED organization
 * Returns false if in a child org where user is only a member
 */
export function useIsOrganizationCommander(): boolean {
  const { userId } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId || !selectedOrgId) return false;

    const membership = userOrgs.find((org) => org.org_id === selectedOrgId);
    return membership?.role === "commander";
  }, [userId, selectedOrgId, userOrgs]);
}
