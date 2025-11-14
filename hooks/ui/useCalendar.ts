import { useState, useMemo } from 'react';
import { DateData } from 'react-native-calendars';
import { useColors } from './useColors';

export interface CalendarEvent {
  id: string;
  date: string;
  title: string;
  type: 'training' | 'session' | 'assessment' | 'briefing' | 'qualification';
  color?: string;
}

export function useCalendar(events: CalendarEvent[] = []) {
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Map event types to colors
  const eventColors = {
    training: colors.green,
    session: colors.blue,
    assessment: colors.orange,
    briefing: colors.purple,
    qualification: colors.red,
  };

  // Convert events to calendar marked dates format
  const markedDates = useMemo(() => {
    const marked: any = {};

    events.forEach((event) => {
      if (!marked[event.date]) {
        marked[event.date] = { dots: [] };
      }

      marked[event.date].dots.push({
        color: event.color || eventColors[event.type],
      });
    });

    return marked;
  }, [events, colors]);

  // Get events for a specific date
  const getEventsForDate = (date: string) => {
    return events.filter((event) => event.date === date);
  };

  // Handle date selection
  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
  };

  // Get events for selected date
  const selectedDateEvents = useMemo(() => {
    return selectedDate ? getEventsForDate(selectedDate) : [];
  }, [selectedDate, events]);

  // Get dates with events
  const datesWithEvents = useMemo(() => {
    return [...new Set(events.map((event) => event.date))];
  }, [events]);

  // Get event count for a specific date
  const getEventCount = (date: string) => {
    return events.filter((event) => event.date === date).length;
  };

  // Get events for current month
  const getEventsForMonth = (year: number, month: number) => {
    return events.filter((event) => {
      const eventDate = new Date(event.date);
      return (
        eventDate.getFullYear() === year &&
        eventDate.getMonth() === month - 1
      );
    });
  };

  return {
    selectedDate,
    setSelectedDate,
    markedDates,
    handleDayPress,
    selectedDateEvents,
    datesWithEvents,
    getEventsForDate,
    getEventCount,
    getEventsForMonth,
    eventColors,
  };
}

// Helper to format date for display
export function formatCalendarDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

// Helper to get today's date string
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

// Helper to check if date is in the past
export function isDateInPast(date: string): boolean {
  return new Date(date) < new Date(getTodayString());
}

// Helper to get date range
export function getDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

