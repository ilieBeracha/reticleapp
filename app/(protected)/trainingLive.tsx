import { BaseAvatar } from "@/components/BaseAvatar";
import {
  getSessionTargets,
  getTrainingSessions,
  SessionTarget,
  SessionWithDetails,
} from "@/services/sessionService";
import {
  finishTraining,
  getTrainingById,
  startTraining,
} from "@/services/trainingService";
import type { TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
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
const VISUALIZATION_SIZE = SCREEN_WIDTH * 0.55;

// ============================================================================
// TYPES
// ============================================================================
interface ParticipantData {
  session: SessionWithDetails;
  targets: SessionTarget[];
}

// ============================================================================
// TRAINING VISUALIZATION (aggregate view)
// ============================================================================
const TrainingVisualization = React.memo(function TrainingVisualization({
  totalTargets,
  activeParticipants,
  status,
}: {
  totalTargets: number;
  activeParticipants: number;
  status: string;
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const isActive = status === 'ongoing';

  useEffect(() => {
    if (!isActive) return;
    
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.03,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 2500,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 80000,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 2000,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [isActive]);

  const spin = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const primaryColor = isActive ? "#10B981" : status === 'finished' ? "#6B7280" : "#3B82F6";
  const rings = [0.85, 0.65, 0.45, 0.25];

  return (
    <View style={styles.visualizationContainer}>
      <Animated.View
        style={[
          styles.outerGlow,
          {
            opacity: isActive ? glowAnim : 0.3,
            backgroundColor: `${primaryColor}15`,
          },
        ]}
      />

      <Animated.View
        style={[
          styles.visualization,
          { transform: [{ rotate: isActive ? spin : "0deg" }, { scale: isActive ? pulseAnim : 1 }] },
        ]}
      >
        <Svg width={VISUALIZATION_SIZE} height={VISUALIZATION_SIZE} viewBox="0 0 200 200">
          <Defs>
            <RadialGradient id="glowGrad" cx="50%" cy="50%" r="50%">
              <Stop offset="0%" stopColor={primaryColor} stopOpacity="0.6" />
              <Stop offset="60%" stopColor={primaryColor} stopOpacity="0.2" />
              <Stop offset="100%" stopColor={primaryColor} stopOpacity="0" />
            </RadialGradient>
          </Defs>

          <Circle cx="100" cy="100" r="95" fill="url(#glowGrad)" />

          {rings.map((size, i) => (
            <G key={i}>
              <Circle
                cx="100"
                cy="100"
                r={95 * size}
                fill="none"
                stroke={primaryColor}
                strokeWidth={1.5}
                strokeDasharray={i > 0 ? "4 6" : "0"}
                opacity={0.4 - i * 0.08}
              />
            </G>
          ))}

          <Line x1="100" y1="15" x2="100" y2="40" stroke={primaryColor} strokeWidth="1.5" opacity="0.5" />
          <Line x1="100" y1="160" x2="100" y2="185" stroke={primaryColor} strokeWidth="1.5" opacity="0.5" />
          <Line x1="15" y1="100" x2="40" y2="100" stroke={primaryColor} strokeWidth="1.5" opacity="0.5" />
          <Line x1="160" y1="100" x2="185" y2="100" stroke={primaryColor} strokeWidth="1.5" opacity="0.5" />

          <Circle cx="100" cy="100" r="12" fill={primaryColor} opacity="0.3" />
          <Circle cx="100" cy="100" r="6" fill={primaryColor} opacity="0.6" />
          <Circle cx="100" cy="100" r="2" fill="#fff" opacity="0.8" />
        </Svg>
      </Animated.View>

      {/* Central Stats Overlay */}
      <View style={styles.vizOverlay}>
        <Text style={[styles.vizMainNumber, { color: primaryColor }]}>{totalTargets}</Text>
        <Text style={styles.vizLabel}>TARGETS</Text>
      </View>
    </View>
  );
});

// ============================================================================
// PARTICIPANT CARD
// ============================================================================
const ParticipantCard = React.memo(function ParticipantCard({
  participant,
  isCurrentUser,
  onAddTarget,
}: {
  participant: ParticipantData;
  isCurrentUser: boolean;
  onAddTarget?: () => void;
}) {
  const { session, targets } = participant;
  const isActive = session.status === 'active';
  
  return (
    <View style={[styles.participantCard, isCurrentUser && styles.participantCardHighlight]}>
      <View style={styles.participantHeader}>
        <View style={styles.participantInfo}>
          <BaseAvatar 
            fallbackText={session.user_full_name || 'UN'} 
            size="sm"
          />
          <View style={styles.participantName}>
            <View style={styles.nameRow}>
              <Text style={styles.participantNameText} numberOfLines={1}>
                {session.user_full_name || 'Unknown'}
              </Text>
              {isCurrentUser && (
                <View style={styles.youBadge}>
                  <Text style={styles.youBadgeText}>YOU</Text>
                </View>
              )}
            </View>
            <Text style={styles.participantStatus}>
              {isActive ? 'Active' : session.status}
            </Text>
          </View>
        </View>
        <View style={styles.participantStats}>
          <Text style={styles.participantTargetCount}>{targets.length}</Text>
          <Text style={styles.participantTargetLabel}>targets</Text>
        </View>
      </View>
      
      {isCurrentUser && isActive && onAddTarget && (
        <TouchableOpacity style={styles.addTargetMini} onPress={onAddTarget} activeOpacity={0.8}>
          <Ionicons name="add" size={18} color="#000" />
          <Text style={styles.addTargetMiniText}>Add Target</Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

// ============================================================================
// STAT PILL
// ============================================================================
const StatPill = React.memo(function StatPill({
  icon,
  value,
  label,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  value: string | number;
  label: string;
}) {
  return (
    <View style={styles.statPill}>
      <Ionicons name={icon} size={14} color="rgba(255,255,255,0.5)" />
      <Text style={styles.statPillValue}>{value}</Text>
      <Text style={styles.statPillLabel}>{label}</Text>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TrainingLiveScreen() {
  const insets = useSafeAreaInsets();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();

  const [training, setTraining] = useState<TrainingWithDetails | null>(null);
  const [participants, setParticipants] = useState<ParticipantData[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Load all data
  const loadData = useCallback(async () => {
    if (!trainingId) return;
    try {
      const [trainingData, sessions] = await Promise.all([
        getTrainingById(trainingId),
        getTrainingSessions(trainingId),
      ]);
      
      setTraining(trainingData);
      
      // Load targets for each session
      const participantsWithTargets = await Promise.all(
        sessions.map(async (session) => {
          const targets = await getSessionTargets(session.id);
          return { session, targets };
        })
      );
      
      setParticipants(participantsWithTargets);
      
      // Get current user ID from first session or training
      if (sessions.length > 0) {
        // We'll mark current user based on training creator for now
        // In real app, get from auth context
      }
    } catch (error) {
      console.error("Failed to load training:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [trainingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Computed values
  const totalTargets = useMemo(() => 
    participants.reduce((sum, p) => sum + p.targets.length, 0), 
    [participants]
  );
  
  const activeCount = useMemo(() => 
    participants.filter(p => p.session.status === 'active').length, 
    [participants]
  );

  // Training timer
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!training || training.status !== 'ongoing') return;
    
    const start = training.started_at 
      ? new Date(training.started_at).getTime() 
      : Date.now();
    
    const updateTimer = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [training]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // Actions
  const handleStartTraining = useCallback(async () => {
    if (!training) return;
    setActionLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startTraining(training.id);
      setTraining(prev => prev ? { ...prev, status: 'ongoing', started_at: new Date().toISOString() } : null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start training');
    } finally {
      setActionLoading(false);
    }
  }, [training]);

  const handleFinishTraining = useCallback(async () => {
    if (!training) return;
    Alert.alert('Finish Training?', `End training with ${totalTargets} total targets logged?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Finish',
        onPress: async () => {
          setActionLoading(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await finishTraining(training.id);
            setTraining(prev => prev ? { ...prev, status: 'finished' } : null);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert('Error', error.message || 'Failed to finish training');
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [training, totalTargets]);

  const handleAddTarget = useCallback((sessionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(protected)/addTarget",
      params: { sessionId },
    });
  }, []);

  const handleJoinTraining = useCallback(() => {
    if (!training) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(protected)/createSession",
      params: { trainingId: training.id },
    });
  }, [training]);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
        <Text style={styles.loadingText}>Loading training...</Text>
      </View>
    );
  }

  if (!training) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Training not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleClose}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOngoing = training.status === 'ongoing';
  const isPlanned = training.status === 'planned';
  const isFinished = training.status === 'finished';
  const statusColor = isOngoing ? '#10B981' : isFinished ? '#6B7280' : '#3B82F6';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.headerButton} onPress={handleClose}>
          <Ionicons name="chevron-down" size={28} color="#fff" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
          <Text style={styles.headerTitle}>
            {isOngoing ? 'LIVE' : isFinished ? 'FINISHED' : 'PLANNED'}
          </Text>
        </View>

        <TouchableOpacity style={styles.headerButton} onPress={handleRefresh}>
          <Ionicons name="refresh-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
        }
      >
        {/* Training Title */}
        <Text style={styles.trainingTitle}>{training.title}</Text>
        {training.team && (
          <Text style={styles.trainingTeam}>{training.team.name}</Text>
        )}

        {/* Timer (only when ongoing) */}
        {isOngoing && (
          <View style={styles.timerContainer}>
            <Text style={styles.timerValue}>{formatTime(elapsed)}</Text>
            <Text style={styles.timerLabel}>elapsed</Text>
          </View>
        )}

        {/* Visualization */}
        <TrainingVisualization 
          totalTargets={totalTargets}
          activeParticipants={activeCount}
          status={training.status}
        />

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <StatPill icon="people" value={participants.length} label="joined" />
          <StatPill icon="pulse" value={activeCount} label="active" />
          <StatPill icon="flag" value={training.drills?.length || 0} label="drills" />
        </View>

        {/* Participants Section */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>PARTICIPANTS</Text>
          <Text style={styles.sectionCount}>{participants.length}</Text>
        </View>

        {participants.length === 0 ? (
          <View style={styles.emptyParticipants}>
            <Ionicons name="people-outline" size={32} color="rgba(255,255,255,0.2)" />
            <Text style={styles.emptyText}>No one has joined yet</Text>
          </View>
        ) : (
          <View style={styles.participantsList}>
            {participants.map((p) => (
              <ParticipantCard
                key={p.session.id}
                participant={p}
                isCurrentUser={p.session.user_id === currentUserId}
                onAddTarget={p.session.status === 'active' ? () => handleAddTarget(p.session.id) : undefined}
              />
            ))}
          </View>
        )}

        {/* Drills Preview */}
        {training.drills && training.drills.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>DRILLS</Text>
            </View>
            <View style={styles.drillsList}>
              {training.drills.map((drill, i) => (
                <View key={drill.id} style={styles.drillPill}>
                  <Text style={styles.drillIndex}>#{i + 1}</Text>
                  <Text style={styles.drillName}>{drill.name}</Text>
                  <Text style={styles.drillMeta}>{drill.distance_m}m · {drill.rounds_per_shooter}rds</Text>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { paddingBottom: insets.bottom + 16 }]}>
        {isPlanned && (
          <TouchableOpacity
            style={styles.primaryAction}
            onPress={handleStartTraining}
            disabled={actionLoading}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={["#3B82F6", "#60A5FA"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.primaryActionGradient}
            >
              {actionLoading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Ionicons name="play" size={20} color="#fff" />
                  <Text style={styles.primaryActionText}>Start Training</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        )}

        {isOngoing && (
          <>
            <TouchableOpacity
              style={styles.primaryAction}
              onPress={handleJoinTraining}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={["#10B981", "#34D399"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.primaryActionGradient}
              >
                <Ionicons name="enter" size={20} color="#000" />
                <Text style={[styles.primaryActionText, { color: "#000" }]}>Join Training</Text>
              </LinearGradient>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.secondaryAction}
              onPress={handleFinishTraining}
              disabled={actionLoading}
              activeOpacity={0.7}
            >
              <Text style={styles.secondaryActionText}>
                {actionLoading ? 'Finishing...' : 'Finish Training'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {isFinished && (
          <View style={styles.finishedBanner}>
            <Ionicons name="checkmark-circle" size={20} color="#6B7280" />
            <Text style={styles.finishedText}>Training completed</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
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
    paddingBottom: 12,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  headerTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Training Info
  trainingTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  trainingTeam: {
    fontSize: 15,
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginTop: 4,
  },

  // Timer
  timerContainer: {
    alignItems: "center",
    marginTop: 16,
  },
  timerValue: {
    fontSize: 48,
    fontWeight: "200",
    color: "#10B981",
    fontVariant: ["tabular-nums"],
  },
  timerLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginTop: -4,
  },

  // Visualization
  visualizationContainer: {
    width: VISUALIZATION_SIZE,
    height: VISUALIZATION_SIZE,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 24,
  },
  outerGlow: {
    position: "absolute",
    width: VISUALIZATION_SIZE * 1.2,
    height: VISUALIZATION_SIZE * 1.2,
    borderRadius: VISUALIZATION_SIZE * 0.6,
  },
  visualization: {
    width: VISUALIZATION_SIZE,
    height: VISUALIZATION_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  vizOverlay: {
    position: "absolute",
    alignItems: "center",
  },
  vizMainNumber: {
    fontSize: 56,
    fontWeight: "200",
  },
  vizLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 2,
    marginTop: -4,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    marginBottom: 32,
  },
  statPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statPillValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  statPillLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
  },

  // Participants
  emptyParticipants: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },
  participantsList: {
    gap: 8,
    marginBottom: 24,
  },
  participantCard: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
  },
  participantCardHighlight: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
  },
  participantHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  participantInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  participantName: {
    flex: 1,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  participantNameText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  youBadge: {
    backgroundColor: "#10B981",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#000",
    letterSpacing: 0.5,
  },
  participantStatus: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
    textTransform: "capitalize",
  },
  participantStats: {
    alignItems: "flex-end",
  },
  participantTargetCount: {
    fontSize: 24,
    fontWeight: "600",
    color: "#10B981",
  },
  participantTargetLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: -2,
  },
  addTargetMini: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#10B981",
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  addTargetMiniText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },

  // Drills
  drillsList: {
    gap: 8,
    marginBottom: 24,
  },
  drillPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.04)",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
  },
  drillIndex: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.3)",
    width: 24,
  },
  drillName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "500",
    color: "#fff",
  },
  drillMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
  },

  // Bottom Actions
  bottomActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "rgba(10,10,10,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.06)",
  },
  primaryAction: {
    borderRadius: 28,
    overflow: "hidden",
  },
  primaryActionGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  primaryActionText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
  },
  secondaryAction: {
    alignItems: "center",
    paddingVertical: 14,
  },
  secondaryActionText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.5)",
  },
  finishedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
  },
  finishedText: {
    fontSize: 15,
    color: "#6B7280",
    fontWeight: "500",
  },
});

