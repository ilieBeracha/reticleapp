import { useColors } from '@/hooks/ui/useColors';
import { SessionWithDetails } from '@/services/sessionService';
import { memo, useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'In progress';
  }

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatLabel(label: string) {
  return label
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

interface SessionCardProps {
  session: SessionWithDetails;
}

const SessionCard = memo(({ session }: SessionCardProps) => {
  const colors = useColors();
  
  const sessionPayload = session.session_data as Record<string, any> | null;
  const environment = sessionPayload?.environment ?? null;
  const trainingId = sessionPayload?.training_id ?? null;
  const drillId = sessionPayload?.drill_id ?? null;

  // Memoize status colors based on session status
  const statusColor = useMemo(() => {
    const statusColors: Record<string, { bg: string; text: string }> = {
      active: { bg: colors.blue + '20', text: colors.blue },
      completed: { bg: colors.green + '25', text: colors.green },
      cancelled: { bg: colors.red + '20', text: colors.red },
    };
    return statusColors[session.status] ?? { bg: colors.muted + '20', text: colors.mutedForeground };
  }, [session.status, colors]);

  // Memoize card styles
  const cardStyle = useMemo(() => [
    styles.sessionCard,
    { backgroundColor: colors.card, borderColor: colors.border }
  ], [colors.card, colors.border]);

  const statusBadgeStyle = useMemo(() => [
    styles.sessionStatusBadge,
    { backgroundColor: statusColor.bg }
  ], [statusColor.bg]);

  return (
    <View style={cardStyle}>
      <View style={styles.sessionHeader}>
        <View>
          <Text style={[styles.sessionTitle, { color: colors.text }]}>
            {session.session_mode === 'group' ? 'Group Session' : 'Solo Session'}
          </Text>
          <Text style={[styles.sessionSubtitle, { color: colors.textMuted }]}>
            {formatDateTime(session.started_at)}
          </Text>
        </View>

        <View style={statusBadgeStyle}>
          <Text style={[styles.sessionStatusText, { color: statusColor.text }]}>
            {formatLabel(session.status)}
          </Text>
        </View>
      </View>

      <View style={styles.sessionMetaRow}>
        <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
          Mode
        </Text>
        <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
          {formatLabel(session.session_mode)}
        </Text>
      </View>

      {session.ended_at && (
        <View style={styles.sessionMetaRow}>
          <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
            Ended
          </Text>
          <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
            {formatDateTime(session.ended_at)}
          </Text>
        </View>
      )}

      {session.team_name && (
        <View style={styles.sessionMetaRow}>
          <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
            Team
          </Text>
          <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
            {session.team_name}
          </Text>
        </View>
      )}

      {trainingId && (
        <View style={styles.sessionMetaRow}>
          <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
            Training ID
          </Text>
          <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
            {trainingId}
          </Text>
        </View>
      )}

      {drillId && (
        <View style={styles.sessionMetaRow}>
          <Text style={[styles.sessionMetaLabel, { color: colors.textMuted }]}>
            Drill ID
          </Text>
          <Text style={[styles.sessionMetaValue, { color: colors.text }]}>
            {drillId}
          </Text>
        </View>
      )}

      {environment && Object.keys(environment).length > 0 && (
        <View style={styles.sessionEnvironment}>
          <Text style={[styles.environmentTitle, { color: colors.text }]}>
            Environment
          </Text>
          {Object.entries(environment).map(([key, value]) => (
            <Text
              key={key}
              style={[styles.environmentItem, { color: colors.textMuted }]}
            >
              {formatLabel(key)}: {String(value)}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
});

SessionCard.displayName = 'SessionCard';

const styles = StyleSheet.create({
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionSubtitle: {
    fontSize: 12,
    marginTop: 4,
    letterSpacing: -0.1,
  },
  sessionStatusBadge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  sessionStatusText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
    textTransform: 'uppercase',
  },
  sessionMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  sessionMetaLabel: {
    fontSize: 13,
    letterSpacing: -0.1,
  },
  sessionMetaValue: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  sessionEnvironment: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
  },
  environmentTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
    marginBottom: 6,
  },
  environmentItem: {
    fontSize: 12,
    lineHeight: 18,
    letterSpacing: -0.1,
  },
});

export default SessionCard;

