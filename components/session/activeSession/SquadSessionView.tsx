/**
 * SquadSessionView
 *
 * Clean, minimal squad session view:
 * - Squad summary at top (totals)
 * - Participants progress (collapsible)
 * - Enter results bottom sheet (shots + hits)
 * - Commander can end session
 */

import { useColors } from '@/hooks/ui/useColors';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { calculateGroupTotals, updateParticipantResults } from '@/services/session/participants';
import type { EngagementParticipant } from '@/services/session/types';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronUp,
  Crown,
  Minus,
  Plus,
  Target,
  User,
  Users,
  X,
} from 'lucide-react-native';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

interface SquadSessionViewProps {
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
  targets: any[];
  isCommander: boolean;
  isViewOnly?: boolean;
  onRefresh: () => void;
  onEndSession: () => void;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

export function SquadSessionView({
  engagementId,
  session,
  participants,
  isCommander,
  isViewOnly = false,
  onRefresh,
  onEndSession,
}: SquadSessionViewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showParticipants, setShowParticipants] = useState(true);
  const [showResultsSheet, setShowResultsSheet] = useState(false);
  const [showHitsSheet, setShowHitsSheet] = useState(false);
  const [shotCount, setShotCount] = useState(0);
  const [totalHitsCount, setTotalHitsCount] = useState(0);
  const [saving, setSaving] = useState(false);

  // ─────────────────────────────────────────────────────────────────────────────
  // Get current user
  // ─────────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) setCurrentUserId(user.id);
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Computed values
  // ─────────────────────────────────────────────────────────────────────────────
  const groupTotals = calculateGroupTotals(participants);
  const myParticipant = participants.find((p) => p.user_id === currentUserId);
  const hasSubmitted = myParticipant && (myParticipant.shots_fired || 0) > 0;
  
  // Check if all participants have submitted their shots
  const shooters = participants.filter((p) => p.role === 'shooter');
  const allShotsSubmitted = shooters.length > 0 && shooters.every((p) => (p.shots_fired || 0) > 0);
  const hasAnyHits = groupTotals.totalHits > 0;

  // ─────────────────────────────────────────────────────────────────────────────
  // Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleOpenResultsSheet = () => {
    // Pre-fill with existing values if any
    setShotCount(myParticipant?.shots_fired || 0);
    setShowResultsSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleOpenHitsSheet = () => {
    // Pre-fill with existing total hits
    setTotalHitsCount(groupTotals.totalHits);
    setShowHitsSheet(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleSaveResults = async () => {
    if (!currentUserId || !engagementId) return;

    setSaving(true);
    try {
      // Save shots only (hits = 0 for individual entry)
      await updateParticipantResults(engagementId, currentUserId, shotCount, 0);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowResultsSheet(false);
      onRefresh();
    } catch (error) {
      console.error('[SquadSessionView] Failed to save:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to save results. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveTotalHits = async () => {
    if (!engagementId) return;

    // Validate hits <= total shots
    if (totalHitsCount > groupTotals.totalShotsFired) {
      Alert.alert(t('session.invalidEntry'), t('session.hitsCannotExceedShots'));
      return;
    }

    setSaving(true);
    try {
      // Distribute hits to the first shooter (commander) for simplicity
      // This keeps the total hits tracked at the group level
      const commanderParticipant = participants.find((p) => p.user_id === session.user_id);
      if (commanderParticipant) {
        await updateParticipantResults(
          engagementId,
          commanderParticipant.user_id,
          commanderParticipant.shots_fired || 0,
          totalHitsCount
        );
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowHitsSheet(false);
      onRefresh();
    } catch (error) {
      console.error('[SquadSessionView] Failed to save hits:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), t('session.failedSaveHits'));
    } finally {
      setSaving(false);
    }
  };

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

  const handleEndSessionPress = () => {
    Alert.alert(t('session.endSquadSession'), t('session.endSquadSessionMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('session.endSession'),
        style: 'destructive',
        onPress: onEndSession,
      },
    ]);
  };

  const adjustShots = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShotCount((prev) => Math.max(0, prev + delta));
  };

  const adjustTotalHits = (delta: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTotalHitsCount((prev) => Math.max(0, Math.min(groupTotals.totalShotsFired, prev + delta)));
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Header                                                                  */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={[styles.backBtn, { backgroundColor: colors.card }]} onPress={handleClose}>
          <ChevronLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || t('session.squadSession')}
          </Text>
          <View style={styles.headerMeta}>
            <Users size={12} color={colors.textMuted} />
            <Text style={[styles.headerMetaText, { color: colors.textMuted }]}>
              {t('session.reportedCount', { reported: groupTotals.submittedCount, total: groupTotals.totalCount })}
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* View-only banner */}
      {isViewOnly && (
        <View style={[styles.viewOnlyBanner, { backgroundColor: colors.orange + '15', borderColor: colors.orange }]}>
          <Users size={16} color={colors.orange} />
          <Text style={[styles.viewOnlyText, { color: colors.orange }]}>{t('session.viewingProgress')}</Text>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Content                                                                 */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={[styles.contentInner, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* Squad Summary                                                          */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <View style={[styles.summaryCard, { backgroundColor: colors.card }]}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{groupTotals.totalShotsFired}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.text }]}>{groupTotals.totalHits}</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('session.hits')}</Text>
            </View>
            <View style={[styles.summaryDivider, { backgroundColor: colors.border }]} />
            <View style={styles.summaryItem}>
              <Text style={[styles.summaryValue, { color: colors.green }]}>{groupTotals.accuracy}%</Text>
              <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>{t('session.accuracy')}</Text>
            </View>
          </View>
        </View>

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* Participants                                                           */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.sectionHeader, { backgroundColor: colors.card }]}
          onPress={() => setShowParticipants(!showParticipants)}
          activeOpacity={0.7}
        >
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('session.participants')}</Text>
          <View style={styles.sectionHeaderRight}>
            <Text style={[styles.sectionCount, { color: colors.textMuted }]}>{participants.length}</Text>
            {showParticipants ? (
              <ChevronUp size={18} color={colors.textMuted} />
            ) : (
              <ChevronDown size={18} color={colors.textMuted} />
            )}
          </View>
        </TouchableOpacity>

