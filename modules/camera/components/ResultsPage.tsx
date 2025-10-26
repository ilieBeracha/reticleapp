// ResultsPage.tsx - Completely Refactored for Image Focus
import { useColors } from "@/hooks/useColors";
import { useDetectionStore } from "@/store/detectionStore";
import { QuadrantStats } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { Image, ScrollView, Text, TouchableOpacity, View } from "react-native";
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
    <View style={[styles.page, { backgroundColor: colors.background }]}>
      <Header
        title="Analysis Results"
        colors={colors}
        styles={styles}
        onBack={onEditCount}
      />

      <ScrollView
        contentContainerStyle={styles.pagePad}
        showsVerticalScrollIndicator={false}
      >
        {/* Main Image - Takes up most of the screen */}
        <View style={styles.imageContainer}>
          <View
            style={[
              styles.imageCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            {annotatedImageBase64 ? (
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${annotatedImageBase64}`,
                }}
                style={styles.mainImage}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: photoUri }}
                style={styles.mainImage}
                resizeMode="contain"
              />
            )}

            {/* Image overlay with basic stats */}
            <View style={styles.imageOverlay}>
              <View style={styles.overlayStats}>
                <Text style={[styles.overlayStatValue, { color: colors.tint }]}>
                  {hits}
                </Text>
                <Text style={[styles.overlayStatLabel, { color: colors.text }]}>
                  Hits
                </Text>
              </View>
              <View style={styles.overlayStats}>
                <Text style={[styles.overlayStatValue, { color: colors.tint }]}>
                  {accuracy}%
                </Text>
                <Text style={[styles.overlayStatLabel, { color: colors.text }]}>
                  Accuracy
                </Text>
              </View>
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
        <View style={styles.actionButtons}>
          <SecondaryButton
            colors={colors}
            styles={styles}
            label="Edit Count"
            icon="create-outline"
            onPress={onEditCount}
          />
          <SecondaryButton
            colors={colors}
            styles={styles}
            label="Edit Bullets"
            icon="create-outline"
            onPress={() => setIsEditingDetections(true)}
          />
          <PrimaryButton
            colors={colors}
            styles={styles}
            label="New Scan"
            icon="camera"
            onPress={onNewScan}
          />
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
    </View>
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

  return (
    <View
      style={[
        styles.quadrantSection,
        { backgroundColor: colors.cardBackground },
      ]}
    >
      <Text style={[styles.sectionTitle, { color: colors.text }]}>
        Quadrant Analysis (mm)
      </Text>

      <View style={styles.quadrantGrid}>
        {quadrants.map((quadrant) => {
          const stats = quadrantStats[quadrant.key];
          const maxDistance = stats.max_pair.distance_mm;

          return (
            <View key={quadrant.key} style={styles.quadrantCard}>
              <View style={styles.quadrantHeader}>
                <Ionicons
                  name={quadrant.icon as any}
                  size={16}
                  color={colors.tint}
                />
                <Text style={[styles.quadrantLabel, { color: colors.text }]}>
                  {quadrant.label}
                </Text>
              </View>

              <View style={styles.quadrantStats}>
                <View style={styles.quadrantStat}>
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
                  <View style={styles.quadrantStat}>
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
    >
      {icon ? <Ionicons name={icon} size={20} color={colors.text} /> : null}
      <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
