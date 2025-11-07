// stores/organizationsStore.ts
import { OrganizationsService } from "@/services/organizationsService";
import type {
  FlatOrganization,
  Organization,
  OrgChild,
  OrgMembership,
  OrgSubtree,
  OrgTreeNode,
  UserOrg,
} from "@/types/organizations";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

interface OrgCache {
  [orgId: string]: {
    data: Organization;
    timestamp: number;
  };
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

interface OrganizationsStore {
  // State
  userOrgs: UserOrg[];
  allOrgs: Organization[];
  accessibleOrgs: FlatOrganization[]; // ✅ NEW: Flattened orgs for switcher
  selectedOrgId: string | null;
  orgChildren: OrgChild[];
  orgSubtree: OrgSubtree[];
  orgTree: OrgTreeNode[];
  orgCache: OrgCache;
  loading: boolean;
  switching: boolean;
  error: string | null;
  memberships: OrgMembership[] | null;

  // Actions
  fetchUserOrgs: (userId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchAllOrgs: (userId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchAccessibleOrgs: (userId: string, options?: { silent?: boolean }) => Promise<void>; // ✅ NEW
  fetchOrgChildren: (orgId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchOrgSubtree: (orgId: string, options?: { silent?: boolean }) => Promise<void>;
  fetchOrgTree: (rootId: string, options?: { silent?: boolean }) => Promise<void>;

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

  addMember: (input: {
    orgId: string;
    userId: string;
    role: "commander" | "member" | "viewer";
  }) => Promise<void>;

  removeMember: (userId: string, orgId: string) => Promise<void>;

  switchOrganization: (orgId: string | null) => Promise<void>;
  setSelectedOrg: (orgId: string | null) => void;
  clearCache: () => void;
  resetOrganizations: () => void;
}

export const useOrganizationsStore = create<OrganizationsStore>((set, get) => ({
  // Initial state
  userOrgs: [],
  allOrgs: [],
  accessibleOrgs: [], // ✅ NEW: For organization switcher
  selectedOrgId: null,
  orgChildren: [],
  orgSubtree: [],
  orgTree: [],
  orgCache: {},
  memberships: null,
  loading: false,
  switching: false,
  error: null,
  
  // Fetch user's organizations (memberships)
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

  fetchAllOrgs: async (userId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const allOrgs = await OrganizationsService.getAllOrgs(userId);
      set({ allOrgs, loading: false });
    } catch (err: any) {
      console.error("Error fetching all orgs:", err);
      set({ error: err.message, allOrgs: [], loading: false });
    }
  },

  // ✅ NEW: Fetch accessible orgs with permissions (for org switcher)
  fetchAccessibleOrgs: async (userId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const accessibleOrgs = await OrganizationsService.getAllAccessibleOrganizations(userId);
      set({ accessibleOrgs, loading: false });
    } catch (err: any) {
      console.error("Error fetching accessible orgs:", err);
      set({ error: err.message, accessibleOrgs: [], loading: false });
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

  // Fetch subtree of an org
  fetchOrgSubtree: async (orgId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const orgSubtree = await OrganizationsService.getOrgSubtree(orgId);
      set({ orgSubtree, loading: false });
    } catch (err: any) {
      console.error("Error fetching org subtree:", err);
      set({ error: err.message, orgSubtree: [], loading: false });
    }
  },

  // Fetch full tree
  fetchOrgTree: async (rootId: string, options?: { silent?: boolean }) => {
    try {
      if (!options?.silent) set({ loading: true, error: null });
      const orgTree = await OrganizationsService.getOrgTree(rootId);
      set({ orgTree, loading: false });
    } catch (err: any) {
      console.error("Error fetching org tree:", err);
      set({ error: err.message, orgTree: [], loading: false });
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

      // Refresh data (cache auto-invalidated in service)
      await get().fetchUserOrgs(userId);
      await get().fetchAllOrgs(userId);
      await get().fetchAccessibleOrgs(userId, { silent: true }); // ✅ NEW: Refresh switcher data

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

      // Refresh data (cache auto-invalidated in service)
      await get().fetchAllOrgs(userId);
      await get().fetchAccessibleOrgs(userId, { silent: true }); // ✅ NEW: Refresh switcher data
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
      const org = await OrganizationsService.updateOrg(
        orgId,
        updates,
        userId
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
  deleteOrg: async (orgId, userId) => {
    try {
      await OrganizationsService.deleteOrg(orgId, userId);

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

  // Switch to organization with caching
  switchOrganization: async (orgId: string | null) => {
    const { orgCache } = get();

    // Store selection immediately
    set({ selectedOrgId: orgId, switching: true });
    await AsyncStorage.setItem("selected_org_id", orgId || "");

    if (!orgId) {
      // Personal mode - no data to fetch
      set({ switching: false });
      return;
    }

    try {
      // Check cache first
      const cached = orgCache[orgId];
      const now = Date.now();

      if (cached && now - cached.timestamp < CACHE_DURATION) {
        // Use cached data immediately
        console.log("📦 Using cached org data");
        set({ switching: false });

        // Silently fetch children
        get().fetchOrgChildren(orgId, { silent: true });
      } else {
        // Fetch fresh data (children already fetched via setSelectedOrg)
        console.log("🔄 Fetching fresh org data");
        await get().fetchOrgChildren(orgId, { silent: false });
        set({ switching: false });
      }
    } catch (error) {
      console.error("Error switching organization:", error);
      set({ switching: false });
    }
  },

  // Set selected organization (legacy support)
  setSelectedOrg: (orgId) => {
    set({ selectedOrgId: orgId });
    if (orgId) {
      // Silent fetch to avoid UI flicker while switching
      get().fetchOrgChildren(orgId, { silent: true });
    }
  },

  // Clear cache
  clearCache: () => {
    set({ orgCache: {} });
  },

  // Reset state
  resetOrganizations: () => {
    set({
      userOrgs: [],
      allOrgs: [],
      accessibleOrgs: [], // ✅ NEW
      selectedOrgId: null,
      orgChildren: [],
      orgSubtree: [],
      orgTree: [],
      orgCache: {},
      loading: false,
      switching: false,
      error: null,
      memberships: null,
    });
  },
}));
