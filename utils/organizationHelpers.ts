// utils/organizationHelpers.ts
// Helper functions for organization display and formatting

import type { FlatOrganization } from "@/types/organizations";

/**
 * Format breadcrumb for mobile display
 * Compresses long paths to "Root → ⋯ → Current"
 */
export function formatBreadcrumb(breadcrumb: string[], maxLength: number = 3): string {
  if (breadcrumb.length <= maxLength) {
    return breadcrumb.join(" → ");
  }
  
  // Show: "Root → ⋯ → Current"
  return `${breadcrumb[0]} → ⋯ → ${breadcrumb.slice(-1)[0]}`;
}

/**
 * Group organizations by parent_id for tree rendering
 */
export function groupOrgsByParent(
  orgs: FlatOrganization[]
): Record<string, FlatOrganization[]> {
  return orgs.reduce((acc, org) => {
    if (!org.isRoot && org.parent_id) {
      if (!acc[org.parent_id]) acc[org.parent_id] = [];
      acc[org.parent_id].push(org);
    }
    return acc;
  }, {} as Record<string, FlatOrganization[]>);
}

/**
 * Get root organizations from flat array
 */
export function getRootOrgs(orgs: FlatOrganization[]): FlatOrganization[] {
  return orgs.filter(o => o.isRoot);
}

/**
 * Group organizations by role (commander, member, viewer)
 */
export function groupOrgsByRole(orgs: FlatOrganization[]): {
  commands: FlatOrganization[];
  memberships: FlatOrganization[];
  viewers: FlatOrganization[];
  context: FlatOrganization[];
} {
  return {
    commands: orgs.filter(o => o.role === "commander" && !o.isContextOnly),
    memberships: orgs.filter(o => o.role === "member" && !o.isContextOnly),
    viewers: orgs.filter(o => o.role === "viewer" && !o.isContextOnly),
    context: orgs.filter(o => o.isContextOnly),
  };
}

/**
 * Group organizations by tree root
 */
export function groupOrgsByTree(orgs: FlatOrganization[]): Record<string, {
  root: FlatOrganization;
  children: FlatOrganization[];
}> {
  const trees: Record<string, {
    root: FlatOrganization;
    children: FlatOrganization[];
  }> = {};
  
  for (const org of orgs) {
    const rootName = org.breadcrumb[0];
    
    if (!trees[rootName]) {
      const rootOrg = orgs.find(o => o.name === rootName && o.isRoot);
      if (!rootOrg) continue;
      
      trees[rootName] = {
        root: rootOrg,
        children: [],
      };
    }
    
    if (!org.isRoot) {
      trees[rootName].children.push(org);
    }
  }
  
  return trees;
}

/**
 * Filter organizations by search query
 * Searches in name and breadcrumb
 */
export function filterOrgs(
  orgs: FlatOrganization[],
  searchQuery: string
): FlatOrganization[] {
  if (!searchQuery.trim()) return orgs;
  
  const query = searchQuery.toLowerCase();
  return orgs.filter(
    (org) =>
      org.name.toLowerCase().includes(query) ||
      org.breadcrumb.join(" ").toLowerCase().includes(query)
  );
}

/**
 * Get permission label for org
 * Shows "ROOT ADMIN" for root commanders vs "COMMANDER" for local
 */
export function getPermissionLabel(org: FlatOrganization): string {
  if (org.isContextOnly) return "VIEW ONLY";
  
  if (org.role === "commander") {
    return org.isRoot ? "ROOT ADMIN" : "COMMANDER";
  }
  
  return org.role.toUpperCase();
}

/**
 * Get role color
 */
export function getRoleColor(role: string, colors: any): string {
  const roleColors: Record<string, string> = {
    commander: colors.orange,
    member: colors.blue,
    viewer: colors.textMuted,
  };
  return roleColors[role] || colors.textMuted;
}

/**
 * Sort organizations: roots first, then alphabetically
 */
export function sortOrgs(orgs: FlatOrganization[]): FlatOrganization[] {
  return [...orgs].sort((a, b) => {
    if (a.isRoot && !b.isRoot) return -1;
    if (!a.isRoot && b.isRoot) return 1;
    return a.breadcrumb.join(" → ").localeCompare(b.breadcrumb.join(" → "));
  });
}

/**
 * Get organization statistics
 */
export function getOrgStats(orgs: FlatOrganization[]): {
  total: number;
  roots: number;
  commands: number;
  memberships: number;
  contextOnly: number;
  maxDepth: number;
} {
  return {
    total: orgs.length,
    roots: orgs.filter(o => o.isRoot).length,
    commands: orgs.filter(o => o.role === "commander" && !o.isContextOnly).length,
    memberships: orgs.filter(o => o.role === "member").length,
    contextOnly: orgs.filter(o => o.isContextOnly).length,
    maxDepth: Math.max(...orgs.map(o => o.depth), 0),
  };
}

