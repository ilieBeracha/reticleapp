/**
 * TeamActivityCard Component
 *
 * Compact activity feed. Clean list, minimal decoration.
 */

import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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

export function TeamActivityCard({ activities, colors }: TeamActivityCardProps) {
  const { t } = useTranslation();

  if (activities.length === 0) {
    return (
      <Animated.View entering={FadeIn.duration(200)}>
        <View style={[s.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="pulse-outline" size={16} color={colors.textMuted} />
          <Text style={[s.emptyText, { color: colors.textMuted }]}>{t('teamHome.noActivityYet')}</Text>
        </View>
      </Animated.View>
    );
  }

  const visibleActivities = activities.slice(0, 5);

  return (
    <Animated.View entering={FadeIn.duration(200)}>
      <View style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleActivities.map((activity, i) => {
          const isLast = i === visibleActivities.length - 1;
          const hasGrouping = activity.groupingCm != null && activity.groupingCm > 0;
          const hasAccuracy = activity.accuracy != null && activity.accuracy > 0;

          return (
            <View key={activity.id}>
              <View style={s.row}>
                {/* Avatar */}
                <View style={[s.avatar, { backgroundColor: colors.border }]}>
                  <Text style={[s.avatarText, { color: colors.text }]}>{activity.userName.charAt(0)}</Text>
                </View>

                {/* Content */}
                <View style={s.content}>
                  <Text style={[s.userName, { color: colors.text }]} numberOfLines={1}>{activity.userName}</Text>
                  <Text style={[s.detail, { color: colors.textMuted }]} numberOfLines={1}>{activity.detail}</Text>
                </View>

                {/* Meta */}
                <View style={s.meta}>
                  {hasGrouping && (
                    <Text style={[s.metric, { color: colors.blue }]}>{activity.groupingCm!.toFixed(1)}cm</Text>
                  )}
                  {!hasGrouping && hasAccuracy && (
                    <Text style={[s.metric, { color: colors.green }]}>{Math.round(activity.accuracy!)}%</Text>
                  )}
                  <Text style={[s.timeAgo, { color: colors.textMuted }]}>{activity.timestamp}</Text>
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
  card: { borderRadius: 8, borderWidth: 1, overflow: 'hidden', marginBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 10, gap: 10 },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 11, fontWeight: '600' },
  content: { flex: 1, gap: 1 },
  userName: { fontSize: 13, fontWeight: '500' },
  detail: { fontSize: 11 },
  meta: { alignItems: 'flex-end', gap: 1 },
  metric: { fontSize: 11, fontWeight: '600' },
  timeAgo: { fontSize: 10 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 48 },
  emptyCard: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 8, borderWidth: 1, gap: 8, marginBottom: 10 },
  emptyText: { fontSize: 12 },
});
