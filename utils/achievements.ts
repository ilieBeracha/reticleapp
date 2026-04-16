/**
 * achievements - Derive badge state from existing session data.
 *
 * No new DB columns. Every achievement is computed from the already-loaded
 * `SessionWithDetails[]` plus the streak number that `calculateStreak`
 * already produces. Mark-as-seen / confetti-on-unlock is a separate layer.
 */

import type { SessionWithDetails } from '@/types/session';

export type AchievementId =
  | 'first_session'
  | 'sessions_10'
  | 'sessions_100'
  | 'streak_3'
  | 'streak_7'
  | 'streak_30'
  | 'rounds_100'
  | 'rounds_1000'
  | 'accuracy_80'
  | 'sub_moa';

export type AchievementColor = 'green' | 'orange' | 'blue' | 'purple' | 'yellow' | 'red';

export interface Achievement {
  id: AchievementId;
  title: string;
  description: string;
  /** Lucide icon name; consumer maps to component. */
  iconName: string;
  color: AchievementColor;
  unlocked: boolean;
  /** Optional progress toward unlock for locked badges. */
  progress?: { current: number; total: number };
}

/** ~1 MOA at 100m ≈ 2.9 cm dispersion. Round to 3cm as the practical threshold. */
const SUB_MOA_DISPERSION_CM = 3;

export function computeAchievements(sessions: SessionWithDetails[], streak: number): Achievement[] {
  const totalSessions = sessions.length;
  const totalRounds = sessions.reduce((sum, s) => sum + (s.stats?.shots_fired ?? 0), 0);

  // Best single-session accuracy (excluding zero-shot sessions)
  const bestAccuracy = sessions.reduce((best, s) => {
    const shots = s.stats?.shots_fired ?? 0;
    const hits = s.stats?.hits_total ?? 0;
    if (shots === 0) return best;
    const acc = (hits / shots) * 100;
    return acc > best ? acc : best;
  }, 0);

  // Best dispersion (lowest non-zero cm)
  const bestDispersion = sessions.reduce<number | null>((best, s) => {
    const d = s.stats?.best_dispersion_cm;
    if (d == null || d <= 0) return best;
    if (best == null || d < best) return d;
    return best;
  }, null);

  return [
    {
      id: 'first_session',
      title: 'First Shot',
      description: 'Complete your first training session',
      iconName: 'Target',
      color: 'blue',
      unlocked: totalSessions >= 1,
      progress: { current: Math.min(totalSessions, 1), total: 1 },
    },
    {
      id: 'sessions_10',
      title: 'Dedicated',
      description: 'Complete 10 training sessions',
      iconName: 'Trophy',
      color: 'orange',
      unlocked: totalSessions >= 10,
      progress: { current: Math.min(totalSessions, 10), total: 10 },
    },
    {
      id: 'sessions_100',
      title: 'Veteran',
      description: 'Complete 100 training sessions',
      iconName: 'Medal',
      color: 'purple',
      unlocked: totalSessions >= 100,
      progress: { current: Math.min(totalSessions, 100), total: 100 },
    },
    {
      id: 'streak_3',
      title: 'Warming Up',
      description: '3-day training streak',
      iconName: 'Flame',
      color: 'orange',
      unlocked: streak >= 3,
      progress: { current: Math.min(streak, 3), total: 3 },
    },
    {
      id: 'streak_7',
      title: 'On Fire',
      description: '7-day training streak',
      iconName: 'Flame',
      color: 'red',
      unlocked: streak >= 7,
      progress: { current: Math.min(streak, 7), total: 7 },
    },
    {
      id: 'streak_30',
      title: 'Locked In',
      description: '30-day training streak',
      iconName: 'Flame',
      color: 'yellow',
      unlocked: streak >= 30,
      progress: { current: Math.min(streak, 30), total: 30 },
    },
    {
      id: 'rounds_100',
      title: 'Century',
      description: 'Fire 100 rounds total',
      iconName: 'Crosshair',
      color: 'green',
      unlocked: totalRounds >= 100,
      progress: { current: Math.min(totalRounds, 100), total: 100 },
    },
    {
      id: 'rounds_1000',
      title: 'Marksman',
      description: 'Fire 1,000 rounds total',
      iconName: 'Crosshair',
      color: 'purple',
      unlocked: totalRounds >= 1000,
      progress: { current: Math.min(totalRounds, 1000), total: 1000 },
    },
    {
      id: 'accuracy_80',
      title: 'Sharpshooter',
      description: 'Hit 80% accuracy in a single session',
      iconName: 'Star',
      color: 'yellow',
      unlocked: bestAccuracy >= 80,
      progress: { current: Math.min(Math.round(bestAccuracy), 80), total: 80 },
    },
    {
      id: 'sub_moa',
      title: 'Sub-MOA',
      description: `Group tighter than ${SUB_MOA_DISPERSION_CM} cm`,
      iconName: 'Zap',
      color: 'blue',
      unlocked: bestDispersion != null && bestDispersion <= SUB_MOA_DISPERSION_CM,
    },
  ];
}

/** Compare two achievement snapshots and return any that became unlocked. */
export function diffUnlocked(
  previous: Achievement[],
  next: Achievement[]
): Achievement[] {
  const prevUnlocked = new Set(previous.filter((a) => a.unlocked).map((a) => a.id));
  return next.filter((a) => a.unlocked && !prevUnlocked.has(a.id));
}
