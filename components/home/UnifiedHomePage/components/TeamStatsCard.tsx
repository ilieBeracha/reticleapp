/**
 * TeamStatsCard Component
 *
 * Compact team statistics row - minimal and clean.
 */

import type { TeamWithMembers } from '@/types/workspace';
import { Calendar, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';

interface TeamStatsCardProps {
  team: TeamWithMembers;
  upcomingTrainingsCount: number;
  activeMembersCount?: number;
  weeklyTeamSessions?: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function TeamStatsCard({
  team,
  upcomingTrainingsCount,
  weeklyTeamSessions = 0,
  colors,
}: TeamStatsCardProps) {
  return (
    <View style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={s.stat}>
        <Users size={13} color={colors.textMuted} />
        <Text style={[s.value, { color: colors.text }]}>{team.member_count || 0}</Text>
        <Text style={[s.label, { color: colors.textMuted }]}>members</Text>
      </View>
      <View style={[s.divider, { backgroundColor: colors.border }]} />
      <View style={s.stat}>
        <Calendar size={13} color={colors.textMuted} />
        <Text style={[s.value, { color: colors.text }]}>{upcomingTrainingsCount}</Text>
        <Text style={[s.label, { color: colors.textMuted }]}>scheduled</Text>
      </View>
      <View style={[s.divider, { backgroundColor: colors.border }]} />
      <View style={s.stat}>
        <Target size={13} color={colors.textMuted} />
        <Text style={[s.value, { color: colors.text }]}>{weeklyTeamSessions}</Text>
        <Text style={[s.label, { color: colors.textMuted }]}>this week</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  stat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  value: {
    fontSize: 14,
    fontWeight: '700',
  },
  label: {
    fontSize: 10,
  },
  divider: {
    width: 1,
    height: 20,
  },
});
