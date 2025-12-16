import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import type { TrainingWithDetails } from '@/types/workspace';
import { differenceInMinutes, format, formatDistanceToNow, isFuture, isToday, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { Calendar, Clock, Crosshair, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ActivityTimelineProps {
  sessions: SessionWithDetails[];
  trainings: TrainingWithDetails[];
  onSessionPress?: (session: SessionWithDetails) => void;
  limit?: number;
}

type TimelineItem = {
  id: string;
  type: 'session' | 'training';
  date: Date;
  title: string;
  subtitle: string;
  details: string[];
  status: 'completed' | 'upcoming' | 'in_progress';
  data: SessionWithDetails | TrainingWithDetails;
};

export function ActivityTimeline({ sessions, trainings, onSessionPress, limit = 10 }: ActivityTimelineProps) {
  const colors = useColors();

  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Add sessions
    sessions.forEach((session) => {
      const date = new Date(session.started_at);
      const shots = session.stats?.shots_fired ?? 0;
      const hits = session.stats?.hits_total ?? 0;
      const accuracy = session.stats?.accuracy_pct ?? 0;
      const targets = session.stats?.target_count ?? 0;
      
      // Calculate duration
      let duration = '';
      if (session.ended_at) {
        const mins = differenceInMinutes(new Date(session.ended_at), date);
        if (mins >= 60) {
          duration = `${Math.floor(mins / 60)}h ${mins % 60}m`;
        } else {
          duration = `${mins}m`;
        }
      }

      // Build details array
      const details: string[] = [];
      if (session.status === 'ongoing') {
        details.push('In progress');
      } else {
        if (shots > 0) details.push(`${shots} shots`);
        if (hits > 0) details.push(`${hits} hits`);
        if (accuracy > 0) details.push(`${accuracy.toFixed(0)}%`);
        if (targets > 0) details.push(`${targets} target${targets !== 1 ? 's' : ''}`);
        if (duration) details.push(duration);
      }

      items.push({
        id: `session-${session.id}`,
        type: 'session',
        date,
        title: session.status === 'ongoing' ? 'Session in Progress' : 'Practice Session',
        subtitle: session.team?.name || 'Solo Practice',
        details,
        status: session.status === 'ongoing' ? 'in_progress' : 'completed',
        data: session,
      });
    });

    // Add upcoming trainings
    trainings.forEach((training) => {
      if (!training.scheduled_at) return;
      const date = new Date(training.scheduled_at);
      if (!isFuture(date)) return;

      const details: string[] = [];
      details.push(format(date, 'h:mm a'));
      if (training.team?.name) details.push(training.team.name);

      items.push({
        id: `training-${training.id}`,
        type: 'training',
        date,
        title: training.name || 'Team Training',
        subtitle: format(date, 'EEEE'),
        details,
        status: 'upcoming',
        data: training,
      });
    });

    // Sort by date
    items.sort((a, b) => {
      if (a.status === 'in_progress') return -1;
      if (b.status === 'in_progress') return 1;
      
      if (a.status === 'upcoming' && b.status === 'upcoming') {
        return a.date.getTime() - b.date.getTime();
      }
      if (a.status === 'upcoming') return -1;
      if (b.status === 'upcoming') return 1;
      
      return b.date.getTime() - a.date.getTime();
    });

    return items.slice(0, limit);
  }, [sessions, trainings, limit]);

  const formatDate = (date: Date, status: TimelineItem['status']) => {
    if (status === 'in_progress') return 'Now';
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    if (isFuture(date)) return formatDistanceToNow(date, { addSuffix: true });
    return format(date, 'MMM d');
  };

  const handlePress = (item: TimelineItem) => {
    if (item.type === 'session') {
      if (onSessionPress) {
        onSessionPress(item.data as SessionWithDetails);
      }
    } else {
      router.push(`/(protected)/trainingDetail?id=${(item.data as TrainingWithDetails).id}`);
    }
  };

  const getStatusColor = (status: TimelineItem['status']) => {
    switch (status) {
      case 'in_progress': return colors.orange;
      case 'upcoming': return colors.blue;
      case 'completed': return colors.green;
    }
  };

  const getIcon = (item: TimelineItem) => {
    const size = 18;

    if (item.status === 'in_progress') {
      return <Clock size={size} color="#fff" />;
    }
    if (item.status === 'upcoming') {
      return <Calendar size={size} color="#fff" />;
    }
    if (item.type === 'session') {
      return <Crosshair size={size} color="#fff" />;
    }
    return <Users size={size} color="#fff" />;
  };

  if (timelineItems.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.textMuted }]}>Recent Activity</Text>
      
      <View style={styles.timeline}>
        {timelineItems.map((item, index) => {
          const isLast = index === timelineItems.length - 1;
          const statusColor = getStatusColor(item.status);

          return (
            <TouchableOpacity
              key={item.id}
              style={styles.item}
              onPress={() => handlePress(item)}
              activeOpacity={0.7}
            >
              {/* Timeline line */}
              <View style={styles.lineContainer}>
                <View style={[styles.dot, { backgroundColor: statusColor }]}>
                  {getIcon(item)}
                </View>
                {!isLast && (
                  <View style={[styles.line, { backgroundColor: colors.border }]} />
                )}
              </View>

              {/* Content */}
              <View style={[styles.content, { borderBottomColor: isLast ? 'transparent' : colors.border }]}>
                <View style={styles.contentHeader}>
                  <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  <Text style={[styles.time, { color: colors.textMuted }]}>
                    {formatDate(item.date, item.status)}
                  </Text>
                </View>
                <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
                  {item.subtitle}
                </Text>

                {/* Details row */}
                {item.details.length > 0 && (
                  <View style={styles.detailsRow}>
                    {item.details.map((detail, i) => (
                      <View key={i} style={styles.detailItem}>
                        {i > 0 && <View style={[styles.detailDot, { backgroundColor: colors.border }]} />}
                        <Text style={[styles.detailText, { color: colors.textMuted }]}>
                          {detail}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  header: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 16,
  },
  timeline: {
    gap: 4,
  },
  item: {
    flexDirection: 'row',
    minHeight: 72,
  },
  lineContainer: {
    width: 36,
    alignItems: 'center',
  },
  dot: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    width: 2,
    flex: 1,
    marginTop: 4,
    marginBottom: 4,
  },
  content: {
    flex: 1,
    paddingLeft: 14,
    paddingBottom: 20,
    paddingTop: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  time: {
    fontSize: 13,
    marginLeft: 12,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  detailsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 8,
    gap: 4,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 6,
  },
  detailText: {
    fontSize: 13,
    fontWeight: '500',
  },
});




