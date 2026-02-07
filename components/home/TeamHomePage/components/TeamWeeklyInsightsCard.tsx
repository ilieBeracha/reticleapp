/**
 * TeamWeeklyInsightsCard Component
 *
 * Compact card showing this week's team stats.
 * Used as tab content in the quick actions area.
 */

import { ChevronRight, Crosshair, Target, TrendingUp, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface TeamWeeklyInsightsCardProps {
  sessions: number;
  shots: number;
  accuracy: number;
  activeMembers: number;
  totalMembers: number;
  weeklyGoal: number;
  onViewDetails: () => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
    primary: string;
    blue: string;
    orange: string;
    secondary: string;
  };
}

export function TeamWeeklyInsightsCard({
  sessions,
  shots,
  accuracy,
  activeMembers,
  totalMembers,
  weeklyGoal,
  onViewDetails,
  colors,
}: TeamWeeklyInsightsCardProps) {
  const participationRate = totalMembers > 0 ? Math.round((activeMembers / totalMembers) * 100) : 0;
  const goalProgress = weeklyGoal > 0 ? Math.min(Math.round((sessions / weeklyGoal) * 100), 100) : 0;

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <TouchableOpacity
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={onViewDetails}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={s.header}>
          <Text style={[s.headerText, { color: colors.text }]}>This Week</Text>
          <View style={s.headerRight}>
            {goalProgress > 0 && (
              <View style={[s.goalBadge, { backgroundColor: goalProgress >= 100 ? colors.green + '15' : colors.secondary }]}>
                <Text style={[s.goalText, { color: goalProgress >= 100 ? colors.green : colors.textMuted }]}>
                  {goalProgress}% goal
                </Text>
              </View>
            )}
            <ChevronRight size={14} color={colors.textMuted} style={{ opacity: 0.5 }} />
          </View>
        </View>

        {/* Stats Grid */}
        <View style={s.statsGrid}>
          <StatItem
            icon={<Target size={13} color={colors.primary} />}
            value={sessions.toString()}
            label="sessions"
            colors={colors}
          />
          <StatItem
            icon={<Crosshair size={13} color={colors.orange} />}
            value={shots > 0 ? shots.toLocaleString() : '—'}
            label="shots"
            colors={colors}
          />
          <StatItem
            icon={<TrendingUp size={13} color={colors.green} />}
            value={accuracy > 0 ? `${Math.round(accuracy)}%` : '—'}
            label="accuracy"
            colors={colors}
          />
          <StatItem
            icon={<Users size={13} color={colors.blue} />}
            value={`${participationRate}%`}
            label="active"
            colors={colors}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function StatItem({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  colors: { text: string; textMuted: string };
}) {
  return (
    <View style={s.stat}>
      <View style={s.statHeader}>
        {icon}
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 12,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  goalBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  goalText: {
    fontSize: 10,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: 'rgba(128, 128, 128, 0.05)',
    borderRadius: 8,
    padding: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
});
