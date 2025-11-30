import { useColors } from '@/hooks/ui/useColors';
import { SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { memo, useCallback, useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

function formatDateTime(value?: string | null) {
  if (!value) {
    return 'In progress';
  }

  try {
    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Show relative time for recent sessions
    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    }
    
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return value;
  }
}

function formatDuration(startedAt: string, endedAt?: string | null) {
  if (!endedAt) return null;
  
  try {
    const start = new Date(startedAt);
    const end = new Date(endedAt);
    const diffMs = end.getTime() - start.getTime();
    const mins = Math.floor(diffMs / (1000 * 60));
    
    if (mins < 60) {
      return `${mins}m`;
    }
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`;
  } catch {
    return null;
  }
}

interface SessionCardProps {
  session: SessionWithDetails;
}

const SessionCard = memo(({ session }: SessionCardProps) => {
  const colors = useColors();

  // Get training info from actual fields
  const hasTraining = !!session.training_id;
  const trainingTitle = session.training_title;
  const drillName = session.drill_name;

  // Memoize status colors based on session status
  const statusColor = useMemo(() => {
    const statusColors: Record<string, { bg: string; text: string; icon: string }> = {
      active: { bg: colors.blue + '20', text: colors.blue, icon: 'radio-button-on' },
      completed: { bg: colors.green + '25', text: colors.green, icon: 'checkmark-circle' },
      cancelled: { bg: colors.red + '20', text: colors.red, icon: 'close-circle' },
    };
    return statusColors[session.status] ?? { bg: colors.muted + '20', text: colors.mutedForeground, icon: 'help-circle' };
  }, [session.status, colors]);

  const duration = formatDuration(session.started_at, session.ended_at);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push({
      pathname: '/(protected)/sessionDetail',
      params: { sessionId: session.id },
    });
  }, [session.id]);

  return (
    <TouchableOpacity 
      style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Header Row */}
      <View style={styles.sessionHeader}>
        <View style={styles.headerLeft}>
          <View style={[styles.statusIndicator, { backgroundColor: statusColor.bg }]}>
            <Ionicons name={statusColor.icon as any} size={14} color={statusColor.text} />
          </View>
          <View>
            <Text style={[styles.sessionTitle, { color: colors.text }]}>
              {hasTraining ? 'Training Session' : (session.session_mode === 'group' ? 'Group Session' : 'Solo Session')}
            </Text>
            <Text style={[styles.sessionTime, { color: colors.textMuted }]}>
              {formatDateTime(session.started_at)}
            </Text>
          </View>
        </View>
        
        <View style={styles.headerRight}>
          {duration && (
            <View style={[styles.durationBadge, { backgroundColor: colors.secondary }]}>
              <Ionicons name="time-outline" size={12} color={colors.textMuted} />
              <Text style={[styles.durationText, { color: colors.textMuted }]}>
                {duration}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Training Info - If linked to a training */}
      {hasTraining && (
        <View style={[styles.trainingInfo, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '30' }]}>
          <View style={styles.trainingRow}>
            <Ionicons name="fitness" size={16} color={colors.primary} />
            <Text style={[styles.trainingTitle, { color: colors.primary }]} numberOfLines={1}>
              {trainingTitle || 'Unknown Training'}
            </Text>
          </View>
          {drillName && (
            <Text style={[styles.drillName, { color: colors.textMuted }]}>
              Drill: {drillName}
            </Text>
          )}
        </View>
      )}

      {/* Meta Info Row */}
      <View style={styles.metaRow}>
        {session.team_name && (
          <View style={styles.metaItem}>
            <Ionicons name="people-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {session.team_name}
            </Text>
          </View>
        )}
        
        {session.workspace_name && session.workspace_name !== 'Personal' && (
          <View style={styles.metaItem}>
            <Ionicons name="business-outline" size={14} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {session.workspace_name}
            </Text>
          </View>
        )}
      </View>

    </TouchableOpacity>
  );
});

SessionCard.displayName = 'SessionCard';

const styles = StyleSheet.create({
  sessionCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  statusIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionTime: {
    fontSize: 12,
    marginTop: 2,
    letterSpacing: -0.1,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationText: {
    fontSize: 12,
    fontWeight: '600',
  },
  trainingInfo: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  trainingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  trainingTitle: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  drillName: {
    fontSize: 12,
    marginTop: 4,
    marginLeft: 24,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginTop: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    fontSize: 13,
  },
});

export default SessionCard;
