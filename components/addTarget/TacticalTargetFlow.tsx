import { addTargetWithTacticalResult } from "@/services/sessionService";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import {
    ArrowLeft,
    Check,
    ChevronRight,
    Crosshair,
    Minus,
    Plus,
    Target,
    Timer,
} from "lucide-react-native";
import React, { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Alert,
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
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label: string;
  unit?: string;
}

const Stepper = React.memo(function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  label,
  unit,
}: StepperProps) {
  const handleDecrement = useCallback(() => {
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [value, max, onChange]);

  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, value <= min && stepperStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Minus size={24} color={value <= min ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>

        <View style={stepperStyles.valueContainer}>
          <Text style={stepperStyles.value}>{value}</Text>
          {unit && <Text style={stepperStyles.unit}>{unit}</Text>}
        </View>

        <TouchableOpacity
          style={[stepperStyles.btn, value >= max && stepperStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={24} color={value >= max ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>
      </View>

      {/* Quick select */}
      <View style={stepperStyles.quickRow}>
        {[5, 10, 20, 30].map((num) => (
          <TouchableOpacity
            key={num}
            style={[stepperStyles.quickBtn, value === num && stepperStyles.quickBtnActive]}
            onPress={() => {
              Haptics.selectionAsync();
              onChange(num);
            }}
            activeOpacity={0.7}
          >
            <Text style={[stepperStyles.quickText, value === num && stepperStyles.quickTextActive]}>
              {num}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const stepperStyles = StyleSheet.create({
  container: { alignItems: "center" },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 16,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 20 },
  btn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  btnDisabled: { opacity: 0.4 },
  valueContainer: { alignItems: "center", minWidth: 80 },
  value: {
    fontSize: 48,
    fontWeight: "700",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  unit: { fontSize: 14, color: COLORS.textMuted, marginTop: -4 },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  quickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    backgroundColor: COLORS.card,
  },
  quickBtnActive: { backgroundColor: `${COLORS.primary}30` },
  quickText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  quickTextActive: { color: COLORS.primary },
});

// ═══════════════════════════════════════════════════════════════════════════
// HITS STEPPER (CIRCULAR)
// ═══════════════════════════════════════════════════════════════════════════
interface HitsStepperProps {
  value: number;
  max: number;
  onChange: (value: number) => void;
}

const HitsStepper = React.memo(function HitsStepper({
  value,
  max,
  onChange,
}: HitsStepperProps) {
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
    <View style={hitsStyles.container}>
      <Text style={hitsStyles.label}>HITS ON TARGET</Text>
      <Text style={hitsStyles.sublabel}>Out of {max} rounds fired</Text>

      <View style={hitsStyles.row}>
        <TouchableOpacity
          style={[hitsStyles.btn, value <= 0 && hitsStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={value <= 0}
          activeOpacity={0.7}
        >
          <Minus size={28} color={value <= 0 ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={hitsStyles.valueContainer}>
          <View
            style={[
              hitsStyles.valueRing,
              isGood && hitsStyles.valueRingGood,
              isOkay && hitsStyles.valueRingOkay,
              !isGood && !isOkay && value > 0 && hitsStyles.valueRingBad,
            ]}
          >
            <Text style={hitsStyles.value}>{value}</Text>
            <Text style={hitsStyles.maxLabel}>/ {max}</Text>
          </View>
          <Text
            style={[
              hitsStyles.percentage,
              isGood && { color: COLORS.primary },
              isOkay && { color: COLORS.warning },
              !isGood && !isOkay && value > 0 && { color: COLORS.danger },
            ]}
          >
            {percentage}% accuracy
          </Text>
        </View>

        <TouchableOpacity
          style={[hitsStyles.btn, value >= max && hitsStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={28} color={value >= max ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Quick select */}
      <View style={hitsStyles.quickRow}>
        <TouchableOpacity
          style={[hitsStyles.quickBtn, value === 0 && hitsStyles.quickBtnActive]}
          onPress={() => { Haptics.selectionAsync(); onChange(0); }}
        >
          <Text style={[hitsStyles.quickText, value === 0 && hitsStyles.quickTextActive]}>None</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[hitsStyles.quickBtn, value === Math.floor(max / 2) && hitsStyles.quickBtnActive]}
          onPress={() => { Haptics.selectionAsync(); onChange(Math.floor(max / 2)); }}
        >
          <Text style={[hitsStyles.quickText, value === Math.floor(max / 2) && hitsStyles.quickTextActive]}>Half</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[hitsStyles.quickBtn, value === max && hitsStyles.quickBtnActive]}
          onPress={() => { Haptics.selectionAsync(); onChange(max); }}
        >
          <Text style={[hitsStyles.quickText, value === max && hitsStyles.quickTextActive]}>All</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
});

const hitsStyles = StyleSheet.create({
  container: { alignItems: "center", paddingVertical: 8 },
  label: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  sublabel: { fontSize: 13, color: COLORS.textDim, marginBottom: 16 },
  row: { flexDirection: "row", alignItems: "center", gap: 24 },
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
  btnDisabled: { opacity: 0.4 },
  valueContainer: { alignItems: "center" },
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
  valueRingGood: { borderColor: COLORS.primary, backgroundColor: `${COLORS.primary}15` },
  valueRingOkay: { borderColor: COLORS.warning, backgroundColor: `${COLORS.warning}15` },
  valueRingBad: { borderColor: COLORS.danger, backgroundColor: `${COLORS.danger}15` },
  value: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  maxLabel: { fontSize: 13, color: COLORS.textDim, marginTop: -2 },
  percentage: { fontSize: 13, color: COLORS.textMuted, marginTop: 10, fontWeight: "500" },
  quickRow: { flexDirection: "row", gap: 12, marginTop: 20 },
  quickBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.card,
  },
  quickBtnActive: { backgroundColor: `${COLORS.primary}25` },
  quickText: { fontSize: 13, fontWeight: "600", color: COLORS.textMuted },
  quickTextActive: { color: COLORS.primary },
});

// ═══════════════════════════════════════════════════════════════════════════
// TACTICAL TARGET FLOW
// Standalone component for logging tactical targets
// ═══════════════════════════════════════════════════════════════════════════

type FlowStep = "setup" | "results";

interface TacticalTargetFlowProps {
  sessionId: string;
  defaultDistance?: number;
  defaultBullets?: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TacticalTargetFlow({
  sessionId,
  defaultDistance = 25,
  defaultBullets = 10,
  onComplete,
  onCancel,
}: TacticalTargetFlowProps) {
  const [step, setStep] = useState<FlowStep>("setup");
  const [saving, setSaving] = useState(false);

  // Setup state
  const [distance, setDistance] = useState(defaultDistance);
  const [bullets, setBullets] = useState(defaultBullets);

  // Results state
  const [hits, setHits] = useState(0);
  const [time, setTime] = useState("");
  const [stageCleared, setStageCleared] = useState(false);
  const [notes, setNotes] = useState("");

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [onCancel]);

  const handleContinue = useCallback(() => {
    if (distance <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Distance", "Please select a valid distance.");
      return;
    }
    if (bullets <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Rounds", "Please enter a valid number of rounds.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("results");
  }, [distance, bullets]);

  const handleSave = useCallback(async () => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID missing");
      return;
    }

    if (hits > bullets) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Hits", "Hits cannot exceed rounds fired.");
      return;
    }

    setSaving(true);

    try {
      await addTargetWithTacticalResult({
        session_id: sessionId,
        distance_m: distance,
        lane_number: null,
        planned_shots: bullets,
        bullets_fired: bullets,
        hits: hits,
        is_stage_cleared: stageCleared,
        time_seconds: time ? parseFloat(time) : null,
        result_notes: notes || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onComplete) {
        onComplete();
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("Failed to add tactical target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
  }, [sessionId, distance, bullets, hits, time, stageCleared, notes, onComplete]);

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP STEP
  // ═══════════════════════════════════════════════════════════════════════════
  if (step === "setup") {
    return (
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconContainer}>
              <Crosshair size={24} color={COLORS.primary} />
            </View>
            <View>
              <Text style={styles.headerTitle}>Tactical Target</Text>
              <Text style={styles.headerSubtitle}>Manual hit logging</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
            <Text style={styles.closeBtnText}>✕</Text>
          </TouchableOpacity>
        </View>

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
                    style={[styles.distanceChip, distance === dist && styles.distanceChipSelected]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setDistance(dist);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.distanceChipText,
                        distance === dist && styles.distanceChipTextSelected,
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
            value={bullets}
            onChange={setBullets}
            min={1}
            max={100}
            unit="rds"
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleContinue} activeOpacity={0.9}>
          <LinearGradient
            colors={[COLORS.primary, COLORS.primaryLight, COLORS.primaryLighter]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            <Text style={styles.submitBtnText}>Enter Results</Text>
            <ChevronRight size={20} color="#000" />
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={handleClose} activeOpacity={0.7}>
          <Text style={styles.cancelBtnText}>Cancel</Text>
        </TouchableOpacity>

        <View style={{ height: 20 }} />
      </ScrollView>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // RESULTS STEP
  // ═══════════════════════════════════════════════════════════════════════════
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => setStep("setup")} style={styles.backBtn}>
          <ArrowLeft size={20} color={COLORS.white} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Results</Text>
          <View style={styles.headerMeta}>
            <Crosshair size={14} color={COLORS.primary} />
            <Text style={styles.headerSubtitle}>
              Tactical • {distance}m • {bullets} rounds
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Hits Stepper */}
      <View style={styles.hitsSection}>
        <HitsStepper value={hits} max={bullets} onChange={setHits} />
      </View>

      {/* Time Input */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View style={styles.cardIconBox}>
            <Timer size={18} color={COLORS.primary} />
          </View>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Engagement Time</Text>
            <Text style={styles.cardHint}>Optional - how fast?</Text>
          </View>
        </View>
        <View style={styles.timeInputContainer}>
          <TextInput
            style={styles.timeInput}
            value={time}
            onChangeText={setTime}
            placeholder="0.0"
            placeholderTextColor={COLORS.textDim}
            keyboardType="decimal-pad"
            returnKeyType="done"
          />
          <Text style={styles.timeUnit}>seconds</Text>
        </View>
      </View>

      {/* Stage Cleared Toggle */}
      <View style={styles.toggleCard}>
        <View style={styles.toggleLeft}>
          <View style={[styles.cardIconBox, stageCleared && styles.cardIconBoxActive]}>
            <Check size={18} color={stageCleared ? "#000" : COLORS.textMuted} />
          </View>
          <View>
            <Text style={styles.toggleTitle}>Stage Cleared</Text>
            <Text style={styles.toggleHint}>Completed tactical objective?</Text>
          </View>
        </View>
        <Switch
          value={stageCleared}
          onValueChange={(val) => {
            Haptics.selectionAsync();
            setStageCleared(val);
          }}
          trackColor={{ false: COLORS.borderLight, true: `${COLORS.primary}50` }}
          thumbColor={stageCleared ? COLORS.primary : "#6B7280"}
        />
      </View>

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>
          Notes <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder="Any notes about this engagement..."
          placeholderTextColor={COLORS.textDim}
          multiline
          numberOfLines={3}
        />
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.submitBtn}
        onPress={handleSave}
        activeOpacity={0.9}
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? ["#6B7280", "#9CA3AF"] : [COLORS.primary, COLORS.primaryLight, COLORS.primaryLighter]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#000" size="small" />
          ) : (
            <>
              <Target size={20} color="#000" />
              <Text style={styles.submitBtnText}>Save Target</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.cancelBtn}
        onPress={() => setStep("setup")}
        activeOpacity={0.7}
        disabled={saving}
      >
        <Text style={styles.cancelBtnText}>Back to Setup</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
    </ScrollView>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STYLES
// ═══════════════════════════════════════════════════════════════════════════
const styles = StyleSheet.create({
  scrollView: { flex: 1 },
  scrollContent: { paddingHorizontal: 20 },

  // Header
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
    marginTop: 16,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  headerIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: { fontSize: 22, fontWeight: "700", color: COLORS.white },
  headerSubtitle: { fontSize: 13, color: COLORS.textMuted, marginTop: 1 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },
  closeBtnText: { fontSize: 18, color: COLORS.textMuted },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.card,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textMuted,
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Distance
  distanceCategory: { marginBottom: 16 },
  distanceCategoryHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  distanceCategoryLabel: { fontSize: 13, fontWeight: "600", color: COLORS.text },
  distanceCategoryRange: { fontSize: 11, color: COLORS.textDim },
  distanceChipsRow: { flexDirection: "row", gap: 8 },
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
  distanceChipText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
  distanceChipTextSelected: { color: COLORS.white },

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
  cardIconBoxActive: { backgroundColor: COLORS.primary },
  cardHeaderText: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "600", color: COLORS.white },
  cardHint: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },

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
  timeUnit: { fontSize: 14, color: COLORS.textMuted, marginLeft: 8 },

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
  toggleLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  toggleTitle: { fontSize: 15, fontWeight: "600", color: COLORS.white },
  toggleHint: { fontSize: 12, color: COLORS.textDim, marginTop: 1 },

  // Notes
  notesSection: { marginBottom: 24 },
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
  submitBtn: { borderRadius: 14, overflow: "hidden", marginBottom: 12 },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 54,
    gap: 10,
  },
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#000" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
});

export default TacticalTargetFlow;
