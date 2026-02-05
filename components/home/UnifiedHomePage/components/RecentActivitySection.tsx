/**
 * RecentActivitySection Component
 *
 * Displays list of recent sessions with dividers or empty state placeholder.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import type { RecentActivitySectionProps } from '@/types/home';
import { RecentSessionRow } from './RecentSessionRow';

export function RecentActivitySection({ sessions, colors, onSessionPress }: RecentActivitySectionProps) {
  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.section}>
      {sessions.length > 0 ? (
        <View style={[s.recentList, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {sessions.map((session, idx) => (
            <View key={session.id}>
              <RecentSessionRow session={session} colors={colors} onPress={() => onSessionPress(session)} />
              {idx < sessions.length - 1 && <View style={[s.recentDivider, { backgroundColor: colors.border }]} />}
            </View>
          ))}
        </View>
      ) : (
        <View style={[s.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="analytics-outline" size={18} color={colors.textMuted} />
          </View>
          <View style={s.emptyContent}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No sessions yet</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Start your first practice to see activity here
            </Text>
          </View>
        </View>
      )}
    </Animated.View>
  );
}

const s = StyleSheet.create({
  section: {
    marginBottom: 14,
  },
  recentList: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recentDivider: {
    height: 1,
    marginLeft: 56,
  },
  emptyState: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { gap: 2 },
  emptyTitle: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 11 },
});
