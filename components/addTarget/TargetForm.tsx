import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS, DISTANCE_PRESETS, BULLET_PRESETS, TargetType } from "./types";
import { OptionChip } from "./OptionChip";
import { CustomInput } from "./CustomInput";

// ═══════════════════════════════════════════════════════════════════════════
// TARGET FORM
// Initial form for configuring target type and shooting parameters
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
  customDistance,
  onCustomDistanceChange,
  selectedBullets,
  onBulletsSelect,
  customBullets,
  onCustomBulletsChange,
  laneNumber,
  onLaneNumberChange,
  effectiveDistance,
  effectiveBullets,
  onSubmit,
  onClose,
  saving,
}: TargetFormProps) {
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Add Target</Text>
          <Text style={styles.headerSubtitle}>Log your shooting target</Text>
        </View>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Ionicons name="close" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Target Type */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Target Type</Text>
        <View style={styles.typeRow}>
          <TouchableOpacity
            style={[styles.typeCard, targetType === "paper" && styles.typeCardSelected]}
            onPress={() => onTargetTypeChange("paper")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="ellipse-outline"
              size={28}
              color={targetType === "paper" ? COLORS.primary : COLORS.textDim}
            />
            <Text style={[styles.typeText, targetType === "paper" && styles.typeTextSelected]}>
              Paper
            </Text>
            <Text style={styles.typeHint}>AI scoring</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.typeCard, targetType === "tactical" && styles.typeCardSelected]}
            onPress={() => onTargetTypeChange("tactical")}
            activeOpacity={0.7}
          >
            <Ionicons
              name="man-outline"
              size={28}
              color={targetType === "tactical" ? COLORS.primary : COLORS.textDim}
            />
            <Text style={[styles.typeText, targetType === "tactical" && styles.typeTextSelected]}>
              Tactical
            </Text>
            <Text style={styles.typeHint}>Hit / Miss</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Paper: Show scan info */}
      {targetType === "paper" && (
        <View style={styles.paperInfo}>
          <View style={styles.paperInfoIcon}>
            <Ionicons name="camera" size={32} color={COLORS.primary} />
          </View>
          <Text style={styles.paperInfoTitle}>AI-Powered Analysis</Text>
          <Text style={styles.paperInfoText}>
            Take a photo of your paper target and our AI will automatically detect and score your bullet holes.
          </Text>
        </View>
      )}

      {/* Tactical: Show config fields */}
      {targetType === "tactical" && (
        <>
          {/* Distance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Distance</Text>
            <View style={styles.chipsRow}>
              {DISTANCE_PRESETS.map((dist) => (
                <OptionChip
                  key={dist}
                  label={`${dist}m`}
                  selected={selectedDistance === dist && !customDistance}
                  onPress={() => onDistanceSelect(dist)}
                />
              ))}
            </View>
            <CustomInput
              value={customDistance}
              onChangeText={onCustomDistanceChange}
              placeholder="Custom distance"
              unit="m"
            />
          </View>

          {/* Bullets */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rounds to Fire</Text>
            <View style={styles.chipsRow}>
              {BULLET_PRESETS.map((count) => (
                <OptionChip
                  key={count}
                  label={count.toString()}
                  selected={selectedBullets === count && !customBullets}
                  onPress={() => onBulletsSelect(count)}
                />
              ))}
            </View>
            <CustomInput
              value={customBullets}
              onChangeText={onCustomBulletsChange}
              placeholder="Custom count"
              unit="rds"
            />
          </View>

          {/* Lane Number */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              Lane Number <Text style={styles.optionalLabel}>(optional)</Text>
            </Text>
            <CustomInput value={laneNumber} onChangeText={onLaneNumberChange} placeholder="e.g. 5" />
          </View>

          {/* Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <View style={styles.summaryItem}>
                <Ionicons name="locate" size={18} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Type</Text>
                <Text style={styles.summaryValue}>Tactical</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="resize" size={18} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Distance</Text>
                <Text style={styles.summaryValue}>{effectiveDistance}m</Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryItem}>
                <Ionicons name="radio-button-on" size={18} color={COLORS.primary} />
                <Text style={styles.summaryLabel}>Rounds</Text>
                <Text style={styles.summaryValue}>{effectiveBullets}</Text>
              </View>
            </View>
          </View>
        </>
      )}

      {/* Submit Button */}
      <TouchableOpacity style={styles.submitBtn} onPress={onSubmit} activeOpacity={0.9} disabled={saving}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight, COLORS.primaryLighter]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name={targetType === "paper" ? "camera" : "add-circle"} size={22} color="#000" />
              <Text style={styles.submitBtnText}>
                {targetType === "paper" ? "Scan Target" : "Add Target"}
              </Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
        <Text style={styles.cancelBtnText}>Cancel</Text>
      </TouchableOpacity>
    </ScrollView>
  );
});

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
    marginBottom: 28,
    marginTop: 20,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
  },
  headerSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Section
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  optionalLabel: {
    fontWeight: "400",
    color: COLORS.textDim,
    textTransform: "none",
    letterSpacing: 0,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  
  // Target Type
  typeRow: {
    flexDirection: "row",
    gap: 12,
  },
  typeCard: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 2,
    borderColor: "transparent",
  },
  typeCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  typeText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  typeTextSelected: {
    color: COLORS.white,
  },
  typeHint: {
    fontSize: 11,
    color: COLORS.textDim,
  },
  
  // Paper Info
  paperInfo: {
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 20,
    padding: 32,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  paperInfoIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  paperInfoTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 8,
  },
  paperInfoText: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },
  
  // Summary
  summaryCard: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.2)",
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
  },
  summaryItem: {
    alignItems: "center",
    gap: 6,
  },
  summaryDivider: {
    width: 1,
    height: 40,
    backgroundColor: COLORS.borderLight,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textDim,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
  },
  
  // Buttons
  submitBtn: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  cancelBtn: {
    alignItems: "center",
    paddingBottom: 20,
  },
  cancelBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});

