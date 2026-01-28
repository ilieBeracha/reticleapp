/**
 * GroupSessionView
 *
 * Simple group session mode where:
 * - Each participant enters their total SHOTS FIRED (required)
 * - Hits is OPTIONAL (secondary)
 * - User can only submit ONCE (no editing after submission)
 * - Results aggregate to group totals
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import {
  calculateGroupTotals,
  getEngagementParticipants,
  updateParticipantResults,
} from '@/services/session/participants';
import type { EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Check, ChevronLeft, Minus, Plus, Send, User, Users, X } from 'lucide-react-native';
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface GroupSessionViewProps {
  sessionId: string;
  engagementId: string;
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
  isCommander: boolean;
  isViewOnly?: boolean;
  onRefresh: () => void;
  onEndSession: () => void;
}

export function GroupSessionView({
  sessionId: _sessionId,
  engagementId,
  session,
  participants: initialParticipants,
  isCommander,
  isViewOnly = false,
  onRefresh: _onRefresh,
  onEndSession,
}: GroupSessionViewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<EngagementParticipant[]>(initialParticipants);
  const [saving, setSaving] = useState(false);

  // Local state for current user's input
  const [shotsFired, setShotsFired] = useState(0);
  const [hits, setHits] = useState<number | null>(null); // null = not entered (optional)
  const [localStateInitialized, setLocalStateInitialized] = useState(false);

  // Get current user - only initialize local state ONCE
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setCurrentUserId(user.id);
        // Only initialize local state if not already done
        if (!localStateInitialized) {
          const myData = participants.find((p) => p.user_id === user.id);
          if (myData?.shots_fired != null && myData.shots_fired > 0) {
            setShotsFired(myData.shots_fired);
            setHits(myData.hits ?? null);
          }
          setLocalStateInitialized(true);
        }
      }
    });
  }, [participants, localStateInitialized]);

  // Subscribe to realtime updates on engagement_participants
  useEffect(() => {
    if (!engagementId) return;

    const channel = supabase
      .channel(`group-participants-${engagementId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'engagement_participants',
          filter: `engagement_id=eq.${engagementId}`,
        },
        async () => {
          // Reload participants on any change
          try {
            const updated = await getEngagementParticipants(engagementId);
            setParticipants(updated);
          } catch (error) {
            console.error('[GroupSessionView] Realtime reload error:', error);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [engagementId]);

  // Calculate group totals
  const totals = calculateGroupTotals(participants);

  // Check if current user has already submitted
  const myParticipant = participants.find((p) => p.user_id === currentUserId);
  const hasSubmitted = myParticipant?.shots_fired != null && myParticipant.shots_fired > 0;

  // Handle submitting entry (one-time only)
  const handleSubmitEntry = useCallback(async () => {
    if (!currentUserId || !engagementId || hasSubmitted) return;

    if (shotsFired === 0) {
      Alert.alert(t('session.enterShots'), t('session.enterShotsMessage'));
      return;
    }

    setSaving(true);
    try {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await updateParticipantResults(engagementId, currentUserId, shotsFired, hits ?? 0);
      // Refresh participants
      const updated = await getEngagementParticipants(engagementId);
      setParticipants(updated);
    } catch (error) {
      console.error('[GroupSessionView] Save error:', error);
      Alert.alert(t('common.error'), t('session.failedSaveEntry'));
    } finally {
      setSaving(false);
    }
  }, [currentUserId, engagementId, shotsFired, hits, hasSubmitted]);

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
    Alert.alert(
      t('session.endGroupSession'),
      t('session.endGroupSessionMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('session.endSession'),
          style: 'destructive',
          onPress: onEndSession,
        },
      ]
    );
  };

  // Stepper handlers for shots
  const handleShotsDecrement = () => {
    if (hasSubmitted || shotsFired <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newShots = shotsFired - 1;
    setShotsFired(newShots);
    // Ensure hits doesn't exceed shots
    if (hits != null && hits > newShots) setHits(newShots);
  };

  const handleShotsIncrement = () => {
    if (hasSubmitted) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShotsFired(shotsFired + 1);
  };

  // Stepper handlers for hits (optional)
  const handleHitsDecrement = () => {
    if (hasSubmitted) return;
    if (hits == null || hits <= 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHits(hits - 1);
  };

  const handleHitsIncrement = () => {
    if (hasSubmitted) return;
    const currentHits = hits ?? 0;
    if (currentHits >= shotsFired) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setHits(currentHits + 1);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={handleClose}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || t('session.groupSession')}
          </Text>
          <View style={styles.headerSubtitle}>
            <Users size={12} color={colors.textMuted} />
            <Text style={[styles.headerSubtitleText, { color: colors.textMuted }]}>
              {t('session.submittedCount', { submitted: totals.submittedCount, total: totals.totalCount })}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={[styles.listContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* View-only banner for non-participants */}
        {isViewOnly && (
          <View style={[styles.viewOnlyBanner, { backgroundColor: colors.orange + '15', borderColor: colors.orange }]}>
            <Users size={16} color={colors.orange} />
            <Text style={[styles.viewOnlyText, { color: colors.orange }]}>
              {t('session.viewingProgress')}
            </Text>
          </View>
        )}

        {/* Group Totals Card */}
        <Animated.View entering={FadeIn.duration(300)}>
          <View style={[styles.totalsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.totalsTitle, { color: colors.textMuted }]}>{t('session.groupTotals')}</Text>
            <View style={styles.totalsRow}>
              <View style={styles.totalsItem}>
                <Text style={[styles.totalsValue, { color: colors.text }]}>{totals.totalShotsFired}</Text>
                <Text style={[styles.totalsLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
              </View>
              <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />
              <View style={styles.totalsItem}>
                <Text style={[styles.totalsValue, { color: colors.text }]}>
                  {totals.submittedCount}/{totals.totalCount}
                </Text>
                <Text style={[styles.totalsLabel, { color: colors.textMuted }]}>{t('session.submitted')}</Text>
              </View>
              {totals.totalHits > 0 && (
                <>
                  <View style={[styles.totalsDivider, { backgroundColor: colors.border }]} />
                  <View style={styles.totalsItem}>
                    <Text style={[styles.totalsValue, { color: colors.green }]}>{totals.totalHits}</Text>
                    <Text style={[styles.totalsLabel, { color: colors.textMuted }]}>{t('session.hits')}</Text>
                  </View>
                </>
              )}
            </View>
          </View>
        </Animated.View>

        {/* Your Entry Section - hide for view-only mode */}
        {!isViewOnly && (
          <View style={[styles.entryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.entryHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('session.yourEntry')}</Text>
              {hasSubmitted && (
                <View style={[styles.submittedBadge, { backgroundColor: colors.green + '15' }]}>
                  <Check size={12} color={colors.green} />
                  <Text style={[styles.submittedText, { color: colors.green }]}>{t('session.submitted')}</Text>
                </View>
              )}
            </View>

            {hasSubmitted ? (
              // Show submitted data (read-only)
              <View style={styles.submittedInfo}>
                <View style={styles.submittedRow}>
                  <Text style={[styles.submittedLabel, { color: colors.textMuted }]}>{t('session.shotsFired')}</Text>
                  <Text style={[styles.submittedValue, { color: colors.text }]}>{myParticipant?.shots_fired}</Text>
                </View>
                {myParticipant?.hits != null && myParticipant.hits > 0 && (
                  <View style={styles.submittedRow}>
                    <Text style={[styles.submittedLabel, { color: colors.textMuted }]}>{t('session.hits')}</Text>
                    <Text style={[styles.submittedValue, { color: colors.green }]}>{myParticipant.hits}</Text>
                  </View>
                )}
              </View>
            ) : (
              // Entry form
              <>
                {/* Shots Fired - Required */}
                <View style={styles.stepperSection}>
                  <Text style={[styles.stepperLabel, { color: colors.text }]}>{t('session.shotsFired')}</Text>
                  <View style={styles.stepperRow}>
                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
                      onPress={handleShotsDecrement}
                      disabled={shotsFired <= 0}
                    >
                      <Minus size={24} color={shotsFired <= 0 ? colors.textMuted : colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                    <View style={[styles.shotsValueContainer, { backgroundColor: colors.secondary }]}>
                      <Text style={[styles.shotsValue, { color: colors.text }]}>{shotsFired}</Text>
                    </View>
                    <TouchableOpacity
                      style={[styles.stepperBtn, { backgroundColor: colors.secondary }]}
                      onPress={handleShotsIncrement}
                    >
                      <Plus size={24} color={colors.text} strokeWidth={2.5} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hits - Optional */}
                <View style={styles.optionalSection}>
                  <View style={styles.optionalHeader}>
                    <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>{t('session.hitsOptional')}</Text>
                  </View>
                  <View style={styles.hitsRow}>
                    <TouchableOpacity
                      style={[styles.hitsBtn, { backgroundColor: colors.secondary }]}
                      onPress={handleHitsDecrement}
                      disabled={hits == null || hits <= 0}
                    >
                      <Minus size={18} color={hits == null || hits <= 0 ? colors.textMuted : colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.hitsValue, { color: hits != null ? colors.text : colors.textMuted }]}>
                      {hits ?? '-'}
                    </Text>
                    <TouchableOpacity
                      style={[styles.hitsBtn, { backgroundColor: colors.secondary }]}
                      onPress={handleHitsIncrement}
                      disabled={(hits ?? 0) >= shotsFired}
                    >
                      <Plus size={18} color={(hits ?? 0) >= shotsFired ? colors.textMuted : colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[
                    styles.submitBtn,
                    { backgroundColor: shotsFired > 0 ? colors.primary : colors.secondary },
                  ]}
                  onPress={handleSubmitEntry}
                  disabled={saving || shotsFired === 0}
                >
                  {saving ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <>
                      <Send size={18} color={shotsFired > 0 ? '#fff' : colors.textMuted} />
                      <Text style={[styles.submitBtnText, { color: shotsFired > 0 ? '#fff' : colors.textMuted }]}>
                        {t('session.submitEntry')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        )}

        {/* Team Results Section */}
        <Text style={[styles.teamResultsTitle, { color: colors.textMuted }]}>{t('session.team')}</Text>
        {participants.map((p) => {
          const isMe = p.user_id === currentUserId;
          const pHasSubmitted = p.shots_fired != null && p.shots_fired > 0;

          return (
            <Animated.View key={p.id} entering={FadeIn.duration(200)}>
              <View
                style={[
                  styles.participantCard,
                  { backgroundColor: colors.card, borderColor: isMe ? colors.primary : colors.border },
                ]}
              >
                <View style={styles.participantRow}>
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    {p.user_avatar_url ? (
                      <Image source={{ uri: p.user_avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User size={18} color={colors.textMuted} />
                    )}
                  </View>

                  {/* Name + Status */}
                  <View style={styles.participantInfo}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                        {p.user_full_name || t('common.unknown')}
                      </Text>
                      {isMe && (
                        <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
                          <Text style={[styles.badgeText, { color: colors.primary }]}>{t('common.you')}</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.participantStatus, { color: colors.textMuted }]}>
                      {pHasSubmitted
                        ? t('session.participantResults', { shots: p.shots_fired, hits: p.hits || 0 })
                        : t('session.waiting')}
                    </Text>
                  </View>

                  {/* Status indicator */}
                  <View
                    style={[styles.statusIndicator, { backgroundColor: pHasSubmitted ? colors.green : colors.orange }]}
                  >
                    {pHasSubmitted ? <Check size={12} color="#fff" /> : <Minus size={12} color="#fff" />}
                  </View>
                </View>
              </View>
            </Animated.View>
          );
        })}
      </ScrollView>

      {/* Bottom bar - Commander only */}
      {isCommander && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.endSessionBtn, { backgroundColor: colors.destructive }]}
            onPress={handleEndSessionPress}
          >
            <X size={18} color="#fff" />
            <Text style={styles.endSessionText}>{t('session.endGroupSession')}</Text>
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
  scrollContent: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
  },
  totalsCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  totalsTitle: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textAlign: 'center',
    marginBottom: 12,
  },
  totalsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  totalsItem: {
    flex: 1,
    alignItems: 'center',
  },
  totalsValue: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  totalsLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  totalsDivider: {
    width: 1,
    height: 32,
  },
  entryCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  submittedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  submittedText: {
    fontSize: 12,
    fontWeight: '600',
  },
  submittedInfo: {
    gap: 12,
    paddingVertical: 8,
  },
  submittedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  submittedLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  submittedValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  stepperSection: {
    alignItems: 'center',
  },
  stepperLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  stepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotsValueContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shotsValue: {
    fontSize: 40,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  optionalSection: {
    marginTop: 24,
    alignItems: 'center',
  },
  optionalHeader: {
    marginBottom: 12,
  },
  optionalLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  hitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  hitsBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitsValue: {
    fontSize: 24,
    fontWeight: '600',
    width: 50,
    textAlign: 'center',
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 12,
    marginTop: 24,
    gap: 8,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
  teamResultsTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  participantCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 40,
    height: 40,
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
    fontSize: 15,
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
  viewOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  viewOnlyText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
