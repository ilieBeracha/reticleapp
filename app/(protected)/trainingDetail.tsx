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
import { MissMarker } from '@/components/targets/MissMarker';
import { TrainingSettingsModal } from '@/components/training/detail/TrainingSettingsModal';
import { SquadInvitationBanner } from '@/components/training/SquadInvitationBanner';
import { SquadLobbyBanner } from '@/components/training/SquadLobbyBanner';
import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useTrainingRealtime } from '@/hooks/realtime/training/useTrainingRealtime';
import { useTrainingDetail } from '@/hooks/training/useTrainingDetail';
import { useColors } from '@/hooks/ui/useColors';
import { usePermissions } from '@/hooks/usePermissions';
import { requireCurrentUserId } from '@/services/authService';
import { getOrCreateSetupSession } from '@/services/session/mutations';
import { createEngagement } from '@/services/session/participants';
import { getActiveSquadEngagement, getMyActiveSessionForTraining, getTrainingSessionsWithStats } from '@/services/session/queries';
import { saveMissPoints } from '@/services/session/targets';
import { finishTraining, startTraining } from '@/services/trainingService';
import { getMyMostRecentWeaponId } from '@/services/weaponService';
import { useGarminStore } from '@/stores/garminStore';
import { useTeamStore } from '@/stores/teamStore';
import type { MissPoint, SessionWithDetails } from '@/types/session';
import type { TrainingDrill } from '@/types/workspace';
import { useFocusEffect } from '@react-navigation/native';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Crosshair,
  Crown,
  Flag,
  Lock,
  Play,
  Settings,
  ShieldAlert,
  Target,
  Trophy,
  Users,
  Zap
} from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={[styles.tabBar, {borderBottomColor: colors.border }]}>
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
 * Results Tab Content
 * Unified overview + type filter chips + filtered session list
 */
type ResultsFilter = 'all' | 'squad' | 'grouping' | 'solo';

