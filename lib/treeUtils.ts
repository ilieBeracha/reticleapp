// lib/treeUtils.ts
// Reusable tree traversal utilities for organization hierarchy

const MAX_DEPTH = 3; // Maximum hierarchy depth (0-2 = Battalion/Company/Platoon)

export interface OrgNode {
  id: string;
  name: string;
  org_type?: string;
  parent_id: string | null;
  created_at?: string;
  [key: string]: any;
}

export interface TreeMaps {
  orgMap: Map<string, OrgNode>;
  childrenMap: Map<string, OrgNode[]>;
}

/**
 * Build lookup maps from flat org array
 * @param orgs - Array of organization objects
 * @returns Object with orgMap (id → org) and childrenMap (parent_id → children[])
 */
export function buildTreeMaps(orgs: OrgNode[]): TreeMaps {
  const orgMap = new Map<string, OrgNode>();
  const childrenMap = new Map<string, OrgNode[]>();

  for (const org of orgs) {
    orgMap.set(org.id, org);
    if (org.parent_id) {
      if (!childrenMap.has(org.parent_id)) {
        childrenMap.set(org.parent_id, []);
      }
      childrenMap.get(org.parent_id)!.push(org);
    }
  }

  return { orgMap, childrenMap };
}

/**
 * Get root org ID by walking up parent chain
 * @param orgId - Starting organization ID
 * @param orgMap - Organization lookup map
 * @returns Root organization ID
 */
export function getRootId(
  orgId: string,
  orgMap: Map<string, OrgNode>
): string {
  let current = orgMap.get(orgId);
  let iterations = 0;

  while (current && current.parent_id && iterations < MAX_DEPTH) {
    current = orgMap.get(current.parent_id);
    iterations++;
  }

  return current?.id || orgId;
}

/**
 * Get all descendant org IDs using BFS
 * @param orgId - Starting organization ID
 * @param childrenMap - Children lookup map
 * @returns Array of descendant organization IDs
 */
export function getDescendants(
  orgId: string,
  childrenMap: Map<string, OrgNode[]>
): string[] {
  const descendants: string[] = [];
  const queue: Array<{ id: string; depth: number }> = [{ id: orgId, depth: 0 }];

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift()!;

    // Stop if we've gone too deep (safety check)
    if (depth >= MAX_DEPTH) continue;

    const children = childrenMap.get(currentId) || [];

    for (const child of children) {
      descendants.push(child.id);
      queue.push({ id: child.id, depth: depth + 1 });
    }
  }

  return descendants;
}

/**
 * Get all descendant org IDs as Set (faster lookups)
 * @param orgId - Starting organization ID
 * @param childrenMap - Children lookup map
 * @returns Set of descendant organization IDs
 */
export function getDescendantsSet(
  orgId: string,
  childrenMap: Map<string, OrgNode[]>
): Set<string> {
  const descendants = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = [{ id: orgId, depth: 0 }];

  while (queue.length > 0) {
    const { id: currentId, depth } = queue.shift()!;

    if (depth >= MAX_DEPTH) continue;

    const children = childrenMap.get(currentId) || [];

    for (const child of children) {
      descendants.add(child.id);
      queue.push({ id: child.id, depth: depth + 1 });
    }
  }

  return descendants;
}

/**
 * Get sibling org IDs (same parent)
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @param childrenMap - Children lookup map
 * @returns Array of sibling organization IDs
 */
export function getSiblings(
  orgId: string,
  orgMap: Map<string, OrgNode>,
  childrenMap: Map<string, OrgNode[]>
): string[] {
  const org = orgMap.get(orgId);
  if (!org || !org.parent_id) return [];

  const siblings = childrenMap.get(org.parent_id) || [];
  return siblings.map(s => s.id).filter(id => id !== orgId);
}

/**
 * Get all ancestor org IDs (parent path)
 * @param orgId - Starting organization ID
 * @param orgMap - Organization lookup map
 * @returns Array of ancestor organization IDs (direct parent to root)
 */
export function getAncestors(
  orgId: string,
  orgMap: Map<string, OrgNode>
): string[] {
  const ancestors: string[] = [];
  let current = orgMap.get(orgId);
  let iterations = 0;

  while (current && current.parent_id && iterations < MAX_DEPTH) {
    ancestors.push(current.parent_id);
    current = orgMap.get(current.parent_id);
    iterations++;
  }

  return ancestors;
}

/**
 * Calculate breadcrumb path (array of org names from root to current)
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @returns Array of organization names forming the path
 */
export function calculateBreadcrumb(
  orgId: string,
  orgMap: Map<string, OrgNode>
): string[] {
  const path: string[] = [];
  let current = orgMap.get(orgId);
  let depth = 0;

  while (current && depth < MAX_DEPTH) {
    path.unshift(current.name);
    if (current.parent_id) {
      current = orgMap.get(current.parent_id);
      depth++;
    } else {
      break;
    }
  }

  return path;
}

