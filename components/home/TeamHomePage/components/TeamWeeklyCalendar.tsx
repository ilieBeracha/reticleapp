/**
 * TeamWeeklyCalendar Component
 *
 * Compact 7-day calendar showing team trainings.
 * Always visible (even when no trainings), showing the week layout.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import type { Colors } from '@/types/home';
import type { TrainingWithDetails } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { Calendar } from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TeamWeeklyCalendarProps {
  colors: Colors;
  trainings: TrainingWithDetails[];
  teamColor: string;
}

interface DayData {
  date: Date;
  dayName: string;
  dayNumber: number;
  isToday: boolean;
  trainings: TrainingWithDetails[];
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

const getDayNames = (t: ReturnType<typeof useTranslation>['t']) => [
  t('time.dayNames.sun'),
  t('time.dayNames.mon'),
  t('time.dayNames.tue'),
  t('time.dayNames.wed'),
  t('time.dayNames.thu'),
  t('time.dayNames.fri'),
  t('time.dayNames.sat'),
];

function buildDayData(trainings: TrainingWithDetails[], t: ReturnType<typeof useTranslation>['t']): DayData[] {
  const DAY_NAMES = getDayNames(t);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: DayData[] = [];

  // Show today + 6 days ahead (7 total)
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const isToday = i === 0;

    const dayTrainings = trainings.filter((t) => {
      if (t.status === 'ongoing' && isToday) return true;
      if (t.status === 'ongoing' && !isToday) return false;
      const trainingDate = new Date(t.scheduled_at || t.created_at);
      return trainingDate >= date && trainingDate < nextDay;
    });

    days.push({
      date,
      dayName: isToday ? t('time.today') : DAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      isToday,
      trainings: dayTrainings,
    });
  }

  return days;
}

function formatTrainingTime(training: TrainingWithDetails, t: ReturnType<typeof useTranslation>['t']): string {
  if (training.status === 'ongoing') return t('training.live');
  const dateString = training.scheduled_at;
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// ═══════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function TrainingDot({ isPulsing, color }: { isPulsing: boolean; color: string }) {
  const opacity = useSharedValue(1);

  if (isPulsing) {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );
  }

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return <Animated.View style={[s.trainingDot, { backgroundColor: color }, animStyle]} />;
}

function DayColumn({
  day,
  index,
  isSelected,
  onPress,
  colors,
  teamColor,
}: {
  day: DayData;
  index: number;
  isSelected: boolean;
  onPress: (index: number) => void;
  colors: Colors;
  teamColor: string;
}) {
  const scale = useSharedValue(1);
  const hasTrainings = day.trainings.length > 0;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    if (hasTrainings) scale.value = withSpring(0.92);
  };
  const handlePressOut = () => {
    scale.value = withSpring(1);
  };
  const handlePress = () => {
    if (hasTrainings) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onPress(index);
    }
  };

  return (
    <AnimatedTouchable
      style={[s.dayColumn, isSelected && { backgroundColor: `${teamColor}10` }, animStyle]}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={!hasTrainings}
    >
      {/* Day name */}
      <Text
        style={[
          s.dayName,
          { color: hasTrainings ? colors.text : `${colors.textMuted}60` },
          day.isToday && { color: teamColor, fontWeight: '700' },
        ]}
      >
        {day.dayName}
      </Text>

      {/* Date number */}
      <View
        style={[
          s.dateCircle,
          day.isToday && [s.dateCircleToday, { backgroundColor: teamColor }],
          isSelected && !day.isToday && { backgroundColor: `${teamColor}15` },
        ]}
      >
        <Text
          style={[
            s.dateNumber,
            { color: hasTrainings ? colors.text : `${colors.textMuted}40` },
            day.isToday && { color: '#fff' },
          ]}
        >
          {day.dayNumber}
        </Text>
      </View>

      {/* Training indicator dots */}
      <View style={s.dotStack}>
        {hasTrainings ? (
          <>
            {day.trainings.slice(0, 3).map((t, i) => (
              <TrainingDot
                key={t.id}
                isPulsing={t.status === 'ongoing'}
                color={t.status === 'ongoing' ? '#10B981' : teamColor}
              />
            ))}
          </>
        ) : (
          <View style={s.dotPlaceholder} />
        )}
      </View>
    </AnimatedTouchable>
  );
}

