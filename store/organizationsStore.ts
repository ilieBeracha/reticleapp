// stores/organizationsStore.ts
import { OrganizationsService, UserOrgContext } from "@/services/organizationsService";
import type {
  Organization,
  OrgChild,
  OrgMembership,
  UserOrg,
} from "@/types/organizations";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface OrganizationsStore {
  // Simplified state - user has ONE org
  userOrgContext: UserOrgContext | null;
  userOrgs: UserOrg[]; // All memberships (if user has multiple)
  selectedOrgId: string | null; // Current active org
  orgChildren: OrgChild[];
  loading: boolean;
  switching: boolean;
  error: string | null;
  memberships: OrgMembership[] | null;

  // Actions
  fetchUserContext: (userId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchUserOrgs: (userId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchOrgChildren: (orgId: string, options?: { silent?: boolean }) => Promise<void>;

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

  fetchMemberships: (orgId: string) => Promise<OrgMembership[] | null>;

  updateOrg: (
    orgId: string,
    updates: { name?: string; org_type?: string; description?: string },
    userId: string
  ) => Promise<Organization | null>;

  deleteOrg: (orgId: string, userId: string) => Promise<void>;

  assignCommander: (orgId: string, userId: string) => Promise<void>;

  addMember: (input: {
    orgId: string;
    userId: string;
    role: "commander" | "member" | "viewer";
  }) => Promise<void>;

  removeMember: (userId: string, orgId: string) => Promise<void>;

  switchOrganization: (orgId: string | null) => Promise<void>;
  setSelectedOrg: (orgId: string | null) => void;
  resetOrganizations: () => void;
}

export const useOrganizationsStore = create<OrganizationsStore>((set, get) => ({
  // Initial state - simplified
  userOrgContext: null,
  userOrgs: [],
  selectedOrgId: null,
  orgChildren: [],
  memberships: null,
  loading: false,
  switching: false,
  error: null,
  
  // Fetch user's organization context (primary org + permissions)
  fetchUserContext: async (userId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const userOrgContext = await OrganizationsService.getUserOrgContext(userId);
      set({ userOrgContext, loading: false });
    } catch (err: any) {
      console.error("Error fetching user context:", err);
      set({ error: err.message, userOrgContext: null, loading: false });
    }
  },

  // Fetch user's all organizations (for multi-org users)
  fetchUserOrgs: async (userId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const userOrgs = await OrganizationsService.getUserOrgs(userId);
      set({ userOrgs, loading: false });
    } catch (err: any) {
      console.error("Error fetching user orgs:", err);
      set({ error: err.message, userOrgs: [], loading: false });
    }
  },

  // Fetch children of an org
  fetchOrgChildren: async (orgId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const orgChildren = await OrganizationsService.getOrgChildren(orgId);
      set({ orgChildren, loading: false });
    } catch (err: any) {
      console.error("Error fetching org children:", err);
      set({ error: err.message, orgChildren: [], loading: false });
    }
  },


  fetchMemberships: async (orgId: string) => {
    try {
      const memberships = await OrganizationsService.getMemberships(orgId);
      set({ memberships, loading: false });
      return memberships || null;
    } catch (err: any) {
      console.error("Error fetching memberships:", err);
      set({ error: err.message, memberships: [], loading: false });
      return null;
    }
  },

  // Create root organization  
  createRootOrg: async (input, userId) => {
    try {
      const org = await OrganizationsService.createRootOrg(input, userId);

      // Refresh user context (now member of new org)
      await get().fetchUserContext(userId);
      await get().fetchUserOrgs(userId);

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

      // Refresh context and children
      await get().fetchUserContext(userId);
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
  updateOrg: async (orgId, updates, userId) => {
    try {
      const org = await OrganizationsService.updateOrg(orgId, updates, userId);

      // Refresh context if it's the user's org
      const context = get().userOrgContext;
      if (context && context.orgId === orgId) {
        await get().fetchUserContext(userId);
      }

      return org;
    } catch (err: any) {
      console.error("Error updating org:", err);
      throw err;
    }
  },

  // Delete organization
  deleteOrg: async (orgId, userId) => {
    try {
      await OrganizationsService.deleteOrg(orgId, userId);

      // Refresh context (user may have been removed)
      await get().fetchUserContext(userId);
      
      // If deleted org was selected, clear selection
      if (get().selectedOrgId === orgId) {
        set({ selectedOrgId: null });
        await AsyncStorage.setItem("selected_org_id", "");
      }
    } catch (err: any) {
      console.error("Error deleting org:", err);
      throw err;
    }
  },

  // Assign commander to organization
  assignCommander: async (orgId, userId) => {
    try {
      await OrganizationsService.assignCommander(orgId, userId);
      
      // Refresh memberships if viewing that org
      if (get().selectedOrgId === orgId) {
        await get().fetchMemberships(orgId);
      }
    } catch (err: any) {
      console.error("Error assigning commander:", err);
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

  // Switch to organization (simplified)
  switchOrganization: async (orgId: string | null) => {
    set({ selectedOrgId: orgId, switching: true });
    await AsyncStorage.setItem("selected_org_id", orgId || "");

    if (!orgId) {
      // Personal mode
      set({ switching: false });
      return;
    }

    try {
      // Fetch children for new org
      await get().fetchOrgChildren(orgId, { silent: true });
      set({ switching: false });
    } catch (error) {
      console.error("Error switching organization:", error);
      set({ switching: false });
    }
  },

  // Set selected organization (direct setter)
  setSelectedOrg: (orgId) => {
    set({ selectedOrgId: orgId });
    if (orgId) {
      get().fetchOrgChildren(orgId, { silent: true });
    }
  },

  // Reset state
  resetOrganizations: () => {
    set({
      userOrgContext: null,
      userOrgs: [],
      selectedOrgId: null,
      orgChildren: [],
      memberships: null,
      loading: false,
      switching: false,
      error: null,
    });
  },
}));