/**
 * Calculate depth of org in tree
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @returns Depth (0 = root, 1 = child, etc.)
 */
export function calculateDepth(
  orgId: string,
  orgMap: Map<string, OrgNode>
): number {
  let depth = 0;
  let current = orgMap.get(orgId);
  let iterations = 0;

  while (current && current.parent_id && iterations < MAX_DEPTH) {
    current = orgMap.get(current.parent_id);
    depth++;
    iterations++;
  }

  return depth;
}

/**
 * Calculate both depth and breadcrumb in one pass (optimized)
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @returns Object with depth and breadcrumb
 */
export function calculatePathInfo(
  orgId: string,
  orgMap: Map<string, OrgNode>
): { depth: number; breadcrumb: string[] } {
  const path: string[] = [];
  let current = orgMap.get(orgId);
  let depth = 0;

  while (current && depth < MAX_DEPTH) {
    path.unshift(current.name);
    if (current.parent_id) {
      current = orgMap.get(current.parent_id);
      depth++;
    } else {
      break;
    }
  }

  return { depth, breadcrumb: path };
}

/**
 * Check if orgA is ancestor of orgB
 * @param ancestorId - Potential ancestor org ID
 * @param descendantId - Potential descendant org ID
 * @param orgMap - Organization lookup map
 * @returns True if ancestorId is in descendantId's parent chain
 */
export function isAncestorOf(
  ancestorId: string,
  descendantId: string,
  orgMap: Map<string, OrgNode>
): boolean {
  const ancestors = getAncestors(descendantId, orgMap);
  return ancestors.includes(ancestorId);
}

/**
 * Check if two orgs are in same tree (have same root)
 * @param orgId1 - First organization ID
 * @param orgId2 - Second organization ID
 * @param orgMap - Organization lookup map
 * @returns True if both orgs have same root
 */
export function inSameTree(
  orgId1: string,
  orgId2: string,
  orgMap: Map<string, OrgNode>
): boolean {
  const root1 = getRootId(orgId1, orgMap);
  const root2 = getRootId(orgId2, orgMap);
  return root1 === root2;
}

/**
 * Get direct parent org
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @returns Parent organization or null if root
 */
export function getParent(
  orgId: string,
  orgMap: Map<string, OrgNode>
): OrgNode | null {
  const org = orgMap.get(orgId);
  if (!org || !org.parent_id) return null;
  return orgMap.get(org.parent_id) || null;
}

/**
 * Get direct children orgs
 * @param orgId - Organization ID
 * @param childrenMap - Children lookup map
 * @returns Array of child organizations
 */
export function getChildren(
  orgId: string,
  childrenMap: Map<string, OrgNode[]>
): OrgNode[] {
  return childrenMap.get(orgId) || [];
}

/**
 * Check if org has any children
 * @param orgId - Organization ID
 * @param childrenMap - Children lookup map
 * @returns True if org has children
 */
export function hasChildren(
  orgId: string,
  childrenMap: Map<string, OrgNode[]>
): boolean {
  const children = childrenMap.get(orgId);
  return children !== undefined && children.length > 0;
}

/**
 * Get all root orgs from a flat array
 * @param orgs - Array of organizations
 * @returns Array of root organizations (parent_id === null)
 */
export function getRootOrgs(orgs: OrgNode[]): OrgNode[] {
  return orgs.filter(org => org.parent_id === null);
}

/**
 * Get org by ID (type-safe wrapper)
 * @param orgId - Organization ID
 * @param orgMap - Organization lookup map
 * @returns Organization or undefined
 */
export function getOrgById(
  orgId: string,
  orgMap: Map<string, OrgNode>
): OrgNode | undefined {
  return orgMap.get(orgId);
}

/**
 * Count total descendants of an org
 * @param orgId - Organization ID
 * @param childrenMap - Children lookup map
 * @returns Number of descendants
 */
export function countDescendants(
  orgId: string,
  childrenMap: Map<string, OrgNode[]>
): number {
  return getDescendants(orgId, childrenMap).length;
}

/**
 * Get maximum depth in a tree
 * @param rootId - Root organization ID
 * @param orgMap - Organization lookup map
 * @param childrenMap - Children lookup map
 * @returns Maximum depth found in tree
 */
export function getMaxDepthInTree(
  rootId: string,
  orgMap: Map<string, OrgNode>,
  childrenMap: Map<string, OrgNode[]>
): number {
  let maxDepth = 0;
  const queue: Array<{ id: string; depth: number }> = [{ id: rootId, depth: 0 }];

  while (queue.length > 0) {
    const { id, depth } = queue.shift()!;
    maxDepth = Math.max(maxDepth, depth);

    if (depth >= MAX_DEPTH) continue;

    const children = childrenMap.get(id) || [];
    for (const child of children) {
      queue.push({ id: child.id, depth: depth + 1 });
    }
  }

  return maxDepth;
}

// Export constant for use in other modules
export { MAX_DEPTH };

