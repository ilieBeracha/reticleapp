// CameraPage.styles.ts
import { Dimensions, StyleSheet } from "react-native";

const { width, height } = Dimensions.get("window");

export type ThemeColors = {
  background: string;
  cardBackground: string;
  tint: string;
  text: string;
  description: string;
  border: string;
};

export const makeCameraStyles = (colors: ThemeColors) => {
  const spacing = 12; // Reduced from 16
  const radius = 12; // Reduced from 16

  return StyleSheet.create({
    // Generic
    fullCenter: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      padding: spacing * 1.5, // Reduced padding
    },
    page: { flex: 1 },
    card: {
      borderRadius: radius,
      padding: spacing,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },

    // Typography - More compact
    titleLg: { fontSize: 22, fontWeight: "700", textAlign: "center" },
    titleMd: { fontSize: 16, fontWeight: "600" },
    body: { fontSize: 14, lineHeight: 20 },
    centerCol: { alignItems: "center", gap: spacing },

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

    // Camera - More compact
    cameraRoot: { flex: 1, backgroundColor: "black" },
    camera: { flex: 1, width, height },
    cameraOverlay: {
      position: "absolute",
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      justifyContent: "center",
      alignItems: "center",
    },
    frameGuide: {
      width: width * 0.8,
      height: height * 0.5,
      borderWidth: 2,
      borderColor: "rgba(255,255,255,0.55)",
      borderStyle: "dashed",
      borderRadius: 16, // Reduced from 20
    },

    captureBar: {
      position: "absolute",
      bottom: 50, // Reduced from 60
      left: 0,
      right: 0,
      flexDirection: "row",
      justifyContent: "space-around",
      alignItems: "center",
      paddingHorizontal: spacing * 1.5,
    },
    galleryBtn: {
      width: 64, // Reduced from 72
      height: 64,
      borderRadius: 32,
      borderWidth: 2, // Reduced from 3
      borderColor: "rgba(255,255,255,0.9)",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.12)",
    },
    shutterBtn: {
      width: 84, // Reduced from 96
      height: 84,
      borderRadius: 42,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 4, // Reduced from 5
      borderColor: "rgba(255,255,255,0.35)",
      backgroundColor: "rgba(255,255,255,0.2)",
    },
    shutterInner: {
      width: 60, // Reduced from 70
      height: 60,
      borderRadius: 30,
      backgroundColor: "white",
    },
    placeholderBtn: {
      width: 64, // Reduced from 72
      height: 64,
      justifyContent: "center",
      alignItems: "center",
    },
    placeholderDot: {
      width: 6, // Reduced from 8
      height: 6,
      borderRadius: 3,
      backgroundColor: "rgba(255,255,255,0.6)",
    },

    infoBanner: {
      position: "absolute",
      top: 80, // Reduced from 100
      left: spacing,
      right: spacing,
      padding: spacing,
      borderRadius: radius,
      backgroundColor: "rgba(0,0,0,0.6)",
      alignItems: "center",
    },
    infoBannerText: { color: "white", fontSize: 13, fontWeight: "600" },

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

    circleLg: {
      width: 100, // Reduced from 120
      height: 100,
      borderRadius: 50,
      alignItems: "center",
      justifyContent: "center",
    },
  });
};

export type CameraStyles = ReturnType<typeof makeCameraStyles>;
