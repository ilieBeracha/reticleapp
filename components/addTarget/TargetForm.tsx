import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Crosshair, Minus, Plus, Target, X } from "lucide-react-native";
import React, { useCallback } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS, TargetType } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE CATEGORIES
// ═══════════════════════════════════════════════════════════════════════════
const DISTANCE_CATEGORIES = [
  { label: "Close", range: "5-15m", distances: [5, 7, 10, 15] },
  { label: "Medium", range: "25-50m", distances: [25, 35, 50] },
  { label: "Long", range: "100m+", distances: [100, 200, 300] },
];

// ═══════════════════════════════════════════════════════════════════════════
// STEPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface StepperProps {
  value: number;
  onIncrement: () => void;
  onDecrement: () => void;
  min?: number;
  max?: number;
  unit?: string;
  label: string;
}

const Stepper = React.memo(function Stepper({
  value,
  onIncrement,
  onDecrement,
  min = 1,
  max = 100,
  unit = "",
  label,
}: StepperProps) {
  const handleDecrement = useCallback(() => {
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onDecrement();
    }
  }, [value, min, onDecrement]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onIncrement();
    }
  }, [value, max, onIncrement]);

  return (
    <View style={styles.stepperContainer}>
      <Text style={styles.stepperLabel}>{label}</Text>
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[styles.stepperBtn, value <= min && styles.stepperBtnDisabled]}
          onPress={handleDecrement}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Minus size={24} color={value <= min ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>

        <View style={styles.stepperValueContainer}>
          <Text style={styles.stepperValue}>{value}</Text>
          {unit && <Text style={styles.stepperUnit}>{unit}</Text>}
        </View>

        <TouchableOpacity
          style={[styles.stepperBtn, value >= max && styles.stepperBtnDisabled]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={24} color={value >= max ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>
      </View>
      
      {/* Quick select buttons */}
      <View style={styles.quickSelectRow}>
        {[5, 10, 20, 30].map((num) => (
          <TouchableOpacity
            key={num}
            style={[styles.quickSelectBtn, value === num && styles.quickSelectBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              // Simulate setting value by incrementing/decrementing
              const diff = num - value;
              if (diff > 0) {
                for (let i = 0; i < diff; i++) onIncrement();
              } else {
                for (let i = 0; i < -diff; i++) onDecrement();
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.quickSelectText, value === num && styles.quickSelectTextActive]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// TARGET FORM
// ═══════════════════════════════════════════════════════════════════════════

interface TargetFormProps {
  targetType: TargetType;
  onTargetTypeChange: (type: TargetType) => void;
  selectedDistance: number | null;
  onDistanceSelect: (distance: number) => void;
  customDistance: string;
  onCustomDistanceChange: (text: string) => void;
  selectedBullets: number | null;
  onBulletsSelect: (bullets: number) => void;
  customBullets: string;
  onCustomBulletsChange: (text: string) => void;
  laneNumber: string;
  onLaneNumberChange: (text: string) => void;
  effectiveDistance: number;
  effectiveBullets: number;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
}

export const TargetForm = React.memo(function TargetForm({
  targetType,
  onTargetTypeChange,
  selectedDistance,
  onDistanceSelect,
  selectedBullets,
  onBulletsSelect,
  effectiveDistance,
  effectiveBullets,
  onSubmit,
  onClose,
  saving,
}: TargetFormProps) {
  const colors = useColors();
  
  // Handlers for stepper
  const handleBulletsIncrement = useCallback(() => {
    onBulletsSelect((selectedBullets ?? 5) + 1);
  }, [selectedBullets, onBulletsSelect]);

  const handleBulletsDecrement = useCallback(() => {
    onBulletsSelect(Math.max(1, (selectedBullets ?? 5) - 1));
  }, [selectedBullets, onBulletsSelect]);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.headerIconContainer, { backgroundColor: colors.primary + '20' }]}>
            <Target size={24} color={colors.primary} />
          </View>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Add Target</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Log shooting results</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Target Type Selection */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeCard, targetType === "paper" && styles.typeCardSelected]}
            onPress={() => onTargetTypeChange("paper")}
            activeOpacity={0.8}
          >
            <View style={[styles.typeIconBox, targetType === "paper" && styles.typeIconBoxSelected]}>
              <Camera size={22} color={targetType === "paper" ? "#000" : COLORS.textMuted} />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeText, targetType === "paper" && styles.typeTextSelected]}>
                Paper Target
              </Text>
              <Text style={styles.typeHint}>AI-powered scan</Text>
            </View>
            {targetType === "paper" && (
              <View style={styles.typeCheck}>
                <Ionicons name="checkmark" size={14} color="#000" />
              </View>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, targetType === "tactical" && styles.typeCardSelected]}
            onPress={() => onTargetTypeChange("tactical")}
            activeOpacity={0.8}
          >
            <View style={[styles.typeIconBox, targetType === "tactical" && styles.typeIconBoxSelected]}>
              <Crosshair size={22} color={targetType === "tactical" ? "#000" : COLORS.textMuted} />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeText, targetType === "tactical" && styles.typeTextSelected]}>
                Tactical
              </Text>
              <Text style={styles.typeHint}>Manual entry</Text>
            </View>
            {targetType === "tactical" && (
              <View style={styles.typeCheck}>
                <Ionicons name="checkmark" size={14} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Paper Target - Simple CTA */}
      {targetType === "paper" && (
        <View style={styles.paperSection}>
          <View style={styles.paperCard}>
            <View style={styles.paperIconRing}>
              <View style={styles.paperIconInner}>
                <Camera size={32} color={COLORS.primary} />
              </View>
            </View>
            <Text style={styles.paperTitle}>Scan Your Target</Text>
            <Text style={styles.paperDesc}>
              Point your camera at a paper target. Our AI will detect bullet holes and calculate your score automatically.
            </Text>
            <View style={styles.paperFeatures}>
              <View style={styles.paperFeature}>
                <Ionicons name="flash" size={14} color={COLORS.primary} />
                <Text style={styles.paperFeatureText}>Auto detection</Text>
              </View>
              <View style={styles.paperFeature}>
                <Ionicons name="analytics" size={14} color={COLORS.primary} />
                <Text style={styles.paperFeatureText}>Group analysis</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Tactical - Distance & Rounds */}
      {targetType === "tactical" && (
        <>
          {/* Distance Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distance</Text>
            {DISTANCE_CATEGORIES.map((category) => (
              <View key={category.label} style={styles.distanceCategory}>
                <View style={styles.distanceCategoryHeader}>
                  <Text style={styles.distanceCategoryLabel}>{category.label}</Text>
                  <Text style={styles.distanceCategoryRange}>{category.range}</Text>
                </View>
                <View style={styles.distanceChipsRow}>
                  {category.distances.map((dist) => (
                    <TouchableOpacity
                      key={dist}
                      style={[
                        styles.distanceChip,
                        selectedDistance === dist && styles.distanceChipSelected,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        onDistanceSelect(dist);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.distanceChipText,
                          selectedDistance === dist && styles.distanceChipTextSelected,
                        ]}
                      >
                        {dist}m
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ))}
          </View>

          {/* Rounds Stepper */}
          <View style={styles.section}>
            <Stepper
              label="Rounds to Fire"
              value={effectiveBullets}
              onIncrement={handleBulletsIncrement}
              onDecrement={handleBulletsDecrement}
              min={1}
              max={100}
              unit="rds"
            />
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconBox}>
                <Target size={16} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Target</Text>
                <Text style={styles.summaryValue}>Tactical</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconBox}>
                <Ionicons name="resize-outline" size={16} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Distance</Text>
                <Text style={styles.summaryValue}>{effectiveDistance}m</Text>
              </View>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <View style={styles.summaryIconBox}>
                <Ionicons name="ellipse" size={16} color={COLORS.primary} />
              </View>
              <View>
                <Text style={styles.summaryLabel}>Rounds</Text>
                <Text style={styles.summaryValue}>{effectiveBullets}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Submit Button */}
      <TouchableOpacity 
        style={styles.submitBtn} 
        onPress={onSubmit} 
        activeOpacity={0.9} 
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? ["#6B7280", "#9CA3AF"] : ["rgba(255,255,255,0.95)", "rgba(147,197,253,0.85)", "rgba(156,163,175,0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              {targetType === "paper" ? (
                <Camera size={20} color="#000" />
              ) : (
                <Crosshair size={20} color="#000" />
              )}
              <Text style={styles.submitBtnText}>
                {targetType === "paper" ? "Open Camera" : "Enter Results"}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
        <Text style={[styles.cancelBtnText, { color: colors.textMuted }]}>Cancel</Text>
      </TouchableOpacity>
      
      <View style={{ height: 20 }} />
    </ScrollView>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Target Type
  typeRow: {
    gap: 10,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  typeIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIconBoxSelected: {
    backgroundColor: COLORS.primary,
  },
  typeContent: {
    flex: 1,
  },
  typeText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.text,
  },
  typeTextSelected: {
    color: COLORS.white,
  },
  typeHint: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 2,
  },
  typeCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  // Paper Section
  paperSection: {
    marginBottom: 24,
  },
  paperCard: {
    alignItems: "center",
    backgroundColor: `${COLORS.primary}08`,
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
    borderColor: `${COLORS.primary}25`,
  },
  paperIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${COLORS.primary}15`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paperIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  paperTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
  },
  paperDesc: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  paperFeatures: {
    flexDirection: "row",
    gap: 20,
  },
  paperFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  paperFeatureText: {
    fontSize: 12,
    color: COLORS.text,
  },

  // Distance
  distanceCategory: {
    marginBottom: 16,
  },
  distanceCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  distanceCategoryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  distanceCategoryRange: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  distanceChipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  distanceChip: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: COLORS.card,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  distanceChipSelected: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  distanceChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  distanceChipTextSelected: {
    color: COLORS.white,
  },

  // Stepper
  stepperContainer: {
    alignItems: "center",
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  stepperBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValueContainer: {
    alignItems: "center",
    minWidth: 80,
  },
  stepperValue: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  stepperUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: -4,
  },
  quickSelectRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 20,
  },
  quickSelectBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
  },
  quickSelectBtnActive: {
    backgroundColor: `${COLORS.primary}30`,
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  quickSelectTextActive: {
    color: COLORS.primary,
  },

  // Summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: `${COLORS.primary}10`,
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: `${COLORS.primary}20`,
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  summaryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryDivider: {
    width: 1,
    height: 32,
    backgroundColor: `${COLORS.primary}30`,
    marginHorizontal: 8,
  },
  summaryLabel: {
    fontSize: 10,
    color: COLORS.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.white,
  },

  // Buttons
  submitBtn: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    gap: 10,
  },
  submitBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});
