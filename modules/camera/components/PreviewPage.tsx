// PreviewPage.tsx
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  Image,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  makePreviewStyles,
  type PreviewStyles,
  type ThemeColors,
} from "./PreviewPage.styles";

type ColorProps = { colors: ThemeColors; styles: PreviewStyles };

interface PreviewPageProps {
  photoUri: string;
  bulletCount: number;
  onBulletCountChange: (count: number) => void;
  isDetecting: boolean;
  onAnalyze: (data: {
    bulletCount: number;
    shooterCount: number;
    targetSize: string;
  }) => void;
  onBack: () => void;
}

export function PreviewPage({
  photoUri,
  bulletCount,
  onBulletCountChange,
  isDetecting,
  onAnalyze,
  onBack,
}: PreviewPageProps) {
  const colors = useColors();
  const styles = makePreviewStyles(colors);

  const [shooterCount, setShooterCount] = useState(1);
  const [targetSize, setTargetSize] = useState<"full" | "1/2" | "1/3" | "1/4">(
    "full"
  );
  const [bulletInput, setBulletInput] = useState(
    bulletCount === 0 ? "" : bulletCount.toString()
  );

  const targetSizeOptions: Array<"full" | "1/2" | "1/3" | "1/4"> = [
    "full",
    "1/2",
    "1/3",
    "1/4",
  ];

  // Sync bulletInput when bulletCount prop changes
  useEffect(() => {
    setBulletInput(bulletCount === 0 ? "" : bulletCount.toString());
  }, [bulletCount]);

  const handleBulletInputChange = (text: string) => {
    setBulletInput(text);
    if (text.trim() === "" || text === "0") {
      onBulletCountChange(0); // Use 0 to indicate no bullets/cancelled
    } else {
      const num = parseInt(text) || 1;
      if (num >= 1 && num <= 25) {
        onBulletCountChange(num);
      }
    }
  };

  const clearBulletInput = () => {
    setBulletInput("");
    onBulletCountChange(0);
  };

  const handleAnalyze = () => {
    const bulletNum = parseInt(bulletInput) || bulletCount;
    onAnalyze({
      bulletCount: bulletNum, // Can be 0 (null)
      shooterCount,
      targetSize,
    });
  };

  const isBulletInputValid = bulletCount > 0;
  const displayBulletInput = bulletCount === 0 ? "" : bulletInput;

  return (
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Header
        title="Preview Target"
        onBack={onBack}
        colors={colors}
        styles={styles}
      />

      <ScrollView
        keyboardDismissMode="on-drag"
        automaticallyAdjustKeyboardInsets={true}
        contentContainerStyle={styles.pagePad}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.imageCard, { backgroundColor: colors.cardBackground }]}
        >
          <Image
            source={{ uri: photoUri }}
            style={styles.previewImage}
            resizeMode="contain"
          />
          <View style={styles.badge}>
            <Ionicons name="checkmark-circle" size={18} color="white" />
            <Text style={styles.badgeText}>Target captured</Text>
          </View>
        </View>

        {/* Session Details */}
        <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
          <View style={styles.rowCenter}>
            <View
              style={[styles.circleMd, { backgroundColor: colors.tint + "20" }]}
            >
              <Ionicons name="document-text" size={24} color={colors.tint} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.titleMd, { color: colors.text }]}>
                Shooting Session Details
              </Text>
              <Text style={[styles.caption, { color: colors.description }]}>
                Enter your shooting session information
              </Text>
            </View>
          </View>

          {/* Bullet Count */}
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Bullets fired
              </Text>
              <View style={styles.inputWithButton}>
                <TextInput
                  style={[
                    styles.inputField,
                    {
                      borderColor: colors.border,
                      color: colors.text,
                      flex: 1,
                      borderTopRightRadius: 0,
                      borderBottomRightRadius: 0,
                      borderRightWidth: 0,
                    },
                  ]}
                  value={displayBulletInput}
                  onChangeText={handleBulletInputChange}
                  keyboardType="numeric"
                  maxLength={2}
                  placeholder="1-25 bullets"
                  placeholderTextColor={colors.description}
                  editable={true}
                />
                <TouchableOpacity
                  style={[
                    styles.clearButton,
                    {
                      backgroundColor: isBulletInputValid
                        ? colors.tint
                        : colors.border,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={clearBulletInput}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="close"
                    size={16}
                    color={isBulletInputValid ? "white" : colors.description}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Shooter Count */}
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Number of shooters
              </Text>
              <TextInput
                style={[
                  styles.inputField,
                  {
                    borderColor: colors.border,
                    color: colors.text,
                    backgroundColor: "transparent",
                  },
                ]}
                value={shooterCount.toString()}
                onChangeText={(text) => {
                  const num = parseInt(text) || 1;
                  if (num >= 1 && num <= 10) {
                    setShooterCount(num);
                  }
                }}
                keyboardType="numeric"
                maxLength={2}
                placeholder="1-10"
                placeholderTextColor={colors.description}
                editable={true}
              />
            </View>
          </View>

          {/* Target Size */}
          <View style={styles.inputRow}>
            <View style={styles.inputContainer}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Target size
              </Text>
              <View style={styles.targetSizeRow}>
                {targetSizeOptions.map((size) => (
                  <TouchableOpacity
                    key={size}
                    style={[
                      styles.sizeButton,
                      {
                        backgroundColor:
                          targetSize === size ? colors.tint : "transparent",
                        borderColor:
                          targetSize === size ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setTargetSize(size)}
                  >
                    <Text
                      style={[
                        styles.sizeButtonText,
                        {
                          color: targetSize === size ? "white" : colors.text,
                        },
                      ]}
                    >
                      {size} page
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </View>

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={handleAnalyze}
          disabled={isDetecting || !isBulletInputValid}
          style={[
            styles.primaryButton,
            (isDetecting || !isBulletInputValid) && { opacity: 0.7 },
          ]}
        >
          <LinearGradient
            colors={[colors.tint, colors.tint + "DD"]}
            style={styles.primaryButtonGradient}
          >
            <Ionicons
              name={isDetecting ? "hourglass-outline" : "scan"}
              size={20}
              color="white"
            />
            <Text style={styles.primaryButtonText}>
              {isDetecting
                ? "Analyzing…"
                : !isBulletInputValid
                ? "Add bullets to continue"
                : "Start Analysis"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// Helper Components
function Header({
  title,
  onBack,
  colors,
  styles,
}: { title: string; onBack?: () => void } & ColorProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack}
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconButton} />
      )}
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <View style={styles.iconButton} />
    </View>
  );
}
