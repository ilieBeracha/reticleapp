import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent, getTodayString } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useMemo, useState } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeInLeft,
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from 'react-native-reanimated';

type EventFilter = 'all' | 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';

export default function CalendarDemoScreen() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [showStats, setShowStats] = useState(true);

  // Generate more realistic sample events
  const generateSampleEvents = (): CalendarEvent[] => {
    const events: CalendarEvent[] = [];
    const today = new Date();
    
    // Past events (last 2 weeks)
    for (let i = 14; i > 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (i % 3 === 0) {
        events.push({
          id: `past-${i}`,
          date: dateStr,
          title: 'Live Fire Training',
          type: 'training',
        });
      }
      if (i % 5 === 0) {
        events.push({
          id: `past-session-${i}`,
          date: dateStr,
          title: 'Range Session',
          type: 'session',
        });
      }
    }
    
    // Today's events
    events.push({
      id: '1',
      date: getTodayString(),
      title: 'Sniper Qualification',
      type: 'qualification',
    });
    events.push({
      id: '2',
      date: getTodayString(),
      title: 'Team Coordination Drill',
      type: 'training',
    });
    
    // Upcoming events (next 3 weeks)
    const upcomingEvents = [
      { days: 1, title: 'Equipment Safety Briefing', type: 'briefing' as const },
      { days: 2, title: 'Marksmanship Assessment', type: 'assessment' as const },
      { days: 3, title: 'Squad Training Exercise', type: 'training' as const },
      { days: 4, title: 'Tactical Movement Session', type: 'session' as const },
      { days: 5, title: 'Leadership Team Briefing', type: 'briefing' as const },
      { days: 7, title: 'Advanced Rifle Qualification', type: 'qualification' as const },
      { days: 7, title: 'Close Quarter Combat Training', type: 'training' as const },
      { days: 9, title: 'Night Operations Session', type: 'session' as const },
      { days: 11, title: 'Mid-Month Skills Assessment', type: 'assessment' as const },
      { days: 14, title: 'Multi-Team Field Exercise', type: 'training' as const },
      { days: 14, title: 'Strategy Planning Briefing', type: 'briefing' as const },
      { days: 16, title: 'Weapons Maintenance Session', type: 'session' as const },
      { days: 18, title: 'Physical Fitness Assessment', type: 'assessment' as const },
      { days: 20, title: 'Specialist Qualification', type: 'qualification' as const },
      { days: 21, title: 'Full Battalion Training', type: 'training' as const },
    ];
    
    upcomingEvents.forEach((event, index) => {
      const date = new Date(today);
      date.setDate(date.getDate() + event.days);
      events.push({
        id: `future-${index}`,
        date: date.toISOString().split('T')[0],
        title: event.title,
        type: event.type,
      });
    });
    
    return events;
  };

  const allEvents = useMemo(() => generateSampleEvents(), []);
  
  // Filter events based on selected filter
  const filteredEvents = useMemo(() => {
    if (filter === 'all') return allEvents;
    return allEvents.filter(event => event.type === filter);
  }, [allEvents, filter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    const thisMonthEvents = allEvents.filter(event => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && 
             eventDate.getFullYear() === currentYear;
    });
    
    const upcomingEvents = allEvents.filter(event => 
      new Date(event.date) >= now
    );
    
    const eventsByType = {
      training: allEvents.filter(e => e.type === 'training').length,
      session: allEvents.filter(e => e.type === 'session').length,
      assessment: allEvents.filter(e => e.type === 'assessment').length,
      briefing: allEvents.filter(e => e.type === 'briefing').length,
      qualification: allEvents.filter(e => e.type === 'qualification').length,
    };
    
    return {
      total: allEvents.length,
      thisMonth: thisMonthEvents.length,
      upcoming: upcomingEvents.length,
      byType: eventsByType,
    };
  }, [allEvents]);

  const handleEventPress = (event: CalendarEvent) => {
    Alert.alert(
      event.title,
      `Type: ${event.type}\nDate: ${new Date(event.date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      })}`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => console.log('Navigate to event:', event.id) 
        },
      ]
    );
  };

  const handleCreateTraining = (date: string) => {
    Alert.alert(
      'Create Training Event',
      `Schedule a new training event for ${new Date(date).toLocaleDateString('en-US', { 
        weekday: 'long', 
        month: 'long', 
        day: 'numeric' 
      })}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            console.log('Creating training for:', date);
            // TODO: Navigate to training creation flow
            // router.push(`/training/create?date=${date}`);
          }
        },
      ]
    );
  };

  const handleFilterChange = (newFilter: EventFilter) => {
    if (newFilter !== filter) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFilter(newFilter);
    }
  };

  const getEventTypeIcon = (type: EventFilter) => {
    const iconMap: Record<EventFilter, any> = {
      all: 'grid-outline',
      training: 'fitness-outline',
      session: 'time-outline',
      assessment: 'clipboard-outline',
      briefing: 'document-text-outline',
      qualification: 'ribbon-outline',
    };
    return iconMap[type];
  };

  const filterOptions: { id: EventFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'training', label: 'Training', icon: 'fitness-outline' },
    { id: 'session', label: 'Session', icon: 'time-outline' },
    { id: 'assessment', label: 'Assessment', icon: 'clipboard-outline' },
    { id: 'briefing', label: 'Briefing', icon: 'document-text-outline' },
    { id: 'qualification', label: 'Qualification', icon: 'ribbon-outline' },
  ];

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
        {/* Enhanced Header */}
        <View 
          style={styles.header}
        >
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Training Calendar
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {stats.upcoming} upcoming • {stats.thisMonth} this month
              </Text>
            </View>
            <Pressable
              onPress={() => {
                setShowStats(!showStats);
              }}
              style={({ pressed }) => [
                styles.statsToggle,
                { 
                  backgroundColor: colors.card,
                  opacity: pressed ? 0.6 : 1,
                },
              ]}
            >
              <Ionicons 
                name={showStats ? 'stats-chart' : 'stats-chart-outline'} 
                size={20} 
                color={colors.accent} 
              />
            </Pressable>
          </View>
        </View>

      

        {/* Enhanced Filter Chips */}
        <View 
          style={styles.segmentContainer}
        >
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.segmentScroll}
          >
            {filterOptions.map((option, index) => {
              const count = option.id === 'all' 
                ? stats.total 
                : stats.byType[option.id as keyof typeof stats.byType] || 0;
              
              return (
                <FilterChip
                  key={option.id}
                  option={option}
                  isActive={filter === option.id}
                  count={count}
                  onPress={() => handleFilterChange(option.id)}
                  delay={450 + (index * 50)}
                />
              );
            })}
          </ScrollView>
        </View>

        {/* Calendar with smooth transition */}
        <View
        >
          <TrainingCalendar
            events={filteredEvents}
            onEventPress={handleEventPress}
            onCreateTraining={handleCreateTraining}
          />
        </View>

        {/* Empty State when filtered */}
        {filteredEvents.length === 0 && filter !== 'all' && (
          <View
            style={[styles.emptyState, { backgroundColor: colors.card }]}
          >
            <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
            <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
              No {filter} events
            </Text>
            <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
              Try selecting a different filter or create a new event
            </Text>
          </View>
        )}
    </ScrollView>
  );
}

// Enhanced Filter Chip Component
function FilterChip({
  option,
  isActive,
  count,
  onPress,
  delay,
}: {
  option: { id: EventFilter; label: string; icon: string };
  isActive: boolean;
  count: number;
  onPress: () => void;
  delay: number;
}) {
  const colors = useColors();
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = () => {
    scale.value = withSpring(0.95, { damping: 10 }, () => {
      scale.value = withSpring(1, { damping: 10 });
    });
    onPress();
  };

  return (
    <Animated.View
      entering={FadeInLeft.delay(delay).springify()}
      style={animatedStyle}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.filterChip,
          { 
            backgroundColor: isActive ? colors.accent : colors.card,
            borderColor: isActive ? colors.accent : colors.border,
          },
        ]}
      >
        <Ionicons 
          name={option.icon as any} 
          size={16} 
          color={isActive ? colors.accentForeground : colors.textMuted} 
        />
        <Text
          style={[
            styles.filterChipText,
            { color: isActive ? colors.accentForeground : colors.text },
          ]}
        >
          {option.label}
        </Text>
        <View 
          style={[
            styles.filterChipBadge, 
            { 
              backgroundColor: isActive ? colors.accentForeground + '20' : colors.accent + '15',
            }
          ]}
        >
          <Text 
            style={[
              styles.filterChipBadgeText, 
              { color: isActive ? colors.accentForeground : colors.accent }
            ]}
          >
            {count}
          </Text>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
    gap: 24,
  },
  
  // Header styles
  header: {
    gap: 4,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerTitle: {
    fontSize: 34,
    fontWeight: '700',
    marginBottom: 4,
    letterSpacing: -0.8,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  statsToggle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },

  // Stats Cards
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 16,
    gap: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statContent: {
    flex: 1,
    gap: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  
  // Filter Chips
  segmentContainer: {
    marginHorizontal: -20,
  },
  segmentScroll: {
    paddingHorizontal: 20,
    gap: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 3,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  filterChipBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: -0.1,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 20,
    gap: 12,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    letterSpacing: -0.1,
    maxWidth: 250,
  },
});

