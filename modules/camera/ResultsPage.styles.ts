// ResultsPage.styles.ts - Completely Refactored for Image Focus
import { StyleSheet } from "react-native";

export type ThemeColors = {
  background: string;
  cardBackground: string;
  text: string;
  description: string;
  tint: string;
  border: string;
};

export const makeResultsStyles = (colors: ThemeColors) => {
  const spacing = 16;
  const radius = 12;

  return StyleSheet.create({
    page: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
    },
    pagePad: {
      paddingHorizontal: spacing,
      paddingBottom: spacing * 2,
    },
    hero: {
      position: "relative",
      borderRadius: 0,
      overflow: "hidden",
      marginBottom: spacing * 1.5,
    },
    heroImage: {
      width: "100%",
      aspectRatio: 3 / 4,
      minHeight: 300,
    },
    statsSection: {
      borderRadius: radius,
      padding: spacing * 1.25,
      marginBottom: spacing * 1.5,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    statsHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing,
    },
    statsGrid: {
      flexDirection: "row",
      gap: spacing * 0.875,
    },
    statCardBelow: {
      flex: 1,
      padding: spacing,
      borderRadius: 10,
      alignItems: "center",
      gap: 8,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    statValueBelow: {
      fontSize: 26,
      fontWeight: "700",
    },
    statLabelBelow: {
      fontSize: 12,
      fontWeight: "500",
      textAlign: "center",
    },
    actionButtonsContainer: {
      flexDirection: "row",
      gap: spacing,
      marginTop: spacing * 1.5,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing,
      paddingVertical: spacing,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconButton: {
      width: 40,
      height: 40,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 16,
      fontWeight: "600",
    },

    // Main Image Section - Takes up most of the screen
    imageContainer: {
      marginBottom: spacing * 2, // Match BulletDetectionEditor
    },
    imageCard: {
      borderRadius: radius,
      //   padding: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    mainImage: {
      width: "100%",
      height: 400, // Fixed height for consistency
      borderRadius: radius,
    },
    imageOverlay: {
      maxHeight: 500,
      width: "100%",
      position: "absolute",
      top: spacing + 8,
      right: spacing + 8,
      flexDirection: "row",
      gap: spacing,
    },
    overlayStats: {
      alignItems: "center",
      backgroundColor: "rgba(0,0,0,0.7)",
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
    },
    overlayStatValue: {
      fontSize: 16,
      fontWeight: "700",
    },
    overlayStatLabel: {
      fontSize: 12,
      fontWeight: "500",
      opacity: 0.8,
    },

    // Quadrant Stats Section
    quadrantSection: {
      borderRadius: radius,
      padding: spacing * 1.25,
      backgroundColor: colors.cardBackground,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing,
    },
    sectionIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: 10,
      alignItems: "center",
      justifyContent: "center",
    },
    sectionTitleLarge: {
      fontSize: 17,
      fontWeight: "600",
      marginBottom: 2,
    },
    sectionSubtitle: {
      fontSize: 13,
      fontWeight: "400",
    },
    quadrantGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing * 0.875,
    },
    quadrantCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.background,
      borderRadius: 10,
      padding: spacing,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quadrantHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing * 0.75,
      gap: 10,
    },
    quadrantIconWrapper: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    quadrantLabel: {
      fontSize: 14,
      fontWeight: "600",
    },
    quadrantStatsContainer: {
      flexDirection: "row",
      justifyContent: "space-between",
      gap: spacing * 0.625,
    },
    quadrantStatItem: {
      flex: 1,
      alignItems: "center",
      padding: spacing * 0.625,
      borderRadius: 8,
      backgroundColor: colors.cardBackground,
    },
    quadrantStatValue: {
      fontSize: 16,
      fontWeight: "700",
      marginBottom: 2,
    },
    quadrantStatLabel: {
      fontSize: 11,
      fontWeight: "500",
    },

    // Action Buttons
    actionButtons: {
      gap: spacing,
    },
    primaryButton: {
      flex: 1,
      borderRadius: radius,
      overflow: "hidden",
    },
    primaryButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: spacing * 1.25,
      gap: 8,
    },
    primaryButtonText: {
      color: "white",
      fontSize: 15,
      fontWeight: "600",
    },
    secondaryButton: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: 14,
      paddingHorizontal: spacing * 1.25,
      borderRadius: radius,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.cardBackground,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 15,
      fontWeight: "600",
    },
  });
};

export type ResultsStyles = ReturnType<typeof makeResultsStyles>;
