import { useOrgRole } from '@/contexts/OrgRoleContext';
import { useColors } from '@/hooks/ui/useColors';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useMemo, useState } from 'react';
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

// Memoized session card component
const SessionCard = React.memo(function SessionCard({
  session,
  onPress,
  colors,
}: {
  session: TrainingSession;
  onPress: (session: TrainingSession) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <TouchableOpacity
      style={[styles.sessionCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => onPress(session)}
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
  );
});

/**
 * TRAINING SESSIONS VIEW
 * For Squad Commanders and Soldiers - shooting-focused operational view
 */
const TrainingsPage = React.memo(function TrainingsPage() {
  const colors = useColors();
  const { teamInfo, teamRole } = useOrgRole();
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

  const handleSessionPress = useCallback((session: TrainingSession) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(session.title, `${session.date} at ${session.time}\n${session.location || ''}`);
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header & Tabs - Fixed at top */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Training Sessions</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {teamInfo?.teamName || 'Organization'}
            </Text>
          </View>
        </View>

        {/* Filter Tabs */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tab, filter === 'upcoming' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('upcoming');
            }}
            activeOpacity={0.9}
          >
            <Ionicons 
              name="time" 
              size={16} 
              color={filter === 'upcoming' ? colors.text : colors.textMuted} 
            />
            <Text style={[styles.tabText, { color: filter === 'upcoming' ? colors.text : colors.textMuted }]}>
              Upcoming
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, filter === 'completed' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('completed');
            }}
            activeOpacity={0.9}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={16} 
              color={filter === 'completed' ? colors.text : colors.textMuted} 
            />
            <Text style={[styles.tabText, { color: filter === 'completed' ? colors.text : colors.textMuted }]}>
              Completed
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, filter === 'missed' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setFilter('missed');
            }}
            activeOpacity={0.9}
          >
            <Ionicons 
              name="close-circle" 
              size={16} 
              color={filter === 'missed' ? colors.text : colors.textMuted} 
            />
            <Text style={[styles.tabText, { color: filter === 'missed' ? colors.text : colors.textMuted }]}>
              Missed
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
          <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={styles.emptyIcon} />
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
            <SessionCard
              key={session.id}
              session={session}
              onPress={handleSessionPress}
              colors={colors}
            />
          ))}
        </View>
      )}
      </ScrollView>
    </View>
  );
});

export default TrainingsPage;

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
    range: { color: '#FF6B35', bg: '#FF6B3515' },
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
  headerContainer: {
    paddingTop: Platform.OS === 'ios' ? 16 : 20,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTop: {
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  tabsContainer: {
    flexDirection: 'row',
    padding: 3,
    borderRadius: 10,
    height: 36,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderRadius: 8,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
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
  emptyIcon: {
    opacity: 0.4,
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

