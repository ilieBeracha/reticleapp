import {
    shouldSubmitForTraining,
    submitTrainingData,
    TrainingDataPayload,
} from "@/services/detectionService";
import { addTargetWithPaperResult, PaperType } from "@/services/sessionService";
import { useDetectionStore } from "@/store/detectionStore";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
    Alert,
    StyleSheet,
    View
} from "react-native";
import { CameraFlow } from "./CameraFlow";
import { ResultCard } from "./ResultCard";
import { COLORS, EditableDetection, Step } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// PAPER TARGET FLOW
// Standalone component for scanning paper targets
// Goes directly to camera without requiring form setup
// ═══════════════════════════════════════════════════════════════════════════

interface PaperTargetFlowProps {
  sessionId: string;
  defaultDistance?: number;
  defaultBullets?: number;
  onComplete?: () => void;
  onCancel?: () => void;
}

export function PaperTargetFlow({
  sessionId,
  defaultDistance = 100,
  defaultBullets = 5,
  onComplete,
  onCancel,
}: PaperTargetFlowProps) {
  // Camera
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  // Detection store
  const {
    result,
    analyze,
    setImage,
    startCapture,
    reset: resetDetection,
    setError,
  } = useDetectionStore();

  // State
  const [step, setStep] = useState<Step>("camera");
  const [saving, setSaving] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [editedDetections, setEditedDetections] = useState<EditableDetection[]>([]);
  
  // Configurable values
  const [distance, setDistance] = useState(defaultDistance);
  const [bullets] = useState(defaultBullets);

  // Paper settings
  const [paperType] = useState<PaperType>("grouping");
  const [paperNotes] = useState("");

  // Auto-start camera on mount
  useEffect(() => {
    const initCamera = async () => {
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert(
            "Camera Permission",
            "Camera access is required to scan paper targets.",
            [{ text: "OK", onPress: handleClose }]
          );
          return;
        }
      }
      startCapture();
    };
    initCamera();
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetDetection();
    if (onCancel) {
      onCancel();
    } else {
      router.back();
    }
  }, [resetDetection, onCancel]);

  // Camera handlers
  const handlePickImage = useCallback(async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!result.canceled && result.assets[0]?.uri) {
      setCapturedUri(result.assets[0].uri);
      setImage(result.assets[0].uri);
      setStep("preview");
    }
  }, [setImage]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.9,
        base64: false,
      });

      if (photo?.uri) {
        setCapturedUri(photo.uri);
        setImage(photo.uri);
        setStep("preview");
      }
    } catch (err: any) {
      console.error("Capture failed:", err);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setError(err.message || "Failed to capture photo");
      Alert.alert("Error", "Failed to capture photo");
    }
  }, [setImage, setError]);

  const handleSubmitPhoto = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep("analyzing");

    const analysisResult = await analyze();

    if (analysisResult) {
      const initialDetections: EditableDetection[] = analysisResult.detections.map((d, i) => ({
        ...d,
        id: `ai-${i}`,
        isManual: false,
      }));
      setEditedDetections(initialDetections);

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setStep("results");
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Analysis Failed", "Could not analyze the image. Please try again.", [
        { text: "Retake", onPress: () => setStep("camera") },
        { text: "Cancel", onPress: handleClose },
      ]);
    }
  }, [analyze, handleClose]);

  const handleRetake = useCallback(() => {
    setCapturedUri(null);
    setEditedDetections([]);
    resetDetection();
    setStep("camera");
  }, [resetDetection]);

  // Save handler
  const savePaperTarget = useCallback(
    async (finalDetections: EditableDetection[], editedImageBase64?: string) => {
      if (!sessionId) {
        Alert.alert("Error", "Session ID missing");
        return;
      }

      setSaving(true);

      try {
        const detectionCount = finalDetections.length;
        const rawHighConfHits = finalDetections.filter(
          (d) => d.isManual || d.confidence >= 0.6
        ).length;
        const highConfHits = Math.min(rawHighConfHits, bullets);
        const manualCount = finalDetections.filter((d) => d.isManual).length;

        const trainingData =
          manualCount > 0 || finalDetections.length !== (result?.detections?.length ?? 0)
            ? {
                original_image_base64: result?.original_image_base64,
                edited_image_base64: editedImageBase64,
                original_detections: result?.detections,
                final_detections: finalDetections.map((d) => ({
                  center: d.center,
                  bbox: d.bbox,
                  confidence: d.confidence,
                  is_manual: d.isManual,
                })),
                edits: {
                  added: manualCount,
                  removed: (result?.detections?.length ?? 0) - finalDetections.length + manualCount,
                },
              }
            : null;

        const finalImageBase64 = editedImageBase64 || result?.annotated_image_base64;
        const groupSizeCm = result?.overall_stats_mm?.max_pair?.distance_cm ?? null;

        await addTargetWithPaperResult({
          session_id: sessionId,
          distance_m: distance,
          lane_number: null,
          planned_shots: bullets,
          notes: paperNotes || null,
          target_data: null,
          paper_type: paperType,
          bullets_fired: bullets,
          hits_total: Math.min(detectionCount, bullets),
          hits_inside_scoring: highConfHits,
          dispersion_cm: groupSizeCm,
          scanned_image_url: finalImageBase64
            ? `data:image/jpeg;base64,${finalImageBase64}`
            : null,
          result_notes: paperNotes || null,
        });

        if (trainingData && shouldSubmitForTraining(trainingData as TrainingDataPayload)) {
          submitTrainingData(trainingData as TrainingDataPayload)
            .then((res) => console.log("[Training] Submitted:", res.message))
            .catch((err) => console.log("[Training] Failed:", err));
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetDetection();
        
        if (onComplete) {
          onComplete();
        } else {
          router.back();
        }
      } catch (error: any) {
        console.error("Failed to add paper target:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", error.message || "Failed to add target");
        setSaving(false);
      }
    },
    [sessionId, distance, bullets, result, paperType, paperNotes, resetDetection, onComplete]
  );

  // Results view
  if (step === "results" && result) {
    return (
      <ResultCard
        result={result}
        onDone={savePaperTarget}
        onRetake={handleRetake}
        saving={saving}
        editedDetections={editedDetections}
        onDetectionsChange={setEditedDetections}
        distance={distance}
        onDistanceChange={setDistance}
      />
    );
  }

  // Camera flow (camera, preview, analyzing)
  return (
    <View style={styles.container}>
      <CameraFlow
        step={step}
        capturedUri={capturedUri}
        cameraRef={cameraRef}
        onCapture={handleCapture}
        onPickImage={handlePickImage}
        onSubmitPhoto={handleSubmitPhoto}
        onRetake={handleRetake}
        onClose={handleClose}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
});

export default PaperTargetFlow;
