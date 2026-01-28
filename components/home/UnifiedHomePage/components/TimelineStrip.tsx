/**
 * TimelineStrip Component
 *
 * Horizontal 7-day timeline showing team-colored dots for upcoming trainings.
 * Tapping a day expands to show training details.
 */

import type { TrainingWithDetails } from '@/types/workspace';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import type { Colors } from '../UnifiedHomePage.types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

interface TimelineStripProps {
  colors: Colors;
  trainings: TrainingWithDetails[];
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

const TEAM_COLORS = [
  '#3B82F6', // blue
  '#10B981', // green
  '#F97316', // orange
  '#EF4444', // red
  '#EAB308', // yellow
  '#8B5CF6', // purple
  '#14B8A6', // teal
  '#6366F1', // indigo
  '#EC4899', // pink
];

function getTeamColor(teamId: string | undefined): string {
  if (!teamId) return TEAM_COLORS[0];
  let hash = 0;
  for (let i = 0; i < teamId.length; i++) {
    hash = (hash * 31 + teamId.charCodeAt(i)) | 0;
  }
  return TEAM_COLORS[Math.abs(hash) % TEAM_COLORS.length];
}

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

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);

    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);

    const dayTrainings = trainings.filter((t) => {
      if (t.status === 'ongoing' && i === 0) return true;
      if (t.status === 'ongoing' && i !== 0) return false;
      const trainingDate = new Date(t.scheduled_at || t.created_at);
      return trainingDate >= date && trainingDate < nextDay;
    });

    days.push({
      date,
      dayName: i === 0 ? t('time.today') : DAY_NAMES[date.getDay()],
      dayNumber: date.getDate(),
      isToday: i === 0,
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

const MAX_DOTS = 3;
const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

function TeamDot({ color, isPulsing, size = 9 }: { color: string; isPulsing: boolean; size?: number }) {
  const opacity = useSharedValue(1);

  useEffect(() => {
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
  }, [isPulsing]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[{ width: size, height: size, borderRadius: size / 2, backgroundColor: color }, animStyle]} />
  );
}

function DayColumn({
  day,
  index,
  isSelected,
  onPress,
  colors,
}: {
  day: DayData;
  index: number;
  isSelected: boolean;
  onPress: (index: number) => void;
  colors: Colors;
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

  const uniqueTeams = useMemo(() => {
    const seen = new Set<string>();
    return day.trainings.filter((t) => {
      const key = t.team?.id || t.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [day.trainings]);

  const overflow = uniqueTeams.length > MAX_DOTS ? uniqueTeams.length - MAX_DOTS : 0;

  return (
    <AnimatedTouchable
      style={[
        s.dayColumn,
        isSelected && [
          s.dayColumnSelected,
          { backgroundColor: `${colors.primary}12`, borderColor: `${colors.primary}30` },
        ],
        animStyle,
      ]}
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
          { color: hasTrainings ? colors.text : `${colors.textMuted}80` },
          day.isToday && { color: colors.primary },
        ]}
      >
        {day.dayName}
      </Text>

      {/* Date number */}
      <View
        style={[
          s.dateCircle,
          day.isToday && [s.dateCircleToday, { backgroundColor: colors.primary }],
          isSelected && !day.isToday && { backgroundColor: `${colors.primary}20` },
        ]}
      >
        <Text
          style={[
            s.dateNumber,
            { color: hasTrainings ? colors.text : `${colors.textMuted}60` },
            day.isToday && { color: '#fff' },
          ]}
        >
          {day.dayNumber}
        </Text>
      </View>

      {/* Dot stack */}
      <View style={s.dotStack}>
        {hasTrainings ? (
          <>
            {uniqueTeams.slice(0, MAX_DOTS).map((t) => (
              <TeamDot key={t.id} color={getTeamColor(t.team?.id)} isPulsing={t.status === 'ongoing'} />
            ))}
            {overflow > 0 && <Text style={[s.overflowText, { color: colors.textMuted }]}>+{overflow}</Text>}
          </>
        ) : (
          <View style={s.dotPlaceholder} />
        )}
      </View>
    </AnimatedTouchable>
  );
}

function ExpandedTrainingItem({ training, colors }: { training: TrainingWithDetails; colors: Colors }) {
  const { t } = useTranslation();
  const teamColor = getTeamColor(training.team?.id);
  const isLive = training.status === 'ongoing';
  const timeStr = formatTrainingTime(training, t);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(protected)/trainingDetail?id=${training.id}` as any);
  };

  return (
    <TouchableOpacity
      style={[s.expandedItem, { backgroundColor: `${teamColor}08` }]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      {/* Color bar */}
      <View style={[s.expandedColorBar, { backgroundColor: teamColor }]} />

      <View style={s.expandedContent}>
        <View style={s.expandedInfo}>
          <Text style={[s.expandedTitle, { color: colors.text }]} numberOfLines={1}>
            {training.title}
          </Text>
          {training.team?.name && (
            <Text style={[s.expandedTeam, { color: colors.textMuted }]} numberOfLines={1}>
              {training.team.name}
            </Text>
          )}
        </View>

        <View style={s.expandedRight}>
          {isLive ? (
            <View style={[s.liveBadge, { backgroundColor: `${colors.orange}20` }]}>
              <View style={[s.liveBadgeDot, { backgroundColor: colors.orange }]} />
              <Text style={[s.liveBadgeText, { color: colors.orange }]}>{t('training.live')}</Text>
            </View>
          ) : timeStr ? (
            <Text style={[s.expandedTime, { color: colors.textMuted }]}>{timeStr}</Text>
          ) : null}
          <ChevronRight size={14} color={colors.textMuted} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export function TimelineStrip({ colors, trainings }: TimelineStripProps) {
  const { t } = useTranslation();
  const days = useMemo(() => buildDayData(trainings, t), [trainings, t]);

  // Auto-expand today if there's a live training
  const liveDayIndex = useMemo(
    () => days.findIndex((d) => d.trainings.some((t) => t.status === 'ongoing')),
    [days]
  );
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(liveDayIndex >= 0 ? liveDayIndex : null);

  const handleDayPress = useCallback((index: number) => {
    setSelectedDayIndex((prev) => (prev === index ? null : index));
  }, []);

  const handleGoToTeam = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(protected)/(tabs)/team');
  }, []);

  const hasAnyTrainings = days.some((d) => d.trainings.length > 0);
  if (!hasAnyTrainings) return null;

  const selectedDay = selectedDayIndex !== null ? days[selectedDayIndex] : null;

  return (
    <Animated.View
      entering={FadeInDown.duration(300).delay(100)}
      style={[s.container, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      {/* Header */}
      <View style={s.header}>
        <Text style={[s.headerTitle, { color: colors.textMuted }]}>{t('home.schedule')}</Text>
        <TouchableOpacity onPress={handleGoToTeam} activeOpacity={0.7} style={s.headerLink}>
          <Text style={[s.headerLinkText, { color: colors.primary }]}>{t('teams.team')}</Text>
          <ChevronRight size={12} color={colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Day Row - evenly distributed */}
      <View style={s.dayRow}>
        {days.map((day, index) => (
          <DayColumn
            key={index}
            day={day}
            index={index}
            isSelected={selectedDayIndex === index}
            onPress={handleDayPress}
            colors={colors}
          />
        ))}
      </View>

      {/* Expanded Panel */}
      {selectedDay && selectedDay.trainings.length > 0 && (
        <Animated.View entering={FadeInDown.duration(200)} style={[s.expandedPanel, { borderTopColor: colors.border }]}>
          {selectedDay.trainings.map((training) => (
            <ExpandedTrainingItem key={training.id} training={training} colors={colors} />
          ))}
        </Animated.View>
      )}
    </Animated.View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════

const s = StyleSheet.create({
  container: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 4,
  },
  headerTitle: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  headerLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  headerLinkText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Day Row
  dayRow: {
    flexDirection: 'row',
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  dayColumn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  dayColumnSelected: {
    borderWidth: 1,
  },
  dayName: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  dateCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateCircleToday: {
    // backgroundColor set inline
  },
  dateNumber: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  dotStack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    minHeight: 10,
  },
  dotPlaceholder: {
    height: 10,
  },
  overflowText: {
    fontSize: 9,
    fontWeight: '700',
  },

  // Expanded Panel
  expandedPanel: {
    borderTopWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 6,
  },
  expandedItem: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    overflow: 'hidden',
  },
  expandedColorBar: {
    width: 4,
    alignSelf: 'stretch',
  },
  expandedContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    gap: 8,
  },
  expandedInfo: {
    flex: 1,
    gap: 2,
  },
  expandedTitle: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  expandedTeam: {
    fontSize: 11,
  },
  expandedRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  expandedTime: {
    fontSize: 11,
    fontWeight: '600',
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveBadgeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  liveBadgeText: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
