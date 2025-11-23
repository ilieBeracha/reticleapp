import { DayEventsGroup } from '@/components/calendar/DayEventsGroup';
import { FilterChip } from '@/components/calendar/FilterChip';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { getSessions, SessionWithDetails } from '@/services/sessionService';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />
      
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <LayoutAnimationConfig skipEntering skipExiting>
          {/* Header */}
          <Animated.View entering={FadeInDown.delay(100).springify()} style={styles.header}>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              {isLoading ? 'Loading events...' : `${stats.thisMonth} this month • ${stats.upcoming} upcoming`}
            </Text>
          </Animated.View>

          {/* View Mode Toggle */}
          <Animated.View entering={FadeInDown.delay(200).springify()} style={styles.viewModeSection}>
            <View style={[styles.viewToggle, { backgroundColor: colors.card }]}>
              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setViewMode('week');
                }}
                style={[
                  styles.viewToggleButton,
                  viewMode === 'week' && [styles.viewToggleButtonActive, { backgroundColor: colors.primary }],
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={viewMode === 'week' ? colors.primaryForeground : colors.textMuted}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    { color: viewMode === 'week' ? colors.primaryForeground : colors.text },
                  ]}
                >
                  Week
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setViewMode('month');
                }}
                style={[
                  styles.viewToggleButton,
                  viewMode === 'month' && [styles.viewToggleButtonActive, { backgroundColor: colors.primary }],
                ]}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="grid-outline"
                  size={18}
                  color={viewMode === 'month' ? colors.primaryForeground : colors.textMuted}
                />
                <Text
                  style={[
                    styles.viewToggleText,
                    { color: viewMode === 'month' ? colors.primaryForeground : colors.text },
                  ]}
                >
                  Month
                </Text>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <>
              {/* Filter Chips */}
              <Animated.View entering={FadeInDown.delay(300).springify()} style={styles.filterContainer}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {filterOptions.map((option, index) => {
                    const count = option.id === 'all' ? stats.total : stats.byType[option.id] || 0;

                    return (
                      <FilterChip
                        key={option.id}
                        option={option}
                        isActive={filter === option.id}
                        count={count}
                        onPress={() => handleFilterChange(option.id)}
                        delay={350 + index * 50}
                        colors={filterChipColors}
                      />
                    );
                  })}
                </ScrollView>
              </Animated.View>

              {/* Calendar Views */}
              {viewMode === 'week' ? (
                <Animated.View
                  entering={FadeInDown.delay(400).springify()}
                  layout={LinearTransition.springify().damping(20)}
                  style={styles.section}
                >
                  {currentWeekEvents.length > 0 ? (
                    <View style={[styles.weekEventsCard, { backgroundColor: colors.card }]}>
                      <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
                        <Text style={[styles.sectionCount, { color: colors.textMuted }]}>
                          {currentWeekEvents.length} {currentWeekEvents.length === 1 ? 'event' : 'events'}
                        </Text>
                      </View>
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
                    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
                      <Ionicons name="calendar-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
                      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No events this week</Text>
                      <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                        Your week is clear. Start planning your trainings!
                      </Text>
                    </View>
                  )}
                </Animated.View>
              ) : (
                <Animated.View 
                  entering={FadeInDown.delay(400).springify()} 
                  layout={LinearTransition.springify().damping(20)}
                  style={styles.section}
                >
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
                  <Ionicons name="funnel-outline" size={48} color={colors.textMuted} style={{ opacity: 0.5 }} />
                  <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No {filter} events</Text>
                  <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                    Try selecting a different filter to see more events
                  </Text>
                </Animated.View>
              )}
            </>
          )}
        </LayoutAnimationConfig>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  header: {
    marginBottom: 20,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: '700',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 15,
    fontWeight: '400',
    letterSpacing: -0.1,
    opacity: 0.7,
  },
  viewModeSection: {
    marginBottom: 16,
  },
  viewToggle: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  viewToggleButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  viewToggleButtonActive: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    marginBottom: 20,
    marginHorizontal: -16,
  },
  filterScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  weekEventsCard: {
    borderRadius: 16,
    padding: 16,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 48,
    borderRadius: 16,
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
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0,
    maxWidth: 260,
    opacity: 0.8,
    lineHeight: 20,
  },
});
