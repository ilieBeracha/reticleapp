import { getPersonalSessions, getWorkspaceSessions, SessionWithDetails } from "@/services/sessionService";
import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface SessionStore {
  sessions: SessionWithDetails[];
  loading: boolean;
  error: string | null;
  loadPersonalSessions: () => Promise<void>;
  loadWorkspaceSessions: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,
  loadPersonalSessions: async () => {
    set({ loading: true, error: null });
    try {
      const sessions = await getPersonalSessions();
      console.log("🔍 Personal sessions:", sessions);
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  loadWorkspaceSessions: async () => {
    set({ loading: true, error: null });
    try {
      const workspaceId = useWorkspaceStore.getState().activeWorkspaceId;

      if (!workspaceId) {
        set({ sessions: [], loading: false });
        return;
      }

      const sessions = await getWorkspaceSessions(workspaceId);
      set({ sessions, loading: false });
    } catch (error: any) {
      set({ error: error.message, loading: false });
    }
  },
  reset: () => set({ sessions: [], loading: false, error: null }),
}));