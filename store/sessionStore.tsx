import { createSession, CreateSessionParams, getSessions, getTeamSessions, SessionWithDetails } from "@/services/sessionService";
import { create } from "zustand";
import { useTeamStore } from "./teamStore";

interface SessionStore {
  sessions: SessionWithDetails[];
  loading: boolean;
  initialized: boolean;
  error: string | null;
  loadPersonalSessions: () => Promise<void>;
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
  initialized: false,
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
    
    // Always show loading on first load
    const { initialized } = get();
    if (!initialized) {
      set({ loading: true, error: null });
    }
    
    try {
      const sessions = await getSessions();
      set({ sessions, loading: false, initialized: true, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false, initialized: true });
      // DON'T clear sessions on error - keep stale data
    }
  },
  
  loadPersonalSessions: async () => {
    // Prevent duplicate loading
    if (get().loading) return;
    
    // Always show loading on first load
    const { initialized } = get();
    if (!initialized) {
      set({ loading: true, error: null });
    }
    
    try {
      // Pass null to get ONLY personal sessions (no team_id)
      const sessions = await getSessions(null);
      set({ sessions, loading: false, initialized: true, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false, initialized: true });
    }
  },
  
  loadTeamSessions: async () => {
    // Prevent duplicate loading
    if (get().loading) return;
    
    const teamId = useTeamStore.getState().activeTeamId;

    if (!teamId) {
      set({ sessions: [], loading: false, initialized: true });
      return;
    }

    // Always show loading on first load
    const { initialized } = get();
    if (!initialized) {
      set({ loading: true, error: null });
    }
    
    try {
      const sessions = await getTeamSessions(teamId);
      set({ sessions, loading: false, initialized: true, error: null });
    } catch (error: any) {
      set({ error: error.message, loading: false, initialized: true });
      // DON'T clear sessions on error
    }
  },
  
  reset: () => set({ sessions: [], loading: false, initialized: false, error: null }),
}));
