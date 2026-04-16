/**
 * sessionHistoryGrouping - Partition a sorted session list into relative
 * date buckets (Today, This Week, This Month, Earlier) for a SectionList.
 *
 * Assumes input is already sorted descending by date. Produces empty
 * sections only if at least one session falls into them.
 */

import type { SessionWithDetails } from '@/types/session';

export interface SessionSection {
  title: string;
  data: SessionWithDetails[];
}

type BucketKey = 'today' | 'yesterday' | 'thisWeek' | 'thisMonth' | 'earlier';

const BUCKET_ORDER: BucketKey[] = ['today', 'yesterday', 'thisWeek', 'thisMonth', 'earlier'];

const BUCKET_TITLES: Record<BucketKey, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  thisWeek: 'This Week',
  thisMonth: 'This Month',
  earlier: 'Earlier',
};

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function sessionDate(s: SessionWithDetails): Date | null {
  const raw = s.started_at || s.ended_at || s.created_at;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function bucketFor(date: Date, now: Date): BucketKey {
  const todayStart = startOfDay(now);
  const yesterdayStart = new Date(todayStart);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  const weekStart = new Date(todayStart);
  weekStart.setDate(weekStart.getDate() - 7);
  const monthStart = new Date(todayStart);
  monthStart.setDate(monthStart.getDate() - 30);

  if (date >= todayStart) return 'today';
  if (date >= yesterdayStart) return 'yesterday';
  if (date >= weekStart) return 'thisWeek';
  if (date >= monthStart) return 'thisMonth';
  return 'earlier';
}

export function groupSessionsByDate(
  sessions: readonly SessionWithDetails[],
  now: Date = new Date()
): SessionSection[] {
  const buckets: Record<BucketKey, SessionWithDetails[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    earlier: [],
  };

  for (const s of sessions) {
    const d = sessionDate(s);
    if (!d) {
      buckets.earlier.push(s);
      continue;
    }
    buckets[bucketFor(d, now)].push(s);
  }

  return BUCKET_ORDER
    .filter((k) => buckets[k].length > 0)
    .map((k) => ({ title: BUCKET_TITLES[k], data: buckets[k] }));
}
