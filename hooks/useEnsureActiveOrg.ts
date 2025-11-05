// hooks/useEnsureActiveOrg.ts
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useAuth } from "@clerk/clerk-expo";
import { useRouter, useSegments } from "expo-router";
import { useEffect } from "react";

export function useEnsureActiveOrg() {
  const { userId, isLoaded: authLoaded } = useAuth();
  const { userOrgs, selectedOrgId, fetchUserOrgs, setSelectedOrg } =
    useOrganizationsStore();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (!authLoaded || !userId) return;

    const checkOrg = async () => {
      // Fetch user's organizations if not loaded
      if (userOrgs.length === 0) {
        await fetchUserOrgs(userId);
      }

      // Optional: Redirect to org selection if user has no orgs
      // if (userOrgs.length === 0 && !segments.includes("onboarding")) {
      //   router.replace("/onboarding/create-org");
      // }
    };

    checkOrg();
  }, [authLoaded, userId, selectedOrgId, userOrgs.length]);
}
