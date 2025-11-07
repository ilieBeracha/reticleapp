// services/organizationsService.ts
import { AuthenticatedClient, DatabaseError } from "@/lib/authenticatedClient";
import type {
  FlatOrganization,
  Organization,
  OrgMembership,
  UserOrg,
} from "@/types/organizations";

export class OrganizationsService {
  // Get memberships of an organization
  static async getMemberships(orgId: string): Promise<OrgMembership[]> {
    const client = await AuthenticatedClient.getClient();
    const { data, error } = await client
      .from("org_memberships")
      .select("*, users(*)")
      .eq("org_id", orgId);
    if (error) throw new Error(`Failed to get memberships: ${error.message}`);
    return data as OrgMembership[];
  }
  // Get current user's organizations
  static async getUserOrgs(userId: string): Promise<UserOrg[]> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_user_orgs", {
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to get user orgs: ${error.message}`);
    return data || [];
  }

  // Get all accessible organizations
  static async getAllOrgs(userId: string): Promise<Organization[]> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_user_accessible_orgs", {
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to get orgs: ${error.message}`);
    return data || [];
  }

  /**
   * Get ALL organizations user has access to (flattened hierarchy)
   * Includes both root and child orgs with proper permissions:
   * - Root commanders: See all, full permissions
   * - Child commanders: See root (context), their org + descendants (full permissions), siblings (context)
   * - Members: See root (context) + only their org
   */
  static async getAllAccessibleOrganizations(
    userId: string
  ): Promise<FlatOrganization[]> {
    const client = await AuthenticatedClient.getClient();

    // Get all user orgs (direct memberships with role information)
    const { data: userOrgs, error: userOrgsError } = await client.rpc(
      "get_user_orgs",
      { p_user_id: userId }
    );

    if (userOrgsError) throw new DatabaseError(userOrgsError.message);

    // Get ALL organizations to build the full hierarchy
    const { data: allOrgs, error: allOrgsError } = await client
      .from("organizations")
      .select("id, name, org_type, parent_id, created_at");

    if (allOrgsError) throw new DatabaseError(allOrgsError.message);

    // Create lookup maps
    const orgMap = new Map();
    const childrenMap = new Map<string, any[]>();

    for (const org of allOrgs || []) {
      orgMap.set(org.id, org);
      if (org.parent_id) {
        if (!childrenMap.has(org.parent_id)) {
          childrenMap.set(org.parent_id, []);
        }
        childrenMap.get(org.parent_id)!.push(org);
      }
    }

    // Helper: Get root org ID for any org
    const getRootId = (orgId: string): string => {
      let current = orgMap.get(orgId);
      while (current && current.parent_id) {
        current = orgMap.get(current.parent_id);
      }
      return current?.id || orgId;
    };

    // Helper: Get all descendants of an org
    const getDescendants = (orgId: string): string[] => {
      const descendants: string[] = [];
      const queue = [orgId];

      while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = childrenMap.get(currentId) || [];

        for (const child of children) {
          descendants.push(child.id);
          queue.push(child.id);
        }
      }

      return descendants;
    };

    // Helper: Get siblings of an org
    const getSiblings = (orgId: string): string[] => {
      const org = orgMap.get(orgId);
      if (!org || !org.parent_id) return [];

      const siblings = childrenMap.get(org.parent_id) || [];
      return siblings.map((s: any) => s.id).filter((id: string) => id !== orgId);
    };

    // Build visible orgs with permissions
    const visibleOrgs = new Map<string, {
      org: any;
      role: "commander" | "member" | "viewer";
      hasFullPermission: boolean;
      isContextOnly: boolean;
      userOrgData?: any; // Store original userOrg data for full_path
    }>();

    // Process each direct membership
    for (const userOrg of userOrgs || []) {
      const orgId = userOrg.org_id;
      const role = userOrg.role;
      const isCommander = role === "commander";
      const isRoot = userOrg.parent_id === null;

      if (isCommander) {
        // COMMANDER: See their org + descendants (full permissions)
        // Add the commander's org
        visibleOrgs.set(orgId, {
          org: orgMap.get(orgId),
          role,
          hasFullPermission: true,
          isContextOnly: false,
          userOrgData: userOrg,
        });

        // Add all descendants (full permissions)
        const descendants = getDescendants(orgId);
        for (const descId of descendants) {
          if (!visibleOrgs.has(descId) || visibleOrgs.get(descId)!.isContextOnly) {
            visibleOrgs.set(descId, {
              org: orgMap.get(descId),
              role: "commander", // Inherited commander permission
              hasFullPermission: true,
              isContextOnly: false,
            });
          }
        }

        // If not root commander, add root for context
        if (!isRoot) {
          const rootId = getRootId(orgId);
          if (!visibleOrgs.has(rootId) || visibleOrgs.get(rootId)!.isContextOnly) {
            visibleOrgs.set(rootId, {
              org: orgMap.get(rootId),
              role: "viewer", // Context only
              hasFullPermission: false,
              isContextOnly: true,
            });
          }

          // Add siblings for context
          const siblings = getSiblings(orgId);
          for (const siblingId of siblings) {
            if (!visibleOrgs.has(siblingId) || visibleOrgs.get(siblingId)!.isContextOnly) {
              visibleOrgs.set(siblingId, {
                org: orgMap.get(siblingId),
                role: "viewer", // Context only
                hasFullPermission: false,
                isContextOnly: true,
              });
            }
          }
        }
      } else {
        // MEMBER/VIEWER: See only their org + root for context
        visibleOrgs.set(orgId, {
          org: orgMap.get(orgId),
          role,
          hasFullPermission: false,
          isContextOnly: false,
          userOrgData: userOrg,
        });

        // Add root for context (if not already root)
        if (!isRoot) {
          const rootId = getRootId(orgId);
          if (!visibleOrgs.has(rootId) || visibleOrgs.get(rootId)!.isContextOnly) {
            visibleOrgs.set(rootId, {
              org: orgMap.get(rootId),
              role: "viewer",
              hasFullPermission: false,
              isContextOnly: true,
            });
          }
        }
      }
    }

    // Fetch child counts for all visible orgs in a single query
    const visibleOrgIds = Array.from(visibleOrgs.keys());
    const { data: childCounts, error: childCountsError } = await client
      .from("organizations")
      .select("parent_id")
      .in("parent_id", visibleOrgIds);

    if (childCountsError) throw new DatabaseError(childCountsError.message);

    // Create a map of parent_id -> count for O(1) lookup
    const childCountMap = (childCounts || []).reduce((acc, item) => {
      acc[item.parent_id] = (acc[item.parent_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Helper: Calculate depth and breadcrumb for any org
    const calculatePathInfo = (orgId: string): { depth: number; breadcrumb: string[] } => {
      const path: string[] = [];
      let current = orgMap.get(orgId);
      let depth = 0;

      while (current) {
        path.unshift(current.name);
        if (current.parent_id) {
          current = orgMap.get(current.parent_id);
          depth++;
        } else {
          break;
        }
      }

      return { depth, breadcrumb: path };
    };

    // Convert to FlatOrganization array
    const flattened: FlatOrganization[] = [];

    for (const [orgId, data] of visibleOrgs.entries()) {
      const { org, role, hasFullPermission, isContextOnly, userOrgData } = data;
      if (!org) continue;

      // Use userOrgData if available (has full_path), otherwise calculate
      let breadcrumb: string[];
      let depth: number;

      if (userOrgData) {
        breadcrumb = userOrgData.full_path
          .split(" / ")
          .map((s: string) => s.trim())
          .filter(Boolean);
        depth = userOrgData.depth;
      } else {
        const pathInfo = calculatePathInfo(orgId);
        breadcrumb = pathInfo.breadcrumb;
        depth = pathInfo.depth;
      }

      flattened.push({
        id: org.id,
        name: org.name,
        org_type: org.org_type,
        parent_id: org.parent_id,
        depth,
        role,
        isRoot: org.parent_id === null,
        breadcrumb,
        childCount: childCountMap[org.id] || 0,
        created_at: org.created_at || new Date().toISOString(),
        hasFullPermission,
        isContextOnly,
      });
    }

    // Sort: roots first, then by breadcrumb alphabetically
    return flattened.sort((a, b) => {
      if (a.isRoot && !b.isRoot) return -1;
      if (!a.isRoot && b.isRoot) return 1;
      return a.breadcrumb.join(" → ").localeCompare(b.breadcrumb.join(" → "));
    });
  }

  // ✅ Create root organization (RPC)
  static async createRootOrg(
    input: {
      name: string;
      orgType: string;
      description?: string;
    },
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("create_root_organization", {
      p_name: input.name,
      p_org_type: input.orgType,
      p_description: input.description || null,
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to create org: ${error.message}`);
    if (!data || data.length === 0)
      throw new Error("No data returned from create");

    return data[0];
  }

  // ✅ Create child organization (RPC)
  static async createChildOrg(
    input: {
      name: string;
      orgType: string;
      parentId: string;
      description?: string;
    },
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("create_child_organization", {
      p_name: input.name,
      p_org_type: input.orgType,
      p_parent_id: input.parentId,
      p_description: input.description || null,
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to create child org: ${error.message}`);
    if (!data || data.length === 0)
      throw new Error("No data returned from create");

    return data[0];
  }

  // ✅ Update organization (RPC)
  static async updateOrg(
    orgId: string,
    updates: Partial<Pick<Organization, "name" | "org_type" | "description">>,
    userId: string
  ): Promise<Organization> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("update_organization", {
      p_org_id: orgId,
      p_name: updates.name || null,
      p_org_type: updates.org_type || null,
      p_description: updates.description || null,
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to update org: ${error.message}`);
    if (!data || data.length === 0)
      throw new Error("No data returned from update");

    return data[0];
  }

  // ✅ Delete organization (RPC)
  static async deleteOrg(orgId: string, userId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("delete_organization", {
      p_org_id: orgId,
      p_user_id: userId,
    });

    if (error) throw new Error(`Failed to delete org: ${error.message}`);
  }

  // Get children of an organization
  static async getOrgChildren(orgId: string): Promise<any[]> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_org_children", {
      p_org_id: orgId,
    });

    if (error) throw new Error(`Failed to get org children: ${error.message}`);
    return data || [];
  }

  // Get full subtree
  static async getOrgSubtree(orgId: string): Promise<any[]> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_org_subtree", {
      p_org_id: orgId,
    });

    if (error) throw new Error(`Failed to get org subtree: ${error.message}`);
    return data || [];
  }

  // Get full tree as JSON
  static async getOrgTree(rootId: string): Promise<any[]> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_org_tree", {
      p_root_id: rootId,
    });

    if (error) throw new Error(`Failed to get org tree: ${error.message}`);
    return data || [];
  }

  // Add member to organization
  static async addMember(input: {
    orgId: string;
    userId: string;
    role: "commander" | "member" | "viewer";
  }): Promise<OrgMembership> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("org_memberships")
      .insert({
        org_id: input.orgId,
        user_id: input.userId,
        role: input.role,
      })
      .select()
      .single();

    if (error) throw new Error(`Failed to add member: ${error.message}`);
    return data;
  }

  // Remove member from organization
  static async removeMember(userId: string, orgId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();

    const { error } = await client
      .from("org_memberships")
      .delete()
      .eq("user_id", userId)
      .eq("org_id", orgId);

    if (error) throw new Error(`Failed to remove member: ${error.message}`);
  }

  // Update member role
  static async updateMemberRole(
    userId: string,
    orgId: string,
    role: "commander" | "member" | "viewer"
  ): Promise<OrgMembership> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client
      .from("org_memberships")
      .update({ role })
      .eq("user_id", userId)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error)
      throw new Error(`Failed to update member role: ${error.message}`);
    return data;
  }
}
