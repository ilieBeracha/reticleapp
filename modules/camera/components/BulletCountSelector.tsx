// BulletCountSelector.tsx - Simplified with additional questions
import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface BulletCountSelectorProps {
  bulletCount: number;
  onBulletCountChange: (count: number) => void;
  onConfirm: (data: { bulletCount: number; shooterCount: number; targetSize: string }) => void;
  visible: boolean;
  initialShooterCount?: number;
  initialTargetSize?: "full" | "1/2" | "1/3" | "1/4";
}

export function BulletCountSelector({
  bulletCount,
  onBulletCountChange,
  onConfirm,
  visible,
  initialShooterCount = 1,
  initialTargetSize = "full",
}: BulletCountSelectorProps) {
  const colors = useColors();
  const [shooterCount, setShooterCount] = useState(initialShooterCount);
  const [targetSize, setTargetSize] = useState<"full" | "1/2" | "1/3" | "1/4">(initialTargetSize);

  const adjustBulletCount = (delta: number) => {
    const newCount = Math.min(25, Math.max(1, bulletCount + delta));
    if (newCount !== bulletCount) {
      onBulletCountChange(newCount);
    }
  };

  const adjustShooterCount = (delta: number) => {
    const newCount = Math.min(10, Math.max(1, shooterCount + delta));
    if (newCount !== shooterCount) {
      setShooterCount(newCount);
    }
  };

  const handlePreset = (count: number) => {
    onBulletCountChange(count);
  };

  const targetSizeOptions: Array<"full" | "1/2" | "1/3" | "1/4"> = ["full", "1/2", "1/3", "1/4"];

  return (
    <BaseBottomSheet visible={visible} onClose={() => {}} snapPoints={["70%"]}>
      <View style={styles.container}>
        <Text style={[styles.title, { color: colors.text }]}>
          Shooting Session Details
        </Text>

        {/* Bullets Question */}
        <View style={styles.section}>
          <Text style={[styles.question, { color: colors.text }]}>
            How many bullets did you shoot?
          </Text>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={[
                styles.adjustButton,
                {
                  backgroundColor: bulletCount <= 1 ? colors.border : colors.tint,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => adjustBulletCount(-1)}
              disabled={bulletCount <= 1}
            >
              <Ionicons
                name="remove"
                size={16}
                color={bulletCount <= 1 ? colors.description : "white"}
              />
            </TouchableOpacity>

            <View style={[styles.countDisplay, { borderColor: colors.border }]}>
              <Text style={[styles.countText, { color: colors.text }]}>
                {bulletCount}
              </Text>
              <Text style={[styles.countLabel, { color: colors.description }]}>
                {bulletCount === 1 ? "bullet" : "bullets"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.adjustButton,
                {
                  backgroundColor: bulletCount >= 25 ? colors.border : colors.tint,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => adjustBulletCount(1)}
              disabled={bulletCount >= 25}
            >
              <Ionicons
                name="add"
                size={16}
                color={bulletCount >= 25 ? colors.description : "white"}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.presetContainer}>
            {[5, 10, 15, 20, 25].map((count) => (
              <TouchableOpacity
                key={count}
                style={[
                  styles.presetChip,
                  {
                    backgroundColor: bulletCount === count ? colors.tint : colors.cardBackground,
                    borderColor: bulletCount === count ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => handlePreset(count)}
              >
                <Text
                  style={[
                    styles.presetText,
                    { color: bulletCount === count ? "white" : colors.text },
                  ]}
                >
                  {count}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Shooters Question */}
        <View style={styles.section}>
          <View style={styles.questionHeader}>
            <Ionicons name="people" size={20} color={colors.tint} />
            <Text style={[styles.question, { color: colors.text }]}>
              How many shooters?
            </Text>
          </View>
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={[
                styles.adjustButton,
                {
                  backgroundColor: shooterCount <= 1 ? colors.border : colors.tint,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => adjustShooterCount(-1)}
              disabled={shooterCount <= 1}
            >
              <Ionicons
                name="remove"
                size={16}
                color={shooterCount <= 1 ? colors.description : "white"}
              />
            </TouchableOpacity>

            <View style={[styles.countDisplay, { borderColor: colors.border }]}>
              <Text style={[styles.countText, { color: colors.text }]}>
                {shooterCount}
              </Text>
              <Text style={[styles.countLabel, { color: colors.description }]}>
                {shooterCount === 1 ? "shooter" : "shooters"}
              </Text>
            </View>

            <TouchableOpacity
              style={[
                styles.adjustButton,
                {
                  backgroundColor: shooterCount >= 10 ? colors.border : colors.tint,
                  borderColor: colors.border,
                },
              ]}
              onPress={() => adjustShooterCount(1)}
              disabled={shooterCount >= 10}
            >
              <Ionicons
                name="add"
                size={16}
                color={shooterCount >= 10 ? colors.description : "white"}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Target Size Question */}
        <View style={styles.section}>
          <View style={styles.questionHeader}>
            <Ionicons name="resize" size={20} color={colors.tint} />
            <Text style={[styles.question, { color: colors.text }]}>
              Target size?
            </Text>
          </View>
          <View style={styles.targetSizeContainer}>
            {targetSizeOptions.map((size) => (
              <TouchableOpacity
                key={size}
                style={[
                  styles.sizeChip,
                  {
                    backgroundColor: targetSize === size ? colors.tint : colors.cardBackground,
                    borderColor: targetSize === size ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setTargetSize(size)}
              >
                <Text
                  style={[
                    styles.sizeText,
                    { color: targetSize === size ? "white" : colors.text },
                  ]}
                >
                  {size} page
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, { backgroundColor: colors.tint }]}
          onPress={() => onConfirm({
            bulletCount,
            shooterCount,
            targetSize,
          })}
        >
          <Text style={styles.continueButtonText}>Start Analysis</Text>
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  question: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 12,
  },
  questionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  counterContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 12,
  },
  adjustButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  countDisplay: {
    minWidth: 80,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    backgroundColor: "transparent",
  },
  countText: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 28,
  },
  countLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginTop: 2,
  },
  presetContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 36,
  },
  presetText: {
    fontSize: 14,
    fontWeight: "600",
  },
  targetSizeContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  sizeChip: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 40,
  },
  sizeText: {
    fontSize: 14,
    fontWeight: "500",
  },
  continueButton: {
    width: "100%",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  continueButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
