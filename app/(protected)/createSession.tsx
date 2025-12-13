import { useColors } from "@/hooks/ui/useColors";
import { useAppContext } from "@/hooks/useAppContext";
import { getMyActivePersonalSession, getMyActiveSession } from "@/services/sessionService";
import { useSessionStore } from "@/store/sessionStore";
import { useTrainingStore } from "@/store/trainingStore";
import type { TrainingWithDetails } from "@/types/workspace";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router, useLocalSearchParams } from "expo-router";
import { ChevronRight, Target, User, Users } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

// ============================================================================
// TRAINING CARD
// ============================================================================
function TrainingCard({
  training,
  isSelected,
  onSelect,
  colors,
}: {
  training: TrainingWithDetails;
  isSelected: boolean;
  onSelect: () => void;
  colors: ReturnType<typeof useColors>;
}) {
  const statusColor = training.status === "ongoing" ? "#10B981" : "#3B82F6";

  return (
    <TouchableOpacity
      style={[
        styles.trainingCard,
        {
          backgroundColor: isSelected ? statusColor + "15" : colors.card,
          borderColor: isSelected ? statusColor : colors.border,
          borderWidth: isSelected ? 2 : 1,
        },
      ]}
      onPress={onSelect}
      activeOpacity={0.7}
    >
      <View style={styles.trainingCardRow}>
        <View
          style={[
            styles.trainingIcon,
            { backgroundColor: statusColor + "20" },
          ]}
        >
          <Target size={18} color={statusColor} />
        </View>
        <View style={styles.trainingCardContent}>
          <Text
            style={[styles.trainingTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {training.title}
          </Text>
          <View style={styles.trainingMetaRow}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: statusColor + "20" },
              ]}
            >
              <View
                style={[styles.statusDot, { backgroundColor: statusColor }]}
              />
              <Text style={[styles.statusText, { color: statusColor }]}>
                {training.status === "ongoing" ? "Live" : "Scheduled"}
              </Text>
            </View>
            {training.drill_count && training.drill_count > 0 && (
              <Text style={[styles.trainingMeta, { color: colors.textMuted }]}>
                • {training.drill_count} drills
              </Text>
            )}
          </View>
        </View>
        {isSelected ? (
          <View style={[styles.checkIcon, { backgroundColor: statusColor }]}>
            <Ionicons name="checkmark" size={14} color="#fff" />
          </View>
        ) : (
          <ChevronRight size={18} color={colors.textMuted} />
        )}
      </View>
    </TouchableOpacity>
  );
}

