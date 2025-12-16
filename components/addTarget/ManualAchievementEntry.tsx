import { useColors } from "@/hooks/ui/useColors";
import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { ArrowLeft, Minus, Plus, Trophy } from "lucide-react-native";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE CATEGORIES (for optional distance selection)
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
  min: number;
  max: number;
  onChange: (value: number) => void;
  label: string;
  sublabel?: string;
  showPercentage?: boolean;
  percentageOf?: number;
}

const Stepper = React.memo(function Stepper({
  value,
  min,
  max,
  onChange,
  label,
  sublabel,
  showPercentage = false,
  percentageOf,
}: StepperProps) {
  const colors = useColors();
  
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

  const percentage = useMemo(() => {
    if (!showPercentage || !percentageOf || percentageOf === 0) return null;
    return Math.round((value / percentageOf) * 100);
  }, [showPercentage, percentageOf, value]);

  const getPercentageColor = () => {
    if (!percentage) return colors.textMuted;
    if (percentage >= 80) return COLORS.primary;
    if (percentage >= 50) return COLORS.warning;
    return COLORS.danger;
  };

  return (
    <View style={styles.stepperContainer}>
      <Text style={[styles.stepperLabel, { color: colors.textMuted }]}>{label}</Text>
      {sublabel && <Text style={[styles.stepperSublabel, { color: colors.textMuted }]}>{sublabel}</Text>}
      
      <View style={styles.stepperRow}>
        <TouchableOpacity
          style={[
            styles.stepperBtn, 
            { backgroundColor: colors.card, borderColor: colors.border },
            value <= min && styles.stepperBtnDisabled
          ]}
          onPress={handleDecrement}
          disabled={value <= min}
          activeOpacity={0.7}
        >
          <Minus size={28} color={value <= min ? colors.textMuted : colors.text} strokeWidth={2.5} />
        </TouchableOpacity>

        <View style={styles.stepperValueContainer}>
          <View style={[
            styles.stepperValueRing,
            { backgroundColor: colors.card, borderColor: colors.border },
            showPercentage && percentage !== null && {
              borderColor: getPercentageColor(),
              backgroundColor: `${getPercentageColor()}15`,
            },
          ]}>
            <Text style={[styles.stepperValue, { color: colors.text }]}>{value}</Text>
            {showPercentage && percentageOf && (
              <Text style={[styles.stepperMax, { color: colors.textMuted }]}>/ {percentageOf}</Text>
            )}
          </View>
          {percentage !== null && (
            <Text style={[styles.stepperPercentage, { color: getPercentageColor() }]}>
              {percentage}% accuracy
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[
            styles.stepperBtn, 
            { backgroundColor: colors.card, borderColor: colors.border },
            value >= max && styles.stepperBtnDisabled
          ]}
          onPress={handleIncrement}
          disabled={value >= max}
          activeOpacity={0.7}
        >
          <Plus size={28} color={value >= max ? colors.textMuted : colors.text} strokeWidth={2.5} />
        </TouchableOpacity>
      </View>

      {/* Quick select */}
      {showPercentage && percentageOf && (
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }, value === 0 && styles.quickBtnActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(0); }}
          >
            <Text style={[styles.quickText, { color: colors.textMuted }, value === 0 && styles.quickTextActive]}>None</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }, value === Math.floor(percentageOf / 2) && styles.quickBtnActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(Math.floor(percentageOf / 2)); }}
          >
            <Text style={[styles.quickText, { color: colors.textMuted }, value === Math.floor(percentageOf / 2) && styles.quickTextActive]}>Half</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: colors.card }, value === percentageOf && styles.quickBtnActive]}
            onPress={() => { Haptics.selectionAsync(); onChange(percentageOf); }}
          >
            <Text style={[styles.quickText, { color: colors.textMuted }, value === percentageOf && styles.quickTextActive]}>All</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
});

// ═══════════════════════════════════════════════════════════════════════════
// MANUAL ACHIEVEMENT ENTRY
// Simple form for manually entering bullets + hits for achievement targets
// ═══════════════════════════════════════════════════════════════════════════

interface ManualAchievementEntryProps {
  onSave: (data: { bulletsFired: number; hits: number; distance: number }) => void;
  onBack: () => void;
  saving: boolean;
  defaultDistance?: number;
  lockDistance?: boolean;
  defaultBullets?: number;
  maxBullets?: number;
  lockBullets?: boolean;
}

