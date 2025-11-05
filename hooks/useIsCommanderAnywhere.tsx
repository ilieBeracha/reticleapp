// hooks/useIsCommanderAnywhere.ts
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { UserOrg } from "@/types/organizations";
import { useMemo } from "react";

/**
 * Check if user is commander of ANY organization
 * Useful for showing "admin features" globally
 */
export function useIsCommanderAnywhere(): boolean {
  const { user } = useAuth();
  const { userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!user?.id) return false;
    return userOrgs.some((org: UserOrg) => org.role === "commander");
  }, [user?.id, userOrgs]);
}
