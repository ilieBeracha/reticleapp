// store/useWorkspaceStore.ts
import { createWorkspaceService, getUserWorkspacesService } from "@/services/workspaceService";
import { Workspace } from "@/types/workspace";
import { create } from "zustand";

interface WorkspaceStore {
  workspaces: Workspace[];
  loading: boolean;

  loadWorkspaces: (userId: string) => Promise<void>;
  createWorkspace: (name: string, description: string, userId: string) => Promise<void>;
  getActiveWorkspace: (activeWorkspaceId: string | null | undefined) => Workspace | null;
}

/**
 * ✨ SIMPLIFIED WORKSPACE STORE ✨
 * 
 * - Stores list of available workspaces
 * - Does NOT store activeWorkspace (source of truth is user.user_metadata)
 * - Provides helper to find workspace by ID
 * 
 * Why? To avoid sync issues between store and auth context!
 */
export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  loading: true,

  /**
   * Load all workspaces user is a member of
   */
  loadWorkspaces: async (userId: string) => {
    if (!userId) {
      set({ workspaces: [], loading: false });
      return;
    }

    const workspaces = await getUserWorkspacesService(userId);

    set({
      workspaces,
      loading: false,
    });
  },

  /**
   * Get active workspace by ID
   * Helper function - does not store state
   */
  getActiveWorkspace: (activeWorkspaceId: string | null | undefined) => {
    if (!activeWorkspaceId || activeWorkspaceId === "personal") {
      return null;
    }

    const list = get().workspaces;
    return list.find((w) => w.id === activeWorkspaceId) ?? null;
  },

  /**
   * Create a new organization workspace
   */
  createWorkspace: async (name: string, description: string, userId: string) => {
    if (!userId) return;

    const newWorkspace = await createWorkspaceService(name, description, userId);

    if (newWorkspace) {
      set((state) => ({
        workspaces: [...state.workspaces, newWorkspace],
      }));
    }
  },
}));
