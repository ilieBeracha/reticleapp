import { useColors } from '@/hooks/ui/useColors';
import { SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function formatDateTime(value?: string | null) {
  if (!value) return 'In progress';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatLabel(label: string) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

interface OrgSessionCardProps {
  session: SessionWithDetails;
  isFirst?: boolean;
  isLast?: boolean;
}

const OrgSessionCard = memo(({ session, isFirst, isLast }: OrgSessionCardProps) => {
  const colors = useColors();

  // Memoize status colors
  const statusColor = useMemo(() => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      active: { bg: colors.blue + '20', text: colors.blue },
      completed: { bg: colors.green + '25', text: colors.green },
      cancelled: { bg: colors.red + '20', text: colors.red },
    };
    return statusColors[session.status] ?? { bg: colors.muted + '20', text: colors.mutedForeground };
  }, [session.status, colors]);

  // Memoize styles (border radius handled by parent GroupedList)
  const cardStyle = useMemo(() => [
    styles.sessionCard,
  ], []);

  const statusBadgeStyle = useMemo(() => [
    styles.sessionStatusBadge,
    { backgroundColor: statusColor.bg }
  ], [statusColor.bg]);

  return (
    <View style={cardStyle}>
      <View style={styles.sessionHeader}>
        <View style={styles.sessionLeft}>
          <View style={[styles.sessionIcon, { backgroundColor: '#5B7A8C15' }]}>
            <Ionicons name="fitness" size={18} color="#5B7A8C" />
          </View>
          <View>
            <Text style={[styles.sessionTitle, { color: colors.text }]}>
              {session.session_mode === 'group' ? 'Group Session' : 'Solo Session'}
            </Text>
            <Text style={[styles.sessionSubtitle, { color: colors.textMuted }]}>
              {session.user_full_name || 'Unknown User'}
            </Text>
          </View>
        </View>
        <View style={statusBadgeStyle}>
          <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>
            {formatLabel(session.status)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionMeta}>
        <View style={styles.sessionMetaItem}>
          <Ionicons name="time-outline" size={14} color={colors.textMuted} />
          <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
            {formatDateTime(session.started_at)}
          </Text>
        </View>
        {session.team_name && (
          <View style={styles.sessionMetaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>
              {session.team_name}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
});

OrgSessionCard.displayName = 'OrgSessionCard';

const styles = StyleSheet.create({
  sessionCard: {
    padding: 16,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.2,
  },
  sessionSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  sessionStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  sessionStatusText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  sessionMetaText: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
});

export default OrgSessionCard;

