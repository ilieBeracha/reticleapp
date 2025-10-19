import {
  createSessionService,
  deleteSessionService,
  getSessionsService,
  updateSessionService,
} from "@/services/sessionService";
import {
  CreateSessionInput,
  Session,
  UpdateSessionInput,
} from "@/types/database";
import { create } from "zustand";

interface SessionsStore {
  sessions: Session[];
  loading: boolean;
  error: string | null;

  // Actions
  fetchSessions: (
    token: string,
    userId: string,
    orgId?: string | null,
    trainingId?: string
  ) => Promise<void>;
  createSession: (
    token: string,
    input: CreateSessionInput,
    userId: string,
    orgId: string
  ) => Promise<Session | null>;
  updateSession: (
    token: string,
    sessionId: string,
    input: UpdateSessionInput
  ) => Promise<Session | null>;
  deleteSession: (token: string, sessionId: string) => Promise<void>;
  resetSessions: () => void;
}

export const sessionsStore = create<SessionsStore>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,

  fetchSessions: async (
    token: string,
    userId: string,
    orgId?: string | null,
    trainingId?: string
  ) => {
    try {
      set({ loading: true, error: null });

      const sessions = await getSessionsService(
        token,
        userId,
        orgId,
        trainingId
      );

      set({ sessions, loading: false });
    } catch (err: any) {
      console.error("Error fetching sessions:", err);
      set({ error: err.message, sessions: [], loading: false });
    }
  },

  createSession: async (
    token: string,
    input: CreateSessionInput,
    userId: string,
    orgId: string
  ) => {
    if (!userId) {
      throw new Error("Not authenticated");
    }

    try {
      const session = await createSessionService(token, input, userId, orgId);

      // Add new session to the beginning of the list
      set((state) => ({
        sessions: [session, ...state.sessions],
      }));

      return session;
    } catch (err: any) {
      console.error("Error creating session:", err);
      throw err;
    }
  },

  updateSession: async (
    token: string,
    sessionId: string,
    input: UpdateSessionInput
  ) => {
    try {
      const session = await updateSessionService(token, sessionId, input);

      // Update session in the list
      set((state) => ({
        sessions: state.sessions.map((s) => (s.id === sessionId ? session : s)),
      }));

      return session;
    } catch (err: any) {
      console.error("Error updating session:", err);
      throw err;
    }
  },

  deleteSession: async (token: string, sessionId: string) => {
    try {
      await deleteSessionService(token, sessionId);

      // Remove session from the list
      set((state) => ({
        sessions: state.sessions.filter((session) => session.id !== sessionId),
      }));
    } catch (err: any) {
      console.error("Error deleting session:", err);
      throw err;
    }
  },

  resetSessions: () => {
    set({ sessions: [], loading: false, error: null });
  },
}));
