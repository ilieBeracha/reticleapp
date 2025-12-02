import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { COLORS } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CUSTOM INPUT
// A styled text input with optional unit suffix
// ═══════════════════════════════════════════════════════════════════════════

interface CustomInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  unit?: string;
  keyboardType?: "default" | "number-pad" | "decimal-pad";
}

export const CustomInput = React.memo(function CustomInput({
  value,
  onChangeText,
  placeholder,
  unit,
  keyboardType = "number-pad",
}: CustomInputProps) {
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={COLORS.textDimmer}
        keyboardType={keyboardType}
        returnKeyType="done"
      />
      {unit && <Text style={styles.unit}>{unit}</Text>}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
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
  unit: {
    fontSize: 14,
    color: COLORS.textDim,
    marginLeft: 8,
  },
});

