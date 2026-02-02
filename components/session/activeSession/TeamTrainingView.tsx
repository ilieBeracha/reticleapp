/**
 * TeamTrainingView
 *
 * Clean execution view for team training drills.
 * - Shows params, progress, targets
 * - Bottom sheet for result entry
 */

import { TargetCard } from '@/components/session/TargetCard';
import { WeatherStrip } from '@/components/session/WeatherDisplay';
import { MissMarker } from '@/components/targets/MissMarker';
import { COLORS } from '@/constants/activeSession';
import { PAPER_TYPE, RANGE_CATEGORIES } from '@/constants/drill';
import { useColors } from '@/hooks/ui/useColors';
import { addTargetWithPaperResult, addTargetWithTacticalResult } from '@/services/session/mutations';
import { updateTacticalMissPoints } from '@/services/session/targets';
import type { DrillProgress, WatchState } from '@/types/activeSession';
import type { MissPoint, SessionDrillConfig, SessionWithDetails } from '@/types/session';
import { formatDistanceDisplay, formatTime } from '@/utils/activeSession.helpers';
import { isGroupingSession } from '@/utils/drillGoal';
import * as Haptics from 'expo-haptics';
import { Camera, Check, ChevronDown, Crosshair, Lock, MapPin, Minus, Plus, Square, Target, Zap } from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from './activeSession.styles';
import { HeroTarget } from './components/HeroTarget';
import { MissDataCard } from './components/MissDataCard';

interface TeamTrainingViewProps {
  session: SessionWithDetails;
  targets: any[];
  insets: EdgeInsets;
  elapsedTime: number;
  drill: SessionDrillConfig | null | undefined;
  drillProgress: DrillProgress | null;
  watchState: WatchState;
  canAddTarget: boolean;
  onScanRoute: () => void;
  onTargetPress: (target: any) => void;
  onEndSession: () => void;
  onRefresh: () => void;
  ending: boolean;
  onWeaponPress?: () => void;
  onDistanceSet?: (distance: number) => void;
  weather?: any;
  weatherLoading?: boolean;
  weatherError?: string | null;
}

