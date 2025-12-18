/**
 * Activity Timeline
 * 
 * Shows a session-centric timeline. No "training" concept.
 * 
 * Displays:
 * - Active session (in progress)
 * - Upcoming scheduled sessions (from trainings, but shown as "Team Session")
 * - Past sessions
 */
import { useColors } from '@/hooks/ui/useColors';
import { differenceInMinutes, format, formatDistanceToNow, isFuture, isToday, isYesterday } from 'date-fns';
import { router } from 'expo-router';
import { Clock, Crosshair, Users } from 'lucide-react-native';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import type { HomeSession } from '../types';

interface ActivityTimelineProps {
  sessions: HomeSession[];
  onSessionPress?: (session: HomeSession) => void;
  limit?: number;
}

export function ActivityTimeline({ sessions, onSessionPress, limit = 10 }: ActivityTimelineProps) {
  const colors = useColors();

  // Sort and limit sessions
  const sortedSessions = useMemo(() => {
    const sorted = [...sessions].sort((a, b) => {
      // Active first
      if (a.state === 'active') return -1;
      if (b.state === 'active') return 1;
      
      // Scheduled next (by scheduled time ascending)
      if (a.state === 'scheduled' && b.state === 'scheduled') {
        const aTime = a.scheduledAt?.getTime() ?? 0;
        const bTime = b.scheduledAt?.getTime() ?? 0;
        return aTime - bTime;
      }
      if (a.state === 'scheduled') return -1;
      if (b.state === 'scheduled') return 1;
      
      // Completed last (by ended time descending)
      const aTime = a.endedAt?.getTime() ?? a.startedAt?.getTime() ?? 0;
      const bTime = b.endedAt?.getTime() ?? b.startedAt?.getTime() ?? 0;
      return bTime - aTime;
    });
    
    return sorted.slice(0, limit);
  }, [sessions, limit]);

  // Separate into upcoming and past
  const upcomingSessions = useMemo(() => 
    sortedSessions.filter(s => s.state === 'active' || s.state === 'scheduled'),
    [sortedSessions]
  );
  
  const pastSessions = useMemo(() => 
    sortedSessions.filter(s => s.state === 'completed' || s.state === 'unreviewed'),
    [sortedSessions]
  );

  const handlePress = (session: HomeSession) => {
    if (onSessionPress) {
      onSessionPress(session);
      return;
    }
    
    // Default navigation
    if (session.sourceSession) {
      router.push(`/(protected)/sessionDetail?sessionId=${session.sourceSession.id}`);
    } else if (session.sourceTraining) {
      // Navigate to training detail (will become live session when started)
      router.push(`/(protected)/trainingDetail?id=${session.sourceTraining.id}`);
    }
  };

  const formatTime = (session: HomeSession) => {
    if (session.state === 'active') return 'Now';
    
    if (session.state === 'scheduled' && session.scheduledAt) {
      if (isToday(session.scheduledAt)) return format(session.scheduledAt, 'h:mm a');
      if (isFuture(session.scheduledAt)) return formatDistanceToNow(session.scheduledAt, { addSuffix: true });
    }
    
    const date = session.endedAt ?? session.startedAt;
    if (!date) return '';
    if (isToday(date)) return format(date, 'h:mm a');
    if (isYesterday(date)) return 'Yesterday';
    return format(date, 'MMM d');
  };

  const getStatusColor = (state: HomeSession['state']) => {
    switch (state) {
      case 'active': return colors.orange;
      case 'scheduled': return colors.blue;
      case 'unreviewed': return colors.yellow;
      case 'completed': return colors.green;
    }
  };

  const getIcon = (session: HomeSession) => {
    const size = 18;
    if (session.state === 'active') {
      return <Clock size={size} color="#fff" />;
    }
    if (session.origin === 'team') {
      return <Users size={size} color="#fff" />;
    }
    return <Crosshair size={size} color="#fff" />;
  };

  const getTitle = (session: HomeSession) => {
    if (session.state === 'active') {
      return session.origin === 'team' ? 'Team Session' : 'Session in Progress';
    }
    if (session.state === 'scheduled') {
      return session.origin === 'team' ? 'Team Session' : 'Scheduled Session';
    }
    // Completed/unreviewed
    return session.origin === 'team' ? 'Team Session' : 'Practice Session';
  };

  const getSubtitle = (session: HomeSession) => {
    if (session.drillName) return session.drillName;
    if (session.teamName) return session.teamName;
    return session.origin === 'team' ? 'Team' : 'Solo Practice';
  };

  const getDetails = (session: HomeSession): string[] => {
    const details: string[] = [];
    
    if (session.state === 'active') {
      details.push('In progress');
      return details;
    }
    
    if (session.state === 'scheduled' && session.scheduledAt) {
      details.push(format(session.scheduledAt, 'h:mm a'));
      if (session.teamName) details.push(session.teamName);
      return details;
    }
    
    // Completed session stats
    if (session.stats) {
      if (session.stats.shots > 0) details.push(`${session.stats.shots} shots`);
      if (session.stats.hits > 0) details.push(`${session.stats.hits} hits`);
      if (session.stats.accuracy > 0) details.push(`${session.stats.accuracy}%`);
      if (session.stats.targets > 0) details.push(`${session.stats.targets} target${session.stats.targets !== 1 ? 's' : ''}`);
    }
    
    // Duration for completed
    if (session.startedAt && session.endedAt) {
      const mins = differenceInMinutes(session.endedAt, session.startedAt);
      if (mins >= 60) {
        details.push(`${Math.floor(mins / 60)}h ${mins % 60}m`);
      } else if (mins > 0) {
        details.push(`${mins}m`);
      }
    }
    
    return details;
  };

  if (sortedSessions.length === 0) {
    return null;
  }

  const renderItem = (session: HomeSession, index: number, isLast: boolean) => {
    const statusColor = getStatusColor(session.state);
    const details = getDetails(session);

    return (
      <TouchableOpacity
        key={session.id}
        style={styles.item}
        onPress={() => handlePress(session)}
        activeOpacity={0.7}
      >
        {/* Timeline line */}
        <View style={styles.lineContainer}>
          <View style={[styles.dot, { backgroundColor: statusColor }]}>
            {getIcon(session)}
          </View>
          {!isLast && (
            <View style={[styles.line, { backgroundColor: colors.border }]} />
          )}
        </View>

        {/* Content */}
        <View style={[styles.content, { borderBottomColor: isLast ? 'transparent' : colors.border }]}>
          <View style={styles.contentHeader}>
            <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
              {getTitle(session)}
            </Text>
            <Text style={[styles.time, { color: colors.textMuted }]}>
              {formatTime(session)}
            </Text>
          </View>
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {getSubtitle(session)}
          </Text>

          {/* Details row */}
          {details.length > 0 && (
            <View style={styles.detailsRow}>
              {details.map((detail, i) => (
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
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.header, { color: colors.textMuted }]}>Activity</Text>
      
      {/* Upcoming Section */}
      {upcomingSessions.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.blue }]} />
            <Text style={[styles.sectionLabel, { color: colors.blue }]}>Upcoming</Text>
          </View>
          <View style={styles.timeline}>
            {upcomingSessions.map((session, index) => 
              renderItem(session, index, index === upcomingSessions.length - 1)
            )}
          </View>
        </View>
      )}

      {/* Past Section */}
      {pastSessions.length > 0 && (
        <View style={[styles.section, upcomingSessions.length > 0 && styles.sectionSpacing]}>
          <View style={styles.sectionHeader}>
            <View style={[styles.sectionDot, { backgroundColor: colors.textMuted }]} />
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Past</Text>
          </View>
          <View style={styles.timeline}>
            {pastSessions.map((session, index) => 
              renderItem(session, index, index === pastSessions.length - 1)
            )}
          </View>
        </View>
      )}
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
  section: {},
  sectionSpacing: {
    marginTop: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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

