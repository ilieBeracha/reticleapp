/**
 * TrainingSessionCard - Card displaying a session within training tabs
 *
 * Shows session info: distance, rounds, status, and result metrics
 * Different styling for completed/active/pending states
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/session/types';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { CheckCircle2, Clock, Crosshair, Play, Target, Users } from 'lucide-react-native';
import { useCallback } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

// ============================================================================
// TYPES
// ============================================================================

export interface TrainingSessionCardProps {
  session: SessionWithDetails;
  onPress?: (session: SessionWithDetails) => void;
  /** Whether this is the current user's session */
  isOwn?: boolean;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function TrainingSessionCard({ session, onPress, isOwn = true }: TrainingSessionCardProps) {
  const colors = useColors();

  const isCompleted = session.status === 'completed';
  const isActive = session.status === 'active';
  const isPending = session.status === 'pending';
  const isGrouping = session.drill_config?.drill_goal === 'grouping';
  const isSquad = session.engagement_mode === 'squad';

  // Extract metrics
  const distance = session.drill_config?.distance_m || 25;
  const rounds = session.drill_config?.rounds_per_shooter || session.stats?.shots_fired || 0;
  const shots = session.stats?.shots_fired || 0;
  const accuracy = session.stats?.accuracy_pct ?? null;
  const groupSize = session.stats?.best_dispersion_cm ?? null;

  const handlePress = useCallback(() => {
    if (onPress) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(session);
    }
  }, [onPress, session]);

  // Format time
  const timeAgo = session.ended_at
    ? formatDistanceToNow(new Date(session.ended_at), { addSuffix: true })
    : session.started_at
      ? formatDistanceToNow(new Date(session.started_at), { addSuffix: true })
      : '';

  return (
    <TouchableOpacity
      style={[
        styles.container,
        { backgroundColor: colors.card, borderColor: colors.border },
        isCompleted && { backgroundColor: colors.green + '05', borderColor: colors.green + '30' },
        isActive && { backgroundColor: colors.orange + '08', borderColor: colors.orange + '30' },
      ]}
      onPress={handlePress}
      activeOpacity={onPress ? 0.7 : 1}
      disabled={!onPress}
    >
      {/* Left: Status Icon */}
      <View
        style={[
          styles.statusIcon,
          {
            backgroundColor: isCompleted
              ? colors.green + '15'
              : isActive
                ? colors.orange + '15'
                : colors.secondary,
          },
        ]}
      >
        {isCompleted ? (
          <CheckCircle2 size={18} color={colors.green} />
        ) : isActive ? (
          <Play size={18} color={colors.orange} fill={colors.orange} />
        ) : isPending ? (
          <Clock size={18} color={colors.textMuted} />
        ) : isGrouping ? (
          <Crosshair size={18} color={colors.textMuted} />
        ) : (
          <Target size={18} color={colors.textMuted} />
        )}
      </View>

      {/* Center: Info */}
      <View style={styles.info}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: isCompleted ? colors.textMuted : colors.text }]} numberOfLines={1}>
            {distance}m • {isCompleted ? `${shots} shots` : `${rounds} rds`}
          </Text>
          {isSquad && (
            <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
              <Users size={10} color={colors.primary} />
              <Text style={[styles.squadText, { color: colors.primary }]}>Squad</Text>
            </View>
          )}
        </View>

        <View style={styles.metaRow}>
          {/* Status or Result */}
          {isActive ? (
            <Text style={[styles.metaText, { color: colors.orange }]}>In Progress...</Text>
          ) : isPending ? (
            <Text style={[styles.metaText, { color: colors.textMuted }]}>Waiting to start</Text>
          ) : isCompleted ? (
            <View style={styles.resultRow}>
              {isGrouping && groupSize !== null ? (
                <Text style={[styles.resultText, { color: colors.green }]}>
                  {groupSize.toFixed(1)}cm group
                </Text>
              ) : accuracy !== null ? (
                <Text style={[styles.resultText, { color: colors.green }]}>{Math.round(accuracy)}% accuracy</Text>
              ) : (
                <Text style={[styles.metaText, { color: colors.textMuted }]}>Completed</Text>
              )}
              {timeAgo && <Text style={[styles.timeText, { color: colors.textMuted }]}>• {timeAgo}</Text>}
            </View>
          ) : null}

          {/* User name for non-own sessions */}
          {!isOwn && session.user_full_name && (
            <Text style={[styles.userName, { color: colors.textMuted }]} numberOfLines={1}>
              {session.user_full_name}
            </Text>
          )}
        </View>
      </View>

      {/* Right: Type badge */}
      <View
        style={[
          styles.typeBadge,
          { backgroundColor: isGrouping ? colors.green + '12' : colors.orange + '12' },
        ]}
      >
        <Text style={[styles.typeText, { color: isGrouping ? colors.green : colors.orange }]}>
          {isGrouping ? 'G' : 'E'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  squadBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  squadText: {
    fontSize: 10,
    fontWeight: '600',
  },
  metaRow: {
    marginTop: 3,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  resultText: {
    fontSize: 12,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 11,
  },
  userName: {
    fontSize: 11,
    marginTop: 2,
  },
  typeBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '700',
  },
});
