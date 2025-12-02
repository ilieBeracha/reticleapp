import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { router, Stack } from "expo-router";
import React, { useCallback, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Dimensions,
    FlatList,
    Modal,
    Platform,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════
interface ScanItem {
  id: string;
  session_id: string;
  scanned_image_url: string | null;
  distance_meters: number | null;
  lane_number: number | null;
  shots_fired: number | null;
  hits: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const NUM_COLUMNS = 3;
const GRID_GAP = 2;
const ITEM_SIZE = (SCREEN_WIDTH - GRID_GAP * (NUM_COLUMNS + 1)) / NUM_COLUMNS;

// ═══════════════════════════════════════════════════════════════════════════
// STAT BOX COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const StatBox = React.memo(function StatBox({
  value,
  label,
  colors,
}: {
  value: number | string;
  label: string;
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.statBox}>
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// GRID ITEM COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const GridItem = React.memo(function GridItem({
  item,
  onPress,
  colors,
}: {
  item: ScanItem;
  onPress: () => void;
  colors: typeof Colors.light;
}) {
  const hasImage = !!item.scanned_image_url;

  return (
    <TouchableOpacity
      style={[styles.gridItem, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      {hasImage ? (
        <Image
          source={{ uri: item.scanned_image_url! }}
          style={styles.gridImage}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.gridPlaceholder, { backgroundColor: colors.border }]}>
          <Ionicons name="disc-outline" size={32} color={colors.textMuted} />
        </View>
      )}

      {/* Distance Badge */}
      {item.distance_meters && (
        <View style={[styles.distanceBadge, { backgroundColor: "#6366F1" }]}>
          <Text style={styles.distanceBadgeText}>{item.distance_meters}m</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// PREVIEW MODAL COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const PreviewModal = React.memo(function PreviewModal({
  item,
  visible,
  onClose,
  onGoToSession,
  colors,
}: {
  item: ScanItem | null;
  visible: boolean;
  onClose: () => void;
  onGoToSession: () => void;
  colors: typeof Colors.light;
}) {
  if (!item) return null;

  const hasImage = !!item.scanned_image_url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.modalBackdrop} onPress={onClose} activeOpacity={1} />
        
        <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
          {/* Close Button */}
          <TouchableOpacity style={styles.modalClose} onPress={onClose}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>

          {/* Image */}
          <View style={styles.modalImageContainer}>
            {hasImage ? (
              <Image
                source={{ uri: item.scanned_image_url! }}
                style={styles.modalImage}
                contentFit="contain"
                transition={300}
              />
            ) : (
              <View style={[styles.modalImagePlaceholder, { backgroundColor: colors.border }]}>
                <Ionicons name="disc-outline" size={80} color={colors.textMuted} />
                <Text style={[styles.modalNoImageText, { color: colors.textMuted }]}>
                  No image available
                </Text>
              </View>
            )}
          </View>

          {/* Info Row */}
          <View style={[styles.modalInfo, { borderTopColor: colors.border }]}>
            {item.distance_meters && (
              <View style={styles.modalInfoItem}>
                <Ionicons name="resize-outline" size={18} color={colors.primary} />
                <Text style={[styles.modalInfoText, { color: colors.text }]}>
                  {item.distance_meters}m
                </Text>
              </View>
            )}
            {item.lane_number && (
              <View style={styles.modalInfoItem}>
                <Ionicons name="flag-outline" size={18} color={colors.primary} />
                <Text style={[styles.modalInfoText, { color: colors.text }]}>
                  Lane {item.lane_number}
                </Text>
              </View>
            )}
          </View>

          {/* Action Button */}
          <TouchableOpacity
            style={[styles.modalButton, { backgroundColor: colors.primary }]}
            onPress={onGoToSession}
            activeOpacity={0.8}
          >
            <Ionicons name="open-outline" size={20} color="#fff" />
            <Text style={styles.modalButtonText}>View Session</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// EMPTY STATE COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
const EmptyState = React.memo(function EmptyState({
  colors,
}: {
  colors: typeof Colors.light;
}) {
  return (
    <View style={styles.emptyContainer}>
      <View style={[styles.emptyIcon, { backgroundColor: colors.card }]}>
        <Ionicons name="scan-outline" size={48} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.text }]}>No Scans Yet</Text>
      <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
        Start a session and scan your first paper target!
      </Text>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
export default function ScansPage() {
  const { theme } = useTheme();
  const colors = Colors[theme];

  // ═══ STATE ═══
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedScan, setSelectedScan] = useState<ScanItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // ═══ DATA LOADING ═══
  const loadScans = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      // First get user's sessions
      const { data: sessions, error: sessionsError } = await supabase
        .from("sessions")
        .select("id")
        .eq("user_id", user.id);

      if (sessionsError) {
        setLoading(false);
        return;
      }

      if (!sessions || sessions.length === 0) {
        setScans([]);
        setLoading(false);
        return;
      }

      const sessionIds = sessions.map((s) => s.id);

      // Get paper targets from those sessions
      const { data: targets, error: targetsError } = await supabase
        .from("session_targets")
        .select(`
          id,
          session_id,
          target_type,
          distance_m,
          lane_number,
          notes,
          paper_target_results(bullets_fired, hits_inside_scoring, scanned_image_url)
        `)
        .in("session_id", sessionIds)
        .eq("target_type", "paper")
        .limit(100);

      if (targetsError) {
        setLoading(false);
        return;
      }

      if (targets && targets.length > 0) {
        const mapped = targets.map((t: any) => {
          const paperResult = Array.isArray(t.paper_target_results)
            ? t.paper_target_results[0]
            : t.paper_target_results;

          return {
            id: t.id,
            session_id: t.session_id,
            scanned_image_url: paperResult?.scanned_image_url ?? null,
            distance_meters: t.distance_m,
            lane_number: t.lane_number,
            shots_fired: paperResult?.bullets_fired ?? null,
            hits: paperResult?.hits_inside_scoring ?? null,
          };
        });
        setScans(mapped);
      } else {
        setScans([]);
      }
    } catch (err) {
      console.error("[ScansPage] Error:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadScans();
    }, [loadScans])
  );

  // ═══ HANDLERS ═══
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await loadScans();
    setRefreshing(false);
  }, [loadScans]);

  const onScanPress = useCallback((item: ScanItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSelectedScan(item);
    setModalVisible(true);
  }, []);

  const onCloseModal = useCallback(() => {
    setModalVisible(false);
    setSelectedScan(null);
  }, []);

  const onGoToSession = useCallback(() => {
    if (selectedScan) {
      onCloseModal();
      router.push({
        pathname: "/(protected)/activeSession",
        params: { sessionId: selectedScan.session_id },
      });
    }
  }, [selectedScan, onCloseModal]);

  // ═══ STATS ═══
  const stats = useMemo(() => {
    const totalScans = scans.length;
    const withImages = scans.filter(s => s.scanned_image_url).length;
    return { totalScans, withImages };
  }, [scans]);

  // ═══ RENDER ═══
  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      {/* ═══ HEADER ═══ */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Paper Targets</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* ═══ STATS ROW ═══ */}
      <View style={[styles.statsRow, { borderBottomColor: colors.border }]}>
        <StatBox value={stats.totalScans} label="Total" colors={colors} />
        <StatBox value={stats.withImages} label="With Image" colors={colors} />
      </View>

      {/* ═══ GRID ═══ */}
      <FlatList
        data={scans}
        keyExtractor={(item) => item.id}
        numColumns={NUM_COLUMNS}
        contentContainerStyle={styles.gridContainer}
        columnWrapperStyle={styles.gridRow}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text}
          />
        }
        renderItem={({ item }) => (
          <GridItem
            item={item}
            onPress={() => onScanPress(item)}
            colors={colors}
          />
        )}
        ListEmptyComponent={<EmptyState colors={colors} />}
      />

      {/* ═══ PREVIEW MODAL ═══ */}
      <PreviewModal
        item={selectedScan}
        visible={modalVisible}
        onClose={onCloseModal}
        onGoToSession={onGoToSession}
        colors={colors}
      />
    </View>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 60 : 16,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  headerSpacer: {
    width: 40,
  },

  // Stats Row
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },

  // Grid
  gridContainer: {
    padding: GRID_GAP,
  },
  gridRow: {
    gap: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    marginBottom: GRID_GAP,
    position: "relative",
  },
  gridImage: {
    width: "100%",
    height: "100%",
  },
  gridPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },

  // Distance Badge
  distanceBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  distanceBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "700",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.85)",
  },
  modalContent: {
    width: SCREEN_WIDTH - 40,
    maxHeight: SCREEN_HEIGHT * 0.8,
    borderRadius: 20,
    overflow: "hidden",
  },
  modalClose: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  modalImageContainer: {
    width: "100%",
    aspectRatio: 1,
  },
  modalImage: {
    width: "100%",
    height: "100%",
  },
  modalImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  modalNoImageText: {
    fontSize: 14,
  },
  modalInfo: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingVertical: 16,
    borderTopWidth: 1,
  },
  modalInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalInfoText: {
    fontSize: 15,
    fontWeight: "600",
  },
  modalButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  modalButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
