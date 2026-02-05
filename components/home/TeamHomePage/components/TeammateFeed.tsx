/**
 * TeammateFeed Component
 *
 * Activity feed for members showing what teammates accomplished.
 * No rankings, no comparisons - just collaborative updates.
 */

import { Check, Users } from 'lucide-react-native';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface TeammateActivity {
  id: string;
  userName: string;
  action: string;
  timeAgo: string;
  shotCount: number;
  accuracy?: number;
}

interface TeammateFeedProps {
  activities: TeammateActivity[];
  teamTotalSessions: number;
  teamTotalShots: number;
  activeMembers: number;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    green: string;
  };
}

export function TeammateFeed({ activities, teamTotalSessions, teamTotalShots, activeMembers, colors }: TeammateFeedProps) {
  return (
    <Animated.View entering={FadeIn.delay(150)} style={s.container}>
      {/* Header with team totals */}
      <View style={s.header}>
        <Text style={[s.headerText, { color: colors.textMuted }]}>TEAM PROGRESS</Text>
        <View style={s.headerStats}>
          <Users size={10} color={colors.textMuted} />
          <Text style={[s.headerStatText, { color: colors.textMuted }]}>
            {activeMembers} active · {teamTotalSessions} sessions
          </Text>
        </View>
      </View>

      {/* Activity List */}
      <View style={[s.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activities.length > 0 ? (
          activities.map((activity, i) => (
            <View
              key={activity.id}
              style={[s.row, i < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
            >
              {/* Check icon */}
              <View style={[s.checkCircle, { backgroundColor: `${colors.green}15` }]}>
                <Check size={10} color={colors.green} strokeWidth={3} />
              </View>

              {/* Content */}
              <View style={s.content}>
                <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                  {activity.userName}
                </Text>
                <Text style={[s.detail, { color: colors.textMuted }]}>
                  completed {activity.shotCount > 0 ? `${activity.shotCount} shots` : 'a session'} · {activity.timeAgo}
                </Text>
              </View>
            </View>
          ))
        ) : (
          <View style={s.emptyRow}>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>No recent activity from teammates</Text>
          </View>
        )}

        {/* Team total footer */}
        {teamTotalShots > 0 && (
          <View style={[s.footer, { borderTopColor: colors.border }]}>
            <Text style={[s.footerText, { color: colors.textMuted }]}>
              Team total: <Text style={{ color: colors.text, fontWeight: '600' }}>{teamTotalShots}</Text> shots this week
            </Text>
          </View>
        )}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  headerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  headerStatText: {
    fontSize: 10,
    fontWeight: '500',
  },
  list: {
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
  },
  detail: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
  emptyRow: {
    padding: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 12,
    fontWeight: '400',
  },
  footer: {
    borderTopWidth: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  footerText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
