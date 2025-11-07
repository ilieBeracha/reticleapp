// hooks/useEnsureActiveOrg.ts
import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect } from "react";

export function useEnsureActiveOrg() {
  const { user, loading } = useAuth();
  const { selectedOrgId, fetchUserOrgs } = useOrganizationsStore();
  const { fetchOrgChildren } = useOrganizationsStore();
  
  useEffect(() => {
    if (!user?.id || loading) return;

    fetchUserOrgs(user?.id);
  }, [user?.id, loading, fetchUserOrgs]);
  
  useEffect(() => {
    if (selectedOrgId) {
      fetchOrgChildren(selectedOrgId);
    }
  }, [selectedOrgId, fetchOrgChildren]);
}
