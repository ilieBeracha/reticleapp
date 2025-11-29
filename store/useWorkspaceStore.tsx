// store/useWorkspaceStore.ts
import {
  getAccessibleWorkspaces,
  getWorkspaceMembers,
  updateOrgWorkspaceSettings,
} from "@/services/workspaceService";
import { OrgWorkspaceSettings, Workspace, WorkspaceMemberWithTeams } from "@/types/workspace";
import { create } from "zustand";

interface WorkspaceStore {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;  // Currently viewing workspace
  loading: boolean;
  isSwitching: boolean;  // True when transitioning between workspaces
  error: string | null;
  workspaceMembers: WorkspaceMemberWithTeams[];
  loadWorkspaceMembers: () => Promise<void>;
  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (workspaceId: string | null) => void;
  setIsSwitching: (isSwitching: boolean) => void;
  updateWorkspaceSettings: (settings: OrgWorkspaceSettings) => Promise<void>;
  reset: () => void;
} 

/**
 * ✨ WORKSPACE STORE ✨
 * 
 * IMPORTANT: Users ALWAYS start in personal mode
 * - activeWorkspaceId = null means personal mode
 * - activeWorkspaceId = UUID means viewing an organization
 * - Users can switch to organizations when they choose
 * - On app start/sign in, ALWAYS reset to personal mode (null)
 * 
 * Source of truth:
 * - workspaces: list of accessible org workspaces
 * - activeWorkspaceId: currently viewing workspace ID (ALWAYS starts null)
 */
export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,  // ALWAYS start in personal mode
  loading: true,
  isSwitching: false,
  error: null,
  workspaceMembers: [],
  
  /**
   * Load all organization workspaces user has access to
   */
  loadWorkspaces: async () => {
    try {
      set({ loading: true, error: null });

      // Check if user is authenticated first (use getSession, not getUser - getUser can hang during auth transitions)
      const { supabase } = await import("@/lib/supabase");
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        if (__DEV__) console.log("📦 Workspace Store: User not authenticated yet, skipping load");
        set({ loading: false, workspaces: [], activeWorkspaceId: null });
        return;
      }

      const workspaces = await getAccessibleWorkspaces();
      
      // DON'T auto-select a workspace - user starts in personal mode
      // They can switch to an org if they want
      set({
        workspaces,
        activeWorkspaceId: null,  // Start in personal mode
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
    if (__DEV__) console.log('🔄 Setting active workspace:', workspaceId);
    set({ activeWorkspaceId: workspaceId });
  },

  /**
   * Set switching state (shows loading screen during transitions)
   */
  setIsSwitching: (isSwitching: boolean) => {
    set({ isSwitching });
  },

  /**
   * Update workspace settings (admin/owner only)
   * Updates both local state and database
   */
  updateWorkspaceSettings: async (settings: OrgWorkspaceSettings) => {
    const { activeWorkspaceId, workspaces } = get();
    if (!activeWorkspaceId) return;

    try {
      // Update database
      await updateOrgWorkspaceSettings(activeWorkspaceId, settings);

      // Update local state
      const updatedWorkspaces = workspaces.map(ws => {
        if (ws.id === activeWorkspaceId) {
          return {
            ...ws,
            ...(settings.show_teams_tab !== undefined && { show_teams_tab: settings.show_teams_tab }),
            ...(settings.show_attached_tab !== undefined && { show_attached_tab: settings.show_attached_tab }),
          };
        }
        return ws;
      });

      set({ workspaces: updatedWorkspaces });
    } catch (error: any) {
      console.error('Failed to update workspace settings:', error);
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
