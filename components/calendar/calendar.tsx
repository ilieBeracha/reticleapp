import { DayEventsGroup } from '@/components/calendar/DayEventsGroup';
import { FilterChip } from '@/components/calendar/FilterChip';
import { ThemedStatusBar } from '@/components/shared/ThemedStatusBar';
import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useAppContext } from '@/hooks/useAppContext';
import { SessionWithDetails } from '@/services/sessionService';
import { useSessionStore } from '@/store/sessionStore';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type EventFilter = 'all' | 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';
type CalendarViewMode = 'week' | 'month';

const CalendarScreen = React.memo(function CalendarScreen() {
  const colors = useColors();
  const { activeWorkspace } = useAppContext();
  const [filter, setFilter] = useState<EventFilter>('all');
  const [viewMode, setViewMode] = useState<CalendarViewMode>('week');
  const [selectedWeekDate] = useState<string>('');
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { sessions, loading: sessionsLoading, loadSessions } = useSessionStore();

  useEffect(() => {
    loadSessions();
  }, [loadSessions, activeWorkspace?.id]);

  useEffect(() => {
    const mappedEvents: CalendarEvent[] = sessions.map((session: SessionWithDetails) => {
      // Build title from training or team name
      const title = session.training_title 
        || (session.team_name ? `${session.team_name} Session` : 'Training Session');

      return {
        id: session.id,
        date: session.started_at.split('T')[0],
        title: title,
        type: 'session',
        color: session.status === 'completed' ? colors.green : session.status === 'active' ? colors.blue : colors.muted,
      };
    });

    setEvents(mappedEvents);
    setIsLoading(sessionsLoading);
  }, [sessions, sessionsLoading, colors.green, colors.blue, colors.muted]);

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
      primary: colors.primary,
      primaryForeground: colors.primaryForeground,
      card: colors.card,
      border: colors.border,
      textMuted: colors.textMuted,
      text: colors.text,
      secondary: colors.secondary,
    }),
    [colors.primary, colors.primaryForeground, colors.card, colors.border, colors.textMuted, colors.text, colors.secondary]
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ThemedStatusBar />

      {/* Header & Tabs - Fixed at top */}
      <View style={[styles.headerContainer, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Calendar</Text>
            <View style={styles.statsRow}>
              <View style={[styles.statItem, { backgroundColor: colors.primary + '18', borderColor: colors.primary + '25' }]}>
                <Ionicons name="calendar" size={16} color={colors.primary} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: colors.primary }]}>
                  {isLoading ? '...' : stats.thisMonth}
                </Text>
                <Text style={[styles.statLabel, { color: colors.primary }]}>This Month</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.green + '18', borderColor: colors.green + '25' }]}>
                <Ionicons name="trending-up" size={16} color={colors.green} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: colors.green }]}>
                  {isLoading ? '...' : stats.upcoming}
                </Text>
                <Text style={[styles.statLabel, { color: colors.green }]}>Upcoming</Text>
              </View>
              <View style={[styles.statItem, { backgroundColor: colors.textMuted + '15', borderColor: colors.textMuted + '20' }]}>
                <Ionicons name="albums" size={16} color={colors.textMuted} style={styles.statIcon} />
                <Text style={[styles.statValue, { color: colors.textMuted }]}>
                  {isLoading ? '...' : stats.total}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Total</Text>
              </View>
            </View>
          </View>
        </View>

        {/* View Mode Toggle */}
        <View style={[styles.tabsContainer, { backgroundColor: colors.secondary }]}>
          <TouchableOpacity
            style={[styles.tab, viewMode === 'week' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('week');
            }}
            activeOpacity={0.9}
          >
            <Ionicons
              name="calendar-outline"
              size={16}
              color={viewMode === 'week' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: viewMode === 'week' ? colors.text : colors.textMuted }]}>Week</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, viewMode === 'month' && { backgroundColor: colors.card, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 2, shadowOffset: {width: 0, height: 1} }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setViewMode('month');
            }}
            activeOpacity={0.9}
          >
            <Ionicons
              name="grid-outline"
              size={16}
              color={viewMode === 'month' ? colors.text : colors.textMuted}
            />
            <Text style={[styles.tabText, { color: viewMode === 'month' ? colors.text : colors.textMuted }]}>Month</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
      >

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
          </View>
        ) : (
          <>
            {/* Filter Chips - Using FlashList for better performance */}
            <View style={styles.filterContainer}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
                removeClippedSubviews={true}
              >
                {filterOptions.map((option) => {
                  const count = option.id === 'all' ? stats.total : stats.byType[option.id] || 0;
                  return (
                    <FilterChip
                      key={option.id}
                      option={option}
                      isActive={filter === option.id}
                      count={count}
                      onPress={() => handleFilterChange(option.id)}
                      colors={filterChipColors}
                    />
                  );
                })}
              </ScrollView>
            </View>

            {/* Calendar Views */}
            {viewMode === 'week' ? (
              <View style={styles.section}>
                {currentWeekEvents.length > 0 ? (
                  <>
                    <View style={styles.sectionHeader}>
                      <View style={styles.sectionHeaderLeft}>
                        <View style={[styles.sectionIconBox, { backgroundColor: colors.primary + '15' }]}>
                          <Ionicons name="calendar" size={16} color={colors.primary} />
                        </View>
                        <Text style={[styles.sectionTitle, { color: colors.text }]}>This Week</Text>
                      </View>
                      <View style={[styles.eventCount, { backgroundColor: colors.secondary }]}>
                        <Text style={[styles.eventCountText, { color: colors.text }]}>
                          {currentWeekEvents.length}
                        </Text>
                      </View>
                    </View>
                    <View style={[styles.weekEventsCard, { backgroundColor: colors.background + '15', borderColor: colors.border }]}>
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
                  </>
                ) : (
                  <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
                      <Ionicons name="calendar-outline" size={32} color={colors.textMuted} />
                    </View>
                    <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No events this week</Text>
                    <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                      Your week is clear. Start planning your trainings!
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.section}>
                <TrainingCalendar
                  events={filteredEvents}
                  onEventPress={handleEventPress}
                  onCreateTraining={handleCreateTraining}
                  viewMode="month"
                />
              </View>
            )}

            {/* Empty State when filtered */}
            {filteredEvents.length === 0 && filter !== 'all' && (
              <View style={[styles.emptyState, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: colors.secondary }]}>
                  <Ionicons name="funnel-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No {filter} events</Text>
                <Text style={[styles.emptyStateText, { color: colors.textMuted }]}>
                  Try selecting a different filter to see more events
                </Text>
              </View>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
});

export default CalendarScreen;

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
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statItem: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    alignItems: 'center',
    gap: 3,
    borderWidth: 1,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  statIcon: {
    marginBottom: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  statLabel: {
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.85,
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
    paddingBottom: 32,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterContainer: {
    marginBottom: 20,
    marginHorizontal: -16,
    height: 44,
  },
  filterScroll: {
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  eventCount: {
    minWidth: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  eventCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  weekEventsCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 16,
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
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateTitle: {
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  emptyStateText: {
    fontSize: 14,
    fontWeight: '400',
    textAlign: 'center',
    letterSpacing: 0,
    maxWidth: 260,
    opacity: 0.7,
    lineHeight: 20,
  },
});
