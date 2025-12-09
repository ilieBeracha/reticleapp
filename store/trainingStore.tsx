import {
    getMyTrainings,
    getMyTrainingStats,
    getMyUpcomingTrainings,
    getTeamTrainings,
} from "@/services/trainingService";
import type { TrainingWithDetails } from "@/types/workspace";
import { create } from "zustand";
import { useTeamStore } from "./teamStore";

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
  
  // Team trainings (when in team mode)
  teamTrainings: TrainingWithDetails[];
  
  // Loading states
  loadingMyTrainings: boolean;
  loadingTeamTrainings: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  loadMyTrainings: () => Promise<void>;
  loadMyUpcomingTrainings: () => Promise<void>;
  loadMyStats: () => Promise<void>;
  loadTeamTrainings: (teamId?: string) => Promise<void>;
  refreshAll: () => Promise<void>;
  reset: () => void;
}

export const useTrainingStore = create<TrainingStore>((set, get) => ({
  myTrainings: [],
  myUpcomingTrainings: [],
  myStats: { upcoming: 0, completed: 0, total: 0 },
  teamTrainings: [],
  loadingMyTrainings: false,
  loadingTeamTrainings: false,
  error: null,

  loadMyTrainings: async () => {
    // Only show loading spinner on initial load, not refresh
    const isInitialLoad = get().myTrainings.length === 0;
    if (isInitialLoad) {
      set({ loadingMyTrainings: true, error: null });
    }
    
    try {
      const trainings = await getMyTrainings();
      set({ myTrainings: trainings, loadingMyTrainings: false });
    } catch (error: any) {
      console.error('Failed to load my trainings:', error);
      set({ error: error.message, loadingMyTrainings: false });
    }
  },

  loadMyUpcomingTrainings: async () => {
    // Only show loading spinner on initial load, not refresh
    const isInitialLoad = get().myUpcomingTrainings.length === 0;
    if (isInitialLoad) {
      set({ loadingMyTrainings: true, error: null });
    }
    
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

  loadTeamTrainings: async (teamId?: string) => {
    const activeTeamId = teamId || useTeamStore.getState().activeTeamId;
    
    if (!activeTeamId) {
      set({ teamTrainings: [], loadingTeamTrainings: false });
      return;
    }

    // Only show loading spinner on initial load, not refresh
    const isInitialLoad = get().teamTrainings.length === 0;
    if (isInitialLoad) {
      set({ loadingTeamTrainings: true, error: null });
    }
    
    try {
      const trainings = await getTeamTrainings(activeTeamId);
      set({ teamTrainings: trainings, loadingTeamTrainings: false });
    } catch (error: any) {
      console.error('Failed to load team trainings:', error);
      set({ error: error.message, loadingTeamTrainings: false });
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
    teamTrainings: [],
    loadingMyTrainings: false,
    loadingTeamTrainings: false,
    error: null,
  }),
}));

