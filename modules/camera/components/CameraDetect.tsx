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
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const { width, height } = Dimensions.get("window");

export function CameraDetect() {
  const [facing, setFacing] = useState<CameraType>("back");
  const [permission, requestPermission] = useCameraPermissions();
  const [isCapturing, setIsCapturing] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isMediaButtonPressed, setIsMediaButtonPressed] = useState(false);
  const [isOpeningMediaLibrary, setIsOpeningMediaLibrary] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const { detect, detections, isDetecting, error, clearError } =
    useDetectionStore();

  // Note: Media library permissions are now requested on-demand when user taps the button

  useEffect(() => {
    console.log("Detections:", detections);
    console.log("Is detecting:", isDetecting);

    // Show success message when detections are found and not currently detecting
    if (detections.length > 0 && !isDetecting) {
      Alert.alert(
        "Detection Complete",
        `Found ${detections.length} object(s) in the image.`,
        [{ text: "OK" }]
      );
    }

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
        });

        setCapturedPhoto(photo.uri);
        console.log("Photo captured:", photo.uri);
      } catch (error) {
        console.error("Error taking picture:", error);
        Alert.alert("Error", "Failed to capture photo");
      } finally {
        setIsCapturing(false);
      }
    }
  }

  async function handleScanImage() {
    if (capturedPhoto && !isDetecting) {
      clearError(); // Clear any previous errors
      try {
        await detect(capturedPhoto);
        // Success is handled by useEffect when detections are updated
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
      }
    } catch (error) {
      console.error("Error picking image:", error);
      Alert.alert("Error", "Failed to pick image from library");
    } finally {
      setIsOpeningMediaLibrary(false);
    }
  }

  // Show preview screen if photo is captured
  if (capturedPhoto) {
    return (
      <View style={styles.container}>
        <StatusBar
          barStyle="light-content"
          backgroundColor="transparent"
          translucent
        />

        {/* Photo Preview */}
        <Image source={{ uri: capturedPhoto }} style={styles.previewImage} />

        {/* Action Buttons */}
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetryPhoto}
          >
            <Text style={styles.buttonText}>Retry</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.scanButton,
              isDetecting && styles.scanButtonDisabled,
            ]}
            onPress={handleScanImage}
            disabled={isDetecting}
          >
            <Text style={styles.buttonText}>
              {isDetecting ? "Scanning..." : "Scan"}
            </Text>
          </TouchableOpacity>
        </View>
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
  container: {
    flex: 1,
    backgroundColor: "black",
  },
  camera: {
    flex: 1,
    width: width,
    height: height,
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

  // Preview Screen Styles
  previewImage: {
    flex: 1,
    width: width,
    height: height,
    resizeMode: "cover",
  },
  actionContainer: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 40,
    zIndex: 10,
  },
  retryButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "white",
    minWidth: 120,
    alignItems: "center",
  },
  scanButton: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    borderWidth: 2,
    borderColor: "#007AFF",
    minWidth: 120,
    alignItems: "center",
  },
  scanButtonDisabled: {
    backgroundColor: "rgba(0, 122, 255, 0.5)",
    borderColor: "rgba(0, 122, 255, 0.5)",
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
