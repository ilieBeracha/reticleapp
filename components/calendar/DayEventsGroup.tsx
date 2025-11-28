import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DayEventsGroupProps {
  dateString: string;
  events: CalendarEvent[];
  selectedWeekDate: string;
  onEventPress: (event: CalendarEvent) => void;
  colors: {
    textMuted: string;
    text: string;
    accent: string;
    card: string;
    border: string;
  };
}

/**
 * Day events group component for the calendar week view.
 * Displays events grouped by day with optimized performance via React.memo.
 */
export const DayEventsGroup = React.memo(function DayEventsGroup({
  dateString,
  events,
  selectedWeekDate,
  onEventPress,
  colors,
}: DayEventsGroupProps) {
  if (events.length === 0) return null;

  const dateObj = new Date(dateString);
  const isToday = dateString === new Date().toISOString().split('T')[0];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.dayLabel, { color: colors.textMuted }]}>
          {dateObj.toLocaleDateString('en-US', { weekday: 'short' })}
        </Text>
        <Text style={[styles.dayDate, { color: isToday ? colors.accent : colors.text }]}>
          {dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
      </View>
      <View style={styles.eventsList}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.id}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onEventPress(event);
            }}
            activeOpacity={0.65}
            style={[
              styles.eventItem,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <View style={[styles.eventDot, { backgroundColor: event.color || colors.accent }]} />
            <View style={styles.eventContent}>
              <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
                {event.title}
              </Text>
              <Text style={[styles.eventType, { color: colors.textMuted }]}>{event.type}</Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={colors.textMuted} style={{ opacity: 0.4 }} />
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
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
  eventsList: {
    gap: 8,
  },
  eventItem: {
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
  eventDot: {
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
  eventTitle: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: -0.1,
    lineHeight: 20,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '400',
    textTransform: 'capitalize',
    letterSpacing: 0,
    opacity: 0.6,
  },
});

export default DayEventsGroup;
