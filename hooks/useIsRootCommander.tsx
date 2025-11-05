// hooks/useIsRootCommander.ts
import { useAuth } from '@/contexts/AuthContext';
import { useOrganizationsStore } from '@/store/organizationsStore';
import { UserOrg } from '@/types/organizations';
import { useMemo } from 'react';

/**
 * Check if current user is commander of the ROOT organization
 * Returns true even when viewing child orgs
 * Use this for "overall admin" checks
 */
export function useIsRootCommander(): boolean {
  const { user } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();

  return useMemo(() => {
    if (!user?.id || !selectedOrgId) return false;

    // Find the selected org
    const selectedOrg = userOrgs.find((org: UserOrg) => org.org_id === selectedOrgId);
    if (!selectedOrg) return false;

    // Find the root org of the selected org
    const rootOrg = userOrgs.find((org: UserOrg) => org.org_id === selectedOrg.root_id);
    
    // Check if user is commander of the ROOT
    return rootOrg?.role === 'commander';
    }, [user?.id, selectedOrgId, userOrgs]);
}