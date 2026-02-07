/**
 * TeamContextBanner Component
 *
 * Minimal inline indicator for team mode - just shows team name.
 */

import type { TeamWithMembers } from '@/types/workspace';
import { getTeamColor } from '@/utils/teamColors';
import { Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

interface TeamContextBannerProps {
  team: TeamWithMembers;
  memberCount?: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
  };
}

export function TeamContextBanner({ team, memberCount, colors }: TeamContextBannerProps) {
  const teamColor = useMemo(() => getTeamColor(team.id), [team.id]);

  return (
    <View style={[s.container, { borderBottomColor: colors.border }]}>
      <View style={[s.indicator, { backgroundColor: teamColor }]} />
      <Users size={12} color={colors.textMuted} />
      <Text style={[s.label, { color: colors.textMuted }]}>Team</Text>
      <Text style={[s.teamName, { color: colors.text }]}>{team.name}</Text>
      {(memberCount ?? team.member_count) > 0 && (
        <Text style={[s.count, { color: colors.textMuted }]}>· {memberCount ?? team.member_count}</Text>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 10,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  indicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: '500',
  },
  teamName: {
    fontSize: 12,
    fontWeight: '600',
  },
  count: {
    fontSize: 11,
  },
});
