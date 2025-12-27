/**
 * Type definitions for Trainings Screen (Team Tab)
 */

import type { TeamMemberWithProfile, TrainingWithDetails } from '@/types/workspace';

// ============================================================================
// TAB TYPES
// ============================================================================
export type InternalTab = 'calendar' | 'manage';

// ============================================================================
// ROLE CONFIG
// ============================================================================
export interface RoleConfig {
  color: string;
  label: string;
  icon: any;
}

// ============================================================================
// STATUS CONFIG
// ============================================================================
export interface StatusConfig {
  color: string;
  label: string;
  bg: string;
}

// ============================================================================
// GROUPED TRAININGS
// ============================================================================
export interface GroupedTrainings {
  live: TrainingWithDetails[];
  today: TrainingWithDetails[];
  tomorrow: TrainingWithDetails[];
  thisWeek: TrainingWithDetails[];
  upcoming: TrainingWithDetails[];
  past: TrainingWithDetails[];
}

// ============================================================================
// QUICK STATS
// ============================================================================
export interface QuickStats {
  live: number;
  today: number;
  thisWeek: number;
}

// ============================================================================
// MEMBER STATS
// ============================================================================
export interface MemberStats {
  total: number;
  training: number;
  online: number;
  idle: number;
  offline: number;
}

// ============================================================================
// TEAM STATS
// ============================================================================
export interface TeamStats {
  sessionsThisWeek: number;
  totalShots: number;
  avgAccuracy: number;
  weeklyGoal: number;
}

// ============================================================================
// USE TRAININGS RETURN
// ============================================================================
export interface UseTrainingsReturn {
  // Team context
  teamState: 'no_teams' | 'single_team' | 'multiple_teams';
  teams: any[];
  activeTeamId: string | null;
  activeTeam: any | null;
  initialized: boolean;
  teamsLoading: boolean;
  
  // Permissions
  canSchedule: boolean;
  canManage: boolean;
  
  // Data
  activeTeamTrainings: TrainingWithDetails[];
  liveTraining: TrainingWithDetails | undefined;
  members: TeamMemberWithProfile[];
  memberStats: MemberStats;
  teamStats: TeamStats;
  
  // UI state
  refreshing: boolean;
  activeTab: InternalTab;
  switcherOpen: boolean;
  loadingTeamTrainings: boolean;
  showSwitcher: boolean;
  roleConfig: RoleConfig | null;
  
  // Actions
  onRefresh: () => Promise<void>;
  handleTabChange: (tab: InternalTab) => void;
  handleTrainingPress: (training: TrainingWithDetails) => void;
  handleCreateTraining: () => void;
  handleOpenLibrary: () => void;
  handleViewMembers: () => void;
  handleInviteMember: () => void;
  handleTeamSettings: () => void;
  setSwitcherOpen: (open: boolean) => void;
}

