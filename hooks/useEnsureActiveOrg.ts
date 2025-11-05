// hooks/useEnsureActiveOrg.ts
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect } from "react";

export function useEnsureActiveOrg() {
  const { user, loading } = useAuth();
  const { userOrgs, selectedOrgId, fetchUserOrgs } = useOrganizationsStore();

  useEffect(() => {
    if (!user?.id || loading) return;

    const checkOrg = async () => {
      // Fetch user's organizations if not loaded
      if (userOrgs.length === 0) {
        await fetchUserOrgs(user?.id);
      }

      // Optional: Redirect to org selection if user has no orgs
      // if (userOrgs.length === 0 && !segments.includes("onboarding")) {
      //   router.replace("/onboarding/create-org");
      // }
    };

    checkOrg();
  }, [user?.id, loading, userOrgs, fetchUserOrgs]);
}
