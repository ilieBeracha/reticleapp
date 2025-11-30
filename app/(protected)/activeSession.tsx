import {
    calculateSessionStats,
    endSession,
    getSessionById,
    getSessionTargetsWithResults,
    SessionStats,
    SessionTargetWithResults,
    SessionWithDetails,
} from "@/services/sessionService";
import { useSessionStore } from "@/store/sessionStore";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    Easing,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Circle, Defs, G, Line, RadialGradient, Stop } from "react-native-svg";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const VISUALIZATION_SIZE = SCREEN_WIDTH * 0.7;

// ============================================================================
// GLOWING TARGET VISUALIZATION
// ============================================================================
const TargetVisualization = React.memo(function TargetVisualization({
  progress,
  targetType,
}: {
  progress: number;
  targetType: "paper" | "tactical";
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

  useEffect(() => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Slow rotation
    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 60000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    // Glow pulse
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 1500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const rings = [0.9, 0.7, 0.5, 0.3, 0.15];
  const activeRings = Math.ceil(progress * rings.length);

  return (
    <View style={styles.visualizationContainer}>
      {/* Outer glow */}
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: glowAnim,
            transform: [{ scale: pulseAnim }],
          },
        ]}
      />

      {/* Main visualization */}
      <Animated.View
        style={[
          styles.visualization,
          { transform: [{ rotate: spin }, { scale: pulseAnim }] },
        ]}
      >
        <Svg width={VISUALIZATION_SIZE} height={VISUALIZATION_SIZE} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#10B981" stopOpacity="0.8" />
              <Stop offset="50%" stopColor="#10B981" stopOpacity="0.3" />
              <Stop offset="100%" stopColor="#10B981" stopOpacity="0" />
            </RadialGradient>
            <RadialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor="#6EE7B7" stopOpacity="1" />
              <Stop offset="70%" stopColor="#10B981" stopOpacity="0.6" />
              <Stop offset="100%" stopColor="#059669" stopOpacity="0" />
            </RadialGradient>
          </Defs>

          {/* Background glow */}
          <Circle cx="100" cy="100" r="95" fill="url(#glowGrad)" />

          {/* Target rings */}
          {rings.map((size, i) => (
            <G key={i}>
              <Circle
                cx="100"
                cy="100"
                r={95 * size}
                fill="none"
                stroke={i < activeRings ? "#10B981" : "rgba(255,255,255,0.08)"}
                strokeWidth={i < activeRings ? 2 : 1}
                strokeDasharray={i === 0 ? "0" : "4 4"}
                opacity={i < activeRings ? 0.8 - i * 0.15 : 0.3}
              />
            </G>
          ))}

          {/* Crosshair lines */}
          <Line x1="100" y1="20" x2="100" y2="45" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
          <Line x1="100" y1="155" x2="100" y2="180" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
          <Line x1="20" y1="100" x2="45" y2="100" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />
          <Line x1="155" y1="100" x2="180" y2="100" stroke="#10B981" strokeWidth="1.5" opacity="0.6" />

          {/* Core */}
          <Circle cx="100" cy="100" r="8" fill="url(#coreGrad)" />
          <Circle cx="100" cy="100" r="3" fill="#fff" opacity="0.9" />
        </Svg>
      </Animated.View>

      {/* Particle effects - scattered dots */}
      {Array.from({ length: 12 }).map((_, i) => {
        const angle = (i / 12) * Math.PI * 2;
        const radius = 90 + Math.random() * 30;
        const x = Math.cos(angle) * radius;
        const y = Math.sin(angle) * radius;
        return (
          <Animated.View
            key={i}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: x },
                  { translateY: y },
                  { scale: glowAnim },
                ],
                opacity: glowAnim.interpolate({
                  inputRange: [0.6, 1],
                  outputRange: [0.3, 0.7],
                }),
              },
            ]}
          />
        );
      })}
    </View>
  );
});

