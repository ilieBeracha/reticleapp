import {
  addTeamMember as addTeamMemberService,
  createTeam as createTeamService,
  deleteTeam as deleteTeamService,
  getMyTeams,
  getTeamMembers,
  getTeamWithMembers,
  removeTeamMember as removeTeamMemberService,
  updateTeamMemberRole as updateMemberRoleService,
  updateTeam as updateTeamService,
  type AddTeamMemberInput,
  type CreateTeamInput,
  type UpdateTeamInput,
} from '@/services/teamService';
import type {
  TeamMemberWithProfile,
  TeamRole,
  TeamWithMembers,
  TeamWithRole
} from '@/types/workspace';
import { create } from 'zustand';

interface TeamStore {
  // State
  teams: TeamWithRole[];
  activeTeamId: string | null;
  activeTeam: TeamWithMembers | null;
  members: TeamMemberWithProfile[];
  loading: boolean;
  error: string | null;

  // Team actions
  loadTeams: () => Promise<void>;
  createTeam: (input: CreateTeamInput) => Promise<TeamWithRole>;
  updateTeam: (input: UpdateTeamInput) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;

  // Active team
  setActiveTeam: (teamId: string | null) => void;
  loadActiveTeam: () => Promise<void>;

  // Members
  loadMembers: () => Promise<void>;
  addMember: (input: AddTeamMemberInput) => Promise<void>;
  removeMember: (userId: string) => Promise<void>;
  updateMemberRole: (userId: string, role: TeamRole, details?: Record<string, any>) => Promise<void>;

  // Helpers
  getActiveTeam: () => TeamWithRole | null;
  reset: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  activeTeamId: null,
  activeTeam: null,
  members: [],
  loading: true,
  error: null,

