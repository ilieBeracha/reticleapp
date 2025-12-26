/**
 * Hero Summary Card
 * 
 * TRAINING-FIRST hero card. Shows:
 * - Active session (if any)
 * - Next TRAINING with drill count and progress
 * - Or prompts to start practice
 * 
 * Trainings and drills are shown EXPLICITLY.
 */
import { useColors } from '@/hooks/ui/useColors';
import { BUTTON_GRADIENT } from '@/theme/colors';
import { differenceInHours, differenceInMinutes, format, formatDistanceToNow, isToday, isTomorrow } from 'date-fns';
import { LinearGradient } from 'expo-linear-gradient';
import { Calendar, ChevronRight, Clock, Target, Users } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import type { HomeSession, HomeState } from '../types';

interface HeroSummaryCardProps {
  homeState: HomeState;
  onPress: () => void;
}

function HeroSummaryCard({ homeState, onPress }: HeroSummaryCardProps) {
  const colors = useColors();
  const { activeSession, nextSession, lastSession, unresolvedSignal, hasTeams } = homeState;
  
  const today = new Date();
  const dateStr = format(today, 'd MMMM');

  // Determine what to show - priority order:
  // 1. Active session
  // 2. Live team session (ongoing training)
  // 3. Upcoming scheduled session
  // 4. Unresolved last session
  // 5. Start practice prompt
  
  const getContent = () => {
    // 1. Active personal session
    if (activeSession && activeSession.origin === 'solo') {
      return {
        badge: { text: 'Active', color: '#22C55E', showDot: true },
        label: activeSession.trainingTitle ? 'Training Session' : 'Practice Session',
        title: (
          <Text style={styles.heroTitle}>
            Continue <Text style={styles.heroHighlight}>{activeSession.drillName || 'session'}</Text>
          </Text>
        ),
        subtitle: activeSession.trainingTitle,
        action: 'Continue',
        drillInfo: undefined,
      };
    }
    
    // 2. Live team training (ongoing)
    if (nextSession?.state === 'active' && nextSession.origin === 'team') {
      const drillProgress = nextSession.drillCount 
        ? `${nextSession.drillsCompleted || 0}/${nextSession.drillCount} drills`
        : undefined;
      return {
        badge: { text: 'Live', color: '#EF4444', showDot: true },
        label: nextSession.teamName || 'Team Training',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{nextSession.trainingTitle || 'Training'}</Text>
          </Text>
        ),
        subtitle: drillProgress,
        action: 'Join Training',
        drillInfo: drillProgress,
      };
    }
    
    // 3. Upcoming scheduled TRAINING (show training name + drill count)
    if (nextSession?.state === 'scheduled' && nextSession.scheduledAt) {
      const timeLabel = getScheduledTimeLabel(nextSession.scheduledAt);
      const drillCount = nextSession.drillCount || 0;
      const drillsLeft = drillCount - (nextSession.drillsCompleted || 0);
      
      // Build subtitle: "Alpha Squad • 3 drills"
      const subtitleParts: string[] = [];
      if (nextSession.teamName) subtitleParts.push(nextSession.teamName);
      if (drillCount > 0) subtitleParts.push(`${drillCount} drill${drillCount !== 1 ? 's' : ''}`);
      
      return {
        badge: timeLabel.isUrgent 
          ? { text: timeLabel.shortLabel, color: '#F59E0B', showDot: false }
          : undefined,
        label: `Training ${timeLabel.label}`,
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{nextSession.trainingTitle || 'Training'}</Text>
          </Text>
        ),
        subtitle: subtitleParts.join(' • ') || undefined,
        action: 'Prepare',
        drillInfo: drillCount > 0 ? `${drillsLeft} drill${drillsLeft !== 1 ? 's' : ''} to go` : undefined,
      };
    }
    
    // 4. Unresolved signal about last session
    if (unresolvedSignal?.type === 'no_review' && lastSession) {
      return {
        badge: { text: 'Review', color: '#F59E0B', showDot: false },
        label: lastSession.trainingTitle || 'Last Session',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{lastSession.drillName || 'Session'}</Text> needs review
          </Text>
        ),
        subtitle: undefined,
        action: 'Review',
        drillInfo: undefined,
      };
    }
    
    // 5. Default: start practice
    if (lastSession) {
      const sessionCount = homeState.weeklyStats.sessions;
      return {
        badge: undefined,
        label: 'Ready to train',
        title: (
          <Text style={styles.heroTitle}>
            <Text style={styles.heroHighlight}>{sessionCount}</Text> session{sessionCount !== 1 ? 's' : ''} this week
          </Text>
        ),
        subtitle: undefined,
        action: 'Start Practice',
        drillInfo: undefined,
      };
    }
    
    // 6. Empty state
    return {
      badge: undefined,
      label: 'Welcome',
      title: (
        <Text style={styles.heroTitle}>
          Ready to <Text style={styles.heroHighlight}>train</Text>?
        </Text>
      ),
      subtitle: undefined,
      action: 'Start Practice',
      drillInfo: undefined,
    };
  };

  const { badge, label, title, subtitle, action, drillInfo } = getContent();

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
            {badge && (
              <View style={[styles.heroBadge, { backgroundColor: `${badge.color}25` }]}>
                {badge.showDot && <View style={[styles.liveDot, { backgroundColor: badge.color }]} />}
                <Text style={[styles.heroBadgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
            )}
          </View>

          <View style={styles.heroContent}>
            <Text style={styles.heroLabel}>{label}</Text>
            {title}
            {subtitle && (
              <Text style={styles.heroSubtitle} numberOfLines={1}>{subtitle}</Text>
            )}
            {drillInfo && (
              <View style={styles.drillInfoRow}>
                <Target size={12} color="rgba(255,255,255,0.7)" />
                <Text style={styles.drillInfoText}>{drillInfo}</Text>
              </View>
            )}
          </View>

          <View style={styles.heroFooter}>
            <View style={styles.heroAction}>
              <Text style={styles.heroActionText}>{action}</Text>
              <ChevronRight size={16} color="rgba(255,255,255,0.9)" />
            </View>
          </View>
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
}

/** Get human-readable time label for scheduled session */
function getScheduledTimeLabel(date: Date): { label: string; shortLabel: string; isUrgent: boolean } {
  const now = new Date();
  const minutesAway = differenceInMinutes(date, now);
  const hoursAway = differenceInHours(date, now);
  
  if (minutesAway <= 0) {
    return { label: 'now', shortLabel: 'Now', isUrgent: true };
  }
  
  if (minutesAway <= 60) {
    return { label: `in ${minutesAway}m`, shortLabel: `${minutesAway}m`, isUrgent: true };
  }
  
  if (hoursAway < 24 && isToday(date)) {
    return { label: `at ${format(date, 'h:mm a')}`, shortLabel: format(date, 'h:mm a'), isUrgent: false };
  }
  
  if (isTomorrow(date)) {
    return { label: 'tomorrow', shortLabel: 'Tomorrow', isUrgent: false };
  }
  
  return { 
    label: formatDistanceToNow(date, { addSuffix: true }), 
    shortLabel: format(date, 'EEE'), 
    isUrgent: false 
  };
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
    fontSize: 13,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.9)',
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
  heroContent: {
    flex: 1,
  },
  heroLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.6)',
    marginBottom: 4,
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
  heroSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(255,255,255,0.7)',
    marginTop: 4,
  },
  drillInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  drillInfoText: {
    fontSize: 12,
    fontWeight: '600',
    color: 'rgba(255,255,255,0.7)',
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
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  }
});

