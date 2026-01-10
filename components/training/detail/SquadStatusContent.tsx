/**
 * SquadStatusContent Component
 * Shows real-time soldier status and progress during training
 */

import type { SessionWithDetails } from '@/services/session/types';
import {
  Activity,
  CheckCircle,
  Circle,
  Clock,
  Target,
  User,
} from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

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
  lastActivity?: Date;
}

export function SquadStatusContent({
  teamSessions,
  drills,
  drillProgress,
  colors,
}: SquadStatusContentProps) {
  // Process soldier status from sessions
  const soldiers = useMemo<SoldierStatus[]>(() => {
    if (!teamSessions.length) return [];

    const soldierMap = new Map<string, SoldierStatus>();

    teamSessions.forEach((session) => {
      const existing = soldierMap.get(session.user_id);
      const shots = session.stats?.shots_fired ?? 0;
      const hits = session.stats?.hits_total ?? 0;
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
          lastActivity: session.ended_at ? new Date(session.ended_at) : session.started_at ? new Date(session.started_at) : undefined,
        });
      } else {
        existing.totalShots += shots;
        existing.totalHits += hits;
        if (isCompleted) existing.completedDrills++;
        if (isActive) {
          existing.status = 'active';
          existing.currentDrill = session.drill_name || session.drill_config?.name;
        }
        // Update last activity
        const sessionTime = session.ended_at ? new Date(session.ended_at) : session.started_at ? new Date(session.started_at) : null;
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

  // Count stats
  const stats = useMemo(() => {
    const active = soldiers.filter(s => s.status === 'active').length;
    const completed = soldiers.filter(s => s.completedDrills === drills.length && s.completedDrills > 0).length;
    const total = soldiers.length;
    return { active, completed, total };
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

      {/* Soldier List */}
      <View style={styles.soldierList}>
        {soldiers.map((soldier, index) => (
          <SoldierRow
            key={soldier.id}
            soldier={soldier}
            totalDrills={drills.length}
            colors={colors}
            index={index}
          />
        ))}
      </View>
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
  const accuracy = soldier.totalShots > 0 
    ? Math.round((soldier.totalHits / soldier.totalShots) * 100) 
    : null;

  const statusColor = isActive ? colors.green : isAllDone ? colors.primary : colors.textMuted;
  const StatusIcon = isActive ? Activity : isAllDone ? CheckCircle : Circle;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 50).duration(200)}
      style={[
        styles.soldierCard,
        { 
          backgroundColor: isActive ? colors.green + '08' : colors.card, 
          borderColor: isActive ? colors.green + '30' : colors.border 
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
          <Text style={[styles.miniStatText, { color: colors.text }]}>
            {soldier.totalShots}
          </Text>
        </View>
        {accuracy !== null && (
          <View style={styles.miniStat}>
            <CheckCircle size={12} color={colors.textMuted} />
            <Text style={[styles.miniStatText, { color: colors.text }]}>
              {accuracy}%
            </Text>
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
    gap: 16,
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
});
