import { Ionicons } from "@expo/vector-icons";
import { CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import {
    ActivityIndicator,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { COLORS, Step } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// CAMERA FLOW
// Full-screen modal for camera capture, preview, and analysis
// ═══════════════════════════════════════════════════════════════════════════

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface CameraFlowProps {
  step: Step;
  capturedUri: string | null;
  cameraRef: React.RefObject<CameraView | null>;
  onCapture: () => void;
  onPickImage: () => void;
  onSubmitPhoto: () => void;
  onRetake: () => void;
  onClose: () => void;
}

export const CameraFlow = React.memo(function CameraFlow({
  step,
  capturedUri,
  cameraRef,
  onCapture,
  onPickImage,
  onSubmitPhoto,
  onRetake,
  onClose,
}: CameraFlowProps) {
  const isVisible = step === "camera" || step === "preview" || step === "analyzing";

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={() => (step === "camera" ? onClose() : undefined)}
    >
      {/* Camera View */}
      {step === "camera" && (
        <View style={styles.cameraContainer}>
          <CameraView ref={cameraRef} style={styles.camera} facing="back">
            <View style={styles.cameraOverlay}>
              {/* Top Bar */}
              <View style={styles.topBar}>
                <TouchableOpacity onPress={onClose} style={styles.backBtn}>
                  <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.title}>Scan Target</Text>
                <View style={{ width: 40 }} />
              </View>

              {/* Guide Frame */}
              <View style={styles.guideFrame}>
                <View style={[styles.guideCorner, styles.cornerTL]} />
                <View style={[styles.guideCorner, styles.cornerTR]} />
                <View style={[styles.guideCorner, styles.cornerBL]} />
                <View style={[styles.guideCorner, styles.cornerBR]} />
              </View>

              {/* Instructions */}
              <View style={styles.instructions}>
                <View style={styles.instructionBadge}>
                  <Ionicons name="scan-outline" size={16} color={COLORS.primary} />
                  <Text style={styles.instructionText}>Align target within frame</Text>
                </View>
              </View>

              {/* Bottom Bar */}
              <View style={styles.bottomBar}>
                <TouchableOpacity style={styles.galleryBtn} onPress={onPickImage} activeOpacity={0.7}>
                  <Ionicons name="images-outline" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.captureBtn} onPress={onCapture} activeOpacity={0.8}>
                  <View style={styles.captureBtnInner} />
                </TouchableOpacity>

                <View style={{ width: 50 }} />
              </View>
            </View>
          </CameraView>
        </View>
      )}

      {/* Preview View */}
      {step === "preview" && capturedUri && (
        <View style={styles.previewContainer}>
          <Image source={{ uri: capturedUri }} style={styles.previewImage} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(0,0,0,0.6)", "transparent", "transparent", "rgba(0,0,0,0.8)"]}
            style={styles.previewGradient}
          >
            <View style={styles.topBar}>
              <TouchableOpacity onPress={onRetake} style={styles.backBtn}>
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <Text style={styles.title}>Review Photo</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={{ flex: 1 }} />

            <View style={styles.previewActions}>
              <Text style={styles.previewHint}>Make sure the target is clearly visible</Text>
              <TouchableOpacity style={styles.submitBtn} onPress={onSubmitPhoto} activeOpacity={0.9}>
                <LinearGradient
                  colors={["rgba(255,255,255,0.95)", "rgba(147,197,253,0.85)", "rgba(156,163,175,0.9)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.submitBtnGradient}
                >
                  <Ionicons name="scan" size={22} color="#000" />
                  <Text style={styles.submitBtnText}>Analyze Target</Text>
                </LinearGradient>
              </TouchableOpacity>
              <TouchableOpacity style={styles.retakeBtn} onPress={onRetake} activeOpacity={0.7}>
                <Ionicons name="camera-outline" size={20} color="#fff" />
                <Text style={styles.retakeBtnText}>Retake</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </View>
      )}

      {/* Analyzing View */}
      {step === "analyzing" && (
        <View style={styles.analyzingContainer}>
          <View style={styles.analyzingContent}>
            {capturedUri && (
              <View style={styles.analyzingPreview}>
                <Image source={{ uri: capturedUri }} style={styles.analyzingImage} resizeMode="cover" />
                <View style={styles.analyzingOverlay}>
                  <View style={styles.scanLine} />
                </View>
              </View>
            )}
            <View style={styles.analyzingInfo}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={styles.analyzingTitle}>Analyzing Target</Text>
              <Text style={styles.analyzingSubtitle}>Detecting bullet holes...</Text>
            </View>
          </View>
        </View>
      )}
    </Modal>
  );
});

const styles = StyleSheet.create({
  // Camera
  cameraContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    flex: 1,
    justifyContent: "space-between",
  },
  
  // Top Bar
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 60,
    paddingHorizontal: 20,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#fff",
  },
  
  // Guide Frame
  guideFrame: {
    width: SCREEN_WIDTH - 60,
    aspectRatio: 1,
    alignSelf: "center",
    position: "relative",
  },
  guideCorner: {
    position: "absolute",
    width: 50,
    height: 50,
    borderColor: COLORS.primary,
  },
  cornerTL: {
    top: 0,
    left: 0,
    borderTopWidth: 3,
    borderLeftWidth: 3,
  },
  cornerTR: {
    top: 0,
    right: 0,
    borderTopWidth: 3,
    borderRightWidth: 3,
  },
  cornerBL: {
    bottom: 0,
    left: 0,
    borderBottomWidth: 3,
    borderLeftWidth: 3,
  },
  cornerBR: {
    bottom: 0,
    right: 0,
    borderBottomWidth: 3,
    borderRightWidth: 3,
  },
  
  // Instructions
  instructions: {
    alignItems: "center",
    paddingHorizontal: 20,
  },
  instructionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  instructionText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  
  // Bottom Bar
  bottomBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    paddingBottom: 50,
  },
  galleryBtn: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  captureBtn: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 4,
    borderColor: "#fff",
  },
  captureBtnInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#fff",
  },
  
  // Preview
  previewContainer: {
    flex: 1,
    backgroundColor: "#000",
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  previewGradient: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "space-between",
  },
  previewActions: {
    paddingHorizontal: 20,
    paddingBottom: 50,
    gap: 12,
  },
  previewHint: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: "center",
    marginBottom: 8,
  },
  submitBtn: {
    borderRadius: 28,
    overflow: "hidden",
  },
  submitBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 56,
    gap: 10,
  },
  submitBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#000",
  },
  retakeBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
  },
  retakeBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  
  // Analyzing
  analyzingContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  analyzingContent: {
    alignItems: "center",
    gap: 32,
  },
  analyzingPreview: {
    width: SCREEN_WIDTH - 80,
    aspectRatio: 1,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
  },
  analyzingImage: {
    width: "100%",
    height: "100%",
  },
  analyzingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    overflow: "hidden",
  },
  scanLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: COLORS.primary,
    top: "50%",
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 10,
  },
  analyzingInfo: {
    alignItems: "center",
    gap: 16,
  },
  analyzingTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.white,
  },
  analyzingSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
});

