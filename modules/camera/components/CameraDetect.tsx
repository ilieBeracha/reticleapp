import { useColors } from "@/hooks/useColors";
import { useDetectionStore } from "@/store/detectionStore";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Animated,
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
  const pulseAnim = useRef(new Animated.Value(1)).current;
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

  // Pulse animation for capture button
  useEffect(() => {
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.15,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulseAnimation.start();
    return () => pulseAnimation.stop();
  }, []);

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
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <LinearGradient
          colors={[colors.tint + "20", colors.background]}
          style={styles.loadingGradient}
        >
          <View
            style={[
              styles.loadingCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Ionicons name="camera" size={64} color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading camera...
            </Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View
        style={[
          styles.permissionContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <LinearGradient
          colors={[colors.tint + "15", colors.background]}
          style={styles.permissionGradient}
        >
          <View
            style={[
              styles.permissionContent,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View
              style={[
                styles.permissionIconContainer,
                { backgroundColor: colors.tint + "20" },
              ]}
            >
              <Ionicons name="camera-outline" size={64} color={colors.tint} />
            </View>
            <Text style={[styles.permissionTitle, { color: colors.text }]}>
              Camera Access Required
            </Text>
            <Text
              style={[styles.permissionMessage, { color: colors.description }]}
            >
              We need access to your camera to take photos and detect bullet
              holes on your targets
            </Text>
            <TouchableOpacity
              style={[
                styles.permissionButton,
                { backgroundColor: colors.tint },
              ]}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
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
        setCurrentPage("preview");
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
        setCurrentPage("results");
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
    setCurrentPage("camera");
    useDetectionStore.getState().clearDetections();
  }

  function handleBackToPreview() {
    setCurrentPage("preview");
  }

  async function pickImageFromLibrary() {
    if (isOpeningMediaLibrary) return;

    setIsOpeningMediaLibrary(true);
    try {
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
        allowsEditing: false,
        quality: 0.7,
        exif: false,
        base64: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        setCapturedPhoto(result.assets[0].uri);
        setCurrentPage("preview");
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
      <View
        style={[styles.pageContainer, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Header with back button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.cardBackground },
            ]}
            onPress={handleRetryPhoto}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Preview Target
          </Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.previewScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Image Display */}
          <View
            style={[
              styles.imageCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Image
              source={{ uri: capturedPhoto }}
              style={styles.previewImageLarge}
              resizeMode="cover"
            />
            <LinearGradient
              colors={["transparent", "rgba(0,0,0,0.6)"]}
              style={styles.imageGradient}
            >
              <View
                style={[styles.imageBadge, { backgroundColor: colors.tint }]}
              >
                <Ionicons name="checkmark-circle" size={20} color="white" />
                <Text style={styles.imageBadgeText}>Target Captured</Text>
              </View>
            </LinearGradient>
          </View>

          {/* Bullet Selector */}
          <View
            style={[
              styles.selectorCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.selectorHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <Ionicons
                  name="radio-button-on"
                  size={28}
                  color={colors.tint}
                />
              </View>
              <View style={styles.selectorHeaderText}>
                <Text style={[styles.selectorTitle, { color: colors.text }]}>
                  Bullets Fired
                </Text>
                <Text
                  style={[
                    styles.selectorSubtitle,
                    { color: colors.description },
                  ]}
                >
                  How many rounds did you fire?
                </Text>
              </View>
            </View>

            {/* Bullet Counter */}
            <View style={styles.counterSection}>
              <TouchableOpacity
                style={[
                  styles.counterButton,
                  {
                    backgroundColor:
                      bulletCount <= 1
                        ? colors.cardBackground
                        : colors.tint + "20",
                    borderColor: bulletCount <= 1 ? colors.border : colors.tint,
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
                  size={24}
                  color={bulletCount <= 1 ? colors.description : colors.tint}
                />
              </TouchableOpacity>

              <View
                style={[
                  styles.countDisplay,
                  { backgroundColor: colors.tint + "10" },
                ]}
              >
                <Text style={[styles.countNumber, { color: colors.tint }]}>
                  {bulletCount}
                </Text>
                <Text
                  style={[styles.countLabel, { color: colors.description }]}
                >
                  {bulletCount === 1 ? "bullet" : "bullets"}
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.counterButton,
                  {
                    backgroundColor:
                      bulletCount >= 10
                        ? colors.cardBackground
                        : colors.tint + "20",
                    borderColor:
                      bulletCount >= 10 ? colors.border : colors.tint,
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
                  size={24}
                  color={bulletCount >= 10 ? colors.description : colors.tint}
                />
              </TouchableOpacity>
            </View>

            {/* Quick Presets */}
            <View style={styles.presetsSection}>
              <Text
                style={[styles.presetsLabel, { color: colors.description }]}
              >
                Quick Select
              </Text>
              <View style={styles.presetsRow}>
                {[3, 5, 10].map((count) => (
                  <TouchableOpacity
                    key={count}
                    style={[
                      styles.presetChip,
                      {
                        backgroundColor:
                          bulletCount === count
                            ? colors.tint
                            : colors.background,
                        borderColor:
                          bulletCount === count ? colors.tint : colors.border,
                      },
                    ]}
                    onPress={() => setBulletCount(count)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={[
                        styles.presetChipText,
                        {
                          color: bulletCount === count ? "white" : colors.text,
                        },
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
          <View
            style={[styles.infoCard, { backgroundColor: colors.tint + "10" }]}
          >
            <View
              style={[
                styles.infoIconContainer,
                { backgroundColor: colors.tint + "20" },
              ]}
            >
              <Ionicons
                name="information-circle"
                size={28}
                color={colors.tint}
              />
            </View>
            <Text style={[styles.infoText, { color: colors.description }]}>
              Our AI will analyze your target and detect bullet holes with
              precision. Accurate bullet count helps improve detection accuracy.
            </Text>
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeButton, { backgroundColor: colors.tint }]}
            onPress={handleBulletCountConfirm}
            disabled={isDetecting}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.tint, colors.tint + "DD"]}
              style={styles.analyzeButtonGradient}
            >
              {isDetecting ? (
                <>
                  <Ionicons name="hourglass-outline" size={24} color="white" />
                  <Text style={styles.analyzeButtonText}>Analyzing...</Text>
                </>
              ) : (
                <>
                  <Ionicons name="scan" size={24} color="white" />
                  <Text style={styles.analyzeButtonText}>Analyze Target</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  // PAGE 3: Results
  if (currentPage === "results" && capturedPhoto) {
    return (
      <View
        style={[styles.pageContainer, { backgroundColor: colors.background }]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.iconButton,
              { backgroundColor: colors.cardBackground },
            ]}
            onPress={handleBackToPreview}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Results
          </Text>
          <View style={styles.iconButton} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.resultsScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Results Header */}
          <LinearGradient
            colors={[colors.tint, colors.tint + "DD"]}
            style={styles.resultsHeader}
          >
            <View style={styles.successIconContainer}>
              <Ionicons name="checkmark-circle" size={64} color="white" />
            </View>
            <Text style={styles.resultsHeaderTitle}>Analysis Complete!</Text>
            <Text style={styles.resultsHeaderSubtitle}>
              Found {detections.length} bullet hole
              {detections.length !== 1 ? "s" : ""}
            </Text>
          </LinearGradient>

          {/* Annotated Image */}
          <View
            style={[
              styles.resultsImageCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.resultsImageTitle, { color: colors.text }]}>
              Detected Target
            </Text>
            {annotatedImageBase64 ? (
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${annotatedImageBase64}`,
                }}
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
            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <Ionicons name="flash" size={32} color={colors.tint} />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {bulletCount}
              </Text>
              <Text style={[styles.statLabel, { color: colors.description }]}>
                Bullets Fired
              </Text>
            </View>

            <View
              style={[
                styles.statCard,
                { backgroundColor: colors.cardBackground },
              ]}
            >
              <View
                style={[
                  styles.statIconContainer,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <Ionicons
                  name="radio-button-on"
                  size={32}
                  color={colors.tint}
                />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {detections.length}
              </Text>
              <Text style={[styles.statLabel, { color: colors.description }]}>
                Hits Detected
              </Text>
            </View>
          </View>

          {/* Accuracy Card */}
          <View
            style={[
              styles.accuracyCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <View style={styles.accuracyHeader}>
              <View
                style={[
                  styles.iconCircle,
                  { backgroundColor: colors.tint + "20" },
                ]}
              >
                <Ionicons name="trophy" size={24} color={colors.tint} />
              </View>
              <Text style={[styles.accuracyTitle, { color: colors.text }]}>
                Accuracy
              </Text>
            </View>
            <View style={styles.accuracyPercentageContainer}>
              <Text style={[styles.accuracyPercentage, { color: colors.tint }]}>
                {bulletCount > 0
                  ? Math.round((detections.length / bulletCount) * 100)
                  : 0}
                %
              </Text>
            </View>
            <Text
              style={[
                styles.accuracyDescription,
                { color: colors.description },
              ]}
            >
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
              style={[
                styles.secondaryButton,
                {
                  backgroundColor: colors.cardBackground,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleBackToPreview}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
              <Text
                style={[styles.secondaryButtonText, { color: colors.text }]}
              >
                Edit Count
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: colors.tint }]}
              onPress={handleRetryPhoto}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.tint, colors.tint + "DD"]}
                style={styles.primaryButtonGradient}
              >
                <Ionicons name="camera" size={20} color="white" />
                <Text style={styles.primaryButtonText}>New Scan</Text>
              </LinearGradient>
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

      {/* Overlay with guide lines */}
      <View style={styles.cameraOverlay}>
        <View style={styles.frameGuide} />
      </View>

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
                ? ["rgba(255, 255, 255, 0.15)", "rgba(255, 255, 255, 0.05)"]
                : ["rgba(255, 255, 255, 0.25)", "rgba(255, 255, 255, 0.15)"]
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
        <Animated.View
          style={[
            styles.captureButtonContainer,
            { transform: [{ scale: pulseAnim }] },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.captureButton,
              isCapturing && styles.captureButtonActive,
            ]}
            onPress={takePicture}
            disabled={isCapturing}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={
                isCapturing
                  ? ["rgba(255, 255, 255, 0.3)", "rgba(255, 255, 255, 0.2)"]
                  : ["rgba(255, 255, 255, 0.4)", "rgba(255, 255, 255, 0.3)"]
              }
              style={styles.captureButtonGradient}
            >
              <View style={styles.captureButtonInner}>
                <View style={styles.captureButtonCore} />
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* Instructions Button */}
        <TouchableOpacity style={styles.placeholderButton}>
          <View style={styles.instructionDot} />
        </TouchableOpacity>
      </View>

      {/* Instructions Banner */}
      <View style={styles.instructionBanner}>
        <Text style={styles.instructionText}>
          Tap the camera to capture your target
        </Text>
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
    borderColor: "rgba(255, 255, 255, 0.5)",
    borderStyle: "dashed",
    borderRadius: 20,
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
    paddingTop: 50,
    paddingBottom: 12,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
  },
  loadingGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingCard: {
    width: "100%",
    padding: 48,
    borderRadius: 32,
    alignItems: "center",
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
  },
  permissionContainer: {
    flex: 1,
  },
  permissionGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  permissionContent: {
    width: "100%",
    padding: 40,
    borderRadius: 32,
    alignItems: "center",
    gap: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 8,
  },
  permissionIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  permissionTitle: {
    fontSize: 28,
    fontWeight: "800",
    textAlign: "center",
  },
  permissionMessage: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
  },
  permissionButton: {
    paddingHorizontal: 40,
    paddingVertical: 18,
    borderRadius: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },

  // PAGE 2: Preview & Bullet Input
  previewScrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  imageCard: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  previewImageLarge: {
    width: "100%",
    height: 300,
  },
  imageGradient: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: "50%",
    justifyContent: "flex-end",
    padding: 20,
  },
  imageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  imageBadgeText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
  selectorCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  selectorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  selectorHeaderText: {
    flex: 1,
  },
  selectorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 2,
  },
  selectorSubtitle: {
    fontSize: 15,
    lineHeight: 22,
  },
  counterSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    marginBottom: 20,
  },
  counterButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  countDisplay: {
    paddingHorizontal: 40,
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: "center",
    minWidth: 140,
    borderWidth: 2,
    borderStyle: "dashed",
  },
  countNumber: {
    fontSize: 56,
    fontWeight: "700",
    lineHeight: 64,
  },
  countLabel: {
    fontSize: 14,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },
  presetsSection: {
    marginTop: 8,
  },
  presetsLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  presetsRow: {
    flexDirection: "row",
    gap: 12,
  },
  presetChip: {
    flex: 1,
    paddingVertical: 18,
    borderRadius: 20,
    alignItems: "center",
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  presetChipText: {
    fontSize: 20,
    fontWeight: "800",
  },
  infoCard: {
    flexDirection: "row",
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 16,
  },
  infoIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  infoText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
  },
  analyzeButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  analyzeButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
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
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  successIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  resultsHeaderTitle: {
    color: "white",
    fontSize: 24,
    fontWeight: "700",
  },
  resultsHeaderSubtitle: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    opacity: 0.95,
  },
  resultsImageCard: {
    margin: 16,
    padding: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  resultsImageTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
  },
  resultsImage: {
    width: "100%",
    height: 300,
    borderRadius: 16,
  },
  statsGrid: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    padding: 20,
    borderRadius: 16,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  statIconContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  statValue: {
    fontSize: 32,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "700",
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  accuracyCard: {
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
  },
  accuracyHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  accuracyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  accuracyPercentageContainer: {
    width: "100%",
    alignItems: "center",
    marginBottom: 16,
  },
  accuracyPercentage: {
    fontSize: 56,
    fontWeight: "700",
  },
  accuracyDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: "center",
  },
  resultsActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
  },
  secondaryButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
    borderRadius: 20,
    borderWidth: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  primaryButton: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  primaryButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 20,
  },
  primaryButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
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
  captureButtonContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  captureButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 12,
  },
  captureButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 5,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  captureButtonActive: {
    transform: [{ scale: 0.95 }],
  },
  captureButtonInner: {
    width: 75,
    height: 75,
    borderRadius: 37.5,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
  },
  captureButtonCore: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    backgroundColor: "white",
  },

  // Media Library Button
  mediaLibraryButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: "rgba(255, 255, 255, 0.9)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: "hidden",
  },
  mediaLibraryButtonGradient: {
    width: "100%",
    height: "100%",
    borderRadius: 33,
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

  // Placeholder and instructions
  placeholderButton: {
    width: 72,
    height: 72,
    justifyContent: "center",
    alignItems: "center",
  },
  instructionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
  },
  instructionBanner: {
    position: "absolute",
    top: 100,
    left: 20,
    right: 20,
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    borderRadius: 16,
    alignItems: "center",
    zIndex: 5,
  },
  instructionText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
