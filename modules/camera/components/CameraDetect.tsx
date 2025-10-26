import { useColors } from "@/hooks/useColors";
import { useDetectionStore } from "@/store/detectionStore";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

type Page = "camera" | "preview" | "results";

export function CameraDetect() {
  const [facing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isMediaButtonPressed, setIsMediaButtonPressed] = useState(false);
  const [isOpeningMediaLibrary, setIsOpeningMediaLibrary] = useState(false);
  const [currentPage, setCurrentPage] = useState<Page>("camera");
  const cameraRef = useRef<CameraView>(null);
  const {
    detect,
    detections,
    annotatedImageBase64,
    bulletCount,
    setBulletCount,
    isDetecting,
    error,
    clearError,
  } = useDetectionStore();
  const colors = useColors();

  // Note: Media library permissions are now requested on-demand when user taps the button

  useEffect(() => {
    console.log("Detections:", detections);
    console.log("Is detecting:", isDetecting);

    // Show error message if there's an error
    if (error) {
      console.log("Detection error:", error);
      Alert.alert("Detection Error", error, [
        { text: "OK", onPress: clearError },
      ]);
    }
  }, [detections, isDetecting, error, clearError]);

  if (!permission) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <View style={styles.permissionContent}>
          <Text style={styles.permissionTitle}>Camera Access Required</Text>
          <Text style={styles.permissionMessage}>
            We need access to your camera to take photos and detect objects
          </Text>
          <TouchableOpacity
            style={styles.permissionButton}
            onPress={requestPermission}
          >
            <Text style={styles.permissionButtonText}>Grant Permission</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  async function takePicture() {
    if (cameraRef.current && !isCapturing) {
      setIsCapturing(true);
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
          base64: false,
          skipProcessing: false,
          exif: true,
        });

        setCapturedPhoto(photo.uri);
        setCurrentPage("preview"); // Go to preview page
        console.log("Photo captured:", photo.uri);
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to capture photo");
      } finally {
        setIsCapturing(false);
      }
    }
  }

  async function handleBulletCountConfirm() {
    if (capturedPhoto && !isDetecting) {
      clearError();
      try {
        await detect(capturedPhoto);
        setCurrentPage("results"); // Go to results page after detection
      } catch (err) {
        console.error("Detection failed:", err);
        Alert.alert(
          "Detection Failed",
          "Unable to process the image. Please try again."
        );
      }
    }
  }

  function handleRetryPhoto() {
    setCapturedPhoto(null);
    setCurrentPage("camera"); // Go back to camera
    useDetectionStore.getState().clearDetections();
  }

  function handleBackToPreview() {
    setCurrentPage("preview");
  }

  async function pickImageFromLibrary() {
    if (isOpeningMediaLibrary) return; // Prevent multiple calls

    setIsOpeningMediaLibrary(true);
    try {
      // Check permissions first
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        const { status: newStatus } =
          await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant access to your photo library to select images."
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false, // Disable editing for faster performance
        quality: 0.7, // Reduce quality for faster processing
        exif: false, // Disable EXIF data to speed up
        base64: false, // Don't include base64 data
        allowsMultipleSelection: false, // Single selection only
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setCurrentPage("preview"); // Go to preview page
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from library");
    } finally {
      setIsOpeningMediaLibrary(false);
    }
  }

  // PAGE 2: Preview with Bullet Input
  if (currentPage === "preview" && capturedPhoto) {
    return (
      <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
            onPress={handleRetryPhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Target Preview</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.previewScrollContent}>
          {/* Beautiful Image Display */}
          <View style={[styles.imageCard, { backgroundColor: colors.cardBackground }]}>
            <Image
              source={{ uri: capturedPhoto }}
              style={styles.previewImageLarge}
              resizeMode="cover"
            />
            <View style={styles.imageOverlay}>
              <View style={[styles.imageBadge, { backgroundColor: colors.tint }]}>
                <Ionicons name="camera" size={16} color="white" />
                <Text style={styles.imageBadgeText}>Target Captured</Text>
              </View>
            </View>
          </View>

          {/* Beautiful Bullet Selector */}
          <View style={[styles.selectorCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.selectorHeader}>
              <Ionicons name="radio-button-on" size={28} color={colors.tint} />
              <Text style={[styles.selectorTitle, { color: colors.text }]}>
                Bullets Fired
              </Text>
            </View>

            <Text style={[styles.selectorSubtitle, { color: colors.description }]}>
              How many rounds did you fire at this target?
            </Text>

            {/* Gorgeous Bullet Counter */}
            <View style={styles.counterSection}>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  {
                    backgroundColor: bulletCount <= 1 ? colors.cardBackground : colors.tint,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  if (bulletCount > 1) setBulletCount(bulletCount - 1);
                }}
                disabled={bulletCount <= 1}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="remove"
                  size={28}
                  color={bulletCount <= 1 ? colors.description : "white"}
                />
              </TouchableOpacity>

              {/* Animated Count Display */}
              <View style={[styles.countDisplay, { backgroundColor: colors.cardBackground }]}>
                <Text style={[styles.countNumber, { color: colors.tint }]}>
                  {bulletCount}
                </Text>
                <Text style={[styles.countLabel, { color: colors.description }]}>
                  {bulletCount === 1 ? "bullet" : "bullets"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.counterButton,
                  {
                    backgroundColor: bulletCount >= 10 ? colors.cardBackground : colors.tint,
                    borderColor: colors.border,
                  },
                ]}
                onPress={() => {
                  if (bulletCount < 10) setBulletCount(bulletCount + 1);
                }}
                disabled={bulletCount >= 10}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="add"
                  size={28}
                  color={bulletCount >= 10 ? colors.description : "white"}
                />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text style={[styles.presetsLabel, { color: colors.description }]}>
                Quick Select:
              </Text>
              <View style={styles.presetsRow}>
                {[3, 5, 10].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor: bulletCount === count ? colors.tint : colors.cardBackground,
                        borderColor: bulletCount === count ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setBulletCount(count)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        { color: bulletCount === count ? "white" : colors.text },
                      ]}
                    >
                      {count}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Info Card */}
          <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
            <Ionicons name="information-circle" size={24} color={colors.tint} />
            <Text style={[styles.infoText, { color: colors.description }]}>
              Our AI will analyze your target and detect bullet holes with precision.
              Accurate bullet count helps improve detection accuracy.
            </Text>
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeButton, { backgroundColor: colors.tint }]}
            onPress={handleBulletCountConfirm}
            disabled={isDetecting}
            activeOpacity={0.8}
          >
            {isDetecting ? (
              <>
                <Text style={styles.analyzeButtonText}>Analyzing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="analytics" size={24} color="white" />
                <Text style={styles.analyzeButtonText}>Analyze Target</Text>
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // PAGE 3: Results
  if (currentPage === "results" && capturedPhoto) {
    return (
      <View style={[styles.pageContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[styles.backButton, { backgroundColor: colors.cardBackground }]}
            onPress={handleBackToPreview}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Analysis Results</Text>
          <View style={styles.backButton} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.resultsScrollContent}>
          {/* Results Header */}
          <View style={[styles.resultsHeader, { backgroundColor: colors.tint }]}>
            <Ionicons name="checkmark-circle" size={64} color="white" />
            <Text style={styles.resultsHeaderTitle}>Analysis Complete!</Text>
            <Text style={styles.resultsHeaderSubtitle}>
              Found {detections.length} bullet hole{detections.length !== 1 ? "s" : ""}
            </Text>
          </View>

          {/* Annotated Image */}
          <View style={[styles.resultsImageCard, { backgroundColor: colors.cardBackground }]}>
            <Text style={[styles.resultsImageTitle, { color: colors.text }]}>
              Annotated Target
            </Text>
            {annotatedImageBase64 ? (
              <Image
                source={{ uri: `data:image/jpeg;base64,${annotatedImageBase64}` }}
                style={styles.resultsImage}
                resizeMode="contain"
              />
            ) : (
              <Image
                source={{ uri: capturedPhoto }}
                style={styles.resultsImage}
                resizeMode="contain"
              />
            )}
          </View>

          {/* Stats Cards */}
          <View style={styles.statsGrid}>
            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="flash" size={32} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>{bulletCount}</Text>
              <Text style={[styles.statLabel, { color: colors.description }]}>Bullets Fired</Text>
            </View>

            <View style={[styles.statCard, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="radio-button-on" size={32} color={colors.tint} />
              <Text style={[styles.statValue, { color: colors.text }]}>{detections.length}</Text>
              <Text style={[styles.statLabel, { color: colors.description }]}>Hits Detected</Text>
            </View>
          </View>

          {/* Accuracy Card */}
          <View style={[styles.accuracyCard, { backgroundColor: colors.cardBackground }]}>
            <View style={styles.accuracyHeader}>
              <Ionicons name="analytics" size={24} color={colors.tint} />
              <Text style={[styles.accuracyTitle, { color: colors.text }]}>Accuracy</Text>
            </View>
            <Text style={[styles.accuracyPercentage, { color: colors.tint }]}>
              {bulletCount > 0 ? Math.round((detections.length / bulletCount) * 100) : 0}%
            </Text>
            <Text style={[styles.accuracyDescription, { color: colors.description }]}>
              {detections.length === bulletCount
                ? "Perfect! All shots detected."
                : detections.length > bulletCount
                ? "More hits detected than expected. Some may be duplicates."
                : "Some shots may have missed or overlapped."}
            </Text>
          </View>

          {/* Action Buttons */}
          <View style={styles.resultsActions}>
            <TouchableOpacity
              style={[styles.secondaryButton, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}
              onPress={handleBackToPreview}
              activeOpacity={0.8}
            >
              <Ionicons name="create" size={20} color={colors.text} />
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>Edit Count</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleRetryPhoto}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={20} color="white" />
              <Text style={styles.primaryButtonText}>New Scan</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Camera View */}
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="picture"
      />

      {/* Capture Controls */}
      <View style={styles.captureContainer}>
        {/* Media Library Button */}
        <TouchableOpacity
          style={[
            styles.mediaLibraryButton,
            (isCapturing || isOpeningMediaLibrary) &&
              styles.mediaLibraryButtonDisabled,
            isMediaButtonPressed && styles.mediaLibraryButtonPressed,
          ]}
          onPress={pickImageFromLibrary}
          onPressIn={() => setIsMediaButtonPressed(true)}
          onPressOut={() => setIsMediaButtonPressed(false)}
          disabled={isCapturing || isOpeningMediaLibrary}
        >
          <LinearGradient
            colors={
              isCapturing || isOpeningMediaLibrary
                ? ["rgba(0, 0, 0, 0.3)", "rgba(0, 0, 0, 0.1)"]
                : ["rgba(0, 0, 0, 0.6)", "rgba(0, 0, 0, 0.3)"]
            }
            style={styles.mediaLibraryButtonGradient}
          >
            <Ionicons
              name={
                isOpeningMediaLibrary ? "hourglass-outline" : "images-outline"
              }
              size={28}
              color="white"
            />
          </LinearGradient>
        </TouchableOpacity>

        {/* Capture Button */}
        <TouchableOpacity
          style={[
            styles.captureButton,
            isCapturing && styles.captureButtonActive,
          ]}
          onPress={takePicture}
          disabled={isCapturing}
        >
          <View style={styles.captureButtonInner}>
            <View style={styles.captureButtonCore} />
          </View>
        </TouchableOpacity>

        {/* Placeholder for symmetry */}
        <View style={styles.placeholderButton} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // PAGE 1: Camera
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
  },

  // Common
  pageContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollView: {
    flex: 1,
  },

  // PAGE 2: Preview & Bullet Input
  previewScrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  imageCard: {
    borderRadius: 24,
    overflow: "hidden",
    marginBottom: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  previewImageLarge: {
    width: "100%",
    height: 300,
  },
  imageOverlay: {
    position: "absolute",
    top: 16,
    right: 16,
  },
  imageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  imageBadgeText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  selectorCard: {
    borderRadius: 24,
    padding: 24,
    marginBottom: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  selectorTitle: {
    fontSize: 24,
    fontWeight: "800",
  },
  selectorSubtitle: {
    fontSize: 15,
    marginBottom: 28,
    lineHeight: 22,
  },
  counterSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 28,
  },
  counterButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  countDisplay: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 140,
  },
  countNumber: {
    fontSize: 56,
    fontWeight: "900",
    lineHeight: 64,
  },
  countLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 4,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  presetsSection: {
    marginTop: 8,
  },
  presetsLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    borderWidth: 2,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  presetChipText: {
    fontSize: 18,
    fontWeight: "700",
  },
  infoCard: {
    flexDirection: "row",
    gap: 16,
    padding: 20,
    borderRadius: 16,
    marginBottom: 20,
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  analyzeButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 20,
    borderRadius: 20,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  analyzeButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "800",
  },

  // PAGE 3: Results
  resultsScrollContent: {
    paddingBottom: 40,
  },
  resultsHeader: {
    padding: 40,
    alignItems: "center",
    gap: 16,
  },
  resultsHeaderTitle: {
    color: "white",
    fontSize: 28,
    fontWeight: "900",
  },
  resultsHeaderSubtitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.9,
  },
  resultsImageCard: {
    margin: 20,
    padding: 20,
    borderRadius: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  resultsImageTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 16,
  },
  resultsImage: {
    width: "100%",
    height: 350,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    padding: 24,
    borderRadius: 20,
    alignItems: "center",
    gap: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statValue: {
    fontSize: 36,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accuracyCard: {
    marginHorizontal: 20,
    padding: 28,
    borderRadius: 24,
    marginBottom: 24,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
  },
  accuracyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  accuracyTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  accuracyPercentage: {
    fontSize: 64,
    fontWeight: "900",
    marginBottom: 12,
  },
  accuracyDescription: {
    fontSize: 15,
    lineHeight: 22,
  },
  resultsActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    borderWidth: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
    borderRadius: 16,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },

  // Loading and Permission States
  loadingContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: "white",
    fontSize: 16,
    fontWeight: "500",
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  permissionContent: {
    alignItems: "center",
  },
  permissionTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 10,
    textAlign: "center",
  },
  permissionMessage: {
    color: "#ccc",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 30,
  },
  permissionButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },

  // Capture Container
  captureContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingHorizontal: 40,
    zIndex: 10,
  },

  // Capture Button
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 4,
    borderColor: "white",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  captureButtonActive: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    transform: [{ scale: 0.95 }],
    borderColor: "rgba(255, 255, 255, 0.7)",
  },
  captureButtonInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonCore: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "white",
  },

  // Media Library Button
  mediaLibraryButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.8)",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    overflow: "hidden",
  },
  mediaLibraryButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
  },
  mediaLibraryButtonDisabled: {
    borderColor: "rgba(255, 255, 255, 0.4)",
    opacity: 0.6,
  },
  mediaLibraryButtonPressed: {
    transform: [{ scale: 0.95 }],
  },

  // Placeholder Button (for symmetry)
  placeholderButton: {
    width: 70,
    height: 70,
  },
});
