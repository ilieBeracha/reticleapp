import { BaseAvatar } from "@/components/BaseAvatar";
import { usePermissions } from "@/hooks/usePermissions";
import {
  createSession,
  getMyActiveSessionForTraining,
  getSessionTargetsWithResults,
  getTrainingSessions,
  SessionWithDetails,
} from "@/services/sessionService";
import { getTeamWithMembers } from "@/services/teamService";
import {
  DrillProgress,
  finishTraining,
  getMyDrillProgress,
  getTrainingById,
  startTraining,
} from "@/services/trainingService";
import type { TeamWithMembers, TrainingDrill, TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// TYPES
// ============================================================================
interface SessionWithStats extends SessionWithDetails {
  targetCount: number;
}

// ============================================================================
// INFO CARD
// ============================================================================
const InfoCard = React.memo(function InfoCard({
  icon,
  label,
  value,
}: {
  icon: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoCard}>
      <View style={styles.infoCardIcon}>
        <Ionicons name={icon as any} size={20} color="rgba(255,255,255,0.5)" />
      </View>
      <View style={styles.infoCardContent}>
        <Text style={styles.infoCardLabel}>{label}</Text>
        <Text style={styles.infoCardValue}>{value}</Text>
      </View>
    </View>
  );
});

// ============================================================================
// DRILL ITEM - Interactive with completion status
// ============================================================================
const DrillItem = React.memo(function DrillItem({
  drill,
  index,
  isCompleted,
  onStart,
  isLive,
  loading,
}: {
  drill: TrainingDrill;
  index: number;
  isCompleted: boolean;
  onStart: () => void;
  isLive: boolean;
  loading: boolean;
}) {
  return (
    <TouchableOpacity 
      style={[
        styles.drillItem, 
        isCompleted && styles.drillItemCompleted
      ]}
      onPress={onStart}
      disabled={!isLive || loading}
      activeOpacity={0.7}
    >
      {/* Number or Checkmark */}
      <View style={[
        styles.drillNumber, 
        isCompleted && styles.drillNumberCompleted
      ]}>
        {isCompleted ? (
          <Ionicons name="checkmark" size={16} color="#10B981" />
        ) : (
          <Text style={[
            styles.drillNumberText,
            isCompleted && styles.drillNumberTextCompleted
          ]}>{index + 1}</Text>
        )}
      </View>
      
      <View style={styles.drillInfo}>
        <Text style={[
          styles.drillName,
          isCompleted && styles.drillNameCompleted
        ]}>{drill.name}</Text>
        <Text style={styles.drillMeta}>
          {drill.distance_m}m • {drill.rounds_per_shooter} rounds • {drill.target_type}
        </Text>
      </View>
      
      {/* Action indicator */}
      {isLive && !isCompleted && (
        <View style={styles.drillAction}>
          <Ionicons name="play-circle" size={24} color="#10B981" />
        </View>
      )}
      {isCompleted && (
        <Text style={styles.drillCompletedLabel}>Done</Text>
      )}
    </TouchableOpacity>
  );
});