export function TeamTrainingView({
  session,
  targets,
  insets,
  elapsedTime,
  drill,
  drillProgress,
  watchState,
  canAddTarget,
  onScanRoute,
  onTargetPress,
  onEndSession,
  onRefresh,
  ending,
  onWeaponPress,
  onDistanceSet,
  weather,
  weatherLoading,
  weatherError,
}: TeamTrainingViewProps) {
  const { t } = useTranslation();
  const colors = useColors();
  const [showSheet, setShowSheet] = useState(false);

  const isGrouping = isGroupingSession(session);
  const drillComplete = drillProgress?.isComplete && drillProgress?.meetsAccuracy;
  const bullets = session.soldier_bullets ?? drill?.rounds_per_shooter ?? 5;

  // Distance range
  const distanceRange = useMemo(() => {
    if (!drill?.distance_category) return null;
    const category = RANGE_CATEGORIES.find((c) => c.value === drill.distance_category);
    if (!category) return null;
    return { min: category.min, max: category.max ?? 1000 };
  }, [drill?.distance_category]);

  // Allow distance selection if there's a range - user can choose for each target
  const canSelectDistance = !!distanceRange;
  const effectiveDistance = session.soldier_distance_m ?? drill?.distance_m ?? 25;
  
  // Calculate middle point for default distance
  const defaultRangeDistance = useMemo(() => {
    if (!distanceRange) return effectiveDistance;
    // Round to nearest 50 for cleaner defaults
    const middle = Math.round((distanceRange.min + distanceRange.max) / 2 / 50) * 50;
    return middle;
  }, [distanceRange, effectiveDistance]);
  
  // Get the last target's distance to use as default, or middle of range for first target
  const lastTargetDistance = useMemo(() => {
    if (targets.length > 0) {
      return targets[0]?.distance_m ?? defaultRangeDistance;
    }
    return defaultRangeDistance;
  }, [targets, defaultRangeDistance]);

  // Sheet state
  const [localDistance, setLocalDistance] = useState(effectiveDistance);
  const [hits, setHits] = useState(0);
  const [groupSizeCm, setGroupSizeCm] = useState('');
  const [groupingShots, setGroupingShots] = useState(5);
  const [saving, setSaving] = useState(false);
  const [firstShotHit, setFirstShotHit] = useState<boolean | null>(null);

  // Miss Marker modal state
  const [showMissMarker, setShowMissMarker] = useState(false);
  const [pendingMissMarker, setPendingMissMarker] = useState(false);
  // Store tactical result ID for updating miss_points after MissMarker completes
  const [pendingTacticalResultId, setPendingTacticalResultId] = useState<string | null>(null);
  
  // Expanded target state (for click to expand)
  const [expandedTargetId, setExpandedTargetId] = useState<string | null>(null);

  // Effect: Show MissMarker after sheet closes (can't stack pageSheet modals on iOS)
  useEffect(() => {
    if (!showSheet && pendingMissMarker) {
      setPendingMissMarker(false);
      setShowMissMarker(true);
    }
  }, [showSheet, pendingMissMarker]);

  const accuracy = bullets > 0 ? Math.round((hits / bullets) * 100) : 0;

  const openSheet = useCallback(() => {
    // Reset state when opening - use last target's distance as default
    setLocalDistance(lastTargetDistance);
    setHits(0);
    setGroupSizeCm('');
    setGroupingShots(5);
    setFirstShotHit(null);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowSheet(true);
  }, [lastTargetDistance]);

  const closeSheet = useCallback(() => {
    setShowSheet(false);
  }, []);

  // Check if distance is outside recommended range (above or below)
  const isDistanceOutOfRange = canSelectDistance && (localDistance > distanceRange!.max || localDistance < distanceRange!.min);
  // Step size: 5m when outside range, 50m when inside
  const distanceStep = isDistanceOutOfRange ? 5 : 50;
  
  // Calculate misses for current entry
  const missCount = bullets - hits;

  // Save target immediately (without waiting for miss marking)
  const doSave = useCallback(async () => {
    setSaving(true);

    try {
      const finalDistance = canSelectDistance ? localDistance : effectiveDistance;

      // Set the distance on session if it's the first target
      if (canSelectDistance && !session.soldier_distance_m) {
        onDistanceSet?.(localDistance);
      }

      if (isGrouping) {
        await addTargetWithPaperResult({
          session_id: session.id,
          distance_m: finalDistance,
          lane_number: null,
          planned_shots: groupingShots,
          participant_id: undefined,
          paper_type: PAPER_TYPE.GROUPING,
          bullets_fired: groupingShots,
          dispersion_cm: parseFloat(groupSizeCm),
          result_notes: null,
        });
      } else {
        // Save target without miss_points first
        const result = await addTargetWithTacticalResult({
          session_id: session.id,
          distance_m: finalDistance,
          lane_number: null,
          planned_shots: bullets,
          participant_id: undefined,
          bullets_fired: bullets,
          hits: hits,
          is_stage_cleared: false,
          time_seconds: null,
          result_notes: null,
          miss_points: null, // Will be updated separately if there are misses
          first_shot_hit: firstShotHit,
        });

        // If there are misses, store the tactical result ID for later update
        if (missCount > 0 && result.tactical_result?.id) {
          setPendingTacticalResultId(result.tactical_result.id);
          setPendingMissMarker(true);
        }
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeSheet();
      onRefresh();
    } catch (error: any) {
      console.error('Failed to save:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(t('common.error'), error.message || t('target.failedToAddTarget'));
    } finally {
      setSaving(false);
    }
  }, [
    session.id,
    session.soldier_distance_m,
    effectiveDistance,
    localDistance,
    canSelectDistance,
    isGrouping,
    groupingShots,
    groupSizeCm,
    bullets,
    hits,
    missCount,
    firstShotHit,
    onDistanceSet,
    onRefresh,
    closeSheet,
    t,
  ]);

  // Update miss_points on already-saved tactical result
  const saveMissPointsToTarget = useCallback(async (points: MissPoint[]) => {
    if (!pendingTacticalResultId) return;
    
    try {
      await updateTacticalMissPoints(pendingTacticalResultId, points.length > 0 ? points : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRefresh();
    } catch (error: any) {
      console.error('Failed to save miss points:', error);
      // Don't show error - the target was already saved, this is optional
    } finally {
      setPendingTacticalResultId(null);
    }
  }, [pendingTacticalResultId, onRefresh]);

  // Handle save button press
  const handleSave = useCallback(() => {
    // Validation
    if (isGrouping && !groupSizeCm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.missingGroupSizeTitle'), t('target.missingGroupSizeMessage'));
      return;
    }

    if (isGrouping && groupingShots < 2) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert(t('target.missingShotsTitle'), t('target.missingShotsMessage'));
      return;
    }

    // Always save immediately
    doSave();
  }, [isGrouping, groupSizeCm, groupingShots, doSave, t]);

  function getEndBtnStyle() {
    if (drillComplete) return { backgroundColor: '#10B981' };
    if (targets.length === 0) return { backgroundColor: colors.secondary };
    return { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border };
  }

  return (
    <View style={[sharedStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[sharedStyles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 34 }} />
        <View style={sharedStyles.headerCenter}>
          <Text style={[sharedStyles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || 'Drill'}
          </Text>
        </View>
        <View style={styles.headerRight}>
          {drill?.time_limit_seconds && watchState.isWatchControlled ? (
            <View style={sharedStyles.timerContainer}>
              <View style={[sharedStyles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
              <Text style={[sharedStyles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
                {formatTime(elapsedTime)}
              </Text>
            </View>
          ) : (
            <View style={{ width: 34 }} />
          )}
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={{ paddingBottom: insets.bottom + 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Weather */}
        {weather && !weatherLoading && (
          <View style={styles.weatherWrap}>
            <WeatherStrip weather={weather} />
          </View>
        )}

        {/* Drill info card */}
        <View style={styles.focusCard}>
          <View style={[styles.focusCardInner, { backgroundColor: colors.card }]}>
            {/* Status row */}
            <View style={styles.statusRow}>
              <View style={[styles.badge, { backgroundColor: `${colors.primary}15` }]}>
                <Lock size={12} color={colors.primary} />
                <Text style={[styles.badgeText, { color: colors.primary }]}>{t('session.locked')}</Text>
              </View>
              {drillComplete && (
                <View style={[styles.badge, { backgroundColor: '#10B98120' }]}>
                  <Check size={12} color="#10B981" />
                  <Text style={[styles.badgeText, { color: '#10B981' }]}>{t('session.complete')}</Text>
                </View>
              )}
            </View>

            {/* Params */}
            <View style={styles.paramsRow}>
              <View style={styles.param}>
                <MapPin size={14} color={colors.textMuted} />
                <Text style={[styles.paramText, { color: colors.text }]}>
                  {session.soldier_distance_m
                    ? `${session.soldier_distance_m}m`
                    : formatDistanceDisplay(drill?.distance_m, drill?.distance_category, t)}
                </Text>
              </View>
              <View style={styles.param}>
                <Zap size={14} color={colors.textMuted} />
                <Text style={[styles.paramText, { color: colors.text }]}>{bullets} {t('target.shots')}</Text>
              </View>
            </View>

            {/* Weapon - locked once targets exist */}
            <TouchableOpacity
              style={[
                styles.weaponRow, 
                { 
                  backgroundColor: targets.length > 0 ? colors.secondary : `${colors.primary}08`, 
                  borderColor: targets.length > 0 ? colors.border : `${colors.primary}30` 
                }
              ]}
              onPress={targets.length === 0 ? onWeaponPress : undefined}
              disabled={targets.length > 0}
            >
              {targets.length > 0 ? (
                <Lock size={14} color={colors.textMuted} />
              ) : (
                <Target size={14} color={colors.primary} />
              )}
              <Text 
                style={[
                  styles.weaponText, 
                  { color: targets.length > 0 ? colors.textMuted : (session.weapon_name ? colors.text : colors.primary) }
                ]} 
                numberOfLines={1}
              >
                {session.weapon_name || t('session.selectWeapon')}
              </Text>
              {targets.length === 0 && <ChevronDown size={14} color={colors.primary} />}
            </TouchableOpacity>

            {/* Progress */}
            <View style={styles.progressWrap}>
              <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
                <View
                  style={[styles.progressFill, { width: `${drillProgress?.targetsProgress || 0}%`, backgroundColor: drillComplete ? '#10B981' : colors.text }]}
                />
              </View>
              <Text style={[styles.progressText, { color: colors.textMuted }]}>
                {targets.length}/{drillProgress?.requiredTargets ?? 1} targets
              </Text>
            </View>
          </View>
        </View>

        {/* Single target - show hero view */}
        {targets.length === 1 && (
          <>
            <Animated.View entering={FadeIn.duration(200)} style={styles.heroWrap}>
              <HeroTarget target={targets[0]} onPress={() => onTargetPress(targets[0])} />
            </Animated.View>
            {/* Miss data card - shows below hero when there's miss data */}
            {targets[0].tactical_result?.miss_points?.length > 0 && (
              <Animated.View entering={FadeIn.duration(300).delay(100)} style={styles.missDataWrap}>
                <MissDataCard
                  missPoints={targets[0].tactical_result.miss_points}
                  hits={targets[0].tactical_result.hits}
                  totalShots={targets[0].tactical_result.bullets_fired}
                />
              </Animated.View>
            )}
          </>
        )}

        {/* Multiple targets - show all in same list format with expandable miss data */}
        {targets.length > 1 && (
          <View style={styles.targetsList}>
            {targets.map((item, index) => {
              const isExpanded = expandedTargetId === item.id;
              const missPoints = item.tactical_result?.miss_points ?? [];
              const hasMissData = missPoints.length > 0;
              
              return (
                <View key={item.id}>
                  <TargetCard 
                    target={item} 
                    index={targets.length - index} 
                    onPress={() => setExpandedTargetId(isExpanded ? null : item.id)}
                    isExpanded={isExpanded}
                  />
                  {/* Expanded miss data section */}
                  {isExpanded && hasMissData && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.expandedMissWrap}>
                      <MissDataCard
                        missPoints={missPoints}
                        hits={item.tactical_result?.hits ?? 0}
                        totalShots={item.tactical_result?.bullets_fired ?? 0}
                      />
                    </Animated.View>
                  )}
                  {/* No miss data - just show basic info */}
                  {isExpanded && !hasMissData && (
                    <Animated.View entering={FadeIn.duration(200)} style={[styles.expandedMissWrap, styles.expandedNoMiss]}>
                      <Target size={24} color={colors.textMuted} />
                      <Text style={[styles.noMissText, { color: colors.textMuted }]}>
                        {item.tactical_result?.hits ?? 0}/{item.tactical_result?.bullets_fired ?? 0} hits
                      </Text>
                    </Animated.View>
                  )}
                </View>
              );
            })}
          </View>
        )}

        {/* Action button */}
        {canAddTarget && !drillComplete && (
          <Animated.View entering={FadeInDown.duration(200)} style={styles.actionWrap}>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.text }]}
              onPress={isGrouping ? onScanRoute : openSheet}
            >
              {isGrouping ? (
                <>
                  <Camera size={20} color={colors.background} />
                  <Text style={[styles.actionText, { color: colors.background }]}>{t('session.scanTarget')}</Text>
                </>
              ) : (
                <>
                  <Crosshair size={20} color={colors.background} />
                  <Text style={[styles.actionText, { color: colors.background }]}>{t('session.logResult')}</Text>
                </>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.altAction} onPress={isGrouping ? openSheet : onScanRoute}>
              <Text style={[styles.altText, { color: colors.textMuted }]}>
                {isGrouping ? t('session.orEnterManually') : t('session.orScanPaper')}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </ScrollView>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[styles.endBtn, getEndBtnStyle()]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={drillComplete ? '#fff' : colors.text} />
          ) : (
            <>
              {drillComplete && <Check size={18} color="#fff" />}
              {!drillComplete && targets.length > 0 && <Square size={16} color={colors.text} />}
              <Text style={[styles.endBtnText, { color: drillComplete ? '#fff' : colors.text }]}>
                {drillComplete ? t('session.completeAndReturn') : targets.length === 0 ? t('common.exit') : t('session.endExecution')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* ═══════════════════════════════════════════════════════════════════════
          RESULTS SHEET - Compact bottom sheet
          ═══════════════════════════════════════════════════════════════════════ */}
      <Modal visible={showSheet} animationType="slide" transparent onRequestClose={closeSheet}>
        <KeyboardAvoidingView 
          style={styles.sheetOverlay} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={-80}
        >
          <TouchableOpacity style={styles.sheetBackdrop} activeOpacity={1} onPress={closeSheet} />
          <View style={[styles.sheetContainer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 10 }]}>
            {/* Handle */}
            <View style={styles.sheetHandle}>
              <View style={[styles.sheetHandleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Distance selector - if range available, always show */}
            {canSelectDistance && (
              <View style={[styles.sheetSection, { borderBottomColor: colors.border }]}>
                <Text style={[styles.sheetLabel, { color: colors.textMuted }]}>
                  {t('session.setYourDistance')}
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      if (localDistance > distanceStep) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                        setLocalDistance(localDistance - distanceStep);
                      }
                    }}
                  >
                    <Minus size={20} color={localDistance <= distanceStep ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                  <View style={styles.distanceDisplay}>
                    <TextInput
                      style={[
                        styles.distanceInput,
                        { 
                          backgroundColor: colors.secondary, 
                          color: isDistanceOutOfRange ? colors.orange : colors.text,
                          borderColor: isDistanceOutOfRange ? colors.orange : 'transparent',
                        }
                      ]}
                      value={String(localDistance)}
                      onChangeText={(text) => {
                        const num = parseInt(text, 10);
                        if (!isNaN(num) && num > 0) {
                          setLocalDistance(num);
                        } else if (text === '') {
                          setLocalDistance(0);
                        }
                      }}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <Text style={[styles.distanceUnit, { color: colors.textMuted }]}>m</Text>
                    {isDistanceOutOfRange && (
                      <Text style={[styles.stepHint, { color: colors.orange }]}>±{distanceStep}m</Text>
                    )}
                  </View>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setLocalDistance(localDistance + distanceStep);
                    }}
                  >
                    <Plus size={20} color={colors.text} />
                  </TouchableOpacity>
                </View>
                {/* Quick select for min, middle, max */}
                <View style={styles.quickRow}>
                  {[distanceRange!.min, defaultRangeDistance, distanceRange!.max].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[
                        styles.quickBtn,
                        { backgroundColor: colors.secondary },
                        localDistance === val && { backgroundColor: `${colors.primary}20` },
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setLocalDistance(val);
                      }}
                    >
                      <Text style={[styles.quickText, { color: localDistance === val ? colors.primary : colors.textMuted }]}>
                        {val}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {/* Warning when outside range */}
                {isDistanceOutOfRange && (
                  <View style={[styles.rangeWarning, { backgroundColor: `${colors.orange}15` }]}>
                    <Zap size={14} color={colors.orange} />
                    <Text style={[styles.rangeWarningText, { color: colors.orange }]}>
                      {localDistance < distanceRange!.min 
                        ? t('session.distanceBelowRange', { min: distanceRange!.min })
                        : t('session.distanceAboveRange', { max: distanceRange!.max })}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Results entry */}
            {isGrouping ? (
              // GROUPING
              <View style={[styles.sheetSection, { borderBottomWidth: 0 }]}>
                <Text style={[styles.sheetLabel, { color: colors.textMuted }]}>{t('target.groupSize')}</Text>
                <View style={styles.inputRow}>
                  <TextInput
                    style={[styles.numInput, { backgroundColor: colors.secondary, color: colors.text }]}
                    value={groupSizeCm}
                    onChangeText={setGroupSizeCm}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="decimal-pad"
                  />
                  <Text style={[styles.inputUnit, { color: colors.textMuted }]}>cm</Text>
                </View>
                <View style={styles.quickRow}>
                  {[1, 2, 3, 5, 10].map((val) => (
                    <TouchableOpacity
                      key={val}
                      style={[styles.quickBtn, { backgroundColor: colors.secondary }, groupSizeCm === String(val) && { backgroundColor: `${colors.primary}20` }]}
                      onPress={() => { Haptics.selectionAsync(); setGroupSizeCm(String(val)); }}
                    >
                      <Text style={[styles.quickText, { color: groupSizeCm === String(val) ? colors.primary : colors.textMuted }]}>{val}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <View style={[styles.shotsRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.shotsLabel, { color: colors.textMuted }]}>{t('target.totalShots')}</Text>
                  <View style={styles.miniStepper}>
                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => groupingShots > 2 && setGroupingShots(groupingShots - 1)}
                    >
                      <Minus size={14} color={groupingShots <= 2 ? colors.textMuted : colors.text} />
                    </TouchableOpacity>
                    <Text style={[styles.miniValue, { color: colors.text }]}>{groupingShots}</Text>
                    <TouchableOpacity
                      style={[styles.miniBtn, { backgroundColor: colors.secondary }]}
                      onPress={() => setGroupingShots(groupingShots + 1)}
                    >
                      <Plus size={14} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ) : (
              // ENGAGEMENT
              <View style={[styles.sheetSection, { borderBottomWidth: 0 }]}>
                <Text style={[styles.sheetLabel, { color: colors.textMuted }]}>
                  {t('target.hitsOnTarget')} • {effectiveDistance}m • {bullets} {t('target.shots')}
                </Text>
                <View style={styles.stepper}>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => { if (hits > 0) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHits(hits - 1); } }}
                  >
                    <Minus size={18} color={hits <= 0 ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                  <View style={[styles.hitsRing, hits > 0 && { borderColor: colors.primary, backgroundColor: `${colors.primary}10` }]}>
                    <Text style={[styles.hitsValue, { color: colors.text }]}>{hits}</Text>
                    <Text style={[styles.hitsMax, { color: colors.textMuted }]}>/{bullets}</Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.stepBtn, { backgroundColor: colors.secondary }]}
                    onPress={() => { if (hits < bullets) { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); setHits(hits + 1); } }}
                  >
                    <Plus size={18} color={hits >= bullets ? colors.textMuted : colors.text} />
                  </TouchableOpacity>
                </View>
                <Text style={[styles.accuracyText, { color: colors.textMuted }]}>{accuracy}%</Text>
                <View style={styles.quickRow}>
                  {[0, Math.round(bullets * 0.5), Math.round(bullets * 0.75), bullets]
                    .filter((v, i, a) => a.indexOf(v) === i)
                    .map((val) => (
                      <TouchableOpacity
                        key={val}
                        style={[styles.quickBtn, { backgroundColor: colors.secondary }, hits === val && { backgroundColor: `${colors.primary}20` }]}
                        onPress={() => { Haptics.selectionAsync(); setHits(val); }}
                      >
                        <Text style={[styles.quickText, { color: hits === val ? colors.primary : colors.textMuted }]}>{val}</Text>
                      </TouchableOpacity>
                    ))}
                </View>

                {/* First Shot Hit toggle */}
                <View style={[styles.firstShotRow, { borderTopColor: colors.border }]}>
                  <Text style={[styles.firstShotLabel, { color: colors.text }]}>
                    {t('target.firstShotHit', 'First Shot Hit?')}
                  </Text>
                  <View style={styles.firstShotOptions}>
                    <TouchableOpacity
                      style={[
                        styles.firstShotBtn,
                        { backgroundColor: colors.secondary },
                        firstShotHit === true && { backgroundColor: `${colors.green}20`, borderColor: colors.green, borderWidth: 1 },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setFirstShotHit(firstShotHit === true ? null : true); }}
                    >
                      <Text style={[styles.firstShotBtnText, { color: firstShotHit === true ? colors.green : colors.textMuted }]}>
                        {t('common.yes', 'Yes')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.firstShotBtn,
                        { backgroundColor: colors.secondary },
                        firstShotHit === false && { backgroundColor: `${COLORS.error}20`, borderColor: COLORS.error, borderWidth: 1 },
                      ]}
                      onPress={() => { Haptics.selectionAsync(); setFirstShotHit(firstShotHit === false ? null : false); }}
                    >
                      <Text style={[styles.firstShotBtnText, { color: firstShotHit === false ? COLORS.error : colors.textMuted }]}>
                        {t('common.no', 'No')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Hint: miss marker will pop up if there are misses */}
                {missCount > 0 && (
                  <Text style={[styles.missHint, { color: colors.textMuted }]}>
                    {t('target.missMarkerHint', { count: missCount, defaultValue: `${missCount} misses - you'll mark where they went` })}
                  </Text>
                )}
              </View>
            )}

            {/* Save button */}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: colors.primary, marginHorizontal: 14 }]}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Check size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>{t('target.saveTarget')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Miss Marker Modal - target already saved, this just updates miss_points */}
      <Modal
        visible={showMissMarker}
        animationType="slide"
        transparent
        onRequestClose={() => {
          setShowMissMarker(false);
          setPendingTacticalResultId(null);
        }}
      >
        <View style={styles.missMarkerOverlay}>
          <TouchableOpacity 
            style={styles.missMarkerBackdrop} 
            activeOpacity={1} 
            onPress={() => {
              setShowMissMarker(false);
              setPendingTacticalResultId(null);
            }} 
          />
          <View style={[styles.missMarkerSheet, { backgroundColor: colors.background, paddingBottom: insets.bottom + 10 }]}>
            {/* Handle bar */}
            <View style={styles.missMarkerHandle}>
              <View style={[styles.missMarkerHandleBar, { backgroundColor: colors.border }]} />
            </View>
            <MissMarker
              initialPoints={[]}
              onSave={(points) => {
                setShowMissMarker(false);
                saveMissPointsToTarget(points);
              }}
              onCancel={() => {
                setShowMissMarker(false);
                setPendingTacticalResultId(null);
              }}
              maxPoints={missCount}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', minWidth: 34 },
  weatherWrap: { paddingHorizontal: 14, marginBottom: 10 },

  // Focus card
  focusCard: { paddingHorizontal: 14, marginBottom: 12 },
  focusCardInner: { borderRadius: 12, padding: 14, gap: 10 },
  statusRow: { flexDirection: 'row', gap: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  paramsRow: { flexDirection: 'row', gap: 12 },
  param: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  paramText: { fontSize: 13, fontWeight: '600' },
  weaponRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1 },
  weaponText: { flex: 1, fontSize: 13, fontWeight: '600' },
  progressWrap: { gap: 4 },
  progressBg: { height: 5, borderRadius: 2.5, overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 2.5 },
  progressText: { fontSize: 11, fontWeight: '500' },

  // Hero
  heroWrap: { paddingHorizontal: 14, marginBottom: 10 },

  // Miss data
  missDataWrap: { paddingHorizontal: 14, marginBottom: 10 },

  // Action
  actionWrap: { paddingHorizontal: 14, marginBottom: 16, alignItems: 'center' },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', height: 48, borderRadius: 12 },
  actionText: { fontSize: 15, fontWeight: '600' },
  altAction: { marginTop: 8, paddingVertical: 5 },
  altText: { fontSize: 12, fontWeight: '500' },

  // Targets list (for 2+ targets)
  targetsList: { paddingHorizontal: 14, gap: 6 },

  // Expanded miss data
  expandedMissWrap: {
    marginTop: -3,
    marginBottom: 6,
  },
  expandedNoMiss: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  noMissText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Bottom bar
  bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 14, paddingTop: 10 },
  endBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 46, borderRadius: 11 },
  endBtnText: { fontSize: 15, fontWeight: '600' },

  // ═══════════════════════════════════════════════════════════════════════
  // COMPACT SHEET STYLES
  // ═══════════════════════════════════════════════════════════════════════
  sheetOverlay: { flex: 1, justifyContent: 'flex-end' },
  sheetBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetContainer: { borderTopLeftRadius: 18, borderTopRightRadius: 18 },
  sheetHandle: { alignItems: 'center', paddingVertical: 7 },
  sheetHandleBar: { width: 32, height: 4, borderRadius: 2 },
  sheetSection: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, alignItems: 'center' },
  sheetLabel: { fontSize: 12, fontWeight: '600', textAlign: 'center', marginBottom: 10, opacity: 0.6 },

  // Stepper (shared)
  stepper: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 16, marginBottom: 10 },
  stepBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { fontSize: 28, fontWeight: '700', minWidth: 90, textAlign: 'center', fontVariant: ['tabular-nums'] },
  distanceDisplay: { alignItems: 'center' },
  distanceInput: { width: 76, height: 44, borderRadius: 10, fontSize: 26, fontWeight: '700', textAlign: 'center', borderWidth: 2 },
  distanceUnit: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  stepHint: { fontSize: 10, fontWeight: '600', marginTop: 2 },

  // Range warning
  rangeWarning: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 7, marginTop: 8 },
  rangeWarningText: { fontSize: 11, fontWeight: '600' },

  // Hits ring
  hitsRing: { width: 80, height: 80, borderRadius: 40, borderWidth: 3, borderColor: 'rgba(128,128,128,0.3)', alignItems: 'center', justifyContent: 'center' },
  hitsValue: { fontSize: 28, fontWeight: '700' },
  hitsMax: { fontSize: 12 },
  accuracyText: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginTop: 6, marginBottom: 8, opacity: 0.6 },

  // Input row
  inputRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 },
  numInput: { width: 90, height: 46, borderRadius: 10, fontSize: 26, fontWeight: '700', textAlign: 'center' },
  inputUnit: { fontSize: 16, fontWeight: '600' },

  // Shots row
  shotsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingTop: 12, borderTopWidth: 1, marginTop: 12, width: '100%' },
  shotsLabel: { fontSize: 13, fontWeight: '600', opacity: 0.6 },
  miniStepper: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  miniBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  miniValue: { fontSize: 16, fontWeight: '700', minWidth: 26, textAlign: 'center' },

  // Quick select
  quickRow: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  quickBtn: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 14 },
  quickText: { fontSize: 13, fontWeight: '600' },

  // First shot hit
  firstShotRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12, borderTopWidth: 1, marginTop: 12, width: '100%' },
  firstShotLabel: { fontSize: 13, fontWeight: '600' },
  firstShotOptions: { flexDirection: 'row', gap: 6 },
  firstShotBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  firstShotBtnText: { fontSize: 13, fontWeight: '600' },

  // Save button
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, height: 46, borderRadius: 11 },
  saveBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  // Miss Marker
  missHint: {
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
    marginTop: 10,
    opacity: 0.7,
  },
  missMarkerOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  missMarkerBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  missMarkerSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  missMarkerHandle: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 3,
  },
  missMarkerHandleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
});
