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
    pagePad: { padding: spacing, paddingBottom: spacing * 2 },
    imageFull: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 0,
    },
    previewImageFull: {
      width: "100%",
      height: "100%",
    },
    imageCard: {
      borderRadius: radius,
      //   padding: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      marginBottom: 10,
    },
    badgeFloating: {
      position: "absolute",
      top: spacing + 8,
      right: spacing + 8,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 60,
      borderRadius: 16,
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
      backgroundColor: "rgba(0,0,0,0.45)",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.12)",
    },
    headerTitle: {
      flex: 1,
      fontSize: 16, // Reduced from 18
      fontWeight: "600",
      textAlign: "center",
    },
    headerContainer: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      zIndex: 5,
    },
    topGradient: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      height: 180,
    },

    // Preview - Match ResultsPage styling
    previewImage: {
      width: "100%",
      height: 500, // Match ResultsPage height
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
    secondaryButton: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      paddingVertical: spacing + 2,
      paddingHorizontal: spacing * 2,
      borderRadius: radius,
      borderWidth: 1,
      gap: 8,
    },
    secondaryButtonText: {
      fontSize: 14,
      fontWeight: "600",
    },

    // Bottom form sheet overlay
    formSheet: {
      position: "absolute",
      left: 0,
      right: 0,
      bottom: 0,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      borderTopWidth: 1,
      paddingBottom: spacing * 2,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      marginTop: 8,
      marginBottom: 8,
    },
    sheetContent: {
      padding: spacing,
      paddingBottom: spacing * 2,
    },
    confirmContainer: {
      position: "absolute",
      left: spacing,
      right: spacing,
      bottom: spacing,
    },
    confirmRow: {
      flexDirection: "row",
      gap: spacing,
    },

    // New verification overlay styles
    verificationOverlay: {
      position: "absolute",
      top: 100,
      left: 0,
      right: 0,
      paddingHorizontal: spacing * 2,
      alignItems: "center",
      zIndex: 5,
      pointerEvents: "box-none",
    },
    verificationCard: {
      borderRadius: 16,
      padding: spacing * 2,
      overflow: "hidden",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.1)",
    },
    verificationHeader: {
      alignItems: "center",
      gap: spacing,
    },
    verificationIconWrapper: {
      width: 64,
      height: 64,
      borderRadius: 32,
      alignItems: "center",
      justifyContent: "center",
    },
    verificationTitle: {
      fontSize: 20,
      fontWeight: "700",
      textAlign: "center",
    },
    verificationSubtitle: {
      fontSize: 14,
      textAlign: "center",
    },
    bottomActionsWrapper: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    bottomGradient: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      height: 150,
    },
    actionButtonsRow: {
      flexDirection: "row",
      gap: spacing,
      paddingHorizontal: spacing * 2,
      paddingBottom: spacing * 2,
    },
    actionButton: {
      flex: 1,
      borderRadius: 14,
      overflow: "hidden",
      minHeight: 56,
      justifyContent: "center",
      alignItems: "center",
      flexDirection: "row",
      gap: 8,
    },
    retakeButton: {
      backgroundColor: colors.cardBackground,
      borderWidth: 1.5,
    },
    confirmButton: {
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    confirmButtonGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 16,
      paddingHorizontal: 24,
      width: "100%",
    },
    actionButtonText: {
      fontSize: 16,
      fontWeight: "600",
    },
    confirmButtonText: {
      color: "white",
      fontSize: 16,
      fontWeight: "700",
    },

    // Modern Form Styles
    formTitle: {
      fontSize: 22,
      fontWeight: "700",
      marginBottom: 24,
    },
    inputGroup: {
      marginBottom: 20,
    },
    inputLabel: {
      fontSize: 15,
      fontWeight: "600",
      marginBottom: 4,
    },
    labelRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      marginBottom: 4,
    },
    requiredDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
    },
    inputSubtext: {
      fontSize: 13,
      marginBottom: 10,
    },
    modernInput: {
      padding: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      fontSize: 16,
      fontWeight: "500",
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
    },
    bulletInputModern: {
      flex: 1,
      padding: 14,
      borderRadius: 10,
      borderWidth: 1.5,
      fontSize: 18,
      fontWeight: "700",
      textAlign: "center",
    },
    clearBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
    },
    analyzeBtn: {
      borderRadius: 12,
      overflow: "hidden",
      marginTop: 8,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
    },
    analyzeBtnDisabled: {
      opacity: 0.5,
    },
    analyzeBtnGradient: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      paddingVertical: 14,
    },
    analyzeBtnText: {
      color: "white",
      fontSize: 15,
      fontWeight: "700",
    },
  });
};

export type PreviewStyles = ReturnType<typeof makePreviewStyles>;
