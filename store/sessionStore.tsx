import { createSession, CreateSessionParams, getSessions, getTeamSessions, SessionWithDetails } from "@/services/sessionService";
import { create } from "zustand";
import { useTeamStore } from "./teamStore";

interface SessionStore {
  sessions: SessionWithDetails[];
  loading: boolean;
  error: string | null;
  loadTeamSessions: () => Promise<void>;
  loadSessions: () => Promise<void>;
  createSession: (session: CreateSessionParams) => Promise<SessionWithDetails>;
  reset: () => void;
}

/**
 * Session Store
 * 
 * OPTIMIZED:
 * - Store functions are stable references (zustand guarantees this)
 * - State updates are batched where possible
 * - Returns created session for chaining
 */
export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,
  
  createSession: async (params: CreateSessionParams) => {
    set({ loading: true, error: null });
    try {
      const newSession = await createSession(params);
      set(state => ({ 
        sessions: [newSession, ...state.sessions], 
        loading: false 
      }));
      return newSession;
    } catch (error: any) {
      set({ error: error.message, loading: false });
      throw error;
    }
  },
  
  loadSessions: async () => {
    // Prevent duplicate loading
    if (get().loading) return;
    
    // Only show loading spinner on initial load, not refresh
    const isInitialLoad = get().sessions.length === 0;
    if (isInitialLoad) {
      set({ loading: true, error: null });
    }
    
    try {
      const sessions = await getSessions();
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  loadTeamSessions: async () => {
    // Prevent duplicate loading
    if (get().loading) return;
    
    const teamId = useTeamStore.getState().activeTeamId;

    if (!teamId) {
      set({ sessions: [], loading: false });
      return;
    }

    // Only show loading spinner on initial load, not refresh
    const isInitialLoad = get().sessions.length === 0;
    if (isInitialLoad) {
      set({ loading: true, error: null });
    }
    
    try {
      const sessions = await getTeamSessions(teamId);
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  reset: () => set({ sessions: [], loading: false, error: null }),
}));
