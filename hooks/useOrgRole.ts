import { useOrganizationList } from "@clerk/clerk-expo";

export type OrgRole =
  | "org:unit_commander"
  | "org:team_commander"
  | "org:squad_commander"
  | "org:soldier";

export function useOrgRole() {
  const { userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 1,
    },
  });

  const currentMembership = userMemberships?.data?.[0];
  const role = currentMembership?.role as OrgRole | undefined;

  // Role hierarchy checks
  const isUnitCommander = role === "org:unit_commander";
  const isTeamCommander = role === "org:team_commander" || isUnitCommander;
  const isSquadCommander = role === "org:squad_commander" || isTeamCommander;
  const isSoldier = !!role; // Any role means they're at least a soldier

  // Permission helpers
  const canManageOrg = isUnitCommander;
  const canInviteMembers = isUnitCommander || role === "org:team_commander";
  const canManageMembers = isUnitCommander || role === "org:team_commander";
  const canCreateTraining = isSquadCommander; // Squad commander and above
  const canDeleteTraining = isTeamCommander; // Team commander and above
  const canViewAllAnalytics = isTeamCommander;
  const canExportAnalytics = isUnitCommander;

  return {
    role,
    isUnitCommander,
    isTeamCommander,
    isSquadCommander,
    isSoldier,
    canManageOrg,
    canInviteMembers,
    canManageMembers,
    canCreateTraining,
    canDeleteTraining,
    canViewAllAnalytics,
    canExportAnalytics,
  };
}

// Helper function to get role display name
export function getRoleDisplayName(role: string): string {
  switch (role) {
    case "org:unit_commander":
      return "Unit Commander";
    case "org:team_commander":
      return "Team Commander";
    case "org:squad_commander":
      return "Squad Commander";
    case "org:soldier":
      return "Soldier";
    case "org:admin":
      return "Admin";
    case "org:member":
      return "Member";
    default:
      return "Unknown";
  }
}

// Helper function to get role icon
export function getRoleIcon(role: string): string {
  switch (role) {
    case "org:unit_commander":
      return "star";
    case "org:team_commander":
      return "shield-checkmark";
    case "org:squad_commander":
      return "shield-half";
    case "org:soldier":
      return "person";
    case "org:admin":
      return "shield-checkmark";
    case "org:member":
      return "person";
    default:
      return "person";
  }
}
