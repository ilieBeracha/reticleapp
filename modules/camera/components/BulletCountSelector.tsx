import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

interface BulletCountSelectorProps {
  bulletCount: number;
  onBulletCountChange: (count: number) => void;
  onConfirm: () => void;
  visible: boolean;
}

export function BulletCountSelector({
  bulletCount,
  onBulletCountChange,
  onConfirm,
  visible,
}: BulletCountSelectorProps) {
  const colors = useColors();
  const bulletHeight = useSharedValue(getPercentage(bulletCount));

  const animatedStyle = useAnimatedStyle(() => ({
    height: `${bulletHeight.value}%`,
  }));

  useEffect(() => {
    bulletHeight.value = withSpring(getPercentage(bulletCount), {
      damping: 15,
      stiffness: 150,
    });
  }, [bulletCount]);

  const adjustCount = (delta: number) => {
    const newCount = Math.min(10, Math.max(1, bulletCount + delta));
    if (newCount !== bulletCount) {
      onBulletCountChange(newCount);
      bulletHeight.value = withSpring(getPercentage(newCount));
    }
  };

  const handlePreset = (count: number) => {
    onBulletCountChange(count);
    bulletHeight.value = withSpring(getPercentage(count));
  };

  return (
    <BaseBottomSheet visible={visible} onClose={() => {}} snapPoints={["55%"]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          How many bullets did you shoot?
        </Text>

        {/* Counter Section */}
        <View style={styles.selectorContainer}>
          <RoundButton
            icon="remove"
            disabled={bulletCount <= 1}
            onPress={() => adjustCount(-1)}
            colors={colors}
          />

          <View style={styles.bulletBarWrapper}>
            <View style={[styles.bulletBar, { borderColor: colors.border }]}>
              {/* Background grid */}
              {Array.from({ length: 5 }).map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.gridLine,
                    { backgroundColor: colors.description },
                  ]}
                />
              ))}
              {/* Animated Fill */}
              <Animated.View
                style={[animatedStyle, { backgroundColor: colors.tint }]}
              />
            </View>

            <Text style={[styles.countText, { color: colors.text }]}>
              {bulletCount} bullet{bulletCount > 1 ? "s" : ""}
            </Text>
          </View>

          <RoundButton
            icon="add"
            disabled={bulletCount >= 10}
            onPress={() => adjustCount(1)}
            colors={colors}
          />
        </View>

        {/* Preset Buttons */}
        <View style={styles.presetContainer}>
          {[3, 5, 10].map((count) => (
            <PresetButton
              key={count}
              count={count}
              onPress={() => handlePreset(count)}
              colors={colors}
              isSelected={bulletCount === count}
            />
          ))}
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.tint }]}
          onPress={onConfirm}
          activeOpacity={0.85}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

/** Utility */
function getPercentage(count: number) {
  return ((count - 1) / 9) * 80 + 20;
}

/** Round icon button */
function RoundButton({
  icon,
  disabled,
  onPress,
  colors,
}: {
  icon: "add" | "remove";
  disabled: boolean;
  onPress: () => void;
  colors: any;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        {
          backgroundColor: disabled ? colors.surface : colors.tint,
          borderColor: colors.border,
        },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <Ionicons
        name={icon}
        size={22}
        color={disabled ? colors.description : colors.text}
      />
    </TouchableOpacity>
  );
}

/** Preset button */
function PresetButton({
  count,
  onPress,
  colors,
  isSelected,
}: {
  count: number;
  onPress: () => void;
  colors: any;
  isSelected: boolean;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.presetButton,
        {
          backgroundColor: isSelected ? colors.tint : colors.background,
          borderColor: isSelected ? colors.tint : colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Ionicons
        name="ellipse"
        size={14}
        color={isSelected ? colors.background : colors.tint}
      />
      <Text
        style={[
          styles.presetText,
          { color: isSelected ? colors.background : colors.text },
        ]}
      >
        {count}
      </Text>
    </TouchableOpacity>
  );
}

/** Styles */
const styles = StyleSheet.create({
  container: { paddingHorizontal: 24, paddingTop: 20, zIndex: 10000 },
  title: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 28,
  },
  selectorContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 24,
    marginBottom: 28,
  },
  button: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    elevation: 3,
  },
  bulletBarWrapper: {
    alignItems: "center",
    flex: 1,
    maxWidth: 80,
  },
  bulletBar: {
    width: 32,
    height: 200,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-end",
    borderWidth: 2,
  },
  gridLine: {
    position: "absolute",
    width: "100%",
    height: 1,
    opacity: 0.3,
  },
  countText: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 14,
    textAlign: "center",
  },
  presetContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 24,
  },
  presetButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  presetText: { fontSize: 16, fontWeight: "600", marginTop: 6 },
  continueButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  continueButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
