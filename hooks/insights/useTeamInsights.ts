/**
 * useTeamInsights Hook
 *
 * Provides all data and handlers for team insights view.
 * Includes commander-specific analytics and member-specific collaborative view.
 */

import { DEFAULT_FILTERS } from '@/constants/insights';
import { useAuth } from '@/contexts/AuthContext';
import { applyFilters } from '@/services/insights/dashboardEngine';
import { featuresToSessions } from '@/services/insights/insightsAdapter';
import { getDashboardFeatures, getTeamMissData } from '@/services/session/queries';
import { useTeamStore } from '@/stores/teamStore';
import type { InsightsFilters } from '@/types/insights';
import type { MissPoint, SessionWithDetails } from '@/types/session';
import { isGroupingSessionWithFallback } from '@/utils/drillGoal';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface TeamMemberStat {
  userId: string;
  userName: string;
  sessions: number;
  shots: number;
  hits: number;
  accuracy: number | null;
  bestDispersion: number | null;
  lastActive: string | null;
}

export interface PositionBreakdown {
  position: string;
  sessions: number;
  totalShots: number;
  avgAccuracy: number | null;
  avgGrouping: number | null;
  memberCount: number;
}

export interface DistanceBreakdown {
  range: string;
  label: string;
  sessions: number;
  totalShots: number;
  avgAccuracy: number | null;
  avgGrouping: number | null;
  memberCount: number;
}

export interface WeaponCategoryBreakdown {
  category: string;
  label: string;
  sessions: number;
  totalShots: number;
  avgAccuracy: number | null;
  avgGrouping: number | null;
  memberCount: number;
}

export interface TeamReadiness {
  trainedThisWeek: number;
  totalMembers: number;
  participationRate: number;
  avgSessionsPerMember: number;
  daysSinceLeastActive: number | null;
  totalSessions: number;
  totalShots: number;
}

export interface InactiveMemberInfo {
  userId: string;
  userName: string;
  avatarUrl: string | null;
}

export interface TeamWeakArea {
  type: 'position' | 'distance';
  label: string;
  detail: string;
  affectedMembers: number;
  avgAccuracy: number;
}

export interface MemberMissData {
  userId: string;
  userName: string;
  missPoints: MissPoint[];
  totalMisses: number;
}

export type ComparisonLevel = 'above' | 'below' | 'average';

export interface MyComparison {
  accuracy: ComparisonLevel | null;
  activity: ComparisonLevel;
  volume: ComparisonLevel;
}

// ============================================================================
// HELPERS
// ============================================================================

/** Sum shots/hits from engagement-only sessions (excludes grouping drills). */
function sumEngagement(sessions: SessionWithDetails[]): { shots: number; hits: number } {
  let shots = 0;
  let hits = 0;
  for (const s of sessions) {
    if (!isGroupingSessionWithFallback(s)) {
      shots += s.stats?.shots_fired || 0;
      hits += s.stats?.hits_total || 0;
    }
  }
  return { shots, hits };
}

// ============================================================================
// HOOK
// ============================================================================

