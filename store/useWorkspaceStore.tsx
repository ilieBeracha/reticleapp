// store/useWorkspaceStore.ts
import {
  getAccessibleWorkspaces,
  getWorkspaceMembers,
} from "@/services/workspaceService";
import { Workspace, WorkspaceMemberWithTeams } from "@/types/workspace";
import { create } from "zustand";

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;  // Currently viewing workspace
  loading: boolean;
  error: string | null;
  workspaceMembers: WorkspaceMemberWithTeams[];
  loadWorkspaceMembers: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string | null) => void;
  reset: () => void;
} 

/**
 * ✨ ORG-ONLY WORKSPACE STORE ✨
 * 
 * Simplified Model: Users must belong to organizations
 * - No personal workspaces
 * - Can view different orgs they have access to
 * - activeWorkspaceId tracks which org is currently being viewed
 * - If user has no orgs, they need to create or join one
 * 
 * Source of truth:
 * - workspaces: list of accessible org workspaces
 * - activeWorkspaceId: currently viewing workspace ID (defaults to first org)
 */
export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: true,
  error: null,
  workspaceMembers: [],
  
  /**
   * Load all organization workspaces user has access to
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
      
      // Set active workspace to first org by default
      const defaultWorkspace = workspaces[0];
      
      set({
        workspaces,
        activeWorkspaceId: defaultWorkspace?.id || null,
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
    const { activeWorkspaceId } = get();
    if (!activeWorkspaceId) return;
    
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
