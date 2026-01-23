/**
 * DrillChapter Component
 *
 * Large, immersive drill card that fills significant vertical space.
 * Designed for a timeline-style layout where each drill is a "chapter"
 * in the training story.
 */

import {
  AlertCircle,
  Check,
  ChevronRight,
  Clock,
  Crosshair,
  Play,
  Ruler,
  Target,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react-native';
import { ActivityIndicator, Dimensions, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import type { DrillChapterProps } from './types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MIN_CARD_HEIGHT = SCREEN_HEIGHT * 0.28; // ~28% - allows 2 drills visible

// Position labels
const POSITION_LABELS: Record<string, string> = {
  prone: 'Prone',
  sitting: 'Sitting',
  kneeling: 'Kneeling',
  standing: 'Standing',
  barricade: 'Barricade',
};

// Target type labels
const TARGET_LABELS: Record<string, string> = {
  paper: 'Paper',
  steel: 'Steel',
  ipsc: 'IPSC',
  silhouette: 'Silhouette',
  tactical: 'Tactical',
};

export function DrillChapter({
  drill,
  chapterNumber,
  totalChapters,
  isCompleted,
  canStart,
  onStart,
  isStarting,
  colors,
  hasWeapon = true,
  similarStats,
}: DrillChapterProps) {
  const isGrouping = drill.drill_goal === 'grouping';
  const goalColor = isGrouping ? colors.green : '#F59E0B';
  const goalLabel = isGrouping ? 'Grouping' : 'Engagement';
  const GoalIcon = isGrouping ? Crosshair : Target;

  // Can only start if has weapon
  const canActuallyStart = canStart && hasWeapon;

  // Get drill values
  const distance = drill.distance_m || drill.config?.distance_m || 25;
  const rounds = drill.rounds_per_shooter || drill.config?.rounds || 5;
  const timeLimit = drill.time_limit_seconds || drill.config?.time_limit_seconds;
  const position = drill.config?.position || drill.position;
  const targetType = drill.config?.target_type || drill.target_type || 'paper';

  // Status styling
  const statusBg = isCompleted ? colors.green + '08' : canStart ? colors.primary + '05' : colors.card;
  const statusBorder = isCompleted ? colors.green + '20' : canStart ? colors.primary + '15' : colors.border;

  return (
    <Animated.View
      entering={FadeInDown.delay(chapterNumber * 100)
        .duration(400)
        .springify()}
      style={styles.wrapper}
    >
      <View
        style={[
          styles.card,
          {
            backgroundColor: statusBg,
            borderColor: statusBorder,
            minHeight: MIN_CARD_HEIGHT,
          },
        ]}
      >
        {/* Chapter Header */}
        <View style={styles.chapterHeader}>
          <View style={styles.chapterNumberWrap}>
            <Text style={[styles.chapterNumber, { color: colors.textMuted }]}>
              {String(chapterNumber).padStart(2, '0')}
            </Text>
            <View style={[styles.chapterDivider, { backgroundColor: colors.border }]} />
            <Text style={[styles.chapterTotal, { color: colors.textMuted }]}>
              {String(totalChapters).padStart(2, '0')}
            </Text>
          </View>

          {/* Status Badge */}
          {isCompleted ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.green + '15' }]}>
              <Check size={12} color={colors.green} strokeWidth={2.5} />
              <Text style={[styles.statusText, { color: colors.green }]}>Complete</Text>
            </View>
          ) : canStart ? (
            <View style={[styles.statusBadge, { backgroundColor: colors.primary + '15' }]}>
              <View style={[styles.activeDot, { backgroundColor: colors.primary }]} />
              <Text style={[styles.statusText, { color: colors.primary }]}>Ready</Text>
            </View>
          ) : (
            <View style={[styles.statusBadge, { backgroundColor: colors.secondary }]}>
              <Text style={[styles.statusText, { color: colors.textMuted }]}>Upcoming</Text>
            </View>
          )}
        </View>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Drill Title & Goal */}
          <View style={styles.titleSection}>
            <Text style={[styles.drillName, { color: isCompleted ? colors.textMuted : colors.text }]} numberOfLines={2}>
              {drill.name}
            </Text>
            <View
              style={[styles.goalBadge, { backgroundColor: isCompleted ? colors.textMuted + '15' : goalColor + '15' }]}
            >
              <GoalIcon size={14} color={isCompleted ? colors.textMuted : goalColor} strokeWidth={2} />
              <Text style={[styles.goalText, { color: isCompleted ? colors.textMuted : goalColor }]}>{goalLabel}</Text>
            </View>
          </View>

          {/* Stats Grid - Large & Prominent */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Ruler size={18} color={colors.primary} />
              <Text style={[styles.statValue, { color: colors.text }]}>{distance}m</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Distance</Text>
            </View>
            <View style={[styles.statCard, { backgroundColor: colors.background }]}>
              <Zap size={18} color={colors.orange} />
              <Text style={[styles.statValue, { color: colors.text }]}>{rounds}</Text>
              <Text style={[styles.statLabel, { color: colors.textMuted }]}>Rounds</Text>
            </View>
            {timeLimit ? (
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Clock size={18} color={colors.blue} />
                <Text style={[styles.statValue, { color: colors.text }]}>{timeLimit}s</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Limit</Text>
              </View>
            ) : (
              <View style={[styles.statCard, { backgroundColor: colors.background }]}>
                <Target size={18} color={colors.textMuted} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {TARGET_LABELS[targetType] || targetType}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>Target</Text>
              </View>
            )}
          </View>

          {/* Tags Row */}
          <View style={styles.tagsRow}>
            {position && (
              <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
                <User size={12} color={colors.textMuted} />
                <Text style={[styles.tagText, { color: colors.text }]}>{POSITION_LABELS[position] || position}</Text>
              </View>
            )}
            {timeLimit && (
              <View style={[styles.tag, { backgroundColor: colors.orange + '15' }]}>
                <Clock size={12} color={colors.orange} />
                <Text style={[styles.tagText, { color: colors.orange }]}>Timed</Text>
              </View>
            )}
            <View style={[styles.tag, { backgroundColor: colors.secondary }]}>
              <Target size={12} color={colors.textMuted} />
              <Text style={[styles.tagText, { color: colors.text }]}>{TARGET_LABELS[targetType] || targetType}</Text>
            </View>
          </View>

          {/* Similar Stats (if available) */}
          {similarStats && (
            <Animated.View
              entering={FadeIn.delay(200)}
              style={[
                styles.historyCard,
                { backgroundColor: colors.primary + '08', borderColor: colors.primary + '15' },
              ]}
            >
              <View style={styles.historyHeader}>
                <TrendingUp size={14} color={colors.primary} />
                <Text style={[styles.historyTitle, { color: colors.primary }]}>Your Previous Best</Text>
              </View>
              <View style={styles.historyStats}>
                {similarStats.accuracy !== undefined && (
                  <View style={styles.historyStat}>
                    <Text style={[styles.historyValue, { color: colors.text }]}>{similarStats.accuracy}%</Text>
                    <Text style={[styles.historyLabel, { color: colors.textMuted }]}>Accuracy</Text>
                  </View>
                )}
                {similarStats.bestGroup !== undefined && (
                  <View style={styles.historyStat}>
                    <Text style={[styles.historyValue, { color: colors.text }]}>{similarStats.bestGroup}cm</Text>
                    <Text style={[styles.historyLabel, { color: colors.textMuted }]}>Best Group</Text>
                  </View>
                )}
                {similarStats.date && (
                  <View style={styles.historyStat}>
                    <Text style={[styles.historyValue, { color: colors.textMuted, fontSize: 12 }]}>
                      {similarStats.date}
                    </Text>
                    <Text style={[styles.historyLabel, { color: colors.textMuted }]}>Date</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </View>

        {/* Action Footer */}
        <View style={[styles.footer, { borderTopColor: colors.border }]}>
          {isCompleted ? (
            <View style={styles.completedFooter}>
              <Check size={16} color={colors.green} />
              <Text style={[styles.completedText, { color: colors.green }]}>Drill completed</Text>
            </View>
          ) : canActuallyStart ? (
            <TouchableOpacity
              style={[styles.startButton, { backgroundColor: colors.primary }]}
              onPress={onStart}
              disabled={isStarting}
              activeOpacity={0.8}
            >
              {isStarting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Play size={18} color="#fff" fill="#fff" />
                  <Text style={styles.startButtonText}>Start Drill</Text>
                  <ChevronRight size={18} color="#fff" style={{ marginLeft: 'auto' }} />
                </>
              )}
            </TouchableOpacity>
          ) : canStart && !hasWeapon ? (
            <View style={[styles.blockedFooter, { backgroundColor: colors.orange + '10' }]}>
              <AlertCircle size={16} color={colors.orange} />
              <Text style={[styles.blockedText, { color: colors.orange }]}>Assign weapon to start</Text>
            </View>
          ) : (
            <View style={styles.upcomingFooter}>
              <Text style={[styles.upcomingText, { color: colors.textMuted }]}>Complete previous drills first</Text>
            </View>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 14,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
  },
  chapterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  chapterNumberWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chapterNumber: {
    fontSize: 24,
    fontWeight: '800',
    fontVariant: ['tabular-nums'],
  },
  chapterDivider: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  chapterTotal: {
    fontSize: 14,
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mainContent: {
    paddingHorizontal: 16,
    gap: 12,
  },
  titleSection: {
    gap: 8,
  },
  drillName: {
    fontSize: 19,
    fontWeight: '700',
    lineHeight: 24,
    letterSpacing: -0.3,
  },
  goalBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  goalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    gap: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tagText: {
    fontSize: 13,
    fontWeight: '500',
  },
  historyCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  historyStats: {
    flexDirection: 'row',
    gap: 24,
  },
  historyStat: {
    alignItems: 'center',
    gap: 2,
  },
  historyValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  historyLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  footer: {
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  startButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  completedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
  },
  completedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  blockedFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  blockedText: {
    fontSize: 14,
    fontWeight: '600',
  },
  upcomingFooter: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  upcomingText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
