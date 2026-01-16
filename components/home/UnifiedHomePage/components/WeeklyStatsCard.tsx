/**
 * WeeklyStatsCard Component
 *
 * Displays weekly shooting statistics in a compact, visually appealing card.
 * Each stat is tappable and opens a bottom sheet with detailed breakdown.
 * 
 * Stats shown:
 * - Shots: Total rounds fired this week
 * - Accuracy: Hit % from engagement drills
 * - Avg Group: Median paper dispersion
 * - Time: Total training time
 */

import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { 
  ArrowRight, 
  ChevronRight, 
  Clock, 
  Crosshair, 
  Flame, 
  Target, 
  TrendingUp,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { STREAK_DISPLAY_THRESHOLD } from '../UnifiedHomePage.constants';
import { formatDuration } from '../UnifiedHomePage.helpers';
import type { WeeklyStatsCardProps } from '../UnifiedHomePage.types';

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

type StatType = 'shots' | 'accuracy' | 'avgGroup' | 'time' | null;

interface StatModalContent {
  title: string;
  icon: React.ReactNode;
  iconColor: string;
  value: string;
  description: string;
  details: { label: string; value: string }[];
  actionLabel: string;
  actionRoute: { pathname: string; params: Record<string, string> };
}

export function WeeklyStatsCard({ stats, streak, colors }: WeeklyStatsCardProps) {
  const insets = useSafeAreaInsets();
  const [selectedStat, setSelectedStat] = useState<StatType>(null);

  const handleCardPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/sessionHistory');
  };

  const handleStatPress = (stat: StatType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedStat(stat);
  };

  const closeSheet = () => {
    setSelectedStat(null);
  };

  const handleViewAll = () => {
    if (!selectedStat) return;
    const content = getModalContent(selectedStat);
    closeSheet();
    setTimeout(() => {
      router.push({
        pathname: '/sessionHistory',
        params: content.actionRoute.params,
      });
    }, 150);
  };

  // Build modal content based on selected stat
  const getModalContent = (stat: StatType): StatModalContent => {
    const avgPerSession = stats.sessions > 0 ? Math.round(stats.shots / stats.sessions) : 0;
    const totalMinutes = stats.totalTimeMinutes;
    const avgSessionMinutes = stats.sessions > 0 ? Math.round(totalMinutes / stats.sessions) : 0;

    switch (stat) {
      case 'shots':
        return {
          title: 'Shots Fired',
          icon: <Target size={22} color={colors.indigo} />,
          iconColor: colors.indigo,
          value: stats.shots.toLocaleString(),
          description: 'Total rounds fired this week across all sessions.',
          details: [
            { label: 'Sessions', value: `${stats.sessions}` },
            { label: 'Avg per session', value: `${avgPerSession}` },
            { label: 'Hits recorded', value: `${stats.hits}` },
          ],
          actionLabel: 'View all sessions',
          actionRoute: { pathname: '/sessionHistory', params: { filter: 'thisWeek' } },
        };

      case 'accuracy':
        return {
          title: 'Accuracy',
          icon: <TrendingUp size={22} color={colors.green} />,
          iconColor: colors.green,
          value: `${stats.accuracy}%`,
          description: 'Overall hit percentage from engagement drills this week.',
          details: [
            { label: 'Hits', value: `${stats.hits}` },
            { label: 'Total shots', value: `${stats.shots}` },
            { label: 'Miss rate', value: `${100 - stats.accuracy}%` },
          ],
          actionLabel: 'View engagement sessions',
          actionRoute: { pathname: '/sessionHistory', params: { filter: 'thisWeek', targetType: 'tactical' } },
        };

      case 'avgGroup':
        return {
          title: 'Average Grouping',
          icon: <Crosshair size={22} color={colors.orange} />,
          iconColor: colors.orange,
          value: stats.avgGroup,
          description: 'Typical paper target dispersion this week (median of all groups).',
          details: [
            { label: 'Metric', value: 'Median' },
            { label: 'Target type', value: 'Paper' },
            { label: 'Sessions', value: `${stats.sessions}` },
          ],
          actionLabel: 'View grouping sessions',
          actionRoute: { pathname: '/sessionHistory', params: { filter: 'thisWeek', targetType: 'paper' } },
        };

      case 'time':
        return {
          title: 'Training Time',
          icon: <Clock size={22} color={colors.blue} />,
          iconColor: colors.blue,
          value: formatDuration(totalMinutes),
          description: 'Total accumulated training time this week.',
          details: [
            { label: 'Sessions', value: `${stats.sessions}` },
            { label: 'Avg session', value: formatDuration(avgSessionMinutes) },
            { label: 'Total minutes', value: `${totalMinutes}` },
          ],
          actionLabel: 'View session timeline',
          actionRoute: { pathname: '/sessionHistory', params: { filter: 'thisWeek' } },
        };

      default:
        return {
          title: '',
          icon: null,
          iconColor: colors.text,
          value: '',
          description: '',
          details: [],
          actionLabel: '',
          actionRoute: { pathname: '/sessionHistory', params: {} },
        };
    }
  };

  const modalContent = selectedStat ? getModalContent(selectedStat) : null;

  // Empty state - no sessions this week
  if (stats.sessions === 0) {
    return (
      <AnimatedTouchable
        entering={FadeInDown.duration(350).delay(150)}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        onPress={handleCardPress}
        activeOpacity={0.9}
      >
        <View style={s.emptyHeader}>
          <View style={s.headerRow}>
            <Text style={[s.title, { color: colors.text }]}>This Week</Text>
            <ChevronRight size={16} color={colors.textMuted} style={{ opacity: 0.5 }} />
          </View>
        </View>
        <View style={s.emptyContent}>
          <View style={s.emptyStatsRow}>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <Target size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <TrendingUp size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
            <View style={[s.emptyStat, { backgroundColor: colors.secondary }]}>
              <Clock size={14} color={colors.textMuted} />
              <Text style={[s.emptyStatText, { color: colors.textMuted }]}>--</Text>
            </View>
          </View>
          <Text style={[s.emptyMessage, { color: colors.textMuted }]}>
            No practice sessions yet this week
          </Text>
        </View>
      </AnimatedTouchable>
    );
  }

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(350).delay(150)}
        style={[s.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        {/* Header with streak - tappable for overview */}
        <TouchableOpacity 
          style={s.header} 
          onPress={handleCardPress}
          activeOpacity={0.7}
        >
          <View style={s.headerLeft}>
            <Text style={[s.title, { color: colors.text }]}>This Week</Text>
            <View style={[s.sessionBadge, { backgroundColor: `${colors.primary}15` }]}>
              <Text style={[s.sessionBadgeText, { color: colors.primary }]}>
                {stats.sessions} session{stats.sessions !== 1 ? 's' : ''}
              </Text>
            </View>
          </View>
          <View style={s.headerRight}>
            {streak >= STREAK_DISPLAY_THRESHOLD && (
              <View style={s.streakBadge}>
                <Flame size={12} color="#F97316" fill="#F97316" />
                <Text style={s.streakText}>{streak}</Text>
              </View>
            )}
            <ChevronRight size={14} color={colors.textMuted} style={{ opacity: 0.5 }} />
          </View>
        </TouchableOpacity>

        {/* Stats Grid - each stat is tappable */}
        <View style={s.statsGrid}>
          <StatItem
            icon={<Target size={14} color={colors.indigo} />}
            value={stats.shots.toLocaleString()}
            label="Shots"
            colors={colors}
            onPress={() => handleStatPress('shots')}
          />
          <StatItem
            icon={<TrendingUp size={14} color={colors.green} />}
            value={`${stats.accuracy}%`}
            label="Accuracy"
            colors={colors}
            onPress={() => handleStatPress('accuracy')}
          />
          <StatItem
            icon={<Crosshair size={14} color={colors.orange} />}
            value={stats.avgGroup}
            label="Avg Group"
            colors={colors}
            onPress={() => handleStatPress('avgGroup')}
          />
          <StatItem
            icon={<Clock size={14} color={colors.blue} />}
            value={formatDuration(stats.totalTimeMinutes)}
            label="Time"
            colors={colors}
            onPress={() => handleStatPress('time')}
          />
        </View>
      </Animated.View>

      {/* Bottom Sheet Modal */}
      <Modal
        visible={!!selectedStat}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeSheet}
      >
        {/* Backdrop */}
        <Pressable style={s.sheetOverlay} onPress={closeSheet} />
        
        {/* Sheet Content */}
        {modalContent && (
          <View 
            style={[
              s.sheetContainer, 
              { 
                backgroundColor: colors.card,
                paddingBottom: insets.bottom + 16,
              }
            ]}
          >
            {/* Handle */}
            <View style={s.sheetHandle}>
              <View style={[s.handleBar, { backgroundColor: colors.border }]} />
            </View>

            {/* Header */}
            <View style={s.sheetHeader}>
              <View style={[s.sheetIconBg, { backgroundColor: `${modalContent.iconColor}15` }]}>
                {modalContent.icon}
              </View>
              <Text style={[s.sheetTitle, { color: colors.text }]}>{modalContent.title}</Text>
            </View>

            {/* Big Value */}
            <View style={s.sheetValueSection}>
              <Text style={[s.sheetValue, { color: colors.text }]}>{modalContent.value}</Text>
              <Text style={[s.sheetDescription, { color: colors.textMuted }]}>
                {modalContent.description}
              </Text>
            </View>

            {/* Details */}
            <View style={[s.sheetDetails, { backgroundColor: colors.secondary }]}>
              {modalContent.details.map((detail, i) => (
                <View 
                  key={detail.label} 
                  style={[
                    s.sheetDetailRow,
                    i < modalContent.details.length - 1 && { 
                      borderBottomWidth: StyleSheet.hairlineWidth, 
                      borderBottomColor: colors.border 
                    }
                  ]}
                >
                  <Text style={[s.sheetDetailLabel, { color: colors.textMuted }]}>
                    {detail.label}
                  </Text>
                  <Text style={[s.sheetDetailValue, { color: colors.text }]}>
                    {detail.value}
                  </Text>
                </View>
              ))}
            </View>

            {/* Action Button */}
            <TouchableOpacity 
              style={[s.sheetAction, { backgroundColor: colors.primary }]}
              onPress={handleViewAll}
              activeOpacity={0.8}
            >
              <Text style={s.sheetActionText}>{modalContent.actionLabel}</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </Modal>
    </>
  );
}

interface StatItemProps {
  icon: React.ReactNode;
  value: string;
  label: string;
  colors: WeeklyStatsCardProps['colors'];
  onPress?: () => void;
}

function StatItem({ icon, value, label, colors, onPress }: StatItemProps) {
  return (
    <TouchableOpacity 
      style={[s.stat, { backgroundColor: colors.secondary }]} 
      onPress={onPress}
      activeOpacity={0.7}
      disabled={!onPress}
    >
      <View style={s.statHeader}>
        {icon}
        <Text style={[s.statLabel, { color: colors.textMuted }]}>{label}</Text>
      </View>
      <Text style={[s.statValue, { color: colors.text }]}>{value}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  card: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
    padding: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  sessionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  sessionBadgeText: {
    fontSize: 11,
    fontWeight: '600',
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: '#F9731615',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  streakText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#F97316',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  stat: {
    flex: 1,
    minWidth: '45%',
    borderRadius: 10,
    padding: 10,
  },
  statHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  // Empty state
  emptyHeader: {
    marginBottom: 10,
  },
  emptyContent: {
    gap: 10,
  },
  emptyStatsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  emptyStat: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyStatText: {
    fontSize: 13,
    fontWeight: '600',
  },
  emptyMessage: {
    fontSize: 11,
    textAlign: 'center',
  },
  // Bottom Sheet
  sheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 20,
  },
  sheetHandle: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  sheetIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  sheetValueSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  sheetValue: {
    fontSize: 48,
    fontWeight: '800',
    letterSpacing: -1.5,
    marginBottom: 8,
  },
  sheetDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  sheetDetails: {
    borderRadius: 14,
    marginBottom: 20,
    overflow: 'hidden',
  },
  sheetDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  sheetDetailLabel: {
    fontSize: 14,
  },
  sheetDetailValue: {
    fontSize: 15,
    fontWeight: '600',
  },
  sheetAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  sheetActionText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
