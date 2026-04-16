/**
 * AchievementsSection - Horizontal strip of badges for profile screens.
 *
 * Fetches the current user's sessions once on mount, computes derived
 * achievements, and renders unlocked badges first. Lightweight — no new
 * store, no new network endpoint.
 */

import { AchievementBadge } from '@/components/achievements/AchievementBadge';
import { Skeleton } from '@/components/shared/Skeleton';
import { useColors } from '@/hooks/ui/useColors';
import { getSessions } from '@/services/session/queries';
import type { SessionWithDetails } from '@/types/session';
import { computeAchievements, type Achievement } from '@/utils/achievements';
import { calculateStreak } from '@/utils/unifiedHomePage.helpers';
import { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';

export function AchievementsSection() {
  const colors = useColors();
  const [sessions, setSessions] = useState<SessionWithDetails[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSessions(null)
      .then((rows) => {
        if (!cancelled) setSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const achievements = useMemo<Achievement[] | null>(() => {
    if (!sessions) return null;
    const completed = sessions.filter((s) => s.status === 'completed');
    const streak = calculateStreak(completed);
    const all = computeAchievements(completed, streak);
    // Unlocked first, then locked (preserving relative order within groups)
    return [...all.filter((a) => a.unlocked), ...all.filter((a) => !a.unlocked)];
  }, [sessions]);

  const unlockedCount = achievements?.filter((a) => a.unlocked).length ?? 0;
  const total = achievements?.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.label, { color: colors.textMuted }]}>ACHIEVEMENTS</Text>
        {achievements ? (
          <Text style={[styles.counter, { color: colors.textMuted }]}>
            {unlockedCount} / {total}
          </Text>
        ) : null}
      </View>

      {achievements == null ? (
        <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 16 }}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width={64} height={64} radius={32} />
          ))}
        </View>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.strip}
        >
          {achievements.map((a) => (
            <AchievementBadge key={a.id} achievement={a} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 10 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },
  counter: { fontSize: 12, fontWeight: '600' },
  strip: { gap: 14, paddingHorizontal: 16 },
});
