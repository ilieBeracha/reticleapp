import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getSessions, SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  FadeInDown,
  FadeInLeft,
  LayoutAnimationConfig,
  LinearTransition
} from 'react-native-reanimated';

type EventFilter = 'all' | 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';

type CalendarViewMode = 'week' | 'month';

// Separate component for day events
interface DayEventsGroupProps {
  dateString: string;
  events: CalendarEvent[];
  selectedWeekDate: string;
  onEventPress: (event: CalendarEvent) => void;
}

function DayEventsGroup({ dateString, events, selectedWeekDate, onEventPress }: DayEventsGroupProps) {
  const colors = useColors();

  if (events.length === 0) return null;

  const isSelectedDay = dateString === selectedWeekDate;
  const dateObj = new Date(dateString);
  const isToday = dateString === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.dayEventsGroup}>
      <View style={styles.dayHeader}>
        <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
          {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dayDate, { color: isToday ? colors.accent : colors.text }]}>
          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <View style={styles.dayEventsList}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEventPress(event);
            }}
            activeOpacity={0.65}
            style={[
              styles.eventItemWeek,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.eventDotWeek, { backgroundColor: event.color || colors.accent }]} />
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitleWeek, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[styles.eventTypeWeek, { color: colors.textMuted }]}>{event.type}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: 0.4 }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

