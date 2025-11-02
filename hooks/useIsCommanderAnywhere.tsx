// hooks/useIsCommanderAnywhere.ts
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth } from "@clerk/clerk-expo";
import { useMemo } from "react";

/**
 * Check if user is commander of ANY organization
 * Useful for showing "admin features" globally
 */
export function useIsCommanderAnywhere(): boolean {
  const { userId } = useAuth();
  const { userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId) return false;
    return userOrgs.some((org) => org.role === "commander");
  }, [userId, userOrgs]);
}