        {showParticipants && (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={[styles.participantsList, { backgroundColor: colors.card }]}
          >
            {participants.map((p, idx) => {
              const isMe = p.user_id === currentUserId;
              const isOwner = p.user_id === session.user_id;
              const hasData = (p.shots_fired || 0) > 0;
              const isShooter = p.role === 'shooter';

              return (
                <View
                  key={p.user_id}
                  style={[
                    styles.participantRow,
                    idx < participants.length - 1 && {
                      borderBottomWidth: 1,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  {/* Avatar */}
                  <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
                    {p.user_avatar_url ? (
                      <Image source={{ uri: p.user_avatar_url }} style={styles.avatarImage} />
                    ) : (
                      <User size={16} color={colors.textMuted} />
                    )}
                  </View>

                  {/* Info */}
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
                      {isOwner && <Crown size={12} color={colors.orange} />}
                    </View>
                    <Text style={[styles.participantMeta, { color: colors.textMuted }]}>
                      {!isShooter 
                        ? t('session.spotter')
                        : hasData 
                          ? t('session.shotsCount', { count: p.shots_fired ?? 0 })
                          : t('session.notReportedYet')}
                    </Text>
                  </View>

                  {/* Status */}
                  <View style={[styles.statusDot, { backgroundColor: hasData ? colors.green : colors.border }]}>
                    {hasData && <Check size={10} color="#fff" />}
                  </View>
                </View>
              );
            })}
          </Animated.View>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* My Results                                                             */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {!isViewOnly && hasSubmitted && (
          <View style={[styles.myResultsCard, { backgroundColor: colors.card }]}>
            <View style={styles.myResultsHeader}>
              <Text style={[styles.myResultsTitle, { color: colors.text }]}>{t('session.yourShots')}</Text>
              <View style={[styles.checkBadge, { backgroundColor: colors.green + '15' }]}>
                <Check size={12} color={colors.green} />
              </View>
            </View>
            <View style={styles.myResultsStats}>
              <View style={styles.myResultsStat}>
                <Text style={[styles.myResultsValue, { color: colors.text }]}>{myParticipant?.shots_fired || 0}</Text>
                <Text style={[styles.myResultsLabel, { color: colors.textMuted }]}>{t('session.shotsFired')}</Text>
              </View>
            </View>
            <TouchableOpacity
              style={[styles.updateBtn, { backgroundColor: colors.secondary }]}
              onPress={handleOpenResultsSheet}
            >
              <Text style={[styles.updateBtnText, { color: colors.text }]}>{t('session.updateShots')}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* Add Shots Button (if not submitted yet)                                */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {!isViewOnly && !hasSubmitted && myParticipant?.role === 'shooter' && (
          <TouchableOpacity
            style={[styles.addResultsCard, { backgroundColor: colors.primary }]}
            onPress={handleOpenResultsSheet}
            activeOpacity={0.8}
          >
            <Target size={24} color="#fff" />
            <View style={styles.addResultsText}>
              <Text style={styles.addResultsTitle}>{t('session.enterYourShots')}</Text>
              <Text style={styles.addResultsSubtitle}>{t('session.recordShotsFired')}</Text>
            </View>
            <Plus size={20} color="#fff" />
          </TouchableOpacity>
        )}

        {/* ─────────────────────────────────────────────────────────────────────── */}
        {/* Add Total Hits (Commander only, after all shots submitted)             */}
        {/* ─────────────────────────────────────────────────────────────────────── */}
        {isCommander && allShotsSubmitted && (
          <TouchableOpacity
            style={[
              styles.addResultsCard, 
              { backgroundColor: hasAnyHits ? colors.card : colors.green, borderWidth: hasAnyHits ? 1 : 0, borderColor: colors.border }
            ]}
            onPress={handleOpenHitsSheet}
            activeOpacity={0.8}
          >
            <Target size={24} color={hasAnyHits ? colors.green : '#fff'} />
            <View style={styles.addResultsText}>
              <Text style={[styles.addResultsTitle, { color: hasAnyHits ? colors.text : '#fff' }]}>
                {hasAnyHits ? t('session.totalHits', { hits: groupTotals.totalHits }) : t('session.addTotalHits')}
              </Text>
              <Text style={[styles.addResultsSubtitle, { color: hasAnyHits ? colors.textMuted : 'rgba(255,255,255,0.8)' }]}>
                {hasAnyHits ? t('session.accuracyTapToUpdate', { accuracy: groupTotals.accuracy }) : t('session.enterCombinedHits')}
              </Text>
            </View>
            {!hasAnyHits && <Plus size={20} color="#fff" />}
          </TouchableOpacity>
        )}

        {/* Waiting for shots message */}
        {isCommander && !allShotsSubmitted && shooters.length > 0 && (
          <View style={[styles.waitingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.waitingText, { color: colors.textMuted }]}>
              {t('session.waitingForShooters')}
            </Text>
            <Text style={[styles.waitingSubtext, { color: colors.textMuted }]}>
              {t('session.shootersReported', { reported: shooters.filter((p) => (p.shots_fired || 0) > 0).length, total: shooters.length })}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Bottom Bar (Commander only)                                             */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {isCommander && (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
          <TouchableOpacity
            style={[styles.endBtn, { backgroundColor: colors.destructive }]}
            onPress={handleEndSessionPress}
          >
            <X size={18} color="#fff" />
            <Text style={styles.endBtnText}>{t('session.endSquadSession')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Shots Entry Bottom Sheet                                                */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showResultsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowResultsSheet(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowResultsSheet(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}
            >
              {/* Handle */}
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('session.enterYourShots')}</Text>

              {/* Shots Counter */}
              <View style={styles.counterSection}>
                <Text style={[styles.counterLabel, { color: colors.textMuted }]}>{t('session.shotsFired')}</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustShots(-1)}
                    disabled={shotCount <= 0}
                  >
                    <Minus size={22} color={shotCount <= 0 ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                  <View style={styles.counterValue}>
                    <Text style={[styles.counterNumber, { color: colors.text }]}>{shotCount}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustShots(1)}
                  >
                    <Plus size={22} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {/* Quick add */}
                <View style={styles.quickAdd}>
                  {[5, 10, 20, 30].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.quickAddBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setShotCount(shotCount + n);
                      }}
                    >
                      <Text style={[styles.quickAddText, { color: colors.text }]}>+{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: shotCount > 0 ? colors.green : colors.secondary }]}
                onPress={handleSaveResults}
                disabled={saving || shotCount <= 0}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color={shotCount > 0 ? '#fff' : colors.textMuted} />
                    <Text style={[styles.saveBtnText, { color: shotCount > 0 ? '#fff' : colors.textMuted }]}>
                      Save Shots
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* Total Hits Entry Bottom Sheet (Commander only)                          */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showHitsSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowHitsSheet(false)}
      >
        <TouchableOpacity style={styles.sheetOverlay} activeOpacity={1} onPress={() => setShowHitsSheet(false)}>
          <TouchableOpacity activeOpacity={1} onPress={(e) => e.stopPropagation()}>
            <Animated.View
              entering={FadeInDown.duration(200)}
              style={[styles.sheet, { backgroundColor: colors.card, paddingBottom: insets.bottom + 20 }]}
            >
              {/* Handle */}
              <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />

              <Text style={[styles.sheetTitle, { color: colors.text }]}>{t('session.totalHitsTitle')}</Text>
              <Text style={[styles.sheetSubtitle, { color: colors.textMuted }]}>
                {t('session.combinedHitsDescription', {
                  count: shooters.length,
                  shooters: shooters.length,
                  shots: groupTotals.totalShotsFired,
                })}
              </Text>

              {/* Hits Counter */}
              <View style={styles.counterSection}>
                <Text style={[styles.counterLabel, { color: colors.textMuted }]}>{t('session.totalHits')}</Text>
                <View style={styles.counterRow}>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustTotalHits(-1)}
                    disabled={totalHitsCount <= 0}
                  >
                    <Minus size={22} color={totalHitsCount <= 0 ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                  <View style={styles.counterValue}>
                    <Text style={[styles.counterNumber, { color: colors.green }]}>{totalHitsCount}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.counterBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => adjustTotalHits(1)}
                    disabled={totalHitsCount >= groupTotals.totalShotsFired}
                  >
                    <Plus size={22} color={totalHitsCount >= groupTotals.totalShotsFired ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                </View>
                {/* Quick add */}
                <View style={styles.quickAdd}>
                  {[5, 10, 20, 30].map((n) => (
                    <TouchableOpacity
                      key={n}
                      style={[styles.quickAddBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setTotalHitsCount(Math.min(groupTotals.totalShotsFired, totalHitsCount + n));
                      }}
                    >
                      <Text style={[styles.quickAddText, { color: colors.text }]}>+{n}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Accuracy preview */}
                {groupTotals.totalShotsFired > 0 && (
                  <Text style={[styles.accuracyPreview, { color: colors.textMuted }]}>
                    {t('session.accuracyPreview', { accuracy: Math.round((totalHitsCount / groupTotals.totalShotsFired) * 100) })}
                  </Text>
                )}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.green }]}
                onPress={handleSaveTotalHits}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Check size={18} color="#fff" />
                    <Text style={[styles.saveBtnText, { color: '#fff' }]}>{t('session.saveTotalHits')}</Text>
                  </>
                )}
              </TouchableOpacity>
            </Animated.View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header
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
  headerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  headerMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // View-only
  viewOnlyBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  viewOnlyText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Content
  content: {
    flex: 1,
  },
  contentInner: {
    paddingHorizontal: 16,
    gap: 12,
  },

  // Summary
  summaryCard: {
    borderRadius: 14,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryValue: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  summaryDivider: {
    width: 1,
    height: 36,
  },

  // Section header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Participants
  participantsList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: 36,
    height: 36,
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
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '700',
  },
  participantMeta: {
    fontSize: 12,
  },
  statusDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // My results
  myResultsCard: {
    borderRadius: 14,
    padding: 16,
  },
  myResultsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  myResultsTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  checkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  myResultsStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  myResultsStat: {
    flex: 1,
    alignItems: 'center',
  },
  myResultsValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  myResultsLabel: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  myResultsDivider: {
    width: 1,
    height: 28,
  },
  updateBtn: {
    alignItems: 'center',
    paddingVertical: 10,
    borderRadius: 10,
  },
  updateBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Add results CTA
  addResultsCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    gap: 14,
  },
  addResultsText: {
    flex: 1,
  },
  addResultsTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.2,
  },
  addResultsSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
  },

  // Waiting card
  waitingCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  waitingText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 4,
  },
  waitingSubtext: {
    fontSize: 12,
    textAlign: 'center',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  endBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },

  // Bottom sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
    textAlign: 'center',
    marginBottom: 8,
  },
  sheetSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },

  // Counter
  counterSection: {
    marginBottom: 24,
  },
  counterLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  counterBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  counterValue: {
    minWidth: 80,
    alignItems: 'center',
  },
  counterNumber: {
    fontSize: 42,
    fontWeight: '800',
    letterSpacing: -1,
  },
  quickAdd: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginTop: 12,
  },
  quickAddBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  quickAddText: {
    fontSize: 13,
    fontWeight: '600',
  },
  accuracyPreview: {
    fontSize: 13,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 8,
  },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: 14,
    gap: 8,
  },
  saveBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