// ============================================================================
// TIMER COMPONENT
// ============================================================================
const SessionTimer = React.memo(function SessionTimer({
  startedAt,
}: {
  startedAt: string;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const updateTimer = () => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>;
});

// ============================================================================
// PROGRESS METER (like Pace of Aging)
// ============================================================================
const ProgressMeter = React.memo(function ProgressMeter({
  current,
  total,
  label,
}: {
  current: number;
  total: number;
  label: string;
}) {
  const progress = total > 0 ? Math.min(current / total, 1) : 0;
  const segments = 30;

  return (
    <View style={styles.meterContainer}>
      <View style={styles.meterHeader}>
        <View style={styles.meterDot} />
        <Text style={styles.meterLabel}>{label}</Text>
      </View>

      <View style={styles.meterValueRow}>
        <Text style={styles.meterSideLabel}>0</Text>
        <Text style={styles.meterValue}>{current}/{total}</Text>
        <Text style={styles.meterSideLabel}>{total}</Text>
      </View>

      <View style={styles.meterTrack}>
        {Array.from({ length: segments }).map((_, i) => {
          const segmentProgress = (i + 1) / segments;
          const isActive = segmentProgress <= progress;
          const isEdge = Math.abs(segmentProgress - progress) < 0.05;
          return (
            <View
              key={i}
              style={[
                styles.meterSegment,
                isActive && styles.meterSegmentActive,
                isEdge && styles.meterSegmentEdge,
              ]}
            />
          );
        })}
        {/* Indicator */}
        <View style={[styles.meterIndicator, { left: `${progress * 100}%` }]}>
          <View style={styles.meterIndicatorDot} />
        </View>
      </View>
    </View>
  );
});

// ============================================================================
// INSIGHT CARD
// ============================================================================
const InsightCard = React.memo(function InsightCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View style={styles.insightCard}>
      <Text style={styles.insightTitle}>{title}</Text>
      <Text style={styles.insightDescription}>{description}</Text>
    </View>
  );
});

