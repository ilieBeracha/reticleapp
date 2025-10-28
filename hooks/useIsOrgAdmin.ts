import { useOrganization } from "@clerk/clerk-expo";

/**
 * Hook to check if the current user is an admin of the active organization
 * @returns boolean - true if user is an admin, false otherwise
 */
export function useIsOrgAdmin() {
  const { organization, membership } = useOrganization();

  // No organization = not an admin
  if (!organization) {
    return false;
  }

  // Check if user has admin role
  return membership?.role === "org:admin";
}
