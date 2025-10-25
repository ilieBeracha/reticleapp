import {
  DetectionResult,
  uploadForDetection,
} from "@/services/detectionService";
import { create } from "zustand";

export interface Detection {
  id: string;
  name: string;
  confidence: number;
  boundingBox?: BoundingBox;
  timestamp: string;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface DetectionStoreState {
  // State
  detections: Detection[];
  isDetecting: boolean;
  error: string | null;

  // Actions
  setDetections: (detections: Detection[]) => void;
  detect: (imageUri: string) => Promise<void>;
  clearError: () => void;
  clearDetections: () => void;
}

function transformDetectionResult(
  result: DetectionResult,
  index: number
): Detection {
  return {
    id: `detection_${Date.now()}_${index}`,
    name: result.class || "Detected Object", // Fallback if class is not provided
    confidence: result.confidence,
    boundingBox: result.bbox
      ? {
          x: result.bbox[0],
          y: result.bbox[1],
          width: result.bbox[2],
          height: result.bbox[3],
        }
      : undefined,
    timestamp: new Date().toISOString(),
  };
}

export const useDetectionStore = create<DetectionStoreState>((set) => ({
  // Initial state
  detections: [],
  isDetecting: false,
  error: null,

  // Actions
  setDetections: (detections) => set({ detections }),

  detect: async (imageUri: string) => {
    console.log("🔍 Detection store: Starting detection process");
    set({ isDetecting: true, error: null });

    try {
      console.log("📸 Detection store: Processing image:", imageUri);
      const response = await uploadForDetection(imageUri);

      console.log("📡 Detection store: Received API response:", response);

      // Transform API results to our Detection interface
      const transformedDetections = response.detections.map(
        transformDetectionResult
      );

      console.log("✅ Detection store: Detection completed successfully");
      console.log(
        "🎯 Detection store: Found",
        transformedDetections.length,
        "detections:",
        transformedDetections
      );

      set({
        detections: transformedDetections,
        isDetecting: false,
        error: null,
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      console.error("❌ Detection store: Detection failed:", errorMessage);
      set({
        isDetecting: false,
        error: errorMessage,
        detections: [], // Clear previous results on error
      });
    }
  },

  clearError: () => set({ error: null }),

  clearDetections: () => set({ detections: [], error: null }),
}));
