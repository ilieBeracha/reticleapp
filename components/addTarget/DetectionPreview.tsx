import React, { useMemo } from "react";
import { Image, StyleSheet, View } from "react-native";
import Svg, { Circle, G, Line } from "react-native-svg";
import type { AnalyzeResponse } from "@/types/api";
import { CANVAS_SIZE, COLORS, MARKER_RADIUS, EditableDetection } from "./types";

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION PREVIEW
// View-only display of detected bullet holes on the target image
// ═══════════════════════════════════════════════════════════════════════════

interface DetectionPreviewProps {
  result: AnalyzeResponse;
  detections: EditableDetection[];
}

export const DetectionPreview = React.memo(function DetectionPreview({
  result,
  detections,
}: DetectionPreviewProps) {
  // Calculate scale factors for coordinate mapping
  const scale = useMemo(() => {
    if (!result.metadata) return { x: 1, y: 1, offsetX: 0, offsetY: 0 };
    
    const imgAspect = result.metadata.width / result.metadata.height;
    const canvasAspect = 1;
    
    if (imgAspect > canvasAspect) {
      const displayWidth = CANVAS_SIZE;
      const displayHeight = CANVAS_SIZE / imgAspect;
      return {
        x: displayWidth / result.metadata.width,
        y: displayHeight / result.metadata.height,
        offsetX: 0,
        offsetY: (CANVAS_SIZE - displayHeight) / 2,
      };
    } else {
      const displayHeight = CANVAS_SIZE;
      const displayWidth = CANVAS_SIZE * imgAspect;
      return {
        x: displayWidth / result.metadata.width,
        y: displayHeight / result.metadata.height,
        offsetX: (CANVAS_SIZE - displayWidth) / 2,
        offsetY: 0,
      };
    }
  }, [result.metadata]);

  // Dynamically calculate the max pair from CURRENT detections
  // This recalculates whenever user adds/removes bullets
  const maxPairData = useMemo(() => {
    if (detections.length < 2) return null;
    
    let maxDistance = 0;
    let maxIndices: [number, number] = [0, 1];
    
    // Find the two bullets that are furthest apart
    for (let i = 0; i < detections.length; i++) {
      for (let j = i + 1; j < detections.length; j++) {
        const dx = detections[i].center[0] - detections[j].center[0];
        const dy = detections[i].center[1] - detections[j].center[1];
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance > maxDistance) {
          maxDistance = distance;
          maxIndices = [i, j];
        }
      }
    }
    
    // Convert pixel distance to cm using scale_info if available
    let distanceCm: number | null = null;
    if (result.scale_info?.cm_per_pixel) {
      distanceCm = maxDistance * result.scale_info.cm_per_pixel;
    }
    
    return {
      indices: maxIndices,
      distancePx: maxDistance,
      distanceCm,
    };
  }, [detections, result.scale_info]);

  // Get marker color based on confidence
  const getMarkerColor = (detection: EditableDetection) => {
    if (detection.isManual) return COLORS.primary;
    if (detection.confidence < 0.4) return COLORS.danger;
    if (detection.confidence < 0.6) return COLORS.warning;
    return COLORS.primary;
  };

  // Check if a detection is part of the max pair
  const isMaxPairBullet = (index: number): boolean => {
    if (!maxPairData) return false;
    return maxPairData.indices.includes(index);
  };

  // Get max pair bullet positions for drawing the connecting line
  const maxPairPositions = useMemo(() => {
    if (!maxPairData) return null;
    
    const bullet1 = detections[maxPairData.indices[0]];
    const bullet2 = detections[maxPairData.indices[1]];
    
    if (!bullet1 || !bullet2) return null;
    
    return {
      x1: bullet1.center[0] * scale.x + scale.offsetX,
      y1: bullet1.center[1] * scale.y + scale.offsetY,
      x2: bullet2.center[0] * scale.x + scale.offsetX,
      y2: bullet2.center[1] * scale.y + scale.offsetY,
    };
  }, [maxPairData, detections, scale]);

  return (
    <View style={styles.container}>
      <Image
        source={{ uri: `data:image/jpeg;base64,${result.original_image_base64}` }}
        style={styles.image}
        resizeMode="contain"
      />
      
      {/* Overlay markers on image */}
      <View style={styles.markersOverlay}>
        <Svg width={CANVAS_SIZE} height={CANVAS_SIZE} viewBox={`0 0 ${CANVAS_SIZE} ${CANVAS_SIZE}`}>
          {/* Connecting line between max pair bullets */}
          {maxPairPositions && (
            <G>
              {/* Glowing line effect */}
              <Line
                x1={maxPairPositions.x1}
                y1={maxPairPositions.y1}
                x2={maxPairPositions.x2}
                y2={maxPairPositions.y2}
                stroke="#EF4444"
                strokeWidth={4}
                opacity={0.3}
              />
              {/* Main dashed line */}
              <Line
                x1={maxPairPositions.x1}
                y1={maxPairPositions.y1}
                x2={maxPairPositions.x2}
                y2={maxPairPositions.y2}
                stroke="#EF4444"
                strokeWidth={2}
                strokeDasharray="8,4"
              />
            </G>
          )}

          {/* Regular detection markers */}
          {detections.map((detection, index) => {
            const cx = detection.center[0] * scale.x + scale.offsetX;
            const cy = detection.center[1] * scale.y + scale.offsetY;
            const color = getMarkerColor(detection);
            const isMaxPair = isMaxPairBullet(index);

            return (
              <G key={detection.id}>
                {/* Max pair highlight - big red pulsing circle */}
                {isMaxPair && (
                  <>
                    {/* Outer glow */}
                    <Circle cx={cx} cy={cy} r={MARKER_RADIUS + 16} fill="none" stroke="#EF4444" strokeWidth={2} opacity={0.2} />
                    <Circle cx={cx} cy={cy} r={MARKER_RADIUS + 12} fill="none" stroke="#EF4444" strokeWidth={2} opacity={0.4} />
                    {/* Main highlight ring */}
                    <Circle cx={cx} cy={cy} r={MARKER_RADIUS + 8} fill="none" stroke="#EF4444" strokeWidth={3} />
                  </>
                )}
                
                {/* Standard marker */}
                <Circle cx={cx} cy={cy} r={MARKER_RADIUS + 4} fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
                <Circle cx={cx} cy={cy} r={MARKER_RADIUS} fill="none" stroke={color} strokeWidth={2.5} />
                
                {/* Crosshair for manual additions */}
                {detection.isManual && (
                  <>
                    <Line x1={cx - 5} y1={cy} x2={cx + 5} y2={cy} stroke="#fff" strokeWidth={1.5} />
                    <Line x1={cx} y1={cy - 5} x2={cx} y2={cy + 5} stroke="#fff" strokeWidth={1.5} />
                  </>
                )}
              </G>
            );
          })}
        </Svg>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#1a1a1a",
    alignSelf: "center",
    marginBottom: 16,
  },
  image: {
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
  markersOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    width: CANVAS_SIZE,
    height: CANVAS_SIZE,
  },
});

