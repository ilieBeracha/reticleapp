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
    pagePad: {
      padding: spacing,
      paddingBottom: spacing * 2,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      //   paddingHorizontal: spacing,
      //   paddingVertical: spacing,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    iconButton: {
      width: 44,
      height: 44,
      alignItems: "center",
      justifyContent: "center",
    },
    headerTitle: {
      fontSize: 18,
      fontWeight: "600",
    },

    // Main Image Section - Takes up most of the screen
    imageContainer: {
      marginBottom: 32, // Match BulletDetectionEditor
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
      fontSize: 18,
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
      padding: spacing,
      marginBottom: spacing * 2,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: "600",
      marginBottom: spacing,
      textAlign: "center",
    },
    quadrantGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing,
    },
    quadrantCard: {
      flex: 1,
      minWidth: "45%",
      backgroundColor: colors.background,
      borderRadius: radius,
      padding: spacing,
      borderWidth: 1,
      borderColor: colors.border,
    },
    quadrantHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: spacing / 2,
      gap: 8,
    },
    quadrantLabel: {
      fontSize: 14,
      fontWeight: "600",
    },
    quadrantStats: {
      flexDirection: "row",
      justifyContent: "space-between",
    },
    quadrantStat: {
      alignItems: "center",
    },
    quadrantStatValue: {
      fontSize: 16,
      fontWeight: "700",
    },
    quadrantStatLabel: {
      fontSize: 11,
      fontWeight: "500",
      marginTop: 2,
    },

    // Action Buttons
    actionButtons: {
      gap: spacing,
    },
    primaryButton: {
      borderRadius: radius,
      overflow: "hidden",
    },
    primaryButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing,
      paddingHorizontal: spacing * 2,
      gap: 8,
    },
    primaryButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "600",
    },
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing,
      paddingHorizontal: spacing * 2,
      borderRadius: radius,
      borderWidth: 1,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
  });
};

export type ResultsStyles = ReturnType<typeof makeResultsStyles>;
