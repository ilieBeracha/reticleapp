// hooks/useIsRootCommander.ts
import { useMemo } from 'react';
import { useAuth } from '@clerk/clerk-expo';
import { useOrganizationsStore } from '@/store/organizationsStore';

/**
 * Check if current user is commander of the ROOT organization
 * Returns true even when viewing child orgs
 * Use this for "overall admin" checks
 */
export function useIsRootCommander(): boolean {
  const { userId } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!userId || !selectedOrgId) return false;

    // Find the selected org
    const selectedOrg = userOrgs.find(org => org.org_id === selectedOrgId);
    if (!selectedOrg) return false;

    // Find the root org of the selected org
    const rootOrg = userOrgs.find(org => org.org_id === selectedOrg.root_id);
    
    // Check if user is commander of the ROOT
    return rootOrg?.role === 'commander';
  }, [userId, selectedOrgId, userOrgs]);
}