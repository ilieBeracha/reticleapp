/**
 * SquadStatusContent Component
 * Shows real-time soldier status, team performance, and drill breakdown for commanders
 */

import type { SessionWithDetails } from '@/services/session/types';
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle,
  Circle,
  Clock,
  Crosshair,
  Target,
  TrendingUp,
  User,
  Users,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

interface DrillProgress {
  drillId: string;
  completed: boolean;
}

interface Drill {
  id: string;
  name: string;
  drill_goal?: 'grouping' | 'engagement';
  distance_m?: number;
  rounds_per_shooter?: number;
}

interface SquadStatusContentProps {
  teamSessions: SessionWithDetails[];
  drills: Drill[];
  drillProgress: DrillProgress[];
  colors: any;
}

interface SoldierStatus {
  id: string;
  name: string;
  status: 'idle' | 'active' | 'completed';
  currentDrill?: string;
  completedDrills: number;
  totalShots: number;
  totalHits: number;
  bestGroup?: number;
  avgTime?: number;
  lastActivity?: Date;
}

interface DrillStats {
  drillId: string;
  name: string;
  completedBy: number;
  avgAccuracy: number | null;
  avgTime: number | null;
  bestAccuracy: { name: string; value: number } | null;
}

export function SquadStatusContent({ teamSessions, drills, drillProgress, colors }: SquadStatusContentProps) {
  const [viewMode, setViewMode] = useState<'soldiers' | 'drills'>('soldiers');

  // Process soldier status from sessions
  const soldiers = useMemo<SoldierStatus[]>(() => {
    if (!teamSessions.length) return [];

    const soldierMap = new Map<string, SoldierStatus>();

    teamSessions.forEach((session) => {
      const existing = soldierMap.get(session.user_id);
      const shots = session.stats?.shots_fired ?? 0;
      const hits = session.stats?.hits_total ?? 0;
      const bestGroup = session.stats?.best_dispersion_cm;
      const isActive = session.status === 'active';
      const isCompleted = session.status === 'completed';

      if (!existing) {
        soldierMap.set(session.user_id, {
          id: session.user_id,
          name: session.user_full_name || 'Unknown',
          status: isActive ? 'active' : isCompleted ? 'completed' : 'idle',
          currentDrill: isActive ? session.drill_name || session.drill_config?.name : undefined,
          completedDrills: isCompleted ? 1 : 0,
          totalShots: shots,
          totalHits: hits,
          bestGroup: bestGroup ?? undefined,
          lastActivity: session.ended_at
            ? new Date(session.ended_at)
            : session.started_at
              ? new Date(session.started_at)
              : undefined,
        });
      } else {
        existing.totalShots += shots;
        existing.totalHits += hits;
        if (bestGroup && (!existing.bestGroup || bestGroup < existing.bestGroup)) {
          existing.bestGroup = bestGroup;
        }
        if (isCompleted) existing.completedDrills++;
        if (isActive) {
          existing.status = 'active';
          existing.currentDrill = session.drill_name || session.drill_config?.name;
        }
        // Update last activity
        const sessionTime = session.ended_at
          ? new Date(session.ended_at)
          : session.started_at
            ? new Date(session.started_at)
            : null;
        if (sessionTime && (!existing.lastActivity || sessionTime > existing.lastActivity)) {
          existing.lastActivity = sessionTime;
        }
      }
    });

    // Sort: active first, then by completed drills, then by name
    return Array.from(soldierMap.values()).sort((a, b) => {
      if (a.status === 'active' && b.status !== 'active') return -1;
      if (b.status === 'active' && a.status !== 'active') return 1;
      if (a.completedDrills !== b.completedDrills) return b.completedDrills - a.completedDrills;
      return a.name.localeCompare(b.name);
    });
  }, [teamSessions]);

  // Per-drill statistics
  const drillStats = useMemo<DrillStats[]>(() => {
    return drills.map((drill) => {
      const drillSessions = teamSessions.filter((s) => s.drill_id === drill.id && s.status === 'completed');
      const completedBy = new Set(drillSessions.map((s) => s.user_id)).size;

      // Calculate averages
      let totalAccuracy = 0;
      let accuracyCount = 0;
      let bestAccuracy: { name: string; value: number } | null = null;

      drillSessions.forEach((session) => {
        const shots = session.stats?.shots_fired ?? 0;
        const hits = session.stats?.hits_total ?? 0;
        if (shots > 0) {
          const acc = Math.round((hits / shots) * 100);
          totalAccuracy += acc;
          accuracyCount++;
          if (!bestAccuracy || acc > bestAccuracy.value) {
            bestAccuracy = { name: session.user_full_name || 'Unknown', value: acc };
          }
        }
      });

      return {
        drillId: drill.id,
        name: drill.name,
        completedBy,
        avgAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null,
        avgTime: null,
        bestAccuracy,
      };
    });
  }, [drills, teamSessions]);

  // Count stats
  const stats = useMemo<{
    active: number;
    completed: number;
    total: number;
    avgAccuracy: number | null;
    topPerformer: { name: string; accuracy: number } | null;
  }>(() => {
    const active = soldiers.filter((s) => s.status === 'active').length;
    const completed = soldiers.filter((s) => s.completedDrills === drills.length && s.completedDrills > 0).length;
    const total = soldiers.length;

    // Team averages
    let totalAccuracy = 0;
    let accuracyCount = 0;
    let topPerformer: { name: string; accuracy: number } | null = null;

    soldiers.forEach((s) => {
      if (s.totalShots > 0) {
        const acc = Math.round((s.totalHits / s.totalShots) * 100);
        totalAccuracy += acc;
        accuracyCount++;
        if (!topPerformer || acc > topPerformer.accuracy) {
          topPerformer = { name: s.name, accuracy: acc };
        }
      }
    });

    return {
      active,
      completed,
      total,
      avgAccuracy: accuracyCount > 0 ? Math.round(totalAccuracy / accuracyCount) : null,
      topPerformer,
    };
  }, [soldiers, drills.length]);

  if (soldiers.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <User size={32} color={colors.textMuted} />
        <Text style={[styles.emptyTitle, { color: colors.textMuted }]}>No Activity Yet</Text>
        <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
          Soldier progress will appear here once they start drills
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Team Performance Summary */}
      <View style={[styles.performanceCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.performanceHeader}>
          <BarChart3 size={16} color={colors.primary} />
          <Text style={[styles.performanceTitle, { color: colors.text }]}>Team Performance</Text>
        </View>
        <View style={styles.performanceGrid}>
          <View style={styles.perfItem}>
            <Text style={[styles.perfValue, { color: colors.text }]}>
              {stats.completed}/{stats.total}
            </Text>
            <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Completed all</Text>
          </View>
          <View style={[styles.perfDivider, { backgroundColor: colors.border }]} />
          <View style={styles.perfItem}>
            <Text
              style={[
                styles.perfValue,
                { color: stats.avgAccuracy && stats.avgAccuracy >= 70 ? colors.green : colors.text },
              ]}
            >
              {stats.avgAccuracy !== null ? `${stats.avgAccuracy}%` : '—'}
            </Text>
            <Text style={[styles.perfLabel, { color: colors.textMuted }]}>Team avg accuracy</Text>
          </View>
          {stats.topPerformer && (
            <>
              <View style={[styles.perfDivider, { backgroundColor: colors.border }]} />
              <View style={styles.perfItem}>
                <View style={styles.topPerformerRow}>
                  <Award size={14} color={colors.orange} />
                  <Text style={[styles.perfValue, { color: colors.text }]}>{stats.topPerformer.accuracy}%</Text>
                </View>
                <Text style={[styles.perfLabel, { color: colors.textMuted }]} numberOfLines={1}>
                  {stats.topPerformer.name.split(' ')[0]}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Overview Stats */}
      <View style={[styles.statsBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.green }]} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.active}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Active</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.completed}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Done</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
        <View style={styles.statItem}>
          <View style={[styles.statDot, { backgroundColor: colors.textMuted }]} />
          <Text style={[styles.statValue, { color: colors.text }]}>{stats.total}</Text>
          <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
        </View>
      </View>

      {/* View Toggle */}
      <View style={[styles.viewToggle, { backgroundColor: colors.secondary, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'soldiers' && [styles.toggleBtnActive, { backgroundColor: colors.card }],
          ]}
          onPress={() => setViewMode('soldiers')}
          activeOpacity={0.7}
        >
          <Users size={14} color={viewMode === 'soldiers' ? colors.text : colors.textMuted} />
          <Text style={[styles.toggleText, { color: viewMode === 'soldiers' ? colors.text : colors.textMuted }]}>
            Soldiers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === 'drills' && [styles.toggleBtnActive, { backgroundColor: colors.card }],
          ]}
          onPress={() => setViewMode('drills')}
          activeOpacity={0.7}
        >
          <Target size={14} color={viewMode === 'drills' ? colors.text : colors.textMuted} />
          <Text style={[styles.toggleText, { color: viewMode === 'drills' ? colors.text : colors.textMuted }]}>
            By Drill
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content based on view mode */}
      {viewMode === 'soldiers' ? (
        <Animated.View entering={FadeIn.duration(200)} style={styles.soldierList}>
          {soldiers.map((soldier, index) => (
            <SoldierRow key={soldier.id} soldier={soldier} totalDrills={drills.length} colors={colors} index={index} />
          ))}
        </Animated.View>
      ) : (
        <Animated.View entering={FadeIn.duration(200)} style={styles.drillsList}>
          {drillStats.map((drill, index) => (
            <DrillStatsRow
              key={drill.drillId}
              drill={drill}
              totalSoldiers={stats.total}
              colors={colors}
              index={index}
            />
          ))}
        </Animated.View>
      )}
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// SOLDIER ROW
// ═══════════════════════════════════════════════════════════════════════════

