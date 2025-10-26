// PreviewPage.styles.ts
import { StyleSheet } from "react-native";

export type ThemeColors = {
  background: string;
  cardBackground: string;
  tint: string;
  text: string;
  description: string;
  border: string;
};

export const makePreviewStyles = (colors: ThemeColors) => {
  const spacing = 12; // Reduced from 16
  const radius = 12; // Reduced from 16

  return StyleSheet.create({
    // Generic
    page: { flex: 1 },
    pagePad: { padding: spacing, paddingBottom: spacing * 1.5, gap: spacing },
    imageCard: {
      borderRadius: radius,
      padding: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 10,
    },
    card: {
      borderRadius: radius,
      padding: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },

    // Typography - More compact
    titleMd: { fontSize: 16, fontWeight: "600" },
    caption: { fontSize: 12 },
    captionBold: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
    countBig: { fontSize: 40, fontWeight: "800", lineHeight: 44 }, // Reduced from 48

    // Header - More compact
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing,
      paddingTop: spacing,
      paddingBottom: spacing / 2,
    },
    iconButton: {
      width: 40, // Reduced from 44
      height: 40,
      borderRadius: 20,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "transparent",
    },
    headerTitle: {
      flex: 1,
      fontSize: 16, // Reduced from 18
      fontWeight: "600",
      textAlign: "center",
    },

    // Preview - Match ResultsPage styling
    previewImage: {
      width: "100%",
      height: 400, // Match ResultsPage height
      borderRadius: radius,
      backgroundColor: "#111",
    },
    badge: {
      position: "absolute",
      top: spacing + 8,
      right: spacing + 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6, // Reduced from 8
      paddingHorizontal: 12, // Reduced from 14
      paddingVertical: 6, // Reduced from 8
      borderRadius: 16, // Reduced from 20
      backgroundColor: "rgba(0,0,0,0.7)",
    },
    badgeText: { color: "white", fontSize: 12, fontWeight: "700" },
    rowCenter: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10, // Reduced from 12
      marginBottom: spacing / 2,
    },
    circleMd: {
      width: 44, // Reduced from 52
      height: 44,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: spacing / 2,
    },

    stepperRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 16, // Reduced from 18
      marginTop: spacing / 2,
    },
    stepperBtn: {
      width: 48, // Reduced from 56
      height: 48,
      borderRadius: 24,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
    },
    stepperValue: {
      minWidth: 120, // Reduced from 140
      paddingVertical: 12, // Reduced from 14
      paddingHorizontal: 24, // Reduced from 28
      alignItems: "center",
      borderWidth: 2,
      borderStyle: "dashed",
      borderRadius: radius,
    },

    // Input styles
    inputRow: {
      marginTop: spacing,
    },
    inputContainer: {
      gap: 8,
    },
    inputLabel: {
      fontSize: 14,
      fontWeight: "500",
    },
    inputField: {
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: radius,
      borderWidth: 1,
      fontSize: 16,
      fontWeight: "600",
      backgroundColor: "transparent",
    },
    inputWithButton: {
      flexDirection: "row",
      alignItems: "center",
    },
    clearButton: {
      paddingVertical: 12,
      paddingHorizontal: 12,
      borderWidth: 1,
      borderTopRightRadius: radius,
      borderBottomRightRadius: radius,
      borderLeftWidth: 0,
      alignItems: "center",
      justifyContent: "center",
      minWidth: 44,
    },
    targetSizeRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 4,
    },
    sizeButton: {
      flex: 1,
      paddingVertical: 10,
      paddingHorizontal: 12,
      borderRadius: radius,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 40,
    },
    sizeButtonText: {
      fontSize: 14,
      fontWeight: "500",
    },

    // Buttons - More compact
    primaryButton: {
      borderRadius: radius,
      overflow: "hidden",
      marginHorizontal: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 2,
    },
    primaryButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6, // Reduced from 8
      paddingVertical: 14, // Reduced from 16
    },
    primaryButtonText: { color: "white", fontSize: 14, fontWeight: "700" },
  });
};

export type PreviewStyles = ReturnType<typeof makePreviewStyles>;
