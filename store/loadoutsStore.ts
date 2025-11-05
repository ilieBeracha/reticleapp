import {
  createLoadoutService,
  deleteLoadoutService,
  getLoadoutsService,
  updateLoadoutService,
} from "@/services/loadoutsService";
import {
  CreateLoadoutInput,
  LoadoutWithDetails,
  UpdateLoadoutInput,
} from "@/types/database";
import { create } from "zustand";

interface LoadoutsStore {
  loadouts: LoadoutWithDetails[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchLoadouts: (userId: string, orgId?: string | null) => Promise<void>;
  createLoadout: (
    input: CreateLoadoutInput,
    userId: string,
    orgId: string | null
  ) => Promise<void>;
  updateLoadout: (
    loadoutId: string,
    input: UpdateLoadoutInput
  ) => Promise<void>;
  deleteLoadout: (loadoutId: string) => Promise<void>;
  resetLoadouts: () => void;
}

export const loadoutsStore = create<LoadoutsStore>((set) => ({
  loadouts: [],
  loading: false,
  error: null,

  fetchLoadouts: async (userId: string, orgId?: string | null) => {
    try {
      set({ loading: true, error: null });

      const loadouts = await getLoadoutsService(userId, orgId);

      set({ loadouts, loading: false });
    } catch (err: any) {
      console.error("Error fetching loadouts:", err);
      set({ error: err.message, loadouts: [], loading: false });
    }
  },

  createLoadout: async (
    input: CreateLoadoutInput,
    userId: string,
    orgId: string | null
  ) => {
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      await createLoadoutService(input, userId, orgId);

      // Refetch loadouts after creation
      const loadouts = await getLoadoutsService(userId, orgId);
      set({ loadouts });
    } catch (err: any) {
      console.error("Error creating loadout:", err);
      throw err;
    }
  },

  updateLoadout: async (loadoutId: string, input: UpdateLoadoutInput) => {
    try {
      await updateLoadoutService(loadoutId, input);

      // Update loadout in the list (optimistic update)
      set((state) => ({
        loadouts: state.loadouts.map((loadout) =>
          loadout.id === loadoutId ? { ...loadout, ...input } : loadout
        ),
      }));
    } catch (err: any) {
      console.error("Error updating loadout:", err);
      throw err;
    }
  },

  deleteLoadout: async (loadoutId: string) => {
    try {
      await deleteLoadoutService(loadoutId);

      // Remove loadout from the list
      set((state) => ({
        loadouts: state.loadouts.filter((loadout) => loadout.id !== loadoutId),
      }));
    } catch (err: any) {
      console.error("Error deleting loadout:", err);
      throw err;
    }
  },

  resetLoadouts: () => {
    set({ loadouts: [], loading: false, error: null });
  },
}));