  // =====================================================
  // LOAD TEAMS
  // =====================================================
  loadTeams: async () => {
    try {
      // Only show loading spinner on initial load, not refresh
      const isInitialLoad = get().teams.length === 0;
      if (isInitialLoad) {
        set({ loading: true, error: null });
      }

      const { supabase } = await import('@/lib/supabase');
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        set({ loading: false, teams: [], activeTeamId: null });
        return;
      }

      const teams = await getMyTeams();
      const { activeTeamId: currentActiveTeamId } = get();

      // Respect personal mode - never auto-select teams
      let newActiveTeamId: string | null = null;
      
      if (currentActiveTeamId !== null) {
        // User had a team selected - verify it still exists
        const teamStillExists = teams.some(t => t.id === currentActiveTeamId);
        newActiveTeamId = teamStillExists ? currentActiveTeamId : null;
      }
      // If currentActiveTeamId is null, stay in personal mode

      set({
        teams,
        activeTeamId: newActiveTeamId,
        loading: false,
      });

      // Load active team details if one is selected
      if (newActiveTeamId) {
        get().loadActiveTeam();
      }
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      set({ error: error.message, loading: false, teams: [] });
    }
  },

  // =====================================================
  // CREATE TEAM
  // =====================================================
  createTeam: async (input) => {
    try {
      const team = await createTeamService(input);
      
      // Reload teams to get the new one with role info
      await get().loadTeams();
      
      // Find the newly created team
      const newTeam = get().teams.find(t => t.id === team.id);
      if (!newTeam) throw new Error('Failed to find created team');
      
      return newTeam;
    } catch (error: any) {
      console.error('Failed to create team:', error);
      throw error;
    }
  },

  // =====================================================
  // UPDATE TEAM
  // =====================================================
  updateTeam: async (input) => {
    try {
      await updateTeamService(input);
      
      // Update local state
      const { teams, activeTeam } = get();
      const updatedTeams = teams.map(t => 
        t.id === input.team_id 
          ? { ...t, ...input, updated_at: new Date().toISOString() }
          : t
      );
      
      set({ teams: updatedTeams });
      
      // Update active team if it's the one being updated
      if (activeTeam?.id === input.team_id) {
        set({ 
          activeTeam: { 
            ...activeTeam, 
            ...input, 
            updated_at: new Date().toISOString() 
          } 
        });
      }
    } catch (error: any) {
      console.error('Failed to update team:', error);
      throw error;
    }
  },

  // =====================================================
  // DELETE TEAM
  // =====================================================
  deleteTeam: async (teamId) => {
    try {
      await deleteTeamService(teamId);
      
      // Remove from local state
      const { teams, activeTeamId } = get();
      const updatedTeams = teams.filter(t => t.id !== teamId);
      
      // If we deleted the active team, switch to another
      const newActiveTeamId = activeTeamId === teamId
        ? updatedTeams[0]?.id || null
        : activeTeamId;
      
      set({ 
        teams: updatedTeams, 
        activeTeamId: newActiveTeamId,
        activeTeam: newActiveTeamId === activeTeamId ? get().activeTeam : null,
      });
      
      // Load new active team if changed
      if (newActiveTeamId !== activeTeamId && newActiveTeamId) {
        get().loadActiveTeam();
      }
    } catch (error: any) {
      console.error('Failed to delete team:', error);
      throw error;
    }
  },

  // =====================================================
  // ACTIVE TEAM
  // =====================================================
  setActiveTeam: (teamId) => {
    set({ activeTeamId: teamId, activeTeam: null, members: [] });
    if (teamId) {
      get().loadActiveTeam();
    }
  },

  loadActiveTeam: async () => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;

    try {
      const team = await getTeamWithMembers(activeTeamId);
      if (team) {
        set({ 
          activeTeam: team, 
          members: team.members || [] 
        });
      }
    } catch (error: any) {
      console.error('Failed to load active team:', error);
    }
  },

  // =====================================================
  // MEMBERS
  // =====================================================
  loadMembers: async () => {
    const { activeTeamId } = get();
    if (!activeTeamId) return;

    try {
      const members = await getTeamMembers(activeTeamId);
      set({ members });
    } catch (error: any) {
      console.error('Failed to load members:', error);
    }
  },

  addMember: async (input) => {
    try {
      await addTeamMemberService(input);
      await get().loadMembers();
    } catch (error: any) {
      console.error('Failed to add member:', error);
      throw error;
    }
  },

  removeMember: async (userId) => {
    const { activeTeamId } = get();
    if (!activeTeamId) throw new Error('No active team');

    try {
      await removeTeamMemberService(activeTeamId, userId);
      
      // Update local state
      const { members } = get();
      set({ members: members.filter(m => m.user_id !== userId) });
    } catch (error: any) {
      console.error('Failed to remove member:', error);
      throw error;
    }
  },

  updateMemberRole: async (userId, role, details) => {
    const { activeTeamId } = get();
    if (!activeTeamId) throw new Error('No active team');

    try {
      await updateMemberRoleService(activeTeamId, userId, role, details);
      
      // Update local state
      const { members } = get();
      const updatedMembers = members.map(m =>
        m.user_id === userId 
          ? { ...m, role, details: details ?? m.details }
          : m
      );
      set({ members: updatedMembers as TeamMemberWithProfile[] });
    } catch (error: any) {
      console.error('Failed to update member role:', error);
      throw error;
    }
  },

  // =====================================================
  // HELPERS
  // =====================================================
  getActiveTeam: () => {
    const { teams, activeTeamId } = get();
    return teams.find(t => t.id === activeTeamId) || null;
  },

  reset: () => {
    set({
      teams: [],
      activeTeamId: null,
      activeTeam: null,
      members: [],
      loading: false,
      error: null,
    });
  },
}));

// =====================================================
// SELECTORS - Use these instead of contexts!
// =====================================================

/**
 * Get current user's role in active team
 */
export function useMyTeamRole(): TeamRole | null {
  return useTeamStore(state => {
    const team = state.teams.find(t => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
}

/**
 * Check if current user can manage the active team (owner or commander)
 */
export function useCanManageTeam(): boolean {
  return useTeamStore(state => {
    const team = state.teams.find(t => t.id === state.activeTeamId);
    return team?.my_role === 'owner' || team?.my_role === 'commander';
  });
}

/**
 * Check if user has any teams
 */
export function useHasTeams(): boolean {
  return useTeamStore(state => state.teams.length > 0);
}

/**
 * Get active team info
 */
export function useActiveTeam() {
  return useTeamStore(state => {
    const team = state.teams.find(t => t.id === state.activeTeamId);
    return {
      teamId: state.activeTeamId,
      team: team || null,
      teamName: team?.name || null,
      members: state.members,
      memberCount: state.members.length || team?.member_count || 0,
    };
  });
}

/**
 * Check if in team mode (has active team selected)
 */
export function useIsTeamMode(): boolean {
  return useTeamStore(state => state.activeTeamId !== null);
}

/**
 * Get role flags for active team
 * Uses shallow comparison to prevent infinite re-renders
 */
export function useTeamRoleFlags() {
  const role = useTeamStore(state => {
    const team = state.teams.find(t => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
  
  return {
    role,
    isOwner: role === 'owner',
    isCommander: role === 'commander',
    isSquadCommander: role === 'squad_commander',
    isSoldier: role === 'soldier',
    canManage: role === 'owner' || role === 'commander',
  };
}
