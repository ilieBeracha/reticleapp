import { useAuth } from "@/contexts/AuthContext";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { UserOrg } from "@/types/organizations";
import { useMemo } from "react";
import { useIsRootCommander } from "./useIsRootCommander";

/**
 * Get detailed permissions for current user in selected organization
 * Returns comprehensive permission set for UI control
 */
export function useOrgPermissions(): {
  canViewOrg: boolean;
  canEditOrg: boolean;
  canDeleteOrg: boolean;
  canCreateChild: boolean;
  canInviteMembers: boolean;
  isRootCommander: boolean;
  canRemoveMembers: boolean;
  canEditMembers: boolean;
} {
  const { user } = useAuth();
  const { selectedOrgId, userOrgs } = useOrganizationsStore();
  const isRootCommander = useIsRootCommander();

  return useMemo(() => {
    // Personal mode - can do everything for self
    if (!user?.id || !selectedOrgId) {
      return {
        canViewOrg: false,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: true, // Can create personal trainings
        canEditTraining: true,
        canDeleteTraining: true,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: true,
        canManageWeapons: false,
        role: null,
        isRootCommander: false,
      };
    }

    const membership = userOrgs.find((org: UserOrg) => org.org_id === selectedOrgId);
    const role = membership?.role || null;
    const isLocalCommander = role === "commander";

    // Commander permissions
    if (isLocalCommander) {
      return {
        canViewOrg: true,
        canEditOrg: true,
        canDeleteOrg: true,
        canCreateChild: true,
        canInviteMembers: true,
        canRemoveMembers: true,
        canEditMembers: true,
        canCreateTraining: true,
        canEditTraining: true,
        canDeleteTraining: true,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: true,
        canManageWeapons: true,
        role,
        isRootCommander,
      };
    }

    // Member permissions
    if (role === "member") {
      return {
        canViewOrg: true,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: isRootCommander, // Root commander can invite anywhere
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: true,
        canEditTraining: true,
        canDeleteTraining: isRootCommander,
        canCreateSession: true,
        canEditSession: true,
        canDeleteSession: isRootCommander,
        canManageWeapons: isRootCommander,
        role,
        isRootCommander,
      };
    }

    // Viewer permissions (read-only)
    if (role === "viewer") {
      return {
        canViewOrg: true,
        canEditOrg: false,
        canDeleteOrg: false,
        canCreateChild: false,
        canInviteMembers: false,
        canRemoveMembers: false,
        canEditMembers: false,
        canCreateTraining: false,
        canEditTraining: false,
        canDeleteTraining: false,
        canCreateSession: false,
        canEditSession: false,
        canDeleteSession: false,
        canManageWeapons: false,
        role,
        isRootCommander,
      };
    }

    // No membership - no permissions
    return {
      canViewOrg: false,
      canEditOrg: false,
      canDeleteOrg: false,
      canCreateChild: false,
      canInviteMembers: false,
      canRemoveMembers: false,
      canEditMembers: false,
      canCreateTraining: false,
      canEditTraining: false,
      canDeleteTraining: false,
      canCreateSession: false,
      canEditSession: false,
      canDeleteSession: false,
      canManageWeapons: false,
      role: null,
      isRootCommander: false,
    };
  }, [user?.id, selectedOrgId, userOrgs, isRootCommander]);
}
