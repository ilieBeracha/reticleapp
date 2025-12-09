import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { useActiveTeam } from '@/store/teamStore';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * TEAM TRAINING CALENDAR VIEW
 * For Team Commanders - shows team-specific training calendar
 */
export default function TeamTrainingCalendarView() {
  const colors = useColors();
  const { teamName } = useActiveTeam();

  // TODO: Fetch real team training data
  const teamEvents: CalendarEvent[] = useMemo(() => [], []);

  const handleEventPress = (event: CalendarEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(event.title, `Team training event`);
  };

  const handleCreateTraining = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Schedule Training', `Create training for ${new Date(date).toLocaleDateString()}`);
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Team Training</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {teamName || 'Your Team'} • Commander View
        </Text>
      </View>

      {/* Calendar */}
      <TrainingCalendar
        events={teamEvents}
        onEventPress={handleEventPress}
        onCreateTraining={handleCreateTraining}
        viewMode="month"
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
});
