/**
 * UnifiedHomePage Types
 * 
 * Type definitions for the unified home page components.
 */

import type { useColors } from '@/hooks/ui/useColors';
import type { HomeSession } from '../types';

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
}

/** Props for ActiveSessionCard */
export interface ActiveSessionCardProps {
  session: HomeSession;
  colors: Colors;
  onPress: () => void;
}

/** Props for StartPracticeCard */
export interface StartPracticeCardProps {
  colors: Colors;
  onPress: () => void;
  starting: boolean;
  lastSessionDaysAgo: number | null;
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

/** Props for RecentActivitySection */
export interface RecentActivitySectionProps {
  sessions: HomeSession[];
  colors: Colors;
  onSessionPress: (session: HomeSession) => void;
}

