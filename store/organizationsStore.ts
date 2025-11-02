// stores/organizationsStore.ts
import { OrganizationsService } from "@/services/organizationsService";
import type {
  Organization,
  OrgChild,
  OrgSubtree,
  OrgTreeNode,
  UserOrg,
} from "@/types/organizations";
import { useAuth } from "@clerk/clerk-expo";
import { create } from "zustand";

interface OrganizationsStore {
  // State
  userOrgs: UserOrg[];
  allOrgs: Organization[];
  selectedOrgId: string | null;
  orgChildren: OrgChild[];
  orgSubtree: OrgSubtree[];
  orgTree: OrgTreeNode[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchUserOrgs: (userId: string) => Promise<void>;
  fetchAllOrgs: (userId: string) => Promise<void>;
  fetchOrgChildren: (orgId: string) => Promise<void>;
  fetchOrgSubtree: (orgId: string) => Promise<void>;
  fetchOrgTree: (rootId: string) => Promise<void>;
  getUserId: () => string;

  createRootOrg: (
    input: { name: string; orgType: string; description?: string },
    userId: string
  ) => Promise<Organization | null>;

  createChildOrg: (
    input: {
      name: string;
      orgType: string;
      parentId: string;
      description?: string;
    },
    userId: string
  ) => Promise<Organization | null>;

  updateOrg: (
    orgId: string,
    updates: { name?: string; org_type?: string; description?: string }
  ) => Promise<Organization | null>;

  deleteOrg: (orgId: string) => Promise<void>;

  addMember: (input: {
    orgId: string;
    userId: string;
    role: "commander" | "member" | "viewer";
  }) => Promise<void>;

  removeMember: (userId: string, orgId: string) => Promise<void>;

  setSelectedOrg: (orgId: string | null) => void;
  resetOrganizations: () => void;
}

export const useOrganizationsStore = create<OrganizationsStore>((set, get) => ({
  // Initial state
  userOrgs: [],
  allOrgs: [],
  selectedOrgId: null,
  orgChildren: [],
  orgSubtree: [],
  orgTree: [],
  loading: false,
  error: null,
  getUserId: () => {
    const { userId } = useAuth();
    if (!userId) throw new Error("Not authenticated");
    return userId;
  },
  // Fetch user's organizations (memberships)
  fetchUserOrgs: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const userOrgs = await OrganizationsService.getUserOrgs(userId);
      set({ userOrgs, loading: false });
    } catch (err: any) {
      console.error("Error fetching user orgs:", err);
      set({ error: err.message, userOrgs: [], loading: false });
    }
  },

  fetchAllOrgs: async (userId: string) => {
    try {
      set({ loading: true, error: null });
      const allOrgs = await OrganizationsService.getAllOrgs(userId);
      set({ allOrgs, loading: false });
    } catch (err: any) {
      console.error("Error fetching all orgs:", err);
      set({ error: err.message, allOrgs: [], loading: false });
    }
  },

  // Fetch children of an org
  fetchOrgChildren: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const orgChildren = await OrganizationsService.getOrgChildren(orgId);
      set({ orgChildren, loading: false });
    } catch (err: any) {
      console.error("Error fetching org children:", err);
      set({ error: err.message, orgChildren: [], loading: false });
    }
  },

  // Fetch subtree of an org
  fetchOrgSubtree: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const orgSubtree = await OrganizationsService.getOrgSubtree(orgId);
      set({ orgSubtree, loading: false });
    } catch (err: any) {
      console.error("Error fetching org subtree:", err);
      set({ error: err.message, orgSubtree: [], loading: false });
    }
  },

  // Fetch full tree
  fetchOrgTree: async (rootId: string) => {
    try {
      set({ loading: true, error: null });
      const orgTree = await OrganizationsService.getOrgTree(rootId);
      set({ orgTree, loading: false });
    } catch (err: any) {
      console.error("Error fetching org tree:", err);
      set({ error: err.message, orgTree: [], loading: false });
    }
  },

  // Create root organization
  createRootOrg: async (input, userId) => {
    try {
      const org = await OrganizationsService.createRootOrg(input, userId);

      // Refresh data
      await get().fetchUserOrgs(userId);
      await get().fetchAllOrgs(userId);

      return org;
    } catch (err: any) {
      console.error("Error creating root org:", err);
      throw err;
    }
  },

  // Create child organization
  createChildOrg: async (input, userId) => {
    try {
      const org = await OrganizationsService.createChildOrg(input, userId);

      // Refresh data
      await get().fetchAllOrgs(userId);
      if (get().selectedOrgId) {
        await get().fetchOrgChildren(get().selectedOrgId!);
      }

      return org;
    } catch (err: any) {
      console.error("Error creating child org:", err);
      throw err;
    }
  },

  // Update organization
  updateOrg: async (orgId, updates) => {
    try {
      const org = await OrganizationsService.updateOrg(
        orgId,
        updates,
        get().getUserId()
      );

      // Update in local state
      set((state) => ({
        allOrgs: state.allOrgs.map((o) => (o.id === orgId ? org : o)),
        userOrgs: state.userOrgs.map((uo) =>
          uo.org_id === orgId
            ? {
                ...uo,
                org_name: updates.name || uo.org_name,
                org_type: updates.org_type || uo.org_type,
              }
            : uo
        ),
      }));

      return org;
    } catch (err: any) {
      console.error("Error updating org:", err);
      throw err;
    }
  },

  // Delete organization
  deleteOrg: async (orgId) => {
    try {
      await OrganizationsService.deleteOrg(orgId, get().getUserId());

      // Remove from local state
      set((state) => ({
        allOrgs: state.allOrgs.filter((o) => o.id !== orgId),
        userOrgs: state.userOrgs.filter((uo) => uo.org_id !== orgId),
        selectedOrgId:
          state.selectedOrgId === orgId ? null : state.selectedOrgId,
      }));
    } catch (err: any) {
      console.error("Error deleting org:", err);
      throw err;
    }
  },

  // Add member to organization
  addMember: async (input) => {
    try {
      await OrganizationsService.addMember(input);

      // Refresh children if viewing that org
      if (get().selectedOrgId === input.orgId) {
        await get().fetchOrgChildren(input.orgId);
      }
    } catch (err: any) {
      console.error("Error adding member:", err);
      throw err;
    }
  },

  // Remove member from organization
  removeMember: async (userId, orgId) => {
    try {
      await OrganizationsService.removeMember(userId, orgId);

      // Refresh children if viewing that org
      if (get().selectedOrgId === orgId) {
        await get().fetchOrgChildren(orgId);
      }
    } catch (err: any) {
      console.error("Error removing member:", err);
      throw err;
    }
  },

  // Set selected organization
  setSelectedOrg: (orgId) => {
    set({ selectedOrgId: orgId });
    if (orgId) {
      get().fetchOrgChildren(orgId);
    }
  },

  // Reset state
  resetOrganizations: () => {
    set({
      userOrgs: [],
      allOrgs: [],
      selectedOrgId: null,
      orgChildren: [],
      orgSubtree: [],
      orgTree: [],
      loading: false,
      error: null,
    });
  },
}));
