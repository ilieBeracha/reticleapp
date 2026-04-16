/**
 * useGlobalSearchIndex - Loads and memoizes a searchable list of every
 * entity the user can reach: sessions, weapons, and (when in team mode)
 * team members.
 *
 * Fires fetches lazily when the sheet opens. Entries are normalized into a
 * flat `SearchEntry` shape the sheet can render uniformly.
 */

import { getSessions } from '@/services/session/queries';
import { getTeamMembers } from '@/services/teamService';
import { getUserWeapons } from '@/services/weaponService';
import { useTeamStore } from '@/stores/teamStore';
import { useCallback, useEffect, useState } from 'react';

export type SearchEntryKind = 'session' | 'weapon' | 'member';

export interface SearchEntry {
  id: string;
  kind: SearchEntryKind;
  label: string;
  sublabel?: string;
  /** Pre-lowercased combined search haystack. */
  haystack: string;
  /** Navigator path to push on select. */
  href?: string;
}

interface IndexState {
  entries: SearchEntry[];
  loading: boolean;
  refresh: () => Promise<void>;
}

export function useGlobalSearchIndex(enabled: boolean): IndexState {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const activeTeamId = useTeamStore((s) => s.activeTeamId);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [sessions, weapons, members] = await Promise.all([
        getSessions().catch(() => []),
        getUserWeapons().catch(() => []),
        activeTeamId ? getTeamMembers(activeTeamId).catch(() => []) : Promise.resolve([]),
      ]);

      const all: SearchEntry[] = [];

      for (const s of sessions) {
        const label = s.drill_name || 'Session';
        const when = s.started_at ? new Date(s.started_at).toLocaleDateString() : '';
        const weapon = s.weapon_name || '';
        all.push({
          id: `session:${s.id}`,
          kind: 'session',
          label,
          sublabel: [when, weapon].filter(Boolean).join(' · '),
          haystack: `${label} ${weapon} ${when}`.toLowerCase(),
          href: `/(protected)/sessionDetail?sessionId=${s.id}`,
        });
      }

      for (const w of weapons) {
        const label = w.name || 'Weapon';
        const category = (w as any).category || '';
        all.push({
          id: `weapon:${w.id}`,
          kind: 'weapon',
          label,
          sublabel: category,
          haystack: `${label} ${category}`.toLowerCase(),
          href: `/(protected)/weaponDetail?id=${w.id}`,
        });
      }

      for (const m of members) {
        const label = m.profile?.full_name || m.profile?.email || 'Teammate';
        const role = (m as any).role || '';
        all.push({
          id: `member:${m.user_id}`,
          kind: 'member',
          label,
          sublabel: role,
          haystack: `${label} ${role}`.toLowerCase(),
        });
      }

      setEntries(all);
    } finally {
      setLoading(false);
    }
  }, [activeTeamId]);

  useEffect(() => {
    if (enabled) refresh();
  }, [enabled, refresh]);

  return { entries, loading, refresh };
}