function SoldierRow({
  soldier,
  totalDrills,
  colors,
  index,
}: {
  soldier: SoldierStatus;
  totalDrills: number;
  colors: any;
  index: number;
}) {
  const isActive = soldier.status === 'active';
  const isAllDone = soldier.completedDrills === totalDrills && totalDrills > 0;
  const accuracy = soldier.totalShots > 0 ? Math.round((soldier.totalHits / soldier.totalShots) * 100) : null;

  const statusColor = isActive ? colors.green : isAllDone ? colors.primary : colors.textMuted;
  const StatusIcon = isActive ? Activity : isAllDone ? CheckCircle : Circle;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      style={[
        styles.soldierCard,
        {
          backgroundColor: isActive ? colors.green + '08' : colors.card,
          borderColor: isActive ? colors.green + '30' : colors.border,
        },
      ]}
    >
      {/* Status indicator & name */}
      <View style={styles.soldierHeader}>
        <View style={[styles.statusIcon, { backgroundColor: statusColor + '20' }]}>
          <StatusIcon size={14} color={statusColor} />
        </View>
        <View style={styles.soldierInfo}>
          <Text style={[styles.soldierName, { color: colors.text }]} numberOfLines={1}>
            {soldier.name}
          </Text>
          {isActive && soldier.currentDrill && (
            <Text style={[styles.currentDrill, { color: colors.green }]} numberOfLines={1}>
              {soldier.currentDrill}
            </Text>
          )}
          {!isActive && (
            <Text style={[styles.soldierStatus, { color: colors.textMuted }]}>
              {isAllDone ? 'All drills completed' : `${soldier.completedDrills}/${totalDrills} drills`}
            </Text>
          )}
        </View>
      </View>

      {/* Stats row */}
      <View style={styles.soldierStats}>
        <View style={styles.miniStat}>
          <Target size={12} color={colors.textMuted} />
          <Text style={[styles.miniStatText, { color: colors.text }]}>{soldier.totalShots}</Text>
        </View>
        {accuracy !== null && (
          <View style={styles.miniStat}>
            <TrendingUp size={12} color={accuracy >= 70 ? colors.green : colors.textMuted} />
            <Text style={[styles.miniStatText, { color: accuracy >= 70 ? colors.green : colors.text }]}>
              {accuracy}%
            </Text>
          </View>
        )}
        {soldier.bestGroup && (
          <View style={styles.miniStat}>
            <Crosshair size={12} color={colors.textMuted} />
            <Text style={[styles.miniStatText, { color: colors.text }]}>{soldier.bestGroup.toFixed(1)}cm</Text>
          </View>
        )}
        <View style={styles.miniStat}>
          <Clock size={12} color={colors.textMuted} />
          <Text style={[styles.miniStatText, { color: colors.text }]}>
            {soldier.completedDrills}/{totalDrills}
          </Text>
        </View>
      </View>

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: statusColor,
              width: `${totalDrills > 0 ? (soldier.completedDrills / totalDrills) * 100 : 0}%`,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// DRILL STATS ROW
// ═══════════════════════════════════════════════════════════════════════════

function DrillStatsRow({
  drill,
  totalSoldiers,
  colors,
  index,
}: {
  drill: DrillStats;
  totalSoldiers: number;
  colors: any;
  index: number;
}) {
  const completionRate = totalSoldiers > 0 ? Math.round((drill.completedBy / totalSoldiers) * 100) : 0;
  const isFullyCompleted = drill.completedBy === totalSoldiers && totalSoldiers > 0;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      style={[
        styles.drillStatsCard,
        {
          backgroundColor: isFullyCompleted ? colors.green + '08' : colors.card,
          borderColor: isFullyCompleted ? colors.green + '30' : colors.border,
        },
      ]}
    >
      <View style={styles.drillStatsHeader}>
        <View
          style={[styles.drillIcon, { backgroundColor: isFullyCompleted ? colors.green + '20' : colors.secondary }]}
        >
          <Target size={14} color={isFullyCompleted ? colors.green : colors.textMuted} />
        </View>
        <View style={styles.drillStatsInfo}>
          <Text style={[styles.drillName, { color: colors.text }]} numberOfLines={1}>
            {drill.name}
          </Text>
          <Text style={[styles.drillCompletion, { color: colors.textMuted }]}>
            {drill.completedBy}/{totalSoldiers} soldiers ({completionRate}%)
          </Text>
        </View>
        {isFullyCompleted && <CheckCircle size={18} color={colors.green} />}
      </View>

      {/* Drill stats */}
      {drill.completedBy > 0 && (
        <View style={styles.drillMetrics}>
          {drill.avgAccuracy !== null && (
            <View style={[styles.metricChip, { backgroundColor: colors.secondary }]}>
              <TrendingUp size={12} color={drill.avgAccuracy >= 70 ? colors.green : colors.textMuted} />
              <Text style={[styles.metricText, { color: colors.text }]}>Avg: {drill.avgAccuracy}%</Text>
            </View>
          )}
          {drill.bestAccuracy && (
            <View style={[styles.metricChip, { backgroundColor: colors.orange + '15' }]}>
              <Award size={12} color={colors.orange} />
              <Text style={[styles.metricText, { color: colors.text }]}>
                Best: {drill.bestAccuracy.value}% ({drill.bestAccuracy.name.split(' ')[0]})
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Progress bar */}
      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: isFullyCompleted ? colors.green : colors.primary,
              width: `${completionRate}%`,
            },
          ]}
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '600',
    marginTop: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    opacity: 0.7,
  },
  // Team Performance Card
  performanceCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
  },
  performanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  performanceTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  performanceGrid: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  perfItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  perfValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  perfLabel: {
    fontSize: 11,
    textAlign: 'center',
  },
  perfDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 8,
  },
  topPerformerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  // Stats Bar
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
  },
  statDivider: {
    width: 1,
    height: 20,
  },
  // View Toggle
  viewToggle: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 10,
  },
  toggleBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
  },
  toggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  toggleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // Soldier List
  soldierList: {
    gap: 8,
  },
  soldierCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  soldierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  statusIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  soldierInfo: {
    flex: 1,
    gap: 2,
  },
  soldierName: {
    fontSize: 15,
    fontWeight: '600',
  },
  currentDrill: {
    fontSize: 12,
    fontWeight: '500',
  },
  soldierStatus: {
    fontSize: 12,
  },
  soldierStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  miniStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  miniStatText: {
    fontSize: 13,
    fontWeight: '500',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  // Drills List
  drillsList: {
    gap: 8,
  },
  drillStatsCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    gap: 10,
  },
  drillStatsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  drillIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  drillStatsInfo: {
    flex: 1,
    gap: 2,
  },
  drillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  drillCompletion: {
    fontSize: 12,
  },
  drillMetrics: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metricChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  metricText: {
    fontSize: 12,
    fontWeight: '500',
  },
});
