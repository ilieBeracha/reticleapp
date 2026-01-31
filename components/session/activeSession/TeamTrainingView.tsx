/**
 * TeamTrainingView
 *
 * Focused execution mode for team training drills.
 * - No close button (can't abandon mid-drill)
 * - Locked config (commander defined)
 * - Single primary action (scan or manual based on drill type)
 * - Clear completion state
 */

import { TargetCard } from '@/components/session/TargetCard';
import { WeatherStrip } from '@/components/session/WeatherDisplay';
import { COLORS } from '@/constants/activeSession';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillProgress, WatchState } from '@/types/activeSession';
import type { SessionDrillConfig, SessionWithDetails } from '@/types/session';
import { formatDistanceDisplay, formatTime } from '@/utils/activeSession.helpers';
import { isGroupingSession } from '@/utils/drillGoal';
import { Camera, Check, ChevronDown, Crosshair, Lock, MapPin, Square, Target, Zap } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from './activeSession.styles';
import { HeroTarget } from './components/HeroTarget';

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
  onManualRoute: () => void;
  onTargetPress: (target: any) => void;
  onEndSession: () => void;
  ending: boolean;
  /** Opens weapon picker - always available */
  onWeaponPress?: () => void;
  /** Weather data */
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
  onManualRoute,
  onTargetPress,
  onEndSession,
  ending,
  onWeaponPress,
  weather,
  weatherLoading,
  weatherError,
}: TeamTrainingViewProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const isGrouping = isGroupingSession(session);
  const drillComplete = drillProgress?.isComplete && drillProgress?.meetsAccuracy;

  return (
    <View style={[sharedStyles.container, { backgroundColor: colors.background }]}>
      {/* Minimal header - no close button */}
      <View style={[sharedStyles.header, { paddingTop: insets.top + 8 }]}>
        <View style={{ width: 36 }} />
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
            <View style={{ width: 36 }} />
          )}
        </View>
      </View>

      {/* Weather */}
      {(weather || weatherLoading || weatherError) && (
        <View style={styles.weatherContainer}>
          {weatherLoading ? (
            <View style={[styles.weatherLoading, { backgroundColor: colors.card }]}>
              <ActivityIndicator size="small" color={colors.textMuted} />
              <Text style={[styles.weatherLoadingText, { color: colors.textMuted }]}>
                {t('session.loadingWeather')}
              </Text>
            </View>
          ) : weatherError ? (
            <View style={[styles.weatherLoading, { backgroundColor: colors.card }]}>
              <Text style={[styles.weatherLoadingText, { color: colors.textMuted }]}>{weatherError}</Text>
            </View>
          ) : weather ? (
            <WeatherStrip weather={weather} />
          ) : null}
        </View>
      )}

      {/* Focused drill info card */}
      <View style={styles.focusCard}>
        <View style={[styles.focusCardInner, { backgroundColor: colors.card }]}>
          {/* Status row */}
          <View style={styles.statusRow}>
            <View style={[styles.modeBadge, { backgroundColor: colors.primary + '15' }]}>
              <Lock size={12} color={colors.primary} />
              <Text style={[styles.modeText, { color: colors.primary }]}>{t('session.locked')}</Text>
            </View>
            {drillComplete && (
              <View style={[styles.modeBadge, { backgroundColor: '#10B98120' }]}>
                <Check size={12} color="#10B981" />
                <Text style={[styles.modeText, { color: '#10B981' }]}>{t('session.complete')}</Text>
              </View>
            )}
          </View>

          {/* Drill params - tight horizontal layout */}
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
              <Text style={[styles.paramText, { color: colors.text }]}>
                {session.soldier_bullets ?? drill?.rounds_per_shooter ?? 5} shots
              </Text>
            </View>
          </View>

          {/* Weapon bar - single row */}
          <TouchableOpacity
            style={[
              styles.weaponRow,
              {
                backgroundColor: session.weapon_name ? `${colors.primary}08` : `${colors.primary}15`,
                borderWidth: 1,
                borderColor: session.weapon_name ? `${colors.primary}30` : colors.primary,
                borderStyle: session.weapon_name ? 'solid' : 'dashed',
              },
            ]}
            onPress={onWeaponPress}
            activeOpacity={0.7}
          >
            <Target size={14} color={colors.primary} />
            <Text
              style={[styles.weaponRowText, { color: session.weapon_name ? colors.text : colors.primary }]}
              numberOfLines={1}
            >
              {session.weapon_name || t('session.selectWeapon', 'Select Weapon')}
            </Text>
            <View style={[styles.weaponEditHint, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[styles.weaponEditHintText, { color: colors.primary }]}>
                {t('common.change', 'Change')}
              </Text>
              <ChevronDown size={12} color={colors.primary} />
            </View>
          </TouchableOpacity>

          {/* Progress bar */}
          <View style={styles.progressWrap}>
            <View style={[styles.progressBg, { backgroundColor: colors.secondary }]}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${drillProgress?.targetsProgress || 0}%`,
                    backgroundColor: drillComplete ? '#10B981' : colors.text,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {targets.length}/{drillProgress?.requiredTargets ?? 1} targets
            </Text>
          </View>
        </View>
      </View>

      {/* Latest target (if any) */}
      {targets.length > 0 && (
        <Animated.View entering={FadeIn.duration(200)} style={styles.heroContainer}>
          <HeroTarget target={targets[0]} onPress={() => onTargetPress(targets[0])} />
        </Animated.View>
      )}

      {/* Single focused action - based on drill type */}
      {canAddTarget && !drillComplete && (
        <Animated.View entering={FadeInDown.duration(200)} style={styles.actionWrap}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.text }]}
            onPress={isGrouping ? onScanRoute : onManualRoute}
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
          {/* Alternative option (small, subtle) */}
          <TouchableOpacity style={styles.altAction} onPress={isGrouping ? onManualRoute : onScanRoute}>
            <Text style={[styles.altText, { color: colors.textMuted }]}>
              {isGrouping ? t('session.orEnterManually') : t('session.orScanPaper')}
            </Text>
          </TouchableOpacity>
        </Animated.View>
      )}

      {/* Previous targets list */}
      {targets.length > 1 && (
        <View style={styles.prevList}>
          <Text style={[styles.prevLabel, { color: colors.textMuted }]}>
            {t('session.previous', { count: targets.length - 1 })}
          </Text>
          <FlatList
            data={targets.slice(1)}
            renderItem={({ item, index }) => (
              <TargetCard target={item} index={targets.length - 1 - index} onPress={() => onTargetPress(item)} />
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
            showsVerticalScrollIndicator={false}
          />
        </View>
      )}

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.endBtn,
            drillComplete
              ? { backgroundColor: '#10B981' }
              : targets.length === 0
                ? { backgroundColor: colors.secondary }
                : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={drillComplete ? '#fff' : colors.text} />
          ) : (
            <>
              {drillComplete ? (
                <Check size={18} color="#fff" />
              ) : targets.length === 0 ? null : (
                <Square size={16} color={colors.text} />
              )}
              <Text style={[styles.endBtnText, { color: drillComplete ? '#fff' : colors.text }]}>
                {drillComplete
                  ? t('session.completeAndReturn')
                  : targets.length === 0
                    ? t('common.exit', 'Exit')
                    : t('session.endExecution')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // Header
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 36,
  },
  // Weather
  weatherContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  weatherLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  weatherLoadingText: {
    fontSize: 13,
  },
  // Focus card
  focusCard: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  focusCardInner: {
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  statusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  modeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  modeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  paramsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  param: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  paramText: {
    fontSize: 14,
    fontWeight: '600',
  },
  progressWrap: {
    gap: 6,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Hero
  heroContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },

  // Action
  actionWrap: {
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    width: '100%',
    height: 54,
    borderRadius: 14,
  },
  actionText: {
    fontSize: 17,
    fontWeight: '600',
  },
  altAction: {
    marginTop: 10,
    paddingVertical: 6,
  },
  altText: {
    fontSize: 13,
    fontWeight: '500',
  },

  // Previous list
  prevList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  prevLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 10,
  },

  // Weapon row (in focus card)
  weaponRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  weaponRowText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },
  weaponEditHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  weaponEditHintText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Bottom bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  endBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    height: 50,
    borderRadius: 12,
  },
  endBtnText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
