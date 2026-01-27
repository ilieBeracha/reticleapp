/**
 * ActiveSquadSession
 *
 * Compact card showing active squad/group session status in trainingDetail.
 * Shows either lobby (waiting) or active session (with entry form).
 */

import { useColors } from '@/hooks/ui/useColors';
import { supabase } from '@/lib/supabase';
import {
  calculateGroupTotals,
  completeEngagement,
  getEngagementParticipants,
  getParticipantCounts,
  startEngagement,
  updateParticipantResults,
} from '@/services/session/participants';
import type { Engagement, EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { Check, ChevronRight, Minus, Play, Plus, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ActiveEngagementData {
  engagement: Engagement;
  sessionId: string;
  drillName: string;
  distanceM: number | null;
  roundsPerShooter: number | null;
  engagementMode: 'squad' | 'group';
  hasStarted: boolean;
  participants: EngagementParticipant[];
}

interface ActiveSquadSessionProps {
  trainingId: string;
  userId: string;
  isCommander: boolean;
  onSessionEnded?: () => void;
}

export function ActiveSquadSession({
  trainingId,
  userId,
  isCommander,
  onSessionEnded,
}: ActiveSquadSessionProps) {
  const colors = useColors();
  const [loading, setLoading] = useState(true);
  const [activeData, setActiveData] = useState<ActiveEngagementData | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [expanded, setExpanded] = useState(false);

  // Local state for user's shots entry (group mode)
  const [shotsFired, setShotsFired] = useState(0);
  const [hits, setHits] = useState(0);
  const [saving, setSaving] = useState(false);

  // Load active engagement for this training
  const loadActiveEngagement = useCallback(async () => {
    try {
      const { data: engagements, error: engError } = await supabase
        .from('engagements')
        .select(`id, session_id, engagement_mode, status, shooter_id, started_at`)
        .eq('training_id', trainingId)
        .in('engagement_mode', ['squad', 'group'])
        .not('status', 'in', '("completed","cancelled")')
        .order('created_at', { ascending: false })
        .limit(1);

      if (engError) throw engError;
      if (!engagements?.length) {
        setActiveData(null);
        setLoading(false);
        return;
      }

      const engagement = engagements[0];

      const { data: session, error: sessionError } = await supabase
        .from('sessions')
        .select('id, custom_drill_config')
        .eq('id', engagement.session_id)
        .single();

      if (sessionError) throw sessionError;

      const participants = await getEngagementParticipants(engagement.id);
      const drillConfig = session.custom_drill_config as any;
      const isGroup = engagement.engagement_mode === 'group';

      setActiveData({
        engagement: engagement as Engagement,
        sessionId: session.id,
        drillName: drillConfig?.name || (isGroup ? 'Group' : 'Squad'),
        distanceM: drillConfig?.distance_m || null,
        roundsPerShooter: drillConfig?.rounds_per_shooter || null,
        engagementMode: engagement.engagement_mode as 'squad' | 'group',
        hasStarted: !!engagement.started_at,
        participants,
      });

      // Initialize from user's existing data
      const myData = participants.find((p) => p.user_id === userId);
      if (myData?.shots_fired != null && myData.shots_fired > 0) {
        setShotsFired(myData.shots_fired);
        setHits(myData.hits ?? 0);
      }
    } catch (error) {
      console.error('[ActiveSquadSession] Failed to load:', error);
      setActiveData(null);
    } finally {
      setLoading(false);
    }
  }, [trainingId, userId]);

  useEffect(() => {
    loadActiveEngagement();
  }, [loadActiveEngagement]);

  // Realtime subscription
  useEffect(() => {
    if (!trainingId) return;

    const channel = supabase
      .channel(`active-squad-${trainingId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagement_participants' }, () =>
        loadActiveEngagement()
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'engagements' }, () =>
        loadActiveEngagement()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [trainingId, loadActiveEngagement]);

  const handleStartSession = async () => {
    if (!activeData || !isCommander) return;
    setActionLoading(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      await startEngagement(activeData.engagement.id);
      await loadActiveEngagement();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to start session');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEndSession = async () => {
    if (!activeData || !isCommander) return;
    Alert.alert('End Session?', 'Complete the session for all participants.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'End',
        style: 'destructive',
        onPress: async () => {
          setActionLoading(true);
          try {
            await completeEngagement(activeData.engagement.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            onSessionEnded?.();
            setActiveData(null);
          } catch (error) {
            Alert.alert('Error', 'Failed to end session');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  };

  const handleSubmitShots = async () => {
    if (!activeData || shotsFired === 0) return;
    setSaving(true);
    try {
      await updateParticipantResults(activeData.engagement.id, userId, shotsFired, hits);
      await loadActiveEngagement();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      Alert.alert('Error', 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading || !activeData) return null;

  const { hasStarted, participants, engagementMode, drillName, distanceM } = activeData;
  const isGroup = engagementMode === 'group';
  const counts = getParticipantCounts(participants);
  const totals = isGroup ? calculateGroupTotals(participants) : null;
  const myParticipant = participants.find((p) => p.user_id === userId);
  const hasSubmitted = myParticipant?.shots_fired != null && myParticipant.shots_fired > 0;
  const isParticipant = !!myParticipant && myParticipant.state === 'joined';

  const accentColor = hasStarted ? colors.green : colors.primary;

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={[styles.card, { backgroundColor: accentColor + '08', borderColor: accentColor }]}>
        {/* Compact Header Row */}
        <TouchableOpacity
          style={styles.headerRow}
          onPress={() => setExpanded(!expanded)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconBadge, { backgroundColor: accentColor + '20' }]}>
            <Users size={14} color={accentColor} />
          </View>
          <View style={styles.headerInfo}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>
              {hasStarted ? 'Session Active' : 'Lobby'}
            </Text>
            <Text style={[styles.headerMeta, { color: colors.textMuted }]}>
              {drillName}
              {distanceM ? ` · ${distanceM}m` : ''} · {counts.joined} ready
            </Text>
          </View>

          {/* Quick Stats or Status */}
          {hasStarted && totals ? (
            <View style={styles.quickStats}>
              <Text style={[styles.quickStatValue, { color: accentColor }]}>
                {totals.submittedCount}/{totals.totalCount}
              </Text>
            </View>
          ) : (
            <ChevronRight
              size={18}
              color={colors.textMuted}
              style={{ transform: [{ rotate: expanded ? '90deg' : '0deg' }] }}
            />
          )}
        </TouchableOpacity>

        {/* Expanded Content */}
        {expanded && (
          <View style={styles.expandedContent}>
            {/* Participants mini list */}
            <View style={styles.participantChips}>
              {participants
                .filter((p) => p.state === 'joined')
                .slice(0, 5)
                .map((p) => {
                  const pDone = p.shots_fired != null && p.shots_fired > 0;
                  return (
                    <View
                      key={p.id}
                      style={[
                        styles.chip,
                        { backgroundColor: pDone ? colors.green + '15' : colors.secondary },
                      ]}
                    >
                      <Text
                        style={[styles.chipText, { color: pDone ? colors.green : colors.textMuted }]}
                        numberOfLines={1}
                      >
                        {p.user_full_name?.split(' ')[0] || 'User'}
                      </Text>
                      {pDone && <Check size={10} color={colors.green} />}
                    </View>
                  );
                })}
              {participants.filter((p) => p.state === 'joined').length > 5 && (
                <Text style={[styles.moreText, { color: colors.textMuted }]}>
                  +{participants.filter((p) => p.state === 'joined').length - 5}
                </Text>
              )}
            </View>

            {/* Entry Form (Group mode, active, participant, not submitted) */}
            {isGroup && hasStarted && isParticipant && !hasSubmitted && (
              <View style={styles.entryRow}>
                <View style={styles.stepperCompact}>
                  <Text style={[styles.stepperLabelCompact, { color: colors.textMuted }]}>Shots</Text>
                  <View style={styles.stepperBtns}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShotsFired((s) => Math.max(0, s - 1));
                      }}
                      style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    >
                      <Minus size={12} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: colors.text }]}>{shotsFired}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShotsFired((s) => s + 1);
                      }}
                      style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    >
                      <Plus size={12} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={styles.stepperCompact}>
                  <Text style={[styles.stepperLabelCompact, { color: colors.textMuted }]}>Hits</Text>
                  <View style={styles.stepperBtns}>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHits((h) => Math.max(0, h - 1));
                      }}
                      style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    >
                      <Minus size={12} color={colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.stepValue, { color: colors.text }]}>{hits}</Text>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setHits((h) => Math.min(shotsFired, h + 1));
                      }}
                      style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    >
                      <Plus size={12} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.submitBtnCompact, { backgroundColor: colors.green }]}
                  onPress={handleSubmitShots}
                  disabled={saving || shotsFired === 0}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Check size={14} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Submitted indicator */}
            {isGroup && hasStarted && hasSubmitted && (
              <View style={[styles.submittedBadge, { backgroundColor: colors.green + '15' }]}>
                <Check size={12} color={colors.green} />
                <Text style={[styles.submittedText, { color: colors.green }]}>
                  {myParticipant?.shots_fired} shots · {myParticipant?.hits || 0} hits
                </Text>
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.actionRow}>
              {!hasStarted && isCommander && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.green }]}
                  onPress={handleStartSession}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <Play size={12} color="#fff" fill="#fff" />
                      <Text style={styles.actionBtnText}>Start</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {hasStarted && isCommander && (
                <TouchableOpacity
                  style={[styles.actionBtn, { backgroundColor: colors.destructive }]}
                  onPress={handleEndSession}
                  disabled={actionLoading}
                >
                  {actionLoading ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <X size={12} color="#fff" />
                      <Text style={styles.actionBtnText}>End</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  headerMeta: {
    fontSize: 12,
    marginTop: 1,
  },
  quickStats: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '700',
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
    gap: 10,
  },
  participantChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '500',
    maxWidth: 60,
  },
  moreText: {
    fontSize: 11,
    fontWeight: '500',
    paddingHorizontal: 4,
    alignSelf: 'center',
  },
  entryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  stepperCompact: {
    alignItems: 'center',
    gap: 4,
  },
  stepperLabelCompact: {
    fontSize: 10,
    fontWeight: '500',
  },
  stepperBtns: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepValue: {
    fontSize: 14,
    fontWeight: '600',
    width: 28,
    textAlign: 'center',
  },
  submitBtnCompact: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  submittedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  actionBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
