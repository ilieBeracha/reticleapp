/**
 * SquadParticipantsCard
 *
 * Collapsible card showing squad session participants and their stats.
 * - Collapsed: Shows summary (participant count, total shots, accuracy)
 * - Expanded: Shows each participant with their individual stats
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import type { EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { Check, ChevronDown, Crown, Target, User, Users } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeOut, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

interface ParticipantStats {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  targets_count: number;
  total_shots: number;
  total_hits: number;
  best_dispersion: number | null;
  has_submitted: boolean;
}

interface SquadParticipantsCardProps {
  sessionId: string;
  sessionOwnerId: string;
  participants: EngagementParticipant[];
  targets: any[];
  drillGoal?: string;
}

export function SquadParticipantsCard({
  sessionId,
  sessionOwnerId,
  participants,
  targets,
  drillGoal,
}: SquadParticipantsCardProps) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participantStats, setParticipantStats] = useState<ParticipantStats[]>([]);

  const rotation = useSharedValue(0);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Load participant stats
  const loadStats = useCallback(async () => {
    try {
      // Get all participant profiles + commander
      const userIds = [...new Set([...participants.map((p) => p.user_id), sessionOwnerId])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);
      const stats: ParticipantStats[] = [];

      // Process each user (commander + participants)
      for (const userId of userIds) {
        const profile = profileMap.get(userId);
        const userTargets = targets.filter((t) => t.user_id === userId);

        let totalShots = 0;
        let totalHits = 0;
        let bestDispersion: number | null = null;

        for (const target of userTargets) {
          const paperResult = target.paper_result;
          const tacticalResult = target.tactical_result;

          if (paperResult) {
            totalShots += paperResult.bullets_fired || paperResult.shots_fired || 0;
            totalHits += paperResult.hits_total || 0;
            if (paperResult.dispersion_cm != null) {
              if (bestDispersion == null || paperResult.dispersion_cm < bestDispersion) {
                bestDispersion = paperResult.dispersion_cm;
              }
            }
          }

          if (tacticalResult) {
            totalShots += tacticalResult.bullets_fired || 0;
            totalHits += tacticalResult.hits || 0;
          }
        }

        stats.push({
          user_id: userId,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          targets_count: userTargets.length,
          total_shots: totalShots,
          total_hits: totalHits,
          best_dispersion: bestDispersion,
          has_submitted: userTargets.length > 0,
        });
      }

      // Sort: commander first, then by shots (most active first)
      stats.sort((a, b) => {
        if (a.user_id === sessionOwnerId) return -1;
        if (b.user_id === sessionOwnerId) return 1;
        return b.total_shots - a.total_shots;
      });

      setParticipantStats(stats);
    } catch (error) {
      console.error('[SquadParticipantsCard] Error loading stats:', error);
    }
  }, [participants, targets, sessionOwnerId]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const toggleExpanded = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    rotation.value = withTiming(expanded ? 0 : 180, { duration: 200 });
    setExpanded(!expanded);
  };

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  // Calculate squad totals
  const totalParticipants = participantStats.length;
  const submittedCount = participantStats.filter((p) => p.has_submitted).length;
  const squadTotalShots = participantStats.reduce((sum, p) => sum + p.total_shots, 0);
  const squadTotalHits = participantStats.reduce((sum, p) => sum + p.total_hits, 0);
  const squadAccuracy = squadTotalShots > 0 ? Math.round((squadTotalHits / squadTotalShots) * 100) : null;

  const isGrouping = drillGoal === 'grouping';

  return (
    <View style={[styles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header - Always visible, tap to expand */}
      <TouchableOpacity style={styles.header} onPress={toggleExpanded} activeOpacity={0.7}>
        <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
          <Users size={18} color={colors.primary} />
        </View>

        <View style={styles.headerContent}>
          <Text style={[styles.title, { color: colors.text }]}>Squad Session</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {submittedCount}/{totalParticipants} submitted
            {squadTotalShots > 0 && ` • ${squadTotalShots} shots`}
            {squadAccuracy !== null && ` • ${squadAccuracy}%`}
          </Text>
        </View>

        <Animated.View style={chevronStyle}>
          <ChevronDown size={20} color={colors.textMuted} />
        </Animated.View>
      </TouchableOpacity>

      {/* Expanded content - Participant list */}
      {expanded && (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.content}>
          {participantStats.map((participant, index) => {
            const isMe = participant.user_id === currentUserId;
            const isCommander = participant.user_id === sessionOwnerId;
            const accuracy =
              participant.total_shots > 0 ? Math.round((participant.total_hits / participant.total_shots) * 100) : null;

            return (
              <View
                key={participant.user_id}
                style={[
                  styles.participantRow,
                  index < participantStats.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                {/* Avatar */}
                <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                  {participant.avatar_url ? (
                    <Image source={{ uri: participant.avatar_url }} style={styles.avatarImage} />
                  ) : (
                    <User size={16} color={colors.textMuted} />
                  )}
                </View>

                {/* Info */}
                <View style={styles.participantInfo}>
                  <View style={styles.nameRow}>
                    <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                      {participant.full_name}
                    </Text>
                    {isMe && (
                      <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                        <Text style={[styles.badgeText, { color: colors.primary }]}>You</Text>
                      </View>
                    )}
                    {isCommander && <Crown size={12} color={colors.orange} />}
                  </View>
                  <Text style={[styles.participantMeta, { color: colors.textMuted }]}>
                    {participant.has_submitted
                      ? isGrouping && participant.best_dispersion != null
                        ? `${participant.best_dispersion.toFixed(1)}cm • ${participant.total_shots} shots`
                        : `${participant.total_shots} shots • ${participant.total_hits} hits`
                      : 'No results yet'}
                  </Text>
                </View>

                {/* Stats */}
                <View style={styles.statsContainer}>
                  {participant.has_submitted ? (
                    <>
                      {isGrouping && participant.best_dispersion != null ? (
                        <Text style={[styles.statValue, { color: colors.green }]}>
                          {participant.best_dispersion.toFixed(1)}cm
                        </Text>
                      ) : accuracy !== null ? (
                        <Text style={[styles.statValue, { color: colors.green }]}>{accuracy}%</Text>
                      ) : (
                        <Check size={16} color={colors.green} />
                      )}
                    </>
                  ) : (
                    <Target size={16} color={colors.textMuted} />
                  )}
                </View>
              </View>
            );
          })}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerContent: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  content: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  participantInfo: {
    flex: 1,
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  participantMeta: {
    fontSize: 12,
    fontWeight: '400',
  },
  statsContainer: {
    minWidth: 50,
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
  },
});
