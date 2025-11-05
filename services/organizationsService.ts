// services/organizationsService.ts
import { AuthenticatedClient } from "@/lib/authenticatedClient";
import type {
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
    console.log(data)
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
