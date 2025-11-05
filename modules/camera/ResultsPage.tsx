// ResultsPage.tsx - Completely Refactored for Image Focus
import { useColors } from "@/hooks/ui/useColors";
import { useDetectionStore } from "@/store/detectionStore";
import { QuadrantStats } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BulletDetectionEditor } from "./BulletDetectionEditor";
import {
  makeResultsStyles,
  type ResultsStyles,
  type ThemeColors,
} from "./ResultsPage.styles";

type ColorProps = { colors: ThemeColors; styles: ResultsStyles };

interface ResultsPageProps {
  photoUri: string;
  annotatedImageBase64?: string | null;
  hits: number;
  bulletCount: number;
  onEditCount: () => void;
  onNewScan: () => void;
  isLoading?: boolean;
}

export function ResultsPage({
  photoUri,
  annotatedImageBase64,
  hits,
  bulletCount,
  onEditCount,
  onNewScan,
  isLoading = false,
}: ResultsPageProps) {
  const colors = useColors();
  const styles = makeResultsStyles(colors);
  const [isEditingDetections, setIsEditingDetections] = useState(false);

  const { detections, setDetections, quadrantStatsMm } = useDetectionStore();

  const accuracy = bulletCount > 0 ? Math.round((hits / bulletCount) * 100) : 0;

  return (
    <SafeAreaView style={[styles.page, { backgroundColor: colors.background }]}>
      <Header
        title="Analysis Results"
        colors={colors}
        styles={styles}
        onBack={onEditCount}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image */}
        <View
          style={styles.hero}
          accessibilityRole="image"
          accessibilityLabel="Analysis image hero"
        >
          <Image
            source={
              annotatedImageBase64
                ? { uri: `data:image/jpeg;base64,${annotatedImageBase64}` }
                : { uri: photoUri }
            }
            style={styles.heroImage}
            resizeMode="cover"
          />
        </View>

        {/* Content Padding */}
        <View style={styles.pagePad}>
          {/* Stats Section */}
          <View
            style={[
              styles.statsSection,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.statsHeader}>
              <View
                style={[
                  styles.sectionIconWrapper,
                  { backgroundColor: colors.tint + "15" },
                ]}
              >
                <Ionicons name="stats-chart" size={24} color={colors.tint} />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text
                  style={[styles.sectionTitleLarge, { color: colors.text }]}
                >
                  Performance Summary
                </Text>
                <Text
                  style={[
                    styles.sectionSubtitle,
                    { color: colors.description },
                  ]}
                >
                  Overview of your shooting session
                </Text>
              </View>
            </View>
            <View style={styles.statsGrid}>
              <View
                style={[styles.statCardBelow, { borderColor: colors.border }]}
              >
                <Ionicons
                  name="radio-button-on"
                  size={24}
                  color={colors.tint}
                />
                <Text style={[styles.statValueBelow, { color: colors.text }]}>
                  {hits}
                </Text>
                <Text
                  style={[styles.statLabelBelow, { color: colors.description }]}
                >
                  Hits Detected
                </Text>
              </View>
              <View
                style={[styles.statCardBelow, { borderColor: colors.border }]}
              >
                <Ionicons
                  name="checkmark-circle"
                  size={24}
                  color={colors.tint}
                />
                <Text style={[styles.statValueBelow, { color: colors.text }]}>
                  {accuracy}%
                </Text>
                <Text
                  style={[styles.statLabelBelow, { color: colors.description }]}
                >
                  Accuracy
                </Text>
              </View>
              <View
                style={[styles.statCardBelow, { borderColor: colors.border }]}
              >
                <Ionicons name="ellipse" size={24} color={colors.tint} />
                <Text style={[styles.statValueBelow, { color: colors.text }]}>
                  {bulletCount}
                </Text>
                <Text
                  style={[styles.statLabelBelow, { color: colors.description }]}
                >
                  Total Bullets
                </Text>
              </View>
            </View>
          </View>

          {/* Quadrant Stats - If available */}
          {quadrantStatsMm && (
            <QuadrantStatsSection
              quadrantStats={quadrantStatsMm}
              colors={colors}
              styles={styles}
            />
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <PrimaryButton
              colors={colors}
              styles={styles}
              label="New Scan"
              icon="camera"
              onPress={onNewScan}
            />
            <SecondaryButton
              colors={colors}
              styles={styles}
              label="Edit Bullets"
              icon="create-outline"
              onPress={() => setIsEditingDetections(true)}
            />
          </View>
        </View>
      </ScrollView>

      {/* Bullet Editor Modal */}
      <BulletDetectionEditor
        photoUri={photoUri}
        annotatedImageBase64={annotatedImageBase64}
        detections={detections}
        onDetectionsChange={setDetections}
        visible={isEditingDetections}
        onClose={() => setIsEditingDetections(false)}
        isLoading={isLoading}
      />
    </SafeAreaView>
  );
}

// Quadrant Stats Section Component
function QuadrantStatsSection({
  quadrantStats,
  colors,
  styles,
}: {
  quadrantStats: QuadrantStats;
} & ColorProps) {
  const quadrants = [
    {
      key: "tl" as keyof QuadrantStats,
      label: "Top Left",
      icon: "arrow-up-left",
    },
    {
      key: "tr" as keyof QuadrantStats,
      label: "Top Right",
      icon: "arrow-up-right",
    },
    {
      key: "bl" as keyof QuadrantStats,
      label: "Bottom Left",
      icon: "arrow-down-left",
    },
    {
      key: "br" as keyof QuadrantStats,
      label: "Bottom Right",
      icon: "arrow-down-right",
    },
  ];
  console.log("🎯 Quadrant stats:", quadrantStats);

  return (
    <View
      style={[
        styles.quadrantSection,
        { backgroundColor: colors.cardBackground },
      ]}
    >
      <View style={styles.sectionHeader}>
        <View
          style={[
            styles.sectionIconWrapper,
            { backgroundColor: colors.tint + "15" },
          ]}
        >
          <Ionicons name="grid" size={24} color={colors.tint} />
        </View>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={[styles.sectionTitleLarge, { color: colors.text }]}>
            Quadrant Analysis
          </Text>
          <Text style={[styles.sectionSubtitle, { color: colors.description }]}>
            Detailed breakdown by region
          </Text>
        </View>
      </View>

      <View style={styles.quadrantGrid}>
        {quadrants.map((quadrant) => {
          const stats = quadrantStats[quadrant.key];
          const maxDistance = stats.max_pair.distance_mm;

          return (
            <View
              key={quadrant.key}
              style={[styles.quadrantCard, { borderColor: colors.border }]}
            >
              <View style={styles.quadrantHeader}>
                <View
                  style={[
                    styles.quadrantIconWrapper,
                    { backgroundColor: colors.tint + "15" },
                  ]}
                >
                  <Ionicons
                    name={quadrant.icon as any}
                    size={18}
                    color={colors.tint}
                  />
                </View>
                <Text style={[styles.quadrantLabel, { color: colors.text }]}>
                  {quadrant.label}
                </Text>
              </View>

              <View style={styles.quadrantStatsContainer}>
                <View style={styles.quadrantStatItem}>
                  <Text
                    style={[styles.quadrantStatValue, { color: colors.tint }]}
                  >
                    {stats.count}
                  </Text>
                  <Text
                    style={[
                      styles.quadrantStatLabel,
                      { color: colors.description },
                    ]}
                  >
                    Hits
                  </Text>
                </View>

                {maxDistance && (
                  <View style={styles.quadrantStatItem}>
                    <Text
                      style={[styles.quadrantStatValue, { color: colors.tint }]}
                    >
                      {maxDistance.toFixed(1)}
                    </Text>
                    <Text
                      style={[
                        styles.quadrantStatLabel,
                        { color: colors.description },
                      ]}
                    >
                      Max Dist (mm)
                    </Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
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

function PrimaryButton({
  label,
  icon,
  onPress,
  colors,
  styles,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
} & ColorProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={styles.primaryButton}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <LinearGradient
        colors={[colors.tint, colors.tint + "DD"]}
        style={styles.primaryButtonGradient}
      >
        {icon ? <Ionicons name={icon} size={20} color="white" /> : null}
        <Text style={styles.primaryButtonText}>{label}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SecondaryButton({
  label,
  icon,
  onPress,
  colors,
  styles,
}: {
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
} & ColorProps) {
  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      style={[
        styles.secondaryButton,
        { borderColor: colors.border, backgroundColor: colors.cardBackground },
      ]}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.text} /> : null}
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
