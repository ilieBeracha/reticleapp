import { useColors } from "@/hooks/ui/useColors";
import { BUTTON_GRADIENT, BUTTON_GRADIENT_DISABLED } from "@/theme/colors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { Camera, Edit3, Focus, Target, Trophy, X } from "lucide-react-native";
import React, { useCallback } from "react";
import {
    ActivityIndicator,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, InputMethod, TargetType } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// TARGET FORM
// Now structured as Grouping vs Achievement with input method selection
// ═══════════════════════════════════════════════════════════════════════════

interface TargetFormProps {
  targetType: TargetType;
  onTargetTypeChange: (type: TargetType) => void;
  inputMethod: InputMethod;
  onInputMethodChange: (method: InputMethod) => void;
  onSubmit: () => void;
  onClose: () => void;
  saving: boolean;
}

export const TargetForm = React.memo(function TargetForm({
  targetType,
  onTargetTypeChange,
  inputMethod,
  onInputMethodChange,
  onSubmit,
  onClose,
  saving,
}: TargetFormProps) {
  const colors = useColors();

  const handleTargetTypeChange = useCallback((type: TargetType) => {
    Haptics.selectionAsync();
    onTargetTypeChange(type);
  }, [onTargetTypeChange]);

  const handleInputMethodChange = useCallback((method: InputMethod) => {
    Haptics.selectionAsync();
    onInputMethodChange(method);
  }, [onInputMethodChange]);

  // Determine button text based on selection
  const getButtonText = () => {
    if (targetType === "grouping") {
      return "Scan Target";
    }
    if (inputMethod === "scan") {
      return "Scan Target";
    }
    return "Enter Results";
  };

  const getButtonIcon = () => {
    if (targetType === "grouping" || inputMethod === "scan") {
      return <Camera size={20} color="#fff" />;
    }
    return <Edit3 size={20} color="#fff" />;
  };

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
            <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>Choose your training goal</Text>
          </View>
        </View>
        <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.card }]}>
          <X size={20} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Target Type Selection: Grouping vs Achievement */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Training Goal</Text>
        <View style={styles.typeRow}>
          {/* Grouping Target */}
          <TouchableOpacity
            style={[
              styles.typeCard, 
              { backgroundColor: colors.card, borderColor: 'transparent' },
              targetType === "grouping" && styles.typeCardSelected
            ]}
            onPress={() => handleTargetTypeChange("grouping")}
            activeOpacity={0.8}
          >
            <View style={[styles.typeIconBox, targetType === "grouping" && styles.typeIconBoxSelected]}>
              <Focus size={22} color={targetType === "grouping" ? "#000" : colors.textMuted} />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeText, { color: colors.text }, targetType === "grouping" && styles.typeTextSelected]}>
                Grouping
              </Text>
              <Text style={[styles.typeHint, { color: colors.textMuted }]}>Measure shot consistency</Text>
            </View>
            {targetType === "grouping" && (
              <View style={styles.typeCheck}>
                <Ionicons name="checkmark" size={14} color="#000" />
              </View>
            )}
          </TouchableOpacity>

          {/* Achievement Target */}
          <TouchableOpacity
            style={[
              styles.typeCard, 
              { backgroundColor: colors.card, borderColor: 'transparent' },
              targetType === "achievement" && styles.typeCardSelected
            ]}
            onPress={() => handleTargetTypeChange("achievement")}
            activeOpacity={0.8}
          >
            <View style={[styles.typeIconBox, targetType === "achievement" && styles.typeIconBoxSelected]}>
              <Trophy size={22} color={targetType === "achievement" ? "#000" : colors.textMuted} />
            </View>
            <View style={styles.typeContent}>
              <Text style={[styles.typeText, { color: colors.text }, targetType === "achievement" && styles.typeTextSelected]}>
                Achievement
              </Text>
              <Text style={[styles.typeHint, { color: colors.textMuted }]}>Track hits & accuracy</Text>
            </View>
            {targetType === "achievement" && (
              <View style={styles.typeCheck}>
                <Ionicons name="checkmark" size={14} color="#000" />
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Grouping - Scan Only CTA */}
      {targetType === "grouping" && (
        <View style={styles.infoSection}>
          <View style={[styles.infoCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}25` }]}>
            <View style={[styles.infoIconRing, { backgroundColor: `${colors.primary}15` }]}>
              <View style={[styles.infoIconInner, { backgroundColor: `${colors.primary}20` }]}>
                <Focus size={32} color={colors.primary} />
              </View>
            </View>
            <Text style={[styles.infoTitle, { color: colors.text }]}>Measure Your Grouping</Text>
            <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
              Scan your paper target to measure shot dispersion and consistency. 
              No hit percentage—just pure grouping analysis.
            </Text>
            <View style={styles.infoFeatures}>
              <View style={styles.infoFeature}>
                <Ionicons name="analytics" size={14} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.text }]}>Dispersion (cm)</Text>
              </View>
              <View style={styles.infoFeature}>
                <Ionicons name="locate" size={14} color={colors.primary} />
                <Text style={[styles.infoFeatureText, { color: colors.text }]}>Group size</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Achievement - Input Method Selection */}
      {targetType === "achievement" && (
        <>
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>Input Method</Text>
            <View style={styles.methodRow}>
              {/* Scan Option */}
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  { backgroundColor: colors.card, borderColor: 'transparent' },
                  inputMethod === "scan" && styles.methodCardSelected
                ]}
                onPress={() => handleInputMethodChange("scan")}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, inputMethod === "scan" && styles.methodIconBoxSelected]}>
                  <Camera size={20} color={inputMethod === "scan" ? "#000" : colors.textMuted} />
                </View>
                <Text style={[styles.methodText, { color: colors.text }, inputMethod === "scan" && styles.methodTextSelected]}>
                  Scan
                </Text>
                <Text style={[styles.methodHint, { color: colors.textMuted }]}>AI detection</Text>
              </TouchableOpacity>

              {/* Manual Option */}
              <TouchableOpacity
                style={[
                  styles.methodCard,
                  { backgroundColor: colors.card, borderColor: 'transparent' },
                  inputMethod === "manual" && styles.methodCardSelected
                ]}
                onPress={() => handleInputMethodChange("manual")}
                activeOpacity={0.8}
              >
                <View style={[styles.methodIconBox, inputMethod === "manual" && styles.methodIconBoxSelected]}>
                  <Edit3 size={20} color={inputMethod === "manual" ? "#000" : colors.textMuted} />
                </View>
                <Text style={[styles.methodText, { color: colors.text }, inputMethod === "manual" && styles.methodTextSelected]}>
                  Manual
                </Text>
                <Text style={[styles.methodHint, { color: colors.textMuted }]}>Enter counts</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Achievement Info Card */}
          <View style={styles.infoSection}>
            <View style={[styles.infoCard, { backgroundColor: `${colors.primary}08`, borderColor: `${colors.primary}25` }]}>
              <View style={[styles.infoIconRing, { backgroundColor: `${colors.primary}15` }]}>
                <View style={[styles.infoIconInner, { backgroundColor: `${colors.primary}20` }]}>
                  {inputMethod === "scan" ? (
                    <Camera size={32} color={colors.primary} />
                  ) : (
                    <Edit3 size={32} color={colors.primary} />
                  )}
                </View>
              </View>
              <Text style={[styles.infoTitle, { color: colors.text }]}>
                {inputMethod === "scan" ? "Scan Your Target" : "Enter Your Results"}
              </Text>
              <Text style={[styles.infoDesc, { color: colors.textMuted }]}>
                {inputMethod === "scan" 
                  ? "AI will detect bullet holes and calculate your hit percentage automatically."
                  : "Manually enter the number of rounds fired and hits to track your accuracy."
                }
              </Text>
              <View style={styles.infoFeatures}>
                <View style={styles.infoFeature}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
                  <Text style={[styles.infoFeatureText, { color: colors.text }]}>Hit count</Text>
                </View>
                <View style={styles.infoFeature}>
                  <Ionicons name="pie-chart" size={14} color={colors.primary} />
                  <Text style={[styles.infoFeatureText, { color: colors.text }]}>Hit percentage</Text>
                </View>
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
          colors={saving ? [...BUTTON_GRADIENT_DISABLED] : [...BUTTON_GRADIENT]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.submitBtnGradient}
        >
          {saving ? (
            <ActivityIndicator color="#fff" size="small" />
          ) : (
            <>
              {getButtonIcon()}
              <Text style={styles.submitBtnText}>{getButtonText()}</Text>
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
    paddingVertical: 16,
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
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "700",
  },
  headerSubtitle: {
    fontSize: 13,
    marginTop: 1,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
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
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },

  // Target Type Cards
  typeRow: {
    gap: 10,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
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
  },
  typeTextSelected: {
    color: COLORS.white,
  },
  typeHint: {
    fontSize: 12,
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

  // Input Method Cards (for Achievement)
  methodRow: {
    flexDirection: "row",
    gap: 10,
  },
  methodCard: {
    flex: 1,
    alignItems: "center",
    borderRadius: 14,
    padding: 16,
    gap: 8,
    borderWidth: 1.5,
  },
  methodCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: `${COLORS.primary}15`,
  },
  methodIconBox: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: COLORS.cardHover,
    alignItems: "center",
    justifyContent: "center",
  },
  methodIconBoxSelected: {
    backgroundColor: COLORS.primary,
  },
  methodText: {
    fontSize: 14,
    fontWeight: "600",
  },
  methodTextSelected: {
    color: COLORS.white,
  },
  methodHint: {
    fontSize: 11,
  },

  // Info Section (replaces paperSection)
  infoSection: {
    marginBottom: 24,
  },
  infoCard: {
    alignItems: "center",
    borderRadius: 20,
    padding: 28,
    borderWidth: 1,
  },
  infoIconRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  infoIconInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 8,
  },
  infoDesc: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 16,
  },
  infoFeatures: {
    flexDirection: "row",
    gap: 20,
  },
  infoFeature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoFeatureText: {
    fontSize: 12,
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
    color: "#fff",
  },
  cancelBtn: {
    alignItems: "center",
    paddingVertical: 12,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
