/**
 * SquadSessionView
 *
 * Squad session mode where:
 * - All participants are shown with their individual data
 * - Each participant can fill their own results
 * - Commander can fill for anyone and close the session
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import type { EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Camera, Check, ChevronLeft, Crosshair, Crown, Target, User, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface ParticipantData {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  targets_count: number;
  total_shots: number;
  total_hits: number;
  best_dispersion: number | null;
  has_submitted: boolean;
}

interface SquadSessionViewProps {
  sessionId: string;
  session: {
    id: string;
    user_id: string;
    drill_name?: string | null;
    drill_config?: {
      drill_goal?: string;
      distance_m?: number;
      rounds_per_shooter?: number;
    } | null;
    training_id?: string | null;
  };
  participants: EngagementParticipant[];
  targets: any[];
  isCommander: boolean;
  onRefresh: () => void;
  onEndSession: () => void;
}

export function SquadSessionView({
  sessionId,
  session,
  participants,
  targets,
  isCommander,
  onRefresh,
  onEndSession,
}: SquadSessionViewProps) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participantData, setParticipantData] = useState<ParticipantData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedParticipant, setSelectedParticipant] = useState<string | null>(null);

  // Get current user
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // Load participant data with their target stats
  const loadParticipantData = useCallback(async () => {
    try {
      // Get all participant profiles + always include commander
      const userIds = [...new Set([...participants.map((p) => p.user_id), session.user_id])];
      const { data: profiles } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);

      const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

      // Group targets by participant
      const participantTargets = new Map<string, typeof targets>();
      for (const target of targets) {
        const pid = target.participant_id || session.user_id; // Default to commander if no participant_id
        if (!participantTargets.has(pid)) {
          participantTargets.set(pid, []);
        }
        participantTargets.get(pid)!.push(target);
      }

      // Build participant data
      const data: ParticipantData[] = participants.map((p) => {
        const profile = profileMap.get(p.user_id);
        const pTargets = participantTargets.get(p.user_id) || [];

        let totalShots = 0;
        let totalHits = 0;
        let bestDispersion: number | null = null;

        for (const t of pTargets) {
          const paperResult = t.paper_result;
          const tacticalResult = t.tactical_result;

          if (paperResult) {
            totalShots += paperResult.bullets_fired || 0;
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

        return {
          user_id: p.user_id,
          full_name: profile?.full_name || 'Unknown',
          avatar_url: profile?.avatar_url || null,
          targets_count: pTargets.length,
          total_shots: totalShots,
          total_hits: totalHits,
          best_dispersion: bestDispersion,
          has_submitted: pTargets.length > 0,
        };
      });

      // Add commander if not in participants
      if (!participants.find((p) => p.user_id === session.user_id)) {
        const commanderProfile = profileMap.get(session.user_id);
        const commanderTargets = participantTargets.get(session.user_id) || [];

        let totalShots = 0;
        let totalHits = 0;
        let bestDispersion: number | null = null;

        for (const t of commanderTargets) {
          const paperResult = t.paper_result;
          const tacticalResult = t.tactical_result;

          if (paperResult) {
            totalShots += paperResult.bullets_fired || 0;
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

        data.unshift({
          user_id: session.user_id,
          full_name: commanderProfile?.full_name || 'Commander',
          avatar_url: commanderProfile?.avatar_url || null,
          targets_count: commanderTargets.length,
          total_shots: totalShots,
          total_hits: totalHits,
          best_dispersion: bestDispersion,
          has_submitted: commanderTargets.length > 0,
        });
      }

      setParticipantData(data);
    } catch (error) {
      console.error('[SquadSessionView] Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }, [participants, targets, session.user_id]);

  useEffect(() => {
    loadParticipantData();
  }, [loadParticipantData]);

  // Handle adding result for a participant
  const handleAddResult = (participantId: string) => {
    const isGrouping = session.drill_config?.drill_goal === 'grouping';
    const distance = session.drill_config?.distance_m || 25;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (isGrouping) {
      router.push({
        pathname: '/(protected)/scanTarget',
        params: {
          sessionId,
          participantId,
          distance: String(distance),
          drillGoal: 'grouping',
        },
      });
    } else {
      router.push({
        pathname: '/(protected)/tacticalTarget',
        params: {
          sessionId,
          participantId,
          distance: String(distance),
          drillGoal: 'engagement',
        },
      });
    }
  };

  // Handle close
  const handleClose = () => {
    if (session.training_id) {
      router.replace({
        pathname: '/(protected)/trainingDetail',
        params: { id: session.training_id },
      });
    } else {
      router.replace('/(protected)/(tabs)');
    }
  };

  // Handle end session
  const handleEndSessionPress = () => {
    Alert.alert('End Squad Session?', 'This will complete the session for all participants. Results will be saved.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End Session',
        style: 'destructive',
        onPress: onEndSession,
      },
    ]);
  };

  const isGrouping = session.drill_config?.drill_goal === 'grouping';
  const totalParticipants = participantData.length;
  const submittedCount = participantData.filter((p) => p.has_submitted).length;

  // Calculate squad totals
  const squadTotalShots = participantData.reduce((sum, p) => sum + p.total_shots, 0);
  const squadTotalHits = participantData.reduce((sum, p) => sum + p.total_hits, 0);
  const squadAccuracy = squadTotalShots > 0 ? Math.round((squadTotalHits / squadTotalShots) * 100) : 0;

  const renderParticipant = ({ item }: { item: ParticipantData }) => {
    const isMe = item.user_id === currentUserId;
    const isSessionOwner = item.user_id === session.user_id;
    const canAddForThis = isMe || isCommander;
    const accuracy = item.total_shots > 0 ? Math.round((item.total_hits / item.total_shots) * 100) : 0;

    return (
      <Animated.View entering={FadeIn.duration(200)}>
        <View
          style={[
            styles.participantCard,
            { backgroundColor: colors.card, borderColor: isMe ? colors.primary : colors.border },
          ]}
        >
          <View style={styles.participantHeader}>
            {/* Avatar */}
            <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
              {item.avatar_url ? (
                <Image source={{ uri: item.avatar_url }} style={styles.avatarImage} />
              ) : (
                <User size={20} color={colors.textMuted} />
              )}
            </View>

            {/* Name & badges */}
            <View style={styles.participantInfo}>
              <View style={styles.nameRow}>
                <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                  {item.full_name}
                </Text>
                {isMe && (
                  <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                    <Text style={[styles.badgeText, { color: colors.primary }]}>You</Text>
                  </View>
                )}
                {isSessionOwner && <Crown size={14} color={colors.orange} />}
              </View>
              <Text style={[styles.participantStatus, { color: colors.textMuted }]}>
                {item.has_submitted
                  ? `${item.targets_count} target${item.targets_count !== 1 ? 's' : ''} • ${item.total_shots} shots`
                  : 'No results yet'}
              </Text>
            </View>

            {/* Status indicator */}
            <View
              style={[styles.statusIndicator, { backgroundColor: item.has_submitted ? colors.green : colors.orange }]}
            >
              {item.has_submitted ? <Check size={12} color="#fff" /> : <Target size={12} color="#fff" />}
            </View>
          </View>

          {/* Stats row (if has data) */}
          {item.has_submitted && (
            <View style={[styles.statsRow, { borderTopColor: colors.border }]}>
              {isGrouping && item.best_dispersion != null ? (
                <View style={styles.statItem}>
                  <Text style={[styles.statValue, { color: colors.text }]}>{item.best_dispersion.toFixed(1)}cm</Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>best group</Text>
                </View>
              ) : (
                <>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>
                      {item.total_hits}/{item.total_shots}
                    </Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>hits</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={[styles.statValue, { color: colors.text }]}>{accuracy}%</Text>
                    <Text style={[styles.statLabel, { color: colors.textMuted }]}>accuracy</Text>
                  </View>
                </>
              )}
            </View>
          )}

          {/* Action button */}
          {canAddForThis && (
            <TouchableOpacity
              style={[styles.addResultBtn, { backgroundColor: item.has_submitted ? colors.secondary : colors.primary }]}
              onPress={() => handleAddResult(item.user_id)}
            >
              {isGrouping ? (
                <Camera size={16} color={item.has_submitted ? colors.text : '#fff'} />
              ) : (
                <Crosshair size={16} color={item.has_submitted ? colors.text : '#fff'} />
              )}
              <Text style={[styles.addResultText, { color: item.has_submitted ? colors.text : '#fff' }]}>
                {item.has_submitted ? 'Add More' : 'Add Result'}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={handleClose}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || 'Squad Session'}
          </Text>
          <View style={styles.headerSubtitle}>
            <Users size={12} color={colors.textMuted} />
            <Text style={[styles.headerSubtitleText, { color: colors.textMuted }]}>
              {submittedCount}/{totalParticipants} submitted
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Squad summary card */}
      <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>
              {isGrouping ? targets.length : squadTotalShots}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{isGrouping ? 'groups' : 'shots'}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{isGrouping ? '-' : squadTotalHits}</Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{isGrouping ? '-' : 'hits'}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>
              {isGrouping ? '-' : `${squadAccuracy}%`}
            </Text>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{isGrouping ? '-' : 'accuracy'}</Text>
          </View>
        </View>
      </View>

      {/* Participants list */}
      <FlatList
        data={participantData}
        renderItem={renderParticipant}
        keyExtractor={(item) => item.user_id}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={<Text style={[styles.sectionTitle, { color: colors.text }]}>Participants</Text>}
      />

      {/* Bottom bar - Commander only */}
      {isCommander && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.endSessionBtn, { backgroundColor: colors.destructive }]}
            onPress={handleEndSessionPress}
          >
            <X size={18} color="#fff" />
            <Text style={styles.endSessionText}>End Squad Session</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerSubtitleText: {
    fontSize: 12,
    fontWeight: '500',
  },
  summaryCard: {
    marginHorizontal: 16,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 32,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 12,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  participantCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 44,
    height: 44,
  },
  participantInfo: {
    flex: 1,
    marginLeft: 12,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  participantStatus: {
    fontSize: 13,
    marginTop: 2,
  },
  statusIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  addResultBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    marginTop: 12,
    gap: 6,
  },
  addResultText: {
    fontSize: 14,
    fontWeight: '600',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  endSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  endSessionText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
