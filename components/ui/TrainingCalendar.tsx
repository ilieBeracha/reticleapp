import { Calendar } from './Calendar';
import { useCalendar, CalendarEvent, formatCalendarDate } from '@/hooks/ui/useCalendar';
import { useColors } from '@/hooks/ui/useColors';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { useRouter } from 'expo-router';

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
  const router = useRouter();
  
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
    } else if (selectedDate) {
      // Default navigation
      router.push('/(protected)/modal'); // TODO: Replace with actual training creation route
    }
  };

  return (
    <View style={styles.container}>
      <Calendar
        title="Training Calendar"
        onDayPress={handleDayPress}
        selectedDate={selectedDate}
        markedDates={markedDates}
      />

      {/* Selected Date Events */}
      {selectedDate && (
        <Animated.View 
          entering={FadeInDown.duration(300).springify()}
          style={styles.eventsSection}
        >
          <View style={styles.eventsHeader}>
            <View>
              <Text style={[styles.eventsTitle, { color: colors.text }]}>
                {formatCalendarDate(selectedDate)}
              </Text>
              <Text style={[styles.eventsCount, { color: colors.textMuted }]}>
                {selectedDateEvents.length === 0 
                  ? 'No trainings scheduled' 
                  : `${selectedDateEvents.length} training${selectedDateEvents.length !== 1 ? 's' : ''} scheduled`
                }
              </Text>
            </View>
            
            <Pressable
              onPress={handleCreatePress}
              style={[styles.createButton, { backgroundColor: colors.accent }]}
            >
              <Text style={[styles.createButtonText, { color: colors.accentForeground }]}>
                + Create
              </Text>
            </Pressable>
          </View>

          {selectedDateEvents.length > 0 && (
            <ScrollView 
              style={styles.eventsList}
              showsVerticalScrollIndicator={false}
            >
              {selectedDateEvents.map((event, index) => (
                <EventCard
                  key={event.id}
                  event={event}
                  index={index}
                  onPress={() => onEventPress?.(event)}
                  color={event.color || eventColors[event.type]}
                />
              ))}
            </ScrollView>
          )}
        </Animated.View>
      )}
    </View>
  );
}

interface EventCardProps {
  event: CalendarEvent;
  index: number;
  onPress?: () => void;
  color: string;
}

function EventCard({ event, index, onPress, color }: EventCardProps) {
  const colors = useColors();

  const typeLabels = {
    training: 'Training',
    session: 'Session',
    assessment: 'Assessment',
    briefing: 'Briefing',
    qualification: 'Qualification',
  };

  return (
    <Animated.View
      entering={FadeIn.delay(index * 100).duration(300)}
    >
      <Pressable
        onPress={onPress}
        style={({ pressed }) => [
          styles.eventCard,
          { 
            backgroundColor: colors.card,
            borderLeftColor: color,
            opacity: pressed ? 0.7 : 1,
          },
        ]}
      >
        <View style={styles.eventContent}>
          <View style={[styles.eventIndicator, { backgroundColor: color }]} />
          
          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: colors.text }]}>
              {event.title}
            </Text>
            <Text style={[styles.eventType, { color: colors.textMuted }]}>
              {typeLabels[event.type]}
            </Text>
          </View>

          <View style={styles.eventArrow}>
            <Text style={[styles.arrowIcon, { color: colors.textMuted }]}>
              ›
            </Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 24,
  },
  eventsSection: {
    gap: 16,
  },
  eventsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  eventsTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  eventsCount: {
    fontSize: 14,
  },
  createButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    shadowColor: '#E76925',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  createButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  eventsList: {
    maxHeight: 300,
  },
  eventCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  eventContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eventIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  eventType: {
    fontSize: 13,
    textTransform: 'capitalize',
  },
  eventArrow: {
    paddingLeft: 8,
  },
  arrowIcon: {
    fontSize: 24,
    fontWeight: '300',
  },
});

