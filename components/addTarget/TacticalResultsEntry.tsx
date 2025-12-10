import { useColors } from "@/hooks/ui/useColors";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Check, Crosshair, Minus, Plus, Target, Timer } from "lucide-react-native";
import React, { useCallback } from "react";
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
import { COLORS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CIRCULAR STEPPER COMPONENT
// ═══════════════════════════════════════════════════════════════════════════
interface CircularStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  sublabel?: string;
}

const CircularStepper = React.memo(function CircularStepper({
  value,
  max,
  onChange,
  label,
  sublabel,
}: CircularStepperProps) {
  const handleDecrement = useCallback(() => {
    if (value > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [value, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [value, max, onChange]);

  const percentage = max > 0 ? Math.round((value / max) * 100) : 0;
  const isGood = percentage >= 80;
  const isOkay = percentage >= 50 && percentage < 80;

  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.label}>{label}</Text>
      {sublabel && <Text style={stepperStyles.sublabel}>{sublabel}</Text>}
      
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, value <= 0 && stepperStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={value <= 0}
          activeOpacity={0.7}
        >
          <Minus size={28} color={value <= 0 ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={stepperStyles.valueContainer}>
          <View style={[
            stepperStyles.valueRing,
            isGood && stepperStyles.valueRingGood,
            isOkay && stepperStyles.valueRingOkay,
            !isGood && !isOkay && value > 0 && stepperStyles.valueRingBad,
          ]}>
            <Text style={stepperStyles.value}>{value}</Text>
            <Text style={stepperStyles.maxLabel}>/ {max}</Text>
          </View>
          <Text style={[
            stepperStyles.percentage,
            isGood && { color: COLORS.primary },
            isOkay && { color: COLORS.warning },
            !isGood && !isOkay && value > 0 && { color: COLORS.danger },
          ]}>
            {percentage}% accuracy
          </Text>
        </View>

        <TouchableOpacity
          style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={28} color={value >= max ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Quick select all/none */}
      <View style={stepperStyles.quickRow}>
        <TouchableOpacity
          style={[stepperStyles.quickBtn, value === 0 && stepperStyles.quickBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(0);
          }}
        >
          <Text style={[stepperStyles.quickText, value === 0 && stepperStyles.quickTextActive]}>
            None
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[stepperStyles.quickBtn, value === Math.floor(max / 2) && stepperStyles.quickBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(Math.floor(max / 2));
          }}
        >
          <Text style={[stepperStyles.quickText, value === Math.floor(max / 2) && stepperStyles.quickTextActive]}>
            Half
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[stepperStyles.quickBtn, value === max && stepperStyles.quickBtnActive]}
          onPress={() => {
            Haptics.selectionAsync();
            onChange(max);
          }}
        >
          <Text style={[stepperStyles.quickText, value === max && stepperStyles.quickTextActive]}>
            All
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const stepperStyles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: 8,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sublabel: {
    fontSize: 13,
    color: COLORS.textDim,
    marginBottom: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  btn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  btnDisabled: {
    opacity: 0.4,
  },
  valueContainer: {
    alignItems: "center",
  },
  valueRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.card,
    borderWidth: 3,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
  },
  valueRingGood: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  valueRingOkay: {
    borderColor: COLORS.warning,
    backgroundColor: `${COLORS.warning}15`,
  },
  valueRingBad: {
    borderColor: COLORS.danger,
    backgroundColor: `${COLORS.danger}15`,
  },
  value: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  maxLabel: {
    fontSize: 13,
    color: COLORS.textDim,
    marginTop: -2,
  },
  percentage: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 10,
    fontWeight: "500",
  },
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  quickBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  quickBtnActive: {
    backgroundColor: `${COLORS.primary}25`,
  },
  quickText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  quickTextActive: {
    color: COLORS.primary,
  },
});

