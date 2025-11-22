import { useColors } from '@/hooks/ui/useColors';
import { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface WeekCalendarProps {
  selectedDate?: string;
  onDayPress?: (date: string) => void;
  markedDates?: { [key: string]: any };
  showTitle?: boolean;
  title?: string;
}

export function WeekCalendar({
  selectedDate,
  onDayPress,
  markedDates = {},
  showTitle = false,
  title = "This Week",
}: WeekCalendarProps) {
  const colors = useColors();

  // Get current week days (7 days centered on today)
  const weekDays = useMemo(() => {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    const monday = new Date(today);
    
    // Calculate Monday of current week
    const diff = currentDay === 0 ? -6 : 1 - currentDay; // If Sunday, go back 6 days
    monday.setDate(today.getDate() + diff);
    
    // Generate 7 days starting from Monday
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(monday);
      date.setDate(monday.getDate() + i);
      return date;
    });
  }, []);

  const todayString = new Date().toISOString().split('T')[0];

  return (
    <View 
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      {showTitle && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {weekDays[0].toLocaleDateString('en-US', { month: 'short' })}
            {' - '}
            {weekDays[6].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      )}

      <View style={styles.daysContainer}>
        {weekDays.map((date, index) => {
          const dateString = date.toISOString().split('T')[0];
          const isSelected = dateString === selectedDate;
          const isToday = dateString === todayString;
          const marking = markedDates[dateString];
          const hasDots = marking?.dots && marking.dots.length > 0;

          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNumber = date.getDate();

          return (
            <TouchableOpacity
              activeOpacity={0.7}
              key={dateString}
              onPress={() => onDayPress?.(dateString)}
              style={ [
                styles.dayCard,
                {
                  backgroundColor: isSelected 
                    ? colors.accent 
                    : colors.background,
                  borderColor: isToday && !isSelected 
                    ? colors.accent 
                    : 'transparent',
                },
                isSelected && styles.selectedCard,
              ]}
            >
                <Text
                  style={[
                    styles.dayName,
                    {
                      color: isSelected
                        ? colors.accentForeground
                        : colors.textMuted,
                    },
                  ]}
                >
                  {dayName}
                </Text>
                
                <Text
                  style={[
                    styles.dayNumber,
                    {
                      color: isSelected
                        ? colors.accentForeground
                        : isToday
                        ? colors.accent
                        : colors.text,
                    },
                    isToday && !isSelected && styles.todayNumber,
                  ]}
                >
                  {dayNumber}
                </Text>

                {hasDots && (
                  <View style={styles.dotsContainer}>
                    {marking.dots.slice(0, 3).map((dot: any, dotIndex: number) => (
                      <View
                        key={dotIndex}
                        style={[
                          styles.dot,
                          {
                            backgroundColor: isSelected
                              ? colors.accentForeground
                              : dot.color || colors.accent,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 12,
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 6,
  },
  dayCard: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 3,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
  },
  selectedCard: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  dayName: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  dayNumber: {
    fontSize: 17,
    fontWeight: '700',
  },
  todayNumber: {
    fontWeight: '800',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
    marginTop: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

