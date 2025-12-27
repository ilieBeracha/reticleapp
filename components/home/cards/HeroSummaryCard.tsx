/**
 * Hero Summary Card
 *
 * PERSONAL FOCUS. Shows YOUR practice status:
 * - Active solo session → Continue
 * - No session → Weekly stats + Start Practice
 *
 * Team trainings are handled separately by UpcomingTrainingsCard.
 */
import { BUTTON_GRADIENT } from '@/theme/colors';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeState } from '../types';

interface HeroSummaryCardProps {
  homeState: HomeState;
  onPress: () => void;
}

function HeroSummaryCard({ homeState, onPress }: HeroSummaryCardProps) {
  const { activeSession, weeklyStats } = homeState;

  const hasActiveSession = activeSession && activeSession.origin === 'solo';

  const sessionName = hasActiveSession ? activeSession.drillName || 'Practice Session' : undefined;

  return (
    <Animated.View entering={FadeInDown.duration(350)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={[...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroMain}>
            <View style={styles.heroContent}>
              {hasActiveSession ? (
                <>
                  <View style={styles.heroActiveRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.heroLabel}>Session in progress</Text>
                  </View>
                  <Text style={styles.heroTitle} numberOfLines={1}>
                    {sessionName}
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.heroLabel}>This week</Text>
                  <Text style={styles.heroTitle}>
                    <Text style={styles.heroHighlight}>{weeklyStats.sessions}</Text>
                    {' '}session{weeklyStats.sessions !== 1 ? 's' : ''}
                  </Text>
                </>
              )}
            </View>

            <View style={styles.heroActionBtn}>
              <Text style={styles.heroActionText}>{hasActiveSession ? 'Continue' : 'Start'}</Text>
              <ChevronRight size={14} color="#fff" />
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
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  heroMain: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroContent: {
    flex: 1,
  },
  heroActiveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 1,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  heroLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.6)',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    letterSpacing: -0.3,
    marginTop: 1,
  },
  heroHighlight: {
    color: '#7DD3FC',
  },
  heroActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 18,
  },
  heroActionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
});
