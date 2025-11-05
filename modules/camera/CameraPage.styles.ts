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
      width: width * 0.82,
      height: height * 0.52,
      borderWidth: 3,
      borderColor: "rgba(255,255,255,0.75)",
      borderStyle: "solid",
      borderRadius: 24,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
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
      width: 60,
      height: 60,
      borderRadius: 30,
      borderWidth: 2.5,
      borderColor: "rgba(255,255,255,0.95)",
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: "rgba(255,255,255,0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 4,
    },
    shutterBtn: {
      width: 88,
      height: 88,
      borderRadius: 44,
      justifyContent: "center",
      alignItems: "center",
      borderWidth: 5,
      borderColor: "rgba(255,255,255,0.5)",
      backgroundColor: "rgba(255,255,255,0.25)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 8,
      elevation: 8,
    },
    shutterInner: {
      width: 66,
      height: 66,
      borderRadius: 33,
      backgroundColor: "white",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 4,
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
      top: 80,
      left: spacing * 2,
      right: spacing * 2,
      paddingVertical: 12,
      paddingHorizontal: 16,
      borderRadius: 16,
      backgroundColor: "rgba(0,0,0,0.7)",
      alignItems: "center",
      borderWidth: 1,
      borderColor: "rgba(255,255,255,0.15)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 4,
    },
    infoBannerText: {
      color: "white",
      fontSize: 13,
      fontWeight: "600",
      letterSpacing: 0.2,
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
