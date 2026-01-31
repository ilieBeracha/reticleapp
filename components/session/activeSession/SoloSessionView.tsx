/**
 * SoloSessionView
 *
 * Full-featured session UI for solo practice.
 * - Close button available
 * - Weather display
 * - Drill banner (if structured drill)
 * - Both scan and manual options
 * - Full target list
 */

import { TargetCard } from '@/components/session/TargetCard';
import { WeatherStrip } from '@/components/session/WeatherDisplay';
import { COLORS } from '@/constants/activeSession';
import { useColors } from '@/hooks/ui/useColors';
import type { DrillProgress, WatchState } from '@/types/activeSession';
import type { SessionDrillConfig, SessionWithDetails } from '@/types/session';
import { formatTime } from '@/utils/activeSession.helpers';
import { isGroupingSession } from '@/utils/drillGoal';
import { Camera, Check, Crosshair, Settings, Square, Target, X } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { EdgeInsets } from 'react-native-safe-area-context';
import { styles as sharedStyles } from './activeSession.styles';
import { CompactStats } from './components/CompactStats';
import { DrillBanner } from './components/DrillBanner';
import { HeroTarget } from './components/HeroTarget';

interface SoloSessionViewProps {
  session: SessionWithDetails;
  targets: any[];
  insets: EdgeInsets;
  elapsedTime: number;
  drill: SessionDrillConfig | null | undefined;
  hasDrill: boolean;
  drillProgress: DrillProgress | null;
  watchState: WatchState;
  canAddTarget: boolean;
  refreshing: boolean;
  ending: boolean;
  weather: any;
  weatherLoading: boolean;
  weatherError: string | null;
  /** Whether config can be edited (free/guide mode vs locked) */
  isConfigEditable?: boolean;
  onRefresh: () => void;
  onScanRoute: () => void;
  onManualRoute: () => void;
  onTargetPress: (target: any) => void;
  onEndSession: () => void;
  onClose: () => void;
  /** Opens the drill config sheet */
  onOpenConfig?: () => void;
}