// ============================================================================
// TEAM GROUP
// ============================================================================
function TeamGroup({
  teamName,
  trainings,
  selectedTrainingId,
  onSelectTraining,
  colors,
}: {
  teamName: string;
  trainings: TrainingWithDetails[];
  selectedTrainingId: string | null;
  onSelectTraining: (training: TrainingWithDetails) => void;
  colors: ReturnType<typeof useColors>;
}) {
  return (
    <View style={styles.teamGroup}>
      <View style={styles.teamHeader}>
        <Users size={14} color={colors.textMuted} />
        <Text style={[styles.teamName, { color: colors.textMuted }]}>
          {teamName}
        </Text>
      </View>
      <View style={styles.trainingsList}>
        {trainings.map((training) => (
          <TrainingCard
            key={training.id}
            training={training}
            isSelected={selectedTrainingId === training.id}
            onSelect={() => onSelectTraining(training)}
            colors={colors}
          />
        ))}
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function CreateSessionSheet() {
  const colors = useColors();
  const { trainingId } = useLocalSearchParams<{ trainingId?: string }>();
  const { createSession, loadSessions, loading } = useSessionStore();
  const { activeTeamId, userId } = useAppContext();
  const {
    myUpcomingTrainings,
    loadMyUpcomingTrainings,
    loadingMyTrainings,
  } = useTrainingStore();

  // ========== STATE ==========
  const [isCreating, setIsCreating] = useState(false);
  const [selectedTraining, setSelectedTraining] =
    useState<TrainingWithDetails | null>(null);
  const [mode, setMode] = useState<"training" | "solo" | null>(
    trainingId ? "training" : null
  );
  const [checkingActiveSession, setCheckingActiveSession] = useState(true);

  // Check if in personal mode (no team selected)
  const isPersonalMode = !activeTeamId;

  // ========== EFFECTS ==========
  // Check for existing active session on mount
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const activeSession = isPersonalMode
          ? await getMyActivePersonalSession()
          : await getMyActiveSession();

        if (activeSession) {
          if (isPersonalMode) {
            Alert.alert(
              "Active Session",
              `You already have an active ${
                activeSession.training_title
                  ? `training session "${activeSession.training_title}"`
                  : "session"
              }. In personal mode, you can only have one session at a time.`,
              [
                {
                  text: "Continue Session",
                  onPress: () => {
                    router.replace({
                      pathname: "/(protected)/activeSession",
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: "Cancel",
                  style: "cancel",
                  onPress: () => router.back(),
                },
              ]
            );
          } else {
            Alert.alert(
              "Active Session Found",
              `You already have an active ${
                activeSession.training_title
                  ? `training session "${activeSession.training_title}"`
                  : "session"
              }. Would you like to continue it?`,
              [
                {
                  text: "Continue Session",
                  onPress: () => {
                    router.replace({
                      pathname: "/(protected)/activeSession",
                      params: { sessionId: activeSession.id },
                    });
                  },
                },
                {
                  text: "Start New",
                  style: "destructive",
                  onPress: () => setCheckingActiveSession(false),
                },
              ]
            );
          }
        } else {
          setCheckingActiveSession(false);
        }
      } catch (error) {
        console.error("Failed to check active session:", error);
        setCheckingActiveSession(false);
      }
    };
    checkActiveSession();
  }, [isPersonalMode]);

  useEffect(() => {
    loadMyUpcomingTrainings();
  }, [loadMyUpcomingTrainings]);

  // Auto-select training if trainingId is provided in URL (deep link)
  useEffect(() => {
    if (trainingId && myUpcomingTrainings.length > 0) {
      const training = myUpcomingTrainings.find((t) => t.id === trainingId);
      if (training) {
        setSelectedTraining(training);
        setMode("training");
      }
    }
  }, [trainingId, myUpcomingTrainings]);

  // ========== COMPUTED ==========
  const availableTrainings = useMemo(
    () =>
      myUpcomingTrainings.filter(
        (t) => t.status === "ongoing" || t.status === "planned"
      ),
    [myUpcomingTrainings]
  );

  // Group trainings by team
  const trainingsByTeam = useMemo(() => {
    const grouped: { [teamId: string]: { name: string; trainings: TrainingWithDetails[] } } = {};

    for (const training of availableTrainings) {
      const teamId = training.team_id;
      const teamName = training.team?.name || "Unknown Team";

      if (!grouped[teamId]) {
        grouped[teamId] = { name: teamName, trainings: [] };
      }
      grouped[teamId].trainings.push(training);
    }

    // Sort: ongoing trainings first within each team
    for (const teamId of Object.keys(grouped)) {
      grouped[teamId].trainings.sort((a, b) => {
        if (a.status === "ongoing" && b.status !== "ongoing") return -1;
        if (b.status === "ongoing" && a.status !== "ongoing") return 1;
        return 0;
      });
    }

    return grouped;
  }, [availableTrainings]);

  const teamCount = Object.keys(trainingsByTeam).length;
  const hasTrainings = availableTrainings.length > 0;
  const canStart = mode === "solo" || (mode === "training" && selectedTraining);

  // ========== HANDLERS ==========
  const handleTrainingSelect = useCallback(
    (training: TrainingWithDetails) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      if (selectedTraining?.id === training.id) {
        setSelectedTraining(null);
      } else {
        setSelectedTraining(training);
        setMode("training");
      }
    },
    [selectedTraining]
  );

  const handleModeSelect = useCallback((newMode: "training" | "solo") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setMode(newMode);
    if (newMode === "solo") {
      setSelectedTraining(null);
    }
  }, []);

  const handleCreate = useCallback(async () => {
    if (!userId) {
      Alert.alert(
        "Error",
        "User information is still loading. Please try again."
      );
      return;
    }

    if (!canStart) {
      Alert.alert("Select Mode", "Please choose to join a training or start solo.");
      return;
    }

    // Drill-driven trainings: route to training drill selection instead of creating a generic training session
    if (mode === "training" && selectedTraining && (selectedTraining.drill_count || 0) > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      router.replace({
        pathname: "/(protected)/trainingLive",
        params: { trainingId: selectedTraining.id },
      });
      return;
    }

    setIsCreating(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    try {
      const newSession = await createSession({
        team_id: selectedTraining?.team_id || activeTeamId || undefined,
        training_id: selectedTraining?.id || undefined,
        session_mode: selectedTraining ? "group" : "solo",
      });

      if (activeTeamId) {
        await loadSessions();
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      router.replace({
        pathname: "/(protected)/activeSession",
        params: { sessionId: newSession.id },
      });
    } catch (error: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  }, [
    userId,
    canStart,
    createSession,
    selectedTraining,
    activeTeamId,
    loadSessions,
    mode,
  ]);

  // ========== RENDER ==========
  if (checkingActiveSession) {
    return (
      <View style={[styles.container, styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.text} size="small" />
        <Text style={[styles.loadingText, { color: colors.textMuted }]}>
          Checking for active sessions...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Animated.View entering={FadeInDown.duration(400)} style={styles.header}>
          <View style={[styles.headerIcon, { backgroundColor: "#10B98115" }]}>
            <Target size={36} color="#10B981" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Start Session
          </Text>
          <Text style={[styles.subtitle, { color: colors.textMuted }]}>
            {hasTrainings
              ? `Select a training or practice solo`
              : "Start a solo practice session"}
          </Text>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            TEAM TRAININGS (MAIN OPTION)
        ══════════════════════════════════════════════════════════════════════ */}
        {hasTrainings && (
          <Animated.View entering={FadeIn.delay(100)} style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>
                TEAM TRAININGS
              </Text>
              <Text style={[styles.sectionNote, { color: colors.textMuted }]}>
                {availableTrainings.length} available
              </Text>
            </View>

            {loadingMyTrainings ? (
              <View style={styles.loadingList}>
                <ActivityIndicator color="#10B981" />
              </View>
            ) : (
              <View style={styles.teamsList}>
                {Object.entries(trainingsByTeam).map(([teamId, group]) => (
                  <TeamGroup
                    key={teamId}
                    teamName={group.name}
                    trainings={group.trainings}
                    selectedTrainingId={selectedTraining?.id || null}
                    onSelectTraining={handleTrainingSelect}
                    colors={colors}
                  />
                ))}
              </View>
            )}
          </Animated.View>
        )}

        {/* ══════════════════════════════════════════════════════════════════════
            SOLO OPTION (SECONDARY)
        ══════════════════════════════════════════════════════════════════════ */}
        <Animated.View entering={FadeIn.delay(hasTrainings ? 200 : 100)} style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted, marginBottom: 12, marginLeft: 4 }]}>
            {hasTrainings ? "OR PRACTICE SOLO" : "PERSONAL SESSION"}
          </Text>
          <TouchableOpacity
            style={[
              styles.soloCard,
              {
                backgroundColor: mode === "solo" ? "#F59E0B15" : colors.card,
                borderColor: mode === "solo" ? "#F59E0B" : colors.border,
                borderWidth: mode === "solo" ? 2 : 1,
              },
            ]}
            onPress={() => handleModeSelect("solo")}
            activeOpacity={0.8}
          >
            <View style={[styles.soloIcon, { backgroundColor: mode === "solo" ? "#F59E0B20" : colors.secondary }]}>
              <User size={22} color={mode === "solo" ? "#F59E0B" : colors.textMuted} />
            </View>
            <View style={styles.soloContent}>
              <Text style={[styles.soloTitle, { color: mode === "solo" ? "#F59E0B" : colors.text }]}>
                Solo Practice
              </Text>
              <Text style={[styles.soloDesc, { color: colors.textMuted }]}>
                Personal session without a team
              </Text>
            </View>
            {mode === "solo" && (
              <View style={[styles.checkBadge, { backgroundColor: "#F59E0B" }]}>
                <Ionicons name="checkmark" size={16} color="#fff" />
              </View>
            )}
          </TouchableOpacity>
        </Animated.View>

        {/* ══════════════════════════════════════════════════════════════════════
            SUMMARY
        ══════════════════════════════════════════════════════════════════════ */}
        {canStart && (
          <Animated.View entering={FadeIn} style={styles.summarySection}>
            <View
              style={[
                styles.summaryCard,
                { backgroundColor: "#10B98108", borderColor: "#10B98120" },
              ]}
            >
              <Ionicons name="checkmark-circle" size={22} color="#10B981" />
              <View style={styles.summaryContent}>
                <Text style={[styles.summaryTitle, { color: "#10B981" }]}>
                  {mode === "solo" ? "Solo Session" : selectedTraining?.title}
                </Text>
                <Text style={[styles.summaryDesc, { color: colors.textMuted }]}>
                  {mode === "solo"
                    ? "Personal practice session"
                    : `${selectedTraining?.team?.name} • ${selectedTraining?.drill_count || 0} drills`}
                </Text>
              </View>
            </View>
          </Animated.View>
        )}

        <View style={{ height: 120 }} />
      </ScrollView>

      {/* ══════════════════════════════════════════════════════════════════════
          BOTTOM BUTTON
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.bottomContainer, { backgroundColor: colors.background, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.startButton,
            {
              backgroundColor: !canStart || isCreating || loading ? colors.muted : "#10B981",
            },
          ]}
          onPress={handleCreate}
          disabled={!canStart || isCreating || loading}
          activeOpacity={0.8}
        >
          {isCreating || loading ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="play" size={22} color="#fff" />
              <Text style={styles.startButtonText}>
                {mode === "solo"
                  ? "Start Solo Session"
                  : (selectedTraining?.drill_count || 0) > 0
                    ? "Choose Drill"
                    : "Join Training"}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },
  loadingContainer: { justifyContent: "center", alignItems: "center", gap: 12 },
  loadingText: { fontSize: 14 },
  loadingList: { padding: 24, alignItems: "center" },

  // Header
  header: {
    alignItems: "center",
    paddingTop: 24,
    paddingBottom: 28,
  },
  headerIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    letterSpacing: -0.4,
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
  },

  // Section
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  sectionNote: { fontSize: 11 },

  // Solo Card
  soloCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    gap: 14,
  },
  soloIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  soloContent: { flex: 1 },
  soloTitle: { fontSize: 16, fontWeight: "600" },
  soloDesc: { fontSize: 13, marginTop: 2 },
  checkBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  // Team Group
  teamsList: { gap: 20 },
  teamGroup: {},
  teamHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
    paddingLeft: 4,
  },
  teamName: { fontSize: 12, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  trainingsList: { gap: 10 },

  // Training Card
  trainingCard: {
    borderRadius: 14,
    padding: 14,
  },
  trainingCardRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trainingIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  trainingCardContent: { flex: 1 },
  trainingTitle: {
    fontSize: 15,
    fontWeight: "600",
  },
  trainingMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 6,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    gap: 5,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  trainingMeta: {
    fontSize: 12,
  },
  checkIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },

  // No Trainings
  noTrainingsContainer: { marginBottom: 24 },
  noTrainingsCard: {
    alignItems: "center",
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    gap: 8,
  },
  noTrainingsText: { fontSize: 15, fontWeight: "500" },
  noTrainingsHint: { fontSize: 13 },

  // Summary
  summarySection: { marginBottom: 20 },
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 12,
  },
  summaryContent: { flex: 1 },
  summaryTitle: { fontSize: 16, fontWeight: "600" },
  summaryDesc: { fontSize: 13, marginTop: 2 },

  // Bottom
  bottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 36,
    borderTopWidth: 1,
  },
  startButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 28,
    gap: 10,
  },
  startButtonText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "600",
  },
});
