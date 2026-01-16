import { PAPER_TYPE } from "@/constants";
import { addTargetWithPaperResult, addTargetWithTacticalResult } from "@/services/sessionService";
import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from "@/theme/colors";
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
  Ruler,
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
  disabled?: boolean;
}

const Stepper = React.memo(function Stepper({
  value,
  onChange,
  min = 1,
  max = 100,
  label,
  unit,
  disabled = false,
}: StepperProps) {
  const handleDecrement = useCallback(() => {
    if (disabled) return;
    if (value > min) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [disabled, value, min, onChange]);

  const handleIncrement = useCallback(() => {
    if (disabled) return;
    if (value < max) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value + 1);
    }
  }, [disabled, value, max, onChange]);

  return (
    <View style={stepperStyles.container}>
      <Text style={stepperStyles.label}>{label}</Text>
      <View style={stepperStyles.row}>
        <TouchableOpacity
          style={[stepperStyles.btn, (disabled || value <= min) && stepperStyles.btnDisabled]}
          onPress={handleDecrement}
          disabled={disabled || value <= min}
          activeOpacity={0.7}
        >
          <Minus size={24} color={value <= min ? COLORS.textDim : COLORS.white} />
        </TouchableOpacity>

        <View style={stepperStyles.valueContainer}>
          <Text style={stepperStyles.value}>{value}</Text>
          {unit && <Text style={stepperStyles.unit}>{unit}</Text>}
        </View>

        <TouchableOpacity
          style={[stepperStyles.btn, (disabled || value >= max) && stepperStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={disabled || value >= max}
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
              if (disabled) return;
              Haptics.selectionAsync();
              onChange(num);
            }}
            disabled={disabled}
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
// HITS STEPPER (CIRCULAR) - Simple hits-only mode
// ═══════════════════════════════════════════════════════════════════════════
interface HitsStepperProps {
  value: number;
  onChange: (value: number) => void;
  /** Maximum allowed hits (drill limit). If undefined, no limit. */
  max?: number;
}

const HitsStepper = React.memo(function HitsStepper({
  value,
  onChange,
  max,
}: HitsStepperProps) {
  const atMax = max !== undefined && value >= max;
  
  const handleDecrement = useCallback(() => {
    if (value > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onChange(value - 1);
    }
  }, [value, onChange]);

  const handleIncrement = useCallback(() => {
    if (max !== undefined && value >= max) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onChange(value + 1);
  }, [value, onChange, max]);

  return (
    <View style={hitsStyles.container}>
      <Text style={hitsStyles.label}>HITS ON TARGET</Text>
      <Text style={hitsStyles.sublabel}>How many rounds hit?</Text>

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
          <View style={[hitsStyles.valueRing, value > 0 && hitsStyles.valueRingGood]}>
            <Text style={hitsStyles.value}>{value}</Text>
            <Text style={hitsStyles.maxLabel}>{max ? `/ ${max}` : 'hits'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={[hitsStyles.btn, atMax && hitsStyles.btnDisabled]}
          onPress={handleIncrement}
          disabled={atMax}
          activeOpacity={0.7}
        >
          <Plus size={28} color={atMax ? COLORS.textDim : COLORS.white} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Quick select - filter to show only options <= max */}
      <View style={hitsStyles.quickRow}>
        {[1, 3, 5, 10, 15].filter(num => max === undefined || num <= max).map((num) => (
          <TouchableOpacity
            key={num}
            style={[hitsStyles.quickBtn, value === num && hitsStyles.quickBtnActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(num); }}
          >
            <Text style={[hitsStyles.quickText, value === num && hitsStyles.quickTextActive]}>{num}</Text>
          </TouchableOpacity>
        ))}
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
  value: {
    fontSize: 36,
    fontWeight: "700",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  maxLabel: { fontSize: 13, color: COLORS.textDim, marginTop: -2 },
  quickRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  quickBtn: {
    paddingHorizontal: 16,
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
  lockDistance?: boolean;
  lockBullets?: boolean;
  /** When true, shows group size (cm) input instead of hits counter */
  isGrouping?: boolean;
  showTimeInput?: boolean;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function TacticalTargetFlow({
  sessionId,
  defaultDistance = 25,
  defaultBullets = 10,
  lockDistance = false,
  lockBullets = false,
  isGrouping = false,
  showTimeInput = true,
  onComplete,
  onCancel,
}: TacticalTargetFlowProps) {
  // For engagement (non-grouping): skip directly to results
  // For grouping: show setup only if distance/bullets not locked
  const setupLocked = lockDistance && lockBullets;
  const skipSetup = !isGrouping || setupLocked; // Engagement always skips setup
  const [step, setStep] = useState<FlowStep>(skipSetup ? "results" : "setup");
  const [saving, setSaving] = useState(false);

  // Setup state
  const [distance, setDistance] = useState(defaultDistance);
  const [bullets, setBullets] = useState(defaultBullets);

  // Results state
  const [hits, setHits] = useState(0);
  const [groupSizeCm, setGroupSizeCm] = useState("");  // For grouping mode
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
      Alert.alert("Invalid Bullets", "Please enter a valid number of bullets.");
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

    if (!isGrouping && hits <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Missing Hits", "Please enter the number of hits.");
      return;
    }

    if (isGrouping && !groupSizeCm) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Missing Group Size", "Please enter the group size in cm.");
      return;
    }

    setSaving(true);

    try {
      if (isGrouping) {
        // For grouping: Use paper target with dispersion
        await addTargetWithPaperResult({
          session_id: sessionId,
          distance_m: distance,
          lane_number: null,
          planned_shots: bullets,
          paper_type: PAPER_TYPE.GROUPING,
          bullets_fired: bullets,
          dispersion_cm: parseFloat(groupSizeCm),
          result_notes: notes || null,
        });
      } else {
        // For engagement: Use tactical target with hits only
        // Cap hits to drill limit, but bullets_fired = planned shots (user fired all)
        const cappedHits = Math.min(hits, bullets);
        await addTargetWithTacticalResult({
          session_id: sessionId,
          distance_m: distance,
          lane_number: null,
          planned_shots: bullets,
          bullets_fired: bullets, // User fired all planned shots
          hits: cappedHits, // Cap hits to drill limit
          is_stage_cleared: stageCleared,
          time_seconds: time ? parseFloat(time) : null,
          result_notes: notes || null,
        });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (onComplete) {
        onComplete();
      } else {
        router.back();
      }
    } catch (error: any) {
      console.error("Failed to add target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
  }, [sessionId, distance, bullets, hits, groupSizeCm, isGrouping, time, stageCleared, notes, onComplete]);

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
              {isGrouping ? (
                <Target size={24} color={COLORS.primary} />
              ) : (
                <Crosshair size={24} color={COLORS.primary} />
              )}
            </View>
            <View>
              <Text style={styles.headerTitle}>{isGrouping ? 'Grouping Target' : 'Tactical Target'}</Text>
              <Text style={styles.headerSubtitle}>{isGrouping ? 'Manual group size entry' : 'Manual hit logging'}</Text>
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
                      if (lockDistance) return;
                      Haptics.selectionAsync();
                      setDistance(dist);
                    }}
                    disabled={lockDistance}
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

        {/* Bullets Stepper */}
        <View style={styles.section}>
          <Stepper
            label={isGrouping ? "Shots in Group" : "Bullets to Fire"}
            value={bullets}
            onChange={lockBullets ? () => {} : setBullets}
            min={lockBullets ? bullets : 1}
            max={lockBullets ? bullets : 100}
            unit="bullets"
            disabled={lockBullets}
          />
        </View>

        {/* Continue Button */}
        <TouchableOpacity style={styles.submitBtn} onPress={handleContinue} activeOpacity={0.9}>
          <LinearGradient
            colors={[...BUTTON_GRADIENT]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.submitBtnGradient}
          >
            <Text style={styles.submitBtnText}>Enter Results</Text>
            <ChevronRight size={20} color="#fff" />
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
  const canGoBack = isGrouping && !setupLocked;
  
  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={styles.header}>
        {canGoBack ? (
          <TouchableOpacity onPress={() => setStep("setup")} style={styles.backBtn}>
            <ArrowLeft size={20} color={COLORS.white} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Log Results</Text>
          <View style={styles.headerMeta}>
            {isGrouping ? (
              <Target size={14} color={COLORS.primary} />
            ) : (
              <Crosshair size={14} color={COLORS.primary} />
            )}
            <Text style={styles.headerSubtitle}>
              {isGrouping ? `Grouping • ${distance}m • ${bullets} shots` : `Engagement • ${distance}m`}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleClose} style={styles.closeBtn}>
          <Text style={styles.closeBtnText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Hits Stepper OR Group Size Input */}
      {isGrouping ? (
        // GROUPING: Show group size input
        <View style={styles.groupingSection}>
          <View style={styles.groupingHeader}>
            <View style={styles.groupingIconContainer}>
              <Ruler size={24} color={COLORS.primary} />
            </View>
            <Text style={styles.groupingTitle}>Group Size</Text>
            <Text style={styles.groupingSublabel}>Measure shot dispersion</Text>
          </View>
          
          <View style={styles.groupingInputRow}>
            <TextInput
              style={styles.groupingInput}
              value={groupSizeCm}
              onChangeText={setGroupSizeCm}
              placeholder="0.0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <View style={styles.groupingUnitBox}>
              <Text style={styles.groupingUnit}>cm</Text>
            </View>
          </View>
          
          <View style={styles.groupingQuickRow}>
            {[1, 2, 3, 5, 10].map((val) => (
              <TouchableOpacity
                key={val}
                style={[styles.groupingQuickBtn, groupSizeCm === String(val) && styles.groupingQuickBtnActive]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGroupSizeCm(String(val));
                }}
              >
                <Text style={[styles.groupingQuickText, groupSizeCm === String(val) && styles.groupingQuickTextActive]}>
                  {val}cm
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : (
        // ENGAGEMENT: Show simple hits stepper with drill limit as max
        <View style={styles.hitsSection}>
          <HitsStepper value={hits} onChange={setHits} max={bullets} />
        </View>
      )}

      {/* Time Input - for both engagement and grouping in manual mode */}
      {showTimeInput && (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardIconBox}>
              <Timer size={18} color={COLORS.primary} />
            </View>
            <View style={styles.cardHeaderText}>
              <Text style={styles.cardTitle}>{isGrouping ? 'Shot Time' : 'Engagement Time'}</Text>
              <Text style={styles.cardHint}>
                {time ? `${time}s` : 'Optional - how fast?'}
              </Text>
            </View>
          </View>
          
          {/* Time chips */}
          <View style={styles.timeChipsContainer}>
            <TouchableOpacity
              style={[
                styles.timeChip,
                !time && styles.timeChipSelected,
              ]}
              onPress={() => {
                Haptics.selectionAsync();
                setTime("");
              }}
            >
              <Text style={[styles.timeChipText, !time && styles.timeChipTextSelected]}>
                Skip
              </Text>
            </TouchableOpacity>
            {[3, 5, 10, 15, 20, 30].map((seconds) => {
              const isSelected = time === String(seconds);
              return (
                <TouchableOpacity
                  key={seconds}
                  style={[
                    styles.timeChip,
                    isSelected && styles.timeChipSelected,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setTime(String(seconds));
                  }}
                >
                  <Text style={[styles.timeChipText, isSelected && styles.timeChipTextSelected]}>
                    {seconds}s
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
          
          {/* Custom input */}
          <View style={styles.timeCustomRow}>
            <Text style={styles.timeCustomLabel}>Custom:</Text>
            <TextInput
              style={styles.timeCustomInput}
              value={time}
              onChangeText={setTime}
              placeholder="0.0"
              placeholderTextColor={COLORS.textDim}
              keyboardType="decimal-pad"
              returnKeyType="done"
            />
            <Text style={styles.timeCustomUnit}>sec</Text>
          </View>
        </View>
      )}

      {/* Stage Cleared Toggle - only for engagement */}
      {!isGrouping && (
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
      )}

      {/* Notes */}
      <View style={styles.notesSection}>
        <Text style={styles.notesLabel}>
          Notes <Text style={styles.optionalLabel}>(optional)</Text>
        </Text>
        <TextInput
          style={styles.notesInput}
          value={notes}
          onChangeText={setNotes}
          placeholder={isGrouping ? "Any notes about this group..." : "Any notes about this engagement..."}
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
          colors={saving ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Target size={20} color="#fff" />
              <Text style={styles.submitBtnText}>Save Target</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      {canGoBack && (
        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => setStep("setup")}
          activeOpacity={0.7}
          disabled={saving}
        >
          <Text style={styles.cancelBtnText}>Back to Setup</Text>
        </TouchableOpacity>
      )}

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

  // Time Input with Chips
  timeChipsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  timeChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: COLORS.cardHover,
  },
  timeChipSelected: {
    backgroundColor: `${COLORS.primary}25`,
  },
  timeChipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  timeChipTextSelected: {
    color: COLORS.primary,
  },
  timeCustomRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.cardHover,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
  },
  timeCustomLabel: {
    fontSize: 13,
    color: COLORS.textDim,
    marginRight: 8,
  },
  timeCustomInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.white,
    fontVariant: ["tabular-nums"],
  },
  timeCustomUnit: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginLeft: 4,
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

  // Grouping Section
  groupingSection: {
    backgroundColor: COLORS.card,
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
  },
  groupingHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  groupingIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: `${COLORS.primary}20`,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  groupingTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.white,
    marginBottom: 4,
  },
  groupingSublabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  groupingInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  groupingInput: {
    width: 120,
    height: 64,
    backgroundColor: COLORS.cardHover,
    borderRadius: 16,
    fontSize: 32,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  groupingUnitBox: {
    height: 64,
    paddingHorizontal: 16,
    backgroundColor: COLORS.cardHover,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  groupingUnit: {
    fontSize: 20,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  groupingQuickRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  groupingQuickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: COLORS.cardHover,
  },
  groupingQuickBtnActive: {
    backgroundColor: `${COLORS.primary}25`,
  },
  groupingQuickText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  groupingQuickTextActive: {
    color: COLORS.primary,
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
  submitBtnText: { fontSize: 16, fontWeight: "700", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textMuted },
});

export default TacticalTargetFlow;
