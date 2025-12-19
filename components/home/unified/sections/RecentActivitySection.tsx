import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { ChevronRight, Target, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { styles } from '../styles';

export function RecentActivitySection({
  colors,
  sessions,
  onSessionPress,
}: {
  colors: ReturnType<typeof useColors>;
  sessions: SessionWithDetails[];
  onSessionPress: (session: SessionWithDetails) => void;
}) {
  const recentSessions = useMemo(() => {
    return sessions
      .filter((s) => s.status === 'completed')
      .sort((a, b) => new Date(b.ended_at || b.started_at).getTime() - new Date(a.ended_at || a.started_at).getTime())
      .slice(0, 5);
  }, [sessions]);

  if (recentSessions.length === 0) return null;

  const formatSessionTime = (session: SessionWithDetails) => {
    const date = new Date(session.ended_at || session.started_at);
    if (isToday(date)) return `Today, ${format(date, 'HH:mm')}`;
    if (isYesterday(date)) return `Yesterday, ${format(date, 'HH:mm')}`;
    return format(date, 'MMM d, HH:mm');
  };

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        <TouchableOpacity>
          <Text style={[styles.seeAllText, { color: colors.indigo }]}>See all</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.activityList}>
        {recentSessions.map((session, index) => (
          <Animated.View key={session.id} entering={FadeInRight.delay(index * 50).duration(300)}>
            <TouchableOpacity
              style={[styles.activityItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onSessionPress(session);
              }}
              activeOpacity={0.8}
            >
              <View
                style={[styles.activityIcon, { backgroundColor: session.team_id ? `${colors.green}22` : `${colors.indigo}22` }]}
              >
                {session.team_id ? <Users size={14} color={colors.green} /> : <Target size={14} color={colors.indigo} />}
              </View>
              <View style={styles.activityContent}>
                <Text style={[styles.activityTitle, { color: colors.text }]} numberOfLines={1}>
                  {session.drill_name || session.training_title || 'Solo Practice'}
                </Text>
                <Text style={[styles.activityMeta, { color: colors.textMuted }]}>
                  {session.team_name || 'Personal'} • {formatSessionTime(session)}
                </Text>
              </View>
              <ChevronRight size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </Animated.View>
        ))}
      </View>
    </View>
  );
}


