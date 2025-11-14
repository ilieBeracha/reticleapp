import { useColors } from '@/hooks/ui/useColors';
import { useColorScheme } from '@/hooks/ui/useColorScheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarProps, DateData, Calendar as RNCalendar } from 'react-native-calendars';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface CustomCalendarProps extends Partial<CalendarProps> {
  onDayPress?: (date: DateData) => void;
  markedDates?: { [key: string]: any };
  selectedDate?: string;
  showTitle?: boolean;
  title?: string;
}

export function Calendar({
  onDayPress,
  markedDates = {},
  selectedDate,
  showTitle = true,
  title = "Schedule",
  ...props
}: CustomCalendarProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Merge selected date with marked dates
  const enhancedMarkedDates = {
    ...markedDates,
    ...(selectedDate && {
      [selectedDate]: {
        ...markedDates[selectedDate],
        selected: true,
        selectedColor: colors.accent,
      },
    }),
  };

  const theme = {
    backgroundColor: colors.card,
    calendarBackground: colors.card,
    textSectionTitleColor: colors.textMuted,
    selectedDayBackgroundColor: colors.accent,
    selectedDayTextColor: colors.accentForeground,
    todayTextColor: colors.accent,
    dayTextColor: colors.text,
    textDisabledColor: colors.muted,
    dotColor: colors.accent,
    selectedDotColor: colors.accentForeground,
    arrowColor: colors.accent,
    monthTextColor: colors.text,
    indicatorColor: colors.accent,
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '400' as const,
    textMonthFontWeight: '600' as const,
    textDayHeaderFontWeight: '500' as const,
    textDayFontSize: 15,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 13,
  };

  return (
    <Animated.View 
      entering={FadeInDown.duration(400).springify()}
      style={[styles.container, { backgroundColor: colors.card }]}
    >
      {showTitle && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      )}
      
      <RNCalendar
        theme={theme}
        onDayPress={onDayPress}
        markedDates={enhancedMarkedDates}
        enableSwipeMonths={true}
        style={[styles.calendar, { 
          backgroundColor: colors.card,
          borderRadius: 16,
        }]}
        markingType={'multi-dot'}
        hideExtraDays={true}
        firstDay={1} // Monday
        renderArrow={(direction) => (
          <View style={styles.arrow}>
            <Text style={[styles.arrowText, { color: colors.accent }]}>
              {direction === 'left' ? '‹' : '›'}
            </Text>
          </View>
        )}
        dayComponent={({ date, state, marking }) => {
          const isSelected = marking?.selected;
          const isToday = date?.dateString === new Date().toISOString().split('T')[0];
          const isDisabled = state === 'disabled';
          
          return (
            <Pressable
              onPress={() => date && onDayPress?.(date)}
              disabled={isDisabled}
              style={[
                styles.dayContainer,
                isSelected && [styles.selectedDay, { backgroundColor: colors.accent }],
                isToday && !isSelected && [styles.todayDay, { borderColor: colors.accent }],
              ]}
            >
              <Text
                style={[
                  styles.dayText,
                  { color: colors.text },
                  isSelected && [styles.selectedDayText, { color: colors.accentForeground }],
                  isDisabled && [styles.disabledDayText, { color: colors.muted }],
                  isToday && !isSelected && { color: colors.accent, fontWeight: '600' },
                ]}
              >
                {date?.day}
              </Text>
              
              {marking?.dots && marking.dots.length > 0 && (
                <View style={styles.dotsContainer}>
                  {marking.dots.slice(0, 3).map((dot: any, index: number) => (
                    <View
                      key={index}
                      style={[
                        styles.dot,
                        { backgroundColor: dot.color || colors.accent },
                      ]}
                    />
                  ))}
                </View>
              )}
            </Pressable>
          );
        }}
        {...props}
      />
    </Animated.View>
  );
}

// Compact calendar variant for dashboards
export function CompactCalendar(props: CustomCalendarProps) {
  return (
    <Calendar
      {...props}
      showTitle={false}
      style={styles.compact}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    padding: 20,
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
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  calendar: {
    borderRadius: 16,
    overflow: 'hidden',
  },
  compact: {
    padding: 12,
  },
  arrow: {
    padding: 8,
  },
  arrowText: {
    fontSize: 28,
    fontWeight: '300',
  },
  dayContainer: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    position: 'relative',
  },
  selectedDay: {
    shadowColor: '#E76925',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  todayDay: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '400',
  },
  selectedDayText: {
    fontWeight: '600',
  },
  disabledDayText: {
    opacity: 0.3,
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 2,
    position: 'absolute',
    bottom: 2,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});

