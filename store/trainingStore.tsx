import {
    getMyTrainings,
    getMyTrainingStats,
    getMyUpcomingTrainings,
    getTeamTrainings,
} from "@/services/trainingService";
import type { TrainingWithDetails } from "@/types/workspace";
import { shouldShowInitialLoading } from "@/store/_shared/asyncState";
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
  
  // Initialization tracking
  myTrainingsInitialized: boolean;
  teamTrainingsInitialized: boolean;
  
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
  myTrainingsInitialized: false,
  teamTrainingsInitialized: false,
  error: null,

  loadMyTrainings: async () => {
    // Always show loading on first load
    const { myTrainingsInitialized } = get();
    if (shouldShowInitialLoading(myTrainingsInitialized)) {
      set({ loadingMyTrainings: true, error: null });
    }
    
    try {
      const trainings = await getMyTrainings();
      set({ 
        myTrainings: trainings, 
        loadingMyTrainings: false, 
        myTrainingsInitialized: true,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to load my trainings:', error);
      set({ error: error.message, loadingMyTrainings: false, myTrainingsInitialized: true });
      // DON'T clear data on error
    }
  },

  loadMyUpcomingTrainings: async () => {
    // Always show loading on first load
    const { myTrainingsInitialized } = get();
    if (shouldShowInitialLoading(myTrainingsInitialized)) {
      set({ loadingMyTrainings: true, error: null });
    }
    
    try {
      // Load more trainings for session selection (not just 5)
      const trainings = await getMyUpcomingTrainings(50);
      set({ 
        myUpcomingTrainings: trainings, 
        loadingMyTrainings: false,
        myTrainingsInitialized: true,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to load upcoming trainings:', error);
      set({ error: error.message, loadingMyTrainings: false, myTrainingsInitialized: true });
      // DON'T clear data on error
    }
  },

  loadMyStats: async () => {
    try {
      const stats = await getMyTrainingStats();
      set({ myStats: stats });
    } catch (error: any) {
      console.error('Failed to load training stats:', error);
      // DON'T clear stats on error
    }
  },

  loadTeamTrainings: async (teamId?: string) => {
    const activeTeamId = teamId || useTeamStore.getState().activeTeamId;
    
    if (!activeTeamId) {
      set({ teamTrainings: [], loadingTeamTrainings: false, teamTrainingsInitialized: true });
      return;
    }

    // Always show loading when switching teams or on first load
    set({ loadingTeamTrainings: true, error: null });
    
    try {
      const trainings = await getTeamTrainings(activeTeamId);
      set({ 
        teamTrainings: trainings, 
        loadingTeamTrainings: false,
        teamTrainingsInitialized: true,
        error: null,
      });
    } catch (error: any) {
      console.error('Failed to load team trainings:', error);
      set({ error: error.message, loadingTeamTrainings: false, teamTrainingsInitialized: true });
      // DON'T clear data on error
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
    myTrainingsInitialized: false,
    teamTrainingsInitialized: false,
    error: null,
  }),
}));

