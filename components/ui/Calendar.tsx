import { useColors } from '@/hooks/ui/useColors';
import { useColorScheme } from '@/hooks/ui/useColorScheme';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { CalendarProps, DateData, Calendar as RNCalendar } from 'react-native-calendars';
import { Ionicons } from '@expo/vector-icons';

type CalendarViewMode = 'week' | 'month';

interface CustomCalendarProps extends Partial<CalendarProps> {
  onDayPress?: (date: DateData) => void;
  markedDates?: { [key: string]: any };
  selectedDate?: string;
  showTitle?: boolean;
  title?: string;
  viewMode?: CalendarViewMode;
}

export function Calendar({
  onDayPress,
  markedDates = {},
  selectedDate,
  showTitle = true,
  title = "Schedule",
  viewMode = 'month',
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
        // We don't set selectedColor here anymore, as we handle it in the custom component
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
    arrowColor: colors.text,
    monthTextColor: colors.text,
    indicatorColor: colors.accent,
    textDayFontFamily: 'System',
    textMonthFontFamily: 'System',
    textDayHeaderFontFamily: 'System',
    textDayFontWeight: '400' as const,
    textMonthFontWeight: '600' as const,
    textDayHeaderFontWeight: '600' as const,
    textDayFontSize: 15,
    textMonthFontSize: 18,
    textDayHeaderFontSize: 12, // Slightly smaller for cleaner look
    
    // Header style adjustments
    'stylesheet.calendar.header': {
      header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingLeft: 10,
        paddingRight: 10,
        marginTop: 6,
        alignItems: 'center',
      },
      monthText: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        margin: 10,
      },
      dayHeader: {
        marginTop: 2,
        marginBottom: 7,
        width: 32,
        textAlign: 'center',
        fontSize: 12,
        fontWeight: '600',
        color: colors.textMuted,
        textTransform: 'uppercase',
      },
    }
  };
  
  const dayComponent = ({ date, state, marking }: any) => {
    const isSelected = marking?.selected;
    const isToday = date?.dateString === new Date().toISOString().split('T')[0];
    const isDisabled = state === 'disabled';
    
    // Logic to determine if we should show dots
    // This handles both the simple 'dots' array and the 'dotColor' property
    const hasDots = marking?.dots && marking.dots.length > 0;
    const hasMarked = marking?.marked; 
    
    return (
      <Pressable
        onPress={() => date && onDayPress?.(date)}
        disabled={isDisabled}
        style={[
          styles.dayContainer,
        ]}
      >
        {/* Selection circle background */}
        {isSelected && (
          <View style={[StyleSheet.absoluteFill, styles.selectedBackground, { backgroundColor: colors.accent }]} />
        )}
        
        {/* Today ring */}
        {isToday && !isSelected && (
          <View style={[StyleSheet.absoluteFill, styles.todayRing, { borderColor: colors.accent }]} />
        )}

        <Text
          style={[
            styles.dayText,
            { color: colors.text },
            isDisabled && [styles.disabledDayText, { color: colors.muted }],
            isSelected && [styles.selectedDayText, { color: colors.accentForeground }],
            isToday && !isSelected && { color: colors.accent, fontWeight: '700' },
          ]}
        >
          {date?.day}
        </Text>
        
        {/* Dots Indicator */}
        <View style={styles.dotsWrapper}>
          {hasDots ? (
             <View style={styles.dotsContainer}>
              {marking.dots.slice(0, 3).map((dot: any, index: number) => (
                <View
                  key={index}
                  style={[
                    styles.dot,
                    { backgroundColor: isSelected ? colors.accentForeground : (dot.color || colors.accent) },
                  ]}
                />
              ))}
            </View>
          ) : hasMarked ? (
             // Fallback for simple 'marked: true'
             <View 
               style={[
                 styles.dot, 
                 { backgroundColor: isSelected ? colors.accentForeground : colors.accent }
               ]} 
             />
          ) : null}
        </View>
      </Pressable>
    );
  };

  const renderArrow = (direction: 'left' | 'right') => (
    <View style={[styles.arrowContainer, { backgroundColor: colors.secondary }]}>
      <Ionicons 
        name={direction === 'left' ? 'chevron-back' : 'chevron-forward'} 
        size={18} 
        color={colors.text} 
      />
    </View>
  );

  if (viewMode === 'week') {
    // 7-week view: Shows current month + adjacent days to display ~7 weeks
    return (
      <View style={[styles.container, styles.weekContainer, { backgroundColor: colors.card }]}>
        {showTitle && title && (
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
          </View>
        )}
        
        <RNCalendar
          theme={theme as any}
          onDayPress={onDayPress}
          markedDates={enhancedMarkedDates}
          enableSwipeMonths={true}
          style={[styles.calendar, styles.weekCalendar, { 
            backgroundColor: colors.card,
          }]}
          markingType={'multi-dot'}
          hideExtraDays={false} // Show days from adjacent months to display more weeks
          firstDay={1} // Monday
          renderArrow={renderArrow}
          dayComponent={dayComponent}
          {...props}
        />
      </View>
    );
  }

  // Default monthly view
  return (
    <View style={[styles.container, { backgroundColor: colors.card, shadowColor: colors.text + '20' }]}>
      {showTitle && title && (
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        </View>
      )}
      
      <RNCalendar
        theme={theme as any}
        onDayPress={onDayPress}
        markedDates={enhancedMarkedDates}
        enableSwipeMonths={true}
        style={[styles.calendar, { 
          backgroundColor: colors.card,
        }]}
        markingType={'multi-dot'}
        hideExtraDays={true}
        firstDay={1} // Monday
        renderArrow={renderArrow}
        dayComponent={dayComponent}
        {...props}
      />
    </View>
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
    borderRadius: 24,
    padding: 12,
    overflow: 'visible', // Changed to visible for shadows if needed
    // Subtle shadow for the container
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  weekContainer: {
    minHeight: 420, // Accommodate 7 weeks display
  },
  header: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  calendar: {
    borderRadius: 0,
  },
  weekCalendar: {
    height: 380, // Taller to show more weeks
  },
  compact: {
    padding: 8,
  },
  
  // Arrow
  arrowContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Day Cell
  dayContainer: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  selectedBackground: {
    borderRadius: 14, // Softer square
  },
  todayRing: {
    borderWidth: 2,
    borderRadius: 14,
    opacity: 0.5,
  },
  dayText: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2, // Room for dots
  },
  selectedDayText: {
    fontWeight: '700',
  },
  disabledDayText: {
    opacity: 0.3,
  },
  
  // Dots
  dotsWrapper: {
    position: 'absolute',
    bottom: 5,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 3,
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
