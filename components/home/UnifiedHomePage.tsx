import { useAuth } from '@/contexts/AuthContext';
import { useModals } from '@/contexts/ModalContext';
import { useColors } from '@/hooks/ui/useColors';
import { getMyActivePersonalSession, getSessionsWithStats, type SessionWithDetails } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { useTeamStore } from '@/store/teamStore';
import { useTrainingStore } from '@/store/trainingStore';
import { BUTTON_GRADIENT } from '@/theme/colors';
import type { TrainingWithDetails } from '@/types/workspace';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import {
  Calendar,
  ChevronRight,
  Clock,
  Crosshair,
  Target,
  Users,
  Zap
} from 'lucide-react-native';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { PieChart } from 'react-native-gifted-charts';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { BaseAvatar } from '../BaseAvatar';
import { ActivityTimeline } from './widgets';

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const CARD_RADIUS = 16;
const SMALL_RADIUS = 12;

// ═══════════════════════════════════════════════════════════════════════════
// SECTION HEADER
// ═══════════════════════════════════════════════════════════════════════════

function SectionHeader({ title, action, actionText, colors }: { title: string; action?: () => void; actionText?: string; colors: ReturnType<typeof useColors> }) {
  return (
    <View style={[styles.sectionHeader, { marginBottom: 12, marginTop: 4 }]}>
      <Text style={[styles.sectionTitle, { color: colors.text, fontSize: 14 }]}>{title}</Text>
      {action && actionText && (
        <TouchableOpacity onPress={action}>
          <Text style={[styles.seeAllText, { color: colors.indigo, fontSize: 12 }]}>{actionText}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// HERO SUMMARY CARD - Unified personal overview
// ═══════════════════════════════════════════════════════════════════════════

function HeroSummaryCard({
  colors,
  upcomingCount,
  allSessions,
  activeSession,
  hasTeams,
  teamCount,
  onPress,
}: {
  colors: ReturnType<typeof useColors>;
  upcomingCount: number;
  allSessions: SessionWithDetails[];
  activeSession: SessionWithDetails | null;
  hasTeams: boolean;
  teamCount: number;
  onPress: () => void;
}) {
  const totalSessions = allSessions.length;
  const today = new Date();
  const dateStr = format(today, 'd MMMM');

  // Dynamic message based on user's activity
  const getMessage = () => {
    if (activeSession) {
      return {
        label: 'Session in Progress',
        title: (
          <Text style={styles.heroTitle}>
            Continue your <Text style={styles.heroHighlight}>active session</Text>
          </Text>
        ),
      };
    }

    if (hasTeams && upcomingCount > 0) {
      return {
        label: 'Training Schedule',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{upcomingCount}</Text> training{upcomingCount !== 1 ? 's' : ''}{' '}
            across <Text style={styles.heroHighlight}>{teamCount}</Text> team{teamCount !== 1 ? 's' : ''}
          </Text>
        ),
      };
    }

    if (hasTeams) {
      return {
        label: 'Your Teams',
        title: (
          <Text style={styles.heroTitle}>
            Member of <Text style={styles.heroHighlight}>{teamCount} team{teamCount !== 1 ? 's' : ''}</Text>
          </Text>
        ),
      };
    }

    if (totalSessions > 0) {
      return {
        label: 'Solo Training',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{totalSessions}</Text> session{totalSessions !== 1 ? 's' : ''} logged
          </Text>
        ),
      };
    }

    return {
      label: 'Welcome',
      title: (
        <Text style={styles.heroTitle}>
          Ready to <Text style={styles.heroHighlight}>start training</Text>?
        </Text>
      ),
    };
  };

  const { label, title } = getMessage();
  const actionText = activeSession
    ? 'Resume Session'
    : hasTeams
      ? 'View Schedule'
      : 'Start Practice';

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={[...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroDateRow}>
              <Calendar size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDate}>{dateStr}</Text>
            </View>
            {activeSession ? (
              <View style={styles.heroBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.heroBadgeText}>Active</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>{label}</Text>
            {title}
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>{actionText}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AGGREGATED STATS CARD - Shows all sessions (personal + team)
// ═══════════════════════════════════════════════════════════════════════════

function AggregatedStatsCard({
  colors,
  allSessions,
}: {
  colors: ReturnType<typeof useColors>;
  allSessions: SessionWithDetails[];
  trainingStats?: any; // Kept for compatibility but unused
}) {
  const { shots, hits, solo, team, accuracy } = useMemo(() => {
    let shots = 0;
    let hits = 0;
    let solo = 0;
    let team = 0;

    allSessions.forEach((s) => {
      // Only count completed sessions for stats to avoid skewing with empty active ones
      if (s.status === 'completed') {
        if (s.stats) {
          shots += s.stats.shots_fired || 0;
          hits += s.stats.hits_total || 0;
        }
      }
      
      if (s.team_id) team++;
      else solo++;
    });

    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    return { shots, hits, solo, team, accuracy };
  }, [allSessions]);

  const pieData = [
    { value: solo, color: colors.indigo, text: 'Solo' },
    { value: team, color: colors.green, text: 'Team' },
  ].filter((d) => d.value > 0);

  // Default data for empty state
  const chartData = pieData.length > 0 ? pieData : [{ value: 1, color: `${colors.text}10` }];

  return (
    <Animated.View entering={FadeIn.delay(100).duration(400)} style={styles.halfCard}>
      <View
        style={[
          styles.card,
          { 
            backgroundColor: colors.card, 
            borderColor: colors.border, 
            padding: 0, 
            overflow: 'hidden',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            flex: 1, // Add flex: 1 here
          },
        ]}
      >
        {/* Header / Chart Section */}
        <View style={{ padding: 12, paddingBottom: 0, alignItems: 'center', flexDirection: 'row', gap: 12 }}>
          {/* Chart */}
          <View>
            <PieChart
              data={chartData}
              donut
              radius={32}
              innerRadius={24}
              showText={false}
              backgroundColor={colors.card}
            />
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={{ fontSize: 10, fontWeight: '800', color: colors.textMuted }}>{allSessions.length}</Text>
            </View>
          </View>

          {/* Legend / Primary Stat */}
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 2 }}>Accuracy</Text>
            <Text style={{ fontSize: 26, fontWeight: '800', color: colors.text, letterSpacing: -1 }}>
              {accuracy}%
            </Text>
          </View>
        </View>

        {/* Stats Grid */}
        <View style={{ flexDirection: 'row', padding: 12, gap: 8 }}>
          <View
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              backgroundColor: `${colors.text}05`,
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{shots.toLocaleString()}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>Shots</Text>
          </View>
          <View style={{ 
              flex: 1, 
              padding: 8, 
              borderRadius: 8,
              backgroundColor: `${colors.text}05`,
              alignItems: 'center' 
            }}>
            <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text }}>{hits.toLocaleString()}</Text>
            <Text style={{ fontSize: 9, color: colors.textMuted, fontWeight: '700', marginTop: 2, textTransform: 'uppercase' }}>Hits</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

function WeeklyHighlightsCard({
  colors,
  sessions,
}: {
  colors: ReturnType<typeof useColors>;
  sessions: SessionWithDetails[];
}) {
  const stats = useMemo(() => {
    let totalTimeMs = 0;
    let minDispersion = 1000;
    let hasDispersion = false;
    let totalDist = 0;
    let distCount = 0;

    sessions.forEach((s) => {
      // Time
      if (s.started_at && s.ended_at) {
        const diff = new Date(s.ended_at).getTime() - new Date(s.started_at).getTime();
        if (diff > 0 && diff < 86400000) totalTimeMs += diff;
      }

      // Dispersion
      if (s.stats?.best_dispersion_cm && s.stats.best_dispersion_cm > 0) {
        hasDispersion = true;
        minDispersion = Math.min(minDispersion, s.stats.best_dispersion_cm);
      }

      // Distance
      if (s.stats?.avg_distance_m) {
        totalDist += s.stats.avg_distance_m;
        distCount++;
      }
    });

    const hours = Math.floor(totalTimeMs / (1000 * 60 * 60));
    const mins = Math.floor((totalTimeMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    const bestGroup = hasDispersion ? `${minDispersion.toFixed(1)} cm` : '—';
    const avgDist = distCount > 0 ? `${Math.round(totalDist / distCount)} m` : '—';

    return { timeStr, bestGroup, avgDist };
  }, [sessions]);

  return (
    <Animated.View entering={FadeIn.delay(150).duration(400)} style={styles.halfCard}>
      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.card,
            borderColor: colors.border,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.05,
            shadowRadius: 8,
            elevation: 2,
            justifyContent: 'center',
            paddingVertical: 16,
            paddingHorizontal: 16,
            flex: 1, // Add flex: 1 here
          },
        ]}
      >
        <View style={{ gap: 16 }}>
          {/* Row 1: Time */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.orange}15`, width: 36, height: 36, borderRadius: 10 },
              ]}
            >
              <Clock size={18} color={colors.orange} />
            </View>
            <View>
              <Text
                style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}
              >
                Time Trained
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                {stats.timeStr}
              </Text>
            </View>
          </View>

          {/* Row 2: Best Group */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.indigo}15`, width: 36, height: 36, borderRadius: 10 },
              ]}
            >
              <Crosshair size={18} color={colors.indigo} />
            </View>
            <View>
              <Text
                style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}
              >
                Best Group
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                {stats.bestGroup}
              </Text>
            </View>
          </View>

          {/* Row 3: Avg Distance */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            <View
              style={[
                styles.statIcon,
                { backgroundColor: `${colors.green}15`, width: 36, height: 36, borderRadius: 10 },
              ]}
            >
              <Target size={18} color={colors.green} />
            </View>
            <View>
              <Text
                style={{ fontSize: 10, color: colors.textMuted, fontWeight: '700', textTransform: 'uppercase', marginBottom: 2 }}
              >
                Avg Distance
              </Text>
              <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, letterSpacing: -0.5 }}>
                {stats.avgDist}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// ACTIVE SESSION BANNER
