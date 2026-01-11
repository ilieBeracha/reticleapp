import type { AnalyzeDocumentResponse, AnalyzeResponse } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, G, Line } from "react-native-svg";
import ViewShot from "react-native-view-shot";
import {
  CANVAS_SIZE,
  COLORS,
  EditableDetection,
  EditMode,
  MARKER_RADIUS,
} from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION EDITOR
// Interactive canvas for adding/removing bullet hole detections
// ═══════════════════════════════════════════════════════════════════════════

/** Union type for detection results - supports both legacy and document analysis */
type DetectionResult = AnalyzeResponse | AnalyzeDocumentResponse;

interface DetectionEditorProps {
  result: DetectionResult;
  detections: EditableDetection[];
  onDetectionsChange: (detections: EditableDetection[]) => void;
  editMode: EditMode;
  onModeChange: (mode: EditMode) => void;
  captureRef: React.RefObject<ViewShot>;
}

const MAX_ZOOM = 6;
const MIN_ZOOM = 1;
const HISTORY_LIMIT = 50;

function clamp(value: number, min: number, max: number) {
  "worklet";
  return Math.min(max, Math.max(min, value));
}

function cloneDetections(dets: EditableDetection[]): EditableDetection[] {
  return dets.map((d) => ({
    ...d,
    bbox: [d.bbox[0], d.bbox[1], d.bbox[2], d.bbox[3]],
    center: [d.center[0], d.center[1]],
  })) as EditableDetection[];
}