export const ManualAchievementEntry = React.memo(function ManualAchievementEntry({
  onSave,
  onBack,
  saving,
  defaultDistance = 100,
  lockDistance = false,
  defaultBullets,
  maxBullets = 100,
  lockBullets = false,
}: ManualAchievementEntryProps) {
  const colors = useColors();
  
  // State
  const initialBullets = Math.max(1, Math.min(defaultBullets ?? 5, maxBullets));
  const [bulletsFired, setBulletsFired] = useState(initialBullets);
  const [hits, setHits] = useState(0);
  const [distance, setDistance] = useState(defaultDistance);

  // Keep hits <= bulletsFired
  const handleBulletsChange = useCallback((value: number) => {
    if (lockBullets) return;
    setBulletsFired(value);
    if (hits > value) {
      setHits(value);
    }
  }, [hits, lockBullets]);

  const handleHitsChange = useCallback((value: number) => {
    setHits(Math.min(value, bulletsFired));
  }, [bulletsFired]);

  const handleSave = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onSave({ bulletsFired, hits, distance });
  }, [bulletsFired, hits, distance, onSave]);

  const accuracy = bulletsFired > 0 ? Math.round((hits / bulletsFired) * 100) : 0;

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: colors.background }]}
      contentContainerStyle={styles.scrollContent}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <ArrowLeft size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Manual Entry</Text>
          <View style={styles.headerMeta}>
            <Trophy size={14} color={colors.primary} />
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
              Achievement Target
            </Text>
          </View>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Distance Selection */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Distance</Text>
        {DISTANCE_CATEGORIES.map((category) => (
          <View key={category.label} style={styles.distanceCategory}>
            <View style={styles.distanceCategoryHeader}>
              <Text style={[styles.distanceCategoryLabel, { color: colors.text }]}>{category.label}</Text>
              <Text style={[styles.distanceCategoryRange, { color: colors.textMuted }]}>{category.range}</Text>
            </View>
            <View style={styles.distanceChipsRow}>
              {category.distances.map((dist) => (
                <TouchableOpacity
                  key={dist}
                  style={[
                    styles.distanceChip,
                    { backgroundColor: colors.card, borderColor: 'transparent' },
                    distance === dist && styles.distanceChipSelected,
                  ]}
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
                      { color: colors.textMuted },
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

      {/* Bullets Fired Stepper */}
      <View style={[styles.stepperSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Stepper
          value={bulletsFired}
          min={1}
          max={maxBullets}
          onChange={(v) => handleBulletsChange(v)}
          label="Rounds Fired"
        />
        {/* Quick select for bullets */}
        <View style={styles.bulletsQuickRow}>
          {[5, 10, 20, 30].map((num) => (
            <TouchableOpacity
              key={num}
              style={[
                styles.bulletsQuickBtn, 
                { backgroundColor: colors.secondary },
                bulletsFired === num && styles.bulletsQuickBtnActive
              ]}
              onPress={() => { 
                if (lockBullets) return;
                Haptics.selectionAsync(); 
                handleBulletsChange(Math.min(num, maxBullets)); 
              }}
              disabled={lockBullets}
            >
              <Text style={[
                styles.bulletsQuickText, 
                { color: colors.textMuted },
                bulletsFired === num && styles.bulletsQuickTextActive
              ]}>
                {num}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Hits Stepper */}
      <View style={[styles.stepperSection, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Stepper
          value={hits}
          min={0}
          max={bulletsFired}
          onChange={handleHitsChange}
          label="Hits on Target"
          sublabel={`Out of ${bulletsFired} rounds fired`}
          showPercentage
          percentageOf={bulletsFired}
        />
      </View>

      {/* Summary Card */}
      <View style={[styles.summaryCard, { backgroundColor: `${colors.primary}10`, borderColor: `${colors.primary}20` }]}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Distance</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{distance}m</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: `${colors.primary}30` }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Rounds</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{bulletsFired}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: `${colors.primary}30` }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Hits</Text>
            <Text style={[styles.summaryValue, { color: colors.text }]}>{hits}</Text>
          </View>
          <View style={[styles.summaryDivider, { backgroundColor: `${colors.primary}30` }]} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryLabel, { color: colors.textMuted }]}>Accuracy</Text>
            <Text style={[styles.summaryValue, { color: colors.primary }]}>{accuracy}%</Text>
          </View>
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButton}
        onPress={handleSave}
        activeOpacity={0.9}
        disabled={saving}
      >
        <LinearGradient
          colors={saving ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.saveButtonGradient}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={styles.saveButtonText}>Save Result</Text>
            </>
          )}
        </LinearGradient>
      </TouchableOpacity>

      <TouchableOpacity style={styles.cancelButton} onPress={onBack} activeOpacity={0.7} disabled={saving}>
        <Text style={[styles.cancelButtonText, { color: colors.textMuted }]}>Back</Text>
      </TouchableOpacity>

      <View style={{ height: 30 }} />
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
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  headerMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  headerSubtitle: {
    fontSize: 13,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Section
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Distance
  distanceCategory: {
    marginBottom: 12,
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
  },
  distanceCategoryRange: {
    fontSize: 11,
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
    alignItems: "center",
    borderWidth: 1.5,
  },
  distanceChipSelected: {
    backgroundColor: `${COLORS.primary}20`,
    borderColor: COLORS.primary,
  },
  distanceChipText: {
    fontSize: 14,
    fontWeight: "600",
  },
  distanceChipTextSelected: {
    color: COLORS.white,
  },

  // Stepper Section
  stepperSection: {
    borderRadius: 20,
    padding: 24,
    marginBottom: 16,
    borderWidth: 1,
  },
  stepperContainer: {
    alignItems: "center",
    paddingVertical: 8,
  },
  stepperLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  stepperSublabel: {
    fontSize: 13,
    marginBottom: 16,
  },
  stepperRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 24,
  },
  stepperBtn: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  stepperBtnDisabled: {
    opacity: 0.4,
  },
  stepperValueContainer: {
    alignItems: "center",
  },
  stepperValueRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  stepperValue: {
    fontSize: 36,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  stepperMax: {
    fontSize: 13,
    marginTop: -2,
  },
  stepperPercentage: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: "500",
  },

  // Quick select
  quickRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  quickBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  quickBtnActive: {
    backgroundColor: `${COLORS.primary}25`,
  },
  quickText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickTextActive: {
    color: COLORS.primary,
  },

  // Bullets quick select
  bulletsQuickRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginTop: 16,
  },
  bulletsQuickBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  bulletsQuickBtnActive: {
    backgroundColor: `${COLORS.primary}30`,
  },
  bulletsQuickText: {
    fontSize: 13,
    fontWeight: "600",
  },
  bulletsQuickTextActive: {
    color: COLORS.primary,
  },

  // Summary
  summaryCard: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryDivider: {
    width: 1,
    height: 32,
    marginHorizontal: 4,
  },
  summaryLabel: {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 2,
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
    color: "#fff",
  },
  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
