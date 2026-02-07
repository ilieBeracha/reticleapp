/**
 * TeamInsights Component
 *
 * Team insights with role-based views:
 * - Commander: Comprehensive team analytics with readiness, rankings, breakdowns, accuracy bars
 * - Member: Personal stats + team context with comparison indicators
 */

import {
  useTeamInsights,
  type InactiveMemberInfo,
  type MemberMissData,
  type MyComparison,
  type TeamMemberStat,
  type TeamReadiness,
  type TeamWeakArea
} from '@/hooks/insights/useTeamInsights';
import { useColors } from '@/hooks/ui/useColors';
import type { MissPoint, SessionWithDetails } from '@/types/session';
import { MIL_PER_CIRCLE, milToClockHour } from '@/utils/missAnalyzer';
import { Ionicons } from '@expo/vector-icons';
import {
  AlertTriangle,
  BarChart3,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Crosshair,
  Minus,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
  Users,
  X,
  Zap
} from 'lucide-react-native';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

import { t } from 'i18next';
import { ActivityChart } from './components/ActivityChart';
import { PerformanceChart } from './components/PerformanceChart';

// ============================================================================
// HELPERS
// ============================================================================

function formatShots(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return n.toLocaleString();
}

function formatRelativeTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 60) return `${diffMins}m`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d`;
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks < 5) return `${diffWeeks}w`;
  const diffMonths = Math.floor(diffDays / 30);
  return `${diffMonths}mo`;
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function computeAccuracyTrend(
  chartData: Array<{ accuracy?: number }>
): { delta: number; direction: 'up' | 'down' | 'flat' } | null {
  const withAcc = chartData.filter((d): d is { accuracy: number } => d.accuracy !== undefined);
  if (withAcc.length < 4) return null;
  const mid = Math.floor(withAcc.length / 2);
  const avgOlder = withAcc.slice(0, mid).reduce((s, d) => s + d.accuracy, 0) / mid;
  const avgRecent = withAcc.slice(mid).reduce((s, d) => s + d.accuracy, 0) / (withAcc.length - mid);
  const delta = avgRecent - avgOlder;
  return { delta, direction: delta > 2 ? 'up' : delta < -2 ? 'down' : 'flat' };
}

function getAccuracyColor(accuracy: number | null, colors: ReturnType<typeof useColors>): string {
  if (accuracy === null) return colors.textMuted;
  if (accuracy >= 70) return colors.green;
  if (accuracy >= 50) return colors.orange || '#F59E0B';
  return colors.textMuted;
}

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  action?: React.ReactNode;
  expanded?: boolean;
  onPress?: () => void;
}

function SectionHeader({ title, icon, colors, action, expanded, onPress }: SectionHeaderProps) {
  const content = (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={{ flex: 1 }} />
      {action}
      {onPress && (
        expanded
          ? <ChevronDown size={13} color={colors.textMuted} />
          : <ChevronRight size={13} color={colors.textMuted} />
      )}
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity activeOpacity={0.6} onPress={onPress}>
        {content}
      </TouchableOpacity>
    );
  }
  return content;
}

function TeamContextHeader({
  teamName,
  isCommander,
  memberCount,
  colors,
}: {
  teamName?: string;
  isCommander: boolean;
  memberCount: number;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  return (
    <View style={[styles.contextHeader, { borderColor: colors.border }]}>
      <View style={[styles.contextIcon, { backgroundColor: `${colors.textMuted}10` }]}>
        <Users size={12} color={colors.textMuted} />
      </View>
      <Text style={[styles.contextTeamName, { color: colors.text }]} numberOfLines={1}>
        {teamName || t('navigation.team')}
      </Text>
      {isCommander && (
        <View style={[styles.cmdBadge, { backgroundColor: `${colors.textMuted}15` }]}>
          <Shield size={9} color={colors.textMuted} />
          <Text style={[styles.cmdBadgeText, { color: colors.textMuted }]}>{t('teamInsights.cmd')}</Text>
        </View>
      )}
      <Text style={[styles.memberCount, { color: colors.textMuted }]}>
        {t('teams.membersCount', { count: memberCount })}
      </Text>
    </View>
  );
}

function EmptyState({ colors, onStartSession }: { colors: ReturnType<typeof useColors>; onStartSession: () => void }) {
  const { t } = useTranslation();
  return (
    <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.primary}10` }]}>
        <Ionicons name="people" size={28} color={colors.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>{t('teamInsights.noTeamActivity')}</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        {t('teamInsights.emptySubtitle')}
      </Text>
      <TouchableOpacity style={[styles.emptyButton, { backgroundColor: colors.primary }]} onPress={onStartSession}>
        <Text style={styles.emptyButtonText}>{t('insights.startTraining')}</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================================================
// MEMBER VIEW: COMPARISON CARD (Your Stats vs Team)
// ============================================================================

interface ComparisonRowProps {
  label: string;
  myValue: string;
  teamValue: string;
  comparison: 'above' | 'below' | 'average' | null;
  colors: ReturnType<typeof useColors>;
}

function ComparisonRow({ label, myValue, teamValue, comparison, colors }: ComparisonRowProps) {
  const getComparisonIcon = () => {
    if (comparison === 'above') return <ChevronUp size={12} color={colors.green} />;
    if (comparison === 'below') return <ChevronDown size={12} color={colors.orange || '#F59E0B'} />;
    return <Minus size={12} color={colors.textMuted} />;
  };

  return (
    <View style={[styles.compRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.compLabel, { color: colors.textMuted }]}>{label}</Text>
      <View style={styles.compValues}>
        <View style={styles.compValueCol}>
          <Text style={[styles.compValue, { color: colors.text }]}>{myValue}</Text>
          <View style={[styles.compIndicator, { backgroundColor: comparison === 'above' ? `${colors.green}15` : comparison === 'below' ? `${colors.orange || '#F59E0B'}15` : `${colors.textMuted}10` }]}>
            {getComparisonIcon()}
          </View>
        </View>
        <View style={[styles.compDivider, { backgroundColor: colors.border }]} />
        <View style={styles.compValueCol}>
          <Text style={[styles.compValue, { color: colors.textMuted }]}>{teamValue}</Text>
          <Text style={[styles.compValueLabel, { color: colors.textMuted }]}>{t('teamInsights.comparison.avg')}</Text>
        </View>
      </View>
    </View>
  );
}

interface MemberComparisonCardProps {
  myStats: {
    sessions: number;
    shots: number;
    accuracy: number | null;
    bestGrouping: number | null;
    contribution: number;
    vsTeamAvg: number | null;
  };
  teamAverages: {
    sessionsPerMember: number;
    shotsPerMember: number;
    accuracy: number | null;
    grouping: number | null;
  };
  myComparison: MyComparison;
  myPercentile: number | null;
  trend: { delta: number; direction: 'up' | 'down' | 'flat' } | null;
  colors: ReturnType<typeof useColors>;
}

function MemberComparisonCard({ myStats, teamAverages, myComparison, myPercentile, trend, colors }: MemberComparisonCardProps) {
  const { t } = useTranslation();
  return (
    <Animated.View entering={FadeIn.delay(50)} style={[styles.compCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Hero: big accuracy + trend + percentile */}
      <View style={styles.compHeroRow}>
        <View style={styles.compHeroLeft}>
          <Text style={[styles.compHeroAccuracy, { color: myStats.accuracy !== null && myStats.accuracy >= 70 ? colors.green : myStats.accuracy !== null && myStats.accuracy >= 50 ? colors.text : colors.textMuted }]}>
            {myStats.accuracy !== null ? `${myStats.accuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.compHeroLabel, { color: colors.textMuted }]}>{t('teamInsights.comparison.accuracy')}</Text>
        </View>
        <View style={styles.compHeroCenter}>
          {trend && (
            <View style={[styles.compTrendBadge, { backgroundColor: trend.direction === 'up' ? `${colors.green}12` : trend.direction === 'down' ? 'rgba(239,68,68,0.08)' : `${colors.textMuted}08` }]}>
              {trend.direction === 'up' ? <TrendingUp size={11} color={colors.green} /> : trend.direction === 'down' ? <TrendingDown size={11} color="#EF4444" /> : <Minus size={11} color={colors.textMuted} />}
              <Text style={[styles.compTrendText, { color: trend.direction === 'up' ? colors.green : trend.direction === 'down' ? '#EF4444' : colors.textMuted }]}>
                {trend.direction === 'up' ? 'Improving' : trend.direction === 'down' ? 'Declining' : 'Steady'}
              </Text>
            </View>
          )}
          {myStats.vsTeamAvg !== null && (
            <Text style={[styles.compVsTeam, { color: myStats.vsTeamAvg >= 0 ? colors.green : colors.textMuted }]}>
              {myStats.vsTeamAvg >= 0 ? '+' : ''}{myStats.vsTeamAvg.toFixed(1)}% vs team
            </Text>
          )}
        </View>
        {myPercentile !== null && (
          <View style={[styles.percentileBadge, { backgroundColor: myPercentile >= 50 ? `${colors.green}15` : `${colors.textMuted}10` }]}>
            <Text style={[styles.percentileValue, { color: myPercentile >= 50 ? colors.green : colors.textMuted }]}>
              Top {100 - myPercentile}%
            </Text>
          </View>
        )}
      </View>

      {/* Column headers */}
      <View style={[styles.compColHeaders, { borderBottomColor: colors.border }]}>
        <Text style={[styles.compColLabel, { color: colors.textMuted }]}>{t('teamInsights.comparison.metric')}</Text>
        <View style={styles.compColHeaderRight}>
          <Text style={[styles.compColLabel, { color: colors.text }]}>{t('teamInsights.comparison.you')}</Text>
          <Text style={[styles.compColLabel, { color: colors.textMuted }]}>{t('teamInsights.comparison.team')}</Text>
        </View>
      </View>

      {/* Comparison rows */}
      <ComparisonRow
        label={t('teamInsights.comparison.sessions')}
        myValue={String(myStats.sessions)}
        teamValue={teamAverages.sessionsPerMember.toFixed(1)}
        comparison={myComparison.activity}
        colors={colors}
      />
      <ComparisonRow
        label={t('teamInsights.comparison.totalShots')}
        myValue={myStats.shots.toLocaleString()}
        teamValue={teamAverages.shotsPerMember.toFixed(0)}
        comparison={myComparison.volume}
        colors={colors}
      />
      <ComparisonRow
        label={t('teamInsights.comparison.accuracy')}
        myValue={myStats.accuracy !== null ? `${myStats.accuracy.toFixed(0)}%` : '—'}
        teamValue={teamAverages.accuracy !== null ? `${teamAverages.accuracy.toFixed(0)}%` : '—'}
        comparison={myComparison.accuracy}
        colors={colors}
      />
      {(myStats.bestGrouping || teamAverages.grouping) && (
        <ComparisonRow
          label={t('teamInsights.comparison.bestGrouping')}
          myValue={myStats.bestGrouping !== null ? `${myStats.bestGrouping.toFixed(1)}cm` : '—'}
          teamValue={teamAverages.grouping !== null ? `${teamAverages.grouping.toFixed(1)}cm` : '—'}
          comparison={myStats.bestGrouping && teamAverages.grouping
            ? myStats.bestGrouping < teamAverages.grouping ? 'above' : myStats.bestGrouping > teamAverages.grouping ? 'below' : 'average'
            : null}
          colors={colors}
        />
      )}

      {/* Footer */}
      <View style={[styles.compFooter, { borderTopColor: colors.border }]}>
        <Text style={[styles.compFooterText, { color: colors.textMuted }]}>
          Contributing <Text style={{ color: colors.text, fontWeight: '600' }}>{myStats.contribution}%</Text> of team sessions
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// COMMANDER VIEW: TEAM READINESS SUMMARY (2x2 grid)
// ============================================================================

function TeamReadinessSummary({
  readiness,
  teamAccuracy,
  colors,
}: {
  readiness: TeamReadiness;
  teamAccuracy: number | null;
  colors: ReturnType<typeof useColors>;
}) {
  const pct = readiness.participationRate;
  const ringColor = pct >= 70 ? colors.green : pct >= 40 ? (colors.orange || '#F59E0B') : colors.textMuted;

  return (
    <View style={[styles.readinessCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Participation Ring */}
      <View style={styles.readinessRingSection}>
        <View style={[styles.readinessRingOuter, { borderColor: `${ringColor}20` }]}>
          <View style={[styles.readinessRingInner, { borderColor: ringColor }]}>
            <Text style={[styles.readinessRingPct, { color: ringColor }]}>{pct}</Text>
            <Text style={[styles.readinessRingUnit, { color: colors.textMuted }]}>%</Text>
          </View>
        </View>
        <Text style={[styles.readinessMainText, { color: colors.text }]}>
          <Text style={{ fontWeight: '800', fontSize: 16 }}>{readiness.trainedThisWeek}</Text>
          <Text style={{ color: colors.textMuted }}>{' / '}{readiness.totalMembers}</Text>
          {'  trained this week'}
        </Text>
      </View>

      {/* Compact stats row */}
      <View style={[styles.readinessStatsRow, { borderTopColor: colors.border }]}>
        <View style={styles.readinessStatItem}>
          <Crosshair size={11} color={teamAccuracy !== null && teamAccuracy >= 70 ? colors.green : colors.textMuted} />
          <Text style={[styles.readinessStatValue, { color: teamAccuracy !== null && teamAccuracy >= 70 ? colors.green : colors.text }]}>
            {teamAccuracy !== null ? `${teamAccuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.readinessStatLabel, { color: colors.textMuted }]}>{t('teamInsights.readiness.teamAccuracy')}</Text>
        </View>
        <View style={[styles.readinessStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.readinessStatItem}>
          <BarChart3 size={11} color={colors.textMuted} />
          <Text style={[styles.readinessStatValue, { color: colors.text }]}>
            {readiness.avgSessionsPerMember.toFixed(1)}
          </Text>
          <Text style={[styles.readinessStatLabel, { color: colors.textMuted }]}>avg/member</Text>
        </View>
        <View style={[styles.readinessStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.readinessStatItem}>
          <Target size={11} color={colors.textMuted} />
          <Text style={[styles.readinessStatValue, { color: colors.text }]}>
            {formatShots(readiness.totalShots)}
          </Text>
          <Text style={[styles.readinessStatLabel, { color: colors.textMuted }]}>{t('teamInsights.readiness.totalShots')}</Text>
        </View>
        <View style={[styles.readinessStatDivider, { backgroundColor: colors.border }]} />
        <View style={styles.readinessStatItem}>
          <Clock size={11} color={colors.orange || '#F59E0B'} />
          <Text style={[styles.readinessStatValue, { color: colors.text }]}>
            {readiness.daysSinceLeastActive !== null ? `${readiness.daysSinceLeastActive}d` : '—'}
          </Text>
          <Text style={[styles.readinessStatLabel, { color: colors.textMuted }]}>{t('teamInsights.readiness.leastActive')}</Text>
        </View>
      </View>
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: MEMBER DETAIL TABLE (expandable)
// ============================================================================

interface MemberDetailTableProps {
  members: TeamMemberStat[];
  currentUserId: string;
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}

function MemberDetailTable({ members, currentUserId, colors, onMemberPress }: MemberDetailTableProps) {
  const [expanded, setExpanded] = useState(false);
  if (members.length === 0) return null;

  const displayMembers = expanded ? members : members.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {displayMembers.map((m, i) => {
        const isMe = m.userId === currentUserId;
        const accColor = getAccuracyColor(m.accuracy, colors);
        const row = (
          <View
            key={m.userId}
            style={[
              styles.memberCard,
              isMe && { backgroundColor: `${colors.primary}06` },
              i < displayMembers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            {/* Left: Rank + Initials */}
            <View style={styles.memberCardLeft}>
              <Text style={[styles.memberCardRank, { color: colors.textMuted }]}>{i + 1}</Text>
              <View style={[styles.memberCardAvatar, { backgroundColor: `${accColor}18` }]}>
                <Text style={[styles.memberCardInitials, { color: accColor }]}>
                  {getInitials(m.userName)}
                </Text>
              </View>
            </View>

            {/* Center: Name + stats subtitle */}
            <View style={styles.memberCardCenter}>
              <Text style={[styles.memberCardName, { color: colors.text }]} numberOfLines={1}>
                {m.userName}{isMe ? ' (you)' : ''}
              </Text>
              <Text style={[styles.memberCardSubtitle, { color: colors.textMuted }]} numberOfLines={1}>
                {m.sessions} sessions · {formatShots(m.shots)} shots · {formatRelativeTime(m.lastActive)} ago
              </Text>
            </View>

            {/* Right: Accuracy + Grouping */}
            <View style={styles.memberCardRight}>
              <Text style={[styles.memberCardAccuracy, { color: accColor }]}>
                {m.accuracy !== null ? `${m.accuracy.toFixed(0)}%` : '—'}
              </Text>
              <Text style={[styles.memberCardGrouping, { color: colors.textMuted }]}>
                {m.bestDispersion !== null ? `${m.bestDispersion.toFixed(1)}cm` : ''}
              </Text>
            </View>
          </View>
        );
        return onMemberPress ? (
          <TouchableOpacity key={m.userId} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.userName)}>
            {row}
          </TouchableOpacity>
        ) : row;
      })}

      {/* Expand/collapse */}
      {members.length > 5 && (
        <TouchableOpacity
          style={[styles.expandButton, { borderTopColor: colors.border }]}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={[styles.expandText, { color: colors.textMuted }]}>
            {expanded ? t('teamInsights.members.showLess') : t('teamInsights.members.showAll', { count: members.length })}
          </Text>
          {expanded ? <ChevronUp size={12} color={colors.textMuted} /> : <ChevronDown size={12} color={colors.textMuted} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: MEMBER ACCURACY BARS
// ============================================================================

function MemberAccuracyBars({
  members,
  colors,
  onMemberPress,
}: {
  members: TeamMemberStat[];
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  if (members.length === 0) return null;

  const teamAvg = members.reduce((sum, m) => sum + (m.accuracy ?? 0), 0) / members.length;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border, padding: 14 }]}>
      {members.map((m, i) => {
        const acc = m.accuracy ?? 0;
        const barColor = getAccuracyColor(acc, colors);
        const barRow = (
          <View
            key={m.userId}
            style={[
              styles.accuracyBarRow,
              i < members.length - 1 && { marginBottom: 12 },
            ]}
          >
            <View style={[styles.accBarAvatar, { backgroundColor: `${barColor}18` }]}>
              <Text style={[styles.accBarInitials, { color: barColor }]}>
                {getInitials(m.userName)}
              </Text>
            </View>
            <Text style={[styles.accuracyBarName, { color: colors.text }]} numberOfLines={1}>
              {m.userName}
            </Text>
            <View style={[styles.accuracyBarTrack, { backgroundColor: `${colors.textMuted}10` }]}>
              <View
                style={[
                  styles.accuracyBarFill,
                  {
                    backgroundColor: barColor,
                    width: `${Math.min(acc, 100)}%`,
                  },
                ]}
              />
            </View>
            <Text style={[styles.accuracyBarValue, { color: barColor }]}>
              {acc.toFixed(0)}%
            </Text>
          </View>
        );
        return onMemberPress ? (
          <TouchableOpacity key={m.userId} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.userName)}>
            {barRow}
          </TouchableOpacity>
        ) : <React.Fragment key={m.userId}>{barRow}</React.Fragment>;
      })}

      {/* Team average indicator */}
      <View style={[styles.accBarAvgRow, { borderTopColor: colors.border }]}>
        <Minus size={10} color={colors.textMuted} />
        <Text style={[styles.accBarAvgText, { color: colors.textMuted }]}>
          Team avg: {teamAvg.toFixed(0)}%
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: MATRIX TABLE (shared for distance, position, weapon)
// ============================================================================

interface MatrixRow {
  label: string;
  sessions: number;
  totalShots: number;
  avgAccuracy: number | null;
  avgGrouping: number | null;
  memberCount: number;
}

function MatrixTable({
  rows,
  colors,
  expanded,
  sessions,
  filterKey,
  onMemberPress,
}: {
  rows: MatrixRow[];
  colors: ReturnType<typeof useColors>;
  expanded?: boolean;
  sessions?: SessionWithDetails[];
  filterKey?: 'distance' | 'position' | 'weapon';
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  if (rows.length === 0) return null;

  // Compute per-member breakdown for expanded view
  const getMemberBreakdown = (rowLabel: string) => {
    if (!sessions || !filterKey) return [];
    const matchingSessions = sessions.filter((s) => {
      if (filterKey === 'position') {
        const pos = s.drill_config?.position;
        return pos && pos.charAt(0).toUpperCase() + pos.slice(1) === rowLabel;
      }
      if (filterKey === 'distance') {
        const dist = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
        if (dist == null) return false;
        if (rowLabel === '0-25m') return dist >= 0 && dist < 25;
        if (rowLabel === '25-100m') return dist >= 25 && dist < 100;
        if (rowLabel === '100-300m') return dist >= 100 && dist < 300;
        if (rowLabel === '300m+') return dist >= 300;
        return false;
      }
      if (filterKey === 'weapon') {
        const cat = s.weapon_category || '';
        const catLabel = cat.charAt(0).toUpperCase() + cat.slice(1).replace(/_/g, ' ');
        return catLabel === rowLabel || cat === rowLabel.toLowerCase().replace(/ /g, '_');
      }
      return false;
    });

    // Aggregate per member
    const memberMap = new Map<string, { name: string; shots: number; hits: number; sessions: number }>();
    matchingSessions.forEach((s) => {
      const existing = memberMap.get(s.user_id);
      const shots = s.stats?.shots_fired || 0;
      const hits = s.stats?.hits_total || 0;
      if (existing) {
        existing.shots += shots;
        existing.hits += hits;
        existing.sessions += 1;
      } else {
        memberMap.set(s.user_id, {
          name: s.user_full_name || 'Unknown',
          shots,
          hits,
          sessions: 1,
        });
      }
    });

    return Array.from(memberMap.entries())
      .map(([uid, m]) => ({ ...m, userId: uid, accuracy: m.shots > 0 ? (m.hits / m.shots) * 100 : null }))
      .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  };

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {rows.map((row, i) => {
        const accColor = getAccuracyColor(row.avgAccuracy, colors);
        const memberBreakdown = expanded ? getMemberBreakdown(row.label) : [];
        return (
          <View key={row.label}>
            <View
              style={[
                styles.matrixCardRow,
                !expanded && i < rows.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
              ]}
            >
              {/* Left: Category + subtitle */}
              <View style={styles.matrixCardLeft}>
                <Text style={[styles.matrixCardLabel, { color: colors.text }]} numberOfLines={1}>
                  {row.label}
                </Text>
                <Text style={[styles.matrixCardSubtitle, { color: colors.textMuted }]}>
                  {row.sessions} sessions · {row.memberCount} members
                </Text>
              </View>

              {/* Right: Accuracy with mini bar + Grouping */}
              <View style={styles.matrixCardRight}>
                <Text style={[styles.matrixCardAccuracy, { color: accColor }]}>
                  {row.avgAccuracy !== null ? `${row.avgAccuracy.toFixed(0)}%` : '—'}
                </Text>
                <View style={styles.matrixMiniBarTrack}>
                  <View
                    style={[
                      styles.matrixMiniBarFill,
                      {
                        backgroundColor: accColor,
                        width: row.avgAccuracy !== null ? `${Math.min(row.avgAccuracy, 100)}%` : '0%',
                      },
                    ]}
                  />
                </View>
                <Text style={[styles.matrixCardGrouping, { color: colors.textMuted }]}>
                  {row.avgGrouping !== null ? `${row.avgGrouping.toFixed(1)}cm` : '—'}
                </Text>
              </View>
            </View>

            {/* Expanded: per-member breakdown */}
            {expanded && memberBreakdown.length > 0 && (
              <View style={[styles.matrixExpandedMembers, { borderBottomWidth: i < rows.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.border }]}>
                {memberBreakdown.map((m, mi) => {
                  const mRow = (
                    <View style={styles.matrixMemberRow}>
                      <Text style={[styles.matrixMemberName, { color: colors.textMuted }]} numberOfLines={1}>{m.name}</Text>
                      <Text style={[styles.matrixMemberStat, { color: m.accuracy !== null && m.accuracy >= 70 ? colors.green : colors.text }]}>
                        {m.accuracy !== null ? `${m.accuracy.toFixed(0)}%` : '—'}
                      </Text>
                      <Text style={[styles.matrixMemberStat, { color: colors.textMuted }]}>{m.sessions}s</Text>
                    </View>
                  );
                  return onMemberPress ? (
                    <TouchableOpacity key={mi} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.name)}>
                      {mRow}
                    </TouchableOpacity>
                  ) : <React.Fragment key={mi}>{mRow}</React.Fragment>;
                })}
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: TRAINING FOCUS AREAS
// ============================================================================

function TrainingFocus({ weakAreas, colors }: { weakAreas: TeamWeakArea[]; colors: ReturnType<typeof useColors> }) {
  if (weakAreas.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {weakAreas.slice(0, 3).map((area, i) => (
        <View
          key={`${area.type}-${area.label}`}
          style={[styles.focusRow, i < Math.min(weakAreas.length, 3) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}
        >
          <View style={[styles.focusIcon, { backgroundColor: `${colors.red}08` }]}>
            <TrendingDown size={10} color={colors.red} />
          </View>
          <View style={styles.focusContent}>
            <Text style={[styles.focusLabel, { color: colors.text }]}>{area.label}</Text>
            <Text style={[styles.focusDetail, { color: colors.textMuted }]}>{area.detail}</Text>
          </View>
          <Text style={[styles.focusAcc, { color: colors.red }]}>{area.avgAccuracy.toFixed(0)}%</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: INACTIVE MEMBERS ALERT
// ============================================================================

function InactiveMembersAlert({
  inactiveMembers,
  colors,
  onMemberPress,
}: {
  inactiveMembers: InactiveMemberInfo[];
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  if (inactiveMembers.length === 0) return null;

  const warnColor = colors.orange || '#F59E0B';

  return (
    <View style={[styles.inactiveCard, { backgroundColor: colors.card, borderColor: `${warnColor}35` }]}>
      {/* Header with warning icon */}
      <View style={styles.inactiveHeader}>
        <View style={[styles.inactiveIconBg, { backgroundColor: `${warnColor}14` }]}>
          <AlertTriangle size={15} color={warnColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.inactiveTitle, { color: colors.text }]}>
            {inactiveMembers.length} member{inactiveMembers.length !== 1 ? 's' : ''} never trained
          </Text>
          <Text style={[styles.inactiveSubtitle, { color: colors.textMuted }]}>{t('teamInsights.members.noSessionsRecorded')}</Text>
        </View>
      </View>

      {/* Vertical member list */}
      <View style={styles.inactiveList}>
        {inactiveMembers.map((m, i) => {
          const memberRow = (
            <View
              style={[
                styles.inactiveMember,
                i < inactiveMembers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: `${colors.border}` },
              ]}
            >
              <View style={[styles.inactiveAvatar, { backgroundColor: `${warnColor}12` }]}>
                <Text style={[styles.inactiveInitials, { color: warnColor }]}>
                  {getInitials(m.userName)}
                </Text>
              </View>
              <Text style={[styles.inactiveName, { color: colors.text }]} numberOfLines={1}>
                {m.userName}
              </Text>
            </View>
          );
          return onMemberPress ? (
            <TouchableOpacity key={m.userId} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.userName)}>
              {memberRow}
            </TouchableOpacity>
          ) : <React.Fragment key={m.userId}>{memberRow}</React.Fragment>;
        })}
      </View>

      {/* Hint text */}
      <Text style={[styles.inactiveHint, { color: colors.textMuted }]}>
        Consider reaching out to encourage participation
      </Text>
    </View>
  );
}

// ============================================================================
// MISS PATTERN COMPONENTS
// ============================================================================

function getMissDirectionName(hour: number): string {
  if (hour === 12) return 'High';
  if (hour === 6) return 'Low';
  if (hour === 3) return 'Right';
  if (hour === 9) return 'Left';
  if (hour === 1 || hour === 2) return 'High-Right';
  if (hour === 10 || hour === 11) return 'High-Left';
  if (hour === 4 || hour === 5) return 'Low-Right';
  if (hour === 7 || hour === 8) return 'Low-Left';
  return 'Unknown';
}

function getMissBreakdownFromPoints(missPoints: MissPoint[]): Array<{ direction: string; count: number; avgMil: string; pct: number }> {
  const groups: Record<string, { count: number; rings: number[] }> = {};
  for (const p of missPoints) {
    const hour = milToClockHour(p.mil);
    const direction = getMissDirectionName(hour);
    if (!groups[direction]) groups[direction] = { count: 0, rings: [] };
    groups[direction].count++;
    groups[direction].rings.push(p.ring);
  }
  const total = missPoints.length;
  return Object.entries(groups)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([direction, data]) => {
      const avgRing = data.rings.reduce((s, r) => s + r, 0) / data.rings.length;
      return {
        direction,
        count: data.count,
        avgMil: ((avgRing + 1) * 0.5).toFixed(1),
        pct: total > 0 ? Math.round((data.count / total) * 100) : 0,
      };
    });
}

function getImprovementTip(topDirection: string): string {
  switch (topDirection) {
    case 'High': return 'Reduce anticipation — focus on smooth trigger press and follow-through';
    case 'Low': return 'Check trigger control — avoid flinching or jerking the trigger';
    case 'Right': return 'Adjust natural point of aim — check grip pressure and stance alignment';
    case 'Left': return 'Verify sight alignment — check for trigger finger placement issues';
    case 'High-Right': return 'Relax grip, reduce thumb pressure — focus on natural point of aim';
    case 'High-Left': return 'Reduce anticipation — check for pushing with heel of hand';
    case 'Low-Right': return 'Improve trigger finger placement — avoid pulling to the side';
    case 'Low-Left': return 'Classic flinch pattern — practice dry fire drills to build control';
    default: return 'Analyze your miss pattern to identify areas for improvement';
  }
}

function getAvgRing(missPoints: MissPoint[]): number {
  if (missPoints.length === 0) return 0;
  return missPoints.reduce((s, p) => s + p.ring, 0) / missPoints.length;
}

function getDrillRecommendations(topDirection: string): string[] {
  switch (topDirection) {
    case 'High': return ['Dry fire with coin balance', 'Slow trigger squeeze drills'];
    case 'Low': return ['Ball-and-dummy drill', 'Follow-through focus'];
    case 'Right': return ['Natural point of aim reset', 'Grip pressure check'];
    case 'Left': return ['Trigger finger placement drill', 'Sight alignment practice'];
    case 'High-Right': return ['Thumbs-forward grip drill', 'Relax dominant hand'];
    case 'High-Left': return ['Heel pressure awareness', 'Follow-through focus'];
    case 'Low-Right': return ['Trigger finger isolation', 'Steady hold practice'];
    case 'Low-Left': return ['Dry fire with snap cap', 'Ball-and-dummy drill'];
    default: return ['Focus on fundamentals', 'Practice consistent form'];
  }
}

function getConsistencyInfo(topPct: number): { label: string; color: string } {
  if (topPct >= 60) return { label: 'Concentrated', color: '#EF4444' };
  if (topPct >= 40) return { label: 'Moderate', color: '#F59E0B' };
  return { label: 'Scattered', color: '#6B7280' };
}

const MINI_CLOCK_SIZE = 110;

function MiniMissClock({
  missPoints,
  colors,
  showAllDots,
}: {
  missPoints: MissPoint[];
  colors: ReturnType<typeof useColors>;
  showAllDots: boolean;
}) {
  const size = MINI_CLOCK_SIZE;
  const half = size / 2;
  const innerRadius = size * 0.12;
  const outerRadius = size * 0.4;
  const ringCount = 3;
  const ringWidth = (outerRadius - innerRadius) / ringCount;
  const labelRadius = size * 0.46;

  // Calculate average direction for the summary marker
  let avgPx = half;
  let avgPy = half;
  if (missPoints.length > 0) {
    let sumX = 0;
    let sumY = 0;
    let sumRing = 0;
    for (const p of missPoints) {
      const a = (p.mil * 2 * Math.PI) / MIL_PER_CIRCLE;
      sumX += Math.sin(a);
      sumY += Math.cos(a);
      sumRing += p.ring;
    }
    const avgAngle = Math.atan2(sumX / missPoints.length, sumY / missPoints.length);
    const avgRingDist = innerRadius + ringWidth * ((sumRing / missPoints.length) + 0.5);
    avgPx = half + avgRingDist * Math.sin(avgAngle);
    avgPy = half - avgRingDist * Math.cos(avgAngle);
  }

  return (
    <Svg width={size} height={size}>
      {/* Concentric rings */}
      {Array.from({ length: ringCount }, (_, i) => (
        <Circle
          key={`ring-${i}`}
          cx={half}
          cy={half}
          r={innerRadius + ringWidth * (i + 1)}
          stroke={colors.border}
          strokeWidth={0.75}
          strokeOpacity={0.5}
          fill="none"
        />
      ))}

      {/* Hour lines */}
      {Array.from({ length: 12 }, (_, i) => {
        const angle = (i * Math.PI * 2) / 12;
        const isCardinal = i % 3 === 0;
        return (
          <Line
            key={`line-${i}`}
            x1={half + innerRadius * Math.sin(angle)}
            y1={half - innerRadius * Math.cos(angle)}
            x2={half + outerRadius * Math.sin(angle)}
            y2={half - outerRadius * Math.cos(angle)}
            stroke={colors.border}
            strokeWidth={isCardinal ? 1 : 0.5}
            strokeOpacity={isCardinal ? 0.7 : 0.3}
          />
        );
      })}

      {/* Center hit zone */}
      <Circle cx={half} cy={half} r={innerRadius} fill="rgba(34,197,94,0.2)" stroke="#22C55E" strokeWidth={1.5} />

      {/* Cardinal labels */}
      {[12, 3, 6, 9].map((hour) => {
        const i = hour === 12 ? 0 : hour;
        const angle = (i * Math.PI * 2) / 12;
        return (
          <SvgText
            key={`label-${hour}`}
            x={half + labelRadius * Math.sin(angle)}
            y={half - labelRadius * Math.cos(angle) + 3}
            fontSize={9}
            fontWeight="700"
            fill={colors.textMuted}
            textAnchor="middle"
          >
            {hour}
          </SvgText>
        );
      })}

      {showAllDots ? (
        /* Expanded: all miss dots */
        missPoints.map((p, i) => {
          const ringCenterDistance = innerRadius + ringWidth * (p.ring + 0.5);
          const angleRad = (p.mil * 2 * Math.PI) / MIL_PER_CIRCLE;
          const px = half + ringCenterDistance * Math.sin(angleRad);
          const py = half - ringCenterDistance * Math.cos(angleRad);
          return (
            <Circle key={i} cx={px} cy={py} r={3.5} fill="#EF4444" stroke="#fff" strokeWidth={0.8} fillOpacity={0.8} />
          );
        })
      ) : (
        /* Collapsed: average direction marker only */
        missPoints.length > 0 && (
          <>
            <Circle cx={avgPx} cy={avgPy} r={10} fill="rgba(239,68,68,0.15)" />
            <Circle cx={avgPx} cy={avgPy} r={6} fill="#EF4444" stroke="#fff" strokeWidth={1.5} />
          </>
        )
      )}
    </Svg>
  );
}

function MissPatternRow({
  member,
  isMe,
  isCommander,
  isExpanded,
  onToggle,
  colors,
  onMemberPress,
}: {
  member: MemberMissData;
  isMe: boolean;
  isCommander: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  const breakdown = getMissBreakdownFromPoints(member.missPoints);
  const topDirection = breakdown[0]?.direction || 'Unknown';
  const topPct = breakdown[0]?.pct || 0;
  const avgRing = getAvgRing(member.missPoints);
  const avgOffset = ((avgRing + 1) * 0.5).toFixed(1);
  const tip = getImprovementTip(topDirection);
  const consistency = getConsistencyInfo(topPct);
  const drills = getDrillRecommendations(topDirection);

  return (
    <TouchableOpacity activeOpacity={0.7} onPress={onToggle}>
      <View style={missStyles.memberRow}>
        {/* Clock */}
        <MiniMissClock missPoints={member.missPoints} colors={colors} showAllDots={isExpanded} />

        {/* Info */}
        <View style={missStyles.memberInfo}>
          {/* Name + badge */}
          {isCommander && (
            <TouchableOpacity
              activeOpacity={onMemberPress ? 0.6 : 1}
              onPress={() => onMemberPress?.(member.userId, member.userName)}
              style={missStyles.memberHeader}
            >
              <View style={[missStyles.memberAvatar, { backgroundColor: `${colors.textMuted}15` }]}>
                <Text style={[missStyles.memberInitials, { color: colors.textMuted }]}>
                  {getInitials(member.userName)}
                </Text>
              </View>
              <Text style={[missStyles.memberName, { color: colors.text }]} numberOfLines={1}>
                {member.userName}{isMe ? ' (you)' : ''}
              </Text>
              <View style={[missStyles.missBadge, { backgroundColor: 'rgba(239, 68, 68, 0.12)' }]}>
                <Text style={missStyles.missBadgeText}>{member.totalMisses}</Text>
              </View>
            </TouchableOpacity>
          )}

          {/* Summary line */}
          <View style={missStyles.summaryRow}>
            <Text style={[missStyles.summaryLabel, { color: colors.text }]}>
              {topDirection}
            </Text>
            <Text style={[missStyles.summaryPct, { color: '#EF4444' }]}>{topPct}%</Text>
            <View style={[missStyles.summaryDivider, { backgroundColor: colors.border }]} />
            <Text style={[missStyles.summaryOffset, { color: colors.textMuted }]}>avg {avgOffset} mil</Text>
            <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, backgroundColor: `${consistency.color}12` }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: consistency.color }}>{consistency.label}</Text>
            </View>
          </View>

          {/* Improvement tip */}
          {!isExpanded && (
            <Text style={[missStyles.tipText, { color: colors.textMuted }]} numberOfLines={2}>
              {tip}
            </Text>
          )}

          {/* Expanded: full breakdown */}
          {isExpanded && (
            <View style={missStyles.breakdownList}>
              {breakdown.map((item, i) => (
                <View key={i} style={missStyles.breakdownRow}>
                  <View style={missStyles.breakdownDot} />
                  <Text style={[missStyles.breakdownDirection, { color: colors.text }]}>{item.direction}</Text>
                  <Text style={[missStyles.breakdownPct, { color: '#EF4444' }]}>{item.pct}%</Text>
                  <Text style={[missStyles.breakdownCount, { color: colors.textMuted }]}>
                    {item.count} · {item.avgMil} mil
                  </Text>
                </View>
              ))}
              <Text style={[missStyles.tipText, { color: colors.textMuted, marginTop: 6 }]} numberOfLines={2}>
                {tip}
              </Text>
              {/* Drill recommendations */}
              <View style={missStyles.drillsRow}>
                <Text style={[missStyles.drillsLabel, { color: colors.textMuted }]}>{t('teamInsights.missPattern.try')}</Text>
                {drills.map((drill, di) => (
                  <Text key={di} style={[missStyles.drillItem, { color: colors.text }]}>{'•  '}{drill}</Text>
                ))}
              </View>
            </View>
          )}

          {/* Expand indicator */}
          <View style={missStyles.expandHint}>
            {isExpanded
              ? <ChevronUp size={12} color={colors.textMuted} />
              : <ChevronDown size={12} color={colors.textMuted} />}
            <Text style={[missStyles.expandHintText, { color: colors.textMuted }]}>
              {isExpanded ? 'Less' : 'Details'}
            </Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

function MemberMissPatterns({
  data,
  currentUserId,
  isCommander,
  colors,
  onMemberPress,
}: {
  data: MemberMissData[];
  currentUserId: string;
  isCommander: boolean;
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const displayData = isCommander ? data : data.filter((d) => d.userId === currentUserId);
  if (displayData.length === 0) return null;

  return (
    <View style={[missStyles.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {displayData.map((member, idx) => (
        <View
          key={member.userId}
          style={idx < displayData.length - 1 ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border } : undefined}
        >
          <MissPatternRow
            member={member}
            isMe={member.userId === currentUserId}
            isCommander={isCommander}
            isExpanded={expandedId === member.userId}
            onToggle={() => setExpandedId(expandedId === member.userId ? null : member.userId)}
            colors={colors}
            onMemberPress={onMemberPress}
          />
        </View>
      ))}
    </View>
  );
}

const missStyles = StyleSheet.create({
  container: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  memberRow: { flexDirection: 'row', padding: 12, gap: 12, alignItems: 'flex-start' },
  memberInfo: { flex: 1, gap: 6 },
  memberHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2 },
  memberAvatar: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  memberInitials: { fontSize: 9, fontWeight: '700' },
  memberName: { fontSize: 13, fontWeight: '600', flex: 1 },
  missBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 },
  missBadgeText: { fontSize: 10, fontWeight: '700', color: '#EF4444' },
  summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  summaryLabel: { fontSize: 14, fontWeight: '700' },
  summaryPct: { fontSize: 13, fontWeight: '700' },
  summaryDivider: { width: 1, height: 12 },
  summaryOffset: { fontSize: 11, fontWeight: '500' },
  tipText: { fontSize: 11, fontWeight: '400', lineHeight: 15, fontStyle: 'italic' },
  breakdownList: { gap: 5, marginTop: 4 },
  breakdownRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  breakdownDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#EF4444' },
  breakdownDirection: { fontSize: 12, fontWeight: '500', minWidth: 70 },
  breakdownPct: { fontSize: 12, fontWeight: '700', minWidth: 30 },
  breakdownCount: { fontSize: 11, fontWeight: '500', flex: 1, textAlign: 'right' },
  expandHint: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  expandHintText: { fontSize: 10, fontWeight: '500' },
  drillsRow: { gap: 3, marginTop: 6, paddingTop: 6, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.1)' },
  drillsLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  drillItem: { fontSize: 11, fontWeight: '500', lineHeight: 16 },
});

// ============================================================================
// MEMBER IMPROVEMENT CARD (coaching-focused summary for member view)
// ============================================================================

function MemberImprovementCard({
  missData,
  accuracy,
  colors,
}: {
  missData: MemberMissData;
  accuracy: number | null;
  colors: ReturnType<typeof useColors>;
}) {
  const breakdown = getMissBreakdownFromPoints(missData.missPoints);
  if (breakdown.length === 0) return null;

  const topDirection = breakdown[0].direction;
  const topPct = breakdown[0].pct;
  const tip = getImprovementTip(topDirection);
  const drills = getDrillRecommendations(topDirection);
  const consistency = getConsistencyInfo(topPct);
  const goalPct = Math.max(topPct - 15, 20);

  return (
    <View style={[improvStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header */}
      <View style={improvStyles.header}>
        <View style={improvStyles.headerLeft}>
          <Text style={[improvStyles.headerTitle, { color: colors.text }]}>{t('teamInsights.improvement.title')}</Text>
          <Text style={[improvStyles.headerSub, { color: colors.textMuted }]}>
            Based on {missData.totalMisses} recorded misses
          </Text>
        </View>
        {accuracy !== null && (
          <View style={[improvStyles.accuracyBadge, { backgroundColor: accuracy >= 70 ? `${colors.green}15` : `${colors.textMuted}10` }]}>
            <Text style={[improvStyles.accuracyValue, { color: accuracy >= 70 ? colors.green : colors.text }]}>
              {accuracy.toFixed(0)}%
            </Text>
            <Text style={[improvStyles.accuracyLabel, { color: colors.textMuted }]}>{t('teamInsights.comparison.accuracy')}</Text>
          </View>
        )}
      </View>

      {/* Primary weakness + consistency metrics */}
      <View style={[improvStyles.metricsRow, { borderTopColor: colors.border }]}>
        <View style={improvStyles.metricBox}>
          <Text style={[improvStyles.metricLabel, { color: colors.textMuted }]}>{t('teamInsights.improvement.primaryWeakness')}</Text>
          <Text style={[improvStyles.metricValue, { color: '#EF4444' }]}>{topDirection}</Text>
          <Text style={[improvStyles.metricSub, { color: colors.textMuted }]}>{topPct}% of misses</Text>
        </View>
        <View style={[improvStyles.metricDivider, { backgroundColor: colors.border }]} />
        <View style={improvStyles.metricBox}>
          <Text style={[improvStyles.metricLabel, { color: colors.textMuted }]}>{t('teamInsights.improvement.pattern')}</Text>
          <Text style={[improvStyles.metricValue, { color: consistency.color }]}>{consistency.label}</Text>
          <Text style={[improvStyles.metricSub, { color: colors.textMuted }]}>
            {topPct >= 60 ? 'Specific fix needed' : topPct >= 40 ? 'Work on this area' : 'Focus on fundamentals'}
          </Text>
        </View>
      </View>

      {/* Coaching tip */}
      <View style={[improvStyles.tipSection, { borderTopColor: colors.border }]}>
        <Text style={[improvStyles.tipText, { color: colors.text }]}>{tip}</Text>
      </View>

      {/* Goal */}
      <View style={[improvStyles.goalRow, { backgroundColor: `${colors.primary}08` }]}>
        <Target size={12} color={colors.primary} />
        <Text style={[improvStyles.goalText, { color: colors.text }]}>
          Reduce <Text style={{ fontWeight: '700', color: '#EF4444' }}>{topDirection}</Text> from {topPct}% to below {goalPct}%
        </Text>
      </View>

      {/* Recommended drills */}
      <View style={improvStyles.drillsSection}>
        <Text style={[improvStyles.drillsSectionLabel, { color: colors.textMuted }]}>{t('teamInsights.improvement.recommendedDrills')}</Text>
        {drills.map((drill, i) => (
          <View key={i} style={improvStyles.drillRow}>
            <View style={[improvStyles.drillDot, { backgroundColor: colors.primary }]} />
            <Text style={[improvStyles.drillText, { color: colors.text }]}>{drill}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const improvStyles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 14, paddingBottom: 10 },
  headerLeft: { flex: 1 },
  headerTitle: { fontSize: 15, fontWeight: '700' },
  headerSub: { fontSize: 11, marginTop: 2 },
  accuracyBadge: { alignItems: 'center', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  accuracyValue: { fontSize: 16, fontWeight: '800' },
  accuracyLabel: { fontSize: 9, marginTop: 1 },
  metricsRow: { flexDirection: 'row', alignItems: 'stretch', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 12, paddingHorizontal: 14 },
  metricBox: { flex: 1, alignItems: 'center', gap: 3 },
  metricLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  metricValue: { fontSize: 18, fontWeight: '800' },
  metricSub: { fontSize: 10 },
  metricDivider: { width: 1, marginHorizontal: 12 },
  tipSection: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  tipText: { fontSize: 12, fontWeight: '500', lineHeight: 17, fontStyle: 'italic' },
  goalRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10 },
  goalText: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },
  drillsSection: { paddingHorizontal: 14, paddingTop: 8, paddingBottom: 14, gap: 6 },
  drillsSectionLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5, marginBottom: 2 },
  drillRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  drillDot: { width: 5, height: 5, borderRadius: 3 },
  drillText: { fontSize: 12, fontWeight: '500' },
});

// ============================================================================
// TEAM MISS OVERVIEW (aggregate summary for commander view)
// ============================================================================

function TeamMissOverview({
  data,
  colors,
}: {
  data: MemberMissData[];
  colors: ReturnType<typeof useColors>;
}) {
  const allPoints = data.flatMap((d) => d.missPoints);
  if (allPoints.length === 0) return null;

  const breakdown = getMissBreakdownFromPoints(allPoints);
  const topDirection = breakdown[0]?.direction || 'Unknown';
  const topPct = breakdown[0]?.pct || 0;

  // How many members share the same dominant direction
  const membersWithSameDominant = data.filter((d) => {
    const mb = getMissBreakdownFromPoints(d.missPoints);
    return mb.length > 0 && mb[0].direction === topDirection;
  }).length;

  const tip = getImprovementTip(topDirection);

  return (
    <View style={[teamMissStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={teamMissStyles.statsRow}>
        <View style={teamMissStyles.stat}>
          <Text style={[teamMissStyles.statValue, { color: colors.text }]}>{allPoints.length}</Text>
          <Text style={[teamMissStyles.statLabel, { color: colors.textMuted }]}>{t('teamInsights.missPattern.totalMisses')}</Text>
        </View>
        <View style={[teamMissStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={teamMissStyles.stat}>
          <Text style={[teamMissStyles.statValue, { color: '#EF4444' }]}>{topDirection}</Text>
          <Text style={[teamMissStyles.statLabel, { color: colors.textMuted }]}>{topPct}% dominant</Text>
        </View>
        <View style={[teamMissStyles.statDivider, { backgroundColor: colors.border }]} />
        <View style={teamMissStyles.stat}>
          <Text style={[teamMissStyles.statValue, { color: colors.text }]}>{membersWithSameDominant}/{data.length}</Text>
          <Text style={[teamMissStyles.statLabel, { color: colors.textMuted }]}>{t('teamInsights.missPattern.samePattern')}</Text>
        </View>
      </View>

      {/* Training recommendation when multiple members share a pattern */}
      {membersWithSameDominant >= 2 && (
        <View style={[teamMissStyles.recommendation, { borderTopColor: colors.border }]}>
          <Zap size={12} color={colors.primary} />
          <Text style={[teamMissStyles.recText, { color: colors.textMuted }]}>
            <Text style={{ fontWeight: '600' }}>{membersWithSameDominant} members</Text> share{' '}
            <Text style={{ color: '#EF4444', fontWeight: '600' }}>{topDirection}</Text> as primary miss direction.{' '}
            {tip.split('—')[0].trim()}.
          </Text>
        </View>
      )}
    </View>
  );
}

const teamMissStyles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  statsRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 8 },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: { fontSize: 16, fontWeight: '800' },
  statLabel: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  statDivider: { width: 1, height: 24 },
  recommendation: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 10 },
  recText: { fontSize: 11, fontWeight: '400', lineHeight: 16, flex: 1 },
});

// ============================================================================
// KEY TAKEAWAYS (member personalized insights)
// ============================================================================

function KeyTakeaways({
  myStats,
  teamAverages,
  missData,
  colors,
}: {
  myStats: { accuracy: number | null; shots: number; sessions: number; bestGrouping: number | null; vsTeamAvg: number | null };
  teamAverages: { accuracy: number | null; grouping: number | null };
  missData: MemberMissData | undefined;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  const takeaways: Array<{ type: 'positive' | 'neutral' | 'warning'; text: string }> = [];

  if (myStats.vsTeamAvg !== null) {
    if (myStats.vsTeamAvg > 2) {
      takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.accuracyAboveAvg', { delta: myStats.vsTeamAvg.toFixed(1) }) });
    } else if (myStats.vsTeamAvg < -2) {
      takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.accuracyBelowAvg', { delta: Math.abs(myStats.vsTeamAvg).toFixed(1) }) });
    } else {
      takeaways.push({ type: 'neutral', text: t('teamInsights.takeaways.accuracyInLine') });
    }
  }

  if (myStats.sessions >= 5) {
    takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.activeContributor', { sessions: myStats.sessions, shots: myStats.shots.toLocaleString() }) });
  } else if (myStats.sessions >= 2) {
    takeaways.push({ type: 'neutral', text: t('teamInsights.takeaways.sessionsCompleted', { sessions: myStats.sessions }) });
  }

  if (myStats.bestGrouping !== null && teamAverages.grouping !== null) {
    if (myStats.bestGrouping < teamAverages.grouping) {
      takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.bestGroupingBeats', { yours: myStats.bestGrouping.toFixed(1), team: teamAverages.grouping.toFixed(1) }) });
    }
  }

  if (missData && missData.totalMisses > 0) {
    const bd = getMissBreakdownFromPoints(missData.missPoints);
    if (bd.length > 0 && bd[0].pct >= 40) {
      takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.missDirection', { pct: bd[0].pct, direction: bd[0].direction }) });
    }
  }

  if (takeaways.length === 0) return null;

  return (
    <View style={[takeawayStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {takeaways.slice(0, 4).map((t, i) => (
        <View key={i} style={[takeawayStyles.row, i < Math.min(takeaways.length, 4) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={[takeawayStyles.icon, { backgroundColor: t.type === 'positive' ? `${colors.green}12` : t.type === 'warning' ? 'rgba(239,68,68,0.08)' : `${colors.textMuted}08` }]}>
            {t.type === 'positive' && <TrendingUp size={10} color={colors.green} />}
            {t.type === 'warning' && <AlertTriangle size={10} color="#EF4444" />}
            {t.type === 'neutral' && <Minus size={10} color={colors.textMuted} />}
          </View>
          <Text style={[takeawayStyles.text, { color: colors.text }]}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

// ============================================================================
// COMMANDER KEY INSIGHTS (team-level intelligence)
// ============================================================================

function CommanderKeyInsights({
  teamTotals,
  teamReadiness,
  teamWeakAreas,
  memberMissData,
  performanceTrend,
  colors,
}: {
  teamTotals: { sessions: number; shots: number; avgAccuracy: number | null };
  teamReadiness: TeamReadiness;
  teamWeakAreas: TeamWeakArea[];
  memberMissData: MemberMissData[];
  performanceTrend: { delta: number; direction: 'up' | 'down' | 'flat' } | null;
  colors: ReturnType<typeof useColors>;
}) {
  const { t } = useTranslation();
  const takeaways: Array<{ type: 'positive' | 'neutral' | 'warning'; text: string }> = [];

  if (teamReadiness.participationRate >= 80) {
    takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.highParticipation', { rate: teamReadiness.participationRate }) });
  } else if (teamReadiness.participationRate < 50) {
    takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.lowParticipation', { rate: teamReadiness.participationRate }) });
  }

  if (performanceTrend) {
    if (performanceTrend.direction === 'up') {
      takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.accuracyTrendingUp', { delta: Math.abs(performanceTrend.delta).toFixed(1) }) });
    } else if (performanceTrend.direction === 'down') {
      takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.accuracyDeclining', { delta: Math.abs(performanceTrend.delta).toFixed(1) }) });
    }
  }

  if (teamWeakAreas.length > 0) {
    takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.weakArea', { label: teamWeakAreas[0].label, detail: teamWeakAreas[0].detail }) });
  }

  if (teamTotals.avgAccuracy !== null && teamTotals.avgAccuracy >= 70) {
    takeaways.push({ type: 'positive', text: t('teamInsights.takeaways.teamAccuracyAbove', { accuracy: teamTotals.avgAccuracy.toFixed(0) }) });
  }

  // Shared miss pattern across team
  if (memberMissData.length >= 2) {
    const allPoints = memberMissData.flatMap((d) => d.missPoints);
    if (allPoints.length > 0) {
      const bd = getMissBreakdownFromPoints(allPoints);
      if (bd.length > 0 && bd[0].pct >= 40) {
        takeaways.push({ type: 'warning', text: t('teamInsights.takeaways.teamMissDirection', { direction: bd[0].direction, pct: bd[0].pct }) });
      }
    }
  }

  if (takeaways.length === 0) return null;

  return (
    <View style={[takeawayStyles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {takeaways.slice(0, 4).map((t, i) => (
        <View key={i} style={[takeawayStyles.row, i < Math.min(takeaways.length, 4) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={[takeawayStyles.icon, { backgroundColor: t.type === 'positive' ? `${colors.green}12` : t.type === 'warning' ? 'rgba(239,68,68,0.08)' : `${colors.textMuted}08` }]}>
            {t.type === 'positive' && <TrendingUp size={10} color={colors.green} />}
            {t.type === 'warning' && <AlertTriangle size={10} color="#EF4444" />}
            {t.type === 'neutral' && <Minus size={10} color={colors.textMuted} />}
          </View>
          <Text style={[takeawayStyles.text, { color: colors.text }]}>{t.text}</Text>
        </View>
      ))}
    </View>
  );
}

const takeawayStyles = StyleSheet.create({
  card: { borderRadius: 10, borderWidth: 1, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  icon: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 12, fontWeight: '500', flex: 1, lineHeight: 17 },
});

// ============================================================================
// EXPANDED DETAIL PANELS
// ============================================================================

/** Readiness: per-member trained status list */
function ReadinessDetail({
  memberStats,
  inactiveNames,
  colors,
  onMemberPress,
}: {
  memberStats: TeamMemberStat[];
  inactiveNames: string[];
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {memberStats.map((m, i) => {
        const lastActiveTime = m.lastActive ? new Date(m.lastActive).getTime() : 0;
        const trainedThisWeek = lastActiveTime >= weekAgo;
        const row = (
          <View style={[detailStyles.row, i < memberStats.length + inactiveNames.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <View style={[detailStyles.statusDot, { backgroundColor: trainedThisWeek ? colors.green : `${colors.textMuted}30` }]} />
            <Text style={[detailStyles.name, { color: colors.text }]} numberOfLines={1}>{m.userName}</Text>
            <Text style={[detailStyles.value, { color: colors.textMuted }]}>{m.sessions} sess</Text>
            <Text style={[detailStyles.sub, { color: colors.textMuted }]}>{formatRelativeTime(m.lastActive)}</Text>
          </View>
        );
        return onMemberPress ? (
          <TouchableOpacity key={m.userId} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.userName)}>
            {row}
          </TouchableOpacity>
        ) : <React.Fragment key={m.userId}>{row}</React.Fragment>;
      })}
      {inactiveNames.map((name, i) => (
        <View key={`inactive-${i}`} style={[detailStyles.row, i < inactiveNames.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <View style={[detailStyles.statusDot, { backgroundColor: `${colors.textMuted}20` }]} />
          <Text style={[detailStyles.name, { color: colors.textMuted }]} numberOfLines={1}>{name}</Text>
          <Text style={[detailStyles.value, { color: colors.textMuted }]}>—</Text>
          <Text style={[detailStyles.sub, { color: colors.textMuted }]}>{t('teamInsights.detail.never')}</Text>
        </View>
      ))}
    </View>
  );
}

/** Activity: per-day stats */
function ActivityDetail({
  data,
  colors,
}: {
  data: Array<{ label: string; sessions: number; rounds: number }>;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.tableHeader}>
        <Text style={[detailStyles.thLabel, { color: colors.textMuted }]}>{t('teamInsights.detail.day')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.sessions')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.rounds')}</Text>
      </View>
      {data.map((d, i) => (
        <View key={i} style={[detailStyles.row, i < data.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <Text style={[detailStyles.dayLabel, { color: colors.text }]}>{d.label}</Text>
          <Text style={[detailStyles.value, { color: d.sessions > 0 ? colors.text : colors.textMuted }]}>{d.sessions || '—'}</Text>
          <Text style={[detailStyles.value, { color: d.rounds > 0 ? colors.text : colors.textMuted }]}>{d.rounds > 0 ? formatShots(d.rounds) : '—'}</Text>
        </View>
      ))}
    </View>
  );
}

/** Trends: per-date accuracy + grouping */
function TrendsDetail({
  data,
  colors,
}: {
  data: Array<{ date: string; accuracy?: number; grouping?: number }>;
  colors: ReturnType<typeof useColors>;
}) {
  if (data.length === 0) return null;
  const formatDate = (d: string) => {
    const parts = d.split('-');
    return `${parts[1]}/${parts[2]}`;
  };
  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.tableHeader}>
        <Text style={[detailStyles.thLabel, { color: colors.textMuted }]}>{t('teamInsights.detail.date')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.accuracy')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.grouping')}</Text>
      </View>
      {data.map((d, i) => (
        <View key={i} style={[detailStyles.row, i < data.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
          <Text style={[detailStyles.dayLabel, { color: colors.text }]}>{formatDate(d.date)}</Text>
          <Text style={[detailStyles.value, { color: d.accuracy !== undefined && d.accuracy >= 70 ? colors.green : colors.text }]}>
            {d.accuracy !== undefined ? `${d.accuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[detailStyles.value, { color: colors.textMuted }]}>
            {d.grouping !== undefined ? `${d.grouping.toFixed(1)}cm` : '—'}
          </Text>
        </View>
      ))}
    </View>
  );
}

/** Accuracy bars: per-member detailed stats */
function AccuracyDetail({
  members,
  colors,
  onMemberPress,
}: {
  members: TeamMemberStat[];
  colors: ReturnType<typeof useColors>;
  onMemberPress?: (userId: string, userName: string) => void;
}) {
  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.tableHeader}>
        <Text style={[detailStyles.thLabel, { color: colors.textMuted }]}>{t('teamInsights.detail.member')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.sessions')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.shots')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.group')}</Text>
      </View>
      {members.map((m, i) => {
        const row = (
          <View style={[detailStyles.row, i < members.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <Text style={[detailStyles.name, { color: colors.text }]} numberOfLines={1}>{m.userName}</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{m.sessions}</Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{formatShots(m.shots)}</Text>
            <Text style={[detailStyles.value, { color: colors.textMuted }]}>{m.bestDispersion !== null ? `${m.bestDispersion.toFixed(1)}` : '—'}</Text>
          </View>
        );
        return onMemberPress ? (
          <TouchableOpacity key={m.userId} activeOpacity={0.6} onPress={() => onMemberPress(m.userId, m.userName)}>
            {row}
          </TouchableOpacity>
        ) : <React.Fragment key={m.userId}>{row}</React.Fragment>;
      })}
    </View>
  );
}

/** Training focus: drill recommendations per weak area */
function FocusDetail({
  weakAreas,
  colors,
}: {
  weakAreas: TeamWeakArea[];
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {weakAreas.slice(0, 3).map((area, i) => {
        const drills = getDrillRecommendations(area.label);
        return (
          <View key={`${area.type}-${area.label}`} style={[{ paddingVertical: 8, paddingHorizontal: 12 }, i < Math.min(weakAreas.length, 3) - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <Text style={[detailStyles.focusArea, { color: colors.text }]}>{area.label} — {area.avgAccuracy.toFixed(0)}%</Text>
            {drills.map((drill, di) => (
              <Text key={di} style={[detailStyles.drillItem, { color: colors.textMuted }]}>{'•  '}{drill}</Text>
            ))}
          </View>
        );
      })}
    </View>
  );
}

/** Member comparison: recent sessions mini-table */
function RecentSessionsDetail({
  sessions,
  userId,
  colors,
}: {
  sessions: Array<{ id: string; user_id: string; started_at: string; stats?: { shots_fired?: number; hits_total?: number; best_dispersion_cm?: number | null } | null }>;
  userId: string;
  colors: ReturnType<typeof useColors>;
}) {
  const mySessions = sessions
    .filter((s) => s.user_id === userId)
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .slice(0, 5);

  if (mySessions.length === 0) return null;

  const formatDate = (d: string) => {
    const date = new Date(d);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <View style={[detailStyles.panel, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={detailStyles.tableHeader}>
        <Text style={[detailStyles.thLabel, { color: colors.textMuted }]}>{t('teamInsights.detail.date')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.accuracy')}</Text>
        <Text style={[detailStyles.thValue, { color: colors.textMuted }]}>{t('teamInsights.detail.shots')}</Text>
      </View>
      {mySessions.map((s, i) => {
        const shots = s.stats?.shots_fired || 0;
        const hits = s.stats?.hits_total || 0;
        const acc = shots > 0 ? (hits / shots) * 100 : null;
        return (
          <View key={s.id} style={[detailStyles.row, i < mySessions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
            <Text style={[detailStyles.dayLabel, { color: colors.text }]}>{formatDate(s.started_at)}</Text>
            <Text style={[detailStyles.value, { color: acc !== null && acc >= 70 ? colors.green : colors.text }]}>
              {acc !== null ? `${acc.toFixed(0)}%` : '—'}
            </Text>
            <Text style={[detailStyles.value, { color: colors.text }]}>{shots}</Text>
          </View>
        );
      })}
    </View>
  );
}

const detailStyles = StyleSheet.create({
  panel: { borderRadius: 8, borderWidth: 1, marginTop: 8, overflow: 'hidden' },
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(128,128,128,0.15)' },
  thLabel: { flex: 1, fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  thValue: { width: 60, fontSize: 9, fontWeight: '700', letterSpacing: 0.5, textAlign: 'right' },
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  statusDot: { width: 7, height: 7, borderRadius: 4, marginRight: 8 },
  name: { flex: 1, fontSize: 12, fontWeight: '500' },
  dayLabel: { flex: 1, fontSize: 12, fontWeight: '500' },
  value: { width: 60, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  sub: { width: 40, fontSize: 11, fontWeight: '400', textAlign: 'right' },
  focusArea: { fontSize: 12, fontWeight: '600', marginBottom: 4 },
  drillItem: { fontSize: 11, fontWeight: '400', lineHeight: 17 },
});

// ============================================================================
// MEMBER DETAIL SHEET (bottom sheet popup)
// ============================================================================

interface MemberSheetData {
  userId: string;
  userName: string;
  stat?: TeamMemberStat;
  missData?: MemberMissData;
  recentSessions: Array<{ id: string; started_at: string; shots: number; hits: number; accuracy: number | null; drillName: string; grouping: number | null }>;
}

function MemberDetailSheet({
  visible,
  data,
  teamAvgAccuracy,
  onClose,
}: {
  visible: boolean;
  data: MemberSheetData | null;
  teamAvgAccuracy: number | null;
  onClose: () => void;
}) {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  

  if (!data) return null;

  const { stat, missData, recentSessions } = data;
  const accuracy = stat?.accuracy ?? null;
  const accColor = getAccuracyColor(accuracy, colors);

  // Miss breakdown (top 3)
  const breakdown = missData ? getMissBreakdownFromPoints(missData.missPoints).slice(0, 3) : [];

  // Vs team average
  const vsDelta = accuracy !== null && teamAvgAccuracy !== null ? accuracy - teamAvgAccuracy : null;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[sheetStyles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[sheetStyles.header, { borderBottomColor: colors.border }]}>
          <View style={[sheetStyles.avatar, { backgroundColor: `${accColor}18` }]}>
            <Text style={[sheetStyles.avatarText, { color: accColor }]}>{getInitials(data.userName)}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sheetStyles.name, { color: colors.text }]}>{data.userName}</Text>
            {stat && <Text style={[sheetStyles.subtitle, { color: colors.textMuted }]}>{stat.sessions} sessions · {formatShots(stat.shots)} shots</Text>}
          </View>
          <TouchableOpacity style={[sheetStyles.closeBtn, { backgroundColor: colors.card }]} onPress={onClose}>
            <X size={18} color={colors.text} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={[sheetStyles.scrollContent, { paddingBottom: insets.bottom + 20 }]} showsVerticalScrollIndicator={false}>
          {/* Stats row */}
          {stat && (
            <View style={sheetStyles.statsGrid}>
              <View style={[sheetStyles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[sheetStyles.statValue, { color: accColor }]}>{accuracy !== null ? `${accuracy.toFixed(0)}%` : '—'}</Text>
                <Text style={[sheetStyles.statLabel, { color: colors.textMuted }]}>{t('teamInsights.memberSheet.accuracy')}</Text>
              </View>
              <View style={[sheetStyles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[sheetStyles.statValue, { color: colors.text }]}>{stat.bestDispersion !== null ? `${stat.bestDispersion.toFixed(1)}` : '—'}</Text>
                <Text style={[sheetStyles.statLabel, { color: colors.textMuted }]}>Best Group (cm)</Text>
              </View>
              <View style={[sheetStyles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[sheetStyles.statValue, { color: vsDelta !== null && vsDelta >= 0 ? colors.green : colors.textMuted }]}>
                  {vsDelta !== null ? `${vsDelta >= 0 ? '+' : ''}${vsDelta.toFixed(0)}%` : '—'}
                </Text>
                <Text style={[sheetStyles.statLabel, { color: colors.textMuted }]}>{t('teamInsights.memberSheet.vsTeamAvg')}</Text>
              </View>
              <View style={[sheetStyles.statCard, { backgroundColor: colors.card }]}>
                <Text style={[sheetStyles.statValue, { color: colors.text }]}>{stat.lastActive ? formatRelativeTime(stat.lastActive) : '—'}</Text>
                <Text style={[sheetStyles.statLabel, { color: colors.textMuted }]}>{t('teamInsights.memberSheet.lastActive')}</Text>
              </View>
            </View>
          )}

          {/* Miss Patterns */}
          {missData && breakdown.length > 0 && (
            <View style={sheetStyles.sectionBlock}>
              <Text style={[sheetStyles.sectionTitle, { color: colors.textMuted }]}>{t('teamInsights.memberSheet.missPatterns')}</Text>
              <View style={[sheetStyles.sectionCard, { backgroundColor: colors.card }]}>
                <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                  <MiniMissClock missPoints={missData.missPoints} colors={colors} showAllDots />
                </View>
                {breakdown.map((item, i) => (
                  <View key={i} style={[sheetStyles.missRow, i < breakdown.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                    <Text style={[sheetStyles.missDirection, { color: colors.text }]}>{item.direction}</Text>
                    <Text style={[sheetStyles.missPct, { color: '#EF4444' }]}>{item.pct}%</Text>
                    <Text style={[sheetStyles.missCount, { color: colors.textMuted }]}>{item.count} misses</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Recent Sessions */}
          {recentSessions.length > 0 && (
            <View style={sheetStyles.sectionBlock}>
              <Text style={[sheetStyles.sectionTitle, { color: colors.textMuted }]}>{t('teamInsights.memberSheet.recentSessions')}</Text>
              <View style={[sheetStyles.sectionCard, { backgroundColor: colors.card }]}>
                {recentSessions.map((s, i) => {
                  const sAccColor = getAccuracyColor(s.accuracy, colors);
                  return (
                    <View key={s.id} style={[sheetStyles.sessionRow, i < recentSessions.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                      <View style={{ flex: 1 }}>
                        <Text style={[sheetStyles.sessionDrill, { color: colors.text }]} numberOfLines={1}>{s.drillName}</Text>
                        <Text style={[sheetStyles.sessionDate, { color: colors.textMuted }]}>{formatSessionDate(s.started_at)}</Text>
                      </View>
                      <Text style={[sheetStyles.sessionAcc, { color: sAccColor }]}>{s.accuracy !== null ? `${s.accuracy.toFixed(0)}%` : '—'}</Text>
                      <Text style={[sheetStyles.sessionShots, { color: colors.textMuted }]}>{s.shots} rds</Text>
                    </View>
                  );
                })}
              </View>
            </View>
          )}

          {/* No data fallback for inactive members */}
          {!stat && recentSessions.length === 0 && (
            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
              <Text style={[sheetStyles.sectionTitle, { color: colors.textMuted, fontSize: 13 }]}>{t('teamInsights.memberSheet.noTrainingData')}</Text>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

function formatSessionDate(d: string): string {
  const date = new Date(d);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

const sheetStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '700' },
  subtitle: { fontSize: 12, marginTop: 2 },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  scrollContent: { paddingHorizontal: 16, paddingTop: 16, gap: 20 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statCard: { width: '48%' as any, borderRadius: 10, padding: 12, alignItems: 'center', gap: 4 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 10, fontWeight: '600', letterSpacing: 0.3 },
  sectionBlock: { gap: 8 },
  sectionTitle: { fontSize: 10, fontWeight: '700', letterSpacing: 0.8 },
  sectionCard: { borderRadius: 10, overflow: 'hidden' },
  missRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 14, gap: 8 },
  missDirection: { flex: 1, fontSize: 13, fontWeight: '600' },
  missPct: { fontSize: 13, fontWeight: '700', width: 40, textAlign: 'right' },
  missCount: { fontSize: 11, width: 60, textAlign: 'right' },
  sessionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, gap: 10 },
  sessionDrill: { fontSize: 13, fontWeight: '500' },
  sessionDate: { fontSize: 11, marginTop: 2 },
  sessionAcc: { fontSize: 14, fontWeight: '700', width: 40, textAlign: 'right' },
  sessionShots: { fontSize: 11, width: 40, textAlign: 'right' },
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TeamInsights() {
  const { t } = useTranslation();
  const colors = useColors();

  const {
    loading,
    refreshing,
    hasData,
    userId,
    activeTeam,
    members,
    isCommander,
    teamTotals,
    teamAverages,
    participationRate,
    myStats,
    myPercentile,
    myComparison,
    memberRankings,
    positionBreakdown,
    distanceBreakdown,
    weaponCategoryBreakdown,
    teamWeakAreas,
    weeklyActivityData,
    performanceChartData,
    teamReadiness,
    memberAccuracyRanking,
    inactiveMembersInfo,
    memberMissData,
    completedSessions,
    memberStats,
    handleRefresh,
    goToStartSession,
    goToSessionHistory,
  } = useTeamInsights();

  // Section expand/collapse state
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (id: string) =>
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));

  // Member detail sheet state
  const [sheetMember, setSheetMember] = useState<MemberSheetData | null>(null);

  const openMemberSheet = (memberId: string, memberName: string) => {
    const stat = memberStats.find((m) => m.userId === memberId);
    const miss = memberMissData.find((m) => m.userId === memberId);
    const sessions = completedSessions
      .filter((s) => s.user_id === memberId)
      .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
      .slice(0, 5)
      .map((s) => ({
        id: s.id,
        started_at: s.started_at,
        shots: s.stats?.shots_fired || 0,
        hits: s.stats?.hits_total || 0,
        accuracy: s.stats?.shots_fired ? ((s.stats.hits_total || 0) / s.stats.shots_fired) * 100 : null,
        drillName: s.drill_name || s.drill_config?.name || 'Session',
        grouping: s.stats?.best_dispersion_cm ?? null,
      }));
    setSheetMember({ userId: memberId, userName: memberName, stat, missData: miss, recentSessions: sessions });
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Format position breakdown for matrix
  const positionRows: MatrixRow[] = positionBreakdown.map((p) => ({
    label: p.position.charAt(0).toUpperCase() + p.position.slice(1),
    sessions: p.sessions,
    totalShots: p.totalShots,
    avgAccuracy: p.avgAccuracy,
    avgGrouping: p.avgGrouping,
    memberCount: p.memberCount,
  }));

  // Format distance breakdown for matrix
  const distanceRows: MatrixRow[] = distanceBreakdown.map((d) => ({
    label: d.label,
    sessions: d.sessions,
    totalShots: d.totalShots,
    avgAccuracy: d.avgAccuracy,
    avgGrouping: d.avgGrouping,
    memberCount: d.memberCount,
  }));

  // Format weapon category breakdown for matrix
  const weaponRows: MatrixRow[] = weaponCategoryBreakdown.map((w) => ({
    label: w.label,
    sessions: w.sessions,
    totalShots: w.totalShots,
    avgAccuracy: w.avgAccuracy,
    avgGrouping: w.avgGrouping,
    memberCount: w.memberCount,
  }));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.text} />}
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>{t('insights.title')}</Text>
          {hasData && (
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {isCommander ? 'Team Overview' : 'Your Progress'}
            </Text>
          )}
        </View>

        {/* Context Header */}
        <TeamContextHeader
          teamName={activeTeam?.name}
          isCommander={isCommander}
          memberCount={members?.length || 0}
          colors={colors}
        />

        {/* Content */}
        {!hasData ? (
          <EmptyState colors={colors} onStartSession={goToStartSession} />
        ) : isCommander ? (
          /* ═══════════════════════════════════════════════════════════ */
          /* COMMANDER VIEW */
          /* ═══════════════════════════════════════════════════════════ */
          <>
            {/* 1. Team Readiness Summary */}
            <Animated.View entering={FadeIn.delay(50)}>
              <SectionHeader title={t('teamInsights.sections.readiness')} icon={<Shield size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['readiness']} onPress={() => toggleSection('readiness')} />
              <TeamReadinessSummary readiness={teamReadiness} teamAccuracy={teamTotals.avgAccuracy} colors={colors} />
              {expandedSections['readiness'] && (
                <ReadinessDetail
                  memberStats={memberStats}
                  inactiveNames={inactiveMembersInfo.map((m) => m.userName)}
                  colors={colors}
                  onMemberPress={openMemberSheet}
                />
              )}
            </Animated.View>

            {/* 2. Commander Key Insights */}
            <Animated.View entering={FadeIn.delay(70)} style={styles.section}>
              <SectionHeader title={t('teamInsights.sections.keyInsights')} icon={<Zap size={12} color={colors.textMuted} />} colors={colors} />
              <CommanderKeyInsights
                teamTotals={teamTotals}
                teamReadiness={teamReadiness}
                teamWeakAreas={teamWeakAreas}
                memberMissData={memberMissData}
                performanceTrend={computeAccuracyTrend(performanceChartData)}
                colors={colors}
              />
            </Animated.View>

            {/* 3. Activity chart - weekly tempo */}
            {weeklyActivityData.some((d) => d.sessions > 0) && (
              <Animated.View entering={FadeIn.delay(130)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.activity')} icon={<BarChart3 size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['activity']} onPress={() => toggleSection('activity')} />
                <ActivityChart data={weeklyActivityData} title="" height={90} />
                {expandedSections['activity'] && (
                  <ActivityDetail data={weeklyActivityData} colors={colors} />
                )}
              </Animated.View>
            )}

            {/* 5. Trends - accuracy over time */}
            {performanceChartData.length >= 2 && (
              <Animated.View entering={FadeIn.delay(160)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.trends')} icon={<TrendingUp size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['trends']} onPress={() => toggleSection('trends')} />
                <PerformanceChart data={performanceChartData} height={130} />
                {expandedSections['trends'] && (
                  <TrendsDetail data={performanceChartData} colors={colors} />
                )}
              </Animated.View>
            )}

            {/* 6. Member Rankings */}
            {memberRankings.length > 0 && (
              <Animated.View entering={FadeIn.delay(190)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.memberRankings')} icon={<Users size={12} color={colors.textMuted} />} colors={colors} />
                <MemberDetailTable members={memberRankings} currentUserId={userId} colors={colors} onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {/* 7. Accuracy Comparison */}
            {memberAccuracyRanking.length > 0 && (
              <Animated.View entering={FadeIn.delay(220)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.accuracyComparison')} icon={<Target size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['accuracy']} onPress={() => toggleSection('accuracy')} />
                <MemberAccuracyBars members={memberAccuracyRanking} colors={colors} onMemberPress={openMemberSheet} />
                {expandedSections['accuracy'] && (
                  <AccuracyDetail members={memberAccuracyRanking} colors={colors} onMemberPress={openMemberSheet} />
                )}
              </Animated.View>
            )}

            {/* 8. Miss Patterns + Training Focus (performance analysis) */}
            {memberMissData.length > 0 && (
              <Animated.View entering={FadeIn.delay(250)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.missPatterns')} icon={<Crosshair size={12} color={colors.textMuted} />} colors={colors} />
                <TeamMissOverview data={memberMissData} colors={colors} />
                <MemberMissPatterns data={memberMissData} currentUserId={userId} isCommander={true} colors={colors} onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {teamWeakAreas.length > 0 && (
              <Animated.View entering={FadeIn.delay(280)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.trainingFocus')} icon={<Target size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['focus']} onPress={() => toggleSection('focus')} />
                <TrainingFocus weakAreas={teamWeakAreas} colors={colors} />
                {expandedSections['focus'] && (
                  <FocusDetail weakAreas={teamWeakAreas} colors={colors} />
                )}
              </Animated.View>
            )}

            {/* 9. Breakdowns - distance, position, weapon */}
            {distanceRows.length > 0 && (
              <Animated.View entering={FadeIn.delay(310)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.byDistance')} icon={<Crosshair size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['distance']} onPress={() => toggleSection('distance')} />
                <MatrixTable rows={distanceRows} colors={colors} expanded={expandedSections['distance']} sessions={completedSessions} filterKey="distance" onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {positionRows.length > 0 && (
              <Animated.View entering={FadeIn.delay(340)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.byPosition')} icon={<Target size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['position']} onPress={() => toggleSection('position')} />
                <MatrixTable rows={positionRows} colors={colors} expanded={expandedSections['position']} sessions={completedSessions} filterKey="position" onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {weaponRows.length > 0 && (
              <Animated.View entering={FadeIn.delay(370)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.byWeapon')} icon={<Zap size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['weapon']} onPress={() => toggleSection('weapon')} />
                <MatrixTable rows={weaponRows} colors={colors} expanded={expandedSections['weapon']} sessions={completedSessions} filterKey="weapon" onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {/* 10. Inactive Members Alert */}
            {inactiveMembersInfo.length > 0 && (
              <Animated.View entering={FadeIn.delay(400)} style={styles.section}>
                <InactiveMembersAlert inactiveMembers={inactiveMembersInfo} colors={colors} onMemberPress={openMemberSheet} />
              </Animated.View>
            )}

            {/* 11. Session History link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <Clock size={13} color={colors.textMuted} />
              <Text style={[styles.linkText, { color: colors.text }]}>{t('teamInsights.viewAllSessions')}</Text>
              <ChevronRight size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════ */
          /* MEMBER VIEW */
          /* ═══════════════════════════════════════════════════════════ */
          <>
            {/* 1. Your Performance vs Team */}
            <SectionHeader title={t('teamInsights.sections.yourStats')} icon={<BarChart3 size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['comparison']} onPress={() => toggleSection('comparison')} />
            <MemberComparisonCard
              myStats={myStats}
              teamAverages={teamAverages}
              myComparison={myComparison}
              myPercentile={myPercentile}
              trend={computeAccuracyTrend(performanceChartData)}
              colors={colors}
            />
            {expandedSections['comparison'] && (
              <RecentSessionsDetail sessions={completedSessions} userId={userId} colors={colors} />
            )}

            {/* 1b. Key Takeaways */}
            <Animated.View entering={FadeIn.delay(70)} style={styles.section}>
              <SectionHeader title={t('teamInsights.sections.keyTakeaways')} icon={<Zap size={12} color={colors.textMuted} />} colors={colors} />
              <KeyTakeaways
                myStats={myStats}
                teamAverages={teamAverages}
                missData={memberMissData.find((d) => d.userId === userId)}
                colors={colors}
              />
            </Animated.View>

            {/* 2. Your Activity */}
            {weeklyActivityData.some((d) => d.sessions > 0) && (
              <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.yourActivity')} icon={<BarChart3 size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['m-activity']} onPress={() => toggleSection('m-activity')} />
                <ActivityChart data={weeklyActivityData} title="" height={90} />
                {expandedSections['m-activity'] && (
                  <ActivityDetail data={weeklyActivityData} colors={colors} />
                )}
              </Animated.View>
            )}

            {/* 3. Your Trends */}
            {performanceChartData.length >= 2 && (
              <Animated.View entering={FadeIn.delay(140)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.yourTrends')} icon={<TrendingUp size={12} color={colors.textMuted} />} colors={colors} expanded={expandedSections['m-trends']} onPress={() => toggleSection('m-trends')} />
                <PerformanceChart data={performanceChartData} height={130} />
                {expandedSections['m-trends'] && (
                  <TrendsDetail data={performanceChartData} colors={colors} />
                )}
              </Animated.View>
            )}

            {/* 4. Improvement Focus */}
            {memberMissData.some((d) => d.userId === userId) && (
              <Animated.View entering={FadeIn.delay(170)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.improvementFocus')} icon={<Target size={12} color={colors.textMuted} />} colors={colors} />
                <MemberImprovementCard
                  missData={memberMissData.find((d) => d.userId === userId)!}
                  accuracy={myStats.accuracy}
                  colors={colors}
                />
              </Animated.View>
            )}

            {/* 5. Your Miss Patterns */}
            {memberMissData.some((d) => d.userId === userId) && (
              <Animated.View entering={FadeIn.delay(200)} style={styles.section}>
                <SectionHeader title={t('teamInsights.sections.yourMissPatterns')} icon={<Crosshair size={12} color={colors.textMuted} />} colors={colors} />
                <MemberMissPatterns data={memberMissData} currentUserId={userId} isCommander={false} colors={colors} />
              </Animated.View>
            )}

            {/* History link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <Clock size={13} color={colors.textMuted} />
              <Text style={[styles.linkText, { color: colors.text }]}>{t('teamInsights.viewYourSessions')}</Text>
              <ChevronRight size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* Member detail popup */}
      <MemberDetailSheet
        visible={!!sheetMember}
        data={sheetMember}
        teamAvgAccuracy={teamAverages.accuracy}
        onClose={() => setSheetMember(null)}
      />
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: 'center', alignItems: 'center' },
  scroll: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: Platform.OS === 'ios' ? 8 : 14 },

  // Header
  headerSection: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 14 },
  pageTitle: { fontSize: 22, fontWeight: '700', letterSpacing: -0.4 },
  headerSubtitle: { fontSize: 11, fontWeight: '500' },

  // Context header
  contextHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, marginBottom: 20 },
  contextIcon: { width: 22, height: 22, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  contextTeamName: { fontSize: 13, fontWeight: '600', flex: 1 },
  cmdBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 6, paddingVertical: 3, borderRadius: 4 },
  cmdBadgeText: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  memberCount: { fontSize: 11, fontWeight: '500' },

  // Section
  section: { marginTop: 28 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8 },

  // Card base
  card: { borderRadius: 10, borderWidth: 1 },

  // Comparison card (member)
  compCard: { borderRadius: 12, borderWidth: 1 },
  compHeroRow: { flexDirection: 'row', alignItems: 'center', padding: 16, paddingBottom: 12, gap: 12 },
  compHeroLeft: { alignItems: 'center' },
  compHeroAccuracy: { fontSize: 32, fontWeight: '800', lineHeight: 36 },
  compHeroLabel: { fontSize: 10, fontWeight: '500', marginTop: 2 },
  compHeroCenter: { flex: 1, gap: 4 },
  compTrendBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: 'flex-start' },
  compTrendText: { fontSize: 11, fontWeight: '600' },
  compVsTeam: { fontSize: 11, fontWeight: '500' },
  percentileBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 },
  percentileValue: { fontSize: 11, fontWeight: '700' },
  compColHeaders: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 16, paddingBottom: 8, borderBottomWidth: StyleSheet.hairlineWidth },
  compColLabel: { fontSize: 9, fontWeight: '600', letterSpacing: 0.5 },
  compColHeaderRight: { flexDirection: 'row', gap: 40 },
  compRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  compLabel: { fontSize: 12, fontWeight: '500' },
  compValues: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  compValueCol: { alignItems: 'center', width: 50 },
  compValue: { fontSize: 14, fontWeight: '700' },
  compValueLabel: { fontSize: 9, marginTop: 2 },
  compIndicator: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  compDivider: { width: 1, height: 24 },
  compFooter: { borderTopWidth: StyleSheet.hairlineWidth, padding: 12 },
  compFooterText: { fontSize: 11, textAlign: 'center' },

  expandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  expandText: { fontSize: 11, fontWeight: '500' },

  // Training focus
  focusRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  focusIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  focusContent: { flex: 1 },
  focusLabel: { fontSize: 13, fontWeight: '600' },
  focusDetail: { fontSize: 11, marginTop: 2 },
  focusAcc: { fontSize: 13, fontWeight: '700' },

  // Link card
  linkCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 10, borderWidth: 1, marginTop: 28, gap: 10 },
  linkText: { flex: 1, fontSize: 13, fontWeight: '500' },

  // Empty state
  emptyContainer: { alignItems: 'center', padding: 32, borderRadius: 14, marginTop: 20, gap: 14 },
  emptyIcon: { width: 52, height: 52, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  emptyTitle: { fontSize: 16, fontWeight: '700' },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 18 },
  emptyButton: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginTop: 8 },
  emptyButtonText: { fontSize: 14, fontWeight: '600', color: '#fff' },

  bottomSpacer: { height: 90 },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Team Readiness Summary (ring + stats)
  // ═══════════════════════════════════════════════════════════════════════════
  readinessCard: { borderRadius: 12, borderWidth: 1, overflow: 'hidden' },
  readinessRingSection: { alignItems: 'center', paddingTop: 20, paddingBottom: 16, gap: 12 },
  readinessRingOuter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  readinessRingInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  readinessRingPct: { fontSize: 20, fontWeight: '800' },
  readinessRingUnit: { fontSize: 11, fontWeight: '600', marginTop: 4 },
  readinessMainText: { fontSize: 14, fontWeight: '500' },
  readinessStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  readinessStatItem: { flex: 1, alignItems: 'center', gap: 3 },
  readinessStatValue: { fontSize: 15, fontWeight: '700' },
  readinessStatLabel: { fontSize: 9, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.3 },
  readinessStatDivider: { width: 1, height: 24 },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Member Detail Table (card-per-member)
  // ═══════════════════════════════════════════════════════════════════════════
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 10,
  },
  memberCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberCardRank: { fontSize: 12, fontWeight: '700', width: 18, textAlign: 'center' },
  memberCardAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  memberCardInitials: { fontSize: 11, fontWeight: '700' },
  memberCardCenter: { flex: 1 },
  memberCardName: { fontSize: 14, fontWeight: '600' },
  memberCardSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '400' },
  memberCardRight: { alignItems: 'flex-end', minWidth: 44 },
  memberCardAccuracy: { fontSize: 18, fontWeight: '800' },
  memberCardGrouping: { fontSize: 10, marginTop: 1, fontWeight: '500' },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Member Accuracy Bars (taller, with initials + team avg)
  // ═══════════════════════════════════════════════════════════════════════════
  accuracyBarRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  accBarAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accBarInitials: { fontSize: 9, fontWeight: '700' },
  accuracyBarName: { width: 70, fontSize: 12, fontWeight: '500' },
  accuracyBarTrack: {
    flex: 1,
    height: 14,
    borderRadius: 7,
    overflow: 'hidden',
  },
  accuracyBarFill: { height: '100%', borderRadius: 7 },
  accuracyBarValue: { width: 38, fontSize: 13, fontWeight: '700', textAlign: 'right' },
  accBarAvgRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  accBarAvgText: { fontSize: 11, fontWeight: '500' },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Matrix Table (card-per-row with mini bars)
  // ═══════════════════════════════════════════════════════════════════════════
  matrixCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  matrixCardLeft: { flex: 1, marginRight: 12 },
  matrixCardLabel: { fontSize: 14, fontWeight: '600' },
  matrixCardSubtitle: { fontSize: 11, marginTop: 2, fontWeight: '400' },
  matrixCardRight: { alignItems: 'flex-end', minWidth: 70 },
  matrixCardAccuracy: { fontSize: 16, fontWeight: '800' },
  matrixMiniBarTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(128,128,128,0.08)',
    overflow: 'hidden',
    marginTop: 4,
  },
  matrixMiniBarFill: { height: '100%', borderRadius: 3 },
  matrixCardGrouping: { fontSize: 10, marginTop: 3, fontWeight: '500' },
  matrixExpandedMembers: { paddingHorizontal: 14, paddingBottom: 8, gap: 4 },
  matrixMemberRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 3 },
  matrixMemberName: { flex: 1, fontSize: 11, fontWeight: '400' },
  matrixMemberStat: { width: 40, fontSize: 11, fontWeight: '600', textAlign: 'right' },

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Inactive Members Alert (orange-tinted, vertical)
  // ═══════════════════════════════════════════════════════════════════════════
  inactiveCard: { borderRadius: 12, borderWidth: 1.5, padding: 16 },
  inactiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  inactiveIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  inactiveTitle: { fontSize: 14, fontWeight: '700' },
  inactiveSubtitle: { fontSize: 11, marginTop: 2 },
  inactiveList: { gap: 0 },
  inactiveMember: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  inactiveAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  inactiveInitials: { fontSize: 11, fontWeight: '700' },
  inactiveName: { fontSize: 13, fontWeight: '500', flex: 1 },
  inactiveHint: { fontSize: 11, fontWeight: '400', fontStyle: 'italic', textAlign: 'center', marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.1)' },
});

export default TeamInsights;
