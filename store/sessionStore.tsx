import { getWorkspaceSessions, SessionWithDetails } from "@/services/sessionService";
import { create } from "zustand";
import { useWorkspaceStore } from "./useWorkspaceStore";

interface SessionStore {
  sessions: SessionWithDetails[];
  loading: boolean;
  error: string | null;
  loadWorkspaceSessions: () => Promise<void>;
  reset: () => void;
}

export const useSessionStore = create<SessionStore>((set, get) => ({
  sessions: [],
  loading: false,
  error: null,
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