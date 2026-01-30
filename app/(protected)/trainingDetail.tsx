/**
 * Training Detail
 *
 * Dashboard showing training context, drills, and history.
 * Training is a container for engagements - it provides context but NEVER executes anything.
 *
 * LAYOUT:
 * - Header: Navigation, training hero, status indicators + commander pill (Start/End)
 * - Tab Bar: [Drills] [Results]
 * - Tab Content:
 *   - Drills tab: Active session banner, planned drills list
 *   - Results tab: Summary card, completed sessions history
 */
import { TrainingSettingsModal } from '@/components/training/detail/TrainingSettingsModal';
import { RunDrillSheet } from '@/components/training/RunDrillSheet';
import { SquadInvitationBanner } from '@/components/training/SquadInvitationBanner';
import { SquadLobbyBanner } from '@/components/training/SquadLobbyBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useTrainingRealtime } from '@/hooks/realtime/training/useTrainingRealtime';
import { useTrainingDetail } from '@/hooks/training/useTrainingDetail';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { getTrainingSessionsWithStats } from '@/services/session/queries';
import { finishTraining, startTraining } from '@/services/trainingService';
import { useTeamStore } from '@/stores/teamStore';
import type { SessionWithDetails } from '@/types/session';
import type { TrainingDrill } from '@/types/workspace';
import { format, formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Flag,
  Lock,
  Play,
  Settings,
  ShieldAlert,
  Sparkles,
  Target,
  Trophy,
  Unlock,
  Users,
  Zap,
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedRef,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const HEADER_HEIGHT = 120;
const COLLAPSE_THRESHOLD = 80;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Helper: get status config for training
 */
function getTrainingStatusConfig(training: any, colors: any, t: any) {
  if (training.status === 'ongoing') {
    return { accentColor: colors.green, label: t('training.live'), Icon: Zap, showDot: true };
  }
  if (training.status === 'finished') {
    return { accentColor: colors.primary, label: t('training.completed'), Icon: CheckCircle2, showDot: false };
  }
  if (training.status === 'cancelled') {
    return { accentColor: colors.red, label: t('training.cancelled'), Icon: null, showDot: false };
  }
  return { accentColor: colors.textMuted, label: t('training.planned'), Icon: Clock, showDot: false };
}

/**
 * Section 1: Expanded Hero (fades out on scroll)
 */
function ExpandedHero({
  training,
  colors,
  insets,
  completedSessions,
  canManageTraining,
  onBack,
  onOpenSettings,
  onStartTraining,
  onEndTraining,
  isUpdatingStatus,
  heroAnimatedStyle,
}: {
  training: any;
  colors: any;
  insets: any;
  completedSessions: SessionWithDetails[];
  canManageTraining: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onStartTraining: () => void;
  onEndTraining: () => void;
  isUpdatingStatus: boolean;
  heroAnimatedStyle: any;
}) {
  const { t } = useTranslation();
  const uniqueShooters = new Set(completedSessions.map((s) => s.user_id)).size;
  const status = getTrainingStatusConfig(training, colors, t);

  return (
    <Animated.View style={[styles.heroCard, { paddingTop: insets.top + 8 }, heroAnimatedStyle]}>
      {/* Nav Row */}
      <View style={styles.navRow}>
        <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.secondary }]} onPress={onBack}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }} />
        {canManageTraining && (
          <TouchableOpacity style={[styles.navBtn, { backgroundColor: colors.secondary }]} onPress={onOpenSettings}>
            <Settings size={20} color={colors.text} />
          </TouchableOpacity>
        )}
      </View>

      {/* Status + Title */}
      <View style={styles.heroContent}>
        <View style={[styles.statusBadge, { backgroundColor: status.accentColor + '15' }]}>
          {status.Icon && <status.Icon size={11} color={status.accentColor} strokeWidth={2.5} />}
          <Text style={[styles.statusBadgeText, { color: status.accentColor }]}>
            {status.label.toUpperCase()}
          </Text>
        </View>
        <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
          {training.title}
        </Text>
      </View>

      {/* Stats Row + Commander Action */}
      <View style={styles.heroFooter}>
        <View style={styles.heroStats}>
          <View style={[styles.statChip, { backgroundColor: colors.secondary }]}>
            <Target size={12} color={colors.textMuted} />
            <Text style={[styles.statChipText, { color: colors.textMuted }]}>
              {completedSessions.length}
            </Text>
          </View>
          {uniqueShooters > 0 && (
            <View style={[styles.statChip, { backgroundColor: colors.secondary }]}>
              <Users size={12} color={colors.textMuted} />
              <Text style={[styles.statChipText, { color: colors.textMuted }]}>
                {uniqueShooters}
              </Text>
            </View>
          )}
        </View>

        {/* Commander Action */}
        {canManageTraining && training.status === 'planned' && (
          <TouchableOpacity
            style={[styles.commanderBtn, { backgroundColor: colors.green }]}
            onPress={onStartTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={12} color="#fff" />
            ) : (
              <>
                <Play size={11} color="#fff" fill="#fff" />
                <Text style={styles.commanderBtnText}>{t('training.startTraining')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
        {canManageTraining && training.status === 'ongoing' && (
          <TouchableOpacity
            style={[styles.commanderBtn, { backgroundColor: colors.orange }]}
            onPress={onEndTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={12} color="#fff" />
            ) : (
              <>
                <Flag size={11} color="#fff" />
                <Text style={styles.commanderBtnText}>{t('training.endTraining')}</Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Sticky Compact Header (fades in on scroll)
 */
function StickyHeader({
  training,
  colors,
  insets,
  canManageTraining,
  onBack,
  onStartTraining,
  onEndTraining,
  isUpdatingStatus,
  stickyAnimatedStyle,
}: {
  training: any;
  colors: any;
  insets: any;
  canManageTraining: boolean;
  onBack: () => void;
  onStartTraining: () => void;
  onEndTraining: () => void;
  isUpdatingStatus: boolean;
  stickyAnimatedStyle: any;
}) {
  const { t } = useTranslation();
  const status = getTrainingStatusConfig(training, colors, t);

  return (
    <Animated.View
      style={[
        styles.stickyBar,
        {
          paddingTop: insets.top,
          backgroundColor: colors.card,
          borderBottomColor: colors.border,
        },
        stickyAnimatedStyle,
      ]}
      pointerEvents="box-none"
    >
      <View style={styles.stickyContent}>
        <TouchableOpacity style={[styles.stickyBackBtn, { backgroundColor: colors.secondary }]} onPress={onBack}>
          <ArrowLeft size={18} color={colors.text} />
        </TouchableOpacity>

        <View style={styles.stickyCenter}>
          <Text style={[styles.stickyTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
          <View style={[styles.stickyBadge, { backgroundColor: status.accentColor + '18' }]}>
            {status.Icon && <status.Icon size={9} color={status.accentColor} strokeWidth={2.5} />}
            <Text style={[styles.stickyBadgeText, { color: status.accentColor }]}>
              {status.label.toUpperCase()}
            </Text>
          </View>
        </View>

        {/* Commander action in sticky bar */}
        {canManageTraining && training.status === 'planned' && (
          <TouchableOpacity
            style={[styles.stickyAction, { backgroundColor: colors.green }]}
            onPress={onStartTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={10} color="#fff" />
            ) : (
              <Play size={12} color="#fff" fill="#fff" />
            )}
          </TouchableOpacity>
        )}
        {canManageTraining && training.status === 'ongoing' && (
          <TouchableOpacity
            style={[styles.stickyAction, { backgroundColor: colors.orange }]}
            onPress={onEndTraining}
            disabled={isUpdatingStatus}
          >
            {isUpdatingStatus ? (
              <ActivityIndicator size={10} color="#fff" />
            ) : (
              <Flag size={12} color="#fff" />
            )}
          </TouchableOpacity>
        )}
        {/* Spacer when no action button */}
        {(!canManageTraining || (training.status !== 'planned' && training.status !== 'ongoing')) && (
          <View style={{ width: 32 }} />
        )}
      </View>
    </Animated.View>
  );
}

/**
 * Tab Bar Component
 */
function TabBar({
  activeTab,
  onTabChange,
  colors,
}: {
  activeTab: 'drills' | 'results';
  onTabChange: (tab: 'drills' | 'results') => void;
  colors: any;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'drills' && { borderBottomColor: colors.primary }]}
        onPress={() => onTabChange('drills')}
      >
        <Target size={16} color={activeTab === 'drills' ? colors.primary : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'drills' ? colors.primary : colors.textMuted }]}>
          {t('training.drills')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.tab, activeTab === 'results' && { borderBottomColor: colors.primary }]}
        onPress={() => onTabChange('results')}
      >
        <Trophy size={16} color={activeTab === 'results' ? colors.primary : colors.textMuted} />
        <Text style={[styles.tabText, { color: activeTab === 'results' ? colors.primary : colors.textMuted }]}>
          {t('training.results')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

/**
 * Section 5: Summary Card (Metrics)
 */
function SummaryCard({
  training,
  completedSessions,
  colors,
}: {
  training: any;
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  const { t } = useTranslation();
  if (completedSessions.length === 0) return null;

  const totalShots = completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
  const totalHits = completedSessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
  const avgAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : null;
  const uniqueShooters = new Set(completedSessions.map((s) => s.user_id)).size;
  const bestGroupings = completedSessions
    .map((s) => s.stats?.best_dispersion_cm)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  const bestGroup = bestGroupings.length > 0 ? Math.min(...bestGroupings) : null;

  return (
    <View style={[styles.summaryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.summaryAccent, { backgroundColor: colors.green + '12' }]}>
        <Trophy size={18} color={colors.green} />
      </View>
      <Text style={[styles.summaryHeadline, { color: colors.text }]}>
        {avgAccuracy !== null
          ? t('training.hitRate', { percent: avgAccuracy })
          : t('training.sessionsCount', { count: completedSessions.length })}
      </Text>
      <Text style={[styles.summarySubtitle, { color: colors.textMuted }]}>
        {format(new Date(training.scheduled_at), 'MMM d, yyyy')}
      </Text>
      <View style={[styles.metricsRow, { borderTopColor: colors.border }]}>
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{totalShots || '—'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>
            {bestGroup !== null ? `${bestGroup.toFixed(1)}` : '—'}
          </Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>
            {bestGroup !== null ? t('training.bestCm') : t('session.grouping')}
          </Text>
        </View>
        <View style={[styles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={styles.metric}>
          <Text style={[styles.metricValue, { color: colors.text }]}>{uniqueShooters || '—'}</Text>
          <Text style={[styles.metricLabel, { color: colors.textMuted }]}>{t('training.shooters')}</Text>
        </View>
      </View>
    </View>
  );
}

/**
 * Section 6: Completed Sessions List (History)
 */
function CompletedSessionsList({
  completedSessions,
  colors,
}: {
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  const { t } = useTranslation();
  if (completedSessions.length === 0) return null;

  // Group sessions by user
  const groupedByUser = new Map<string, { name: string; sessions: SessionWithDetails[] }>();
  completedSessions.forEach((s) => {
    const uid = s.user_id;
    if (!groupedByUser.has(uid)) {
      groupedByUser.set(uid, { name: (s as any).user_full_name || t('common.unknown'), sessions: [] });
    }
    groupedByUser.get(uid)!.sessions.push(s);
  });

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>{t('training.sessionHistorySection')}</Text>

      {Array.from(groupedByUser.entries()).map(([uid, { name, sessions }]) => (
        <View key={uid} style={styles.userGroup}>
          {/* User Header */}
          <View style={styles.userHeader}>
            <View style={[styles.userAvatar, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.userAvatarText, { color: colors.textMuted }]}>{name.charAt(0).toUpperCase()}</Text>
            </View>
            <Text style={[styles.userName, { color: colors.text }]}>{name}</Text>
            <Text style={[styles.userCount, { color: colors.textMuted }]}>{sessions.length}</Text>
          </View>

          {/* Sessions List */}
          <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {sessions.map((s, idx) => (
              <SessionRow key={s.id} session={s} colors={colors} isLast={idx === sessions.length - 1} />
            ))}
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Single Session Row (for completed sessions)
 */
function SessionRow({ session, colors, isLast }: { session: SessionWithDetails; colors: any; isLast: boolean }) {
  const { t } = useTranslation();
  const drillName = session.drill_config?.name || session.drill_name || t('session.title');
  // Check both drill_config and engagement for drill_goal (engagement is authoritative)
  const isGrouping = session.engagement?.drill_goal === 'grouping' || session.drill_config?.drill_goal === 'grouping';
  const engagementMode = session.engagement?.engagement_mode;
  const isSquadOrGroup = engagementMode === 'squad' || engagementMode === 'group';
  const accuracy =
    session.stats?.accuracy_pct ??
    (session.stats?.hits_total && session.stats?.shots_fired
      ? Math.round((session.stats.hits_total / session.stats.shots_fired) * 100)
      : null);
  const groupSize = session.stats?.best_dispersion_cm;
  const distance = session.drill_config?.distance_m || '';
  const shots = session.stats?.shots_fired || 0;
  const hits = session.stats?.hits_total || 0;
  const targetCount = session.stats?.target_count || 0;

  // Get participant count for squad/group sessions
  const participantCount = isSquadOrGroup
    ? ((session.stats as any)?.participant_count ??
      session.engagement?.engagement_participants?.filter((p: any) => p.state === 'joined').length ??
      0)
    : 0;

  // Build meta text based on session type
  const getMetaText = () => {
    if (isSquadOrGroup) {
      // Squad/Group: show participants + shots
      return `${t('training.shootersCount', { count: participantCount })} · ${shots} ${t('session.shots')}${hits > 0 ? ` · ${hits} ${t('session.hits')}` : ''}`;
    } else if (isGrouping) {
      // Grouping: show distance, shots, and targets scanned
      const parts = [];
      if (distance) parts.push(`${distance}m`);
      if (shots > 0) parts.push(`${shots} ${t('session.shots')}`);
      if (targetCount > 0) parts.push(t('training.targetsCount', { count: targetCount }));
      return parts.length > 0
        ? parts.join(' · ')
        : groupSize != null
          ? t('training.groupSize', { size: groupSize.toFixed(1) })
          : t('training.completed');
    } else {
      // Solo engagement: show distance + shots
      return `${distance ? `${distance}m · ` : ''}${shots > 0 ? `${shots} ${t('session.shots')}` : t('common.noData')}`;
    }
  };

  // Determine icon color based on session type
  const iconBg = isSquadOrGroup ? colors.primary + '15' : isGrouping ? colors.orange + '15' : colors.green + '15';
  const iconColor = isSquadOrGroup ? colors.primary : isGrouping ? colors.orange : colors.green;

  return (
    <View style={[styles.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      <View style={[styles.sessionIcon, { backgroundColor: iconBg }]}>
        {isSquadOrGroup ? (
          <Users size={14} color={iconColor} />
        ) : isGrouping ? (
          <Target size={14} color={iconColor} />
        ) : (
          <CheckCircle2 size={14} color={iconColor} />
        )}
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.sessionNameRow}>
          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
            {drillName}
          </Text>
          {isSquadOrGroup && (
            <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.squadBadgeText, { color: colors.primary }]}>
                {engagementMode === 'group' ? t('training.groupType') : t('training.squadType')}
              </Text>
            </View>
          )}
          {isGrouping && !isSquadOrGroup && (
            <View style={[styles.squadBadge, { backgroundColor: colors.orange + '15' }]}>
              <Text style={[styles.squadBadgeText, { color: colors.orange }]}>{t('training.groupingType')}</Text>
            </View>
          )}
        </View>
        <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>{getMetaText()}</Text>
      </View>
      {/* Stats display - different for each session type */}
      {isSquadOrGroup ? (
        // Squad/group: show total shots only (no accuracy %)
        shots > 0 ? (
          <Text style={[styles.sessionResult, { color: colors.primary }]}>{shots}</Text>
        ) : null
      ) : isGrouping ? (
        // Grouping: show group size (primary metric)
        groupSize != null && groupSize > 0 ? (
          <Text style={[styles.sessionResult, { color: colors.orange }]}>{groupSize.toFixed(1)}cm</Text>
        ) : null
      ) : accuracy !== null ? (
        // Solo engagement: show accuracy %
        <Text style={[styles.sessionResult, { color: colors.green }]}>{accuracy}%</Text>
      ) : null}
    </View>
  );
}

/**
 * Section 4: Planned Drills List (Available Actions)
 */
function PlannedDrillsList({
  training,
  colors,
  onStartDrill,
  disabled = false,
}: {
  training: any;
  colors: any;
  onStartDrill: (drill: TrainingDrill) => void;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  if (!training.drills || training.drills.length === 0) return null;

  const canStart = training.status === 'ongoing' && !disabled;

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
        {canStart ? t('training.availableDrills') : t('training.plannedDrills')}
      </Text>

      <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {training.drills
          .sort((a: any, b: any) => (a.order_index ?? 0) - (b.order_index ?? 0))
          .map((drill: any, idx: number) => (
            <DrillRow
              key={drill.id}
              drill={drill}
              index={idx}
              colors={colors}
              canStart={canStart}
              isLast={idx === training.drills!.length - 1}
              onStart={() => onStartDrill(drill)}
            />
          ))}
      </View>

      {training.status === 'planned' && (
        <Text style={[styles.drillsHint, { color: colors.textMuted }]}>{t('training.startTrainingToEnable')}</Text>
      )}
    </View>
  );
}

/**
 * Single Drill Row (for planned drills)
 */
function DrillRow({
  drill,
  index,
  colors,
  canStart,
  isLast,
  onStart,
}: {
  drill: any;
  index: number;
  colors: any;
  canStart: boolean;
  isLast: boolean;
  onStart: () => void;
}) {
  const { t } = useTranslation();
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.blue : colors.orange;

  // Execution policy display
  const policy = (drill.execution_policy || 'locked') as 'locked' | 'guided' | 'free';
  const policyConfigs = {
    locked: { Icon: Lock, color: colors.blue, label: t('training.locked') },
    guided: { Icon: Sparkles, color: colors.green, label: t('training.guided') },
    free: { Icon: Unlock, color: colors.orange, label: t('training.free') },
  };
  const policyConfig = policyConfigs[policy];

  return (
    <TouchableOpacity
      style={[styles.sessionRow, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
      onPress={onStart}
      disabled={!canStart}
      activeOpacity={canStart ? 0.7 : 1}
    >
      <View style={[styles.sessionIcon, { backgroundColor: goalColor + '15' }]}>
        <Target size={14} color={goalColor} />
      </View>
      <View style={styles.sessionInfo}>
        <View style={styles.drillNameRow}>
          <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
            {drill.name || t('training.drill', { number: index + 1 })}
          </Text>
          <View style={[styles.policyBadge, { backgroundColor: `${policyConfig.color}15` }]}>
            <policyConfig.Icon size={10} color={policyConfig.color} />
            <Text style={[styles.policyBadgeText, { color: policyConfig.color }]}>{policyConfig.label}</Text>
          </View>
        </View>
        <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
          {isGrouping ? t('session.grouping') : t('session.engagement')}
          {drill.distance_category
            ? ` · ${drill.distance_category === 'short' ? t('training.shortRange') : drill.distance_category === 'medium' ? t('training.mediumRange') : t('training.longRange')}`
            : drill.distance_m != null
              ? ` · ${drill.distance_m}m`
              : ''}
          {drill.rounds_per_shooter != null ? ` · ${drill.rounds_per_shooter} ${t('session.shots')}` : ''}
          {drill.position && ` · ${t(`session.${drill.position}`)}`}
          {!drill.distance_category &&
            drill.distance_m == null &&
            drill.rounds_per_shooter == null &&
            ` · ${t('training.soldierChooses')}`}
        </Text>
      </View>
      {canStart && (
        <View style={[styles.startDrillBtn, { backgroundColor: colors.green }]}>
          <Play size={12} color="#fff" fill="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
}

/**
 * Empty State - When no drills or sessions exist
 */
function EmptyState({
  training,
  completedSessions,
  colors,
}: {
  training: any;
  completedSessions: SessionWithDetails[];
  colors: any;
}) {
  const { t } = useTranslation();
  // Show pending notice if drills exist but no sessions
  if (completedSessions.length === 0 && training.drills?.length > 0) {
    return (
      <View style={[styles.pendingNotice, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.pendingText, { color: colors.textMuted }]}>{t('training.noCompletedSessionsYet')}</Text>
      </View>
    );
  }

  // Show empty state if no drills AND no sessions
  if (completedSessions.length === 0 && (!training.drills || training.drills.length === 0)) {
    return (
      <View style={[styles.emptyState, { borderColor: colors.border }]}>
        <View style={[styles.emptyIcon, { backgroundColor: colors.secondary }]}>
          <Target size={24} color={colors.textMuted} />
        </View>
        <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('training.noDrillsYet')}</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>{t('training.noDrillsConfigured')}</Text>
      </View>
    );
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCROLL CONTENT
// ═══════════════════════════════════════════════════════════════════════════════

function TrainingSummaryContent({
  training,
  colors,
  insets,
  completedSessions,
  canManageTraining,
  isInvited,
  onBack,
  onOpenSettings,
  onStartTraining,
  onEndTraining,
  onStartDrill,
  isUpdatingStatus,
  currentUserId,
  onRefresh,
}: {
  training: any;
  colors: any;
  insets: any;
  completedSessions: SessionWithDetails[];
  canManageTraining: boolean;
  isInvited: boolean;
  onBack: () => void;
  onOpenSettings: () => void;
  onStartTraining: () => void;
  onEndTraining: () => void;
  onStartDrill: (drill: TrainingDrill) => void;
  isUpdatingStatus: boolean;
  currentUserId: string | null;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'drills' | 'results'>('drills');
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  // Expanded hero: fades & slides out as you scroll
  const heroAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [0, COLLAPSE_THRESHOLD], [1, 0], Extrapolation.CLAMP),
    transform: [
      {
        translateY: interpolate(
          scrollOffset.value,
          [-HEADER_HEIGHT, 0, COLLAPSE_THRESHOLD],
          [-HEADER_HEIGHT * 0.3, 0, -20],
          Extrapolation.CLAMP
        ),
      },
    ],
  }));

  // Sticky bar: fades in after scrolling past threshold
  const stickyAnimatedStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollOffset.value, [COLLAPSE_THRESHOLD * 0.6, COLLAPSE_THRESHOLD], [0, 1], Extrapolation.CLAMP),
    pointerEvents: scrollOffset.value > COLLAPSE_THRESHOLD * 0.8 ? 'auto' : 'none',
  }));

  return (
    <View style={{ flex: 1 }}>
      {/* Sticky Compact Header — positioned above the scroll view */}
      <StickyHeader
        training={training}
        colors={colors}
        insets={insets}
        canManageTraining={canManageTraining}
        onBack={onBack}
        onStartTraining={onStartTraining}
        onEndTraining={onEndTraining}
        isUpdatingStatus={isUpdatingStatus}
        stickyAnimatedStyle={stickyAnimatedStyle}
      />

      <Animated.ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
      >
        {/* Expanded Hero */}
        <ExpandedHero
          training={training}
          colors={colors}
          insets={insets}
          completedSessions={completedSessions}
          canManageTraining={canManageTraining}
          onBack={onBack}
          onOpenSettings={onOpenSettings}
          onStartTraining={onStartTraining}
          onEndTraining={onEndTraining}
          isUpdatingStatus={isUpdatingStatus}
          heroAnimatedStyle={heroAnimatedStyle}
        />

        {/* Tab Bar */}
        <TabBar activeTab={activeTab} onTabChange={setActiveTab} colors={colors} />

        <View style={styles.contentContainer}>
          {activeTab === 'drills' ? (
            <>
              {/* Not Invited Banner */}
              {!isInvited && (
                <View
                  style={[
                    styles.notInvitedBanner,
                    { backgroundColor: `${colors.orange}10`, borderColor: `${colors.orange}25` },
                  ]}
                >
                  <ShieldAlert size={18} color={colors.orange} strokeWidth={1.5} />
                  <View style={styles.notInvitedInfo}>
                    <Text style={[styles.notInvitedTitle, { color: colors.text }]}>
                      {t('training.notInvited', 'Not Invited')}
                    </Text>
                    <Text style={[styles.notInvitedText, { color: colors.textMuted }]}>
                      {t(
                        'training.notInvitedDesc',
                        'You were not selected for this training. Contact your commander for access.'
                      )}
                    </Text>
                  </View>
                </View>
              )}

              {/* Squad/Group Session Banners — only for invited participants */}
              {isInvited && training.id && currentUserId && (
                <>
                  <SquadLobbyBanner trainingId={training.id} userId={currentUserId} onLobbyChanged={onRefresh} />
                  <SquadInvitationBanner
                    trainingId={training.id}
                    userId={currentUserId}
                    onInvitationChanged={onRefresh}
                  />
                </>
              )}

              {/* Planned Drills */}
              <PlannedDrillsList training={training} colors={colors} onStartDrill={onStartDrill} disabled={!isInvited} />

              {/* Empty State for drills */}
              <EmptyState training={training} completedSessions={completedSessions} colors={colors} />
            </>
          ) : (
            <>
              <SummaryCard training={training} completedSessions={completedSessions} colors={colors} />
              <CompletedSessionsList completedSessions={completedSessions} colors={colors} />
              {completedSessions.length === 0 && (
                <View style={[styles.emptyResults, { borderColor: colors.border }]}>
                  <Text style={[styles.emptyResultsText, { color: colors.textMuted }]}>
                    {t('training.noCompletedSessions')}
                  </Text>
                </View>
              )}
            </>
          )}
        </View>

        {/* Footer */}
        <Text style={[styles.footer, { color: colors.textMuted }]}>
          {t('training.created')} {formatDistanceToNow(new Date(training.created_at), { addSuffix: true })}
        </Text>
      </Animated.ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SCREEN
// ═══════════════════════════════════════════════════════════════════════════════

export default function TrainingDetailScreen() {
  const { t } = useTranslation();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const { canManageTraining: canManageByRole } = usePermissions();
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const params = useLocalSearchParams<{ id?: string }>();
  const { selectedTraining: contextTraining } = useModals();

  // ─────────────────────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────────────────────
  const [showSettings, setShowSettings] = useState(false);
  const [completedSessions, setCompletedSessions] = useState<SessionWithDetails[]>([]);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  // Start drill sheet state
  const [selectedDrill, setSelectedDrill] = useState<TrainingDrill | null>(null);
  const [showStartDrillSheet, setShowStartDrillSheet] = useState(false);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Training Data
  // ─────────────────────────────────────────────────────────────────────────────
  const trainingId = params.id || contextTraining?.id;
  const { training, loading, setTraining } = useTrainingDetail(trainingId, contextTraining);

  const isCreator = training?.creator?.id === session?.user?.id;
  const activeTeamMatchesTraining = !training?.team_id || training?.team_id === activeTeamId;
  const canManageTraining = isCreator || (canManageByRole && activeTeamMatchesTraining);

  // Invitation check — commanders/creators always have access
  const isInvited = (() => {
    if (!training || !session?.user?.id) return true; // loading or no user
    if (canManageTraining) return true; // commanders/creators always invited
    if (training.invite_all !== false) return true; // default: everyone invited
    if (!training.invited_member_ids?.length) return true; // no restriction list
    return training.invited_member_ids.includes(session.user.id);
  })();

  // ─────────────────────────────────────────────────────────────────────────────
  // Load Completed Sessions
  // ─────────────────────────────────────────────────────────────────────────────
  const loadCompletedSessions = useCallback(async () => {
    if (!training?.id || !isMountedRef.current) return;
    try {
      const sessions = await getTrainingSessionsWithStats(training.id);
      if (isMountedRef.current) {
        setCompletedSessions(sessions.filter((s) => s.status === 'completed'));
      }
    } catch (error) {
      console.error('[TrainingDetail] Failed to load sessions:', error);
    }
  }, [training?.id]);

  useEffect(() => {
    if (training?.id) loadCompletedSessions();
  }, [training?.id, loadCompletedSessions]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Realtime Subscription - Training Status Changes
  // ─────────────────────────────────────────────────────────────────────────────
  const handleTrainingRealtimeUpdate = useCallback(
    (updatedTraining: { id: string; status: 'planned' | 'ongoing' | 'finished' | 'cancelled' }) => {
      // Safety: Validate the payload before processing
      const validStatuses = ['planned', 'ongoing', 'finished', 'cancelled'];
      if (!updatedTraining?.id || !updatedTraining?.status || !validStatuses.includes(updatedTraining.status)) {
        console.warn('[TrainingDetail] Invalid realtime payload, ignoring:', updatedTraining);
        return;
      }

      // Safety: Only process if the training ID matches
      if (updatedTraining.id !== training?.id) {
        console.warn('[TrainingDetail] Received update for different training, ignoring');
        return;
      }

      console.log('[TrainingDetail] Realtime update received:', updatedTraining.status);

      // Update local training state with new status
      setTraining((prev: any) => {
        if (!prev) return prev;
        // Only update if status actually changed
        if (prev.status === updatedTraining.status) return prev;
        return { ...prev, status: updatedTraining.status };
      });

      // If training was ended/cancelled by commander, give haptic feedback
      if (updatedTraining.status === 'finished' || updatedTraining.status === 'cancelled') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    },
    [setTraining, training?.id]
  );

  // Subscribe to training and session changes
  // This is READ-ONLY - it only listens for database changes, never triggers writes
  useTrainingRealtime({
    trainingId: training?.id,
    onTrainingUpdate: handleTrainingRealtimeUpdate,
    onSessionUpdate: loadCompletedSessions,
    onSessionCreate: loadCompletedSessions,
    enabled: !!training?.id && training.status !== 'finished' && training.status !== 'cancelled',
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Navigation Handlers
  // ─────────────────────────────────────────────────────────────────────────────
  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(protected)/(tabs)');
    }
  }, []);

  const handleOpenSettings = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSettings(true);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Training Status Handlers (Commander Only)
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartTraining = useCallback(async () => {
    if (!training?.id || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await startTraining(training.id);
      if (updated) {
        setTraining((prev: any) => ({ ...prev, status: 'ongoing', started_at: updated.started_at }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error: any) {
      console.error('[TrainingDetail] Failed to start training:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [training?.id, isUpdatingStatus, setTraining]);

  const handleEndTraining = useCallback(async () => {
    if (!training?.id || isUpdatingStatus) return;
    setIsUpdatingStatus(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const updated = await finishTraining(training.id);
      if (updated) {
        setTraining((prev: any) => ({ ...prev, status: 'finished', ended_at: updated.ended_at }));
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Navigate to training report after finishing
        router.push({
          pathname: '/(protected)/trainingReport',
          params: { trainingId: training.id },
        });
      }
    } catch (error: any) {
      console.error('[TrainingDetail] Failed to end training:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdatingStatus(false);
    }
  }, [training?.id, isUpdatingStatus, setTraining]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Drill Start Handler - Opens bottom sheet instead of navigating
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartDrill = useCallback(
    (drill: TrainingDrill) => {
      if (!training?.id || !isInvited) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setSelectedDrill(drill);
      setShowStartDrillSheet(true);
    },
    [training?.id, isInvited]
  );

  const handleCloseStartDrillSheet = useCallback(() => {
    setShowStartDrillSheet(false);
    setSelectedDrill(null);
  }, []);

  // ─────────────────────────────────────────────────────────────────────────────
  // Loading State
  // ─────────────────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.textMuted} />
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Not Found State
  // ─────────────────────────────────────────────────────────────────────────────
  if (!training) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity onPress={handleBack} style={[styles.headerBtn, { backgroundColor: colors.card }]}>
            <ArrowLeft size={20} color={colors.text} />
          </TouchableOpacity>
        </View>
        <View style={styles.notFoundContainer}>
          <AlertCircle size={48} color={colors.textMuted} />
          <Text style={[styles.notFoundTitle, { color: colors.text }]}>{t('training.trainingNotFound')}</Text>
          <Text style={[styles.notFoundText, { color: colors.textMuted }]}>{t('training.notFoundMessage')}</Text>
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Main Render
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <TrainingSummaryContent
        training={training}
        colors={colors}
        insets={insets}
        completedSessions={completedSessions}
        canManageTraining={canManageTraining}
        isInvited={isInvited}
        onBack={handleBack}
        onOpenSettings={handleOpenSettings}
        onStartTraining={handleStartTraining}
        onEndTraining={handleEndTraining}
        onStartDrill={handleStartDrill}
        isUpdatingStatus={isUpdatingStatus}
        currentUserId={session?.user?.id || null}
        onRefresh={loadCompletedSessions}
      />

      <TrainingSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        training={training}
        onUpdate={setTraining}
        colors={colors}
      />

      {/* Run Drill Sheet - soldier picks values and runs drill (only for invited participants) */}
      {isInvited && (
        <RunDrillSheet
          visible={showStartDrillSheet}
          onClose={handleCloseStartDrillSheet}
          drill={selectedDrill}
          trainingId={training.id}
          teamId={training.team_id || ''}
        />
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  // Container
  container: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  contentContainer: { paddingHorizontal: 16, gap: 16, marginTop: 16 },

  // Not Invited Banner
  notInvitedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  notInvitedInfo: {
    flex: 1,
    gap: 2,
  },
  notInvitedTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  notInvitedText: {
    fontSize: 12,
    lineHeight: 16,
  },

  // Loading & Error States
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    paddingBottom: 100,
  },
  notFoundTitle: { fontSize: 18, fontWeight: '700', marginTop: 16, marginBottom: 8 },
  notFoundText: { fontSize: 14, textAlign: 'center' },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 8,
    gap: 12,
  },
  headerBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded Hero
  heroCard: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    gap: 6,
    marginBottom: 10,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 30,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 6,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commanderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  commanderBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700',
  },

  // Sticky Compact Bar
  stickyBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  stickyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 10,
  },
  stickyBackBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stickyTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  stickyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stickyBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stickyAction: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Tab Bar
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Summary Card
  summaryCard: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
  },
  summaryAccent: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  summaryHeadline: { fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  summarySubtitle: { fontSize: 13, marginBottom: 4 },
  metricsRow: {
    flexDirection: 'row',
    alignSelf: 'stretch',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  metric: { flex: 1, alignItems: 'center', gap: 2 },
  metricValue: { fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricDivider: { width: 1, height: 28, alignSelf: 'center' },

  // Sections
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },

  // User Groups (for sessions)
  userGroup: { gap: 8 },
  userHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 2,
  },
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 11, fontWeight: '700' },
  userName: { flex: 1, fontSize: 13, fontWeight: '600' },
  userCount: { fontSize: 12, fontWeight: '500' },

  // Sessions List
  sessionsList: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 14, gap: 10 },
  sessionIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, gap: 4 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sessionName: { fontSize: 15, fontWeight: '600', letterSpacing: -0.2 },
  sessionMeta: { fontSize: 12 },
  sessionResult: { fontSize: 14, fontWeight: '700' },

  // Badges
  squadBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  squadBadgeText: { fontSize: 10, fontWeight: '600' },
  drillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  policyBadgeText: { fontSize: 9, fontWeight: '600', textTransform: 'uppercase' },

  // Start Drill Button
  startDrillBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillsHint: { fontSize: 12, textAlign: 'center', marginTop: 8, fontStyle: 'italic' },

  // Empty States
  pendingNotice: { padding: 16, borderRadius: 14, borderWidth: 1 },
  pendingText: { fontSize: 13, textAlign: 'center', lineHeight: 20 },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 10,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptySubtitle: { fontSize: 13, textAlign: 'center' },

  // Empty Results (for Results tab)
  emptyResults: {
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 14,
  },

  // Footer
  footer: {
    fontSize: 12,
    textAlign: 'center',
    paddingVertical: 24,
    paddingHorizontal: 16,
    opacity: 0.5,
  },
});
