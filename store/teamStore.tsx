/**
 * Team Store
 * Manages team state and operations
 */

import {
  addTeamMember as addTeamMemberService,
  createTeam as createTeamService,
  deleteTeam as deleteTeamService,
  getTeamWithMembers,
  getWorkspaceTeams,
  OrgCreateTeamInput,
  removeTeamMember as removeTeamMemberService,
  updateTeam as updateTeamService,
  type AddTeamMemberInput,
  type UpdateTeamInput
} from '@/services/teamService';
import type { Team, TeamWithMembers } from '@/types/workspace';
import { create } from 'zustand';

interface TeamStore {
  teams: (Team & { member_count?: number })[];
  selectedTeam: TeamWithMembers | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadTeams: (orgWorkspaceId: string) => Promise<void>;  // Simplified - always org
  createTeam: (input: OrgCreateTeamInput) => Promise<Team>;
  loadTeam: (teamId: string) => Promise<void>;
  updateTeam: (input: UpdateTeamInput) => Promise<void>;
  deleteTeam: (teamId: string) => Promise<void>;
  addTeamMember: (input: AddTeamMemberInput) => Promise<void>;
  removeTeamMember: (teamId: string, userId: string) => Promise<void>;
  reset: () => void;
}

export const useTeamStore = create<TeamStore>((set, get) => ({
  teams: [],
  selectedTeam: null,
  loading: false,
  error: null,

  /**
   * Load teams for a workspace (simplified - always org)
   */
  loadTeams: async (orgWorkspaceId: string) => {
    try {
      set({ loading: true, error: null });
      const teams = await getWorkspaceTeams(orgWorkspaceId);
      set({ teams, loading: false });
    } catch (error: any) {
      console.error('Failed to load teams:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Create a new team
   */
  createTeam: async (input: OrgCreateTeamInput) => {
    try {
      set({ loading: true, error: null });
      const newTeam = await createTeamService(input);
      return newTeam;
    } catch (error: any) {
      console.error('Failed to create team:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Load a single team with members
   */
  loadTeam: async (teamId: string) => {
    try {
      set({ loading: true, error: null });
      const team = await getTeamWithMembers(teamId);
      set({ selectedTeam: team, loading: false });
    } catch (error: any) {
      console.error('Failed to load team:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Update a team
   */
  updateTeam: async (input: UpdateTeamInput) => {
    try {
      set({ loading: true, error: null });
      const updatedTeam = await updateTeamService(input);
      
      // Update the team in the list
      set((state) => ({
        teams: state.teams.map((team) =>
          team.id === input.team_id ? { ...team, ...updatedTeam } : team
        ),
        selectedTeam:
          state.selectedTeam?.id === input.team_id
            ? { ...state.selectedTeam, ...updatedTeam }
            : state.selectedTeam,
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to update team:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Delete a team
   */
  deleteTeam: async (teamId: string) => {
    try {
      set({ loading: true, error: null });
      await deleteTeamService(teamId);
      
      // Remove the team from the list
      set((state) => ({
        teams: state.teams.filter((team) => team.id !== teamId),
        selectedTeam: state.selectedTeam?.id === teamId ? null : state.selectedTeam,
        loading: false,
      }));
    } catch (error: any) {
      console.error('Failed to delete team:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Add a member to a team
   */
  addTeamMember: async (input: AddTeamMemberInput) => {
    try {
      set({ loading: true, error: null });
      await addTeamMemberService(input);
      
      // Reload the selected team if it's the one being updated
      const state = get();
      if (state.selectedTeam?.id === input.team_id) {
        await get().loadTeam(input.team_id);
      }
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Failed to add team member:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Remove a member from a team
   */
  removeTeamMember: async (teamId: string, userId: string) => {
    try {
      set({ loading: true, error: null });
      await removeTeamMemberService(teamId, userId);
      
      // Reload the selected team if it's the one being updated
      const state = get();
      if (state.selectedTeam?.id === teamId) {
        await get().loadTeam(teamId);
      }
      
      set({ loading: false });
    } catch (error: any) {
      console.error('Failed to remove team member:', error);
      set({ error: error.message, loading: false });
      throw error;
    }
  },

  /**
   * Reset the store
   */
  reset: () => {
    set({
      teams: [],
      selectedTeam: null,
      loading: false,
      error: null,
    });
  },
}));

