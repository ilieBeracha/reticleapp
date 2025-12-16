/**
 * Today's Summary Card
 * 
 * Shows today's training activity at a glance:
 * - Sessions today
 * - Shots fired
 * - Accuracy
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { isToday } from 'date-fns';
import { Calendar, Crosshair, Target, Zap } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TodaySummaryCardProps {
  sessions: SessionWithDetails[];
}

export function TodaySummaryCard({ sessions }: TodaySummaryCardProps) {
  const colors = useColors();

  const todayStats = useMemo(() => {
    const todaySessions = sessions.filter((s) => isToday(new Date(s.started_at)));
    
    let shots = 0;
    let hits = 0;
    let targets = 0;
    
    todaySessions.forEach((session) => {
      if (session.stats) {
        shots += session.stats.shots_fired;
        hits += session.stats.hits_total;
        targets += session.stats.target_count;
      }
    });
    
    const accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
    
    return {
      sessionCount: todaySessions.length,
      shots,
      hits,
      targets,
      accuracy,
    };
  }, [sessions]);

  const hasActivity = todayStats.sessionCount > 0;

  return (
    <Animated.View
      entering={FadeIn.duration(300)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBg, { backgroundColor: `${colors.green}22` }]}>
          <Calendar size={18} color={colors.green} />
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Today</Text>
        {hasActivity && (
          <View style={[styles.activeBadge, { backgroundColor: `${colors.green}22` }]}>
            <View style={[styles.activeDot, { backgroundColor: colors.green }]} />
            <Text style={[styles.activeText, { color: colors.green }]}>Active</Text>
          </View>
        )}
      </View>

      {hasActivity ? (
        <View style={styles.statsGrid}>
          <View style={styles.statItem}>
            <Target size={16} color={colors.indigo} />
            <Text style={[styles.statValue, { color: colors.text }]}>{todayStats.sessionCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              session{todayStats.sessionCount !== 1 ? 's' : ''}
            </Text>
          </View>
          
          <View style={[styles.statItem, styles.statDivider, { borderColor: colors.border }]}>
            <Crosshair size={16} color={colors.purple} />
            <Text style={[styles.statValue, { color: colors.text }]}>{todayStats.shots}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>shots</Text>
          </View>
          
          <View style={[styles.statItem, styles.statDivider, { borderColor: colors.border }]}>
            <Zap size={16} color={colors.orange} />
            <Text style={[styles.statValue, { color: colors.text }]}>{todayStats.accuracy}%</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>accuracy</Text>
          </View>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No training yet today
          </Text>
          <Text style={[styles.emptySubtext, { color: colors.textMuted }]}>
            Start a session to track your progress
          </Text>
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
  },
  iconBg: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
    flex: 1,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  activeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 6,
  },
  statDivider: {
    borderLeftWidth: 1,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    fontWeight: '500',
  },
});




