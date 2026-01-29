/**
 * UnifiedHomePage Types
 *
 * Type definitions for the unified home page components.
 */

import type { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/types/session';
import type { UserWeapon, WeaponStats } from '@/services/weaponService';
import type { TrainingWithDetails } from '@/types/workspace';
import type { HomeSession } from '@/types/home.viewmodel';

/** Hero mode determined by priority logic */
export type HeroMode = 'team-live' | 'solo-active' | 'idle';

/** Weekly stats computed from sessions */
export interface WeeklyStats {
  shots: number;
  hits: number;
  accuracy: number;
  bestGroup: string;
  sessions: number;
  totalTimeMinutes: number;
}

/** Coach message context */
export interface CoachMessageContext {
  sessions: number;
  shots: number;
  accuracy: number;
  hasActiveSession: boolean;
  hasUpcoming: boolean;
  streak: number;
}

/** Colors type from useColors hook */
export type Colors = ReturnType<typeof useColors>;

/** Props for WeeklyStatsCard */
export interface WeeklyStatsCardProps {
  stats: WeeklyStats;
  streak: number;
  colors: Colors;
  /** Raw sessions (used for mode/weapon filtering inside the card) */
  sessionsData: SessionWithDetails[];
}

/** Props for ActiveSessionCard */
export interface ActiveSessionCardProps {
  session: HomeSession;
  colors: Colors;
  onPress: () => void;
}

/** Props for TeamTrainingCard */
export interface TeamTrainingCardProps {
  training: any;
  colors: Colors;
  onPress: () => void;
}

/** Props for RecentSessionRow */
export interface RecentSessionRowProps {
  session: HomeSession;
  colors: Colors;
  onPress: () => void;
}

/** Props for HomeHeader */
export interface HomeHeaderProps {
  greeting: string;
  firstName: string;
  avatarUrl: string | null;
  fallbackInitial: string;
  isGarminConnected: boolean;
  colors: Colors;
}

/** Props for CoachMessage */
export interface CoachMessageProps {
  message: string;
  colors: Colors;
}

/** Props for TeamSection */
export interface TeamSectionProps {
  trainings: any[];
  hasTeams: boolean;
  colors: Colors;
  onTrainingPress: (training: any) => void;
}

/** Props for HeroActions */
export interface HeroActionsProps {
  colors: Colors;
  heroMode: HeroMode;
  // Solo session
  activeSession: HomeSession | null;
  hasActiveSession: boolean;
  starting: boolean;
  onStartSession: () => void;
  onActiveSessionPress: () => void;
  // Team training
  activeTeamTraining: TrainingWithDetails | null;
  isTrainingCommander: boolean;
  hasTeams: boolean;
  onTrainingPress: (training: TrainingWithDetails) => void;
  // Next upcoming training (for secondary row)
  nextUpcomingTraining: TrainingWithDetails | null;
  // Weapon data
  defaultWeapon: UserWeapon | null;
  defaultWeaponStats: WeaponStats | null;
  // Upcoming trainings for timeline
  upcomingTrainings: TrainingWithDetails[];
}

/** Props for RecentActivitySection */
export interface RecentActivitySectionProps {
  sessions: HomeSession[];
  colors: Colors;
  onSessionPress: (session: HomeSession) => void;
}
