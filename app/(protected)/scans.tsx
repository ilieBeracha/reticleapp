import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { supabase } from "@/lib/supabase";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { Stack, router } from "expo-router";
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
  group_size_cm: number | null; // Max distance between any 2 bullets
}

type DistanceFilter = "all" | "cqb" | "short" | "medium" | "long" | "sniper";

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
// FILTER BOTTOM SHEET
// ═══════════════════════════════════════════════════════════════════════════
const DISTANCE_FILTERS: { key: DistanceFilter; label: string; range: string }[] = [
  { key: "all", label: "All Distances", range: "" },
  { key: "cqb", label: "CQB", range: "≤7m" },
  { key: "short", label: "Short Range", range: "8-15m" },
  { key: "medium", label: "Mid Range", range: "16-50m" },
  { key: "long", label: "Long Range", range: "51-100m" },
  { key: "sniper", label: "Sniper", range: ">100m" },
];

const FilterBottomSheet = React.memo(function FilterBottomSheet({
  visible,
  onClose,
  currentFilter,
  onFilterChange,
  filterCounts,
  colors,
}: {
  visible: boolean;
  onClose: () => void;
  currentFilter: DistanceFilter;
  onFilterChange: (filter: DistanceFilter) => void;
  filterCounts: Record<DistanceFilter, number>;
  colors: typeof Colors.light;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.sheetOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.sheetContent, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[styles.sheetHandle, { backgroundColor: colors.border }]} />
          
          {/* Title */}
          <Text style={[styles.sheetTitle, { color: colors.text }]}>Filters</Text>
          
          {/* Distance Section */}
          <Text style={[styles.sheetSectionTitle, { color: colors.textMuted }]}>DISTANCE</Text>
          <View style={styles.sheetOptions}>
            {DISTANCE_FILTERS.map((f) => {
              const isActive = currentFilter === f.key;
              const count = filterCounts[f.key];
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[
                    styles.sheetOption,
                    { borderColor: isActive ? colors.primary : colors.border },
                    isActive && { backgroundColor: colors.primary + '15' },
                  ]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    onFilterChange(f.key);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.sheetOptionLeft}>
                    <View style={[styles.sheetRadio, { borderColor: isActive ? colors.primary : colors.border }]}>
                      {isActive && <View style={[styles.sheetRadioInner, { backgroundColor: colors.primary }]} />}
                    </View>
                    <View>
                      <Text style={[styles.sheetOptionLabel, { color: colors.text }]}>{f.label}</Text>
                      {f.range && <Text style={[styles.sheetOptionRange, { color: colors.textMuted }]}>{f.range}</Text>}
                    </View>
                  </View>
                  {count > 0 && (
                    <Text style={[styles.sheetOptionCount, { color: colors.textMuted }]}>{count}</Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Coming Soon Section */}
          <View style={[styles.sheetComingSoon, { borderColor: colors.border }]}>
            <Ionicons name="sparkles" size={18} color={colors.textMuted} />
            <View style={styles.sheetComingSoonText}>
              <Text style={[styles.sheetComingSoonTitle, { color: colors.textMuted }]}>More filters coming soon</Text>
              <Text style={[styles.sheetComingSoonSub, { color: colors.textMuted }]}>Date range, weapon type, target type...</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
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

      {/* Group Size Badge (bottom-right) */}
      {item.group_size_cm && (
        <View style={[styles.groupBadge, { backgroundColor: "#EF4444" }]}>
          <Text style={styles.groupBadgeText}>{item.group_size_cm.toFixed(1)}cm</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// FULL PAGE SCAN DETAIL SHEET
// ═══════════════════════════════════════════════════════════════════════════
const ScanDetailSheet = React.memo(function ScanDetailSheet({
  item,
  visible,
  onClose,
  colors,
}: {
  item: ScanItem | null;
  visible: boolean;
  onClose: () => void;
  colors: typeof Colors.light;
}) {
  if (!item) return null;

  const hasImage = !!item.scanned_image_url;

  // Determine group size quality
  const getGroupQuality = (cm: number | null) => {
    if (!cm) return null;
    if (cm <= 5) return { label: "Excellent", color: "#22C55E" };
    if (cm <= 10) return { label: "Good", color: "#22C55E" };
    if (cm <= 20) return { label: "Fair", color: "#F59E0B" };
    return { label: "Wide", color: "#EF4444" };
  };

  const groupQuality = getGroupQuality(item.group_size_cm);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.sheetContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.detailHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.detailCloseBtn}>
            <Ionicons name="close" size={28} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.detailTitle, { color: colors.text }]}>Scan Details</Text>
          <View style={styles.detailCloseBtn} />
        </View>

        {/* Image */}
        <View style={[styles.detailImageContainer, { backgroundColor: colors.card }]}>
          {hasImage ? (
            <Image
              source={{ uri: item.scanned_image_url! }}
              style={styles.detailImage}
              contentFit="contain"
              transition={300}
            />
          ) : (
            <View style={[styles.detailImagePlaceholder, { backgroundColor: colors.border }]}>
              <Ionicons name="disc-outline" size={80} color={colors.textMuted} />
              <Text style={[styles.detailNoImageText, { color: colors.textMuted }]}>
                No image available
              </Text>
            </View>
          )}
        </View>

        {/* Stats Cards */}
        <View style={styles.detailStats}>
          {/* Group Size - Hero Card */}
          {item.group_size_cm && (
            <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: "#EF4444" + "40" }]}>
              <View style={styles.heroCardHeader}>
                <View style={[styles.heroIconContainer, { backgroundColor: "#EF4444" + "20" }]}>
                  <Ionicons name="analytics" size={24} color="#EF4444" />
                </View>
                <View>
                  <Text style={[styles.heroCardLabel, { color: colors.textMuted }]}>Group Size</Text>
                  <Text style={[styles.heroCardHint, { color: colors.textMuted }]}>Furthest bullet spread</Text>
                </View>
              </View>
              <View style={styles.heroCardValue}>
                <Text style={[styles.heroNumber, { color: "#EF4444" }]}>
                  {item.group_size_cm.toFixed(1)}
                </Text>
                <Text style={[styles.heroUnit, { color: "#EF4444" }]}>cm</Text>
              </View>
              {groupQuality && (
                <View style={[styles.qualityBadge, { backgroundColor: groupQuality.color + "20" }]}>
                  <View style={[styles.qualityDot, { backgroundColor: groupQuality.color }]} />
                  <Text style={[styles.qualityLabel, { color: groupQuality.color }]}>
                    {groupQuality.label}
                  </Text>
                </View>
              )}
            </View>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {/* Distance */}
            {item.distance_meters && (
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconContainer, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="resize-outline" size={20} color={colors.primary} />
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {item.distance_meters}m
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Distance</Text>
              </View>
            )}

            {/* Shots Fired */}
            {item.shots_fired && (
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconContainer, { backgroundColor: "#6366F1" + "20" }]}>
                  <Ionicons name="flame-outline" size={20} color="#6366F1" />
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {item.shots_fired}
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Shots</Text>
              </View>
            )}

            {/* Hits */}
            {item.hits != null && (
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconContainer, { backgroundColor: "#22C55E" + "20" }]}>
                  <Ionicons name="checkmark-circle-outline" size={20} color="#22C55E" />
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {item.hits}
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Hits</Text>
              </View>
            )}

            {/* Lane */}
            {item.lane_number && (
              <View style={[styles.statCard, { backgroundColor: colors.card }]}>
                <View style={[styles.statIconContainer, { backgroundColor: "#F59E0B" + "20" }]}>
                  <Ionicons name="flag-outline" size={20} color="#F59E0B" />
                </View>
                <Text style={[styles.statCardValue, { color: colors.text }]}>
                  {item.lane_number}
                </Text>
                <Text style={[styles.statCardLabel, { color: colors.textMuted }]}>Lane</Text>
              </View>
            )}
          </View>
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
  const [filterSheetVisible, setFilterSheetVisible] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>("all");

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
          paper_target_results(bullets_fired, hits_inside_scoring, scanned_image_url, dispersion_cm)
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
            group_size_cm: paperResult?.dispersion_cm ?? null,
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

  // ═══ FILTER & STATS ═══
  // CQB: ≤7m, Short: 8-15m, Medium: 16-50m, Long: 51-100m, Sniper: >100m
  const filterCounts = useMemo(() => {
    const cqb = scans.filter(s => s.distance_meters && s.distance_meters <= 7).length;
    const short = scans.filter(s => s.distance_meters && s.distance_meters > 7 && s.distance_meters <= 15).length;
    const medium = scans.filter(s => s.distance_meters && s.distance_meters > 15 && s.distance_meters <= 50).length;
    const long = scans.filter(s => s.distance_meters && s.distance_meters > 50 && s.distance_meters <= 100).length;
    const sniper = scans.filter(s => s.distance_meters && s.distance_meters > 100).length;
    return { all: scans.length, cqb, short, medium, long, sniper };
  }, [scans]);

  const filteredScans = useMemo(() => {
    if (distanceFilter === "all") return scans;
    if (distanceFilter === "cqb") return scans.filter(s => s.distance_meters && s.distance_meters <= 7);
    if (distanceFilter === "short") return scans.filter(s => s.distance_meters && s.distance_meters > 7 && s.distance_meters <= 15);
    if (distanceFilter === "medium") return scans.filter(s => s.distance_meters && s.distance_meters > 15 && s.distance_meters <= 50);
    if (distanceFilter === "long") return scans.filter(s => s.distance_meters && s.distance_meters > 50 && s.distance_meters <= 100);
    if (distanceFilter === "sniper") return scans.filter(s => s.distance_meters && s.distance_meters > 100);
    return scans;
  }, [scans, distanceFilter]);

  const stats = useMemo(() => {
    const totalScans = scans.length;
    const distances = scans.filter(s => s.distance_meters).map(s => s.distance_meters!);
    const avgDistance = distances.length > 0 
      ? Math.round(distances.reduce((a, b) => a + b, 0) / distances.length) 
      : 0;
    
    // Calculate average group size (smaller = better)
    const groupSizes = scans.filter(s => s.group_size_cm).map(s => s.group_size_cm!);
    const avgGroupSize = groupSizes.length > 0 
      ? (groupSizes.reduce((a, b) => a + b, 0) / groupSizes.length).toFixed(1)
      : null;
    const bestGroupSize = groupSizes.length > 0 ? Math.min(...groupSizes).toFixed(1) : null;
    
    const uniqueSessions = new Set(scans.map(s => s.session_id)).size;
    return { totalScans, avgDistance, avgGroupSize, bestGroupSize, uniqueSessions };
  }, [scans]);

  const onFilterChange = useCallback((filter: DistanceFilter) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDistanceFilter(filter);
  }, []);

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
        <StatBox value={stats.totalScans} label="Scans" colors={colors} />
        <StatBox value={`${stats.avgDistance}m`} label="Avg Dist" colors={colors} />
        <StatBox value={stats.avgGroupSize ? `${stats.avgGroupSize}cm` : "—"} label="Avg Group" colors={colors} />
        <StatBox value={stats.bestGroupSize ? `${stats.bestGroupSize}cm` : "—"} label="Best" colors={colors} />
      </View>

      {/* ═══ FILTER BAR ═══ */}
      <View style={[styles.filterBar, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.card, borderColor: colors.border }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setFilterSheetVisible(true);
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="filter" size={16} color={colors.text} />
          <Text style={[styles.filterButtonText, { color: colors.text }]}>
            {distanceFilter === "all" ? "All" : DISTANCE_FILTERS.find(f => f.key === distanceFilter)?.label}
          </Text>
          {distanceFilter !== "all" && (
            <View style={[styles.filterActiveDot, { backgroundColor: colors.primary }]} />
          )}
          <Ionicons name="chevron-down" size={14} color={colors.textMuted} />
        </TouchableOpacity>
        
        <Text style={[styles.filterResultCount, { color: colors.textMuted }]}>
          {filteredScans.length} {filteredScans.length === 1 ? 'scan' : 'scans'}
        </Text>
      </View>

      {/* ═══ FILTER BOTTOM SHEET ═══ */}
      <FilterBottomSheet
        visible={filterSheetVisible}
        onClose={() => setFilterSheetVisible(false)}
        currentFilter={distanceFilter}
        onFilterChange={onFilterChange}
        filterCounts={filterCounts}
        colors={colors}
      />

      {/* ═══ GRID ═══ */}
      <FlatList
        data={filteredScans}
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

      {/* ═══ SCAN DETAIL SHEET ═══ */}
      <ScanDetailSheet
        item={selectedScan}
        visible={modalVisible}
        onClose={onCloseModal}
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  statBox: {
    alignItems: "center",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 11,
    marginTop: 2,
  },

  // Filter Bar
  filterBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  filterActiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  filterResultCount: {
    fontSize: 13,
  },

  // Filter Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  sheetContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  sheetSectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 10,
  },
  sheetOptions: {
    gap: 8,
  },
  sheetOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  sheetOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  sheetRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  sheetRadioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  sheetOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  sheetOptionRange: {
    fontSize: 12,
    marginTop: 2,
  },
  sheetOptionCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  sheetComingSoon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  sheetComingSoonText: {
    flex: 1,
  },
  sheetComingSoonTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  sheetComingSoonSub: {
    fontSize: 11,
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

  // Group Size Badge
  groupBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  groupBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },

  // Full Page Scan Detail Sheet
  sheetContainer: {
    flex: 1,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Platform.OS === "ios" ? 16 : 12,
    paddingBottom: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  detailCloseBtn: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  detailTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  detailImageContainer: {
    width: "100%",
    aspectRatio: 1,
  },
  detailImage: {
    width: "100%",
    height: "100%",
  },
  detailImagePlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  detailNoImageText: {
    fontSize: 14,
  },
  detailStats: {
    flex: 1,
    padding: 16,
    gap: 16,
  },

  // Hero Card (Group Size)
  heroCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  heroCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  heroIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heroCardLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  heroCardHint: {
    fontSize: 11,
    marginTop: 2,
  },
  heroCardValue: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingVertical: 8,
  },
  heroNumber: {
    fontSize: 56,
    fontWeight: "800",
  },
  heroUnit: {
    fontSize: 24,
    fontWeight: "600",
    marginLeft: 4,
    opacity: 0.7,
  },
  qualityBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 4,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  qualityLabel: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Stats Grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    flex: 1,
    minWidth: (SCREEN_WIDTH - 44) / 2 - 6,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    gap: 8,
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  statCardValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statCardLabel: {
    fontSize: 12,
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
