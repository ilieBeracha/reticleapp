import {
  createSightService,
  deleteSightService,
  getSightsService,
  type CreateSightInput,
  type Sight,
} from "@/services/sightsService";
import { create } from "zustand";

interface SightsStore {
  sights: Sight[];
  loading: boolean;
  error: string | null;

  fetchSights: (orgId: string) => Promise<void>;
  createSight: (
    input: CreateSightInput,
    orgId: string,
    userId: string
  ) => Promise<void>;
  deleteSight: (sightId: string) => Promise<void>;
  resetSights: () => void;
}

export const sightsStore = create<SightsStore>((set) => ({
  sights: [],
  loading: false,
  error: null,

  fetchSights: async (orgId: string) => {
    try {
      set({ loading: true, error: null });
      const sights = await getSightsService(orgId);
      set({ sights, loading: false });
    } catch (err: any) {
      console.error("Error fetching sights:", err);
      set({ error: err.message, sights: [], loading: false });
    }
  },

  createSight: async (
    input: CreateSightInput,
    orgId: string,
    userId: string
  ) => {
    try {
      const newSight = await createSightService(input, orgId, userId);
      set((state) => ({
        sights: [newSight, ...state.sights],
      }));
    } catch (err: any) {
      console.error("Error creating sight:", err);
      throw err;
    }
  },

  deleteSight: async (sightId: string) => {
    try {
      await deleteSightService(sightId);
      set((state) => ({
        sights: state.sights.filter((s) => s.id !== sightId),
      }));
    } catch (err: any) {
      console.error("Error deleting sight:", err);
      throw err;
    }
  },

  resetSights: () => {
    set({ sights: [], loading: false, error: null });
  },
}));

