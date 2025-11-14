import { useColors } from '@/hooks/ui/useColors';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

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
    <Animated.View 
      entering={FadeInDown.duration(400).springify()}
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
            <Animated.View
              key={dateString}
              entering={FadeIn.delay(index * 50).duration(300)}
            >
              <Pressable
                onPress={() => onDayPress?.(dateString)}
                style={({ pressed }) => [
                  styles.dayCard,
                  {
                    backgroundColor: isSelected 
                      ? colors.accent 
                      : colors.background,
                    borderColor: isToday && !isSelected 
                      ? colors.accent 
                      : 'transparent',
                    opacity: pressed ? 0.7 : 1,
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
              </Pressable>
            </Animated.View>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '500',
  },
  daysContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  dayCard: {
    flex: 1,
    paddingVertical: 16,
    paddingHorizontal: 4,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
  },
  selectedCard: {
    shadowColor: '#E76925',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  dayName: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dayNumber: {
    fontSize: 20,
    fontWeight: '700',
  },
  todayNumber: {
    fontWeight: '800',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
});

