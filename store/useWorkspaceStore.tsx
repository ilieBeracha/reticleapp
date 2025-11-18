// store/useWorkspaceStore.ts
import {
  getAccessibleWorkspaces,
  getMyWorkspace,
  getWorkspaceMembers,
  updateMyWorkspace
} from "@/services/workspaceService";
import { Workspace, WorkspaceAccess } from "@/types/workspace";
import { create } from "zustand";

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;  // Currently viewing workspace
  loading: boolean;
  error: string | null;
  workspaceMembers: (WorkspaceAccess & { profile?: any })[];
  loadWorkspaceMembers: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string | null) => void;
  updateWorkspace: (input: {
    workspace_name?: string;
    full_name?: string;
    avatar_url?: string;
  }) => Promise<void>;
  reset: () => void;
}

/**
 * ✨ SIMPLIFIED WORKSPACE STORE ✨
 * 
 * Simplified Model: User = Workspace
 * - Each user's profile IS their workspace
 * - Can view own workspace or other workspaces they have access to
 * - activeWorkspaceId tracks which workspace is currently being viewed
 * 
 * Source of truth:
 * - workspaces: list of accessible workspaces (mine + others I have access to)
 * - activeWorkspaceId: currently viewing workspace ID (defaults to my workspace)
 */
export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: true,
  error: null,
  workspaceMembers: [],
  /**
   * Load all workspaces user has access to
   * Includes: their own workspace + any workspaces they have been granted access to
   */
  loadWorkspaces: async () => {
    try {
      set({ loading: true, error: null });
      
      // Check if user is authenticated first
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log("📦 Workspace Store: User not authenticated yet, skipping load");
        set({ loading: false, workspaces: [], activeWorkspaceId: null });
        return;
      }
      
      const workspaces = await getAccessibleWorkspaces();
      
      // Set active workspace to user's own workspace by default
      const myWorkspace = await getMyWorkspace();
      
      set({
        workspaces,
        activeWorkspaceId: myWorkspace?.id || null,
        loading: false,
      });
    } catch (error: any) {
      console.error("Failed to load workspaces:", error);
      set({ 
        error: error.message, 
        loading: false,
        workspaces: [],
        activeWorkspaceId: null
      });
    }
  },

  loadWorkspaceMembers: async () => {
    const { activeWorkspaceId, workspaces } = get();
    if (!activeWorkspaceId) return;
    
    // Only load members for organization workspaces
    const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
    if (!activeWorkspace || activeWorkspace.workspace_type !== 'org') {
      set({ workspaceMembers: [] });
      return;
    }
    
    try {
      const members = await getWorkspaceMembers(activeWorkspaceId);
      set({ workspaceMembers: members });
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  },  

  /**
   * Set which workspace is currently active (viewing)
   */
  setActiveWorkspace: (workspaceId: string | null) => {
    console.log('🔄 Setting active workspace:', workspaceId);
    set({ activeWorkspaceId: workspaceId });
  },

  /**
   * Update my workspace (profile)
   */
  updateWorkspace: async (input: {
    workspace_name?: string;
    full_name?: string;
    avatar_url?: string;
  }) => {
    try {
      set({ loading: true, error: null });
      
      const updated = await updateMyWorkspace(input);
      
      // Update in workspaces list
      set((state) => ({
        workspaces: state.workspaces.map((w) =>
          w.id === updated.id ? updated : w
        ),
        loading: false,
      }));
    } catch (error: any) {
      console.error("Failed to update workspace:", error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Reset store (on logout)
   */
  reset: () => {
    set({
      workspaces: [],
      activeWorkspaceId: null,
      loading: false,
      error: null,
    });
  },
}));
