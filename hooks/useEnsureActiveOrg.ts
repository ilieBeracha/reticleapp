// hooks/useEnsureActiveOrg.ts
import { useOrganization, useOrganizationList } from "@clerk/clerk-expo";
import { useEffect } from "react";

export function useEnsureActiveOrg() {
  const { organization } = useOrganization();
  const { userMemberships, isLoaded, setActive } = useOrganizationList();

  useEffect(() => {
    if (!isLoaded) return;
    if (
      !organization &&
      userMemberships.data &&
      userMemberships.data.length > 0
    ) {
      setActive({ organization: userMemberships.data[0].organization.id });
    }
  }, [isLoaded, organization, userMemberships, setActive]);
}

export function useActiveOrgId(): string | null {
  const { organization } = useOrganization();
  return organization?.id ?? null;
}
