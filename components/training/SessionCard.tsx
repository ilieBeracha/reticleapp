import { isGroupingSession } from '@/utils/drillGoal';
import { StyleSheet, Text, View } from 'react-native';
import type { SessionWithDetails, ThemeColors } from './types';

interface SessionCardProps {
  session: SessionWithDetails;
  colors: ThemeColors;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active: { bg: '#3B82F620', text: '#3B82F6' },
  completed: { bg: '#22C55E20', text: '#22C55E' },
  cancelled: { bg: '#EF444420', text: '#EF4444' },
};

export function SessionCard({ session, colors }: SessionCardProps) {
  const status = STATUS_COLORS[session.status] || STATUS_COLORS.completed;

  // Determine if grouping or engagement
  const isGrouping = isGroupingSession(session);
  const shots = session.stats?.shots_fired || 0;
  const hits = session.stats?.hits_total || 0;
  const bestDispersion = session.stats?.best_dispersion_cm;
  const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;

  return (
    <View style={[styles.card, { backgroundColor: colors.background, borderColor: colors.border }]}>
      <View style={[styles.dot, { backgroundColor: status.text }]} />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.name, { color: colors.text }]}>{session.user_full_name || 'Unknown User'}</Text>
          <View style={[styles.badge, { backgroundColor: status.bg }]}>
            <Text style={[styles.badgeText, { color: status.text }]}>{session.status}</Text>
          </View>
        </View>
        <View style={styles.meta}>
          <Text style={[styles.metaText, { color: colors.textMuted }]}>
            {new Date(session.started_at).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {session.drill_name && (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>• {session.drill_name}</Text>
          )}
          {/* Stats based on drill goal */}
          {shots > 0 && (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {isGrouping
                ? `• ${shots} shots${bestDispersion != null ? ` • ${bestDispersion.toFixed(1)}cm` : ''}`
                : `• ${hits}/${shots} (${accuracy}%)`}
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 0.5,
    gap: 10,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  name: {
    fontSize: 14,
    fontWeight: '600',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  meta: {
    flexDirection: 'row',
    gap: 4,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
  },
});
