import { getSafeSessionDuration } from '@/utils/sessionDuration';
import { Ionicons } from '@expo/vector-icons';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import type { SessionWithDetails, ThemeColors } from './types';

// ============================================================================
// TYPES
// ============================================================================

export interface ParticipantStats {
  userId: string;
  userName: string;
  status: 'active' | 'completed' | 'not_started';
  sessionCount: number;
  completedSessions: number;
  totalDurationMin: number | null;
  drillName: string | null;
  lastActivity: string | null;
}

export interface AggregateStats {
  totalParticipants: number;
  activeNow: number;
  completed: number;
  notStarted: number;
}

interface TrainingSummaryProps {
  sessions: SessionWithDetails[];
  colors: ThemeColors;
  loading?: boolean;
}

// ============================================================================
// STATS CALCULATION
// ============================================================================

function calculateParticipantStats(sessions: SessionWithDetails[]): ParticipantStats[] {
  const statsMap = new Map<string, ParticipantStats>();

  for (const session of sessions) {
    const existing = statsMap.get(session.user_id);
    const isCompleted = session.status === 'completed';
    const isActive = session.status === 'active';

    // Calculate session duration with safety cap
    const durationSeconds = getSafeSessionDuration(session);
    const durationMin = durationSeconds / 60;

    if (existing) {
      existing.sessionCount++;
      if (isCompleted) existing.completedSessions++;
      if (durationMin > 0) {
        existing.totalDurationMin = (existing.totalDurationMin ?? 0) + durationMin;
      }
      // Update status - active takes priority
      if (isActive) {
        existing.status = 'active';
        existing.drillName = session.drill_name || null;
      }
      // Update last activity
      if (!existing.lastActivity || session.started_at > existing.lastActivity) {
        existing.lastActivity = session.started_at;
      }
    } else {
      statsMap.set(session.user_id, {
        userId: session.user_id,
        userName: session.user_full_name || 'Unknown',
        status: isActive ? 'active' : isCompleted ? 'completed' : 'not_started',
        sessionCount: 1,
        completedSessions: isCompleted ? 1 : 0,
        totalDurationMin: durationMin > 0 ? durationMin : null,
        drillName: isActive ? (session.drill_name || null) : null,
        lastActivity: session.started_at,
      });
    }
  }

  // Convert to array and sort: active first, then by last activity
  return Array.from(statsMap.values()).sort((a, b) => {
    if (a.status === 'active' && b.status !== 'active') return -1;
    if (b.status === 'active' && a.status !== 'active') return 1;
    if (a.lastActivity && b.lastActivity) {
      return new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime();
    }
    return 0;
  });
}

function calculateAggregateStats(participants: ParticipantStats[]): AggregateStats {
  return {
    totalParticipants: participants.length,
    activeNow: participants.filter(p => p.status === 'active').length,
    completed: participants.filter(p => p.status === 'completed').length,
    notStarted: participants.filter(p => p.status === 'not_started').length,
  };
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TrainingSummary({ sessions, colors, loading }: TrainingSummaryProps) {
  const [participants, setParticipants] = useState<ParticipantStats[]>([]);
  const [stats, setStats] = useState<AggregateStats | null>(null);

  const computeStats = useCallback(() => {
    const pStats = calculateParticipantStats(sessions);
    const aStats = calculateAggregateStats(pStats);
    setParticipants(pStats);
    setStats(aStats);
  }, [sessions]);

  useEffect(() => {
    computeStats();
  }, [computeStats]);

  if (sessions.length === 0 && !loading) {
    return null;
  }

  if (loading || !stats) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Ionicons name="people-outline" size={18} color={colors.textMuted} />
          <Text style={[styles.title, { color: colors.text }]}>Participants</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header with counts */}
      <View style={styles.header}>
        <Ionicons name="people-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.title, { color: colors.text }]}>Participants</Text>
        <View style={styles.countBadges}>
          {stats.activeNow > 0 && (
            <View style={[styles.countBadge, { backgroundColor: '#22C55E20' }]}>
              <View style={styles.activeDot} />
              <Text style={[styles.countText, { color: '#22C55E' }]}>{stats.activeNow}</Text>
            </View>
          )}
          <View style={[styles.countBadge, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.countText, { color: colors.textMuted }]}>
              {stats.completed}/{stats.totalParticipants}
            </Text>
          </View>
        </View>
      </View>

      {/* Participant List */}
      <View style={[styles.listCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {participants.map((participant, index) => (
          <ParticipantRow
            key={participant.userId}
            participant={participant}
            colors={colors}
            isLast={index === participants.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// PARTICIPANT ROW
// ============================================================================

interface ParticipantRowProps {
  participant: ParticipantStats;
  colors: ThemeColors;
  isLast: boolean;
}

function ParticipantRow({ participant, colors, isLast }: ParticipantRowProps) {
  const isActive = participant.status === 'active';
  const isCompleted = participant.completedSessions > 0;

  const formatDuration = (min: number | null) => {
    if (min === null) return null;
    const rounded = Math.round(min);
    if (rounded < 60) return `${rounded}m`;
    const hours = Math.floor(rounded / 60);
    const mins = rounded % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const getStatusInfo = () => {
    if (isActive) {
      return {
        label: participant.drillName || 'In session',
        color: '#22C55E',
        bg: '#22C55E15',
      };
    }
    if (isCompleted) {
      return {
        label: `${participant.completedSessions} session${participant.completedSessions > 1 ? 's' : ''}`,
        color: colors.textMuted,
        bg: colors.secondary,
      };
    }
    return null;
  };

  const statusInfo = getStatusInfo();
  const duration = formatDuration(participant.totalDurationMin);

  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
      ]}
    >
      {/* Status indicator */}
      <View style={styles.statusIndicator}>
        {isActive ? (
          <View style={styles.activePulse}>
            <View style={styles.activeDotLarge} />
          </View>
        ) : isCompleted ? (
          <Ionicons name="checkmark-circle" size={18} color={colors.textMuted} />
        ) : (
          <View style={[styles.emptyDot, { borderColor: colors.border }]} />
        )}
      </View>

      {/* Name and status */}
      <View style={styles.nameSection}>
        <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
          {participant.userName}
        </Text>
        {statusInfo && (
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.bg }]}>
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        )}
      </View>

      {/* Duration */}
      {duration && (
        <Text style={[styles.duration, { color: colors.textMuted }]}>{duration}</Text>
      )}
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
    flex: 1,
  },
  countBadges: {
    flexDirection: 'row',
    gap: 6,
  },
  countBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '600',
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  loadingContainer: {
    padding: 24,
    alignItems: 'center',
  },
  listCard: {
    borderRadius: 12,
    borderWidth: 0.5,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  statusIndicator: {
    width: 20,
    alignItems: 'center',
  },
  activePulse: {
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeDotLarge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  emptyDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1.5,
  },
  nameSection: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
  },
  duration: {
    fontSize: 12,
    fontWeight: '500',
  },
});
