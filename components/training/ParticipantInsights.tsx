/**
 * ParticipantInsights
 * 
 * Comprehensive participant results view for commanders.
 * Provides meaningful insights, rankings, and actionable data.
 */

import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/session/types';
import {
  AlertTriangle,
  Award,
  ChevronDown,
  ChevronUp,
  Clock,
  Crown,
  Eye,
  Focus,
  Medal,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  User,
  Users,
  Zap,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface DrillResult {
  drillId: string;
  drillName: string;
  drillGoal: 'grouping' | 'engagement';
  accuracy: number | null;
  dispersion: number | null;
  shots: number;
  hits: number;
  completed: boolean;
  duration: number | null; // seconds
}

interface ParticipantData {
  userId: string;
  userName: string;
  totalShots: number;
  totalHits: number;
  accuracy: number | null;
  drillsCompleted: number;
  drillResults: DrillResult[];
  avgTimePerDrill: number | null;
  bestDispersion: number | null;
  consistencyScore: number | null; // 0-100, how consistent across drills
}

interface TeamInsight {
  type: 'positive' | 'warning' | 'info';
  title: string;
  description: string;
  userId?: string;
}

interface ParticipantInsightsProps {
  teamSessions: SessionWithDetails[];
  drills: Array<{
    id: string;
    name: string;
    drill_goal?: 'grouping' | 'engagement';
    distance_m?: number;
    rounds_per_shooter?: number;
  }>;
  trainingDuration?: number | null; // in minutes
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

function calculateConsistency(results: DrillResult[]): number | null {
  const accuracies = results
    .filter(r => r.completed && r.accuracy !== null)
    .map(r => r.accuracy!);
  
  if (accuracies.length < 2) return null;
  
  const avg = accuracies.reduce((a, b) => a + b, 0) / accuracies.length;
  const variance = accuracies.reduce((sum, acc) => sum + Math.pow(acc - avg, 2), 0) / accuracies.length;
  const stdDev = Math.sqrt(variance);
  
  // Lower std dev = more consistent = higher score
  // Max consistency (100) when stdDev = 0, drops as variance increases
  return Math.max(0, Math.round(100 - stdDev * 2));
}

function getPerformanceTrend(results: DrillResult[]): 'improving' | 'declining' | 'stable' | null {
  const orderedResults = results.filter(r => r.completed && r.accuracy !== null);
  if (orderedResults.length < 2) return null;
  
  const firstHalf = orderedResults.slice(0, Math.ceil(orderedResults.length / 2));
  const secondHalf = orderedResults.slice(Math.ceil(orderedResults.length / 2));
  
  const firstAvg = firstHalf.reduce((sum, r) => sum + (r.accuracy || 0), 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, r) => sum + (r.accuracy || 0), 0) / secondHalf.length;
  
  const diff = secondAvg - firstAvg;
  if (diff > 5) return 'improving';
  if (diff < -5) return 'declining';
  return 'stable';
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

function InsightCard({ 
  insight, 
  colors 
}: { 
  insight: TeamInsight; 
  colors: ReturnType<typeof useColors>;
}) {
  const config = {
    positive: { bg: colors.green + '15', color: colors.green, icon: Trophy },
    warning: { bg: colors.orange + '15', color: colors.orange, icon: AlertTriangle },
    info: { bg: colors.blue + '15', color: colors.blue, icon: Eye },
  };
  
  const { bg, color, icon: Icon } = config[insight.type];
  
  return (
    <View style={[styles.insightCard, { backgroundColor: bg }]}>
      <Icon size={16} color={color} />
      <View style={styles.insightContent}>
        <Text style={[styles.insightTitle, { color }]}>{insight.title}</Text>
        <Text style={[styles.insightDesc, { color: colors.textMuted }]}>{insight.description}</Text>
      </View>
    </View>
  );
}

function LeaderboardItem({
  participant,
  rank,
  totalDrills,
  colors,
  isExpanded,
  onToggle,
}: {
  participant: ParticipantData;
  rank: number;
  totalDrills: number;
  colors: ReturnType<typeof useColors>;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const trend = useMemo(() => getPerformanceTrend(participant.drillResults), [participant.drillResults]);
  
  const rankConfig = {
    1: { icon: Crown, color: '#FFD700', bg: '#FFD70020' },
    2: { icon: Medal, color: '#C0C0C0', bg: '#C0C0C020' },
    3: { icon: Award, color: '#CD7F32', bg: '#CD7F3220' },
  };
  
  const RankIcon = rankConfig[rank as keyof typeof rankConfig]?.icon || User;
  const rankColor = rankConfig[rank as keyof typeof rankConfig]?.color || colors.textMuted;
  const rankBg = rankConfig[rank as keyof typeof rankConfig]?.bg || colors.secondary;
  
  const completionRate = Math.round((participant.drillsCompleted / totalDrills) * 100);
  const hasGrouping = participant.drillResults.some(r => r.drillGoal === 'grouping');
  const hasEngagement = participant.drillResults.some(r => r.drillGoal === 'engagement');
  
  return (
    <Animated.View entering={FadeInDown.delay(rank * 50).duration(300)}>
      <TouchableOpacity
        style={[styles.participantCard, { backgroundColor: colors.card }]}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        {/* Header Row */}
        <View style={styles.participantHeader}>
          <View style={[styles.rankBadge, { backgroundColor: rankBg }]}>
            <RankIcon size={14} color={rankColor} />
            {rank > 3 && <Text style={[styles.rankNumber, { color: colors.textMuted }]}>#{rank}</Text>}
          </View>
          
          <View style={[styles.avatar, { backgroundColor: colors.secondary }]}>
            <Text style={[styles.avatarText, { color: colors.text }]}>
              {participant.userName.charAt(0).toUpperCase()}
            </Text>
          </View>
          
          <View style={styles.participantInfo}>
            <View style={styles.nameRow}>
              <Text style={[styles.participantName, { color: colors.text }]} numberOfLines={1}>
                {participant.userName}
              </Text>
              {trend === 'improving' && <TrendingUp size={14} color={colors.green} />}
              {trend === 'declining' && <TrendingDown size={14} color={colors.orange} />}
            </View>
            <Text style={[styles.participantMeta, { color: colors.textMuted }]}>
              {participant.drillsCompleted}/{totalDrills} drills • {participant.totalShots} shots
            </Text>
          </View>
          
          <View style={styles.statsColumn}>
            {participant.accuracy !== null && (
              <View style={styles.statBadge}>
                <Text style={[
                  styles.statValue,
                  { 
                    color: participant.accuracy >= 80 ? colors.green : 
                           participant.accuracy >= 60 ? colors.text : colors.orange 
                  }
                ]}>
                  {participant.accuracy}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>accuracy</Text>
              </View>
            )}
            {hasGrouping && participant.bestDispersion !== null && (
              <View style={styles.statBadge}>
                <Text style={[styles.statValue, { color: colors.green }]}>
                  {participant.bestDispersion.toFixed(1)}cm
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>best group</Text>
              </View>
            )}
          </View>
          
          {isExpanded ? (
            <ChevronUp size={18} color={colors.textMuted} />
          ) : (
            <ChevronDown size={18} color={colors.textMuted} />
          )}
        </View>
        
        {/* Expanded Drill Breakdown */}
        {isExpanded && (
          <Animated.View entering={FadeIn.duration(200)} style={styles.drillBreakdown}>
            {/* Quick Stats Row */}
            <View style={[styles.quickStats, { borderTopColor: colors.border }]}>
              {participant.consistencyScore !== null && (
                <View style={styles.quickStat}>
                  <Focus size={12} color={colors.textMuted} />
                  <Text style={[styles.quickStatValue, { color: colors.text }]}>
                    {participant.consistencyScore}%
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>consistency</Text>
                </View>
              )}
              {participant.avgTimePerDrill && (
                <View style={styles.quickStat}>
                  <Clock size={12} color={colors.textMuted} />
                  <Text style={[styles.quickStatValue, { color: colors.text }]}>
                    {Math.round(participant.avgTimePerDrill / 60)}m
                  </Text>
                  <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>avg/drill</Text>
                </View>
              )}
              <View style={styles.quickStat}>
                <Target size={12} color={colors.textMuted} />
                <Text style={[styles.quickStatValue, { color: colors.text }]}>
                  {completionRate}%
                </Text>
                <Text style={[styles.quickStatLabel, { color: colors.textMuted }]}>completion</Text>
              </View>
            </View>
            
            {/* Drill Results */}
            <View style={styles.drillsList}>
              {participant.drillResults.map((result, idx) => {
                const isGrouping = result.drillGoal === 'grouping';
                const goalColor = isGrouping ? colors.green : '#F59E0B';
                
                let resultDisplay = '—';
                let resultColor = colors.textMuted;
                
                if (result.completed) {
                  if (isGrouping && result.dispersion !== null) {
                    resultDisplay = `${result.dispersion.toFixed(1)}cm`;
                    resultColor = result.dispersion <= 5 ? colors.green : 
                                  result.dispersion <= 10 ? colors.text : colors.orange;
                  } else if (!isGrouping && result.accuracy !== null) {
                    resultDisplay = `${result.accuracy}%`;
                    resultColor = result.accuracy >= 80 ? colors.green : 
                                  result.accuracy >= 60 ? colors.text : colors.orange;
                  } else if (result.shots > 0) {
                    resultDisplay = `${result.hits}/${result.shots}`;
                    resultColor = colors.text;
                  }
                }
                
                return (
                  <View key={`${result.drillId}-${idx}`} style={styles.drillRow}>
                    <View style={[styles.drillDot, { backgroundColor: goalColor }]} />
                    <View style={[
                      styles.drillStatus,
                      { backgroundColor: result.completed ? colors.green : colors.border }
                    ]} />
                    <Text 
                      style={[
                        styles.drillName, 
                        { color: result.completed ? colors.text : colors.textMuted }
                      ]} 
                      numberOfLines={1}
                    >
                      {result.drillName}
                    </Text>
                    <Text style={[styles.drillResult, { color: resultColor }]}>
                      {resultDisplay}
                    </Text>
                  </View>
                );
              })}
            </View>
          </Animated.View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
}

function TeamSummaryStats({
  participants,
  totalDrills,
  colors,
}: {
  participants: ParticipantData[];
  totalDrills: number;
  colors: ReturnType<typeof useColors>;
}) {
  const stats = useMemo(() => {
    const withAccuracy = participants.filter(p => p.accuracy !== null);
    const avgAccuracy = withAccuracy.length > 0
      ? Math.round(withAccuracy.reduce((sum, p) => sum + (p.accuracy || 0), 0) / withAccuracy.length)
      : null;
    
    const totalShots = participants.reduce((sum, p) => sum + p.totalShots, 0);
    const totalHits = participants.reduce((sum, p) => sum + p.totalHits, 0);
    const teamAccuracy = totalShots > 0 ? Math.round((totalHits / totalShots) * 100) : null;
    
    const fullCompletion = participants.filter(p => p.drillsCompleted === totalDrills).length;
    const completionRate = Math.round((fullCompletion / participants.length) * 100);
    
    const dispersions = participants
      .filter(p => p.bestDispersion !== null)
      .map(p => p.bestDispersion!);
    const bestTeamDispersion = dispersions.length > 0 ? Math.min(...dispersions) : null;
    
    return { avgAccuracy, teamAccuracy, totalShots, totalHits, fullCompletion, completionRate, bestTeamDispersion };
  }, [participants, totalDrills]);
  
  return (
    <View style={[styles.summaryStats, { backgroundColor: colors.card }]}>
      <Text style={[styles.summaryTitle, { color: colors.text }]}>Team Performance</Text>
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Users size={16} color={colors.primary} />
          <Text style={[styles.statBoxValue, { color: colors.text }]}>{participants.length}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Participants</Text>
        </View>
        {stats.teamAccuracy !== null && (
          <View style={styles.statBox}>
            <Target size={16} color={stats.teamAccuracy >= 70 ? colors.green : colors.orange} />
            <Text style={[
              styles.statBoxValue, 
              { color: stats.teamAccuracy >= 70 ? colors.green : colors.orange }
            ]}>
              {stats.teamAccuracy}%
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Team Accuracy</Text>
          </View>
        )}
        <View style={styles.statBox}>
          <Trophy size={16} color={colors.green} />
          <Text style={[styles.statBoxValue, { color: colors.text }]}>{stats.completionRate}%</Text>
          <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Full Completion</Text>
        </View>
        {stats.bestTeamDispersion !== null && (
          <View style={styles.statBox}>
            <Focus size={16} color={colors.green} />
            <Text style={[styles.statBoxValue, { color: colors.green }]}>
              {stats.bestTeamDispersion.toFixed(1)}cm
            </Text>
            <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Best Group</Text>
          </View>
        )}
        <View style={styles.statBox}>
          <Zap size={16} color={colors.text} />
          <Text style={[styles.statBoxValue, { color: colors.text }]}>{stats.totalShots}</Text>
          <Text style={[styles.statBoxLabel, { color: colors.textMuted }]}>Total Shots</Text>
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function ParticipantInsights({
  teamSessions,
  drills,
}: ParticipantInsightsProps) {
  const colors = useColors();
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  
  // Process participant data
  const participants = useMemo<ParticipantData[]>(() => {
    if (!teamSessions.length || !drills.length) return [];
    
    const userMap = new Map<string, ParticipantData>();
    
    teamSessions.forEach((session) => {
      const userId = session.user_id;
      
      if (!userMap.has(userId)) {
        userMap.set(userId, {
          userId,
          userName: session.user_full_name || 'Unknown',
          totalShots: 0,
          totalHits: 0,
          accuracy: null,
          drillsCompleted: 0,
          drillResults: [],
          avgTimePerDrill: null,
          bestDispersion: null,
          consistencyScore: null,
        });
      }
      
      const participant = userMap.get(userId)!;
      
      // Get drill info
      const drill = drills.find(d => d.id === session.drill_id);
      const drillName = drill?.name || session.drill_name || session.drill_config?.name || 'Unknown';
      const drillGoal = (drill?.drill_goal || session.drill_config?.drill_goal || 'engagement') as 'grouping' | 'engagement';
      const isGrouping = drillGoal === 'grouping';
      
      // Calculate stats
      const shots = session.stats?.shots_fired ?? 0;
      const hits = session.stats?.hits_total ?? 0;
      const dispersion = session.stats?.best_dispersion_cm ?? null;
      const duration = session.started_at && session.ended_at
        ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 1000)
        : null;
      
      // For engagement drills, track hits
      if (!isGrouping) {
        participant.totalShots += shots;
        participant.totalHits += hits;
      }
      
      // Track best dispersion for grouping
      if (isGrouping && dispersion !== null) {
        if (participant.bestDispersion === null || dispersion < participant.bestDispersion) {
          participant.bestDispersion = dispersion;
        }
      }
      
      if (session.status === 'completed') {
        participant.drillsCompleted++;
      }
      
      // Add drill result
      participant.drillResults.push({
        drillId: session.drill_id || '',
        drillName,
        drillGoal,
        accuracy: !isGrouping && shots > 0 ? Math.round((hits / shots) * 100) : null,
        dispersion: isGrouping ? dispersion : null,
        shots,
        hits,
        completed: session.status === 'completed',
        duration,
      });
    });
    
    // Calculate derived stats
    userMap.forEach((p) => {
      // Overall accuracy (engagement only)
      if (p.totalShots > 0) {
        p.accuracy = Math.round((p.totalHits / p.totalShots) * 100);
      }
      
      // Consistency score
      p.consistencyScore = calculateConsistency(p.drillResults);
      
      // Average time per drill
      const durations = p.drillResults.filter(r => r.duration !== null).map(r => r.duration!);
      if (durations.length > 0) {
        p.avgTimePerDrill = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      }
      
      // Sort by drill order
      p.drillResults.sort((a, b) => {
        const aIdx = drills.findIndex(d => d.id === a.drillId);
        const bIdx = drills.findIndex(d => d.id === b.drillId);
        return aIdx - bIdx;
      });
    });
    
    // Sort by: completed drills > accuracy > name
    return Array.from(userMap.values()).sort((a, b) => {
      if (b.drillsCompleted !== a.drillsCompleted) return b.drillsCompleted - a.drillsCompleted;
      if ((b.accuracy ?? 0) !== (a.accuracy ?? 0)) return (b.accuracy ?? 0) - (a.accuracy ?? 0);
      return a.userName.localeCompare(b.userName);
    });
  }, [teamSessions, drills]);
  
  // Generate team insights
  const insights = useMemo<TeamInsight[]>(() => {
    if (participants.length === 0) return [];
    
    const result: TeamInsight[] = [];
    
    // Find top performer
    const topPerformer = participants[0];
    if (topPerformer && topPerformer.accuracy !== null && topPerformer.accuracy >= 70) {
      result.push({
        type: 'positive',
        title: `Top Shooter: ${topPerformer.userName}`,
        description: `${topPerformer.accuracy}% accuracy across ${topPerformer.drillsCompleted} drills`,
        userId: topPerformer.userId,
      });
    }
    
    // Find most consistent
    const withConsistency = participants.filter(p => p.consistencyScore !== null);
    if (withConsistency.length > 0) {
      const mostConsistent = withConsistency.sort((a, b) => (b.consistencyScore ?? 0) - (a.consistencyScore ?? 0))[0];
      if (mostConsistent.consistencyScore && mostConsistent.consistencyScore >= 80) {
        result.push({
          type: 'positive',
          title: `Most Consistent: ${mostConsistent.userName}`,
          description: `${mostConsistent.consistencyScore}% consistency score across drills`,
          userId: mostConsistent.userId,
        });
      }
    }
    
    // Find struggling participants
    const struggling = participants.filter(p => 
      (p.accuracy !== null && p.accuracy < 50) || 
      (p.drillsCompleted < drills.length / 2)
    );
    if (struggling.length > 0) {
      result.push({
        type: 'warning',
        title: `${struggling.length} participant${struggling.length > 1 ? 's' : ''} may need support`,
        description: struggling.map(p => p.userName).join(', ') + ' - consider follow-up training',
      });
    }
    
    // Best grouping (if any)
    const withGrouping = participants.filter(p => p.bestDispersion !== null);
    if (withGrouping.length > 0) {
      const bestGrouper = withGrouping.sort((a, b) => (a.bestDispersion ?? Infinity) - (b.bestDispersion ?? Infinity))[0];
      if (bestGrouper.bestDispersion !== null && bestGrouper.bestDispersion <= 5) {
        result.push({
          type: 'positive',
          title: `Tightest Group: ${bestGrouper.userName}`,
          description: `${bestGrouper.bestDispersion.toFixed(1)}cm group size`,
          userId: bestGrouper.userId,
        });
      }
    }
    
    // Incomplete participants
    const incomplete = participants.filter(p => p.drillsCompleted < drills.length);
    if (incomplete.length > 0 && incomplete.length <= 3) {
      result.push({
        type: 'info',
        title: `${incomplete.length} did not complete all drills`,
        description: incomplete.map(p => `${p.userName} (${p.drillsCompleted}/${drills.length})`).join(', '),
      });
    }
    
    return result;
  }, [participants, drills.length]);
  
  if (participants.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card }]}>
        <Users size={32} color={colors.textMuted} />
        <Text style={[styles.emptyText, { color: colors.textMuted }]}>
          No participant data available
        </Text>
      </View>
    );
  }
  
  return (
    <View style={styles.container}>
      {/* Team Summary */}
      <TeamSummaryStats
        participants={participants}
        totalDrills={drills.length}
        colors={colors}
      />
      
      {/* Insights */}
      {insights.length > 0 && (
        <View style={styles.insightsSection}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Key Insights</Text>
          <View style={styles.insightsList}>
            {insights.slice(0, 4).map((insight, idx) => (
              <InsightCard key={idx} insight={insight} colors={colors} />
            ))}
          </View>
        </View>
      )}
      
      {/* Leaderboard */}
      <View style={styles.leaderboardSection}>
        <View style={styles.sectionHeader}>
          <Trophy size={16} color={colors.textMuted} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Rankings</Text>
          <Text style={[styles.sectionSubtitle, { color: colors.textMuted }]}>
            {participants.length} participants
          </Text>
        </View>
        
        <View style={styles.leaderboardList}>
          {participants.map((participant, idx) => (
            <LeaderboardItem
              key={participant.userId}
              participant={participant}
              rank={idx + 1}
              totalDrills={drills.length}
              colors={colors}
              isExpanded={expandedUserId === participant.userId}
              onToggle={() => setExpandedUserId(
                expandedUserId === participant.userId ? null : participant.userId
              )}
            />
          ))}
        </View>
      </View>
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  
  // Empty state
  emptyContainer: {
    padding: 32,
    borderRadius: 12,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 14,
  },
  
  // Summary stats
  summaryStats: {
    padding: 16,
    borderRadius: 12,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statBox: {
    alignItems: 'center',
    minWidth: 80,
    flex: 1,
    gap: 4,
  },
  statBoxValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statBoxLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  
  // Insights
  insightsSection: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  insightsList: {
    gap: 8,
  },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
  },
  insightContent: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  insightDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  
  // Leaderboard
  leaderboardSection: {
    gap: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionSubtitle: {
    fontSize: 12,
    marginLeft: 'auto',
  },
  leaderboardList: {
    gap: 8,
  },
  
  // Participant card
  participantCard: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  participantHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 2,
  },
  rankNumber: {
    fontSize: 10,
    fontWeight: '700',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantInfo: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  participantName: {
    fontSize: 14,
    fontWeight: '600',
  },
  participantMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  statsColumn: {
    alignItems: 'flex-end',
    gap: 2,
  },
  statBadge: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 10,
  },
  
  // Drill breakdown
  drillBreakdown: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  quickStats: {
    flexDirection: 'row',
    gap: 16,
    paddingTop: 12,
    paddingBottom: 12,
    marginBottom: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  quickStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  quickStatValue: {
    fontSize: 13,
    fontWeight: '600',
  },
  quickStatLabel: {
    fontSize: 11,
  },
  drillsList: {
    gap: 6,
  },
  drillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  drillDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  drillStatus: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  drillName: {
    flex: 1,
    fontSize: 13,
  },
  drillResult: {
    fontSize: 13,
    fontWeight: '600',
    minWidth: 48,
    textAlign: 'right',
  },
});
