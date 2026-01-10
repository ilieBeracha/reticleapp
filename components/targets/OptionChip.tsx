import React from "react";
import { StyleSheet, Text, TouchableOpacity } from "react-native";
import { COLORS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// OPTION CHIP
// A simple selectable chip/pill button
// ═══════════════════════════════════════════════════════════════════════════

interface OptionChipProps {
  label: string;
  selected: boolean;
  onPress: () => void;
  size?: "small" | "medium";
}

export const OptionChip = React.memo(function OptionChip({
  label,
  selected,
  onPress,
  size = "medium",
}: OptionChipProps) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        selected && styles.chipSelected,
        size === "small" && styles.chipSmall,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text
        style={[
          styles.chipText,
          selected && styles.chipTextSelected,
          size === "small" && styles.chipTextSmall,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.cardHover,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  chipSmall: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
  },
  chipSelected: {
    backgroundColor: COLORS.primary,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.text,
  },
  chipTextSmall: {
    fontSize: 13,
  },
  chipTextSelected: {
    color: "#000",
  },
});