export function SoloSessionView({
  session,
  targets,
  insets,
  elapsedTime,
  drill,
  hasDrill,
  drillProgress,
  watchState,
  canAddTarget,
  refreshing,
  ending,
  weather,
  weatherLoading,
  weatherError,
  isConfigEditable = false,
  onRefresh,
  onScanRoute,
  onManualRoute,
  onTargetPress,
  onEndSession,
  onClose,
  onOpenConfig,
}: SoloSessionViewProps) {
  const { t } = useTranslation();
  const colors = useColors();

  const isGrouping = isGroupingSession(session);
  const drillComplete = drillProgress?.isComplete && drillProgress?.meetsAccuracy;

  const renderEmpty = () => (
    <View style={sharedStyles.emptyContainer}>
      <View style={[sharedStyles.emptyIcon, { backgroundColor: colors.secondary }]}>
        <Target size={28} color={colors.textMuted} />
      </View>
      <Text style={[sharedStyles.emptyTitle, { color: colors.text }]}>{t('session.readyToShoot')}</Text>
      <Text style={[sharedStyles.emptyDesc, { color: colors.textMuted }]}>{t('session.addFirstTarget')}</Text>
    </View>
  );

  return (
    <View style={[sharedStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[sharedStyles.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity style={[sharedStyles.closeButton, { backgroundColor: colors.secondary }]} onPress={onClose}>
          <X size={18} color={colors.textMuted} />
        </TouchableOpacity>

        <View style={sharedStyles.headerCenter}>
          <Text style={[sharedStyles.headerTitle, { color: colors.text }]} numberOfLines={1}>
            {session.drill_name || session.training_title || t('session.practice')}
          </Text>
        </View>

        <View style={styles.headerRight}>
          {drill?.time_limit_seconds && watchState.isWatchControlled && (
            <View style={sharedStyles.timerContainer}>
              <View style={[sharedStyles.liveDot, drillProgress?.overTime && { backgroundColor: COLORS.error }]} />
              <Text style={[sharedStyles.timerText, { color: drillProgress?.overTime ? COLORS.error : colors.text }]}>
                {formatTime(elapsedTime)}
              </Text>
            </View>
          )}
          {hasDrill && onOpenConfig && (
            <TouchableOpacity
              style={[styles.configButton, { backgroundColor: colors.secondary }]}
              onPress={onOpenConfig}
            >
              <Settings size={18} color={isConfigEditable ? colors.primary : colors.textMuted} />
            </TouchableOpacity>
          )}
          {!hasDrill && !onOpenConfig && <View style={{ width: 36 }} />}
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

      {/* Drill Banner */}
      {hasDrill && drill && (
        <DrillBanner
          session={session}
          drill={drill}
          drillProgress={drillProgress}
          targets={targets}
          isGroupingDrill={isGrouping}
          isTacticalDrill={!isGrouping}
          weaponName={session.weapon_name}
          isLocked={false}
        />
      )}

      {/* Weapon bar (if no drill) */}
      {!hasDrill && session.weapon_name && (
        <View style={[styles.weaponBar, { backgroundColor: colors.card }]}>
          <Target size={14} color={colors.primary} />
          <Text style={[styles.weaponBarText, { color: colors.text }]}>{session.weapon_name}</Text>
        </View>
      )}

      {/* Hero target */}
      {targets.length > 0 && (
        <Animated.View entering={FadeIn.duration(300)} style={styles.heroContainer}>
          <HeroTarget target={targets[0]} onPress={() => onTargetPress(targets[0])} />
        </Animated.View>
      )}

      {/* Stats */}
      <Animated.View entering={FadeInDown.delay(50).duration(300)} style={styles.statsContainer}>
        <CompactStats targets={targets} />
      </Animated.View>

      {/* Action buttons */}
      {canAddTarget && (
        <Animated.View entering={FadeInDown.delay(100).duration(300)} style={styles.actionsContainer}>
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.actionBtn, { backgroundColor: colors.text }]} onPress={onScanRoute}>
              <Camera size={18} color={colors.background} />
              <Text style={[styles.actionBtnText, { color: colors.background }]}>{t('session.scanTarget')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}
              onPress={onManualRoute}
            >
              <Crosshair size={18} color={colors.text} />
              <Text style={[styles.actionBtnText, { color: colors.text }]}>{t('session.manualEntry')}</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}

      {/* Target list */}
      <View style={sharedStyles.listContainer}>
        {targets.length > 1 && (
          <Text style={[sharedStyles.sectionLabel, { color: colors.textMuted }]}>
            {t('session.previous', { count: targets.length - 1 })}
          </Text>
        )}
        <FlatList
          data={targets.length > 1 ? targets.slice(1) : []}
          renderItem={({ item, index }) => (
            <TargetCard target={item} index={targets.length - 1 - index} onPress={() => onTargetPress(item)} />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[sharedStyles.listContent, { paddingBottom: insets.bottom + 100 }]}
          ListEmptyComponent={targets.length === 0 ? renderEmpty : null}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.text} />}
          showsVerticalScrollIndicator={false}
        />
      </View>

      {/* Bottom bar */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16, backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={[
            styles.endBtn,
            drillComplete
              ? { backgroundColor: colors.text }
              : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
          ]}
          onPress={onEndSession}
          disabled={ending}
        >
          {ending ? (
            <ActivityIndicator size="small" color={drillComplete ? colors.background : colors.text} />
          ) : (
            <>
              {drillComplete ? <Check size={18} color={colors.background} /> : <Square size={16} color={colors.text} />}
              <Text
                style={[
                  styles.endBtnText,
                  {
                    color: drillComplete ? colors.background : colors.text,
                  },
                ]}
              >
                {drillComplete ? t('session.completeDrill') : t('session.endSession')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minWidth: 36,
  },
  configButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
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
  weaponBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  weaponBarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  heroContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  statsContainer: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  actionsContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 48,
    borderRadius: 12,
  },
  actionBtnText: {
    fontSize: 15,
    fontWeight: '600',
  },
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
