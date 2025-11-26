import {
  getMyTrainings,
  getMyTrainingStats,
  getMyUpcomingTrainings,
  getOrgTrainings,
} from "@/services/trainingService";
import type { TrainingWithDetails } from "@/types/workspace";
import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface TrainingStats {
  upcoming: number;
  completed: number;
  total: number;
}

interface TrainingStore {
  // All user trainings (personal view)
  myTrainings: TrainingWithDetails[];
  myUpcomingTrainings: TrainingWithDetails[];
  myStats: TrainingStats;
  
  // Org trainings (when in org mode)
  orgTrainings: TrainingWithDetails[];
  
  // Loading states
  loadingMyTrainings: boolean;
  loadingOrgTrainings: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  loadMyTrainings: () => Promise<void>;
  loadMyUpcomingTrainings: () => Promise<void>;
  loadMyStats: () => Promise<void>;
  loadOrgTrainings: (orgId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  reset: () => void;
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  myTrainings: [],
  myUpcomingTrainings: [],
  myStats: { upcoming: 0, completed: 0, total: 0 },
  orgTrainings: [],
  loadingMyTrainings: false,
  loadingOrgTrainings: false,
  error: null,

  loadMyTrainings: async () => {
    set({ loadingMyTrainings: true, error: null });
    try {
      const trainings = await getMyTrainings();
      set({ myTrainings: trainings, loadingMyTrainings: false });
    } catch (error: any) {
      console.error('Failed to load my trainings:', error);
      set({ error: error.message, loadingMyTrainings: false });
    }
  },

  loadMyUpcomingTrainings: async () => {
    set({ loadingMyTrainings: true, error: null });
    try {
      const trainings = await getMyUpcomingTrainings(5);
      set({ myUpcomingTrainings: trainings, loadingMyTrainings: false });
    } catch (error: any) {
      console.error('Failed to load upcoming trainings:', error);
      set({ error: error.message, loadingMyTrainings: false });
    }
  },

  loadMyStats: async () => {
    try {
      const stats = await getMyTrainingStats();
      set({ myStats: stats });
    } catch (error: any) {
      console.error('Failed to load training stats:', error);
    }
  },

  loadOrgTrainings: async (orgId?: string) => {
    const workspaceId = orgId || useWorkspaceStore.getState().activeWorkspaceId;
    
    if (!workspaceId) {
      set({ orgTrainings: [], loadingOrgTrainings: false });
      return;
    }

    set({ loadingOrgTrainings: true, error: null });
    try {
      const trainings = await getOrgTrainings(workspaceId);
      set({ orgTrainings: trainings, loadingOrgTrainings: false });
    } catch (error: any) {
      console.error('Failed to load org trainings:', error);
      set({ error: error.message, loadingOrgTrainings: false });
    }
  },

  refreshAll: async () => {
    const { loadMyTrainings, loadMyUpcomingTrainings, loadMyStats } = get();
    await Promise.all([
      loadMyTrainings(),
      loadMyUpcomingTrainings(),
      loadMyStats(),
    ]);
  },

  reset: () => set({
    myTrainings: [],
    myUpcomingTrainings: [],
    myStats: { upcoming: 0, completed: 0, total: 0 },
    orgTrainings: [],
    loadingMyTrainings: false,
    loadingOrgTrainings: false,
    error: null,
  }),
}));

