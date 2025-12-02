import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { COLORS, DISTANCE_QUICK_PICKS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DISTANCE INPUT
// Distance selection with quick pick chips and custom input
// ═══════════════════════════════════════════════════════════════════════════

interface DistanceInputProps {
  distance: number;
  onDistanceChange: (distance: number) => void;
}

export const DistanceInput = React.memo(function DistanceInput({
  distance,
  onDistanceChange,
}: DistanceInputProps) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="locate-outline" size={18} color={COLORS.primary} />
        <Text style={styles.title}>Distance to Target</Text>
      </View>
      
      <View style={styles.inputRow}>
        <TextInput
          style={styles.mainInput}
          value={String(distance)}
          onChangeText={(text) => {
            const val = parseInt(text) || 0;
            onDistanceChange(val);
          }}
          placeholder="0"
          placeholderTextColor={COLORS.textDimmer}
          keyboardType="number-pad"
          returnKeyType="done"
          selectTextOnFocus
        />
        <Text style={styles.unit}>meters</Text>
      </View>
      
      <View style={styles.quickPicks}>
        {DISTANCE_QUICK_PICKS.map((d) => (
          <TouchableOpacity
            key={d}
            style={[
              styles.quickChip,
              distance === d && styles.quickChipSelected,
            ]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              onDistanceChange(d);
            }}
            activeOpacity={0.7}
          >
            <Text
              style={[
                styles.quickText,
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
    backgroundColor: "rgba(16, 185, 129, 0.06)",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.15)",
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
    color: COLORS.white,
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  mainInput: {
    flex: 1,
    backgroundColor: COLORS.card,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.white,
    textAlign: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  unit: {
    fontSize: 16,
    color: COLORS.textMuted,
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
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quickChipSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  quickText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.text,
  },
  quickTextSelected: {
    color: "#000",
  },
});

