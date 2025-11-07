// store/sessionStatsStore.ts
import {
  createSessionStats,
  CreateSessionStatsInput,
  deleteSessionStats,
  getSessionStats,
  SessionStats,
  updateSessionStats,
  UpdateSessionStatsInput,
} from "@/services/sessionService";
import { create } from "zustand";

interface SessionStatsStore {
  sessions: SessionStats[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSessions: (userId: string, orgId?: string | null, userOrgIds?: string[]) => Promise<void>;
  createSession: (
    input: CreateSessionStatsInput,
    userId: string
  ) => Promise<SessionStats>;
  updateSession: (
    sessionId: string,
    input: UpdateSessionStatsInput
  ) => Promise<SessionStats>;
  deleteSession: (sessionId: string) => Promise<void>;
  resetSessions: () => void;
}

export const sessionStatsStore = create<SessionStatsStore>((set) => ({
  sessions: [],
  loading: false,
  error: null,

  fetchSessions: async (userId: string, orgId?: string | null, userOrgIds?: string[]) => {
    try {
      set({ loading: true, error: null });

      const sessions = await getSessionStats(userId, orgId, userOrgIds);

      set({ sessions, loading: false });
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      set({ error: err.message, sessions: [], loading: false });
    }
  },

  createSession: async (input: CreateSessionStatsInput, userId: string) => {
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      const session = await createSessionStats(input, userId);
      console.log("Created session:", session);

      // Add new session to the beginning of the list
      set((state) => ({
        sessions: [session, ...state.sessions],
      }));

      return session;
    } catch (err: any) {
      console.error("Error creating session:", err);
      set({ error: err.message });
      throw err;
    }
  },

  updateSession: async (sessionId: string, input: UpdateSessionStatsInput) => {
    try {
      const session = await updateSessionStats(sessionId, input);

      // Update session in the list
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
      }));

      return session;
    } catch (err: any) {
      console.error("Error updating session:", err);
      set({ error: err.message });
      throw err;
    }
  },

  deleteSession: async (sessionId: string) => {
    try {
      await deleteSessionStats(sessionId);

      // Remove session from the list
      set((state) => ({
        sessions: state.sessions.filter((s) => s.id !== sessionId),
      }));
    } catch (err: any) {
      console.error("Error deleting session:", err);
      set({ error: err.message });
      throw err;
    }
  },

  resetSessions: () => {
    set({ sessions: [], loading: false, error: null });
  },
}));