export default function CalendarScreen() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events
  useEffect(() => {
    let isMounted = true;
    
    const loadEvents = async () => {
      setIsLoading(true);
      try {
        // Fetch sessions based on workspace context (or all if none selected)
        const sessions = await getSessions(activeWorkspace?.id);
        
        if (!isMounted) return;

        // Map sessions to calendar events
        const mappedEvents: CalendarEvent[] = sessions.map((session: SessionWithDetails) => {
            // Try to determine a better type or title based on session data
            const title = session.session_data?.name || 
                          (session.team_name ? `${session.team_name} Session` : 'Training Session');
            
            return {
                id: session.id,
                date: session.started_at.split('T')[0],
                title: title,
                type: 'session', // Default type for now
                // Optional: Color code based on status or other attributes
                color: session.status === 'completed' ? colors.green : 
                       session.status === 'active' ? colors.blue : colors.muted
            };
        });

        setEvents(mappedEvents);
      } catch (error) {
        console.error('Failed to load calendar events:', error);
        if (isMounted) {
          Alert.alert('Error', 'Failed to load calendar events');
        }
      } finally {
        if (isMounted) {
            setIsLoading(false);
        }
      }
    };

    loadEvents();

    return () => {
      isMounted = false;
    };
  }, [activeWorkspace?.id]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const thisMonthEvents = events.filter((event) => {
      const eventDate = new Date(event.date);
      return eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear;
    });

    const upcomingEvents = events.filter((event) => new Date(event.date) >= now);

    const eventsByType = {
      training: events.filter((e) => e.type === 'training').length,
      session: events.filter((e) => e.type === 'session').length,
      assessment: events.filter((e) => e.type === 'assessment').length,
      briefing: events.filter((e) => e.type === 'briefing').length,
      qualification: events.filter((e) => e.type === 'qualification').length,
    };

    return {
      total: events.length,
      thisMonth: thisMonthEvents.length,
      upcoming: upcomingEvents.length,
      byType: eventsByType,
    };
  }, [events]);

  const handleEventPress = (event: CalendarEvent) => {
    Alert.alert(
      event.title,
      `Type: ${event.type}\nDate: ${new Date(event.date).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })}`,
      [
        { text: 'Close', style: 'cancel' },
        {
          text: 'View Details',
          onPress: () => console.log('Navigate to event:', event.id),
        },
      ]
    );
  };

  const handleCreateTraining = (date: string) => {
    // Implementation depends on create capability
    console.log('Create training for', date);
  };

  const handleFilterChange = (newFilter: EventFilter) => {
    if (newFilter !== filter) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setFilter(newFilter);
    }
  };

  // Get current week date range (Monday to Sunday)
  const currentWeekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const monday = new Date(today);

    // Calculate Monday of current week
    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + diff);

    // Generate 7 days starting from Monday
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date.toISOString().split('T')[0];
    });
  }, []);

  // Get all events for the current week
  const currentWeekEvents = useMemo(() => {
    return filteredEvents
      .filter((event) => currentWeekDates.includes(event.date))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredEvents, currentWeekDates]);

  // Group current week events by date
  const groupedWeekEvents = useMemo(() => {
    const grouped: { [date: string]: CalendarEvent[] } = {};
    currentWeekEvents.forEach((event) => {
      if (!grouped[event.date]) {
        grouped[event.date] = [];
      }
      grouped[event.date].push(event);
    });
    return grouped;
  }, [currentWeekEvents]);

  const filterOptions: { id: EventFilter; label: string; icon: string }[] = [
    { id: 'all', label: 'All', icon: 'grid-outline' },
    { id: 'session', label: 'Session', icon: 'time-outline' },
    // Only show other filters if they have counts > 0 to avoid clutter
    ...(stats.byType.training > 0 ? [{ id: 'training' as const, label: 'Training', icon: 'fitness-outline' }] : []),
    ...(stats.byType.assessment > 0 ? [{ id: 'assessment' as const, label: 'Assessment', icon: 'clipboard-outline' }] : []),
    ...(stats.byType.briefing > 0 ? [{ id: 'briefing' as const, label: 'Briefing', icon: 'document-text-outline' }] : []),
    ...(stats.byType.qualification > 0 ? [{ id: 'qualification' as const, label: 'Qualification', icon: 'ribbon-outline' }] : []),
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <LayoutAnimationConfig skipEntering skipExiting>
        {/* Enhanced Header */}
        <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
          <View style={styles.headerTop}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                {activeWorkspace ? activeWorkspace.workspace_name : 'My Calendar'}
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                {isLoading ? 'Loading...' : `${stats.upcoming} upcoming • ${stats.thisMonth} this month`}
              </Text>
            </View>

            {/* View Mode Toggle */}
            <View style={styles.headerActions}>
              <View style={[styles.viewToggle, { backgroundColor: colors.card }]}>
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setViewMode('week');
                  }}
                  style={[
                    styles.viewToggleButton,
                    viewMode === 'week' && [styles.viewToggleButtonActive, { backgroundColor: colors.accent }],
                  ]}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={viewMode === 'week' ? colors.accentForeground : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.viewToggleText,
                      { color: viewMode === 'week' ? colors.accentForeground : colors.textMuted },
                    ]}
                  >
                    Week
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setViewMode('month');
                  }}
                  style={[
                    styles.viewToggleButton,
                    viewMode === 'month' && [styles.viewToggleButtonActive, { backgroundColor: colors.accent }],
                  ]}
                >
                  <Ionicons
                    name="apps-outline"
                    size={16}
                    color={viewMode === 'month' ? colors.accentForeground : colors.textMuted}
                  />
                  <Text
                    style={[
                      styles.viewToggleText,
                      { color: viewMode === 'month' ? colors.accentForeground : colors.textMuted },
                    ]}
                  >
                    Month
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </Animated.View>

        {isLoading ? (
            <View style={{ padding: 40, alignItems: 'center' }}>
                <ActivityIndicator size="large" color={colors.accent} />
            </View>
        ) : (
            <>
                {/* Enhanced Filter Chips */}
                <Animated.View entering={FadeInDown.delay(400).springify()} style={styles.segmentContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.segmentScroll}>
                    {filterOptions.map((option, index) => {
                    const count =
                        option.id === 'all' ? stats.total : stats.byType[option.id as keyof typeof stats.byType] || 0;

                    return (
                        <FilterChip
                        key={option.id}
                        option={option}
                        isActive={filter === option.id}
                        count={count}
                        onPress={() => handleFilterChange(option.id)}
                        delay={450 + index * 50}
                        />
                    );
                    })}
                </ScrollView>
                </Animated.View>

                {/* Calendar Views */}
                {viewMode === 'week' ? (
                <Animated.View
                    entering={FadeInDown.delay(600).springify()}
                    layout={LinearTransition.springify().damping(20)}
                    style={styles.weekViewContainer}
                >
                    {/* Current Week Events - Grouped by Day */}
                    {currentWeekEvents.length > 0 ? (
                    <View style={[styles.weekEventsContainer, { backgroundColor: colors.card }]}>
                        <Text style={[styles.weekEventsHeader, { color: colors.text }]}>This Week's Events</Text>
                        {currentWeekDates.map((dateString) => {
                        const dayEvents = groupedWeekEvents[dateString] || [];
                        return (
                            <DayEventsGroup
                            key={dateString}
                            dateString={dateString}
                            events={dayEvents}
                            selectedWeekDate={selectedWeekDate}
                            onEventPress={handleEventPress}
                            />
                        );
                        })}
                    </View>
                    ) : (
                    <View style={[styles.emptyWeekState, { backgroundColor: colors.card }]}>
                        <Ionicons name="calendar-outline" size={40} color={colors.textMuted} />
                        <Text style={[styles.emptyWeekText, { color: colors.textMuted }]}>No events this week</Text>
                    </View>
                    )}
                </Animated.View>
                ) : (
                <Animated.View entering={FadeInDown.delay(600).springify()} layout={LinearTransition.springify().damping(20)}>
                    <TrainingCalendar
                    events={filteredEvents}
                    onEventPress={handleEventPress}
                    onCreateTraining={handleCreateTraining}
                    viewMode="month"
                    />
                </Animated.View>
                )}

                {/* Empty State when filtered */}
                {filteredEvents.length === 0 && filter !== 'all' && (
                <Animated.View
                    entering={FadeInDown.delay(100).springify()}
                    style={[styles.emptyState, { backgroundColor: colors.card }]}
                >
                    <Ionicons name="calendar-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No {filter} events</Text>
                    <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Try selecting a different filter or create a new event
                    </Text>
                </Animated.View>
                )}
            </>
        )}
      </LayoutAnimationConfig>
    </ScrollView>
  );
}

