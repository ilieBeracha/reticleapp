import {
  createSessionStatsService,
  deleteSessionStatsService,
  endSessionStatsService,
  getSessionStatsService,
  startSessionStatsService,
  updateSessionStatsService,
} from "@/services/sessionStatsService";
import {
  CreateSessionStatsInput,
  SessionStats,
  UpdateSessionStatsInput,
} from "@/types/database";
import { create } from "zustand";

interface SessionStatsStore {
  sessionStats: SessionStats[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSessionStats: (
    token: string,
    userId: string,
    orgId?: string | null,
    trainingId?: string
  ) => Promise<void>;
  createSessionStats: (
    token: string,
    input: CreateSessionStatsInput,
    userId: string,
    orgId: string | null
  ) => Promise<SessionStats | null>;
  updateSessionStats: (
    token: string,
    sessionStatsId: string,
    input: UpdateSessionStatsInput
  ) => Promise<SessionStats | null>;
  deleteSessionStats: (token: string, sessionStatsId: string) => Promise<void>;
  startSession: (token: string, sessionStatsId: string) => Promise<void>;
  endSession: (token: string, sessionStatsId: string) => Promise<void>;
  resetSessionStats: () => void;
}

export const sessionStatsStore = create<SessionStatsStore>((set, get) => ({
  sessionStats: [],
  loading: false,
  error: null,

  fetchSessionStats: async (
    token: string,
    userId: string,
    orgId?: string | null,
    trainingId?: string
  ) => {
    try {
      set({ loading: true, error: null });

      const sessionStats = await getSessionStatsService(
        token,
        userId,
        orgId,
        trainingId
      );

      set({ sessionStats, loading: false });
    } catch (err: any) {
      console.error("Error fetching session stats:", err);
      set({ error: err.message, sessionStats: [], loading: false });
    }
  },

  createSessionStats: async (
    token: string,
    input: CreateSessionStatsInput,
    userId: string,
    orgId: string | null
  ) => {
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      const sessionStats = await createSessionStatsService(
        token,
        input,
        userId,
        orgId
      );
      console.log("sessionStats", sessionStats);
      // Add new session stats to the beginning of the list
      set((state) => ({
        sessionStats: [sessionStats, ...state.sessionStats],
      }));

      return sessionStats;
    } catch (err: any) {
      console.error("Error creating session stats:", err);
      throw err;
    }
  },

  updateSessionStats: async (
    token: string,
    sessionStatsId: string,
    input: UpdateSessionStatsInput
  ) => {
    try {
      const sessionStats = await updateSessionStatsService(
        token,
        sessionStatsId,
        input
      );

      // Update session stats in the list
      set((state) => ({
        sessionStats: state.sessionStats.map((s) =>
          s.id === sessionStatsId ? sessionStats : s
        ),
      }));

      return sessionStats;
    } catch (err: any) {
      console.error("Error updating session stats:", err);
      throw err;
    }
  },

  deleteSessionStats: async (token: string, sessionStatsId: string) => {
    try {
      await deleteSessionStatsService(token, sessionStatsId);

      // Remove session stats from the list
      set((state) => ({
        sessionStats: state.sessionStats.filter(
          (stats) => stats.id !== sessionStatsId
        ),
      }));
    } catch (err: any) {
      console.error("Error deleting session stats:", err);
      throw err;
    }
  },

  startSession: async (token: string, sessionStatsId: string) => {
    try {
      const updatedStats = await startSessionStatsService(
        token,
        sessionStatsId
      );

      // Update session stats in the list
      set((state) => ({
        sessionStats: state.sessionStats.map((s) =>
          s.id === sessionStatsId ? updatedStats : s
        ),
      }));
    } catch (err: any) {
      console.error("Error starting session:", err);
      throw err;
    }
  },

  endSession: async (token: string, sessionStatsId: string) => {
    try {
      const updatedStats = await endSessionStatsService(token, sessionStatsId);

      // Update session stats in the list
      set((state) => ({
        sessionStats: state.sessionStats.map((s) =>
          s.id === sessionStatsId ? updatedStats : s
        ),
      }));
    } catch (err: any) {
      console.error("Error ending session:", err);
      throw err;
    }
  },

  resetSessionStats: () => {
    set({ sessionStats: [], loading: false, error: null });
  },
}));
