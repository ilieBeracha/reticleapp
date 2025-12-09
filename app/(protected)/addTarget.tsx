import {
  shouldSubmitForTraining,
  submitTrainingData,
  TrainingDataPayload,
} from "@/services/detectionService";
import {
  addTargetWithPaperResult,
  addTargetWithTacticalResult,
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
  ResultCard,
  Step,
  TacticalResultsEntry,
  TargetForm,
  TargetType,
} from "@/components/addTarget";

// ═══════════════════════════════════════════════════════════════════════════
// ADD TARGET SHEET
// Main orchestrator component for adding targets to a session
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

  // Navigation state - skip form for paper targets, go directly to camera
  const [step, setStep] = useState<Step>(
    (defaultTargetType as TargetType) === "paper" ? "camera" : "form"
  );
  const [saving, setSaving] = useState(false);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);

  // Form state
  const [targetType, setTargetType] = useState<TargetType>(
    (defaultTargetType as TargetType) || "paper"
  );
  const [selectedDistance, setSelectedDistance] = useState<number | null>(
    defaultDistance ? parseInt(defaultDistance) : 100
  );
  const [customDistance, setCustomDistance] = useState("");
  const [selectedBullets, setSelectedBullets] = useState<number | null>(5);
  const [customBullets, setCustomBullets] = useState("");
  const [laneNumber, setLaneNumber] = useState("");
  
  // Tactical results state
  const [tacticalHits, setTacticalHits] = useState("");
  const [tacticalTime, setTacticalTime] = useState("");
  const [stageCleared, setStageCleared] = useState(false);
  const [tacticalNotes, setTacticalNotes] = useState("");
  
  // Paper results state
  const [paperType] = useState<PaperType>("grouping");
  const [paperNotes] = useState("");

  // Editable detections state
  const [editedDetections, setEditedDetections] = useState<EditableDetection[]>([]);

  // Auto-start camera capture when landing on camera step directly
  useEffect(() => {
    if (step === "camera" && targetType === "paper") {
      // Request camera permission if needed
      const initCamera = async () => {
        if (!permission?.granted) {
          const { granted } = await requestPermission();
          if (!granted) {
            Alert.alert("Camera Permission", "Camera access is required to scan paper targets.");
            router.back();
            return;
          }
        }
        startCapture();
      };
      initCamera();
    }
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // COMPUTED VALUES
  // ═══════════════════════════════════════════════════════════════════════════
  
  const effectiveDistance = customDistance ? parseInt(customDistance) : selectedDistance ?? 100;
  const effectiveBullets = customBullets ? parseInt(customBullets) : selectedBullets ?? 5;

  // ═══════════════════════════════════════════════════════════════════════════
  // HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

  const handleTargetTypeChange = useCallback((type: TargetType) => {
    Haptics.selectionAsync();
    setTargetType(type);
  }, []);

  const handleDistanceSelect = useCallback((distance: number) => {
    Haptics.selectionAsync();
    setSelectedDistance(distance);
    setCustomDistance("");
  }, []);

  const handleBulletsSelect = useCallback((bullets: number) => {
    Haptics.selectionAsync();
    setSelectedBullets(bullets);
    setCustomBullets("");
  }, []);

  const handleCustomDistanceChange = useCallback((text: string) => {
    setCustomDistance(text);
    if (text) setSelectedDistance(null);
  }, []);

  const handleCustomBulletsChange = useCallback((text: string) => {
    setCustomBullets(text);
    if (text) setSelectedBullets(null);
  }, []);

  const handleClose = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    resetDetection();
    router.back();
  }, [resetDetection]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FORM SUBMISSION
  // ═══════════════════════════════════════════════════════════════════════════

  const handleSubmit = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (targetType === "paper") {
      // Open camera for paper targets
      if (!permission?.granted) {
        const { granted } = await requestPermission();
        if (!granted) {
          Alert.alert("Camera Permission", "Camera access is required to scan paper targets.");
          return;
        }
      }
      startCapture();
      setStep("camera");
    } else {    
      // Tactical: validate and go to results entry
      if (!effectiveDistance || effectiveDistance <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Invalid Distance", "Please enter a valid distance.");
        return;
      }

      if (!effectiveBullets || effectiveBullets <= 0) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        Alert.alert("Invalid Bullets", "Please enter a valid number of bullets.");
        return;
      }

      setStep("tactical_results");
    }
  }, [targetType, effectiveDistance, effectiveBullets, permission, requestPermission, startCapture]);

  // ═══════════════════════════════════════════════════════════════════════════
  // CAMERA HANDLERS
  // ═══════════════════════════════════════════════════════════════════════════

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

  const savePaperTarget = useCallback(
    async (finalDetections: EditableDetection[], editedImageBase64?: string) => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID missing");
      return;
    }

    setSaving(true);

    try {
      // Calculate stats from edited detections
      const detectionCount = finalDetections.length;
        const rawHighConfHits = finalDetections.filter(
          (d) => d.isManual || d.confidence >= 0.6
        ).length;
        // Cap hits to not exceed bullets fired
        const highConfHits = Math.min(rawHighConfHits, effectiveBullets);
        const manualCount = finalDetections.filter((d) => d.isManual).length;

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

        const saveParams = {
          session_id: sessionId,
          distance_m: effectiveDistance,
          lane_number: laneNumber ? parseInt(laneNumber) : null,
          planned_shots: effectiveBullets,
          notes: paperNotes || null,
          target_data: null,
          paper_type: paperType,
          bullets_fired: effectiveBullets,
          hits_total: Math.min(detectionCount, effectiveBullets),
          hits_inside_scoring: highConfHits,
          dispersion_cm: groupSizeCm, // Group size = max distance between any 2 bullets
          scanned_image_url: finalImageBase64
            ? `data:image/jpeg;base64,${finalImageBase64}`
            : null,
          result_notes: paperNotes || null,
        };

     

        const savedTarget = await addTargetWithPaperResult(saveParams);

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
      console.error("Failed to add paper target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
    },
    [sessionId, effectiveDistance, effectiveBullets, laneNumber, result, paperType, paperNotes, resetDetection]
  );

  const saveTacticalTarget = useCallback(async () => {
    if (!sessionId) {
      Alert.alert("Error", "Session ID missing");
      return;
    }

    const hits = parseInt(tacticalHits) || 0;
    const bulletsFired = effectiveBullets;

    if (hits > bulletsFired) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Invalid Hits", "Hits cannot exceed rounds fired.");
      return;
    }

    setSaving(true);

    try {
      await addTargetWithTacticalResult({
        session_id: sessionId,
        distance_m: effectiveDistance,
        lane_number: laneNumber ? parseInt(laneNumber) : null,
        planned_shots: effectiveBullets,
        bullets_fired: bulletsFired,
        hits: hits,
        is_stage_cleared: stageCleared,
        time_seconds: tacticalTime ? parseFloat(tacticalTime) : null,
        result_notes: tacticalNotes || null,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      resetDetection();
      router.back();
    } catch (error: any) {
      console.error("Failed to add tactical target:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", error.message || "Failed to add target");
      setSaving(false);
    }
  }, [
    sessionId,
    effectiveDistance,
    effectiveBullets,
    laneNumber,
    tacticalHits,
    tacticalTime,
    stageCleared,
    tacticalNotes,
    resetDetection,
  ]);

  // ═══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════════════════════

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
        distance={effectiveDistance}
        onDistanceChange={(d) => {
          setSelectedDistance(d);
          setCustomDistance("");
        }}
      />
    );
  }

  // Tactical results entry
  if (step === "tactical_results") {
    return (
        <TacticalResultsEntry
          distance={effectiveDistance}
          plannedRounds={effectiveBullets}
          hits={tacticalHits}
          setHits={setTacticalHits}
          time={tacticalTime}
          setTime={setTacticalTime}
          stageCleared={stageCleared}
          setStageCleared={setStageCleared}
          notes={tacticalNotes}
          setNotes={setTacticalNotes}
          onSave={saveTacticalTarget}
          onBack={() => setStep("form")}
          saving={saving}
        />
    );
  }

  // Default: Target form
  return (
    <>
      <TargetForm
        targetType={targetType}
        onTargetTypeChange={handleTargetTypeChange}
        selectedDistance={selectedDistance}
        onDistanceSelect={handleDistanceSelect}
        customDistance={customDistance}
        onCustomDistanceChange={handleCustomDistanceChange}
        selectedBullets={selectedBullets}
        onBulletsSelect={handleBulletsSelect}
        customBullets={customBullets}
        onCustomBulletsChange={handleCustomBulletsChange}
        laneNumber={laneNumber}
        onLaneNumberChange={setLaneNumber}
        effectiveDistance={effectiveDistance}
        effectiveBullets={effectiveBullets}
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
