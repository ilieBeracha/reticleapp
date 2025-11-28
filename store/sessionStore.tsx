import { createSession, CreateSessionParams, getSessions, getWorkspaceSessions, SessionWithDetails } from "@/services/sessionService";
import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface SessionStore {
  sessions: SessionWithDetails[];
  loading: boolean;
  error: string | null;
  loadWorkspaceSessions: () => Promise<void>;
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
    
    set({ loading: true, error: null });
    try {
      const sessions = await getSessions();
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  loadWorkspaceSessions: async () => {
    // Prevent duplicate loading
    if (get().loading) return;
    
    const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;

    if (!workspaceId) {
      set({ sessions: [], loading: false });
      return;
    }

    set({ loading: true, error: null });
    try {
      const sessions = await getWorkspaceSessions(workspaceId);
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  
  reset: () => set({ sessions: [], loading: false, error: null }),
}));
