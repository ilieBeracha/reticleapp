import { Ionicons } from '@expo/vector-icons';
import { format } from 'date-fns';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import type { ThemeColors } from './types';

interface RecentSessionsSectionProps {
  sessions: any[];
  colors: ThemeColors;
}

export function RecentSessionsSection({ sessions, colors }: RecentSessionsSectionProps) {
  if (sessions.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Recent Sessions</Text>
      </View>
      <View style={styles.list}>
        {sessions.map((session, index) => (
          <SessionRow key={session.id} session={session} colors={colors} delay={350 + index * 40} />
        ))}
      </View>
    </View>
  );
}

interface SessionRowProps {
  session: any;
  colors: ThemeColors;
  delay?: number;
}

function SessionRow({ session, colors, delay = 0 }: SessionRowProps) {
  const duration = session.ended_at
    ? Math.round(
        (new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000
      )
    : null;

  const isCompleted = session.status === 'completed';
  const isActive = session.status === 'active';

  return (
    <Animated.View entering={FadeInRight.delay(delay).duration(350)}>
      <TouchableOpacity
        style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}
        activeOpacity={0.7}
      >
        <View
          style={[
            styles.indicator,
            { backgroundColor: isCompleted ? '#10B981' : isActive ? colors.primary : colors.border },
          ]}
        />
        <View style={styles.content}>
          <Text style={[styles.rowTitle, { color: colors.text }]} numberOfLines={1}>
            {session.training_title || session.drill_name || 'Free Session'}
          </Text>
          <Text style={[styles.meta, { color: colors.textMuted }]}>
            {format(new Date(session.started_at), 'MMM d, HH:mm')}
            {duration && ` · ${duration}m`}
          </Text>
        </View>
        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: isCompleted
                ? '#10B98115'
                : isActive
                ? colors.primary + '15'
                : colors.secondary,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,
              { color: isCompleted ? '#10B981' : isActive ? colors.primary : colors.textMuted },
            ]}
          >
            {isCompleted ? 'Done' : isActive ? 'Live' : 'Cancelled'}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

export function EmptyState({ colors }: { colors: ThemeColors }) {
  return (
    <View style={[styles.empty, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <Ionicons name="analytics-outline" size={40} color={colors.textMuted} />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No data yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Complete some sessions to see your insights
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  list: {
    gap: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  indicator: {
    width: 3,
    height: 32,
    borderRadius: 2,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  empty: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
  },
});
