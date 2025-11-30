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
import { router, useLocalSearchParams } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================================================
// TIMER COMPONENT
// ============================================================================
const SessionTimer = React.memo(function SessionTimer({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const updateTimer = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <View style={styles.timerBox}>
      <View style={styles.timerDot} />
      <Text style={styles.timerText}>{formatTime(elapsed)}</Text>
    </View>
  );
});

// ============================================================================
// STAT CARD
// ============================================================================
const StatCard = React.memo(function StatCard({
  value,
  label,
  accent,
}: {
  value: string | number;
  label: string;
  accent?: boolean;
}) {
  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, accent && styles.statValueAccent]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
});

// ============================================================================
// TARGET CARD
// ============================================================================
const TargetCard = React.memo(function TargetCard({
  target,
  index,
  onPress,
}: {
  target: SessionTargetWithResults;
  index: number;
  onPress: () => void;
}) {
  const isPaper = target.target_type === 'paper';
  
  let hits = 0;
  let shots = 0;
  let accuracy = 0;
  const hasImage = isPaper && target.paper_result?.scanned_image_url;
  
  if (isPaper && target.paper_result) {
    hits = target.paper_result.hits_total ?? 0;
    shots = target.paper_result.bullets_fired;
    accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  } else if (!isPaper && target.tactical_result) {
    hits = target.tactical_result.hits;
    shots = target.tactical_result.bullets_fired;
    accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  }

  const hasResult = (isPaper && target.paper_result) || (!isPaper && target.tactical_result);
  const accuracyColor = accuracy >= 70 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : '#EF4444';

  return (
    <TouchableOpacity style={styles.targetCard} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.targetIcon, isPaper ? styles.targetIconPaper : styles.targetIconTactical]}>
        <Ionicons 
          name={isPaper ? 'disc-outline' : 'flash-outline'} 
          size={22} 
          color={isPaper ? '#3B82F6' : '#F59E0B'} 
        />
        {hasImage && (
          <View style={styles.imageIndicator}>
            <Ionicons name="image" size={10} color="#fff" />
          </View>
        )}
      </View>
      
      <View style={styles.targetInfo}>
        <View style={styles.targetHeader}>
          <Text style={styles.targetType}>{isPaper ? 'Paper Target' : 'Tactical Target'}</Text>
          <Text style={styles.targetIndex}>#{index}</Text>
        </View>
        <View style={styles.targetMeta}>
          <Ionicons name="resize-outline" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.targetMetaText}>{target.distance_m}m</Text>
          {hasResult && (
            <>
              <View style={styles.metaDot} />
              <Text style={styles.targetMetaText}>{hits}/{shots} hits</Text>
            </>
          )}
        </View>
      </View>

      {hasResult ? (
        <View style={[styles.accuracyBadge, { backgroundColor: accuracyColor + '20' }]}>
          <Text style={[styles.accuracyText, { color: accuracyColor }]}>{accuracy}%</Text>
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.3)" />
      )}
    </TouchableOpacity>
  );
});

