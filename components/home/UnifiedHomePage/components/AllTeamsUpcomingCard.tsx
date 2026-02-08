/**
 * AllTeamsUpcomingCard Component
 *
 * Shows upcoming trainings from ALL user's teams in personal mode.
 * Sorted by closest date, max 5 visible with collapse/expand.
 * Each row shows team name + training title + date.
 */

import { DirectionalChevron } from '@/components/shared/DirectionalChevron';
import type { TrainingWithDetails } from '@/types/workspace';
import { format, isToday, isTomorrow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { Calendar, ChevronDown, ChevronUp, Users } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

const MAX_VISIBLE = 5;

interface AllTeamsUpcomingCardProps {
  trainings: TrainingWithDetails[];
  teamNameMap: Map<string, string>;
  onTrainingPress: (training: TrainingWithDetails) => void;
  colors: {
    text: string;
    textMuted: string;
    card: string;
    border: string;
    background: string;
    primary: string;
    blue: string;
    secondary: string;
  };
}

export function AllTeamsUpcomingCard({
  trainings,
  teamNameMap,
  onTrainingPress,
  colors,
}: AllTeamsUpcomingCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (trainings.length === 0) return null;

  const visibleTrainings = expanded ? trainings : trainings.slice(0, MAX_VISIBLE);
  const hasMore = trainings.length > MAX_VISIBLE;

  const handleToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setExpanded((prev) => !prev);
  };

  return (
    <Animated.View entering={FadeIn.delay(100)} style={s.container}>
      {/* Section Label */}
      <View style={s.headerRow}>
        <Calendar size={11} color={colors.textMuted} />
        <Text style={[s.headerText, { color: colors.textMuted }]}>UPCOMING TRAININGS</Text>
        <Text style={[s.countBadge, { color: colors.primary, backgroundColor: colors.primary + '12' }]}>
          {trainings.length}
        </Text>
      </View>

      {/* Training List */}
      <View style={[s.list, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {visibleTrainings.map((training, i) => {
          const teamName = training.team_id ? teamNameMap.get(training.team_id) : null;
          const dateLabel = getDateLabel(training.scheduled_at);
          const isLast = i === visibleTrainings.length - 1 && !hasMore;

          return (
            <TouchableOpacity
              key={training.id}
              style={[s.row, !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border }]}
              onPress={() => onTrainingPress(training)}
              activeOpacity={0.6}
            >
              {/* Date badge */}
              <View style={[s.dateBadge, { backgroundColor: colors.secondary }]}>
                <Text style={[s.dateDay, { color: colors.text }]}>{dateLabel.day}</Text>
                {dateLabel.month ? (
                  <Text style={[s.dateMonth, { color: colors.textMuted }]}>{dateLabel.month}</Text>
                ) : null}
              </View>

              {/* Info */}
              <View style={s.info}>
                <Text style={[s.title, { color: colors.text }]} numberOfLines={1}>
                  {training.title}
                </Text>
                <View style={s.metaRow}>
                  {teamName && (
                    <View style={s.teamTag}>
                      <Users size={9} color={colors.blue} />
                      <Text style={[s.teamName, { color: colors.blue }]} numberOfLines={1}>
                        {teamName}
                      </Text>
                    </View>
                  )}
                  <Text style={[s.time, { color: colors.textMuted }]}>{dateLabel.time}</Text>
                </View>
              </View>

              <DirectionalChevron size={12} color={colors.textMuted} />
            </TouchableOpacity>
          );
        })}

        {/* Expand/Collapse */}
        {hasMore && (
          <TouchableOpacity
            style={[s.expandRow, { borderTopWidth: 1, borderTopColor: colors.border }]}
            onPress={handleToggle}
            activeOpacity={0.6}
          >
            {expanded ? (
              <ChevronUp size={14} color={colors.textMuted} />
            ) : (
              <ChevronDown size={14} color={colors.textMuted} />
            )}
            <Text style={[s.expandText, { color: colors.textMuted }]}>
              {expanded ? 'Show less' : `${trainings.length - MAX_VISIBLE} more`}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function getDateLabel(dateStr: string | null): { day: string; month: string; time: string } {
  if (!dateStr) return { day: '—', month: '', time: 'TBD' };

  const date = new Date(dateStr);

  if (isToday(date)) {
    return { day: 'Today', month: '', time: format(date, 'HH:mm') };
  }
  if (isTomorrow(date)) {
    return { day: 'Tmrw', month: '', time: format(date, 'HH:mm') };
  }

  return {
    day: format(date, 'd'),
    month: format(date, 'MMM'),
    time: format(date, 'EEE HH:mm'),
  };
}

const s = StyleSheet.create({
  container: {
    marginBottom: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 6,
    marginLeft: 1,
  },
  headerText: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.8,
    flex: 1,
  },
  countBadge: {
    fontSize: 10,
    fontWeight: '700',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
    overflow: 'hidden',
  },
  list: {
    borderRadius: 10,
    borderWidth: 1,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    gap: 10,
  },
  dateBadge: {
    width: 50,
    alignItems: 'center',
    paddingVertical: 4,
    borderRadius: 6,
  },
  dateDay: {
    fontSize: 13,
    fontWeight: '700',
  },
  dateMonth: {
    fontSize: 9,
    fontWeight: '500',
    marginTop: -1,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: -0.1,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  teamTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  teamName: {
    fontSize: 10,
    fontWeight: '600',
    maxWidth: 100,
  },
  time: {
    fontSize: 10,
    fontWeight: '500',
  },
  expandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 8,
  },
  expandText: {
    fontSize: 11,
    fontWeight: '500',
  },
});