// ═══════════════════════════════════════════════════════════════════════════
// TACTICAL RESULTS ENTRY
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
  const colors = useColors();
  const hitsNum = parseInt(hits) || 0;

  const handleHitsChange = useCallback((value: number) => {
    setHits(value.toString());
  }, [setHits]);

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.secondary }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Log Results</Text>
          <View style={styles.headerMeta}>
            <Crosshair size={14} color={colors.primary} />
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Tactical • {distance}m • {plannedRounds} rounds
            </Text>
          </View>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Main Hits Stepper */}
      <View style={styles.hitsSection}>
        <CircularStepper
          value={hitsNum}
          max={plannedRounds}
          onChange={handleHitsChange}
          label="Hits on Target"
          sublabel={`Out of ${plannedRounds} rounds fired`}
        />
      </View>

      {/* Time Input - Modern card style */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeader}>
          <View style={[styles.cardIconBox, { backgroundColor: colors.primary + '20' }]}>
            <Timer size={18} color={colors.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Engagement Time</Text>
            <Text style={[styles.cardHint, { color: colors.textMuted }]}>Optional - how fast?</Text>
          </View>
        </View>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={[styles.timeInput, { backgroundColor: colors.secondary, color: colors.text, borderColor: colors.border }]}
            value={time}
            onChangeText={setTime}
            placeholder="0.0"
            placeholderTextColor={colors.textMuted}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={[styles.timeUnit, { color: colors.textMuted }]}>seconds</Text>
        </View>
      </View>

      {/* Stage Cleared Toggle */}
      <View style={[styles.toggleCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.toggleLeft}>
          <View style={[styles.cardIconBox, { backgroundColor: colors.secondary }, stageCleared && { backgroundColor: colors.primary }]}>
            <Check size={18} color={stageCleared ? "#000" : colors.textMuted} />
          </View>
          <View>
            <Text style={[styles.toggleTitle, { color: colors.text }]}>Stage Cleared</Text>
            <Text style={[styles.toggleHint, { color: colors.textMuted }]}>Completed tactical objective?</Text>
          </View>
        </View>
        <Switch
          value={stageCleared}
          onValueChange={(val) => {
            Haptics.selectionAsync();
            setStageCleared(val);
          }}
          trackColor={{ false: colors.border, true: colors.primary + '50' }}
          thumbColor={stageCleared ? colors.primary : "#6B7280"}
        />
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={[styles.notesLabel, { color: colors.text }]}>
          Notes <Text style={[styles.optionalLabel, { color: colors.textMuted }]}>(optional)</Text>
        </Text>
        <TextInput
          style={[styles.notesInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this engagement..."
          placeholderTextColor={colors.textMuted}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={onSave}
        activeOpacity={0.9}
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? ["#6B7280", "#9CA3AF"] : ["rgba(255,255,255,0.95)", "rgba(147,197,253,0.85)", "rgba(156,163,175,0.9)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Target size={20} color="#000" />
              <Text style={styles.saveButtonText}>Save Target</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.cancelButton, { borderColor: colors.border }]} onPress={onBack} activeOpacity={0.7} disabled={saving}>
        <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Back to Setup</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
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
    marginBottom: 24,
    marginTop: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.white,
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  // Hits Section
  hitsSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Card
  card: {
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  cardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  cardIconBoxActive: {
    backgroundColor: COLORS.primary,
  },
  cardHeaderText: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  cardHint: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 1,
  },

  // Time Input
  timeInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  timeInput: {
    flex: 1,
    fontSize: 24,
    fontWeight: "600",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  timeUnit: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginLeft: 8,
  },

  // Toggle
  toggleCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  toggleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  toggleTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.white,
  },
  toggleHint: {
    fontSize: 12,
    color: COLORS.textDim,
    marginTop: 1,
  },

  // Notes
  notesSection: {
    marginBottom: 24,
  },
  notesLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  optionalLabel: {
    fontWeight: "400",
    color: COLORS.textDim,
    textTransform: "none",
    letterSpacing: 0,
  },
  notesInput: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    color: COLORS.white,
    minHeight: 80,
    textAlignVertical: "top",
    borderWidth: 1,
    borderColor: COLORS.border,
  },

  // Buttons
  saveButton: {
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 12,
  },
  saveButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    gap: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#000",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
});
