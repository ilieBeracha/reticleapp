/**
 * TeamActivityCard Component
 *
 * Compact card showing recent team member activity.
 * Used as tab content in the quick actions area.
 */

import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface ActivityItem {
  id: string;
  userName: string;
  type: 'session' | 'training';
  detail: string;
  timestamp: string;
  accuracy?: number;
  groupingCm?: number | null;
}

interface ActivityColors {
  text: string;
  textMuted: string;
  card: string;
  border: string;
  green: string;
  blue: string;
  secondary: string;
}

interface TeamActivityCardProps {
  activities: ActivityItem[];
  colors: ActivityColors;
}

/** Renders grouping (cm) or accuracy (%) based on activity type */
function ActivityMetric({ activity, colors }: { activity: ActivityItem; colors: ActivityColors }) {
  const hasGrouping = activity.groupingCm != null && activity.groupingCm > 0;
  const hasAccuracy = activity.accuracy != null && activity.accuracy > 0;

  if (hasGrouping) {
    return (
      <Text style={[s.accuracy, { color: colors.blue }]}>
        {activity.groupingCm!.toFixed(1)} cm
      </Text>
    );
  }

  if (hasAccuracy) {
    return (
      <Text style={[s.accuracy, { color: colors.green }]}>
        {Math.round(activity.accuracy!)}%
      </Text>
    );
  }

  return null;
}

export function TeamActivityCard({ activities, colors }: TeamActivityCardProps) {
  if (activities.length === 0) {
    return (
      <Animated.View entering={FadeInDown.duration(250)}>
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[s.emptyIcon, { backgroundColor: colors.secondary }]}>
            <Ionicons name="pulse-outline" size={18} color={colors.textMuted} />
          </View>
          <View style={s.emptyContent}>
            <Text style={[s.emptyTitle, { color: colors.text }]}>No activity yet</Text>
            <Text style={[s.emptyText, { color: colors.textMuted }]}>
              Team member sessions will appear here
            </Text>
          </View>
        </View>
      </Animated.View>
    );
  }

  const visibleActivities = activities.slice(0, 5);

  return (
    <Animated.View entering={FadeInDown.duration(250)}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleActivities.map((activity, i) => {
          const timeAgo = activity.timestamp; // Already formatted (e.g. "2h ago")
          const initial = activity.userName.charAt(0).toUpperCase();
          const isLast = i === visibleActivities.length - 1;

          return (
            <View key={activity.id}>
              <View style={s.row}>
                {/* Avatar */}
                <View style={[s.avatar, { backgroundColor: colors.blue + '20' }]}>
                  <Text style={[s.avatarText, { color: colors.blue }]}>{initial}</Text>
                </View>

                {/* Info */}
                <View style={s.info}>
                  <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>
                    {activity.userName}
                  </Text>
                  <Text style={[s.detail, { color: colors.textMuted }]} numberOfLines={1}>
                    {activity.detail}
                  </Text>
                </View>

                {/* Meta */}
                <View style={s.meta}>
                  <ActivityMetric activity={activity} colors={colors} />
                  <Text style={[s.timeAgo, { color: colors.textMuted }]}>{timeAgo}</Text>
                </View>
              </View>

              {!isLast && <View style={[s.divider, { backgroundColor: colors.border }]} />}
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  info: {
    flex: 1,
    gap: 1,
  },
  userName: {
    fontSize: 13,
    fontWeight: '600',
  },
  detail: {
    fontSize: 11,
    fontWeight: '400',
  },
  meta: {
    alignItems: 'flex-end',
    gap: 1,
  },
  accuracy: {
    fontSize: 12,
    fontWeight: '700',
  },
  timeAgo: {
    fontSize: 10,
    fontWeight: '400',
  },
  divider: {
    height: 1,
    marginLeft: 50,
  },
  emptyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 12,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContent: { gap: 2 },
  emptyTitle: { fontSize: 13, fontWeight: '600' },
  emptyText: { fontSize: 11 },
});