// ============================================================================
// TARGET DETAIL MODAL
// ============================================================================
const TargetDetailModal = React.memo(function TargetDetailModal({
  target,
  index,
  visible,
  onClose,
}: {
  target: SessionTargetWithResults | null;
  index: number;
  visible: boolean;
  onClose: () => void;
}) {
  const insets = useSafeAreaInsets();
  
  if (!target) return null;

  const isPaper = target.target_type === 'paper';
  const paperResult = target.paper_result;
  const tacticalResult = target.tactical_result;
  
  let hits = 0;
  let shots = 0;
  let accuracy = 0;
  
  if (isPaper && paperResult) {
    hits = paperResult.hits_total ?? 0;
    shots = paperResult.bullets_fired;
    accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  } else if (!isPaper && tacticalResult) {
    hits = tacticalResult.hits;
    shots = tacticalResult.bullets_fired;
    accuracy = shots > 0 ? Math.round((hits / shots) * 100) : 0;
  }

  const accuracyColor = accuracy >= 70 ? '#10B981' : accuracy >= 50 ? '#F59E0B' : '#EF4444';
  const hasImage = isPaper && paperResult?.scanned_image_url;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.modalHeader}>
          <View style={styles.modalGrabber} />
          <View style={styles.modalHeaderRow}>
            <View style={styles.modalTitleSection}>
              <View style={[styles.modalIcon, isPaper ? styles.targetIconPaper : styles.targetIconTactical]}>
                <Ionicons 
                  name={isPaper ? 'disc-outline' : 'flash-outline'} 
                  size={24} 
                  color={isPaper ? '#3B82F6' : '#F59E0B'} 
                />
              </View>
              <View>
                <Text style={styles.modalTitle}>Target #{index}</Text>
                <Text style={styles.modalSubtitle}>{isPaper ? 'Paper' : 'Tactical'} • {target.distance_m}m</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={onClose}>
              <Ionicons name="close" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.modalScroll}
          contentContainerStyle={[styles.modalContent, { paddingBottom: insets.bottom + 20 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Section */}
          {hasImage && (
            <View style={styles.imageSection}>
              <Text style={styles.sectionLabel}>SCANNED TARGET</Text>
              <View style={styles.imageContainer}>
                <Image 
                  source={{ uri: paperResult.scanned_image_url! }} 
                  style={styles.targetImage}
                  resizeMode="contain"
                />
              </View>
            </View>
          )}

          {/* Stats Section */}
          <View style={styles.detailSection}>
            <Text style={styles.sectionLabel}>RESULTS</Text>
            
            <View style={styles.detailStatsRow}>
              <View style={styles.detailStatCard}>
                <Text style={styles.detailStatValue}>{shots}</Text>
                <Text style={styles.detailStatLabel}>Shots Fired</Text>
              </View>
              <View style={styles.detailStatCard}>
                <Text style={[styles.detailStatValue, { color: '#10B981' }]}>{hits}</Text>
                <Text style={styles.detailStatLabel}>Hits</Text>
              </View>
              <View style={[styles.detailStatCard, { backgroundColor: accuracyColor + '15' }]}>
                <Text style={[styles.detailStatValue, { color: accuracyColor }]}>{accuracy}%</Text>
                <Text style={styles.detailStatLabel}>Accuracy</Text>
              </View>
            </View>
          </View>

          {/* Paper-specific details */}
          {isPaper && paperResult && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>PAPER TARGET DATA</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Paper Type</Text>
                  <Text style={styles.detailValue}>{paperResult.paper_type || 'Standard'}</Text>
                </View>
                {paperResult.hits_inside_scoring != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Hits Inside Scoring</Text>
                    <Text style={styles.detailValue}>{paperResult.hits_inside_scoring}</Text>
                  </View>
                )}
                {paperResult.dispersion_cm != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Dispersion</Text>
                    <Text style={styles.detailValue}>{paperResult.dispersion_cm} cm</Text>
                  </View>
                )}
                {paperResult.offset_right_cm != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Offset (Right)</Text>
                    <Text style={styles.detailValue}>{paperResult.offset_right_cm} cm</Text>
                  </View>
                )}
                {paperResult.offset_up_cm != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Offset (Up)</Text>
                    <Text style={styles.detailValue}>{paperResult.offset_up_cm} cm</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Tactical-specific details */}
          {!isPaper && tacticalResult && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>TACTICAL DATA</Text>
              <View style={styles.detailGrid}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Stage Cleared</Text>
                  <View style={[
                    styles.statusBadge, 
                    { backgroundColor: tacticalResult.is_stage_cleared ? '#10B98120' : '#EF444420' }
                  ]}>
                    <Ionicons 
                      name={tacticalResult.is_stage_cleared ? 'checkmark-circle' : 'close-circle'} 
                      size={16} 
                      color={tacticalResult.is_stage_cleared ? '#10B981' : '#EF4444'} 
                    />
                    <Text style={[
                      styles.statusText,
                      { color: tacticalResult.is_stage_cleared ? '#10B981' : '#EF4444' }
                    ]}>
                      {tacticalResult.is_stage_cleared ? 'Yes' : 'No'}
                    </Text>
                  </View>
                </View>
                {tacticalResult.time_seconds != null && (
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Engagement Time</Text>
                    <Text style={styles.detailValue}>{tacticalResult.time_seconds}s</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Notes Section */}
          {(target.notes || paperResult?.notes || tacticalResult?.notes) && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>NOTES</Text>
              <View style={styles.notesBox}>
                <Text style={styles.notesText}>
                  {target.notes || paperResult?.notes || tacticalResult?.notes}
                </Text>
              </View>
            </View>
          )}

          {/* Target Data (if any custom data) - filter out internal objects */}
          {target.target_data && Object.keys(target.target_data).filter(k => 
            k !== 'detection_result' && typeof target.target_data![k] !== 'object'
          ).length > 0 && (
            <View style={styles.detailSection}>
              <Text style={styles.sectionLabel}>ADDITIONAL DATA</Text>
              <View style={styles.detailGrid}>
                {Object.entries(target.target_data)
                  .filter(([key, value]) => key !== 'detection_result' && typeof value !== 'object')
                  .map(([key, value]) => (
                    <View key={key} style={styles.detailRow}>
                      <Text style={styles.detailLabel}>{key.replace(/_/g, ' ')}</Text>
                      <Text style={styles.detailValue}>{String(value)}</Text>
                    </View>
                  ))}
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
});

// ============================================================================
// EMPTY STATE
// ============================================================================
const EmptyTargets = React.memo(function EmptyTargets() {
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIcon}>
        <Ionicons name="disc-outline" size={48} color="rgba(255,255,255,0.2)" />
      </View>
      <Text style={styles.emptyTitle}>No targets logged</Text>
      <Text style={styles.emptyText}>Start adding targets to track your session</Text>
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
  
  // Target detail modal
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [detailModalVisible, setDetailModalVisible] = useState(false);

  // Get selected target from current targets array (always synced)
  const selectedTarget = useMemo(() => {
    if (!selectedTargetId) return null;
    return targets.find(t => t.id === selectedTargetId) || null;
  }, [targets, selectedTargetId]);

  // Load session data
  const loadData = useCallback(async () => {
    if (!sessionId) return;
    try {
      console.log('[Session] Loading data for session:', sessionId);
      const [sessionData, targetsData, statsData] = await Promise.all([
        getSessionById(sessionId),
        getSessionTargetsWithResults(sessionId),
        calculateSessionStats(sessionId),
      ]);
      console.log('[Session] Loaded:', {
        session: sessionData?.id,
        targetsCount: targetsData.length,
        stats: statsData,
      });
      
      // Log individual target results for debugging
      targetsData.forEach((t, i) => {
        console.log(`[Session] Target ${i}:`, {
          id: t.id,
          type: t.target_type,
          paper_result: t.paper_result ? {
            bullets_fired: t.paper_result.bullets_fired,
            hits_total: t.paper_result.hits_total,
          } : 'null',
          tactical_result: t.tactical_result ? {
            bullets_fired: t.tactical_result.bullets_fired,
            hits: t.tactical_result.hits,
          } : 'null',
        });
      });
      
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

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    loadData();
  }, [loadData]);

  // Stats
  const totalShots = stats?.totalShotsFired ?? 0;
  const totalHits = stats?.totalHits ?? 0;
  const accuracy = stats?.accuracyPct ?? 0;

  const avgDistance = useMemo(() => {
    if (targets.length === 0) return 0;
    return Math.round(targets.reduce((sum, t) => sum + (t.distance_m || 0), 0) / targets.length);
  }, [targets]);

  // Actions
  const handleAddTarget = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push({
      pathname: "/(protected)/addTarget",
      params: {
        sessionId,
        defaultDistance: avgDistance > 0 ? avgDistance.toString() : '25',
      },
    });
  }, [sessionId, avgDistance]);

  const handleTargetPress = useCallback((target: SessionTargetWithResults, index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedTargetId(target.id);
    setSelectedIndex(index);
    setDetailModalVisible(true);
  }, []);

  const handleCloseDetail = useCallback(() => {
    setDetailModalVisible(false);
    setSelectedTargetId(null);
  }, []);

  const handleEndSession = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert(
      "End Session?",
      `${targets.length} target${targets.length !== 1 ? "s" : ""} logged`,
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
              router.replace("/(protected)/org");
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
      "Your session stays active. You can return later.",
      [
        { text: "Stay", style: "cancel" },
        { text: "Leave", onPress: () => router.back() },
      ]
    );
  }, []);

  // Render target
  const renderTarget = useCallback(({ item, index }: { item: SessionTargetWithResults; index: number }) => (
    <TargetCard 
      target={item} 
      index={targets.length - index}
      onPress={() => handleTargetPress(item, targets.length - index)}
    />
  ), [targets.length, handleTargetPress]);

  // Loading
  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10B981" />
      </View>
    );
  }

  // Not found / completed
  if (!session || session.status !== "active") {
    return (
      <View style={styles.errorContainer}>
        <Ionicons
          name={session?.status === "completed" ? "checkmark-circle" : "alert-circle"}
          size={56}
          color={session?.status === "completed" ? "#10B981" : "#EF4444"}
        />
        <Text style={styles.errorTitle}>
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
        <TouchableOpacity style={styles.headerBtn} onPress={handleClose}>
          <Ionicons name="chevron-down" size={26} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Session</Text>
          {session.training_title && (
            <Text style={styles.headerSubtitle} numberOfLines={1}>{session.training_title}</Text>
          )}
        </View>
        <SessionTimer startedAt={session.started_at} />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard value={targets.length} label="Targets" />
        <StatCard value={totalShots} label="Shots" />
        <StatCard value={totalHits} label="Hits" accent />
        <StatCard value={`${accuracy}%`} label="Accuracy" />
      </View>

      {/* Targets List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>TARGETS</Text>
          <Text style={styles.listCount}>{targets.length}</Text>
        </View>

        <FlatList
          data={targets}
          renderItem={renderTarget}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + 100 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={EmptyTargets}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#10B981" />
          }
        />
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddTarget}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={26} color="#000" />
          <Text style={styles.addButtonText}>Add Target</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.endButton}
          onPress={handleEndSession}
          disabled={ending}
          activeOpacity={0.7}
        >
          {ending ? (
            <ActivityIndicator color="#EF4444" size="small" />
          ) : (
            <Ionicons name="stop-circle-outline" size={24} color="#EF4444" />
          )}
        </TouchableOpacity>
      </View>

      {/* Target Detail Modal */}
      <TargetDetailModal
        target={selectedTarget}
        index={selectedIndex}
        visible={detailModalVisible}
        onClose={handleCloseDetail}
      />
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
  },
  errorContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#fff",
  },
  errorButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  errorButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  headerSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
    marginTop: 2,
  },
  timerBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  timerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  timerText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#10B981",
    fontVariant: ["tabular-nums"],
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#fff",
  },
  statValueAccent: {
    color: "#10B981",
  },
  statLabel: {
    fontSize: 11,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // List
  listContainer: {
    flex: 1,
  },
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
  },
  listCount: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
  listContent: {
    paddingHorizontal: 16,
  },

  // Target Card
  targetCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    gap: 14,
  },
  targetIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  targetIconPaper: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  targetIconTactical: {
    backgroundColor: "rgba(245, 158, 11, 0.15)",
  },
  imageIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  targetInfo: {
    flex: 1,
  },
  targetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  targetType: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  targetIndex: {
    fontSize: 13,
    color: "rgba(255,255,255,0.3)",
  },
  targetMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  targetMetaText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.4)",
  },
  metaDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  accuracyBadge: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  accuracyText: {
    fontSize: 15,
    fontWeight: "700",
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.4)",
  },

  // Bottom Bar
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 12,
    backgroundColor: "#0A0A0A",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  addButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    borderRadius: 16,
    backgroundColor: "#10B981",
    gap: 8,
  },
  addButtonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "#000",
  },
  endButton: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(239, 68, 68, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Modal
  modalContainer: {
    flex: 1,
    backgroundColor: "#0A0A0A",
  },
  modalHeader: {
    paddingHorizontal: 20,
    // paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    // borderBottomColor: "rgba(255,255,255,0.1)",
  },
  modalGrabber: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignSelf: "center",

    marginBottom: 16,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  modalTitleSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  modalIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#fff",
  },
  modalSubtitle: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalScroll: {
    flex: 1,
  },
  modalContent: {
    padding: 20,
  },

  // Image Section
  imageSection: {
    marginBottom: 24,
  },
  imageContainer: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    overflow: "hidden",
    aspectRatio: 1,
  },
  targetImage: {
    width: "100%",
    height: "100%",
  },

  // Detail Section
  detailSection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 12,
  },
  detailStatsRow: {
    flexDirection: "row",
    gap: 10,
  },
  detailStatCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 14,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  detailStatValue: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
  },
  detailStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
  },
  detailGrid: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    overflow: "hidden",
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.06)",
  },
  detailLabel: {
    fontSize: 15,
    color: "rgba(255,255,255,0.6)",
  },
  detailValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: "600",
  },
  notesBox: {
    backgroundColor: "rgba(255,255,255,0.04)",
    borderRadius: 14,
    padding: 16,
  },
  notesText: {
    fontSize: 15,
    color: "rgba(255,255,255,0.7)",
    lineHeight: 22,
  },
});
