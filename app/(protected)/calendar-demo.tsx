import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { WeekCalendar } from '@/components/ui/WeekCalendar';
import { CalendarEvent, getTodayString } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { View, StyleSheet, Alert, ScrollView, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function CalendarDemoScreen() {
  const colors = useColors();
  const router = useRouter();
  const [selectedWeekDate, setSelectedWeekDate] = useState<string>('');

  // Sample training events
  const sampleEvents: CalendarEvent[] = [
    {
      id: '1',
      date: getTodayString(),
      title: 'Sniper Qualification',
      type: 'qualification',
    },
    {
      id: '2',
      date: getTodayString(),
      title: 'Team Exercise',
      type: 'training',
    },
    {
      id: '3',
      date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Weapons Assessment',
      type: 'assessment',
    },
    {
      id: '4',
      date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Squad Briefing',
      type: 'briefing',
    },
    {
      id: '5',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Range Session',
      type: 'session',
    },
    {
      id: '6',
      date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      title: 'Live Fire Training',
      type: 'training',
    },
  ];

  const handleEventPress = (event: CalendarEvent) => {
    Alert.alert(
      event.title,
      `Type: ${event.type}\nDate: ${event.date}`,
      [
        { text: 'Close', style: 'cancel' },
        { 
          text: 'View Details', 
          onPress: () => console.log('Navigate to:', event.id) 
        },
      ]
    );
  };

  const handleCreateTraining = (date: string) => {
    Alert.alert(
      'Create Training',
      `Create a new training for ${date}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            console.log('Creating training for:', date);
            // TODO: Navigate to training creation flow
            // router.push(`/training/create?date=${date}`);
          }
        },
      ]
    );
  };

  // Generate marked dates for week calendar
  const markedDates = sampleEvents.reduce((acc, event) => {
    if (!acc[event.date]) {
      acc[event.date] = { dots: [] };
    }
    acc[event.date].dots.push({ color: colors.accent });
    return acc;
  }, {} as any);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Week View Example */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Week View
          </Text>
          <WeekCalendar
            selectedDate={selectedWeekDate}
            onDayPress={setSelectedWeekDate}
            markedDates={markedDates}
          />
          {selectedWeekDate && (
            <Text style={[styles.selectedInfo, { color: colors.textMuted }]}>
              Selected: {new Date(selectedWeekDate).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </Text>
          )}
        </View>

        {/* Full Month View */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Full Calendar
          </Text>
          <TrainingCalendar
            events={sampleEvents}
            onEventPress={handleEventPress}
            onCreateTraining={handleCreateTraining}
          />
        </View>
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
    padding: 20,
    gap: 32,
    paddingBottom: 40,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  selectedInfo: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
    textAlign: 'center',
  },
});