export function useTeamInsights() {
  const router = useRouter();
  const { user } = useAuth();

  // Team state
  const activeTeamId = useTeamStore((s) => s.activeTeamId);
  const activeTeam = useTeamStore((s) => s.activeTeam);
  const members = useTeamStore((s) => s.members);

  // Get user's role
  const myRole = useTeamStore((state) => {
    const team = state.teams.find((t) => t.id === state.activeTeamId);
    return team?.my_role || null;
  });
  const isCommander = myRole === 'owner' || myRole === 'commander';

  // Data state
  const [sessions, setSessions] = useState<SessionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter state
  const [filters, setFilters] = useState<InsightsFilters>(DEFAULT_FILTERS);

  // Track initial load
  const initialLoadDone = useRef(false);

  // Build a map of user IDs to display names from team members
  const memberNameMap = useMemo(() => {
    const map = new Map<string, string>();
    members?.forEach((m) => {
      const name = m.profile?.full_name || m.profile?.email || null;
      if (name) map.set(m.user_id, name);
    });
    return map;
  }, [members]);

  // Load team sessions
  const loadSessions = useCallback(async () => {
    if (!user?.id || !activeTeamId) {
      setLoading(false);
      return;
    }
    try {
      const features = await getDashboardFeatures({
        userId: user.id,
        days: 365,
        limit: 500,
        teamId: activeTeamId,
      });
      const converted = featuresToSessions(features);

      // Enrich with member names from team store
      converted.forEach((s) => {
        if (!s.user_full_name) {
          s.user_full_name = memberNameMap.get(s.user_id) || null;
        }
      });

      setSessions(converted);
    } catch (e) {
      console.error('Failed to load team sessions:', e);
    } finally {
      setLoading(false);
    }
  }, [user?.id, activeTeamId, memberNameMap]);

  useEffect(() => {
    loadSessions();
    initialLoadDone.current = true;
  }, [loadSessions]);

  // Reload when team changes
  useEffect(() => {
    if (initialLoadDone.current) {
      setLoading(true);
      loadSessions();
    }
  }, [activeTeamId, loadSessions]);

  // Refresh handler
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadSessions();
    setRefreshing(false);
  }, [loadSessions]);

  // Apply filters
  const filteredSessions = useMemo(() => {
    return applyFilters(sessions, filters);
  }, [sessions, filters]);

  const completedSessions = useMemo(() => {
    return filteredSessions.filter((s) => s.status === 'completed');
  }, [filteredSessions]);

  // ============================================================================
  // TEAM-WIDE STATS
  // ============================================================================

  const teamTotals = useMemo(() => {
    const totalSessions = completedSessions.length;
    const totalShots = completedSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
    const uniqueMembers = new Set(completedSessions.map((s) => s.user_id)).size;

    const engagement = sumEngagement(completedSessions);
    const avgAccuracy = engagement.shots > 0 ? (engagement.hits / engagement.shots) * 100 : null;

    return {
      sessions: totalSessions,
      shots: totalShots,
      hits: engagement.hits,
      avgAccuracy,
      activeMembers: uniqueMembers,
      totalMembers: members?.length || 0,
    };
  }, [completedSessions, members]);

  // Participation rate
  const participationRate = useMemo(() => {
    if (!teamTotals.totalMembers) return 0;
    return Math.round((teamTotals.activeMembers / teamTotals.totalMembers) * 100);
  }, [teamTotals]);

  // ============================================================================
  // MY STATS (within team context) + COMPARISON METRICS
  // ============================================================================

  const myStats = useMemo(() => {
    const mySessions = completedSessions.filter((s) => s.user_id === user?.id);
    const myShots = mySessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);

    const myEngagement = sumEngagement(mySessions);
    const myAccuracy = myEngagement.shots > 0 ? (myEngagement.hits / myEngagement.shots) * 100 : null;

    // Best dispersion
    const dispersions = mySessions
      .map((s) => s.stats?.best_dispersion_cm)
      .filter((d): d is number => d !== null && d !== undefined);
    const myBestGrouping = dispersions.length > 0 ? Math.min(...dispersions) : null;

    const contribution = teamTotals.sessions > 0
      ? Math.round((mySessions.length / teamTotals.sessions) * 100)
      : 0;

    const vsTeamAvg = myAccuracy !== null && teamTotals.avgAccuracy !== null
      ? myAccuracy - teamTotals.avgAccuracy
      : null;

    // Last session date
    const lastSession = mySessions.length > 0
      ? mySessions.sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())[0].started_at
      : null;

    return {
      sessions: mySessions.length,
      shots: myShots,
      hits: myEngagement.hits,
      accuracy: myAccuracy,
      bestGrouping: myBestGrouping,
      contribution,
      vsTeamAvg,
      lastSession,
    };
  }, [completedSessions, user?.id, teamTotals]);

  // Comparison indicators (above/below/at team average for different metrics)
  const myComparison = useMemo((): MyComparison => {
    const avgShotsPerMember = teamTotals.activeMembers > 0
      ? teamTotals.shots / teamTotals.activeMembers
      : 0;
    const avgSessionsPerMember = teamTotals.activeMembers > 0
      ? teamTotals.sessions / teamTotals.activeMembers
      : 0;

    const accuracyComparison: ComparisonLevel | null = myStats.vsTeamAvg !== null
      ? myStats.vsTeamAvg > 2 ? 'above' : myStats.vsTeamAvg < -2 ? 'below' : 'average'
      : null;

    const activityComparison: ComparisonLevel = myStats.sessions > avgSessionsPerMember * 1.1
      ? 'above'
      : myStats.sessions < avgSessionsPerMember * 0.9
        ? 'below'
        : 'average';

    const volumeComparison: ComparisonLevel = myStats.shots > avgShotsPerMember * 1.1
      ? 'above'
      : myStats.shots < avgShotsPerMember * 0.9
        ? 'below'
        : 'average';

    return {
      accuracy: accuracyComparison,
      activity: activityComparison,
      volume: volumeComparison,
    };
  }, [myStats, teamTotals]);

  // ============================================================================
  // TEAM AVERAGES (for comparison display)
  // ============================================================================

  const teamAverages = useMemo(() => {
    const avgSessionsPerMember = teamTotals.activeMembers > 0
      ? teamTotals.sessions / teamTotals.activeMembers
      : 0;
    const avgShotsPerMember = teamTotals.activeMembers > 0
      ? teamTotals.shots / teamTotals.activeMembers
      : 0;

    // Calculate average best grouping across team
    const allDispersions = completedSessions
      .map((s) => s.stats?.best_dispersion_cm)
      .filter((d): d is number => d !== null && d !== undefined);
    const avgGrouping = allDispersions.length > 0
      ? allDispersions.reduce((a, b) => a + b, 0) / allDispersions.length
      : null;

    return {
      sessionsPerMember: avgSessionsPerMember,
      shotsPerMember: avgShotsPerMember,
      accuracy: teamTotals.avgAccuracy,
      grouping: avgGrouping,
    };
  }, [teamTotals, completedSessions]);

  // ============================================================================
  // MEMBER RANKINGS (commander only)
  // ============================================================================

  const memberStats = useMemo((): TeamMemberStat[] => {
    // Track both total shots and engagement-only shots/hits for accuracy
    const statsMap = new Map<string, TeamMemberStat & { engagementShots: number; engagementHits: number }>();

    completedSessions.forEach((s) => {
      const isGrouping = isGroupingSessionWithFallback(s);
      const existing = statsMap.get(s.user_id);

      if (existing) {
        existing.sessions += 1;
        existing.shots += s.stats?.shots_fired || 0;
        if (!isGrouping) {
          existing.engagementShots += s.stats?.shots_fired || 0;
          existing.engagementHits += s.stats?.hits_total || 0;
        }
        if (s.stats?.best_dispersion_cm && (!existing.bestDispersion || s.stats.best_dispersion_cm < existing.bestDispersion)) {
          existing.bestDispersion = s.stats.best_dispersion_cm;
        }
        if (!existing.lastActive || new Date(s.started_at) > new Date(existing.lastActive)) {
          existing.lastActive = s.started_at;
        }
      } else {
        statsMap.set(s.user_id, {
          userId: s.user_id,
          userName: s.user_full_name || 'Unknown',
          sessions: 1,
          shots: s.stats?.shots_fired || 0,
          hits: isGrouping ? 0 : (s.stats?.hits_total || 0),
          engagementShots: isGrouping ? 0 : (s.stats?.shots_fired || 0),
          engagementHits: isGrouping ? 0 : (s.stats?.hits_total || 0),
          accuracy: null,
          bestDispersion: s.stats?.best_dispersion_cm || null,
          lastActive: s.started_at,
        });
      }
    });

    // Calculate accuracy from engagement sessions only
    return Array.from(statsMap.values()).map((m) => ({
      userId: m.userId,
      userName: m.userName,
      sessions: m.sessions,
      shots: m.shots,
      hits: m.engagementHits,
      accuracy: m.engagementShots > 0 ? (m.engagementHits / m.engagementShots) * 100 : null,
      bestDispersion: m.bestDispersion,
      lastActive: m.lastActive,
    }));
  }, [completedSessions]);

  // Member's percentile ranking (where they stand vs team - without showing explicit rank)
  const myPercentile = useMemo(() => {
    if (!user?.id || !memberStats || memberStats.length <= 1) return null;

    const myMemberStat = memberStats.find((m) => m.userId === user.id);
    if (!myMemberStat || myMemberStat.accuracy === null) return null;

    // Count how many members have lower accuracy
    const membersBelow = memberStats.filter(
      (m) => m.accuracy !== null && m.accuracy < (myMemberStat.accuracy ?? 0)
    ).length;

    // Percentile = (members below / total members) * 100
    return Math.round((membersBelow / memberStats.length) * 100);
  }, [memberStats, user?.id]);

  // Sorted rankings
  const memberRankings = useMemo(() => {
    return [...memberStats].sort((a, b) => {
      // Sort by sessions first, then accuracy
      if (b.sessions !== a.sessions) return b.sessions - a.sessions;
      return (b.accuracy ?? 0) - (a.accuracy ?? 0);
    });
  }, [memberStats]);

  // Inactive members (in team but no sessions)
  const inactiveMembers = useMemo(() => {
    if (!members) return [];
    const activeUserIds = new Set(memberStats.map((m) => m.userId));
    return members.filter((m) => !activeUserIds.has(m.user_id));
  }, [members, memberStats]);

  // ============================================================================
  // POSITION & DISTANCE BREAKDOWN (commander analytics)
  // ============================================================================

  const positionBreakdown = useMemo((): PositionBreakdown[] => {
    const positions = ['standing', 'kneeling', 'prone', 'sitting'];
    return positions.map((pos) => {
      const posSessions = completedSessions.filter(
        (s) => s.drill_config?.position === pos
      );
      const totalShots = posSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
      const uniqueMembers = new Set(posSessions.map((s) => s.user_id)).size;
      const groupings = posSessions
        .map((s) => s.stats?.best_dispersion_cm)
        .filter((d): d is number => d != null && d > 0);
      const avgGrouping = groupings.length > 0
        ? groupings.reduce((a, b) => a + b, 0) / groupings.length
        : null;

      const posEngagement = sumEngagement(posSessions);

      return {
        position: pos,
        sessions: posSessions.length,
        totalShots,
        avgAccuracy: posEngagement.shots > 0 ? (posEngagement.hits / posEngagement.shots) * 100 : null,
        avgGrouping,
        memberCount: uniqueMembers,
      };
    }).filter((p) => p.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);
  }, [completedSessions]);

  const distanceBreakdown = useMemo((): DistanceBreakdown[] => {
    const ranges = [
      { range: 'close', label: '0-25m', min: 0, max: 25 },
      { range: 'medium', label: '25-100m', min: 25, max: 100 },
      { range: 'long', label: '100-300m', min: 100, max: 300 },
      { range: 'precision', label: '300m+', min: 300, max: Infinity },
    ];

    return ranges.map(({ range, label, min, max }) => {
      const rangeSessions = completedSessions.filter((s) => {
        const dist = s.drill_config?.distance_m ?? s.stats?.avg_distance_m;
        return dist != null && dist >= min && dist < max;
      });
      const totalShots = rangeSessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0);
      const uniqueMembers = new Set(rangeSessions.map((s) => s.user_id)).size;
      const groupings = rangeSessions
        .map((s) => s.stats?.best_dispersion_cm)
        .filter((d): d is number => d != null && d > 0);
      const avgGrouping = groupings.length > 0
        ? groupings.reduce((a, b) => a + b, 0) / groupings.length
        : null;

      const rangeEngagement = sumEngagement(rangeSessions);

      return {
        range,
        label,
        sessions: rangeSessions.length,
        totalShots,
        avgAccuracy: rangeEngagement.shots > 0 ? (rangeEngagement.hits / rangeEngagement.shots) * 100 : null,
        avgGrouping,
        memberCount: uniqueMembers,
      };
    }).filter((d) => d.sessions > 0)
      .sort((a, b) => b.sessions - a.sessions);
  }, [completedSessions]);

  // Team weak areas
  const teamWeakAreas = useMemo((): TeamWeakArea[] => {
    const weakAreas: TeamWeakArea[] = [];

    // Check positions with low accuracy
    positionBreakdown.forEach((p) => {
      if (p.avgAccuracy !== null && p.avgAccuracy < 60 && p.memberCount >= 2) {
        weakAreas.push({
          type: 'position',
          label: p.position.charAt(0).toUpperCase() + p.position.slice(1),
          detail: `${p.memberCount} members avg ${p.avgAccuracy.toFixed(0)}%`,
          affectedMembers: p.memberCount,
          avgAccuracy: p.avgAccuracy,
        });
      }
    });

    // Check distances with low accuracy
    distanceBreakdown.forEach((d) => {
      if (d.avgAccuracy !== null && d.avgAccuracy < 60 && d.sessions >= 5) {
        weakAreas.push({
          type: 'distance',
          label: d.label,
          detail: `${d.sessions} sessions avg ${d.avgAccuracy.toFixed(0)}%`,
          affectedMembers: 0,
          avgAccuracy: d.avgAccuracy,
        });
      }
    });

    return weakAreas.sort((a, b) => a.avgAccuracy - b.avgAccuracy);
  }, [positionBreakdown, distanceBreakdown]);

  // ============================================================================
  // WEAPON CATEGORY BREAKDOWN (NEW)
  // ============================================================================

  const weaponCategoryBreakdown = useMemo((): WeaponCategoryBreakdown[] => {
    const categoryLabels: Record<string, string> = {
      rifle: 'Rifle',
      carbine: 'Carbine',
      precision_rifle: 'Precision Rifle',
      sniper_rifle: 'Sniper Rifle',
      shotgun: 'Shotgun',
      pistol: 'Pistol',
      smg: 'SMG',
      lmg: 'LMG',
      dmr: 'DMR',
    };

    const catMap = new Map<string, { shots: number; engagementShots: number; engagementHits: number; sessions: number; users: Set<string>; groupings: number[] }>();

    completedSessions.forEach((s) => {
      const cat = s.weapon_category || 'unknown';
      const existing = catMap.get(cat) || { shots: 0, engagementShots: 0, engagementHits: 0, sessions: 0, users: new Set<string>(), groupings: [] };
      const isGrouping = isGroupingSessionWithFallback(s);

      existing.sessions += 1;
      existing.shots += s.stats?.shots_fired || 0;
      if (!isGrouping) {
        existing.engagementShots += s.stats?.shots_fired || 0;
        existing.engagementHits += s.stats?.hits_total || 0;
      }
      existing.users.add(s.user_id);
      if (s.stats?.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
        existing.groupings.push(s.stats.best_dispersion_cm);
      }
      catMap.set(cat, existing);
    });

    return Array.from(catMap.entries())
      .map(([cat, data]) => ({
        category: cat,
        label: categoryLabels[cat] || cat.charAt(0).toUpperCase() + cat.slice(1),
        sessions: data.sessions,
        totalShots: data.shots,
        avgAccuracy: data.engagementShots > 0 ? (data.engagementHits / data.engagementShots) * 100 : null,
        avgGrouping: data.groupings.length > 0
          ? data.groupings.reduce((a, b) => a + b, 0) / data.groupings.length
          : null,
        memberCount: data.users.size,
      }))
      .filter((c) => c.category !== 'unknown')
      .sort((a, b) => b.sessions - a.sessions);
  }, [completedSessions]);

  // ============================================================================
  // TEAM READINESS (NEW)
  // ============================================================================

  const teamReadiness = useMemo((): TeamReadiness => {
    const totalMembers = members?.length || 0;
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    // Members who trained this week
    const trainedThisWeekSet = new Set<string>();
    completedSessions.forEach((s) => {
      if (new Date(s.started_at) >= weekAgo) {
        trainedThisWeekSet.add(s.user_id);
      }
    });
    const trainedThisWeek = trainedThisWeekSet.size;

    // Avg sessions per member (all time from loaded data)
    const avgSessionsPerMember = totalMembers > 0
      ? Math.round((completedSessions.length / totalMembers) * 10) / 10
      : 0;

    // Days since least-active member last trained
    let daysSinceLeastActive: number | null = null;
    if (memberStats.length > 0) {
      const lastActiveDates = memberStats
        .filter((m) => m.lastActive)
        .map((m) => new Date(m.lastActive!).getTime());
      if (lastActiveDates.length > 0) {
        const oldestActive = Math.min(...lastActiveDates);
        daysSinceLeastActive = Math.floor((now.getTime() - oldestActive) / (1000 * 60 * 60 * 24));
      }
    }

    return {
      trainedThisWeek,
      totalMembers,
      participationRate: totalMembers > 0 ? Math.round((trainedThisWeek / totalMembers) * 100) : 0,
      avgSessionsPerMember,
      daysSinceLeastActive,
      totalSessions: completedSessions.length,
      totalShots: teamTotals.shots,
    };
  }, [completedSessions, members, memberStats, teamTotals]);

  // ============================================================================
  // MEMBER ACCURACY RANKING (sorted by accuracy for visual comparison)
  // ============================================================================

  const memberAccuracyRanking = useMemo(() => {
    return [...memberStats]
      .filter((m) => m.accuracy !== null && m.shots > 0)
      .sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  }, [memberStats]);

  // ============================================================================
  // ENRICHED INACTIVE MEMBERS
  // ============================================================================

  const inactiveMembersInfo = useMemo((): InactiveMemberInfo[] => {
    if (!members) return [];
    const activeUserIds = new Set(memberStats.map((m) => m.userId));
    return members
      .filter((m) => !activeUserIds.has(m.user_id))
      .map((m) => ({
        userId: m.user_id,
        userName: m.profile?.full_name || m.profile?.email || 'Unknown',
        avatarUrl: m.profile?.avatar_url || null,
      }));
  }, [members, memberStats]);

  // ============================================================================
  // MEMBER MISS DATA (aggregated from tactical_target_results)
  // ============================================================================

  const [missDataRaw, setMissDataRaw] = useState<Awaited<ReturnType<typeof getTeamMissData>>>([]);

  useEffect(() => {
    if (completedSessions.length === 0) {
      setMissDataRaw([]);
      return;
    }
    const sessionIds = completedSessions.map((s) => s.id);
    getTeamMissData(sessionIds).then(setMissDataRaw).catch(() => setMissDataRaw([]));
  }, [completedSessions]);

  const memberMissData = useMemo((): MemberMissData[] => {
    if (missDataRaw.length === 0) return [];

    // Build session_id → user_id + userName map from completedSessions
    const sessionUserMap = new Map<string, { userId: string; userName: string }>();
    completedSessions.forEach((s) => {
      sessionUserMap.set(s.id, {
        userId: s.user_id,
        userName: s.user_full_name || memberNameMap.get(s.user_id) || 'Unknown',
      });
    });

    // Aggregate miss points per user
    const userMissMap = new Map<string, { userName: string; points: MissPoint[] }>();
    missDataRaw.forEach((row) => {
      const userInfo = sessionUserMap.get(row.sessionId);
      if (!userInfo) return;
      const existing = userMissMap.get(userInfo.userId);
      if (existing) {
        existing.points.push(...row.missPoints);
      } else {
        userMissMap.set(userInfo.userId, {
          userName: userInfo.userName,
          points: [...row.missPoints],
        });
      }
    });

    return Array.from(userMissMap.entries())
      .map(([userId, data]) => ({
        userId,
        userName: data.userName,
        missPoints: data.points,
        totalMisses: data.points.length,
      }))
      .sort((a, b) => b.totalMisses - a.totalMisses);
  }, [missDataRaw, completedSessions, memberNameMap]);

  // ============================================================================
  // CHART DATA
  // ============================================================================

  // Weekly activity data for bar chart
  const weeklyActivityData = useMemo(() => {
    const now = new Date();
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    const result: { label: string; sessions: number; rounds: number }[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const daySessions = completedSessions.filter((s) => {
        const sessionDate = new Date(s.started_at);
        return sessionDate >= dayStart && sessionDate <= dayEnd;
      });

      result.push({
        label: days[dayStart.getDay()],
        sessions: daySessions.length,
        rounds: daySessions.reduce((sum, s) => sum + (s.stats?.shots_fired || 0), 0),
      });
    }

    return result;
  }, [completedSessions]);

  // Performance chart data (team accuracy over time)
  const performanceChartData = useMemo(() => {
    // Group sessions by date and calculate daily team accuracy (engagement only)
    const dailyMap = new Map<string, { engagementShots: number; engagementHits: number; dispersion: number[] }>();

    completedSessions
      .sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())
      .forEach((s) => {
        const dateKey = new Date(s.started_at).toISOString().split('T')[0];
        const existing = dailyMap.get(dateKey) || { engagementShots: 0, engagementHits: 0, dispersion: [] };

        if (!isGroupingSessionWithFallback(s)) {
          existing.engagementShots += s.stats?.shots_fired || 0;
          existing.engagementHits += s.stats?.hits_total || 0;
        }
        if (s.stats?.best_dispersion_cm) {
          existing.dispersion.push(s.stats.best_dispersion_cm);
        }
        dailyMap.set(dateKey, existing);
      });

    // Convert to chart data points (last 15 days with data)
    return Array.from(dailyMap.entries())
      .map(([date, data]) => ({
        date,
        accuracy: data.engagementShots > 0 ? (data.engagementHits / data.engagementShots) * 100 : undefined,
        grouping: data.dispersion.length > 0
          ? data.dispersion.reduce((a, b) => a + b, 0) / data.dispersion.length
          : undefined,
      }))
      .slice(-15);
  }, [completedSessions]);

  // ============================================================================
  // NAVIGATION
  // ============================================================================

  const goToSessionHistory = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  }, [router]);

  const goToStartSession = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push('/(protected)/(tabs)');
  }, [router]);

  return {
    // State
    loading,
    refreshing,
    sessions,
    filters,
    setFilters,
    hasData: sessions.length > 0,
    userId: user?.id ?? '',

    // Team info
    activeTeam,
    members,
    myRole,
    isCommander,

    // Team totals & averages
    teamTotals,
    teamAverages,
    participationRate,

    // My stats (member view)
    myStats,
    myPercentile,
    myComparison,

    // Member rankings (commander view)
    memberStats,
    memberRankings,
    inactiveMembers,

    // Breakdown analytics (commander view)
    positionBreakdown,
    distanceBreakdown,
    weaponCategoryBreakdown,
    teamWeakAreas,

    // Readiness & accuracy (commander view)
    teamReadiness,
    memberAccuracyRanking,
    inactiveMembersInfo,

    // Miss data (per member)
    memberMissData,

    // Raw data for expanded detail views
    completedSessions,

    // Chart data
    weeklyActivityData,
    performanceChartData,

    // Handlers
    handleRefresh,
    goToSessionHistory,
    goToStartSession,
  };
}
