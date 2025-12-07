import { TrainingCalendar } from '@/components/ui/TrainingCalendar';
import { useTeamRole } from '@/contexts/TeamRoleContext';
import { CalendarEvent } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import * as Haptics from 'expo-haptics';
import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';

/**
 * ADMIN CALENDAR VIEW
 * For team owners and commanders - shows full team calendar
 */
export default function AdminCalendarView() {
  const colors = useColors();
  const { teamName, myRole } = useTeamRole();

  // TODO: Fetch real team training data
  const events: CalendarEvent[] = useMemo(() => [], []);

  const handleEventPress = (event: CalendarEvent) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(event.title, `Training event`);
  };

  const handleCreateTraining = (date: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert('Schedule Training', `Create training for ${new Date(date).toLocaleDateString()}`);
  };

  const roleLabel = myRole 
    ? myRole.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
    : 'Admin';

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Calendar</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>
          {teamName || 'Your Team'} • {roleLabel} View
        </Text>
      </View>

      {/* Calendar */}
      <TrainingCalendar
        events={events}
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
