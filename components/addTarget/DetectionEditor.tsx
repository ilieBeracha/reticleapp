import type { AnalyzeDocumentResponse, AnalyzeResponse } from "@/types/api";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useCallback, useMemo, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
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

export const DetectionEditor = React.memo(function DetectionEditor({
  result,
  detections,
  onDetectionsChange,
  editMode,
  onModeChange,
  captureRef,
}: DetectionEditorProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  // Calculate scale factors for coordinate mapping
  // Handles both AnalyzeResponse (uses width/height) and AnalyzeDocumentResponse (uses processed_width/height)
  const scale = useMemo(() => {
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

  // Handle tap on canvas for add/remove
  const handleCanvasTap = useCallback((evt: any) => {
    const touch = evt.nativeEvent.changedTouches?.[0] || evt.nativeEvent;
    const locationX = touch.locationX ?? touch.pageX;
    const locationY = touch.locationY ?? touch.pageY;
    
    if (locationX === undefined || locationY === undefined) {
      console.log("[DetectionEditor] No touch coordinates found");
      return;
    }
    
    // Convert tap coordinates to original image coordinates
    const imgX = (locationX - (scale.offsetX || 0)) / scale.x;
    const imgY = (locationY - (scale.offsetY || 0)) / scale.y;

    
    if (editMode === "add") {
      // Add new detection at tap location
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const newDetection: EditableDetection = {
        id: `manual-${Date.now()}`,
        bbox: [imgX - 15, imgY - 15, imgX + 15, imgY + 15],
        center: [imgX, imgY],
        confidence: 1.0, // Manual additions are 100% confidence
        isManual: true,
      };
      onDetectionsChange([...detections, newDetection]);
    } else {
      // Check if tap is near any detection to remove it
      const tapRadius = 30 / scale.x; // Tap tolerance in original image pixels
      const tappedIndex = detections.findIndex((d) => {
        const dx = d.center[0] - imgX;
        const dy = d.center[1] - imgY;
        return Math.sqrt(dx * dx + dy * dy) < tapRadius;
      });
      
      if (tappedIndex !== -1) {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newDetections = [...detections];
        newDetections.splice(tappedIndex, 1);
        onDetectionsChange(newDetections);
      }
    }
  }, [detections, editMode, onDetectionsChange, scale]);

  // Handle direct tap on marker (for removal)
  const handleMarkerTap = useCallback((index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newDetections = [...detections];
    newDetections.splice(index, 1);
    onDetectionsChange(newDetections);
  }, [detections, onDetectionsChange]);

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
      </View>

      {/* Hint */}
      <Text style={styles.hint}>
        {editMode === "add"
          ? "Tap anywhere to add missed bullet holes"
          : "Tap a marker to remove false detections"}
      </Text>

      {/* Interactive Canvas */}
      <View style={styles.canvasContainer}>
        {/* ViewShot for capturing the edited image */}
        <ViewShot
          ref={captureRef}
          options={{ format: "jpg", quality: 0.9, result: "base64" }}
          style={styles.viewShotInner}
        >
          {/* Base Image */}
          <Image
            source={{ uri: `data:image/jpeg;base64,${displayImageBase64}` }}
            style={styles.canvasImage}
            resizeMode="contain"
            onLoad={() => setImageLoaded(true)}
          />

          {/* SVG Overlay for Detection Markers */}
          {imageLoaded && (
            <View style={styles.svgOverlay}>
              <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
                {detections.map((detection) => {
                  const cx = detection.center[0] * scale.x + (scale.offsetX || 0);
                  const cy = detection.center[1] * scale.y + (scale.offsetY || 0);
                  const color = getMarkerColor(detection);

                  return (
                    <G key={detection.id}>
                      {/* Outer glow ring */}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={MARKER_RADIUS + 6}
                        fill="none"
                        stroke={color}
                        strokeWidth={1}
                        opacity={0.3}
                      />
                      {/* Main ring */}
                      <Circle
                        cx={cx}
                        cy={cy}
                        r={MARKER_RADIUS}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                      />
                      {/* Crosshair for manual additions */}
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

        {/* Invisible touch layer on top */}
        <View
          style={styles.touchLayer}
          onStartShouldSetResponder={() => true}
          onResponderRelease={handleCanvasTap}
        />

        {/* Tap targets for removal (larger touch area) */}
        {editMode === "remove" &&
          detections.map((detection, index) => {
            const cx = detection.center[0] * scale.x + (scale.offsetX || 0);
            const cy = detection.center[1] * scale.y + (scale.offsetY || 0);

            return (
              <TouchableOpacity
                key={`tap-${detection.id}`}
                style={[
                  styles.tapTarget,
                  {
                    left: cx - 20,
                    top: cy - 20,
                  },
                ]}
                onPress={() => handleMarkerTap(index)}
              />
            );
          })}
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
  viewShotInner: {
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
  touchLayer: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    backgroundColor: "transparent",
  },
  tapTarget: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
  },
});