// ============================================================================
// SESSION ITEM - More unique display with rank + start time
// ============================================================================
const SessionItem = React.memo(function SessionItem({
  session,
  isMe,
  rank,
  onPress,
}: {
  session: SessionWithStats;
  isMe: boolean;
  rank: number;
  onPress: () => void;
}) {
  const isActive = session.status === "active";
  const name = session.user_full_name || "Unknown";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  
  // Format start time
  const startTime = new Date(session.started_at).toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  return (
    <TouchableOpacity style={styles.sessionItem} onPress={onPress} activeOpacity={0.7}>
      {/* Rank badge */}
      <View style={[styles.rankBadge, rank === 1 && styles.rankBadgeFirst]}>
        <Text style={[styles.rankText, rank === 1 && styles.rankTextFirst]}>#{rank}</Text>
      </View>
      
      <View style={styles.sessionAvatar}>
        <BaseAvatar fallbackText={initials} size="sm" />
        {isActive && <View style={styles.sessionActiveDot} />}
      </View>
      
      <View style={styles.sessionInfo}>
        <View style={styles.sessionNameRow}>
          <Text style={styles.sessionName}>{name}</Text>
          {isMe && <Text style={styles.sessionYouTag}>You</Text>}
        </View>
        <Text style={styles.sessionMeta}>
          {session.targetCount} targets • {startTime}
        </Text>
      </View>
      
      {/* Target count as primary metric */}
      <View style={styles.targetCountBox}>
        <Text style={styles.targetCountValue}>{session.targetCount}</Text>
        <Text style={styles.targetCountLabel}>targets</Text>
      </View>
    </TouchableOpacity>
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyState = React.memo(function EmptyState({
  icon,
  text,
}: {
  icon: string;
  text: string;
}) {
  return (
    <View style={styles.emptyCard}>
      <Ionicons name={icon as any} size={28} color="rgba(255,255,255,0.2)" />
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
});

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function TrainingScreen() {
  const insets = useSafeAreaInsets();
  const { trainingId } = useLocalSearchParams<{ trainingId: string }>();
  const { canManageTraining } = usePermissions();

  const [training, setTraining] = useState<TrainingWithDetails | null>(null);
  const [team, setTeam] = useState<TeamWithMembers | null>(null);
  const [sessions, setSessions] = useState<SessionWithStats[]>([]);
  const [mySession, setMySession] = useState<SessionWithDetails | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [creatorName, setCreatorName] = useState<string | null>(null);
  const [drillProgress, setDrillProgress] = useState<DrillProgress[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [startingDrillId, setStartingDrillId] = useState<string | null>(null);

  // Load data
  const loadData = useCallback(async () => {
    if (!trainingId) return;
    try {
      const { supabase } = await import("@/lib/supabase");
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);

      const [trainingData, trainingSessions, activeSession, progress] = await Promise.all([
        getTrainingById(trainingId),
        getTrainingSessions(trainingId),
        getMyActiveSessionForTraining(trainingId),
        getMyDrillProgress(trainingId),
      ]);

      setTraining(trainingData);
      setMySession(activeSession);
      setDrillProgress(progress);

      // Get creator name
      if (trainingData?.created_by) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('id', trainingData.created_by)
          .single();
        setCreatorName(profile?.full_name || null);
      }

      // Load target counts for sessions
      const sessionsWithStats: SessionWithStats[] = await Promise.all(
        trainingSessions.map(async (s) => {
          const targets = await getSessionTargetsWithResults(s.id);
          return { ...s, targetCount: targets.length };
        })
      );

      // Sort by target count (most targets first)
      sessionsWithStats.sort((a, b) => b.targetCount - a.targetCount);
      setSessions(sessionsWithStats);

      if (trainingData?.team_id) {
        const teamData = await getTeamWithMembers(trainingData.team_id);
        setTeam(teamData);
      }
    } catch (error) {
      console.error("Failed to load:", error);
    } finally {
      setLoading(false);
    }
  }, [trainingId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Formatted values
  const formattedDate = useMemo(() => {
    if (!training?.scheduled_at) return "Not scheduled";
    const date = new Date(training.scheduled_at);
    return date.toLocaleDateString("en-US", { 
      weekday: "long", 
      month: "long", 
      day: "numeric",
      year: "numeric"
    });
  }, [training]);

  const formattedTime = useMemo(() => {
    if (!training?.scheduled_at) return "";
    const date = new Date(training.scheduled_at);
    return date.toLocaleTimeString("en-US", { 
      hour: "numeric", 
      minute: "2-digit",
      hour12: true 
    });
  }, [training]);

  // Actions
  const handleStartTraining = useCallback(async () => {
    if (!training) return;
    setActionLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await startTraining(training.id);
      setTraining((prev) => (prev ? { ...prev, status: "ongoing" } : null));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  }, [training]);

  const handleStartSession = useCallback(async () => {
    if (!training) return;
    setActionLoading(true);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const session = await createSession({
        training_id: training.id,
        team_id: training.team_id || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/(protected)/activeSession",
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setActionLoading(false);
    }
  }, [training]);

  const handleContinueSession = useCallback(() => {
    if (!mySession) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(protected)/activeSession",
      params: { sessionId: mySession.id },
    });
  }, [mySession]);

  // Start a session for a specific drill
  const handleStartDrill = useCallback(async (drillId: string) => {
    if (!training) return;
    
    // Check if already completed
    const progress = drillProgress.find(p => p.drillId === drillId);
    if (progress?.completed) {
      // Allow redo - just start a new session
    }
    
    setStartingDrillId(drillId);
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const session = await createSession({
        training_id: training.id,
        team_id: training.team_id || undefined,
        drill_id: drillId,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.push({
        pathname: "/(protected)/activeSession",
        params: { sessionId: session.id },
      });
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setStartingDrillId(null);
    }
  }, [training, drillProgress]);

  const handleEndTraining = useCallback(async () => {
    if (!training) return;
    Alert.alert("Mark as Completed?", "This will end the training for all participants.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Complete",
        onPress: async () => {
          setActionLoading(true);
          try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            await finishTraining(training.id);
            setTraining((prev) => (prev ? { ...prev, status: "finished" } : null));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch (error: any) {
            Alert.alert("Error", error.message);
          } finally {
            setActionLoading(false);
          }
        },
      },
    ]);
  }, [training]);

  const handleSessionPress = useCallback((session: SessionWithStats) => {
    if (session.user_id === currentUserId && session.status === "active") {
      handleContinueSession();
    }
  }, [currentUserId, handleContinueSession]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  if (!training) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={48} color="#EF4444" />
        <Text style={styles.errorText}>Training not found</Text>
        <TouchableOpacity style={styles.errorButton} onPress={handleBack}>
          <Text style={styles.errorButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isLive = training.status === "ongoing";
  const isPlanned = training.status === "planned";
  const isFinished = training.status === "finished";

  const statusLabel = isLive ? "In Progress" : isFinished ? "Completed" : "Scheduled";
  const statusColor = isLive ? "#10B981" : isFinished ? "rgba(255,255,255,0.4)" : "#3B82F6";

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <View style={styles.grabber} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView 
        style={styles.scroll} 
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 120 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Status Badge */}
        <View style={styles.statusSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusColor + '20' }]}>
            {isLive && <View style={[styles.statusDot, { backgroundColor: statusColor }]} />}
            <Text style={[styles.statusText, { color: statusColor }]}>{statusLabel}</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={styles.title}>{training.title}</Text>

        {/* Info Cards */}
        <View style={styles.infoSection}>
          <InfoCard icon="calendar-outline" label="Date" value={formattedDate} />
          {formattedTime && (
            <InfoCard icon="time-outline" label="Time" value={formattedTime} />
          )}
          {team && (
            <InfoCard icon="people-outline" label="Team" value={team.name} />
          )}
        </View>

        {/* Drills Section */}
        <View style={styles.section}>
          <View style={styles.drillsHeader}>
            <Text style={styles.sectionTitle}>Drills</Text>
            {training.drills && training.drills.length > 0 && (
              <View style={styles.drillProgressBadge}>
                <Text style={styles.drillProgressText}>
                  {drillProgress.filter(p => p.completed).length}/{training.drills.length}
                </Text>
              </View>
            )}
          </View>
          
          {/* Progress Bar */}
          {training.drills && training.drills.length > 0 && (
            <View style={styles.progressBarContainer}>
              <View 
                style={[
                  styles.progressBarFill, 
                  { 
                    width: `${(drillProgress.filter(p => p.completed).length / training.drills.length) * 100}%` 
                  }
                ]} 
              />
            </View>
          )}
          
          {training.drills && training.drills.length > 0 ? (
            training.drills.map((drill, idx) => {
              const progress = drillProgress.find(p => p.drillId === drill.id);
              return (
                <DrillItem 
                  key={drill.id} 
                  drill={drill} 
                  index={idx}
                  isCompleted={progress?.completed || false}
                  onStart={() => handleStartDrill(drill.id)}
                  isLive={isLive}
                  loading={startingDrillId === drill.id}
                />
              );
            })
          ) : (
            <EmptyState icon="list-outline" text="No drills scheduled" />
          )}
        </View>

        {/* Sessions Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Leaderboard ({sessions.length})</Text>
          {sessions.length > 0 ? (
            sessions.map((session, index) => (
              <SessionItem
                key={session.id}
                session={session}
                isMe={session.user_id === currentUserId}
                rank={index + 1}
                onPress={() => handleSessionPress(session)}
              />
            ))
          ) : (
            <EmptyState icon="pulse-outline" text="No sessions logged yet" />
          )}
        </View>

        {/* Creator */}
        {creatorName && (
          <Text style={styles.creatorText}>Created by {creatorName}</Text>
        )}
      </ScrollView>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        {/* Planned: Show Start Training (Commander only) */}
        {isPlanned && canManageTraining && (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleStartTraining}
            disabled={actionLoading}
            activeOpacity={0.85}
          >
            {actionLoading ? (
              <ActivityIndicator color="#000" size="small" />
            ) : (
              <>
                <Ionicons name="play-circle" size={22} color="#000" />
                <Text style={styles.primaryBtnText}>Start Training</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Planned: Soldier sees waiting message */}
        {isPlanned && !canManageTraining && (
          <View style={styles.finishedBar}>
            <Ionicons name="time-outline" size={22} color="rgba(255,255,255,0.5)" />
            <Text style={styles.finishedText}>Waiting for commander to start</Text>
          </View>
        )}

        {/* Live: Show Enter/Continue Session + Mark Complete (Commander only) */}
        {isLive && (
          <View style={styles.liveActions}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={mySession ? handleContinueSession : handleStartSession}
              disabled={actionLoading}
              activeOpacity={0.85}
            >
              {actionLoading ? (
                <ActivityIndicator color="#000" size="small" />
              ) : (
                <>
                  <Ionicons 
                    name={mySession ? "arrow-forward-circle" : "add-circle"} 
                    size={22} 
                    color="#000" 
                  />
                  <Text style={styles.primaryBtnText}>
                    {mySession ? "Continue Session" : "Enter Session"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
            {/* Only commanders can mark training as complete */}
            {canManageTraining && (
              <TouchableOpacity 
                style={styles.completeBtn} 
                onPress={handleEndTraining}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark" size={22} color="#10B981" />
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Finished: Show completed state */}
        {isFinished && (
          <View style={styles.finishedBar}>
            <Ionicons name="checkmark-circle" size={22} color="#10B981" />
            <Text style={styles.finishedText}>Training Completed</Text>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  errorText: {
    fontSize: 16,
    color: "#fff",
  },
  errorButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
  },
  errorButtonText: {
    color: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  grabber: {
    width: 36,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
  },

  // Status
  statusSection: {
    alignItems: "center",
    marginTop: 16,
    marginBottom: 16,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Title
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 24,
  },

  // Info Cards
  infoSection: {
    gap: 10,
    marginBottom: 28,
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.06)",
    borderRadius: 14,
    padding: 16,
    gap: 14,
  },
  infoCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginBottom: 2,
  },
  infoCardValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },

  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
    marginBottom: 12,
  },

  // Empty state
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 32,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.3)",
  },

  // Drill Item
  drillItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  drillNumber: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  drillNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#10B981",
  },
  drillInfo: {
    flex: 1,
  },
  drillName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 2,
  },
  drillMeta: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
  },
  drillItemCompleted: {
    opacity: 0.6,
  },
  drillNumberCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.25)",
  },
  drillNumberTextCompleted: {
    color: "#10B981",
  },
  drillNameCompleted: {
    textDecorationLine: "line-through",
    color: "rgba(255,255,255,0.5)",
  },
  drillAction: {
    padding: 4,
  },
  drillCompletedLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderRadius: 6,
  },
  drillsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  drillProgressBadge: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  drillProgressText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#10B981",
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 2,
    marginBottom: 16,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },

  // Session Item
  sessionItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    gap: 10,
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  rankBadgeFirst: {
    backgroundColor: "rgba(245, 158, 11, 0.2)",
  },
  rankText: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
  },
  rankTextFirst: {
    color: "#F59E0B",
  },
  sessionAvatar: {
    position: "relative",
  },
  sessionActiveDot: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#10B981",
    borderWidth: 2,
    borderColor: "#0A0A0A",
  },
  sessionInfo: {
    flex: 1,
  },
  sessionNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  sessionName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  sessionYouTag: {
    fontSize: 11,
    fontWeight: "600",
    color: "#10B981",
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessionMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  targetCountBox: {
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  targetCountValue: {
    fontSize: 16,
    fontWeight: "700",
    color: '#10B981',
  },
  targetCountLabel: {
    fontSize: 9,
    fontWeight: '500',
    color: '#10B981',
    marginTop: 1,
  },
  activeTag: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activeTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#10B981",
  },

  // Creator
  creatorText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
    textAlign: "center",
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: "#0A0A0A",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#10B981",
    gap: 10,
    flex: 1,
  },
  primaryBtnText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  liveActions: {
    flexDirection: "row",
    gap: 12,
  },
  completeBtn: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  finishedBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.06)",
    gap: 10,
  },
  finishedText: {
    fontSize: 16,
    fontWeight: "500",
    color: "rgba(255,255,255,0.5)",
  },
});