// ============================================================================
// TARGET TIMELINE
// ============================================================================
const TargetTimeline = React.memo(function TargetTimeline({
  targets,
  maxItems = 5,
}: {
  targets: SessionTargetWithResults[];
  maxItems?: number;
}) {
  if (targets.length === 0) return null;

  // Show most recent targets first
  const recentTargets = [...targets].reverse().slice(0, maxItems);

  return (
    <View style={styles.timelineContainer}>
      <View style={styles.timelineHeader}>
        <Text style={styles.timelineTitle}>Recent Targets</Text>
        <Text style={styles.timelineCount}>{targets.length} total</Text>
      </View>
      
      {recentTargets.map((target, index) => {
        const seqNum = targets.length - index;
        const isPaper = target.target_type === 'paper';
        
        let hits = 0;
        let shots = 0;
        let accuracy = 0;
        let extraInfo = '';
        
        if (isPaper && target.paper_result) {
          hits = target.paper_result.hits_total ?? 0;
          shots = target.paper_result.bullets_fired;
          accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
          if (target.paper_result.dispersion_cm) {
            extraInfo = `${target.paper_result.dispersion_cm}cm`;
          }
        } else if (!isPaper && target.tactical_result) {
          hits = target.tactical_result.hits;
          shots = target.tactical_result.bullets_fired;
          accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
          if (target.tactical_result.is_stage_cleared) {
            extraInfo = '✓ Cleared';
          }
          if (target.tactical_result.time_seconds) {
            extraInfo = extraInfo 
              ? `${extraInfo} • ${target.tactical_result.time_seconds}s`
              : `${target.tactical_result.time_seconds}s`;
          }
        }

        const hasResult = (isPaper && target.paper_result) || (!isPaper && target.tactical_result);
        
        return (
          <View key={target.id} style={styles.timelineItem}>
            <View style={styles.timelineItemLeft}>
              <View style={[
                styles.timelineSeq,
                { backgroundColor: isPaper ? '#3B82F620' : '#F59E0B20' }
              ]}>
                <Text style={[
                  styles.timelineSeqText,
                  { color: isPaper ? '#3B82F6' : '#F59E0B' }
                ]}>
                  {seqNum}
                </Text>
              </View>
              <View style={styles.timelineItemInfo}>
                <Text style={styles.timelineItemType}>
                  {isPaper ? 'Paper' : 'Tactical'} • {target.distance_m || '-'}m
                </Text>
                {hasResult && (
                  <Text style={styles.timelineItemResult}>
                    {hits}/{shots} hits ({accuracy}%)
                    {extraInfo ? ` • ${extraInfo}` : ''}
                  </Text>
                )}
              </View>
            </View>
            <View style={[
              styles.timelineAccuracy,
              accuracy >= 80 ? styles.accuracyHigh :
              accuracy >= 50 ? styles.accuracyMed :
              styles.accuracyLow
            ]}>
              <Text style={styles.timelineAccuracyText}>{accuracy}%</Text>
            </View>
          </View>
        );
      })}
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function ActiveSessionScreen() {
  const insets = useSafeAreaInsets();
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const { loadSessions } = useSessionStore();

  const [session, setSession] = useState<SessionWithDetails | null>(null);
  const [targets, setTargets] = useState<SessionTargetWithResults[]>([]);
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ending, setEnding] = useState(false);

  // Load session data
  const loadData = useCallback(async () => {
    if (!sessionId) return;
    try {
      const [sessionData, targetsData, statsData] = await Promise.all([
        getSessionById(sessionId),
        getSessionTargetsWithResults(sessionId),
        calculateSessionStats(sessionId),
      ]);
      setSession(sessionData);
      setTargets(targetsData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load session:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionId]);

  // Reload data every time screen comes into focus (e.g., after adding a target)
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    loadData();
  }, [loadData]);

  // Session stats derived from targets
  const sessionInfo = useMemo(() => {
    if (targets.length === 0) {
      return {
        distance: 100, // default
        plannedRounds: 10, // default
        targetType: 'paper' as const,
      };
    }
    // Get most common target type and average distance from targets
    const paperCount = targets.filter(t => t.target_type === 'paper').length;
    const tacticalCount = targets.filter(t => t.target_type === 'tactical').length;
    const avgDistance = targets.reduce((sum, t) => sum + (t.distance_m || 100), 0) / targets.length;
    
    return {
      distance: Math.round(avgDistance),
      plannedRounds: targets.length + 5, // current + buffer
      targetType: paperCount >= tacticalCount ? 'paper' as const : 'tactical' as const,
    };
  }, [targets]);

  const totalShotsFired = stats?.totalShotsFired ?? 0;
  const totalHits = stats?.totalHits ?? 0;
  const accuracyPct = stats?.accuracyPct ?? 0;

  const progress = useMemo(() => {
    return sessionInfo.plannedRounds > 0
      ? targets.length / sessionInfo.plannedRounds
      : 0;
  }, [targets.length, sessionInfo.plannedRounds]);

  const handleAddTarget = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(protected)/addTarget",
      params: {
        sessionId,
        defaultDistance: sessionInfo.distance.toString(),
      },
    });
  }, [sessionId, sessionInfo]);

  const handleViewTargets = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    const targetDetails = targets.map((t, i) => {
      let resultInfo = '';
      if (t.target_type === 'paper' && t.paper_result) {
        const accuracy = t.paper_result.bullets_fired > 0 
          ? Math.round((t.paper_result.hits_total ?? 0) / t.paper_result.bullets_fired * 100)
          : 0;
        resultInfo = `${t.paper_result.hits_total ?? 0}/${t.paper_result.bullets_fired} hits (${accuracy}%)`;
      } else if (t.target_type === 'tactical' && t.tactical_result) {
        const accuracy = t.tactical_result.bullets_fired > 0 
          ? Math.round(t.tactical_result.hits / t.tactical_result.bullets_fired * 100)
          : 0;
        resultInfo = `${t.tactical_result.hits}/${t.tactical_result.bullets_fired} hits (${accuracy}%)${t.tactical_result.is_stage_cleared ? ' ✓' : ''}`;
      } else {
        resultInfo = 'No results';
      }
      return `#${i + 1}: ${t.target_type} at ${t.distance_m}m\n   ${resultInfo}`;
    }).join("\n\n");
    
    Alert.alert(
      `${targets.length} Target${targets.length !== 1 ? "s" : ""} Logged`,
      targetDetails || "No targets yet"
    );
  }, [targets]);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "End Session?",
      `You've logged ${targets.length} target${targets.length !== 1 ? "s" : ""}. End this session now?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "End Session",
          style: "destructive",
          onPress: async () => {
            setEnding(true);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            try {
              await endSession(sessionId!);
              await loadSessions();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert("Session Complete", "Your training session has been saved.", [
                { text: "OK", onPress: () => router.replace("/(protected)/org") },
              ]);
            } catch (error: any) {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
              Alert.alert("Error", error.message || "Failed to end session");
              setEnding(false);
            }
          },
        },
      ]
    );
  }, [sessionId, targets.length, loadSessions]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "Leave Session?",
      "Your session will stay active. You can return to it later.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", onPress: () => router.back() },
      ]
    );
  }, []);

  // Generate insight
  const insight = useMemo(() => {
    if (targets.length === 0) {
      return {
        title: "Ready to Fire",
        description: `Session started at ${sessionInfo.distance}m. Add your first target when ready.`,
      };
    }
    if (totalShotsFired > 0 && accuracyPct > 0) {
      if (accuracyPct >= 80) {
        return {
          title: "Excellent Accuracy",
          description: `${accuracyPct}% hit rate with ${totalHits}/${totalShotsFired} rounds on target. Outstanding!`,
        };
      }
      if (accuracyPct >= 60) {
        return {
          title: "Good Progress",
          description: `${accuracyPct}% accuracy across ${targets.length} targets. Keep it up!`,
        };
      }
      return {
        title: "Keep Training",
        description: `${accuracyPct}% hit rate. Focus on fundamentals to improve.`,
      };
    }
    return {
      title: "Session Active",
      description: `${targets.length} target${targets.length !== 1 ? "s" : ""} logged. Continue training.`,
    };
  }, [targets.length, totalShotsFired, totalHits, accuracyPct, sessionInfo]);

  // Loading state
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  // Session not found
  if (!session || session.status !== "active") {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name={session?.status === "completed" ? "checkmark-circle" : "alert-circle"}
          size={48}
          color="#10B981"
        />
        <Text style={styles.errorText}>
          {session?.status === "completed" ? "Session Completed" : "Session not found"}
        </Text>
        <TouchableOpacity style={styles.errorButton} onPress={() => router.back()}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Session</Text>

        <TouchableOpacity style={styles.headerButton} onPress={handleViewTargets}>
          <Text style={styles.infoIcon}>i</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
        }
      >
        {/* Context Row */}
        <View style={styles.contextRow}>
          <View style={styles.contextItem}>
            <Ionicons name="locate-outline" size={14} color="rgba(255,255,255,0.4)" />
            <Text style={styles.contextText}>{sessionInfo.distance}m</Text>
          </View>
          <Text style={styles.contextHighlight}>{session.training_title || 'Training'}</Text>
          <View style={styles.contextItem}>
            <Text style={styles.contextText}>{targets.length} targets</Text>
            <Ionicons name="chevron-forward" size={14} color="rgba(255,255,255,0.4)" />
          </View>
        </View>

        {/* Visualization */}
        <TargetVisualization progress={progress} targetType={sessionInfo.targetType} />

        {/* Central Stats */}
        <View style={styles.centralStats}>
          <Text style={styles.mainStat}>{accuracyPct > 0 ? `${accuracyPct}%` : targets.length}</Text>
          <Text style={styles.mainStatLabel}>{accuracyPct > 0 ? 'Accuracy' : 'Targets Logged'}</Text>
          <View style={styles.subStatRow}>
            <SessionTimer startedAt={session.started_at} />
            <Text style={styles.subStatDivider}>•</Text>
            <Text style={styles.subStatText}>{totalHits}/{totalShotsFired} hits</Text>
          </View>
        </View>

        {/* Quick Stats Row */}
        {stats && totalShotsFired > 0 && (
          <View style={styles.quickStatsRow}>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{targets.length}</Text>
              <Text style={styles.quickStatLabel}>Targets</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={styles.quickStatValue}>{totalShotsFired}</Text>
              <Text style={styles.quickStatLabel}>Rounds</Text>
            </View>
            <View style={styles.quickStatItem}>
              <Text style={[styles.quickStatValue, { color: '#10B981' }]}>{totalHits}</Text>
              <Text style={styles.quickStatLabel}>Hits</Text>
            </View>
            {stats.stagesCleared > 0 && (
              <View style={styles.quickStatItem}>
                <Text style={[styles.quickStatValue, { color: '#F59E0B' }]}>{stats.stagesCleared}</Text>
                <Text style={styles.quickStatLabel}>Cleared</Text>
              </View>
            )}
          </View>
        )}

        {/* Progress Meter */}
        <ProgressMeter
          current={totalShotsFired}
          total={Math.max(totalShotsFired, 10)}
          label="Targets Progress"
        />

        {/* Target Timeline */}
        <TargetTimeline targets={targets} maxItems={5} />

        {/* Insight Card */}
        <InsightCard title={insight.title} description={insight.description} />

        {/* Action Buttons */}
        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleAddTarget}
          activeOpacity={0.9}
        >
          <LinearGradient
            colors={["#10B981", "#34D399", "#6EE7B7"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.primaryButtonGradient}
          >
            <Ionicons name="add-circle" size={22} color="#000" />
            <Text style={styles.primaryButtonText}>Add Target</Text>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={handleEndSession}
          disabled={ending}
          activeOpacity={0.7}
        >
          {ending ? (
            <ActivityIndicator color="#10B981" size="small" />
          ) : (
            <Text style={styles.secondaryButtonText}>End Session</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.6)",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#000",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    padding: 40,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    marginTop: 8,
  },
  errorButtonText: {
    color: "#fff",
    fontWeight: "600",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "rgba(255,255,255,0.7)",
  },
  infoIcon: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    fontStyle: "italic",
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 24,
    alignItems: "center",
  },

  // Context Row
  contextRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  contextText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    textTransform: "capitalize",
  },
  contextHighlight: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  // Visualization
  visualizationContainer: {
    width: VISUALIZATION_SIZE,
    height: VISUALIZATION_SIZE,
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  outerGlow: {
    position: "absolute",
    width: VISUALIZATION_SIZE * 1.3,
    height: VISUALIZATION_SIZE * 1.3,
    borderRadius: VISUALIZATION_SIZE * 0.65,
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  visualization: {
    width: VISUALIZATION_SIZE,
    height: VISUALIZATION_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  particle: {
    position: "absolute",
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#10B981",
  },

  // Central Stats
  centralStats: {
    alignItems: "center",
    marginTop: -20,
    marginBottom: 30,
  },
  mainStat: {
    fontSize: 72,
    fontWeight: "200",
    color: "#fff",
    letterSpacing: -2,
  },
  mainStatLabel: {
    fontSize: 16,
    fontWeight: "500",
    color: "#fff",
    marginTop: -8,
  },
  subStatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
  },
  timerValue: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontVariant: ["tabular-nums"],
  },
  subStatDivider: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
  subStatText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    textTransform: "capitalize",
  },

  // Quick Stats Row
  quickStatsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    paddingVertical: 16,
    marginBottom: 24,
  },
  quickStatItem: {
    alignItems: "center",
    paddingHorizontal: 12,
  },
  quickStatValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  quickStatLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },

  // Progress Meter
  meterContainer: {
    width: "100%",
    marginBottom: 24,
  },
  meterHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  meterDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F59E0B",
  },
  meterLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  meterValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  meterSideLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.3)",
  },
  meterValue: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  meterTrack: {
    flexDirection: "row",
    alignItems: "center",
    height: 24,
    gap: 2,
    position: "relative",
  },
  meterSegment: {
    flex: 1,
    height: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 1,
  },
  meterSegmentActive: {
    backgroundColor: "#10B981",
  },
  meterSegmentEdge: {
    backgroundColor: "#6EE7B7",
  },
  meterIndicator: {
    position: "absolute",
    top: 0,
    marginLeft: -8,
  },
  meterIndicatorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F59E0B",
    borderWidth: 3,
    borderColor: "#000",
  },

  // Target Timeline
  timelineContainer: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  timelineHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  timelineTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  timelineCount: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.04)",
  },
  timelineItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  timelineSeq: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  timelineSeqText: {
    fontSize: 12,
    fontWeight: "700",
  },
  timelineItemInfo: {
    flex: 1,
  },
  timelineItemType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  timelineItemResult: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  timelineAccuracy: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  timelineAccuracyText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#000",
  },
  accuracyHigh: {
    backgroundColor: "#10B981",
  },
  accuracyMed: {
    backgroundColor: "#F59E0B",
  },
  accuracyLow: {
    backgroundColor: "#EF4444",
  },

  // Insight Card
  insightCard: {
    width: "100%",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  insightTitle: {
    fontSize: 17,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  insightDescription: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },

  // Buttons
  primaryButton: {
    width: "100%",
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  secondaryButton: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#10B981",
  },
});
