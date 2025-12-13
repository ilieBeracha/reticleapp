/**
 * Hero Summary Card
 * 
 * Main hero card at top of home page showing dynamic status
 * based on user's current state (active session, teams, solo).
 */
import { useColors } from '@/hooks/ui/useColors';
import type { SessionWithDetails } from '@/services/sessionService';
import { BUTTON_GRADIENT } from '@/theme/colors';
import { format } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

interface HeroSummaryCardProps {
  allSessions: SessionWithDetails[];
  activeSession: SessionWithDetails | null;
  upcomingCount: number;
  hasTeams: boolean;
  teamCount: number;
  onPress: () => void;
}

export function HeroSummaryCard({
  allSessions,
  activeSession,
  upcomingCount,
  hasTeams,
  teamCount,
  onPress,
}: HeroSummaryCardProps) {
  const colors = useColors();
  const totalSessions = allSessions.length;
  const today = new Date();
  const dateStr = format(today, 'd MMMM');

  // Dynamic message based on user's activity
  const getMessage = () => {
    if (activeSession) {
      return {
        label: 'Session in Progress',
        title: (
          <Text style={styles.heroTitle}>
            Continue your <Text style={styles.heroHighlight}>active session</Text>
          </Text>
        ),
      };
    }

    if (hasTeams && upcomingCount > 0) {
      return {
        label: 'Training Schedule',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{upcomingCount}</Text> training{upcomingCount !== 1 ? 's' : ''}{' '}
            across <Text style={styles.heroHighlight}>{teamCount}</Text> team{teamCount !== 1 ? 's' : ''}
          </Text>
        ),
      };
    }

    if (hasTeams) {
      return {
        label: 'Your Teams',
        title: (
          <Text style={styles.heroTitle}>
            Member of <Text style={styles.heroHighlight}>{teamCount} team{teamCount !== 1 ? 's' : ''}</Text>
          </Text>
        ),
      };
    }

    if (totalSessions > 0) {
      return {
        label: 'Solo Training',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{totalSessions}</Text> session{totalSessions !== 1 ? 's' : ''} logged
          </Text>
        ),
      };
    }

    return {
      label: 'Welcome',
      title: (
        <Text style={styles.heroTitle}>
          Ready to <Text style={styles.heroHighlight}>start training</Text>?
        </Text>
      ),
    };
  };

  const { label, title } = getMessage();
  const actionText = activeSession
    ? 'Resume Session'
    : hasTeams
      ? 'View Schedule'
      : 'Start Practice';

  return (
    <Animated.View entering={FadeInDown.duration(400)}>
      <TouchableOpacity activeOpacity={0.9} onPress={onPress}>
        <LinearGradient
          colors={[...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.heroCard}
        >
          <View style={styles.heroTop}>
            <View style={styles.heroDateRow}>
              <Calendar size={14} color="rgba(255,255,255,0.7)" />
              <Text style={styles.heroDate}>{dateStr}</Text>
            </View>
            {activeSession ? (
              <View style={styles.heroBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.heroBadgeText}>Active</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>{label}</Text>
            {title}
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>{actionText}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  heroCard: {
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 10 },
    elevation: 10,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  heroDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heroDate: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
    fontWeight: '600',
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4ADE80',
  },
  heroBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroContent: {
    marginBottom: 16,
  },
  heroLabel: {
    color: 'rgba(255,255,255,0.6)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 6,
  },
  heroTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: -0.5,
    lineHeight: 28,
  },
  heroHighlight: {
    color: '#fff',
    fontWeight: '800',
  },
  heroFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  heroAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  heroActionText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    fontWeight: '600',
  },
});