// ═══════════════════════════════════════════════════════════════════════════

// function ActiveSessionBanner({
//   session,
//   colors,
//   onPress,
// }: {
//   session: SessionWithDetails;
//   colors: ReturnType<typeof useColors>;
//   onPress: () => void;
// }) {
//   const title = session.training_title || session.drill_name || 'Solo Practice';
//   const subtitle = session.team_name ? `${session.team_name}` : 'Personal';

//   return (
//     <Animated.View entering={FadeInDown.duration(400)}>
//       <TouchableOpacity
//         style={[styles.activeBanner, { backgroundColor: colors.cardBackground }]}
//         onPress={onPress}
//         activeOpacity={0.9}
//       >
//         <View style={styles.activeBannerContent}>
//           <View style={styles.liveDot} />
//           <View style={styles.activeBannerText}>
//             <Text style={styles.activeBannerLabel}>ACTIVE SESSION • {subtitle.toUpperCase()}</Text>
//             <Text style={styles.activeBannerTitle} numberOfLines={1}>
//               {title}
//             </Text>
//           </View>
//         </View>
//         <View style={styles.activeBannerAction}>
//           <Play size={16} color="#fff" fill="#fff" />
//         </View>
//       </TouchableOpacity>
//     </Animated.View>
//   );
// }