export const DetectionEditor = React.memo(function DetectionEditor({
  result,
  detections,
  onDetectionsChange,
  editMode,
  onModeChange,
  captureRef,
}: DetectionEditorProps) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [localDetections, setLocalDetections] = useState<EditableDetection[]>(() =>
    cloneDetections(detections),
  );
  const localDetectionsRef = useRef<EditableDetection[]>(localDetections);

  // History (undo/redo)
  const historyRef = useRef<EditableDetection[][]>([cloneDetections(detections)]);
  const historyIndexRef = useRef(0);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Drag state (Move mode)
  const dragOffsetRef = useRef<{ dx: number; dy: number } | null>(null);
  const lastDragCommitAtRef = useRef(0);

  useEffect(() => {
    // Keep local copy in sync with parent; don't stomp current object references.
    setLocalDetections(cloneDetections(detections));
  }, [detections]);

  useEffect(() => {
    localDetectionsRef.current = localDetections;
  }, [localDetections]);

  useEffect(() => {
    // Clearing selection when mode changes avoids accidental moves.
    setSelectedId(null);
    dragOffsetRef.current = null;
  }, [editMode]);

  const updateHistoryFlags = useCallback(() => {
    const idx = historyIndexRef.current;
    const len = historyRef.current.length;
    setCanUndo(idx > 0);
    setCanRedo(idx < len - 1);
  }, []);

  const pushHistory = useCallback(
    (next: EditableDetection[]) => {
      const nextCloned = cloneDetections(next);
      const idx = historyIndexRef.current;
      const currentHistory = historyRef.current.slice(0, idx + 1);
      currentHistory.push(nextCloned);
      if (currentHistory.length > HISTORY_LIMIT) {
        currentHistory.splice(0, currentHistory.length - HISTORY_LIMIT);
      }
      historyRef.current = currentHistory;
      historyIndexRef.current = currentHistory.length - 1;
      updateHistoryFlags();
    },
    [updateHistoryFlags],
  );

  const commitDetections = useCallback(
    (next: EditableDetection[], opts?: { pushHistory?: boolean; syncParent?: boolean }) => {
      const { pushHistory: shouldPushHistory = true, syncParent = true } = opts ?? {};
      setLocalDetections(next);
      if (shouldPushHistory) pushHistory(next);
      if (syncParent) onDetectionsChange(next);
    },
    [onDetectionsChange, pushHistory],
  );

  // Calculate scale factors for coordinate mapping
  // Handles both AnalyzeResponse (uses width/height) and AnalyzeDocumentResponse (uses processed_width/height)
  const imageToCanvas = useMemo(() => {
    if (!result.metadata) return { x: 1, y: 1, offsetX: 0, offsetY: 0 };
    
    // Get image dimensions - document analysis uses processed dimensions, legacy uses width/height
    const imgWidth = 'processed_width' in result.metadata 
      ? result.metadata.processed_width 
      : result.metadata.width;
    const imgHeight = 'processed_height' in result.metadata 
      ? result.metadata.processed_height 
      : result.metadata.height;
    
    const imgAspect = imgWidth / imgHeight;
    const canvasAspect = 1; // Square canvas
    
    if (imgAspect > canvasAspect) {
      // Image is wider - fit width, letterbox top/bottom
      const displayWidth = CANVAS_SIZE;
      const displayHeight = CANVAS_SIZE / imgAspect;
      return {
        x: displayWidth / imgWidth,
        y: displayHeight / imgHeight,
        offsetX: 0,
        offsetY: (CANVAS_SIZE - displayHeight) / 2,
      };
    } else {
      // Image is taller - fit height, letterbox sides
      const displayHeight = CANVAS_SIZE;
      const displayWidth = CANVAS_SIZE * imgAspect;
      return {
        x: displayWidth / imgWidth,
        y: displayHeight / imgHeight,
        offsetX: (CANVAS_SIZE - displayWidth) / 2,
        offsetY: 0,
      };
    }
  }, [result.metadata]);

  const imgDims = useMemo(() => {
    if (!result.metadata) return { width: 0, height: 0 };
    const width = "processed_width" in result.metadata ? result.metadata.processed_width : result.metadata.width;
    const height = "processed_height" in result.metadata ? result.metadata.processed_height : result.metadata.height;
    return { width, height };
  }, [result.metadata]);

  const baseCanvasToImage = useCallback(
    (baseX: number, baseY: number) => {
      // If user taps in letterboxed area, ignore.
      const displayX = baseX - (imageToCanvas.offsetX || 0);
      const displayY = baseY - (imageToCanvas.offsetY || 0);
      if (displayX < 0 || displayY < 0) return null;
      const imgX = displayX / imageToCanvas.x;
      const imgY = displayY / imageToCanvas.y;
      if (imgX < 0 || imgY < 0 || imgX > imgDims.width || imgY > imgDims.height) return null;
      return { imgX, imgY };
    },
    [imageToCanvas.offsetX, imageToCanvas.offsetY, imageToCanvas.x, imageToCanvas.y, imgDims.height, imgDims.width],
  );

  const findNearestDetectionIndex = useCallback(
    (imgX: number, imgY: number, radiusImgPx: number) => {
      let bestIdx = -1;
      let bestDist = Infinity;
      const dets = localDetectionsRef.current;
      for (let i = 0; i < dets.length; i++) {
        const d = dets[i];
        const dx = d.center[0] - imgX;
        const dy = d.center[1] - imgY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      return bestDist <= radiusImgPx ? bestIdx : -1;
    },
    [],
  );

  const handleTapAtBaseCanvasPoint = useCallback(
    (baseX: number, baseY: number) => {
      const pt = baseCanvasToImage(baseX, baseY);
      if (!pt) return;
      const { imgX, imgY } = pt;

      const tapRadiusCanvasPx = 26;
      const tapRadiusImgPx = tapRadiusCanvasPx / imageToCanvas.x;

      if (editMode === "add") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        const newDetection: EditableDetection = {
          id: `manual-${Date.now()}`,
          bbox: [imgX - 15, imgY - 15, imgX + 15, imgY + 15],
          center: [imgX, imgY],
          confidence: 1.0,
          isManual: true,
        };
        commitDetections([...localDetectionsRef.current, newDetection]);
        return;
      }

      const nearestIdx = findNearestDetectionIndex(imgX, imgY, tapRadiusImgPx);
      if (nearestIdx === -1) {
        if (editMode === "move") setSelectedId(null);
        return;
      }

      if (editMode === "remove") {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = [...localDetectionsRef.current];
        next.splice(nearestIdx, 1);
        commitDetections(next);
        return;
      }

      // move mode: select marker
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedId(localDetectionsRef.current[nearestIdx].id);
    },
    [
      baseCanvasToImage,
      commitDetections,
      editMode,
      findNearestDetectionIndex,
      imageToCanvas.x,
    ],
  );

  // Get marker color based on confidence
  const getMarkerColor = useCallback((detection: EditableDetection) => {
    if (detection.isManual) return COLORS.primary;
    if (detection.confidence < 0.4) return COLORS.danger;
    if (detection.confidence < 0.6) return COLORS.warning;
    return COLORS.primary;
  }, []);

  // For document analysis, use rectified image (detections are in rectified coordinates)
  // For legacy analysis, use original image
  const displayImageBase64 = 'rectified_image_base64' in result 
    ? result.rectified_image_base64 
    : result.original_image_base64;

  // Zoom/pan state (applies on top of the base "contain" fit)
  const zoom = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);
  const pinchStartZoom = useSharedValue(1);

  const clampTranslate = useCallback(() => {
    "worklet";
    const maxT = (CANVAS_SIZE * (zoom.value - 1)) / 2;
    translateX.value = clamp(translateX.value, -maxT, maxT);
    translateY.value = clamp(translateY.value, -maxT, maxT);
  }, [translateX, translateY, zoom]);

  const resetZoom = useCallback(() => {
    zoom.value = withTiming(1, { duration: 160 });
    translateX.value = withTiming(0, { duration: 160 });
    translateY.value = withTiming(0, { duration: 160 });
  }, [translateX, translateY, zoom]);

  const zoomIn = useCallback(() => {
    const next = Math.min(MAX_ZOOM, zoom.value * 1.25);
    zoom.value = withTiming(next, { duration: 120 });
    const maxT = (CANVAS_SIZE * (next - 1)) / 2;
    translateX.value = clamp(translateX.value, -maxT, maxT);
    translateY.value = clamp(translateY.value, -maxT, maxT);
  }, [clampTranslate, zoom]);

  const zoomOut = useCallback(() => {
    const next = Math.max(MIN_ZOOM, zoom.value / 1.25);
    zoom.value = withTiming(next, { duration: 120 });
    if (next <= 1.0001) {
      translateX.value = withTiming(0, { duration: 120 });
      translateY.value = withTiming(0, { duration: 120 });
    } else {
      const maxT = (CANVAS_SIZE * (next - 1)) / 2;
      translateX.value = clamp(translateX.value, -maxT, maxT);
      translateY.value = clamp(translateY.value, -maxT, maxT);
    }
  }, [translateX, translateY, zoom]);

  const animatedContentStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: zoom.value }, { translateX: translateX.value }, { translateY: translateY.value }],
    };
  });

  const onDragBegin = useCallback(
    (baseX: number, baseY: number) => {
      if (editMode !== "move" || !selectedId) return;
      const pt = baseCanvasToImage(baseX, baseY);
      if (!pt) return;
      const idx = localDetectionsRef.current.findIndex((d) => d.id === selectedId);
      if (idx === -1) return;
      dragOffsetRef.current = {
        dx: localDetectionsRef.current[idx].center[0] - pt.imgX,
        dy: localDetectionsRef.current[idx].center[1] - pt.imgY,
      };
    },
    [baseCanvasToImage, editMode, selectedId],
  );

  const onDragUpdate = useCallback(
    (baseX: number, baseY: number) => {
      if (editMode !== "move" || !selectedId) return;
      const now = Date.now();
      if (now - lastDragCommitAtRef.current < 33) return; // ~30fps max in JS
      lastDragCommitAtRef.current = now;

      const pt = baseCanvasToImage(baseX, baseY);
      if (!pt) return;
      const idx = localDetectionsRef.current.findIndex((d) => d.id === selectedId);
      if (idx === -1) return;

      const offset = dragOffsetRef.current ?? { dx: 0, dy: 0 };
      const imgX = pt.imgX + offset.dx;
      const imgY = pt.imgY + offset.dy;

      const next = cloneDetections(localDetectionsRef.current);
      const d = next[idx];
      d.center = [imgX, imgY];
      d.bbox = [imgX - 15, imgY - 15, imgX + 15, imgY + 15];
      setLocalDetections(next);
    },
    [baseCanvasToImage, editMode, selectedId],
  );

  const onDragEnd = useCallback(() => {
    if (editMode !== "move" || !selectedId) return;
    dragOffsetRef.current = null;
    // Commit the final position to parent + history.
    commitDetections(localDetectionsRef.current);
  }, [commitDetections, editMode, selectedId]);

  const singleTap = useMemo(() => {
    return Gesture.Tap()
      .maxDistance(10)
      .onEnd((e) => {
        const c = CANVAS_SIZE / 2;
        const baseX = (e.x - c - translateX.value) / zoom.value + c;
        const baseY = (e.y - c - translateY.value) / zoom.value + c;
        runOnJS(handleTapAtBaseCanvasPoint)(baseX, baseY);
      });
  }, [handleTapAtBaseCanvasPoint, translateX, translateY, zoom]);

  const doubleTap = useMemo(() => {
    return Gesture.Tap()
      .numberOfTaps(2)
      .maxDistance(16)
      .onEnd(() => {
        if (zoom.value > 1.01) {
          zoom.value = withTiming(1, { duration: 160 });
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
        } else {
          zoom.value = withTiming(2.5, { duration: 160 });
          translateX.value = withTiming(0, { duration: 160 });
          translateY.value = withTiming(0, { duration: 160 });
        }
      });
  }, [translateX, translateY, zoom]);

  const pan = useMemo(() => {
    return Gesture.Pan()
      .minDistance(2)
      .onBegin((e) => {
        panStartX.value = translateX.value;
        panStartY.value = translateY.value;

        if (editMode === "move" && selectedId && e.numberOfPointers === 1) {
          const c = CANVAS_SIZE / 2;
          const baseX = (e.x - c - translateX.value) / zoom.value + c;
          const baseY = (e.y - c - translateY.value) / zoom.value + c;
          runOnJS(onDragBegin)(baseX, baseY);
        }
      })
      .onUpdate((e) => {
        if (editMode === "move" && selectedId && e.numberOfPointers === 1) {
          const c = CANVAS_SIZE / 2;
          const baseX = (e.x - c - translateX.value) / zoom.value + c;
          const baseY = (e.y - c - translateY.value) / zoom.value + c;
          runOnJS(onDragUpdate)(baseX, baseY);
          return;
        }

        if (zoom.value <= 1.0001) return;
        translateX.value = panStartX.value + e.translationX;
        translateY.value = panStartY.value + e.translationY;
        clampTranslate();
      })
      .onEnd(() => {
        if (editMode === "move" && selectedId) {
          runOnJS(onDragEnd)();
        }
      });
  }, [
    clampTranslate,
    editMode,
    onDragBegin,
    onDragEnd,
    onDragUpdate,
    panStartX,
    panStartY,
    selectedId,
    translateX,
    translateY,
    zoom,
  ]);

  const pinch = useMemo(() => {
    return Gesture.Pinch()
      .onBegin(() => {
        pinchStartZoom.value = zoom.value;
      })
      .onUpdate((e) => {
        zoom.value = clamp(pinchStartZoom.value * e.scale, MIN_ZOOM, MAX_ZOOM);
        if (zoom.value <= 1.0001) {
          translateX.value = 0;
          translateY.value = 0;
        } else {
          clampTranslate();
        }
      });
  }, [clampTranslate, pinchStartZoom, translateX, translateY, zoom]);

  const gesture = useMemo(() => {
    const taps = Gesture.Exclusive(doubleTap, singleTap);
    return Gesture.Simultaneous(pinch, pan, taps);
  }, [doubleTap, pan, pinch, singleTap]);

  const handleUndo = useCallback(() => {
    if (!canUndo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIdx = Math.max(0, historyIndexRef.current - 1);
    historyIndexRef.current = nextIdx;
    const snapshot = cloneDetections(historyRef.current[nextIdx] ?? []);
    setSelectedId(null);
    commitDetections(snapshot, { pushHistory: false, syncParent: true });
    updateHistoryFlags();
  }, [canUndo, commitDetections, updateHistoryFlags]);

  const handleRedo = useCallback(() => {
    if (!canRedo) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextIdx = Math.min(historyRef.current.length - 1, historyIndexRef.current + 1);
    historyIndexRef.current = nextIdx;
    const snapshot = cloneDetections(historyRef.current[nextIdx] ?? []);
    setSelectedId(null);
    commitDetections(snapshot, { pushHistory: false, syncParent: true });
    updateHistoryFlags();
  }, [canRedo, commitDetections, updateHistoryFlags]);

  return (
    <View style={styles.container}>
      {/* Mode Toggle */}
      <View style={styles.modeToggle}>
        <TouchableOpacity
          style={[styles.modeBtn, editMode === "remove" && styles.modeBtnActive]}
          onPress={() => onModeChange("remove")}
        >
          <Ionicons
            name="remove-circle"
            size={18}
            color={editMode === "remove" ? "#000" : COLORS.textMuted}
          />
          <Text style={[styles.modeBtnText, editMode === "remove" && styles.modeBtnTextActive]}>
            Remove
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, editMode === "add" && styles.modeBtnActive]}
          onPress={() => onModeChange("add")}
        >
          <Ionicons
            name="add-circle"
            size={18}
            color={editMode === "add" ? "#000" : COLORS.textMuted}
          />
          <Text style={[styles.modeBtnText, editMode === "add" && styles.modeBtnTextActive]}>
            Add
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeBtn, editMode === "move" && styles.modeBtnActive]}
          onPress={() => onModeChange("move")}
        >
          <Ionicons
            name="hand-left-outline"
            size={18}
            color={editMode === "move" ? "#000" : COLORS.textMuted}
          />
          <Text style={[styles.modeBtnText, editMode === "move" && styles.modeBtnTextActive]}>
            Move
          </Text>
        </TouchableOpacity>
      </View>

      {/* Hint */}
      <Text style={styles.hint}>
        {editMode === "add"
          ? "Tap to add missed bullet holes • Pinch to zoom"
          : editMode === "remove"
            ? "Tap near a marker to remove it • Pinch to zoom"
            : "Tap a marker to select, then drag to reposition • Pinch to zoom"}
      </Text>

      {/* Interactive Canvas */}
      <View style={styles.canvasContainer}>
        {/* Hidden ViewShot for capture (always unzoomed/full canvas) */}
        <View style={styles.hiddenCapture} pointerEvents="none">
          <ViewShot
            ref={captureRef}
            options={{ format: "jpg", quality: 0.9, result: "base64" }}
            style={styles.hiddenCaptureInner}
          >
            <Image
              source={{ uri: `data:image/jpeg;base64,${displayImageBase64}` }}
              style={styles.canvasImage}
              resizeMode="contain"
            />
            {imageLoaded && (
              <View style={styles.svgOverlay}>
                <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
                  {localDetections.map((detection) => {
                    const cx = detection.center[0] * imageToCanvas.x + (imageToCanvas.offsetX || 0);
                    const cy = detection.center[1] * imageToCanvas.y + (imageToCanvas.offsetY || 0);
                    const color = getMarkerColor(detection);

                    return (
                      <G key={detection.id}>
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={MARKER_RADIUS + 6}
                          fill="none"
                          stroke={color}
                          strokeWidth={1}
                          opacity={0.3}
                        />
                        <Circle
                          cx={cx}
                          cy={cy}
                          r={MARKER_RADIUS}
                          fill="none"
                          stroke={color}
                          strokeWidth={2.5}
                        />
                        {detection.isManual && (
                          <>
                            <Line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                            <Line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                          </>
                        )}
                      </G>
                    );
                  })}
                </Svg>
              </View>
            )}
          </ViewShot>
        </View>

        {/* Interactive zoomable editor */}
        <GestureDetector gesture={gesture}>
          <View style={styles.gestureArea}>
            <Animated.View style={[styles.zoomContent, animatedContentStyle]}>
              <Image
                source={{ uri: `data:image/jpeg;base64,${displayImageBase64}` }}
                style={styles.canvasImage}
                resizeMode="contain"
                onLoad={() => setImageLoaded(true)}
              />
              {imageLoaded && (
                <View style={styles.svgOverlay}>
                  <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
                    {localDetections.map((detection) => {
                      const cx = detection.center[0] * imageToCanvas.x + (imageToCanvas.offsetX || 0);
                      const cy = detection.center[1] * imageToCanvas.y + (imageToCanvas.offsetY || 0);
                      const color = getMarkerColor(detection);
                      const isSelected = selectedId === detection.id;

                      return (
                        <G key={detection.id}>
                          {isSelected && (
                            <Circle
                              cx={cx}
                              cy={cy}
                              r={MARKER_RADIUS + 10}
                              fill="none"
                              stroke={COLORS.info}
                              strokeWidth={2}
                              opacity={0.8}
                            />
                          )}
                          <Circle
                            cx={cx}
                            cy={cy}
                            r={MARKER_RADIUS + 6}
                            fill="none"
                            stroke={color}
                            strokeWidth={1}
                            opacity={0.3}
                          />
                          <Circle
                            cx={cx}
                            cy={cy}
                            r={MARKER_RADIUS}
                            fill="none"
                            stroke={color}
                            strokeWidth={2.5}
                          />
                          {detection.isManual && (
                            <>
                              <Line x1={cx - 6} y1={cy} x2={cx + 6} y2={cy} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                              <Line x1={cx} y1={cy - 6} x2={cx} y2={cy + 6} stroke="#fff" strokeWidth={1.5} opacity={0.8} />
                            </>
                          )}
                        </G>
                      );
                    })}
                  </Svg>
                </View>
              )}
            </Animated.View>
          </View>
        </GestureDetector>

        {/* Editor controls */}
        <View style={styles.controlsRow} pointerEvents="box-none">
          <View style={styles.controlsLeft}>
            <TouchableOpacity
              style={[styles.ctrlBtn, !canUndo && styles.ctrlBtnDisabled]}
              onPress={handleUndo}
              disabled={!canUndo}
            >
              <Ionicons name="arrow-undo" size={18} color={canUndo ? "#fff" : COLORS.textDimmer} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.ctrlBtn, !canRedo && styles.ctrlBtnDisabled]}
              onPress={handleRedo}
              disabled={!canRedo}
            >
              <Ionicons name="arrow-redo" size={18} color={canRedo ? "#fff" : COLORS.textDimmer} />
            </TouchableOpacity>
          </View>
          <View style={styles.controlsRight}>
            <TouchableOpacity style={styles.ctrlBtn} onPress={zoomOut}>
              <Ionicons name="remove" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={zoomIn}>
              <Ionicons name="add" size={18} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn} onPress={resetZoom}>
              <Ionicons name="contract-outline" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  modeToggle: {
    flexDirection: "row",
    backgroundColor: COLORS.cardHover,
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
  },
  modeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  modeBtnActive: {
    backgroundColor: COLORS.primary,
  },
  modeBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMuted,
  },
  modeBtnTextActive: {
    color: "#000",
  },
  hint: {
    fontSize: 13,
    color: COLORS.textDim,
    textAlign: "center",
    marginBottom: 12,
  },
  canvasContainer: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    alignSelf: "center",
  },
  gestureArea: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  zoomContent: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  canvasImage: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  svgOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  hiddenCapture: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    opacity: 0,
  },
  hiddenCaptureInner: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  controlsRow: {
    position: "absolute",
    left: 10,
    right: 10,
    bottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    pointerEvents: "box-none",
  },
  controlsLeft: {
    flexDirection: "row",
    gap: 8,
  },
  controlsRight: {
    flexDirection: "row",
    gap: 8,
  },
  ctrlBtn: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.55)",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  ctrlBtnDisabled: {
    opacity: 0.5,
  },
});

