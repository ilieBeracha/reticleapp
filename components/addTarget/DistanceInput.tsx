import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { DISTANCE_QUICK_PICKS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE INPUT
// Distance selection with quick pick chips and custom input
// ═══════════════════════════════════════════════════════════════════════════

interface DistanceInputProps {
  distance: number;
  onDistanceChange: (distance: number) => void;
  disabled?: boolean;
}

export const DistanceInput = React.memo(function DistanceInput({
  distance,
  onDistanceChange,
  disabled = false,
}: DistanceInputProps) {
  const colors = useColors();
  
  return (
    <View style={[styles.container, { backgroundColor: colors.primary + '10', borderColor: colors.primary + '25' }]}>
      <View style={styles.header}>
        <Ionicons name={disabled ? "lock-closed-outline" : "locate-outline"} size={18} color={colors.primary} />
        <Text style={[styles.title, { color: colors.text }]}>Distance to Target</Text>
      </View>
      
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.mainInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          value={String(distance)}
          onChangeText={(text) => {
            if (disabled) return;
            const val = parseInt(text) || 0;
            onDistanceChange(val);
          }}
          placeholder="0"
          placeholderTextColor={colors.textMuted}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus={!disabled}
          editable={!disabled}
        />
        <Text style={[styles.unit, { color: colors.textMuted }]}>meters</Text>
      </View>
      
      <View style={styles.quickPicks}>
        {DISTANCE_QUICK_PICKS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.quickChip,
              { backgroundColor: colors.card, borderColor: colors.border },
              distance === d && { backgroundColor: colors.primary, borderColor: colors.primary },
            ]}
            onPress={() => {
              if (disabled) return;
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDistanceChange(d);
            }}
            disabled={disabled}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickText,
                { color: colors.text },
                distance === d && styles.quickTextSelected,
              ]}
            >
              {d}m
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: "600",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  mainInput: {
    flex: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
    borderWidth: 1,
  },
  unit: {
    fontSize: 16,
    fontWeight: "500",
  },
  quickPicks: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  quickChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickText: {
    fontSize: 13,
    fontWeight: "600",
  },
  quickTextSelected: {
    color: "#000",
  },
});