// ═══════════════════════════════════════════════════════════════════════════
// RECENT ACTIVITY SECTION - Shows recent sessions from all sources
// ═══════════════════════════════════════════════════════════════════════════

function RecentActivitySection({
  colors,
  sessions,
  onSessionPress,
}: {
  colors: ReturnType<typeof useColors>;
  sessions: SessionWithDetails[];
  onSessionPress: (session: SessionWithDetails) => void;
}) {
  const recentSessions = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime())
      .slice(0, 5);
  }, [sessions]);

  if (recentSessions.length === 0) return null;

  const formatSessionTime = (session: SessionWithDetails) => {
    const date = new Date(session.ended_at || session.started_at);
    if (isToday(date)) return `Today, ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAllText, { color: colors.indigo }]}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.activityList}>
        {recentSessions.map((session, index) => (
          <Animated.View key={session.id} entering={FadeInRight.delay(index * 50).duration(300)}>
            <TouchableOpacity
              style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSessionPress(session);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.activityIcon, { backgroundColor: session.team_id ? `${colors.green}22` : `${colors.indigo}22` }]}>
                {session.team_id ? <Users size={14} color={colors.green} /> : <Target size={14} color={colors.indigo} />}
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {session.drill_name || session.training_title || 'Solo Practice'}
                </Text>
                <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
                  {session.team_name || 'Personal'} • {formatSessionTime(session)}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TRAINING CARD
// ═══════════════════════════════════════════════════════════════════════════

function TrainingCard({
  training,
  colors,
  index,
}: {
  training: TrainingWithDetails;
  colors: ReturnType<typeof useColors>;
  index: number;
}) {
  const isLive = training.status === 'ongoing';
  const scheduledDate = new Date(training.scheduled_at);
  const timeStr = format(scheduledDate, 'HH:mm');
  const dateStr = format(scheduledDate, 'MMM d');

  const getPriorityColor = () => {
    if (isLive) return colors.green;
    const hoursUntil = (scheduledDate.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < 2) return colors.red;
    if (hoursUntil < 24) return colors.orange;
    return colors.indigo;
  };

  return (
    <Animated.View entering={FadeInRight.delay(index * 60).springify()}>
      <TouchableOpacity
        style={[styles.trainingCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={() => router.push(`/(protected)/trainingDetail?id=${training.id}`)}
        activeOpacity={0.8}
      >
        {/* Priority Badge */}
        <View style={styles.trainingCardTop}>
          <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor() }]}>
            <Text style={styles.priorityText}>{isLive ? 'Live' : 'Upcoming'}</Text>
          </View>
          {training.team?.name && (
            <View style={styles.teamTag}>
              <View style={[styles.teamDot, { backgroundColor: colors.indigo }]} />
              <Text style={[styles.teamTagText, { color: colors.textMuted }]} numberOfLines={1}>
                {training.team.name}
              </Text>
            </View>
          )}
        </View>

        {/* Title */}
        <Text style={[styles.trainingTitle, { color: colors.text }]} numberOfLines={2}>
          {training.title}
        </Text>

        {/* Meta */}
        <View style={styles.trainingMeta}>
          <View style={styles.metaItem}>
            <Clock size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {timeStr} - {dateStr}
            </Text>
          </View>
        </View>

        {/* Drills count */}
        {training.drill_count && training.drill_count > 0 && (
          <View style={styles.drillsInfo}>
            <Target size={12} color={colors.textMuted} />
            <Text style={[styles.metaText, { color: colors.textMuted }]}>
              {training.drill_count} drill{training.drill_count !== 1 ? 's' : ''}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK START CARD
// ═══════════════════════════════════════════════════════════════════════════

function QuickStartCard({
  colors,
  onStartSolo,
  starting,
}: {
  colors: ReturnType<typeof useColors>;
  onStartSolo: () => void;
  starting: boolean;
}) {
  return (
    <Animated.View entering={FadeIn.delay(200).duration(400)}>
      <TouchableOpacity
        style={[styles.quickStartCard, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onStartSolo}
        activeOpacity={0.8}
        disabled={starting}
      >
        <View style={[styles.quickStartIcon, { backgroundColor: `${colors.indigo}18` }]}>
          {starting ? (
            <ActivityIndicator size="small" color={colors.indigo} />
          ) : (
            <Zap size={20} color={colors.indigo} />
          )}
        </View>
        <View style={styles.quickStartContent}>
          <Text style={[styles.quickStartTitle, { color: colors.text }]}>Quick Start</Text>
          <Text style={[styles.quickStartDesc, { color: colors.textMuted }]}>Begin a solo practice session</Text>
        </View>
        <ChevronRight size={18} color={colors.textMuted} />
      </TouchableOpacity>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// TEAMS ROW - Optional enhancement when user has teams
// ═══════════════════════════════════════════════════════════════════════════

function TeamsRow({ colors }: { colors: ReturnType<typeof useColors> }) {
  const { teams } = useTeamStore();
  const { myUpcomingTrainings } = useTrainingStore();

  if (teams.length === 0) return null;

  // Single team - show expanded card
  if (teams.length === 1) {
    const team = teams[0];
    const teamTrainings = myUpcomingTrainings.filter(t => t.team_id === team.id);
    const upcomingCount = teamTrainings.filter(t => t.status === 'planned').length;
    const liveCount = teamTrainings.filter(t => t.status === 'ongoing').length;

    return (
      <View style={[styles.teamsSection, { paddingHorizontal: 16 }]}>
        <TouchableOpacity
          style={[styles.singleTeamCard, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => router.push(`/(protected)/teamDetail?id=${team.id}`)}
          activeOpacity={0.7}
        >
          <View style={styles.singleTeamHeader}>
            <View style={[styles.singleTeamIcon, { backgroundColor: `${colors.indigo}18` }]}>
              <Users size={20} color={colors.indigo} />
            </View>
            <View style={styles.singleTeamInfo}>
              <Text style={[styles.singleTeamName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              <Text style={[styles.singleTeamRole, { color: colors.textMuted }]}>
                {team.my_role === 'owner' ? 'Owner' : team.my_role === 'commander' ? 'Commander' : 'Member'}
              </Text>
            </View>
            <ChevronRight size={20} color={colors.textMuted} />
          </View>

          {/* Quick stats row */}
          <View style={[styles.singleTeamStats, { borderTopColor: colors.border }]}>
            <View style={styles.singleTeamStat}>
              {liveCount > 0 ? (
                <View style={[styles.liveDot, { backgroundColor: colors.green }]} />
              ) : null}
              <Text style={[styles.singleTeamStatValue, { color: liveCount > 0 ? colors.green : colors.text }]}>
                {liveCount > 0 ? 'Live' : upcomingCount}
              </Text>
              <Text style={[styles.singleTeamStatLabel, { color: colors.textMuted }]}>
                {liveCount > 0 ? 'Training Now' : 'Upcoming'}
              </Text>
            </View>
            <View style={[styles.singleTeamStatDivider, { backgroundColor: colors.border }]} />
            <TouchableOpacity 
              style={styles.singleTeamAction}
              onPress={() => router.push('/(protected)/(tabs)/trainings')}
            >
              <Calendar size={16} color={colors.indigo} />
              <Text style={[styles.singleTeamActionText, { color: colors.indigo }]}>
                View Schedule
              </Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </View>
    );
  }

  // Multiple teams - horizontal scroll
  return (
    <View style={styles.teamsSection}>
      <View style={[styles.sectionHeader, { paddingHorizontal: 16 }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Teams</Text>
        <TouchableOpacity onPress={() => router.push('/(protected)/(tabs)/profile')}>
          <Text style={[styles.seeAllText, { color: colors.indigo }]}>See All</Text>
        </TouchableOpacity>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.teamsScrollContent}>
        {teams.slice(0, 6).map((team) => {
          const teamTrainings = myUpcomingTrainings.filter(t => t.team_id === team.id);
          const hasLive = teamTrainings.some(t => t.status === 'ongoing');
          
          return (
            <TouchableOpacity
              key={team.id}
              style={[styles.teamCard, { backgroundColor: colors.card, borderColor: hasLive ? colors.green : colors.border }]}
              onPress={() => router.push(`/(protected)/teamDetail?id=${team.id}`)}
              activeOpacity={0.7}
            >
              <View style={[styles.teamCardIcon, { backgroundColor: `${colors.indigo}18` }]}>
                <Users size={18} color={colors.indigo} />
              </View>
              <Text style={[styles.teamCardName, { color: colors.text }]} numberOfLines={1}>
                {team.name}
              </Text>
              {hasLive && (
                <View style={[styles.teamCardLive, { backgroundColor: `${colors.green}18` }]}>
                  <View style={[styles.liveDotSmall, { backgroundColor: colors.green }]} />
                  <Text style={[styles.teamCardLiveText, { color: colors.green }]}>Live</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE - When user has no activity yet
// ═══════════════════════════════════════════════════════════════════════════

function EmptyState({
  colors,
  onStartPractice,
  starting,
}: {
  colors: ReturnType<typeof useColors>;
  onStartPractice: () => void;
  starting: boolean;
}) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: `${colors.indigo}15` }]}>
        <Target size={48} color={colors.indigo} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>Start Your Journey</Text>
      <Text style={[styles.emptyDesc, { color: colors.textMuted }]}>
        Track your shooting practice, join teams, and improve your skills over time.
      </Text>
      <TouchableOpacity
        style={[styles.emptyButton, { backgroundColor: colors.indigo }]}
        onPress={onStartPractice}
        disabled={starting}
        activeOpacity={0.8}
      >
        {starting ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <>
            <Zap size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Start Practice</Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function UnifiedHomePage() {
  const colors = useColors();
  const { profileFullName, profileAvatarUrl, user } = useAuth();
  const { setOnSessionCreated, setOnTeamCreated } = useModals();

  // Greeting
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const firstName = profileFullName?.split(' ')[0] || 'Shooter';
  const email = user?.email;
  const avatarUrl = profileAvatarUrl ?? user?.user_metadata?.avatar_url;
  const fallbackInitial = profileFullName?.charAt(0)?.toUpperCase() ?? email?.charAt(0)?.toUpperCase() ?? '?';

  // Stores
  const { sessions, loading: sessionsLoading, initialized, createSession } = useSessionStore();
  const { teams, loadTeams } = useTeamStore();
  const { myUpcomingTrainings, myStats, loadMyUpcomingTrainings, loadMyStats } = useTrainingStore();

  // Local state
  const [refreshing, setRefreshing] = useState(false);
  const [starting, setStarting] = useState(false);
  const [allSessions, setAllSessions] = useState<SessionWithDetails[]>([]);
  const [loadingAllSessions, setLoadingAllSessions] = useState(true);
  const initialLoadDone = useRef(false);

  // Load ALL sessions (personal + team) for unified view
  const loadAllSessions = useCallback(async () => {
    try {
      const sessions = await getSessionsWithStats(); // All sessions with stats
      setAllSessions(sessions);
    } catch (error) {
      console.error('Failed to load all sessions:', error);
    } finally {
      setLoadingAllSessions(false);
    }
  }, []);

  // Data loading
  useEffect(() => {
    if (initialLoadDone.current) return;
    initialLoadDone.current = true;

    loadAllSessions();
    loadMyUpcomingTrainings();
    loadMyStats();
    loadTeams();
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  useEffect(() => {
    setOnSessionCreated(() => loadAllSessions);
    setOnTeamCreated(() => loadTeams);
    return () => {
      setOnSessionCreated(null);
      setOnTeamCreated(null);
    };
  }, [loadAllSessions, loadTeams, setOnSessionCreated, setOnTeamCreated]);

  // Derived data
  const hasTeams = teams.length > 0;
  const activeSession = useMemo(
    () => allSessions.find((s) => s.status === 'active') || null,
    [allSessions]
  );
  const upcomingTrainings = useMemo(() => {
    return myUpcomingTrainings.filter((t) => t.status === 'planned' || t.status === 'ongoing').slice(0, 5);
  }, [myUpcomingTrainings]);
  const hasActivity = allSessions.length > 0 || upcomingTrainings.length > 0;

  // Filter sessions for the last 7 days
  const lastWeekSessions = useMemo(() => {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    return allSessions.filter((s) => {
      const date = new Date(s.ended_at || s.started_at);
      return date >= oneWeekAgo;
    });
  }, [allSessions]);

  // Handlers
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Promise.all([loadAllSessions(), loadMyUpcomingTrainings(), loadMyStats(), loadTeams()]);
    setRefreshing(false);
  }, [loadAllSessions, loadMyUpcomingTrainings, loadMyStats, loadTeams]);

  const handleOpenActiveSession = useCallback(() => {
    if (!activeSession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push(`/(protected)/activeSession?sessionId=${activeSession.id}` );
  }, [activeSession]);

  const handleHeroPress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (activeSession) {
      router.push(`/(protected)/activeSession?sessionId=${activeSession.id}`);
    } else if (hasTeams) {
      router.push('/(protected)/(tabs)/trainings');
    } else {
      handleStartSoloSession();
    }
  }, [activeSession, hasTeams]);

  const handleStartSoloSession = useCallback(async () => {
    if (starting) return;
    setStarting(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    try {
      const existing = await getMyActivePersonalSession();
      if (existing) {
        router.push(`/(protected)/activeSession?sessionId=${existing.id}`);
        return;
      }
      const newSession = await createSession({ session_mode: 'solo' });
      router.push(`/(protected)/activeSession?sessionId=${newSession.id}`);
    } catch (error) {
      console.error('Failed to start session:', error);
    } finally {
      setStarting(false);
    }
  }, [starting, createSession]);

  const handleOpenSessionDetail = useCallback((session: SessionWithDetails) => {
    router.push(`/(protected)/sessionDetail?sessionId=${session.id}`);
  }, []);

  if (!initialized && (sessionsLoading || loadingAllSessions)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingTop: 8 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
      >
        {/* Greeting */}
        <View style={styles.greetingRow}>
          <View style={[styles.greetingAvatar, { backgroundColor: colors.secondary }]}>
            {avatarUrl ? (
              <BaseAvatar source={{ uri: avatarUrl }} fallbackText={fallbackInitial} size="sm" borderWidth={0} />
            ) : (
              <Text style={[styles.greetingAvatarText, { color: colors.text }]}>{fallbackInitial}</Text>
            )}
          </View>
          <View>
            <Text style={[styles.greetingText, { color: colors.textMuted }]}>{getGreeting()},</Text>
            <Text style={[styles.greetingName, { color: colors.text }]}>{firstName}</Text>
          </View>
        </View>

        {/* Hero Summary */}
        <View style={styles.section}>
          <HeroSummaryCard
            colors={colors}
            upcomingCount={upcomingTrainings.length}
            allSessions={allSessions}
            activeSession={activeSession}
            hasTeams={hasTeams}
            teamCount={teams.length}
            onPress={handleHeroPress}
          />
        </View>


          

        {/* Show empty state or activity */}
        {!hasActivity && !activeSession ? (
          <EmptyState colors={colors} onStartPractice={handleStartSoloSession} starting={starting} />
        ) : (
          <>
            {/* Side-by-side cards */}
            <View style={styles.section}>
              <SectionHeader title="Weekly Overview" colors={colors} />
              <View style={styles.cardsRow}>
                <AggregatedStatsCard colors={colors} allSessions={lastWeekSessions} trainingStats={myStats} />
                <WeeklyHighlightsCard colors={colors} sessions={lastWeekSessions} />
              </View>
            </View>

            {/* Teams */}
            <TeamsRow colors={colors} />

            {/* Activity Timeline */}
            <View style={{ marginTop: 8 }}>
              <ActivityTimeline
                sessions={allSessions}
                trainings={upcomingTrainings}
                onSessionPress={handleOpenSessionDetail}
              />
            </View>
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingBottom: 24, paddingTop: 8 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },

  // Greeting
  greetingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  greetingAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  greetingAvatarText: {
    fontSize: 16,
    fontWeight: '700',
  },
  greetingText: {
    fontSize: 14,
    fontWeight: '500',
  },
  greetingName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },

  // Section
  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Hero Card
  heroCard: {
    borderRadius: CARD_RADIUS,
    padding: 16,
    minHeight: 130,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDate: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(34, 197, 94, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 0.5,
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  heroHighlight: {
    color: '#7DD3FC',
  },
  heroFooter: {
    marginTop: 12,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },

  // Cards Row
  cardsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCard: {
    flex: 1,
  },
  card: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
    minHeight: 160,
  },

  // Radial Progress
  radialCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  radialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  radialRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringBg: {
    position: 'absolute',
  },
  ringProgress: {
    position: 'absolute',
    overflow: 'hidden',
  },
  ringSegment: {
    position: 'absolute',
  },
  ringCenter: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringPercent: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  glowDot: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  radialStats: {
    flex: 1,
    gap: 8,
  },
  radialStatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  radialStatText: {
    fontSize: 12,
    fontWeight: '500',
  },

  // Stats
  statRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: SMALL_RADIUS,
    gap: 10,
  },
  statIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
  },
  statLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  statValue: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 2,
  },
  progressContainer: {
    marginTop: 12,
  },
  progressBg: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },

  // Active Banner
  activeBanner: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  activeBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  activeBannerText: {
    flex: 1,
  },
  activeBannerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.8)',
    letterSpacing: 1,
  },
  activeBannerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
    marginTop: 2,
  },
  activeBannerAction: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Quick Start
  quickStartCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: CARD_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  quickStartIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickStartContent: {
    flex: 1,
  },
  quickStartTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  quickStartDesc: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Recent Activity
  activityList: {
    gap: 8,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: SMALL_RADIUS,
    borderWidth: 1,
    gap: 12,
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },

  // Teams
  teamsSection: {
    marginBottom: 16,
  },

  // Single team card (when user has 1 team)
  singleTeamCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  singleTeamHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  singleTeamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  singleTeamInfo: {
    flex: 1,
  },
  singleTeamName: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  singleTeamRole: {
    fontSize: 13,
    marginTop: 2,
  },
  singleTeamStats: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  singleTeamStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singleTeamStatValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  singleTeamStatLabel: {
    fontSize: 13,
  },
  singleTeamStatDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 16,
  },
  singleTeamAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  singleTeamActionText: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Multiple teams scroll
  teamsScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
  },
  teamCard: {
    width: 140,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    gap: 10,
  },
  teamCardIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  teamCardName: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  teamCardLive: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamCardLiveText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Training Card
  trainingsList: {
    gap: 10,
  },
  trainingCard: {
    borderRadius: CARD_RADIUS,
    padding: 14,
    borderWidth: 1,
  },
  trainingCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: 0.3,
  },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  teamDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  teamTagText: {
    fontSize: 12,
    fontWeight: '500',
    maxWidth: 100,
  },
  trainingTitle: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  trainingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  drillsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 8,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyIcon: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDesc: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  emptyButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#fff',
  },
});

export default UnifiedHomePage;
