/**
 * Hero Summary Card
 * 
 * PERSONAL FOCUS. Shows YOUR practice status:
 * - Active solo session → Continue
 * - No session → Weekly stats + Start Practice
 * 
 * Team trainings are handled separately by UpcomingTrainingsCard.
 */
import { useColors } from '@/hooks/ui/useColors';
import { BUTTON_GRADIENT } from '@/theme/colors';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight, Clock } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeState } from '../types';

interface HeroSummaryCardProps {
  homeState: HomeState;
  onPress: () => void;
}

function HeroSummaryCard({ homeState, onPress }: HeroSummaryCardProps) {
  const colors = useColors();
  const { activeSession, weeklyStats } = homeState;
  
  const today = new Date();
  const dateStr = format(today, 'EEEE, d MMMM');

  // Simple logic: Active session OR start practice
  const hasActiveSession = activeSession && activeSession.origin === 'solo';
  
  const sessionName = hasActiveSession 
    ? (activeSession.drillName || 'Practice Session')
    : undefined;

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={[...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          {/* Top row: Date + Badge */}
          <View style={styles.heroTop}>
            <View style={styles.heroDateRow}>
              <Calendar size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDate}>{dateStr}</Text>
            </View>
            {hasActiveSession && (
              <View style={[styles.heroBadge, { backgroundColor: 'rgba(34, 197, 94, 0.25)' }]}>
                <View style={styles.liveDot} />
                <Text style={[styles.heroBadgeText, { color: '#22C55E' }]}>Active</Text>
              </View>
            )}
          </View>

          {/* Content */}
          <View style={styles.heroContent}>
            {hasActiveSession ? (
              // Active session state
              <>
                <Text style={styles.heroLabel}>Session in progress</Text>
                <Text style={styles.heroTitle}>
                  Continue <Text style={styles.heroHighlight}>{sessionName}</Text>
                </Text>
                <View style={styles.metaRow}>
                  <Clock size={12} color="rgba(255,255,255,0.6)" />
                  <Text style={styles.metaText}>Tap to continue</Text>
                </View>
              </>
            ) : (
              // Ready to train state
              <>
                <Text style={styles.heroLabel}>Your Practice</Text>
                <Text style={styles.heroTitle}>
                  <Text style={styles.heroHighlight}>{weeklyStats.sessions}</Text>
                  {' '}session{weeklyStats.sessions !== 1 ? 's' : ''} this week
                </Text>
              </>
            )}
          </View>

          {/* Footer action */}
          <View style={styles.heroFooter}>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>
                {hasActiveSession ? 'Continue' : 'Start Practice'}
              </Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default HeroSummaryCard;

const styles = StyleSheet.create({
  heroCard: {
    borderRadius: 16,
    padding: 16,
    minHeight: 130,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDate: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  heroBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    lineHeight: 24,
  },
  heroHighlight: {
    color: '#7DD3FC',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 6,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
  },
  heroFooter: {
    marginTop: 12,
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  heroActionText: {
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.8)',
  },
});
