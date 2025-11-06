// CameraDetect.tsx
import { useColors } from "@/hooks/ui/useColors";
import { useDetectionStore } from "@/store/detectionStore";
import { CameraType, CameraView, useCameraPermissions } from "expo-camera";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { RefObject, useEffect, useRef, useState } from "react";
import { Alert, StatusBar } from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";
import { CameraPage, LoadingView, PermissionView } from "./CameraPage";
import { PreviewPage } from "./PreviewPage";
import { ResultsBottomSheet } from "./ResultsBottomSheet";

type Page = "camera" | "preview";

export function CameraDetect() {
  // --- Theme
  const colors = useColors();

  // --- Camera + permissions
  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing] = useState<CameraType>("back");

  // --- Flow state
  const [currentPage, setCurrentPage] = useState<Page>("camera");
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isOpeningMediaLibrary, setIsOpeningMediaLibrary] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // --- Detection store
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

  // Handle detection errors centrally
  useEffect(() => {
    if (error) {
      Alert.alert("Detection Error", error, [
        { text: "OK", onPress: clearError },
      ]);
    }
  }, [error, clearError]);

  // --- Actions
  const takePicture = async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.85,
        base64: false,
        skipProcessing: false,
        exif: true,
      });
      setCapturedPhoto(photo.uri);
      setCurrentPage("preview");
    } catch (e) {
      Alert.alert("Error", "Failed to capture photo.");
    } finally {
      setIsCapturing(false);
    }
  };

  const pickImageFromLibrary = async () => {
    if (isOpeningMediaLibrary) return;
    setIsOpeningMediaLibrary(true);
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (req.status !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please allow photo library access."
          );
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: false,
        quality: 0.8,
        exif: false,
        base64: false,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]?.uri) {
        setCapturedPhoto(result.assets[0].uri);
        setCurrentPage("preview");
      }
    } catch (e) {
      Alert.alert("Error", "Failed to pick an image.");
    } finally {
      setIsOpeningMediaLibrary(false);
    }
  };

  const analyzePhoto = async (sessionData: {
    bulletCount: number;
    sessionName: string;
    sessionDetails: string;
  }) => {
    if (!capturedPhoto || isDetecting) return;
    clearError();
    try {
      // Store session data
      console.log("Session data:", sessionData);
      // Update bullet count if it changed
      if (sessionData.bulletCount !== bulletCount) {
        setBulletCount(sessionData.bulletCount);
      }
      await detect(capturedPhoto);
      setShowResults(true);
    } catch {
      Alert.alert(
        "Detection Failed",
        "Unable to process the image. Try again."
      );
    }
  };

  const resetToCamera = () => {
    setCapturedPhoto(null);
    setCurrentPage("camera");
    setShowResults(false);
    useDetectionStore.getState().clearDetections();
  };

  const handleCloseResults = () => {
    setShowResults(false);
  };

  const handleEditCount = () => {
    setShowResults(false);
    // Stay on preview page
  };

  const handleClose = () => {
    router.back();
  };

  // --- Render branches
  if (!permission) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <LoadingView colors={colors} />
      </>
    );
  }

  if (!permission.granted) {
    return (
      <>
        <StatusBar
          barStyle="light-content"
          translucent
          backgroundColor="transparent"
        />
        <PermissionView colors={colors} onGrant={requestPermission} />
      </>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, width: "100%", height: "100%" }}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />
      {currentPage === "camera" && (
        <CameraPage
          cameraRef={cameraRef as RefObject<CameraView>}
          facing={facing}
          isCapturing={isCapturing}
          isOpeningMediaLibrary={isOpeningMediaLibrary}
          onTakePicture={takePicture}
          onPickFromLibrary={pickImageFromLibrary}
        />
      )}

      {currentPage === "preview" && capturedPhoto && (
        <PreviewPage
          photoUri={capturedPhoto}
          bulletCount={bulletCount}
          onBulletCountChange={setBulletCount}
          isDetecting={isDetecting}
          onAnalyze={(data) => analyzePhoto(data)}
          onBack={resetToCamera}
          onSessionDetailsChange={() => {}}
        />
      )}

      {/* Results Bottom Sheet - Shows over camera/preview */}
      {capturedPhoto && (
        <ResultsBottomSheet
          visible={showResults}
          photoUri={capturedPhoto}
          annotatedImageBase64={annotatedImageBase64}
          hits={detections.length}
          bulletCount={bulletCount}
          onEditCount={handleEditCount}
          onNewScan={resetToCamera}
          onClose={handleCloseResults}
          isLoading={isDetecting}
        />
      )}
    </GestureHandlerRootView>
  );
}
