import { DayEventsGroup } from '@/components/calendar/DayEventsGroup';
import { FilterChip } from '@/components/calendar/FilterChip';
import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getSessions, SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown, LayoutAnimationConfig, LinearTransition } from 'react-native-reanimated';

type EventFilter = 'all' | 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';
type CalendarViewMode = 'week' | 'month';

export default function CalendarScreen() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedWeekDate, _setSelectedWeekDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch events
  useEffect(() => {
    let isMounted = true;

    const loadEvents = async () => {
      setIsLoading(true);
      try {
        const sessions = await getSessions(activeWorkspace?.id);

        if (!isMounted) return;

        // Map sessions to calendar events
        const mappedEvents: CalendarEvent[] = sessions.map((session: SessionWithDetails) => {
          const title =
            session.session_data?.name || (session.team_name ? `${session.team_name} Session` : 'Training Session');

          return {
            id: session.id,
            date: session.started_at.split('T')[0],
            title: title,
            type: 'session',
            color: session.status === 'completed' ? colors.green : session.status === 'active' ? colors.blue : colors.muted,
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
  }, [activeWorkspace?.id, colors.green, colors.blue, colors.muted]);

  const filteredEvents = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((event) => event.type === filter);
  }, [events, filter]);

  // Optimized stats calculation - single pass instead of multiple filter calls
  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    const result = {
      total: events.length,
      thisMonth: 0,
      upcoming: 0,
      byType: {
        training: 0,
        session: 0,
        assessment: 0,
        briefing: 0,
        qualification: 0,
      } as Record<string, number>,
    };

    // Single pass through events - O(n) instead of O(7n)
    for (const event of events) {
      const eventDate = new Date(event.date);

      if (eventDate.getMonth() === currentMonth && eventDate.getFullYear() === currentYear) {
        result.thisMonth++;
      }

      if (eventDate >= now) {
        result.upcoming++;
      }

      if (event.type in result.byType) {
        result.byType[event.type]++;
      }
    }

    return result;
  }, [events]);

  const handleEventPress = useCallback((event: CalendarEvent) => {
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
  }, []);

  const handleCreateTraining = useCallback((date: string) => {
    console.log('Create training for', date);
  }, []);

  const handleFilterChange = useCallback(
    (newFilter: EventFilter) => {
      if (newFilter !== filter) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        setFilter(newFilter);
      }
    },
    [filter]
  );

  // Get current week date range (Monday to Sunday)
  const currentWeekDates = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay();
    const monday = new Date(today);

    const diff = currentDay === 0 ? -6 : 1 - currentDay;
    monday.setDate(today.getDate() + diff);

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

  // Filter options - memoized
  const filterOptions = useMemo(() => {
    const options: { id: EventFilter; label: string; icon: string }[] = [
      { id: 'all', label: 'All', icon: 'grid-outline' },
      { id: 'session', label: 'Session', icon: 'time-outline' },
    ];

    if (stats.byType.training > 0) {
      options.push({ id: 'training', label: 'Training', icon: 'fitness-outline' });
    }
    if (stats.byType.assessment > 0) {
      options.push({ id: 'assessment', label: 'Assessment', icon: 'clipboard-outline' });
    }
    if (stats.byType.briefing > 0) {
      options.push({ id: 'briefing', label: 'Briefing', icon: 'document-text-outline' });
    }
    if (stats.byType.qualification > 0) {
      options.push({ id: 'qualification', label: 'Qualification', icon: 'ribbon-outline' });
    }

    return options;
  }, [stats.byType]);

  // Colors for child components - memoized to prevent unnecessary re-renders
  const dayEventsColors = useMemo(
    () => ({
      textMuted: colors.textMuted,
      text: colors.text,
      accent: colors.accent,
      card: colors.card,
      border: colors.border,
    }),
    [colors.textMuted, colors.text, colors.accent, colors.card, colors.border]
  );

  const filterChipColors = useMemo(
    () => ({
      accent: colors.accent,
      accentForeground: colors.accentForeground,
      card: colors.card,
      border: colors.border,
      textMuted: colors.textMuted,
      text: colors.text,
    }),
    [colors.accent, colors.accentForeground, colors.card, colors.border, colors.textMuted, colors.text]
  );

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
                  const count = option.id === 'all' ? stats.total : stats.byType[option.id] || 0;

                  return (
                    <FilterChip
                      key={option.id}
                      option={option}
                      isActive={filter === option.id}
                      count={count}
                      onPress={() => handleFilterChange(option.id)}
                      delay={450 + index * 50}
                      colors={filterChipColors}
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
                          colors={dayEventsColors}
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
  segmentContainer: {
    marginHorizontal: -16,
  },
  segmentScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
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
});
