import React from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { COLORS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// TACTICAL RESULTS ENTRY
// Form for logging tactical target results (hits, time, etc.)
// ═══════════════════════════════════════════════════════════════════════════

interface TacticalResultsEntryProps {
  distance: number;
  plannedRounds: number;
  hits: string;
  setHits: (val: string) => void;
  time: string;
  setTime: (val: string) => void;
  stageCleared: boolean;
  setStageCleared: (val: boolean) => void;
  notes: string;
  setNotes: (val: string) => void;
  onSave: () => void;
  onBack: () => void;
  saving: boolean;
}

export const TacticalResultsEntry = React.memo(function TacticalResultsEntry({
  distance,
  plannedRounds,
  hits,
  setHits,
  time,
  setTime,
  stageCleared,
  setStageCleared,
  notes,
  setNotes,
  onSave,
  onBack,
  saving,
}: TacticalResultsEntryProps) {
  const hitsNum = parseInt(hits) || 0;
  const accuracyPct = plannedRounds > 0 ? Math.round((hitsNum / plannedRounds) * 100) : 0;

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Results</Text>
          <Text style={styles.headerSubtitle}>Tactical target at {distance}m</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Summary Card */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryItem}>
          <Text style={styles.summaryValue}>{plannedRounds}</Text>
          <Text style={styles.summaryLabel}>Rounds</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text style={[styles.summaryValue, { color: COLORS.primary }]}>{hitsNum}</Text>
          <Text style={styles.summaryLabel}>Hits</Text>
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <Text
            style={[
              styles.summaryValue,
              accuracyPct >= 80
                ? { color: COLORS.primary }
                : accuracyPct >= 50
                  ? { color: COLORS.warning }
                  : { color: COLORS.danger },
            ]}
          >
            {accuracyPct}%
          </Text>
          <Text style={styles.summaryLabel}>Accuracy</Text>
        </View>
      </View>

      {/* Hits Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hits on Target</Text>
        <View style={styles.hitsRow}>
          {[0, 1, 2, 3, 4, 5].map((num) => (
            <TouchableOpacity
              key={num}
              style={[styles.hitChip, hits === num.toString() && styles.hitChipSelected]}
              onPress={() => setHits(num.toString())}
            >
              <Text style={[styles.hitChipText, hits === num.toString() && styles.hitChipTextSelected]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={hits}
            onChangeText={setHits}
            placeholder={`Custom (max ${plannedRounds})`}
            placeholderTextColor={COLORS.textDimmer}
            keyboardType="number-pad"
            returnKeyType="done"
          />
        </View>
      </View>

      {/* Time Input */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Engagement Time <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={time}
            onChangeText={setTime}
            placeholder="e.g. 4.5"
            placeholderTextColor={COLORS.textDimmer}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={styles.inputUnit}>sec</Text>
        </View>
      </View>

      {/* Stage Cleared Toggle */}
      <View style={styles.toggleSection}>
        <View style={styles.toggleInfo}>
          <Text style={styles.toggleTitle}>Stage Cleared</Text>
          <Text style={styles.toggleHint}>Did you complete the tactical stage?</Text>
        </View>
        <Switch
          value={stageCleared}
          onValueChange={setStageCleared}
          trackColor={{ false: COLORS.borderLight, true: "rgba(16, 185, 129, 0.4)" }}
          thumbColor={stageCleared ? COLORS.primary : "#6B7280"}
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Notes <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Add any notes about this target..."
          placeholderTextColor={COLORS.textDimmer}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        activeOpacity={0.9}
        disabled={saving || !hits}
      >
        <LinearGradient
          colors={saving || !hits ? ["#6B7280", "#9CA3AF"] : [COLORS.primary, COLORS.primaryLight, COLORS.primaryLighter]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#000" />
              <Text style={styles.saveButtonText}>Save Target</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7} disabled={saving}>
        <Text style={styles.cancelButtonText}>Back to Setup</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
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
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  
  // Summary
  summaryCard: {
    flexDirection: "row",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.white,
  },
  summaryLabel: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 4,
    textTransform: "uppercase",
  },
  summaryDivider: {
    width: 1,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 12,
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
  
  // Hits
  hitsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  hitChip: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  hitChipSelected: {
    backgroundColor: COLORS.primary,
  },
  hitChipText: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textMuted,
  },
  hitChipTextSelected: {
    color: "#000",
  },
  
  // Input
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: COLORS.white,
  },
  inputUnit: {
    fontSize: 14,
    color: COLORS.textDim,
    marginLeft: 8,
  },
  
  // Toggle
  toggleSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    marginBottom: 28,
  },
  toggleInfo: {
    flex: 1,
    marginRight: 16,
  },
  toggleTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
  },
  toggleHint: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: 2,
  },
  
  // Notes
  notesInput: {
    backgroundColor: COLORS.card,
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    color: COLORS.white,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  
  // Buttons
  saveButton: {
    borderRadius: 28,
    overflow: "hidden",
    marginBottom: 12,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  cancelButton: {
    alignItems: "center",
    paddingBottom: 20,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});

