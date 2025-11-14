import { useColors } from '@/hooks/ui/useColors';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { DateData } from 'react-native-calendars';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Calendar, CompactCalendar } from './Calendar';

export function CalendarExamples() {
  const colors = useColors();
  const [selectedDate, setSelectedDate] = useState<string>('');
  
  // Example: Training sessions marked on calendar
  const trainingDates = {
    '2024-11-15': {
      dots: [
        { color: colors.green },
        { color: colors.blue },
      ],
    },
    '2024-11-18': {
      dots: [{ color: colors.orange }],
    },
    '2024-11-20': {
      dots: [
        { color: colors.red },
        { color: colors.blue },
        { color: colors.green },
      ],
    },
    '2024-11-25': {
      dots: [{ color: colors.purple }],
    },
  };

  const handleDayPress = (day: DateData) => {
    setSelectedDate(day.dateString);
    console.log('Selected date:', day.dateString);
  };

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        
        {/* Main Calendar */}
        <Calendar
          title="Training Schedule"
          onDayPress={handleDayPress}
          selectedDate={selectedDate}
          markedDates={trainingDates}
        />

        {/* Selected Date Info */}
        {selectedDate && (
          <Animated.View 
            entering={FadeInDown.duration(300)}
            style={[styles.infoCard, { backgroundColor: colors.card }]}
          >
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Selected Date
            </Text>
            <Text style={[styles.infoDate, { color: colors.accent }]}>
              {new Date(selectedDate).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          </Animated.View>
        )}

        {/* Compact Calendar Example */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Compact View
          </Text>
          <CompactCalendar
            onDayPress={handleDayPress}
            markedDates={trainingDates}
          />
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: colors.card }]}>
          <Text style={[styles.legendTitle, { color: colors.text }]}>
            Legend
          </Text>
          <View style={styles.legendItems}>
            <LegendItem color={colors.green} label="Sniper Training" />
            <LegendItem color={colors.blue} label="Team Exercise" />
            <LegendItem color={colors.orange} label="Assessment" />
            <LegendItem color={colors.red} label="Qualification" />
            <LegendItem color={colors.purple} label="Briefing" />
          </View>
        </View>

      </View>
    </ScrollView>
  );
}

function LegendItem({ color, label }: { color: string; label: string }) {
  const colors = useColors();
  return (
    <View style={styles.legendItem}>
      <View style={[styles.legendDot, { backgroundColor: color }]} />
      <Text style={[styles.legendLabel, { color: colors.textMuted }]}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 20,
    gap: 24,
    paddingBottom: 40,
  },
  infoCard: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
    opacity: 0.7,
  },
  infoDate: {
    fontSize: 18,
    fontWeight: '600',
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  legend: {
    padding: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 16,
  },
  legendItems: {
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendLabel: {
    fontSize: 14,
  },
});

