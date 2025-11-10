// services/organizationsService.ts
import { AuthenticatedClient, DatabaseError } from "@/lib/authenticatedClient";
import OrgCache from "@/lib/orgCache";
import type {
  Organization,
  OrgMembership,
  UserOrg,
} from "@/types/organizations";

// New simplified org context type
export interface UserOrgContext {
  // Membership
  membershipId: string;
  userId: string;
  orgId: string;
  role: "commander" | "member" | "viewer";
  joinedAt: string;
  
  // Organization
  orgName: string;
  orgType: string;
  orgDepth: number;
  orgParentId: string | null;
  orgRootId: string;
  orgPath: string[];
  fullPath: string;
  
  // Computed permissions
  canCreateChild: boolean;
  canManageMembers: boolean;
  canManageOrg: boolean;
  scopeOrgIds: string[]; // Org IDs user has access to
}

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
   * Get user's organization context with computed permissions
   * 
   * **Simplified Model:**
   * - Returns user's PRIMARY org (their direct membership)
   * - Includes computed scope array (org IDs they have access to)
   * - Permissions flow from role + org position
   * 
   * **Single RPC call** - no recursive fetching
   * 
   * @param userId - User ID to get context for
   * @returns User's org context with permissions, or null if no membership
   */
  static async getUserOrgContext(userId: string): Promise<UserOrgContext | null> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_user_org_with_permissions", {
      p_user_id: userId,
    });

    if (error) throw new DatabaseError(`Failed to get user org context: ${error.message}`);
    
    if (!data || data.length === 0) {
      return null; // User has no org memberships
    }

    const row = data[0];
    
    return {
      membershipId: row.membership_id,
      userId: row.user_id,
      orgId: row.org_id,
      role: row.role as "commander" | "member" | "viewer",
      joinedAt: row.joined_at,
      orgName: row.org_name,
      orgType: row.org_type,
      orgDepth: row.org_depth,
      orgParentId: row.org_parent_id,
      orgRootId: row.org_root_id,
      orgPath: row.org_path,
      fullPath: row.full_path,
      canCreateChild: row.can_create_child,
      canManageMembers: row.can_manage_members,
      canManageOrg: row.can_manage_org,
      scopeOrgIds: row.scope_org_ids,
    };
  }

  /**
   * Assign a user as commander of an organization
   * 
   * **Validation:**
   * - Only one commander per org (enforced)
   * - Only commanders in same tree can assign
   * 
   * @param orgId - Organization ID
   * @param userId - User ID to make commander
   */
  static async assignCommander(orgId: string, userId: string): Promise<void> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("assign_commander", {
      p_org_id: orgId,
      p_user_id: userId,
    });

    if (error) throw new DatabaseError(`Failed to assign commander: ${error.message}`);
    
    // Invalidate cache
    OrgCache.invalidateUser(userId);
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

    // Invalidate cache after mutation
    OrgCache.invalidateUser(userId);

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

    // Invalidate cache after mutation
    OrgCache.invalidateUser(userId);

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

    // Invalidate cache after mutation
    OrgCache.invalidateUser(userId);

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

    // Invalidate cache after mutation
    OrgCache.invalidateUser(userId);
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

  /**
   * Get all members in user's permission scope
   * 
   * **Simplified:**
   * - Commanders: Get members in their org + descendants
   * - Members: Get members in their org only
   * 
   * Uses single RPC call with automatic permission scoping
   * 
   * @param userId - User ID (optional, defaults to current user)
   * @returns Array of users in scope
   */
  static async getMembersInScope(userId?: string): Promise<Array<{
    userId: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    orgId: string;
    orgName: string;
    orgDepth: number;
    role: "commander" | "member" | "viewer";
  }>> {
    const client = await AuthenticatedClient.getClient();

    const { data, error } = await client.rpc("get_members_in_user_scope", {
      p_user_id: userId || null,
    });

    if (error) throw new DatabaseError(`Failed to get members in scope: ${error.message}`);

    return (data || []).map((row: any) => ({
      userId: row.user_id,
      email: row.email,
      fullName: row.full_name,
      avatarUrl: row.avatar_url,
      orgId: row.org_id,
      orgName: row.org_name,
      orgDepth: row.org_depth,
      role: row.role as "commander" | "member" | "viewer",
    }));
  }
}
