import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { ArrowRight, Calendar, ChevronLeft, ChevronRight, Play, Target, Zap } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';
import type {
  DialModeConfig,
  DialValue,
  ElapsedTime,
  SessionStats,
  SessionWithDetails,
  ThemeColors,
  WeeklyStats,
} from './types';

interface UpcomingTraining {
  id: string;
  title: string;
  status: string;
}

interface StatusDialProps {
  colors: ThemeColors;
  activeSession: SessionWithDetails | undefined;
  displaySession: SessionWithDetails | undefined;
  sessionTitle: string;
  sessionStats: SessionStats | null;
  weeklyStats: WeeklyStats;
  currentModeConfig: DialModeConfig;
  dialValue: DialValue;
  dialProgress: number;
  modeCount: number;
  currentModeIndex: number;
  activeDialMode: string;
  onPrevMode: () => void;
  onNextMode: () => void;
  // Session actions
  elapsed: ElapsedTime;
  starting: boolean;
  onStart: () => void;
  onResume: () => void;
  // Training
  nextTraining?: UpcomingTraining;
}

export function StatusDial({
  colors,
  activeSession,
  displaySession,
  sessionTitle,
  sessionStats,
  weeklyStats,
  currentModeConfig,
  dialValue,
  dialProgress,
  modeCount,
  currentModeIndex,
  activeDialMode,
  onPrevMode,
  onNextMode,
  elapsed,
  starting,
  onStart,
  onResume,
  nextTraining,
}: StatusDialProps) {
  const strokeDashoffset = 165 * (1 - dialProgress);

  return (
    <Animated.View entering={FadeInUp.delay(100).duration(400)} style={styles.section}>
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        {/* Header with session title */}
        <View style={styles.header}>
          {activeSession ? (
            <>
              <View style={styles.liveIndicator}>
                <View style={styles.liveDot} />
                <Text style={styles.liveLabel}>LIVE SESSION</Text>
              </View>
              <Text style={[styles.sessionTitle, { color: colors.text }]} numberOfLines={1}>
                {sessionTitle}
              </Text>
            </>
          ) : (
            <Text style={[styles.headerLabel, { color: colors.textMuted }]}>THIS WEEK</Text>
          )}
        </View>

        {/* Dial Row */}
        <View style={styles.dialRow}>
          <TouchableOpacity
            onPress={onPrevMode}
            activeOpacity={0.7}
            style={[styles.navButton, { backgroundColor: colors.secondary }]}
          >
            <ChevronLeft size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>

          <View style={styles.dialContainer}>
            <Svg height={160} width={160} viewBox="0 0 100 100">
              <Defs>
                {/* Gentle gradient: white → soft blue → gray */}
                <LinearGradient id="dialGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <Stop offset="0%" stopColor="rgba(255,255,255,0.95)" />
                  <Stop offset="45%" stopColor="rgba(147,197,253,0.7)" />
                  <Stop offset="100%" stopColor="rgba(156,163,175,0.85)" />
                </LinearGradient>
              </Defs>
              
              {/* Background */}
              <Circle
                cx="50"
                cy="50"
                r="44"
                stroke={colors.border}
                strokeWidth="5"
                fill="transparent"
                strokeDasharray="165 276"
                strokeLinecap="round"
                rotation="135"
                origin="50, 50"
              />
              {/* Progress with gradient */}
              <Circle
                cx="50"
                cy="50"
                r="44"
                stroke="url(#dialGradient)"
                strokeWidth="5"
                fill="transparent"
                strokeDasharray={`${165 - strokeDashoffset} 276`}
                strokeLinecap="round"
                rotation="135"
                origin="50, 50"
              />
            </Svg>

            <View style={styles.dialCenter}>
              <Text style={[styles.dialLabel, { color: colors.textMuted }]}>
                {currentModeConfig.label}
              </Text>

              {activeDialMode === 'time' && activeSession ? (
                <Text style={[styles.dialValue, { color: colors.text }]}>
                  {dialValue.value}
                  <Text style={{ color: colors.textMuted }}>:</Text>
                  <Text style={{ color: colors.textMuted }}>
                    {(dialValue.secondary ?? 0).toString().padStart(2, '0')}
                  </Text>
                </Text>
              ) : (
                <Text style={[styles.dialValue, { color: colors.text }]}>
                  {dialValue.value}
                  {activeSession && activeDialMode === 'accuracy' && (
                    <Text style={[styles.dialPercent, { color: colors.textMuted }]}>%</Text>
                  )}
                </Text>
              )}

              <Text style={[styles.dialUnit, { color: colors.textMuted }]}>
                {currentModeConfig.unit}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onNextMode}
            activeOpacity={0.7}
            style={[styles.navButton, { backgroundColor: colors.secondary }]}
          >
            <ChevronRight size={20} color={colors.text} strokeWidth={2} />
          </TouchableOpacity>
        </View>

        {/* Dots */}
        <View style={styles.dots}>
          {Array.from({ length: modeCount }).map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                {
                  backgroundColor: i === currentModeIndex ? colors.text : colors.border,
                  width: i === currentModeIndex ? 12 : 4,
                },
              ]}
            />
          ))}
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {activeSession ? (
            <>
              <StatItemWithIcon
                icon={<Zap size={16} color={colors.text} />}
                value="Solo"
                label="MODE"
                colors={colors}
              />
              <StatItemWithIcon
                icon={<Target size={16} color={colors.text} />}
                value={sessionStats?.targetCount ?? 0}
                label="TARGETS"
                colors={colors}
              />
              <StatItemWithIcon
                icon={<Target size={16} color={colors.text} />}
                value={sessionStats?.totalShotsFired ?? 0}
                label="SHOTS"
                colors={colors}
              />
            </>
          ) : (
            <>
              <StatItem label="Sessions" value={weeklyStats.sessions} colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatItem label="Targets" value={weeklyStats.paperTargets + weeklyStats.tacticalTargets} colors={colors} />
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <StatItem label="Shots" value={weeklyStats.totalShots} colors={colors} />
            </>
          )}
        </View>
      </View>

      {/* Action Row - Start Session + Training */}
      <View style={styles.actionRow}>
        {/* Start/Resume Session - 2/3 width (or full if no training) */}
        <TouchableOpacity
          activeOpacity={0.7}
          disabled={starting}
          style={[
            styles.actionButton,
            { 
              backgroundColor: activeSession ? '#10B981' : colors.card,
              borderColor: activeSession ? '#10B981' : colors.border,
              flex: nextTraining ? 2 : 1,
            }
          ]}
          onPress={activeSession ? onResume : onStart}
        >
          {starting ? (
            <ActivityIndicator size="small" color={colors.text} />
          ) : activeSession ? (
            <>
              <View style={styles.actionDot} />
              <Text style={styles.actionResumeText}>Resume</Text>
              <ArrowRight size={16} color="#000" />
            </>
          ) : (
            <>
              <Play size={16} color={colors.text} fill={colors.text} />
              <Text style={[styles.actionLabel, { color: colors.text }]}>Start</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Next Training - 1/3 width */}
        {nextTraining && (
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.trainingButton,
              { 
                backgroundColor: colors.card,
                borderColor: nextTraining.status === 'ongoing' ? '#EF4444' : colors.border,
              }
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/(protected)/trainingDetail?id=${nextTraining.id}` as any);
            }}
          >
            {nextTraining.status === 'ongoing' ? (
              <View style={styles.liveDotSmall} />
            ) : (
              <Calendar size={14} color={colors.textMuted} />
            )}
            <Text 
              style={[styles.trainingLabel, { color: colors.text }]} 
              numberOfLines={1}
            >
              {nextTraining.title}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

function StatItem({ label, value, colors }: { label: string; value: string | number; colors: ThemeColors }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function StatItemWithIcon({
  icon,
  value,
  label,
  colors,
}: {
  icon: React.ReactNode;
  value: string | number;
  label: string;
  colors: ThemeColors;
}) {
  return (
    <View style={styles.statItemWithIcon}>
      <View style={[styles.statIcon, { backgroundColor: colors.secondary }]}>{icon}</View>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
  },
  header: {
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1.5,
    color: '#10B981',
  },
  sessionTitle: {
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: -0.3,
  },
  dialRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  navButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  dialCenter: {
    position: 'absolute',
    alignItems: 'center',
  },
  dialLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginBottom: 2,
  },
  dialValue: {
    fontSize: 42,
    fontWeight: '300',
    letterSpacing: -2,
    fontVariant: ['tabular-nums'],
  },
  dialPercent: {
    fontSize: 24,
    fontWeight: '400',
  },
  dialUnit: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 1,
    marginTop: 4,
  },
  dots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: 20,
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statItemWithIcon: {
    alignItems: 'center',
    flex: 1,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  statLabel: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 28,
  },
  // Action row
  actionRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  actionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#000',
    opacity: 0.6,
  },
  actionResumeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  // Training button
  trainingButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  trainingLabel: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  liveDotSmall: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#EF4444',
  },
});
