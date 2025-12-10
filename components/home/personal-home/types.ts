import type { SessionWithDetails } from '@/services/sessionService';
import type { LucideIcon } from 'lucide-react-native';

// ═══════════════════════════════════════════════════════════════════════════
// DIAL MODE TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type ActiveDialMode = 'time' | 'targets' | 'shots' | 'accuracy';
export type IdleDialMode = 'sessions' | 'shots' | 'paper' | 'tactical';

export interface DialModeConfig {
  key: string;
  label: string;
  unit: string;
  icon: LucideIcon;
  color: string;
  getProgress: (value: number, max: number) => number;
}

// ═══════════════════════════════════════════════════════════════════════════
// SESSION STATS
// ═══════════════════════════════════════════════════════════════════════════

export interface SessionStats {
  targetCount: number;
  totalShotsFired: number;
  totalHits: number;
  paperTargets: number;
  tacticalTargets: number;
}

export interface WeeklyStats {
  sessions: number;
  totalShots: number;
  paperTargets: number;
  tacticalTargets: number;
}

export interface ElapsedTime {
  minutes: number;
  seconds: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// DIAL VALUE
// ═══════════════════════════════════════════════════════════════════════════

export interface DialValue {
  value: number;
  secondary?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// COLORS (from useColors hook)
// ═══════════════════════════════════════════════════════════════════════════

export interface ThemeColors {
  background: string;
  text: string;
  textMuted: string;
  card: string;
  border: string;
  primary: string;
  secondary: string;
  [key: string]: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// RE-EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export type { SessionWithDetails };
