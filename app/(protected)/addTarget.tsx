import {
  shouldSubmitForTraining,
  submitTrainingData,
  TrainingDataPayload,
  uploadScannedTargetImage,
} from "@/services/detectionService";
import {
  addTargetWithPaperResult,
  PaperType,
} from "@/services/sessionService";
import { useDetectionStore } from "@/store/detectionStore";
import { CameraView, useCameraPermissions } from "expo-camera";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "react-native";

// Import modular components
import {
  CameraFlow,
  EditableDetection,
  InputMethod,
  ManualAchievementEntry,
  ResultCard,
  Step,
  TargetForm,
  TargetType,
} from "@/components/addTarget";

// ═══════════════════════════════════════════════════════════════════════════
// ADD TARGET SHEET
// Main orchestrator for adding targets with Grouping vs Achievement selection
// ═══════════════════════════════════════════════════════════════════════════

export default function AddTargetSheet() {
  const { sessionId, defaultTargetType, defaultDistance } = useLocalSearchParams<{
    sessionId: string;
    defaultTargetType?: string;
    defaultDistance?: string;
  }>();

  // ═══════════════════════════════════════════════════════════════════════════
  // STATE
  // ═══════════════════════════════════════════════════════════════════════════

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

  // Navigation state
  const [step, setStep] = useState<Step>("form");
  const [saving, setSaving] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // Form state - NEW: Grouping vs Achievement
  const [targetType, setTargetType] = useState<TargetType>(
    (defaultTargetType as TargetType) || "grouping"
  );
  const [inputMethod, setInputMethod] = useState<InputMethod>("scan");
  
  // Distance state (used for scanned targets)
  const [selectedDistance, setSelectedDistance] = useState<number>(
    defaultDistance ? parseInt(defaultDistance) : 100
  );

  // Editable detections state (for scan results)
  const [editedDetections, setEditedDetections] = useState<EditableDetection[]>([]);

  // Auto-start camera if defaulting to grouping (scan-only)
  useEffect(() => {
    if (defaultTargetType === "grouping") {
      handleStartCamera();
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleTargetTypeChange = useCallback((type: TargetType) => {
    setTargetType(type);
    // Reset input method when changing target type
    if (type === "grouping") {
      setInputMethod("scan"); // Grouping is always scan
    }
  }, []);

  const handleInputMethodChange = useCallback((method: InputMethod) => {
    setInputMethod(method);
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetDetection();
    router.back();
  }, [resetDetection]);

  const handleStartCamera = useCallback(async () => {
    if (!permission?.granted) {
      const { granted } = await requestPermission();
      if (!granted) {
        Alert.alert("Camera Permission", "Camera access is required to scan targets.");
        return;
      }
    }
    startCapture();
    setStep("camera");
  }, [permission, requestPermission, startCapture]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSubmit = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (targetType === "grouping") {
      // Grouping: always scan
      await handleStartCamera();
    } else if (targetType === "achievement") {
      if (inputMethod === "scan") {
        // Achievement + Scan: open camera
        await handleStartCamera();
      } else {
        // Achievement + Manual: go to manual entry form
        setStep("manual_entry");
      }
    }
  }, [targetType, inputMethod, handleStartCamera]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handlePickImage = useCallback(async () => {
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      quality: 0.9,
    });

    if (!pickerResult.canceled && pickerResult.assets[0]?.uri) {
      setCapturedUri(pickerResult.assets[0].uri);
      setImage(pickerResult.assets[0].uri);
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
      // Initialize editable detections from AI results
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

  // ═══════════════════════════════════════════════════════════════════════════
  // SAVE HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Save a scanned target (Grouping or Achievement+Scan)
   * Both use paper_target_results with appropriate paper_type
   */
  const saveScannedTarget = useCallback(
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
        const manualCount = finalDetections.filter((d) => d.isManual).length;

        // Determine paper_type based on target type selection
        const paperType: PaperType = targetType === "grouping" ? "grouping" : "achievement";

        // Build training data if user made corrections
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

        // Use user-edited image if available, otherwise AI-annotated
        const finalImageBase64 = editedImageBase64 || result?.annotated_image_base64;

        // Get group size from overall_stats_mm (furthest distance between any 2 bullets)
        const groupSizeCm = result?.overall_stats_mm?.max_pair?.distance_cm ?? null;

        // Upload image to Supabase Storage
        let scannedImageUrl: string | null = null;
        if (finalImageBase64) {
          console.log("[AddTarget] Uploading scanned target image to storage...");
          scannedImageUrl = await uploadScannedTargetImage(finalImageBase64, sessionId);
          if (!scannedImageUrl) {
            console.warn("[AddTarget] Failed to upload image, saving without image");
          }
        }

        // For grouping targets, we don't track hits - only dispersion
        // For achievement targets, we track both
        const saveParams = {
          session_id: sessionId,
          distance_m: selectedDistance,
          lane_number: null,
          planned_shots: detectionCount, // Use detection count as bullets
          notes: null,
          target_data: null,
          paper_type: paperType,
          bullets_fired: detectionCount,
          // For grouping: hits don't matter, set to detection count
          // For achievement: use high confidence hits
          hits_total: paperType === "grouping" ? detectionCount : Math.min(rawHighConfHits, detectionCount),
          hits_inside_scoring: paperType === "grouping" ? null : rawHighConfHits,
          dispersion_cm: groupSizeCm,
          scanned_image_url: scannedImageUrl,
          result_notes: null,
        };

        await addTargetWithPaperResult(saveParams);

        // Submit corrections for model training (fire-and-forget)
        if (trainingData && shouldSubmitForTraining(trainingData as TrainingDataPayload)) {
          submitTrainingData(trainingData as TrainingDataPayload)
            .then((res) => console.log("[Training] Submitted:", res.message))
            .catch((err) => console.log("[Training] Failed:", err));
        }

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetDetection();
        router.back();
      } catch (error: any) {
        console.error("Failed to save scanned target:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", error.message || "Failed to save target");
        setSaving(false);
      }
    },
    [sessionId, selectedDistance, targetType, result, resetDetection]
  );

  /**
   * Save a manually entered achievement target
   */
  const saveManualAchievement = useCallback(
    async (data: { bulletsFired: number; hits: number; distance: number }) => {
      if (!sessionId) {
        Alert.alert("Error", "Session ID missing");
        return;
      }

      setSaving(true);

      try {
        // Manual achievement: paper_type = 'achievement', no image
        const saveParams = {
          session_id: sessionId,
          distance_m: data.distance,
          lane_number: null,
          planned_shots: data.bulletsFired,
          notes: null,
          target_data: null,
          paper_type: "achievement" as PaperType,
          bullets_fired: data.bulletsFired,
          hits_total: data.hits,
          hits_inside_scoring: data.hits,
          dispersion_cm: null, // No dispersion for manual entry
          scanned_image_url: null, // No image for manual entry
          result_notes: null,
        };

        await addTargetWithPaperResult(saveParams);

        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        resetDetection();
        router.back();
      } catch (error: any) {
        console.error("Failed to save manual achievement:", error);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert("Error", error.message || "Failed to save target");
        setSaving(false);
      }
    },
    [sessionId, resetDetection]
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

  // Results view (after scanning)
  if (step === "results" && result) {
    return (
      <ResultCard 
        result={result} 
        onDone={saveScannedTarget} 
        onRetake={handleRetake} 
        saving={saving}
        editedDetections={editedDetections}
        onDetectionsChange={setEditedDetections}
        targetType={targetType}
      />
    );
  }

  // Manual entry view (Achievement + Manual)
  if (step === "manual_entry") {
    return (
      <ManualAchievementEntry
        onSave={saveManualAchievement}
        onBack={() => setStep("form")}
        saving={saving}
        defaultDistance={selectedDistance}
      />
    );
  }

  // Default: Target form + Camera flow
  return (
    <>
      <TargetForm
        targetType={targetType}
        onTargetTypeChange={handleTargetTypeChange}
        inputMethod={inputMethod}
        onInputMethodChange={handleInputMethodChange}
        onSubmit={handleSubmit}
        onClose={handleClose}
        saving={saving}
      />

      <CameraFlow
        step={step}
        capturedUri={capturedUri}
        cameraRef={cameraRef}
        onCapture={handleCapture}
        onPickImage={handlePickImage}
        onSubmitPhoto={handleSubmitPhoto}
        onRetake={handleRetake}
        onClose={() => setStep("form")}
      />
    </>
  );
}
