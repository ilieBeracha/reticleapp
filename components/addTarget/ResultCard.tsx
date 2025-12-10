import { useColors } from "@/hooks/ui/useColors";
import type { AnalyzeDocumentResponse, AnalyzeResponse } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import ViewShot from "react-native-view-shot";
import { DetectionEditor } from "./DetectionEditor";
import { DetectionPreview } from "./DetectionPreview";
import { DistanceInput } from "./DistanceInput";
import { COLORS, EditableDetection, EditMode } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// RESULT CARD
// Displays AI detection results with editing capabilities
// ═══════════════════════════════════════════════════════════════════════════

/** Union type for detection results - supports both legacy and document analysis */
type DetectionResult = AnalyzeResponse | AnalyzeDocumentResponse;

interface ResultCardProps {
  result: DetectionResult;
  onDone: (finalDetections: EditableDetection[], editedImageBase64?: string) => void;
  onRetake: () => void;
  saving: boolean;
  editedDetections: EditableDetection[];
  onDetectionsChange: (detections: EditableDetection[]) => void;
  distance: number;
  onDistanceChange: (distance: number) => void;
}

export const ResultCard = React.memo(function ResultCard({
  result,
  onDone,
  onRetake,
  saving,
  editedDetections,
  onDetectionsChange,
  distance,
  onDistanceChange,
}: ResultCardProps) {
  const colors = useColors();
  const [editMode, setEditMode] = useState<EditMode>("add");
  const [editingEnabled, setEditingEnabled] = useState(false);
  const [editorModalVisible, setEditorModalVisible] = useState(false);
  
  // Ref for capturing the edited image
  const editorCaptureRef = useRef<ViewShot>(null);
  
  // Store captured image when modal closes
  const [capturedEditedImage, setCapturedEditedImage] = useState<string | null>(null);
  
  // Animation for modal
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  
  // Handle editor toggle with animation
  const handleToggleEditor = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!editingEnabled) {
      setEditingEnabled(true);
      setEditorModalVisible(true);
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setEditorModalVisible(false);
        setEditingEnabled(false);
      });
    }
  }, [editingEnabled, scaleAnim, opacityAnim]);

  const handleCloseEditor = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    
    // Capture the edited image BEFORE closing the modal
    if (editorCaptureRef.current) {
      try {
        const capturedBase64 = await (editorCaptureRef.current as any).capture();
        if (capturedBase64) {
          setCapturedEditedImage(capturedBase64);
          console.log("[ResultCard] Captured edited image on modal close, length:", capturedBase64.length);
        }
      } catch (err) {
        console.log("[ResultCard] Could not capture edited image on close:", err);
      }
    }
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        friction: 8,
        tension: 65,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setEditorModalVisible(false);
      setEditingEnabled(false);
    });
  }, [scaleAnim, opacityAnim]);
  
  // Calculate stats from edited detections
  const stats = useMemo(() => {
    const total = editedDetections.length;
    const high = editedDetections.filter((d) => d.isManual || d.confidence >= 0.6).length;
    const medium = editedDetections.filter((d) => !d.isManual && d.confidence >= 0.4 && d.confidence < 0.6).length;
    const low = editedDetections.filter((d) => !d.isManual && d.confidence < 0.4).length;
    const manual = editedDetections.filter((d) => d.isManual).length;
    
    return { total, high, medium, low, manual };
  }, [editedDetections]);

  // Dynamically calculate group size from CURRENT detections (updates on edit)
  const groupSizeData = useMemo(() => {
    if (editedDetections.length < 2) return null;
    
    let maxDistance = 0;
    let minDistance = Infinity;
    
    // Find the furthest and tightest pairs
    for (let i = 0; i < editedDetections.length; i++) {
      for (let j = i + 1; j < editedDetections.length; j++) {
        const dx = editedDetections[i].center[0] - editedDetections[j].center[0];
        const dy = editedDetections[i].center[1] - editedDetections[j].center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxDistance) maxDistance = distance;
        if (distance < minDistance) minDistance = distance;
      }
    }
    
    // Convert pixel distances to cm using scale_info if available
    let maxDistanceCm: number | null = null;
    let minDistanceCm: number | null = null;
    
    if (result.scale_info?.cm_per_pixel) {
      maxDistanceCm = maxDistance * result.scale_info.cm_per_pixel;
      minDistanceCm = minDistance * result.scale_info.cm_per_pixel;
    }
    
    return {
      maxDistancePx: maxDistance,
      maxDistanceCm,
      minDistancePx: minDistance,
      minDistanceCm,
    };
  }, [editedDetections, result.scale_info]);

  const hasChanges = useMemo(() => {
    return (
      editedDetections.length !== result.detections.length ||
      editedDetections.some((d) => d.isManual)
    );
  }, [editedDetections, result.detections]);

  // Handle save with the captured edited image
  const handleSave = useCallback(async () => {
    const editedImageBase64 = hasChanges ? capturedEditedImage || undefined : undefined;
    
    if (hasChanges && editedImageBase64) {
      console.log("[ResultCard] Saving with edited image, length:", editedImageBase64.length);
    } else if (hasChanges) {
      console.log("[ResultCard] Saving with changes but no captured image");
    }
    
    onDone(editedDetections, editedImageBase64);
  }, [editedDetections, hasChanges, capturedEditedImage, onDone]);

  return (
    <ScrollView style={[styles.scrollView, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Review Detections</Text>
        <Text style={[styles.subtitle, { color: colors.textMuted }]}>AI detected bullet holes</Text>
      </View>

      {/* View-Only Preview */}
      <DetectionPreview result={result} detections={editedDetections} />

      {/* Edit Toggle Button */}
      <TouchableOpacity
        style={[styles.editToggle, { backgroundColor: colors.card }]}
        onPress={handleToggleEditor}
        activeOpacity={0.7}
      >
        <View style={[styles.editToggleIcon, { backgroundColor: colors.secondary }, editingEnabled && styles.editToggleIconActive]}>
          <Ionicons name="pencil" size={16} color={editingEnabled ? "#000" : colors.textMuted} />
        </View>
        <Text style={[styles.editToggleText, { color: colors.text }]}>
          {editingEnabled ? "Editing..." : "Edit Detections"}
        </Text>
        <Ionicons name="expand-outline" size={18} color={colors.textMuted} />
      </TouchableOpacity>

      {/* Group Size Card - Dynamically calculated from CURRENT detections */}
      {groupSizeData?.maxDistanceCm != null && stats.total >= 2 && (
        <View style={[styles.groupSizeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.groupSizeHeader}>
            <View style={[styles.groupSizeIconContainer, { backgroundColor: colors.primary }]}>
              <Ionicons name="analytics" size={20} color="#fff" />
            </View>
            <View style={styles.groupSizeHeaderText}>
              <Text style={[styles.groupSizeTitle, { color: colors.text }]}>Group Size</Text>
              <Text style={[styles.groupSizeHint, { color: colors.textMuted }]}>Furthest distance between any 2 bullets (circled above)</Text>
            </View>
          </View>
          
          <View style={styles.groupSizeContent}>
            <Text style={[styles.groupSizeValue, { color: colors.text }]}>
              {groupSizeData.maxDistanceCm.toFixed(1)}
            </Text>
            <Text style={[styles.groupSizeUnit, { color: colors.textMuted }]}>cm</Text>
          </View>
          
          {/* Visual quality indicator */}
          <View style={styles.groupSizeQuality}>
            {groupSizeData.maxDistanceCm <= 5 ? (
              <>
                <View style={[styles.qualityDot, { backgroundColor: COLORS.primary }]} />
                <Text style={[styles.qualityText, { color: COLORS.primary }]}>Excellent</Text>
              </>
            ) : groupSizeData.maxDistanceCm <= 10 ? (
              <>
                <View style={[styles.qualityDot, { backgroundColor: "#22C55E" }]} />
                <Text style={[styles.qualityText, { color: "#22C55E" }]}>Good</Text>
              </>
            ) : groupSizeData.maxDistanceCm <= 20 ? (
              <>
                <View style={[styles.qualityDot, { backgroundColor: COLORS.warning }]} />
                <Text style={[styles.qualityText, { color: COLORS.warning }]}>Fair</Text>
              </>
            ) : (
              <>
                <View style={[styles.qualityDot, { backgroundColor: COLORS.danger }]} />
                <Text style={[styles.qualityText, { color: COLORS.danger }]}>Wide spread</Text>
              </>
            )}
          </View>
          
          {/* Min pair info if available */}
          {groupSizeData.minDistanceCm != null && (
            <View style={[styles.groupSizeExtra, { borderTopColor: colors.border }]}>
              <Text style={[styles.groupSizeExtraLabel, { color: colors.textMuted }]}>Tightest pair:</Text>
              <Text style={[styles.groupSizeExtraValue, { color: colors.text }]}>
                {groupSizeData.minDistanceCm.toFixed(1)} cm
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Distance Input */}
      <DistanceInput distance={distance} onDistanceChange={onDistanceChange} />

      {/* Editor Modal */}
      <Modal
        visible={editorModalVisible}
        transparent
        animationType="none"
        onRequestClose={handleCloseEditor}
      >
        <Animated.View style={[styles.modalOverlay, { opacity: opacityAnim }]}>
          <Pressable style={styles.modalBackdrop} onPress={handleCloseEditor} />
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ scale: scaleAnim }],
                opacity: opacityAnim,
              },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Detections</Text>
              <TouchableOpacity onPress={handleCloseEditor} style={styles.modalClose}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {/* Detection Editor */}
            <DetectionEditor
              result={result}
              detections={editedDetections}
              onDetectionsChange={onDetectionsChange}
              editMode={editMode}
              onModeChange={setEditMode}
              captureRef={editorCaptureRef}
            />

            {/* Stats in Modal */}
            <View style={styles.modalStats}>
              <Text style={styles.modalStatsText}>
                {stats.total} hits • {stats.manual} added manually
              </Text>
            </View>

            {/* Done Button */}
            <TouchableOpacity style={styles.modalDone} onPress={handleCloseEditor} activeOpacity={0.8}>
              <Ionicons name="checkmark-circle" size={20} color="#000" />
              <Text style={styles.modalDoneText}>Done Editing</Text>
            </TouchableOpacity>
          </Animated.View>
        </Animated.View>
      </Modal>

      {/* Live Stats */}
      <View style={[styles.statsContainer, { backgroundColor: colors.card }]}>
        <View style={styles.mainStat}>
          <Text style={[styles.mainStatValue, { color: colors.primary }]}>{stats.total}</Text>
          <Text style={[styles.mainStatLabel, { color: colors.textMuted }]}>
            Total Hits{hasChanges ? " (edited)" : ""}
          </Text>
        </View>

        <View style={[styles.statsDivider, { backgroundColor: colors.border }]} />

        <View style={styles.breakdownStats}>
          <View style={styles.breakdownRow}>
            <View style={[styles.statDot, { backgroundColor: colors.primary }]} />
            <Text style={[styles.breakdownText, { color: colors.textMuted }]}>{stats.high - stats.manual} AI</Text>
          </View>
          {stats.manual > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.statDot, { backgroundColor: COLORS.info }]} />
              <Text style={[styles.breakdownText, { color: colors.textMuted }]}>{stats.manual} Manual</Text>
            </View>
          )}
          {stats.medium > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.statDot, { backgroundColor: COLORS.warning }]} />
              <Text style={styles.breakdownText}>{stats.medium} Med</Text>
            </View>
          )}
          {stats.low > 0 && (
            <View style={styles.breakdownRow}>
              <View style={[styles.statDot, { backgroundColor: COLORS.danger }]} />
              <Text style={[styles.breakdownText, { color: colors.textMuted }]}>{stats.low} Low</Text>
            </View>
          )}
        </View>
      </View>

      {/* Change Indicator */}
      {hasChanges && (
        <View style={[styles.changeIndicator, { backgroundColor: colors.card }]}>
          <Ionicons name="pencil" size={14} color={COLORS.info} />
          <Text style={[styles.changeText, { color: colors.text }]}>
            {result.detections.length > editedDetections.length
              ? `Removed ${result.detections.length - editedDetections.length + stats.manual} false detection${result.detections.length - editedDetections.length + stats.manual !== 1 ? "s" : ""}`
              : stats.manual > 0
                ? `Added ${stats.manual} missed bullet${stats.manual !== 1 ? "s" : ""}`
                : "Detections modified"}
          </Text>
        </View>
      )}

      {/* Processing Info */}
      <View style={styles.infoRow}>
        <Ionicons name="time-outline" size={14} color={colors.textMuted} />
        <Text style={[styles.infoText, { color: colors.textMuted }]}>
          AI processed in {result.processing_time_s.toFixed(2)}s
        </Text>
      </View>

      {/* Actions */}
      <TouchableOpacity
        style={styles.doneButton}
        onPress={handleSave}
        activeOpacity={0.9}
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? ["#6B7280", "#9CA3AF"] : ["rgba(255,255,255,0.95)", "rgba(147,197,253,0.85)", "rgba(156,163,175,0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.doneButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#000" />
              <Text style={styles.doneButtonText}>
                {stats.total === 0 ? "Save (No Hits)" : `Save ${stats.total} Hit${stats.total !== 1 ? "s" : ""}`}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.retakeButton, { borderColor: colors.border }]}
        onPress={onRetake}
        activeOpacity={0.7}
        disabled={saving}
      >
        <Ionicons name="camera-outline" size={18} color={colors.textMuted} />
        <Text style={[styles.retakeButtonText, { color: colors.textMuted }]}>Retake Photo</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  
  // Edit Toggle
  editToggle: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 12,
  },
  editToggleIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  editToggleIconActive: {
    backgroundColor: COLORS.primary,
  },
  editToggleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
  },
  modalClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  modalStats: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  modalStatsText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  modalDone: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    height: 52,
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    marginTop: 16,
    gap: 8,
  },
  modalDoneText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  
  // Stats
  statsContainer: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
  },
  mainStat: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  mainStatValue: {
    fontSize: 48,
    fontWeight: "800",
    color: COLORS.primary,
  },
  mainStatLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    textTransform: "uppercase",
    marginTop: 4,
  },
  statsDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 20,
  },
  breakdownStats: {
    flex: 1,
    justifyContent: "center",
    gap: 8,
  },
  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  breakdownText: {
    fontSize: 14,
    color: COLORS.text,
  },
  
  // Group Size Card
  groupSizeCard: {
    backgroundColor: "rgba(239, 68, 68, 0.08)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.2)",
  },
  groupSizeHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  groupSizeIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(239, 68, 68, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  groupSizeHeaderText: {
    flex: 1,
  },
  groupSizeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.white,
  },
  groupSizeHint: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  groupSizeContent: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    paddingVertical: 8,
  },
  groupSizeValue: {
    fontSize: 48,
    fontWeight: "800",
    color: "#EF4444",
  },
  groupSizeUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 4,
    opacity: 0.7,
  },
  groupSizeQuality: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  qualityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  qualityText: {
    fontSize: 13,
    fontWeight: "600",
  },
  groupSizeExtra: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  groupSizeExtraLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  groupSizeExtraValue: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },

  // Change Indicator
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(59, 130, 246, 0.15)",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  changeText: {
    fontSize: 13,
    color: COLORS.info,
    fontWeight: "500",
  },
  
  // Info
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginBottom: 24,
  },
  infoText: {
    fontSize: 12,
    color: COLORS.textDim,
  },
  
  // Buttons
  doneButton: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
  },
  doneButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  doneButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  retakeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },
  retakeButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});