function ExpandedTrainingItem({
  training,
  colors,
  teamColor,
}: {
  training: TrainingWithDetails;
  colors: Colors;
  teamColor: string;
}) {
  const { t } = useTranslation();
  const isLive = training.status === 'ongoing';
  const timeStr = formatTrainingTime(training, t);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
  };

  return (
    <TouchableOpacity
      style={[s.expandedItem, { backgroundColor: colors.secondary }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[s.expandedIcon, { backgroundColor: `${teamColor}10` }]}>
        <Calendar size={14} color={teamColor} />
      </View>
      <View style={s.expandedInfo}>
        <Text style={[s.expandedTitle, { color: colors.text }]} numberOfLines={1}>
          {training.title}
        </Text>
      </View>

      <View style={s.expandedRight}>
        {isLive ? (
          <View style={[s.liveBadge, { backgroundColor: '#10B98112' }]}>
            <View style={[s.liveBadgeDot, { backgroundColor: '#10B981' }]} />
            <Text style={[s.liveBadgeText, { color: '#10B981' }]}>{t('training.live')}</Text>
          </View>
        ) : timeStr ? (
          <Text style={[s.expandedTime, { color: colors.textMuted }]}>{timeStr}</Text>
        ) : null}
        <DirectionalChevron size={12} color={colors.textMuted} />
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TeamWeeklyCalendar({ colors, trainings, teamColor }: TeamWeeklyCalendarProps) {
  const { t } = useTranslation();
  const days = useMemo(() => buildDayData(trainings, t), [trainings, t]);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);

  const handleDayPress = useCallback((index: number) => {
    setSelectedDayIndex((prev) => (prev === index ? null : index));
  }, []);

  const selectedDay = selectedDayIndex !== null ? days[selectedDayIndex] : null;
  const hasAnyTrainings = days.some((d) => d.trainings.length > 0);

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(50)}
      style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={s.header}>
        <View style={s.headerLeft}>
          <Calendar size={11} color={colors.textMuted} />
          <Text style={[s.headerTitle, { color: colors.textMuted }]}>{t('home.schedule').toUpperCase()}</Text>
        </View>
        {hasAnyTrainings && (
          <View style={[s.countBadge, { backgroundColor: `${teamColor}12` }]}>
            <Text style={[s.countText, { color: teamColor }]}>{trainings.length}</Text>
          </View>
        )}
      </View>

      {/* Day Row */}
      <View style={s.dayRow}>
        {days.map((day, index) => (
          <DayColumn
            key={index}
            day={day}
            index={index}
            isSelected={selectedDayIndex === index}
            onPress={handleDayPress}
            colors={colors}
            teamColor={teamColor}
          />
        ))}
      </View>

      {/* Expanded Panel */}
      {selectedDay && selectedDay.trainings.length > 0 && (
        <Animated.View entering={FadeInDown.duration(200)} style={[s.expandedPanel, { borderTopColor: colors.border }]}>
          {selectedDay.trainings.map((training) => (
            <ExpandedTrainingItem key={training.id} training={training} colors={colors} teamColor={teamColor} />
          ))}
        </Animated.View>
      )}

      {/* Empty state hint */}
      {!hasAnyTrainings && (
        <View style={s.emptyHint}>
          <Text style={[s.emptyText, { color: colors.textMuted }]}>{t('training.noUpcoming', 'No trainings scheduled')}</Text>
        </View>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.6,
  },
  countBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  countText: {
    fontSize: 10,
    fontWeight: '700',
  },

  // Day Row
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: 4,
    paddingVertical: 6,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 6,
    borderRadius: 8,
    gap: 3,
  },
  dayName: {
    fontSize: 9,
    fontWeight: '500',
    letterSpacing: -0.2,
  },
  dateCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleToday: {
    // backgroundColor set inline
  },
  dateNumber: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dotStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 8,
  },
  trainingDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotPlaceholder: {
    height: 8,
  },

  // Expanded Panel
  expandedPanel: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    overflow: 'hidden',
    paddingVertical: 8,
    paddingHorizontal: 10,
    gap: 8,
  },
  expandedIcon: {
    width: 28,
    height: 28,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  expandedInfo: {
    flex: 1,
  },
  expandedTitle: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  expandedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedTime: {
    fontSize: 10,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  liveBadgeDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.3,
  },

  // Empty state
  emptyHint: {
    paddingBottom: 10,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
