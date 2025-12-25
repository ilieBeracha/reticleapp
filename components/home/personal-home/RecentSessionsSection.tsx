import { getSafeSessionDuration } from '@/utils/sessionDuration';
import { format, isToday, isYesterday } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ChevronRight, Clock, History, Target, Zap } from 'lucide-react-native';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SectionHeader } from '../_shared/SectionHeader';
import type { SessionWithDetails, ThemeColors } from './types';

interface RecentSessionsSectionProps {
  colors: ThemeColors;
  sessions: SessionWithDetails[];
}

export function RecentSessionsSection({ colors, sessions }: RecentSessionsSectionProps) {
  if (sessions.length === 0) {
    return (
      <View style={styles.section}>
        <SectionHeader
          left={<History size={14} color={colors.textMuted} />}
          title={<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECENT</Text>}
        />
        <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Zap size={20} color={colors.textMuted} />
          <Text style={[styles.emptyText, { color: colors.textMuted }]}>
            No sessions yet
          </Text>
          <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
            Start your first session above
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <SectionHeader
        left={<History size={14} color={colors.textMuted} />}
        title={<Text style={[styles.sectionLabel, { color: colors.textMuted }]}>RECENT</Text>}
        right={
          <TouchableOpacity
            onPress={() => router.push('/(protected)/(tabs)/insights')}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Text style={[styles.sectionLink, { color: colors.textMuted }]}>See all</Text>
          </TouchableOpacity>
        }
      />

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {sessions.map((session, index) => (
          <SessionItem 
            key={session.id} 
            session={session} 
            colors={colors} 
            isLast={index === sessions.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

function SessionItem({ session, colors, isLast }: { session: SessionWithDetails; colors: ThemeColors; isLast: boolean }) {
  const duration = getDuration(session);
  const dateLabel = getDateLabel(session.created_at);

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      style={[
        styles.item, 
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.border },
      ]}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      }}
    >
      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: colors.secondary }]}>
        <Target size={16} color={colors.text} />
      </View>

      <View style={styles.itemContent}>
        <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
          {session.training_title || session.drill_name || 'Freestyle'}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.itemMeta, { color: colors.textMuted }]}>
            {dateLabel}
          </Text>
          <View style={styles.durationBadge}>
            <Clock size={10} color={colors.textMuted} />
            <Text style={[styles.durationText, { color: colors.textMuted }]}>
              {duration}m
            </Text>
          </View>
        </View>
      </View>

      <ChevronRight size={16} color={colors.textMuted} />
    </TouchableOpacity>
  );
}

function getDuration(session: SessionWithDetails): number {
  const durationSeconds = getSafeSessionDuration(session);
  return Math.round(durationSeconds / 60); // Convert to minutes
}

function getDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  if (isToday(date)) {
    return `Today, ${format(date, 'h:mm a')}`;
  }
  if (isYesterday(date)) {
    return `Yesterday, ${format(date, 'h:mm a')}`;
  }
  return format(date, 'MMM d, h:mm a');
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  sectionLink: {
    fontSize: 12,
    fontWeight: '500',
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    paddingHorizontal: 14,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  itemContent: {
    flex: 1,
    gap: 4,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: -0.2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  itemMeta: {
    fontSize: 12,
  },
  durationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  durationText: {
    fontSize: 11,
    fontWeight: '500',
    fontVariant: ['tabular-nums'],
  },
  emptyState: {
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderRadius: 14,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '500',
  },
  emptyHint: {
    fontSize: 12,
    opacity: 0.7,
  },
});
