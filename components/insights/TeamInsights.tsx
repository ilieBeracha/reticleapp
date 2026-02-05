/**
 * TeamInsights Component
 *
 * Team insights with role-based views:
 * - Commander: Detailed team analytics, rankings, drill-down to specifics
 * - Member: Personal stats + team context with comparison indicators
 */

import { useTeamInsights, type MyComparison, type TeamMemberStat, type TeamWeakArea } from '@/hooks/insights/useTeamInsights';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import {
    AlertTriangle,
    BarChart3,
    ChevronDown,
    ChevronRight,
    ChevronUp,
    Clock,
    Minus,
    Shield,
    Target,
    TrendingDown,
    TrendingUp,
    Users,
    Zap,
} from 'lucide-react-native';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { ActivityChart } from './components/ActivityChart';
import { PerformanceChart } from './components/PerformanceChart';

// ============================================================================
// SHARED COMPONENTS
// ============================================================================

interface SectionHeaderProps {
  title: string;
  icon?: React.ReactNode;
  colors: ReturnType<typeof useColors>;
  action?: React.ReactNode;
}

function SectionHeader({ title, icon, colors, action }: SectionHeaderProps) {
  return (
    <View style={styles.sectionHeader}>
      {icon}
      <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>{title}</Text>
      <View style={{ flex: 1 }} />
      {action}
    </View>
  );
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
  return (
    <View style={[styles.contextHeader, { borderColor: colors.border }]}>
      <View style={[styles.contextIcon, { backgroundColor: `${colors.textMuted}10` }]}>
        <Users size={12} color={colors.textMuted} />
      </View>
      <Text style={[styles.contextTeamName, { color: colors.text }]} numberOfLines={1}>
        {teamName || 'Team'}
      </Text>
      {isCommander && (
        <View style={[styles.cmdBadge, { backgroundColor: `${colors.textMuted}15` }]}>
          <Shield size={9} color={colors.textMuted} />
          <Text style={[styles.cmdBadgeText, { color: colors.textMuted }]}>CMD</Text>
        </View>
      )}
      <Text style={[styles.memberCount, { color: colors.textMuted }]}>
        {memberCount} members
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
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No team activity yet</Text>
      <Text style={[styles.emptyText, { color: colors.textMuted }]}>
        Start training with your team to see insights.
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
          <Text style={[styles.compValueLabel, { color: colors.textMuted }]}>avg</Text>
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
  colors: ReturnType<typeof useColors>;
}

function MemberComparisonCard({ myStats, teamAverages, myComparison, myPercentile, colors }: MemberComparisonCardProps) {
  return (
    <Animated.View entering={FadeIn.delay(50)} style={[styles.compCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Header with percentile */}
      <View style={styles.compCardHeader}>
        <View>
          <Text style={[styles.compCardTitle, { color: colors.text }]}>Your Performance</Text>
          <Text style={[styles.compCardSubtitle, { color: colors.textMuted }]}>vs Team Average</Text>
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
        <Text style={[styles.compColLabel, { color: colors.textMuted }]}>METRIC</Text>
        <View style={styles.compColHeaderRight}>
          <Text style={[styles.compColLabel, { color: colors.text }]}>YOU</Text>
          <Text style={[styles.compColLabel, { color: colors.textMuted }]}>TEAM</Text>
        </View>
      </View>

      {/* Comparison rows */}
      <ComparisonRow
        label="Sessions"
        myValue={String(myStats.sessions)}
        teamValue={teamAverages.sessionsPerMember.toFixed(1)}
        comparison={myComparison.activity}
        colors={colors}
      />
      <ComparisonRow
        label="Shots"
        myValue={myStats.shots.toLocaleString()}
        teamValue={teamAverages.shotsPerMember.toFixed(0)}
        comparison={myComparison.volume}
        colors={colors}
      />
      <ComparisonRow
        label="Accuracy"
        myValue={myStats.accuracy !== null ? `${myStats.accuracy.toFixed(0)}%` : '—'}
        teamValue={teamAverages.accuracy !== null ? `${teamAverages.accuracy.toFixed(0)}%` : '—'}
        comparison={myComparison.accuracy}
        colors={colors}
      />
      {(myStats.bestGrouping || teamAverages.grouping) && (
        <ComparisonRow
          label="Best Group"
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
          {myStats.vsTeamAvg !== null && (
            <Text style={{ color: myStats.vsTeamAvg >= 0 ? colors.green : colors.textMuted }}>
              {' · '}{myStats.vsTeamAvg >= 0 ? '+' : ''}{myStats.vsTeamAvg.toFixed(1)}% vs avg
            </Text>
          )}
        </Text>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// MEMBER VIEW: TEAM TOTALS (context without rankings)
// ============================================================================

interface TeamContextCardProps {
  totalSessions: number;
  totalShots: number;
  avgAccuracy: number | null;
  activeMembers: number;
  totalMembers: number;
  colors: ReturnType<typeof useColors>;
}

function TeamContextCard({ totalSessions, totalShots, avgAccuracy, activeMembers, totalMembers, colors }: TeamContextCardProps) {
  return (
    <View style={[styles.teamContextCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.teamContextRow}>
        <View style={styles.teamContextStat}>
          <Text style={[styles.teamContextValue, { color: colors.text }]}>{totalSessions}</Text>
          <Text style={[styles.teamContextLabel, { color: colors.textMuted }]}>sessions</Text>
        </View>
        <View style={[styles.teamContextDivider, { backgroundColor: colors.border }]} />
        <View style={styles.teamContextStat}>
          <Text style={[styles.teamContextValue, { color: colors.text }]}>{totalShots.toLocaleString()}</Text>
          <Text style={[styles.teamContextLabel, { color: colors.textMuted }]}>shots</Text>
        </View>
        <View style={[styles.teamContextDivider, { backgroundColor: colors.border }]} />
        <View style={styles.teamContextStat}>
          <Text style={[styles.teamContextValue, { color: colors.text }]}>
            {avgAccuracy !== null ? `${avgAccuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.teamContextLabel, { color: colors.textMuted }]}>accuracy</Text>
        </View>
      </View>
      <View style={[styles.teamContextFooter, { borderTopColor: colors.border }]}>
        <Users size={11} color={colors.textMuted} />
        <Text style={[styles.teamContextFooterText, { color: colors.textMuted }]}>
          {activeMembers} of {totalMembers} members active
        </Text>
      </View>
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: TEAM OVERVIEW CARD
// ============================================================================

interface CommanderOverviewProps {
  sessions: number;
  shots: number;
  avgAccuracy: number | null;
  activeMembers: number;
  totalMembers: number;
  participationRate: number;
  colors: ReturnType<typeof useColors>;
}

function CommanderOverview({ sessions, shots, avgAccuracy, activeMembers, totalMembers, participationRate, colors }: CommanderOverviewProps) {
  return (
    <Animated.View entering={FadeIn.delay(50)} style={[styles.cmdOverview, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Main stats row */}
      <View style={styles.cmdOverviewRow}>
        <View style={styles.cmdOverviewStat}>
          <Text style={[styles.cmdOverviewValue, { color: colors.text }]}>{sessions}</Text>
          <Text style={[styles.cmdOverviewLabel, { color: colors.textMuted }]}>Sessions</Text>
        </View>
        <View style={[styles.cmdOverviewDivider, { backgroundColor: colors.border }]} />
        <View style={styles.cmdOverviewStat}>
          <Text style={[styles.cmdOverviewValue, { color: colors.text }]}>
            {avgAccuracy !== null ? `${avgAccuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.cmdOverviewLabel, { color: colors.textMuted }]}>Accuracy</Text>
        </View>
        <View style={[styles.cmdOverviewDivider, { backgroundColor: colors.border }]} />
        <View style={styles.cmdOverviewStat}>
          <Text style={[styles.cmdOverviewValue, { color: colors.text }]}>{participationRate}%</Text>
          <Text style={[styles.cmdOverviewLabel, { color: colors.textMuted }]}>Participation</Text>
        </View>
      </View>
      {/* Secondary info */}
      <View style={[styles.cmdOverviewSecondary, { borderTopColor: colors.border }]}>
        <View style={styles.cmdOverviewSecondaryItem}>
          <Zap size={12} color={colors.textMuted} />
          <Text style={[styles.cmdOverviewSecondaryText, { color: colors.textMuted }]}>
            {shots.toLocaleString()} shots
          </Text>
        </View>
        <View style={styles.cmdOverviewSecondaryItem}>
          <Users size={12} color={colors.textMuted} />
          <Text style={[styles.cmdOverviewSecondaryText, { color: colors.textMuted }]}>
            {activeMembers}/{totalMembers} active
          </Text>
        </View>
      </View>
    </Animated.View>
  );
}

// ============================================================================
// COMMANDER VIEW: MEMBER RANKINGS (expandable)
// ============================================================================

interface MemberRankingsProps {
  members: TeamMemberStat[];
  currentUserId: string;
  colors: ReturnType<typeof useColors>;
}

function MemberRankings({ members, currentUserId, colors }: MemberRankingsProps) {
  const [expanded, setExpanded] = useState(false);
  if (members.length === 0) return null;

  const displayMembers = expanded ? members : members.slice(0, 5);

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      {/* Table header */}
      <View style={[styles.tableHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.thRank, { color: colors.textMuted }]}>#</Text>
        <Text style={[styles.thName, { color: colors.textMuted }]}>MEMBER</Text>
        <Text style={[styles.thStat, { color: colors.textMuted }]}>SESS</Text>
        <Text style={[styles.thStat, { color: colors.textMuted }]}>ACC</Text>
      </View>
      {/* Rows */}
      {displayMembers.map((m, i) => {
        const isMe = m.userId === currentUserId;
        return (
          <View
            key={m.userId}
            style={[
              styles.tableRow,
              isMe && { backgroundColor: `${colors.textMuted}06` },
              i < displayMembers.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
            ]}
          >
            <Text style={[styles.tdRank, { color: colors.textMuted }]}>{i + 1}</Text>
            <Text style={[styles.tdName, { color: isMe ? colors.text : colors.textMuted }]} numberOfLines={1}>
              {m.userName}{isMe ? ' (you)' : ''}
            </Text>
            <Text style={[styles.tdStat, { color: colors.text }]}>{m.sessions}</Text>
            <Text style={[styles.tdStat, { color: m.accuracy && m.accuracy >= 70 ? colors.green : colors.text }]}>
              {m.accuracy !== null ? `${m.accuracy.toFixed(0)}%` : '—'}
            </Text>
          </View>
        );
      })}
      {/* Expand/collapse */}
      {members.length > 5 && (
        <TouchableOpacity
          style={[styles.expandButton, { borderTopColor: colors.border }]}
          onPress={() => setExpanded(!expanded)}
        >
          <Text style={[styles.expandText, { color: colors.textMuted }]}>
            {expanded ? 'Show less' : `Show all ${members.length}`}
          </Text>
          {expanded ? <ChevronUp size={12} color={colors.textMuted} /> : <ChevronDown size={12} color={colors.textMuted} />}
        </TouchableOpacity>
      )}
    </View>
  );
}

// ============================================================================
// COMMANDER VIEW: QUICK INSIGHTS ROW
// ============================================================================

interface QuickInsightsProps {
  topPerformers: TeamMemberStat[];
  needsAttention: TeamMemberStat[];
  inactiveCount: number;
  colors: ReturnType<typeof useColors>;
}

function QuickInsights({ topPerformers, needsAttention, inactiveCount, colors }: QuickInsightsProps) {
  const hasTop = topPerformers.length > 0;
  const hasIssues = needsAttention.length > 0 || inactiveCount > 0;

  if (!hasTop && !hasIssues) return null;

  return (
    <View style={styles.quickInsightsRow}>
      {hasTop && (
        <View style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quickCardHeader}>
            <TrendingUp size={11} color={colors.green} />
            <Text style={[styles.quickCardTitle, { color: colors.textMuted }]}>TOP</Text>
          </View>
          {topPerformers.slice(0, 2).map((p, i) => (
            <View key={p.userId} style={styles.quickItem}>
              <Text style={[styles.quickName, { color: colors.text }]} numberOfLines={1}>{p.userName}</Text>
              <Text style={[styles.quickValue, { color: colors.green }]}>{p.accuracy?.toFixed(0)}%</Text>
            </View>
          ))}
        </View>
      )}
      {hasIssues && (
        <View style={[styles.quickCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.quickCardHeader}>
            <AlertTriangle size={11} color={colors.orange || '#F59E0B'} />
            <Text style={[styles.quickCardTitle, { color: colors.textMuted }]}>ATTENTION</Text>
          </View>
          {needsAttention.slice(0, 2).map((m) => (
            <View key={m.userId} style={styles.quickItem}>
              <Text style={[styles.quickName, { color: colors.text }]} numberOfLines={1}>{m.userName}</Text>
              <Text style={[styles.quickValue, { color: colors.orange || '#F59E0B' }]}>
                {m.sessions < 3 ? 'Low' : `${m.accuracy?.toFixed(0)}%`}
              </Text>
            </View>
          ))}
          {inactiveCount > 0 && needsAttention.length < 2 && (
            <View style={styles.quickItem}>
              <Text style={[styles.quickName, { color: colors.textMuted }]}>{inactiveCount} inactive</Text>
            </View>
          )}
        </View>
      )}
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
// COMMANDER VIEW: BREAKDOWN GRID
// ============================================================================

interface BreakdownGridProps {
  positionData: { label: string; sessions: number; avgAccuracy: number | null }[];
  distanceData: { label: string; sessions: number; avgAccuracy: number | null }[];
  colors: ReturnType<typeof useColors>;
}

function BreakdownGrid({ positionData, distanceData, colors }: BreakdownGridProps) {
  const allData = [...positionData.slice(0, 2), ...distanceData.slice(0, 2)];
  if (allData.length === 0) return null;

  return (
    <View style={styles.breakdownGrid}>
      {allData.map((item) => (
        <View key={item.label} style={[styles.breakdownItem, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.breakdownLabel, { color: colors.textMuted }]}>{item.label}</Text>
          <Text style={[styles.breakdownValue, { color: colors.text }]}>
            {item.avgAccuracy !== null ? `${item.avgAccuracy.toFixed(0)}%` : '—'}
          </Text>
          <Text style={[styles.breakdownSessions, { color: colors.textMuted }]}>{item.sessions} sess</Text>
        </View>
      ))}
    </View>
  );
}

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
    topPerformers,
    needsAttention,
    inactiveMembers,
    positionBreakdown,
    distanceBreakdown,
    teamWeakAreas,
    weeklyActivityData,
    performanceChartData,
    handleRefresh,
    goToStartSession,
    goToSessionHistory,
  } = useTeamInsights();

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // Format breakdown data
  const positionData = positionBreakdown.map((p) => ({
    label: p.position.charAt(0).toUpperCase() + p.position.slice(1),
    sessions: p.sessions,
    avgAccuracy: p.avgAccuracy,
  }));

  const distanceData = distanceBreakdown.map((d) => ({
    label: d.label,
    sessions: d.sessions,
    avgAccuracy: d.avgAccuracy,
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
            {/* 1. Overview Stats - most important at a glance */}
            <CommanderOverview
              sessions={teamTotals.sessions}
              shots={teamTotals.shots}
              avgAccuracy={teamTotals.avgAccuracy}
              activeMembers={teamTotals.activeMembers}
              totalMembers={teamTotals.totalMembers}
              participationRate={participationRate}
              colors={colors}
            />

            {/* 2. Quick Insights - actionable alerts (top/attention) */}
            <Animated.View entering={FadeIn.delay(60)} style={styles.section}>
              <QuickInsights
                topPerformers={topPerformers}
                needsAttention={needsAttention}
                inactiveCount={inactiveMembers.length}
                colors={colors}
              />
            </Animated.View>

            {/* 3. Rankings - who's performing */}
            {memberRankings.length > 0 && (
              <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
                <SectionHeader title="RANKINGS" icon={<Users size={12} color={colors.textMuted} />} colors={colors} />
                <MemberRankings members={memberRankings} currentUserId={userId} colors={colors} />
              </Animated.View>
            )}

            {/* 4. Training Focus - areas needing work */}
            {teamWeakAreas.length > 0 && (
              <Animated.View entering={FadeIn.delay(140)} style={styles.section}>
                <SectionHeader title="TRAINING FOCUS" icon={<Target size={12} color={colors.textMuted} />} colors={colors} />
                <TrainingFocus weakAreas={teamWeakAreas} colors={colors} />
              </Animated.View>
            )}

            {/* 5. Activity chart - weekly overview */}
            {weeklyActivityData.some((d) => d.sessions > 0) && (
              <Animated.View entering={FadeIn.delay(180)} style={styles.section}>
                <SectionHeader title="ACTIVITY" icon={<BarChart3 size={12} color={colors.textMuted} />} colors={colors} />
                <ActivityChart data={weeklyActivityData} title="" height={90} />
              </Animated.View>
            )}

            {/* 6. Trends - accuracy over time */}
            {performanceChartData.length >= 2 && (
              <Animated.View entering={FadeIn.delay(220)} style={styles.section}>
                <SectionHeader title="TRENDS" icon={<TrendingUp size={12} color={colors.textMuted} />} colors={colors} />
                <PerformanceChart data={performanceChartData} height={130} />
              </Animated.View>
            )}

            {/* 7. Breakdown by category - deep drill-down */}
            {(positionData.length > 0 || distanceData.length > 0) && (
              <Animated.View entering={FadeIn.delay(260)} style={styles.section}>
                <SectionHeader title="BY CATEGORY" colors={colors} />
                <BreakdownGrid positionData={positionData} distanceData={distanceData} colors={colors} />
              </Animated.View>
            )}

            {/* History link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <Clock size={13} color={colors.textMuted} />
              <Text style={[styles.linkText, { color: colors.text }]}>View all sessions</Text>
              <ChevronRight size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        ) : (
          /* ═══════════════════════════════════════════════════════════ */
          /* MEMBER VIEW */
          /* ═══════════════════════════════════════════════════════════ */
          <>
            {/* 1. Your Performance vs Team */}
            <MemberComparisonCard
              myStats={myStats}
              teamAverages={teamAverages}
              myComparison={myComparison}
              myPercentile={myPercentile}
              colors={colors}
            />

            {/* 2. Team Context - where you stand */}
            <Animated.View entering={FadeIn.delay(60)} style={styles.section}>
              <SectionHeader title="TEAM TOTALS" icon={<Users size={12} color={colors.textMuted} />} colors={colors} />
              <TeamContextCard
                totalSessions={teamTotals.sessions}
                totalShots={teamTotals.shots}
                avgAccuracy={teamTotals.avgAccuracy}
                activeMembers={teamTotals.activeMembers}
                totalMembers={teamTotals.totalMembers}
                colors={colors}
              />
            </Animated.View>

            {/* 3. Your Activity */}
            {weeklyActivityData.some((d) => d.sessions > 0) && (
              <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
                <SectionHeader title="YOUR ACTIVITY" icon={<BarChart3 size={12} color={colors.textMuted} />} colors={colors} />
                <ActivityChart data={weeklyActivityData} title="" height={90} />
              </Animated.View>
            )}

            {/* 4. Your Trends */}
            {performanceChartData.length >= 2 && (
              <Animated.View entering={FadeIn.delay(140)} style={styles.section}>
                <SectionHeader title="YOUR TRENDS" icon={<TrendingUp size={12} color={colors.textMuted} />} colors={colors} />
                <PerformanceChart data={performanceChartData} height={130} />
              </Animated.View>
            )}

            {/* History link */}
            <TouchableOpacity
              style={[styles.linkCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={goToSessionHistory}
              activeOpacity={0.7}
            >
              <Clock size={13} color={colors.textMuted} />
              <Text style={[styles.linkText, { color: colors.text }]}>View your sessions</Text>
              <ChevronRight size={13} color={colors.textMuted} />
            </TouchableOpacity>
          </>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
  compCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', padding: 16, paddingBottom: 12 },
  compCardTitle: { fontSize: 15, fontWeight: '700' },
  compCardSubtitle: { fontSize: 11, marginTop: 2 },
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

  // Team context card (member)
  teamContextCard: { borderRadius: 10, borderWidth: 1 },
  teamContextRow: { flexDirection: 'row', alignItems: 'center', padding: 14 },
  teamContextStat: { flex: 1, alignItems: 'center' },
  teamContextValue: { fontSize: 18, fontWeight: '700' },
  teamContextLabel: { fontSize: 10, marginTop: 2 },
  teamContextDivider: { width: 1, height: 28 },
  teamContextFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  teamContextFooterText: { fontSize: 11 },

  // Commander overview
  cmdOverview: { borderRadius: 12, borderWidth: 1 },
  cmdOverviewRow: { flexDirection: 'row', alignItems: 'center', padding: 16 },
  cmdOverviewStat: { flex: 1, alignItems: 'center' },
  cmdOverviewValue: { fontSize: 24, fontWeight: '700' },
  cmdOverviewLabel: { fontSize: 10, marginTop: 2 },
  cmdOverviewDivider: { width: 1, height: 36 },
  cmdOverviewSecondary: { flexDirection: 'row', justifyContent: 'center', gap: 24, borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  cmdOverviewSecondaryItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  cmdOverviewSecondaryText: { fontSize: 11 },

  // Table (rankings)
  tableHeader: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  thRank: { width: 24, fontSize: 9, fontWeight: '600' },
  thName: { flex: 1, fontSize: 9, fontWeight: '600' },
  thStat: { width: 44, fontSize: 9, fontWeight: '600', textAlign: 'right' },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 14 },
  tdRank: { width: 24, fontSize: 12, fontWeight: '600' },
  tdName: { flex: 1, fontSize: 12, fontWeight: '500' },
  tdStat: { width: 44, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  expandButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  expandText: { fontSize: 11, fontWeight: '500' },

  // Quick insights
  quickInsightsRow: { flexDirection: 'row', gap: 12 },
  quickCard: { flex: 1, borderRadius: 10, borderWidth: 1, padding: 12 },
  quickCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 10 },
  quickCardTitle: { fontSize: 9, fontWeight: '700', letterSpacing: 0.6 },
  quickItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  quickName: { flex: 1, fontSize: 12, fontWeight: '500' },
  quickValue: { fontSize: 12, fontWeight: '700' },

  // Training focus
  focusRow: { flexDirection: 'row', alignItems: 'center', padding: 12, gap: 10 },
  focusIcon: { width: 26, height: 26, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  focusContent: { flex: 1 },
  focusLabel: { fontSize: 13, fontWeight: '600' },
  focusDetail: { fontSize: 11, marginTop: 2 },
  focusAcc: { fontSize: 13, fontWeight: '700' },

  // Breakdown grid
  breakdownGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  breakdownItem: { width: '47%', borderWidth: 1, borderRadius: 8, padding: 12, alignItems: 'center' },
  breakdownLabel: { fontSize: 10, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  breakdownValue: { fontSize: 20, fontWeight: '700', marginVertical: 4 },
  breakdownSessions: { fontSize: 10 },

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
});

export default TeamInsights;