function ResultsTabContent({
  completedSessions,
  colors,
  currentUserId,
  onMarkMisses,
}: {
  completedSessions: SessionWithDetails[];
  colors: any;
  currentUserId: string | null;
  onMarkMisses?: (session: SessionWithDetails) => void;
}) {
  const { t } = useTranslation();
  const [activeFilter, setActiveFilter] = useState<ResultsFilter>('all');
  const [expandedSquadId, setExpandedSquadId] = useState<string | null>(null);

  // Split sessions by type
  const squadSessions = completedSessions.filter((s) => {
    const mode = s.engagement?.engagement_mode;
    return mode === 'squad' || mode === 'group';
  });
  const groupingSessions = completedSessions.filter((s) => {
    const goal = s.engagement?.drill_goal || s.drill_config?.drill_goal;
    const mode = s.engagement?.engagement_mode;
    return goal === 'grouping' && mode !== 'squad' && mode !== 'group';
  });
  const soloSessions = completedSessions.filter((s) => {
    const goal = s.engagement?.drill_goal || s.drill_config?.drill_goal;
    const mode = s.engagement?.engagement_mode;
    return goal !== 'grouping' && mode !== 'squad' && mode !== 'group';
  });

  // Compute aggregate stats for the overview card
  // Solo + grouping stats from session_targets
  const soloShots = soloSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
  const soloHits = soloSessions.reduce((sum, s) => sum + (s.stats?.hits_total || 0), 0);
  // Squad stats from engagement_participants
  let squadShots = 0;
  let squadHits = 0;
  const allSquadParticipantIds = new Set<string>();
  squadSessions.forEach((s) => {
    const joined = s.engagement?.engagement_participants?.filter((p: any) => p.state === 'joined') || [];
    joined.forEach((p: any) => {
      allSquadParticipantIds.add(p.user_id);
      squadShots += p.shots_fired || 0;
      squadHits += p.hits || 0;
    });
  });
  const totalShots = soloShots + squadShots;
  const totalHits = soloHits + squadHits;
  const overallAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : null;
  const uniqueShooters = new Set([
    ...completedSessions.map((s) => s.user_id),
    ...Array.from(allSquadParticipantIds),
  ]).size;

  // Compute per-type headline stats for filter chips
  const squadAccuracy = squadShots > 0 ? Math.round((squadHits / squadShots) * 100) : null;
  const groupingBestGroupings = groupingSessions
    .map((s) => s.stats?.best_dispersion_cm)
    .filter((v): v is number => v !== null && v !== undefined && v > 0);
  const groupingBest = groupingBestGroupings.length > 0 ? Math.min(...groupingBestGroupings) : null;
  const soloAccuracy = soloShots > 0 ? Math.round((soloHits / soloShots) * 100) : null;

  // Filtered sessions
  const filteredSessions =
    activeFilter === 'squad'
      ? squadSessions
      : activeFilter === 'grouping'
        ? groupingSessions
        : activeFilter === 'solo'
          ? soloSessions
          : completedSessions;

  // Filter chip data
  const filters: { key: ResultsFilter; label: string; count: number; color: string; Icon: any; stat: string | null }[] = [
    {
      key: 'all',
      label: t('common.all', 'All'),
      count: completedSessions.length,
      color: colors.text,
      Icon: Trophy,
      stat: overallAccuracy !== null ? `${overallAccuracy}%` : null,
    },
    {
      key: 'squad',
      label: t('training.squadType', 'Squad'),
      count: squadSessions.length,
      color: colors.primary,
      Icon: Users,
      stat: squadAccuracy !== null ? `${squadAccuracy}%` : null,
    },
    {
      key: 'grouping',
      label: t('training.groupingType', 'Grouping'),
      count: groupingSessions.length,
      color: colors.orange,
      Icon: Target,
      stat: groupingBest !== null ? `${groupingBest.toFixed(1)}cm` : null,
    },
    {
      key: 'solo',
      label: t('session.engagement', 'Solo'),
      count: soloSessions.length,
      color: colors.green,
      Icon: CheckCircle2,
      stat: soloAccuracy !== null ? `${soloAccuracy}%` : null,
    },
  ];

  // Only show filter chips that have sessions (always show "All")
  const visibleFilters = filters.filter((f) => f.key === 'all' || f.count > 0);

  if (completedSessions.length === 0) return null;

  return (
    <View style={styles.resultsContainer}>
      {/* Overview Card */}
      <View style={[styles.overviewCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.overviewTop}>
          <View style={styles.overviewMainStat}>
            <Text style={[styles.overviewValue, { color: colors.text }]}>
              {overallAccuracy !== null ? `${overallAccuracy}%` : `${completedSessions.length}`}
            </Text>
            <Text style={[styles.overviewLabel, { color: colors.textMuted }]}>
              {overallAccuracy !== null ? t('training.accuracy', 'Accuracy') : t('training.sessions', 'Sessions')}
            </Text>
          </View>
          <View style={styles.overviewSecondaryStats}>
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{totalShots || '—'}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textMuted }]}>{t('session.shots')}</Text>
            </View>
            <View style={[styles.overviewStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{totalHits || '—'}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textMuted }]}>{t('session.hits')}</Text>
            </View>
            <View style={[styles.overviewStatDivider, { backgroundColor: colors.border }]} />
            <View style={styles.overviewStat}>
              <Text style={[styles.overviewStatValue, { color: colors.text }]}>{uniqueShooters || '—'}</Text>
              <Text style={[styles.overviewStatLabel, { color: colors.textMuted }]}>{t('training.shooters')}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Filter Chips - only show when more than one type exists */}
      {visibleFilters.length > 2 && (
        <View style={styles.filterChipsRow}>
          {visibleFilters.map((f) => {
            const isActive = activeFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: isActive ? f.color + '15' : colors.card,
                    borderColor: isActive ? f.color + '30' : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(f.key)}
                activeOpacity={0.7}
              >
                <f.Icon size={12} color={isActive ? f.color : colors.textMuted} />
                <Text
                  style={[
                    styles.filterChipText,
                    { color: isActive ? f.color : colors.textMuted },
                  ]}
                >
                  {f.label}
                </Text>
                <View style={[styles.filterChipCount, { backgroundColor: isActive ? f.color + '20' : colors.secondary }]}>
                  <Text style={[styles.filterChipCountText, { color: isActive ? f.color : colors.textMuted }]}>
                    {f.count}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Per-type summary strip (shows when a specific filter is active) */}
      {activeFilter !== 'all' && (
        <ResultsFilterSummary
          filter={activeFilter}
          squadSessions={squadSessions}
          groupingSessions={groupingSessions}
          soloSessions={soloSessions}
          squadShots={squadShots}
          squadHits={squadHits}
          squadParticipantCount={allSquadParticipantIds.size}
          soloShots={soloShots}
          soloHits={soloHits}
          groupingBest={groupingBest}
          groupingTargets={groupingSessions.reduce((sum, s) => sum + (s.stats?.target_count || 0), 0)}
          colors={colors}
        />
      )}

      {/* Session List */}
      <View style={[styles.sessionsList, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {filteredSessions.map((s, idx) => {
          const isSquad = s.engagement?.engagement_mode === 'squad' || s.engagement?.engagement_mode === 'group';
          if (isSquad) {
            return (
              <ExpandableSquadRow
                key={s.id}
                session={s}
                colors={colors}
                currentUserId={currentUserId}
                isLast={idx === filteredSessions.length - 1}
                isExpanded={expandedSquadId === s.id}
                onToggle={() => setExpandedSquadId(expandedSquadId === s.id ? null : s.id)}
              />
            );
          }
          return (
            <SessionRow key={s.id} session={s} colors={colors} isLast={idx === filteredSessions.length - 1} onMarkMisses={onMarkMisses} />
          );
        })}
      </View>
    </View>
  );
}

/**
 * Per-type summary strip shown when filtering by a specific type
 */
function ResultsFilterSummary({
  filter,
  squadSessions,
  groupingSessions,
  soloSessions,
  squadShots,
  squadHits,
  squadParticipantCount,
  soloShots,
  soloHits,
  groupingBest,
  groupingTargets,
  colors,
}: {
  filter: ResultsFilter;
  squadSessions: SessionWithDetails[];
  groupingSessions: SessionWithDetails[];
  soloSessions: SessionWithDetails[];
  squadShots: number;
  squadHits: number;
  squadParticipantCount: number;
  soloShots: number;
  soloHits: number;
  groupingBest: number | null;
  groupingTargets: number;
  colors: any;
}) {
  const { t } = useTranslation();

  const getMetrics = (): { values: { label: string; value: string }[]; color: string } => {
    if (filter === 'squad') {
      const acc = squadShots > 0 ? `${Math.round((squadHits / squadShots) * 100)}%` : '—';
      return {
        color: colors.primary,
        values: [
          { label: t('session.shots'), value: `${squadShots || '—'}` },
          { label: t('session.hits'), value: `${squadHits || '—'}` },
          { label: t('training.accuracy', 'Accuracy'), value: acc },
          { label: t('training.shooters'), value: `${squadParticipantCount || '—'}` },
        ],
      };
    }
    if (filter === 'grouping') {
      return {
        color: colors.orange,
        values: [
          { label: t('training.sessions', 'Sessions'), value: `${groupingSessions.length}` },
          { label: t('training.bestCm'), value: groupingBest !== null ? `${groupingBest.toFixed(1)}` : '—' },
          { label: t('training.targets'), value: `${groupingTargets || '—'}` },
        ],
      };
    }
    // solo
    const acc = soloShots > 0 ? `${Math.round((soloHits / soloShots) * 100)}%` : '—';
    return {
      color: colors.green,
      values: [
        { label: t('session.shots'), value: `${soloShots || '—'}` },
        { label: t('session.hits'), value: `${soloHits || '—'}` },
        { label: t('training.accuracy', 'Accuracy'), value: acc },
      ],
    };
  };

  const { values, color } = getMetrics();

  return (
    <View style={[styles.filterSummary, { backgroundColor: color + '08', borderColor: color + '20' }]}>
      {values.map((v) => (
        <View key={v.label} style={styles.filterSummaryItem}>
          <Text style={[styles.filterSummaryValue, { color }]}>{v.value}</Text>
          <Text style={[styles.filterSummaryLabel, { color: colors.textMuted }]}>{v.label}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Expandable squad session row with participant breakdown
 */
function ExpandableSquadRow({
  session,
  colors,
  currentUserId,
  isLast,
  isExpanded,
  onToggle,
}: {
  session: SessionWithDetails;
  colors: any;
  currentUserId: string | null;
  isLast: boolean;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const drillName = session.drill_config?.name || session.drill_name || t('session.title');
  const engagementMode = session.engagement?.engagement_mode;
  const joined = session.engagement?.engagement_participants?.filter((p: any) => p.state === 'joined') || [];
  const shots = joined.reduce((sum: number, p: any) => sum + (p.shots_fired || 0), 0);
  const hits = joined.reduce((sum: number, p: any) => sum + (p.hits || 0), 0);
  const commanderId = session.user_id;
  const measurementScope = session.drill_config?.measurement_scope;
  const isCollective = measurementScope === 'collective';

  return (
    <View style={[!isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
      {/* Tappable header row */}
      <TouchableOpacity style={styles.sessionRow} onPress={onToggle} activeOpacity={0.6}>
        <View style={[styles.sessionIcon, { backgroundColor: colors.primary + '15' }]}>
          <Users size={14} color={colors.primary} />
        </View>
        <View style={styles.sessionInfo}>
          <View style={styles.sessionNameRow}>
            <Text style={[styles.sessionName, { color: colors.text }]} numberOfLines={1}>
              {drillName}
            </Text>
            <View style={[styles.squadBadge, { backgroundColor: colors.primary + '15' }]}>
              <Text style={[styles.squadBadgeText, { color: colors.primary }]}>
                {engagementMode === 'group' ? t('training.groupType') : t('training.squadType')}
              </Text>
            </View>
          </View>
          <Text style={[styles.sessionMeta, { color: colors.textMuted }]}>
            {t('training.shootersCount', { count: joined.length })} · {shots} {t('session.shots')}
            {hits > 0 ? ` · ${hits} ${t('session.hits')}` : ''}
          </Text>
        </View>
        {shots > 0 && hits > 0 && (
          <Text style={[styles.sessionResult, { color: colors.primary }]}>
            {Math.round((hits / shots) * 100)}%
          </Text>
        )}
      </TouchableOpacity>

      {/* Expanded participant list */}
      {isExpanded && (
        <View style={[styles.participantList, { backgroundColor: colors.background }]}>
          {isCollective && (
            <View style={{ paddingHorizontal: 12, paddingVertical: 6 }}>
              <Text style={{ color: colors.primary, fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                {t('session.collectiveResults', 'Collective Results')}
              </Text>
            </View>
          )}
          {joined.map((p: any, idx: number) => {
            const isMe = p.user_id === currentUserId;
            const isOwner = p.user_id === commanderId;
            const pShots = p.shots_fired || 0;
            const pHits = p.hits || 0;
            const pAcc = pShots > 0 ? Math.round((pHits / pShots) * 100) : null;
            const hasTargetResults = p.target_results && Array.isArray(p.target_results) && p.target_results.length > 1;
            return (
              <View
                key={p.user_id}
                style={[
                  idx < joined.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.squadParticipantRow}>
                  <View style={[styles.userAvatar, { backgroundColor: colors.secondary, width: 26, height: 26, borderRadius: 13 }]}>
                    <Text style={[styles.userAvatarText, { color: colors.textMuted, fontSize: 10 }]}>
                      {(p.user_full_name || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={[styles.squadParticipantName, { color: colors.text }]} numberOfLines={1}>
                    {p.user_full_name || t('common.unknown')}
                  </Text>
                  {isMe && (
                    <View style={[styles.squadBadge, { backgroundColor: colors.primary + '20' }]}>
                      <Text style={[styles.squadBadgeText, { color: colors.primary, fontSize: 9 }]}>{t('common.you')}</Text>
                    </View>
                  )}
                  {isOwner && <Crown size={11} color={colors.orange} />}
                  <Text style={[styles.squadParticipantShots, { color: colors.textMuted }]}>
                    {pShots > 0
                      ? `${pShots} ${t('session.shots')}${pAcc !== null ? ` · ${pAcc}%` : ''}`
                      : t('session.notReportedYet')}
                  </Text>
                </View>
                {/* Per-target breakdown (if multi-target) */}
                {hasTargetResults && (
                  <View style={{ paddingLeft: 38, paddingBottom: 6, paddingRight: 12 }}>
                    {p.target_results.map((tr: any) => (
                      <Text key={tr.target_number} style={{ color: colors.textMuted, fontSize: 11, paddingVertical: 1 }}>
                        {t('session.targetNumber', { number: tr.target_number, defaultValue: `Target ${tr.target_number}` })}: {tr.shots_fired} {t('session.shots')} / {tr.hits} {t('session.hits')}
                      </Text>
                    ))}
                  </View>
                )}
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

/**
 * Single Session Row (for completed sessions)
 */
function SessionRow({
  session,
  colors,
  isLast,
  onMarkMisses,
}: {
  session: SessionWithDetails;
  colors: any;
  isLast: boolean;
  onMarkMisses?: (session: SessionWithDetails) => void;
}) {
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
      {/* Miss Analyzer trigger: show when no hit data and not squad */}
      {!isSquadOrGroup && hits === 0 && accuracy === null && onMarkMisses && (
        <TouchableOpacity
          style={[styles.missAnalyzerBtn, { backgroundColor: colors.red + '12' }]}
          onPress={() => onMarkMisses(session)}
          activeOpacity={0.7}
        >
          <Crosshair size={14} color={colors.red} />
        </TouchableOpacity>
      )}
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
  completedSessions,
  currentUserId,
  disabled = false,
  startingDrillId = null,
}: {
  training: any;
  colors: any;
  onStartDrill: (drill: TrainingDrill) => void;
  completedSessions: SessionWithDetails[];
  currentUserId: string | null;
  disabled?: boolean;
  startingDrillId?: string | null;
}) {
  const { t } = useTranslation();
  if (!training.drills || training.drills.length === 0) return null;

  const canStart = training.status === 'ongoing' && !disabled;

  // Calculate completion count per drill for current user
  const getCompletedCount = (drillId: string) => {
    if (!currentUserId) return 0;
    return completedSessions.filter((s) => s.drill_id === drillId && s.user_id === currentUserId).length;
  };

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
              canStart={canStart && !startingDrillId}
              isLast={idx === training.drills!.length - 1}
              onStart={() => onStartDrill(drill)}
              completedCount={getCompletedCount(drill.id)}
              maxExecutions={drill.max_executions ?? 1}
              isLoading={startingDrillId === drill.id}
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
  completedCount,
  maxExecutions,
  isLoading = false,
}: {
  drill: any;
  index: number;
  colors: any;
  canStart: boolean;
  isLast: boolean;
  onStart: () => void;
  completedCount: number;
  maxExecutions: number;
  isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.blue : colors.orange;
  const hasReachedLimit = completedCount >= maxExecutions;

  // Execution policy - always locked (soldiers can only change weapon)
  const policyConfig = { Icon: Lock, color: colors.blue, label: t('training.locked') };

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
      {(canStart || isLoading) && (
        hasReachedLimit && !isLoading ? (
          <View style={[styles.completedBadge, { backgroundColor: colors.green }]}>
            <CheckCircle2 size={12} color="#fff" />
            <Text style={styles.completedBadgeText}>{completedCount}/{maxExecutions}</Text>
          </View>
        ) : isLoading ? (
          <View style={[styles.startDrillBtn, { backgroundColor: colors.green }]}>
            <ActivityIndicator size={12} color="#fff" />
          </View>
        ) : (
          <View style={[styles.startDrillBtn, { backgroundColor: colors.green }]}>
            <Play size={12} color="#fff" fill="#fff" />
          </View>
        )
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
  startingDrillId,
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
  startingDrillId: string | null;
}) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'drills' | 'results'>('drills');
  const scrollRef = useAnimatedRef<Animated.ScrollView>();
  const scrollOffset = useScrollViewOffset(scrollRef);

  // Miss Analyzer state
  const [missAnalyzerSession, setMissAnalyzerSession] = useState<SessionWithDetails | null>(null);
  const [isSavingMisses, setIsSavingMisses] = useState(false);

  const handleOpenMissAnalyzer = useCallback((session: SessionWithDetails) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setMissAnalyzerSession(session);
  }, []);

  const handleCloseMissAnalyzer = useCallback(() => {
    setMissAnalyzerSession(null);
  }, []);

  const handleSaveMisses = useCallback(async (points: MissPoint[]) => {
    if (!missAnalyzerSession) return;
    setIsSavingMisses(true);
    try {
      // For now, save miss points by creating/updating a paper_target_result
      // The session's first paper target result gets the miss data
      // This is a simplified flow — real sessions may have multiple targets
      const sessionId = missAnalyzerSession.id;

      // Import getSessionTargetsWithResults at top
      const { getSessionTargetsWithResults } = await import('@/services/session/targets');
      const targets = await getSessionTargetsWithResults(sessionId);

      // Find the first paper target result, or create one
      const paperTarget = targets.find(t => t.paper_result);
      if (paperTarget?.paper_result?.id) {
        await saveMissPoints(paperTarget.paper_result.id, points);
      } else {
        // No paper result exists — create a target + result with miss data
        const { addSessionTarget, savePaperTargetResult } = await import('@/services/session/targets');

        let targetId: string;
        if (targets.length > 0) {
          targetId = targets[0].id;
        } else {
          const newTarget = await addSessionTarget({
            session_id: sessionId,
            target_type: 'paper',
            distance_m: missAnalyzerSession.drill_config?.distance_m ?? null,
          });
          targetId = newTarget.id;
        }

        await savePaperTargetResult({
          session_target_id: targetId,
          paper_type: 'engagement',
          bullets_fired: missAnalyzerSession.drill_config?.rounds_per_shooter ?? points.length,
          hits_total: 0,
          miss_points: points,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setMissAnalyzerSession(null);
      onRefresh();
    } catch (error) {
      console.error('[TrainingDetail] Failed to save miss points:', error);
      Alert.alert(t('common.error', 'Error'), t('missAnalyzer.saveFailed', 'Failed to save miss data'));
    } finally {
      setIsSavingMisses(false);
    }
  }, [missAnalyzerSession, onRefresh, t]);

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

              {/* Squad/Group Session Banners — shown to all members, components self-manage visibility */}
              {training.id && currentUserId && (
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
              <PlannedDrillsList
                training={training}
                colors={colors}
                onStartDrill={onStartDrill}
                completedSessions={completedSessions}
                currentUserId={currentUserId}
                disabled={!isInvited}
                startingDrillId={startingDrillId}
              />

              {/* Empty State for drills */}
              <EmptyState training={training} completedSessions={completedSessions} colors={colors} />
            </>
          ) : (
            <>
              <ResultsTabContent
                completedSessions={completedSessions}
                colors={colors}
                currentUserId={currentUserId}
                onMarkMisses={handleOpenMissAnalyzer}
              />
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

      {/* Miss Analyzer Modal */}
      <Modal
        visible={!!missAnalyzerSession}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={handleCloseMissAnalyzer}
      >
        <View style={[styles.missAnalyzerModal, { backgroundColor: colors.background }]}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center' }}>
            {missAnalyzerSession && (
              <MissMarker
                onSave={handleSaveMisses}
                onCancel={handleCloseMissAnalyzer}
                isSaving={isSavingMisses}
                maxPoints={missAnalyzerSession.drill_config?.rounds_per_shooter ?? undefined}
              />
            )}
          </ScrollView>
        </View>
      </Modal>
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
  // Starting drill loading state (drill ID that's currently being started)
  const [startingDrillId, setStartingDrillId] = useState<string | null>(null);

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

  // Refresh completed sessions when screen gains focus (e.g., returning from activeSession)
  useFocusEffect(
    useCallback(() => {
      if (training?.id) loadCompletedSessions();
    }, [training?.id, loadCompletedSessions])
  );

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
  // Drill Start Handler - Creates session with defaults and navigates directly
  // Optimized: runs independent queries in parallel, single auth call
  // ─────────────────────────────────────────────────────────────────────────────
  const handleStartDrill = useCallback(
    async (drill: TrainingDrill) => {
      if (!training?.id || !isInvited || startingDrillId) return;
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStartingDrillId(drill.id);

      try {
        // Get user ID once - avoid redundant auth calls throughout the flow
        const userId = await requireCurrentUserId();

        // Run ALL independent queries in parallel for speed
        // Pass userId to queries that need it to avoid redundant auth calls
        const isSquad = drill.engagement_mode === 'squad';
        const [existingEngagement, weaponId, existingTrainingSession] = await Promise.all([
          isSquad ? getActiveSquadEngagement(training.id) : Promise.resolve(null),
          getMyMostRecentWeaponId(), // Uses RLS, no userId needed
          getMyActiveSessionForTraining(training.id, userId),
        ]);

        // If squad has existing engagement, navigate there
        if (existingEngagement) {
          if (existingEngagement.started_at) {
            router.push({
              pathname: '/(protected)/activeSession',
              params: {
                sessionId: existingEngagement.session_id,
                engagementId: existingEngagement.id,
                engagementMode: existingEngagement.engagement_mode,
                returnTo: 'trainingDetail',
                returnId: training.id,
              },
            });
          } else {
            router.push({
              pathname: '/(protected)/squadLobby',
              params: {
                engagementId: existingEngagement.id,
                sessionId: existingEngagement.session_id,
                trainingId: training.id,
                engagementMode: existingEngagement.engagement_mode,
              },
            });
          }
          return;
        }

        // FAST PATH: reuse existing training session for same drill (instant "go back + retry")
        if (!isSquad && existingTrainingSession && (!drill.id || existingTrainingSession.drill_id === drill.id)) {
          router.push({ pathname: '/(protected)/activeSession', params: { sessionId: existingTrainingSession.id } });
          return;
        }

        // Check weapon
        if (!weaponId) {
          Alert.alert(t('training.noWeapon', 'No Weapon'), t('training.configureWeaponFirst', 'Please configure a weapon first.'));
          return;
        }

        // Check watch connectivity (sync - no await needed)
        const isWatchConnected = useGarminStore.getState().status === 'CONNECTED';

        // Create session with drill defaults — pass pre-fetched data to avoid redundant queries
        const newSession = await getOrCreateSetupSession({
          weapon_id: weaponId,
          team_id: training.team_id || undefined,
          training_id: training.id,
          drill_id: drill.id,
          watch_controlled: isWatchConnected,
          soldier_distance_m: drill.distance_m ?? null,
          soldier_bullets: drill.rounds_per_shooter ?? null,
          soldier_position: drill.position ?? null,
        }, { prefetchedTrainingSession: existingTrainingSession, userId });

        // Squad → create engagement and go to lobby
        if (isSquad) {
          const engagement = await createEngagement({
            sessionId: newSession.id,
            shooterId: userId,
            drillGoal: drill.drill_goal || 'engagement',
            trainingId: training.id,
            requestedMode: 'squad',
            status: 'pending',
          });
          router.push({
            pathname: '/(protected)/squadLobby',
            params: {
              engagementId: engagement.id,
              trainingId: training.id,
              engagementMode: 'squad',
            },
          });
        } else {
          // Solo → go directly to active session
          router.push({ pathname: '/(protected)/activeSession', params: { sessionId: newSession.id } });
        }
      } catch (err) {
        console.error('[TrainingDetail] Failed to start drill:', err);
        Alert.alert(t('common.error', 'Error'), t('training.startDrillFailed', 'Failed to start drill. Please try again.'));
      } finally {
        setStartingDrillId(null);
      }
    },
    [training?.id, training?.team_id, isInvited, startingDrillId, t]
  );

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
        startingDrillId={startingDrillId}
      />

      <TrainingSettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
        training={training}
        onUpdate={setTraining}
        colors={colors}
      />

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
  contentContainer: { paddingHorizontal: 14, gap: 12, marginTop: 12 },

  // Not Invited Banner
  notInvitedBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  notInvitedInfo: {
    flex: 1,
    gap: 2,
  },
  notInvitedTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  notInvitedText: {
    fontSize: 11,
    lineHeight: 15,
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
    paddingHorizontal: 14,
    paddingBottom: 10,
  },
  navRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  navBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroContent: {
    gap: 4,
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.5,
    lineHeight: 27,
  },
  heroFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroStats: {
    flexDirection: 'row',
    gap: 5,
  },
  statChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  commanderBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  commanderBtnText: {
    color: '#fff',
    fontSize: 12,
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
        shadowOpacity: 0.05,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  stickyContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 8,
  },
  stickyBackBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickyCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stickyTitle: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
    flexShrink: 1,
  },
  stickyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stickyBadgeText: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  stickyAction: {
    width: 30,
    height: 30,
    borderRadius: 15,
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
    gap: 5,
    paddingVertical: 10,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Results Tab - Overview Card
  resultsContainer: { gap: 10 },
  overviewCard: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  overviewTop: {
    padding: 16,
    gap: 12,
  },
  overviewMainStat: {
    alignItems: 'center',
    gap: 1,
  },
  overviewValue: {
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: -1,
  },
  overviewLabel: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  overviewSecondaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 0,
  },
  overviewStat: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  overviewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  overviewStatLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  overviewStatDivider: {
    width: 1,
    height: 20,
    alignSelf: 'center',
  },

  // Filter Chips
  filterChipsRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterChipCount: {
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 5,
    minWidth: 16,
    alignItems: 'center',
  },
  filterChipCountText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // Filter Summary Strip
  filterSummary: {
    flexDirection: 'row',
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  filterSummaryItem: {
    flex: 1,
    alignItems: 'center',
    gap: 1,
  },
  filterSummaryValue: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  filterSummaryLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },

  // Participant List (expanded squad rows)
  participantList: {
    marginHorizontal: 12,
    marginBottom: 8,
    borderRadius: 8,
    overflow: 'hidden',
  },

  // Sections
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 1,
  },

  // Squad participant rows
  squadParticipantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 7,
  },
  squadParticipantName: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  squadParticipantShots: {
    fontSize: 11,
    fontWeight: '500',
  },

  // User Avatars
  userAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  userAvatarText: { fontSize: 11, fontWeight: '700' },

  // Sessions List
  sessionsList: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 9 },
  sessionIcon: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: { flex: 1, gap: 3 },
  sessionNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  sessionName: { fontSize: 14, fontWeight: '600', letterSpacing: -0.2 },
  sessionMeta: { fontSize: 11 },
  sessionResult: { fontSize: 13, fontWeight: '700' },

  // Badges
  squadBadge: { paddingHorizontal: 5, paddingVertical: 2, borderRadius: 4 },
  squadBadgeText: { fontSize: 9, fontWeight: '600' },
  drillNameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  policyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
  },
  policyBadgeText: { fontSize: 8, fontWeight: '700', textTransform: 'uppercase' },

  // Start Drill Button
  startDrillBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  completedBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  drillsHint: { fontSize: 11, textAlign: 'center', marginTop: 6, fontStyle: 'italic' },

  // Empty States
  pendingNotice: { padding: 14, borderRadius: 12, borderWidth: 1 },
  pendingText: { fontSize: 12, textAlign: 'center', lineHeight: 18 },
  emptyState: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: { fontSize: 15, fontWeight: '700' },
  emptySubtitle: { fontSize: 12, textAlign: 'center' },

  // Empty Results (for Results tab)
  emptyResults: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    alignItems: 'center',
  },
  emptyResultsText: {
    fontSize: 13,
  },

  // Footer
  footer: {
    fontSize: 11,
    textAlign: 'center',
    paddingVertical: 20,
    paddingHorizontal: 14,
    opacity: 0.4,
  },

  // Miss Analyzer
  missAnalyzerBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  missAnalyzerModal: {
    flex: 1,
  },
});
