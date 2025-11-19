import { Calendar } from './Calendar';
import { useCalendar, CalendarEvent, formatCalendarDate } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TrainingCalendarProps {
  events?: CalendarEvent[];
  onEventPress?: (event: CalendarEvent) => void;
  onCreateTraining?: (date: string) => void;
}

export function TrainingCalendar({ 
  events = [], 
  onEventPress,
  onCreateTraining,
}: TrainingCalendarProps) {
  const colors = useColors();
  
  const {
    selectedDate,
    markedDates,
    handleDayPress,
    selectedDateEvents,
    eventColors,
  } = useCalendar(events);

  const handleCreatePress = () => {
    if (selectedDate && onCreateTraining) {
      onCreateTraining(selectedDate);
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        title=""
        showTitle={false}
        onDayPress={handleDayPress}
        selectedDate={selectedDate}
        markedDates={markedDates}
      />

      {/* Selected Date Events */}
      {selectedDate && (
        <View style={styles.eventsSection}>
          <View style={styles.eventsHeader}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.eventsDate, { color: colors.text }]}>
                {formatCalendarDate(selectedDate)}
              </Text>
              <Text style={[styles.eventsCount, { color: colors.textMuted }]}>
                {selectedDateEvents.length === 0 
                  ? 'No events scheduled' 
                  : `${selectedDateEvents.length} event${selectedDateEvents.length !== 1 ? 's' : ''}`
                }
              </Text>
            </View>
            
            {selectedDate && (
              <Pressable
                onPress={handleCreatePress}
                style={({ pressed }) => [
                  styles.createButton,
                  { 
                    backgroundColor: colors.accent,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
              >
                <Ionicons name="add" size={20} color={colors.accentForeground} />
              </Pressable>
            )}
          </View>

          {selectedDateEvents.length > 0 && (
            <View style={styles.eventsList}>
              {selectedDateEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onPress={() => onEventPress?.(event)}
                  color={event.color || eventColors[event.type]}
                />
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

interface EventCardProps {
  event: CalendarEvent;
  onPress?: () => void;
  color: string;
}

function EventCard({ event, onPress, color }: EventCardProps) {
  const colors = useColors();

  const typeLabels = {
    training: 'Training',
    session: 'Session',
    assessment: 'Assessment',
    briefing: 'Briefing',
    qualification: 'Qualification',
  };

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.eventCard,
        { 
          backgroundColor: colors.card,
          borderLeftColor: color,
          opacity: pressed ? 0.8 : 1,
        },
      ]}
    >
      <View style={[styles.eventDot, { backgroundColor: color }]} />
      
      <View style={styles.eventInfo}>
        <Text style={[styles.eventTitle, { color: colors.text }]} numberOfLines={1}>
          {event.title}
        </Text>
        <Text style={[styles.eventType, { color: colors.textMuted }]}>
          {typeLabels[event.type]}
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
  },
  eventsSection: {
    gap: 12,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventsDate: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 2,
    letterSpacing: -0.3,
  },
  eventsCount: {
    fontSize: 13,
    fontWeight: '500',
  },
  createButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eventsList: {
    gap: 8,
  },
  eventCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderLeftWidth: 3,
    gap: 12,
  },
  eventDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  eventInfo: {
    flex: 1,
    gap: 2,
  },
  eventTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  eventType: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});

