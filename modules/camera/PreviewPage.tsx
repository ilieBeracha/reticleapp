// PreviewPage.tsx
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetTextInput,
} from "@gorhom/bottom-sheet";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
    sessionName: string;
    sessionDetails: string;
  }) => void;
  onSessionDetailsChange: (data: {
    sessionName: string;
    sessionDetails: string;
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
  const [sheetIndex, setSheetIndex] = useState(1);
  const snapPoints = ["28%", "50%", "85%"] as const;
  const [isConfirmed, setIsConfirmed] = useState(false);
  const insets = useSafeAreaInsets();

  const [sessionName, setSessionName] = useState("");
  const [sessionDetails, setSessionDetails] = useState("");

  const [bulletInput, setBulletInput] = useState(
    bulletCount === 0 ? "" : bulletCount.toString()
  );

  // Sync bulletInput when bulletCount prop changes
  useEffect(() => {
    setBulletInput(bulletCount > 0 ? bulletCount.toString() : "0");
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
      sessionName,
      sessionDetails,
    });
  };

  const isBulletInputValid = bulletCount > 0;
  const displayBulletInput = bulletCount === 0 ? "" : bulletInput;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.page, { backgroundColor: "black" }]}>
        {/* Full-bleed image background */}
        <View
          style={styles.imageFull}
          pointerEvents="none"
          accessibilityRole="image"
          accessibilityLabel="Target preview image"
        >
          <Image
            source={{ uri: photoUri }}
            style={styles.previewImageFull}
            resizeMode="cover"
          />
        </View>

        {/* Top header overlay - Fixed Position */}
        <View style={styles.headerContainer}>
          <SafeAreaView>
            <Header
              title="Preview Photo"
              onBack={onBack}
              colors={colors}
              styles={styles}
            />
          </SafeAreaView>
        </View>

        {/* Photo Verification Overlay - Fixed Position */}
        {!isConfirmed && (
          <>
            {/* Bottom action buttons - Fixed Position */}
            <View style={styles.bottomActionsWrapper}>
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.9)", "rgba(0,0,0,0.95)"]}
                style={styles.bottomGradient}
              />
              <SafeAreaView>
                <View style={styles.actionButtonsRow}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      styles.retakeButton,
                      { borderColor: colors.border },
                    ]}
                    onPress={onBack}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Retake photo"
                  >
                    <Ionicons
                      name="camera-outline"
                      size={22}
                      color={colors.text}
                    />
                    <Text
                      style={[styles.actionButtonText, { color: colors.text }]}
                    >
                      Retake
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.confirmButton]}
                    onPress={() => setIsConfirmed(true)}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="Confirm photo"
                  >
                    <LinearGradient
                      colors={[colors.tint, colors.tint + "DD"]}
                      style={styles.confirmButtonGradient}
                    >
                      <Ionicons name="checkmark" size={22} color="white" />
                      <Text style={styles.confirmButtonText}>Continue</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </SafeAreaView>
            </View>
          </>
        )}

        {/* Draggable Bottom Sheet Form (after confirmation) */}
        {isConfirmed && (
          <BottomSheet
            index={1}
            snapPoints={["50%", "60%"] as unknown as string[]}
            onChange={setSheetIndex}
            enablePanDownToClose={false}
            handleIndicatorStyle={{ backgroundColor: colors.border }}
            backgroundStyle={{
              backgroundColor: colors.cardBackground,
              borderRadius: 16,
            }}
          >
            <BottomSheetScrollView
              contentContainerStyle={{
                padding: 16,
                paddingBottom: 24 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
            >
              {/* Section Title */}
              <Text style={[styles.formTitle, { color: colors.text }]}>
                Session Details
              </Text>

              {/* Session Name Field */}
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>
                  Session Name
                </Text>
                <Text
                  style={[styles.inputSubtext, { color: colors.description }]}
                >
                  Optional
                </Text>
                <BottomSheetTextInput
                  style={[
                    styles.modernInput,
                    {
                      borderColor: sessionName ? colors.tint : colors.border,
                      color: colors.text,
                      backgroundColor: colors.background,
                    },
                  ]}
                  value={sessionName}
                  onChangeText={setSessionName}
                  placeholder="e.g., Practice Session"
                  placeholderTextColor={colors.description}
                  editable={true}
                  accessibilityLabel="Session name input"
                />
              </View>

              {/* Bullet Count Field */}
              <View style={styles.inputGroup}>
                <View style={styles.labelRow}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Bullets Fired
                  </Text>
                  <View
                    style={[
                      styles.requiredDot,
                      { backgroundColor: colors.tint },
                    ]}
                  />
                </View>
                <Text
                  style={[styles.inputSubtext, { color: colors.description }]}
                >
                  Enter the number of bullets you fired (1-25)
                </Text>
                <View style={styles.bulletRow}>
                  <BottomSheetTextInput
                    style={[
                      styles.bulletInputModern,
                      {
                        borderColor: isBulletInputValid
                          ? colors.tint
                          : colors.border,
                        color: colors.text,
                        backgroundColor: colors.background,
                      },
                    ]}
                    value={displayBulletInput}
                    onChangeText={handleBulletInputChange}
                    keyboardType="numeric"
                    returnKeyType="done"
                    maxLength={2}
                    placeholder="0"
                    placeholderTextColor={colors.description}
                    editable={true}
                    accessibilityLabel="Bullets fired input"
                  />
                  {isBulletInputValid && (
                    <TouchableOpacity
                      style={[
                        styles.clearBtn,
                        { backgroundColor: colors.background },
                      ]}
                      onPress={clearBulletInput}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Clear bullets"
                    >
                      <Ionicons name="close" size={18} color={colors.tint} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Analyze Button */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={handleAnalyze}
                disabled={isDetecting || !isBulletInputValid}
                style={[
                  styles.analyzeBtn,
                  (isDetecting || !isBulletInputValid) &&
                    styles.analyzeBtnDisabled,
                ]}
                accessibilityRole="button"
                accessibilityLabel={
                  isDetecting
                    ? "Analyzing image"
                    : !isBulletInputValid
                    ? "Add bullets to continue"
                    : "Start analysis"
                }
              >
                <LinearGradient
                  colors={
                    isDetecting || !isBulletInputValid
                      ? [colors.border, colors.border]
                      : [colors.tint, colors.tint + "DD"]
                  }
                  style={styles.analyzeBtnGradient}
                >
                  <Ionicons
                    name={isDetecting ? "hourglass-outline" : "scan-outline"}
                    size={20}
                    color="white"
                  />
                  <Text style={styles.analyzeBtnText}>
                    {isDetecting
                      ? "Analyzing…"
                      : !isBulletInputValid
                      ? "Enter Bullet Count"
                      : "Start Analysis"}
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </BottomSheetScrollView>
          </BottomSheet>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// Helper Components
function Header({
  title,
  onBack,
  colors,
  styles,
}: {
  title: string;
  onBack?: () => void;
} & ColorProps) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <TouchableOpacity
          style={styles.iconButton}
          onPress={onBack}
          activeOpacity={0.8}
          accessibilityRole="button"
          accessibilityLabel="Back"
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