// Animated Filter Chip Component
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

  return (
    <Animated.View entering={FadeInLeft.delay(delay).springify()}>
      <Pressable
        onPress={onPress}
        style={[
          styles.filterChip,
          {
            backgroundColor: isActive ? colors.accent : colors.card,
            borderColor: isActive ? colors.accent : colors.border,
          },
        ]}
      >
        <Ionicons name={option.icon as any} size={16} color={isActive ? colors.accentForeground : colors.textMuted} />
        <Text style={[styles.filterChipText, { color: isActive ? colors.accentForeground : colors.text }]}>
          {option.label}
        </Text>
        <View
          style={[
            styles.filterChipBadge,
            {
              backgroundColor: isActive ? colors.accentForeground + '20' : colors.accent + '15',
            },
          ]}
        >
          <Text style={[styles.filterChipBadgeText, { color: isActive ? colors.accentForeground : colors.accent }]}>
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
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
    gap: 20,
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
    fontSize: 32,
    fontWeight: '600',
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: -0.1,
    opacity: 0.7,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 3,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  viewToggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  viewToggleButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  viewToggleText: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: -0.1,
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
    marginHorizontal: -16,
  },
  segmentScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: -0.1,
  },
  filterChipBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterChipBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0,
  },

  // Empty State
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 14,
    gap: 10,
    marginTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0,
    maxWidth: 250,
    opacity: 0.7,
  },

  // Week View
  weekViewContainer: {
    gap: 16,
  },
  weekEventsContainer: {
    marginTop: 12,
    padding: 16,
    borderRadius: 14,
    gap: 16,
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
  weekEventsHeader: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
    marginBottom: 8,
  },
  dayEventsGroup: {
    gap: 8,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 10,
  },
  dayLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    minWidth: 30,
    opacity: 0.6,
  },
  dayDate: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dayEventsList: {
    gap: 8,
  },
  eventItemWeek: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 12,
    borderWidth: 0.5,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 2,
      },
      android: {
        elevation: 0.5,
      },
    }),
  },
  eventDotWeek: {
    width: 4,
    height: 4,
    borderRadius: 2,
    flexShrink: 0,
    opacity: 0.8,
  },
  eventContent: {
    flex: 1,
    gap: 3,
  },
  eventInfoWeek: {
    flex: 1,
    gap: 3,
  },
  eventTitleWeek: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  eventTypeWeek: {
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'capitalize',
    letterSpacing: 0,
    opacity: 0.6,
  },

  // Empty Week State
  emptyWeekState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 14,
    marginTop: 12,
    gap: 10,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyWeekText: {
    fontSize: 14,
    fontWeight: '400',
    letterSpacing: 0,
    opacity: 0.7,
  },
});
