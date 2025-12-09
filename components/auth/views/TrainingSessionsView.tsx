import { useColors } from '@/hooks/ui/useColors';
import { useActiveTeam, useMyTeamRole } from '@/store/teamStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import {
    Alert,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

type SessionType = 'upcoming' | 'completed' | 'missed';

interface TrainingSession {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'range' | 'tactical' | 'qualification' | 'drill';
  status: SessionType;
  location?: string;
}

/**
 * TRAINING SESSIONS VIEW
 * For Squad Commanders and Soldiers - shooting-focused operational view
 */
export default function TrainingSessionsView() {
  const colors = useColors();
  const { teamName } = useActiveTeam();
  const myRole = useMyTeamRole();
  const [filter, setFilter] = useState<SessionType>('upcoming');

  // TODO: Fetch real training sessions
  const sessions: TrainingSession[] = useMemo(() => [
    {
      id: '1',
      title: 'Live Fire Qualification',
      date: 'Nov 25, 2025',
      time: '08:00 AM',
      type: 'qualification',
      status: 'upcoming',
      location: 'Range A',
    },
    {
      id: '2',
      title: 'CQB Tactics Training',
      date: 'Nov 26, 2025',
      time: '10:00 AM',
      type: 'tactical',
      status: 'upcoming',
      location: 'Training Facility',
    },
  ], []);

  const filteredSessions = sessions.filter(s => s.status === filter);

  const handleSessionPress = (session: TrainingSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(session.title, `${session.date} at ${session.time}\n${session.location || ''}`);
  };

  const roleLabel = myRole === 'squad_commander' ? 'Squad Commander' : 'Soldier';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Training Sessions</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {teamName || 'Your Team'} • {roleLabel}
        </Text>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabs, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'upcoming' && { backgroundColor: '#7C3AED' + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('upcoming');
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="time" 
            size={16} 
            color={filter === 'upcoming' ? '#7C3AED' : colors.textMuted} 
          />
          <Text style={[
            styles.filterTabText,
            { color: filter === 'upcoming' ? '#7C3AED' : colors.textMuted }
          ]}>
            Upcoming
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'completed' && { backgroundColor: '#34C759' + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('completed');
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="checkmark-circle" 
            size={16} 
            color={filter === 'completed' ? '#34C759' : colors.textMuted} 
          />
          <Text style={[
            styles.filterTabText,
            { color: filter === 'completed' ? '#34C759' : colors.textMuted }
          ]}>
            Completed
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterTab,
            filter === 'missed' && { backgroundColor: '#FF3B30' + '15' }
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilter('missed');
          }}
          activeOpacity={0.7}
        >
          <Ionicons 
            name="close-circle" 
            size={16} 
            color={filter === 'missed' ? '#FF3B30' : colors.textMuted} 
          />
          <Text style={[
            styles.filterTabText,
            { color: filter === 'missed' ? '#FF3B30' : colors.textMuted }
          ]}>
            Missed
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>No {filter} sessions</Text>
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            {filter === 'upcoming' && 'No training sessions scheduled'}
            {filter === 'completed' && 'Complete your first training session'}
            {filter === 'missed' && 'Great job! No missed sessions'}
          </Text>
        </View>
      ) : (
        <View style={styles.sessionsList}>
          {filteredSessions.map((session) => (
            <TouchableOpacity
              key={session.id}
              style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
              onPress={() => handleSessionPress(session)}
              activeOpacity={0.7}
            >
              <View style={[styles.sessionIcon, { backgroundColor: getTypeColor(session.type).bg }]}>
                <Ionicons name={getTypeIcon(session.type)} size={24} color={getTypeColor(session.type).color} />
              </View>

              <View style={styles.sessionInfo}>
                <Text style={[styles.sessionTitle, { color: colors.text }]}>{session.title}</Text>
                <View style={styles.sessionMeta}>
                  <View style={styles.sessionMetaItem}>
                    <Ionicons name="calendar-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>{session.date}</Text>
                  </View>
                  <View style={styles.sessionMetaItem}>
                    <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                    <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>{session.time}</Text>
                  </View>
                  {session.location && (
                    <View style={styles.sessionMetaItem}>
                      <Ionicons name="location-outline" size={12} color={colors.textMuted} />
                      <Text style={[styles.sessionMetaText, { color: colors.textMuted }]}>{session.location}</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={[styles.sessionTypeBadge, { backgroundColor: getTypeColor(session.type).bg }]}>
                <Text style={[styles.sessionTypeText, { color: getTypeColor(session.type).color }]}>
                  {session.type}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

function getTypeIcon(type: string) {
  const icons: Record<string, any> = {
    range: 'radio-button-on',
    tactical: 'shield',
    qualification: 'ribbon',
    drill: 'fitness',
  };
  return icons[type] || 'calendar';
}

function getTypeColor(type: string) {
  const colors = {
    range: { color: '#7C3AED', bg: '#7C3AED15' },
    tactical: { color: '#5B7A8C', bg: '#5B7A8C15' },
    qualification: { color: '#FFD60A', bg: '#FFD60A15' },
    drill: { color: '#34C759', bg: '#34C75915' },
  };
  return colors[type as keyof typeof colors] || colors.range;
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },

  // Header
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },

  // Filter Tabs
  filterTabs: {
    flexDirection: 'row',
    padding: 4,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 20,
    gap: 4,
  },
  filterTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 4,
  },
  filterTabText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Sessions List
  sessionsList: {
    gap: 12,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  sessionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 6,
  },
  sessionTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  sessionMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sessionMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  sessionMetaText: {
    fontSize: 12,
    fontWeight: '500',
  },
  sessionTypeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  sessionTypeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    padding: 40,
    borderRadius: 16,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
  },
});
