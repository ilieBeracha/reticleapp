/**
 * TeamMemberActivity Component
 *
 * Compact activity log with minimal styling.
 */

import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

interface ActivityItem {
  id: string;
  userName: string;
  action: string;
  timeAgo: string;
  shotCount: number;
  accuracy?: number;
}

interface TeamMemberActivityProps {
  activities: ActivityItem[];
  teamColor: string;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
  };
}

export function TeamMemberActivity({ activities, teamColor, colors }: TeamMemberActivityProps) {
  return (
    <Animated.View entering={FadeIn.delay(200)} style={s.container}>
      {/* Header */}
      <Text style={[s.headerText, { color: colors.textMuted }]}>ACTIVITY</Text>

      {/* Activity List */}
      <View style={[s.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {activities.map((activity, i) => (
          <View key={activity.id} style={[s.row, i < activities.length - 1 && { borderBottomWidth: 1, borderBottomColor: colors.border }]}>
            {/* Initial */}
            <View style={[s.initial, { backgroundColor: colors.border }]}>
              <Text style={[s.initialText, { color: colors.text }]}>{activity.userName.charAt(0).toUpperCase()}</Text>
            </View>

            {/* Content */}
            <View style={s.content}>
              <View style={s.topRow}>
                <Text style={[s.name, { color: colors.text }]} numberOfLines={1}>
                  {activity.userName}
                </Text>
                <Text style={[s.time, { color: colors.textMuted }]}>{activity.timeAgo}</Text>
              </View>
              <Text style={[s.action, { color: colors.textMuted }]}>
                {activity.shotCount > 0 ? `${activity.shotCount} shots` : activity.action}
                {activity.accuracy ? ` · ${Math.round(activity.accuracy)}%` : ''}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 6,
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
  initial: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  initialText: {
    fontSize: 11,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  time: {
    fontSize: 10,
    fontWeight: '400',
  },
  action: {
    fontSize: 11,
    fontWeight: '400',
    marginTop: 1,
  },
});
