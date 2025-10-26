import { uploadForDetection } from "@/services/detectionService";
import {
  AnalyzeResponse,
  Detection as ApiDetection,
  QuadrantStats,
} from "@/types/api";
import { create } from "zustand";

export interface Detection {
  id: string;
  name: string;
  confidence: number;
  boundingBox: BoundingBox;
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
  annotatedImageBase64: string | null;
  quadrantStatsMm: QuadrantStats | null;
  bulletCount: number;
  isDetecting: boolean;
  error: string | null;
  userSelectedImage: string | null;

  // Actions
  setDetections: (detections: Detection[]) => void;
  setBulletCount: (count: number) => void;
  detect: (imageUri: string) => Promise<void>;
  clearError: () => void;
  clearDetections: () => void;
  setUserSelectedImage: (userSelectedImage: string) => void;

  // Editing actions
  addDetection: (detection: Detection) => void;
  removeDetection: (detectionId: string) => void;
  mergeDetections: (detectionIds: string[]) => void;
  separateDetection: (detectionId: string, count: number) => void;
}

function transformApiDetection(
  apiDetection: ApiDetection,
  index: number
): Detection {
  const [x1, y1, x2, y2] = apiDetection.bbox;
  return {
    id: `detection_${Date.now()}_${index}`,
    name: "Bullet Hole", // Fixed name since API doesn't provide class names
    confidence: apiDetection.confidence,
    boundingBox: {
      x: x1,
      y: y1,
      width: x2 - x1,
      height: y2 - y1,
    },
    timestamp: new Date().toISOString(),
  };
}

export const useDetectionStore = create<DetectionStoreState>((set) => ({
  // Initial state
  detections: [],
  annotatedImageBase64: null,
  quadrantStatsMm: null,
  bulletCount: 5, // Default to 5 bullets
  isDetecting: false,
  error: null,
  userSelectedImage: null,
  // Actions
  setDetections: (detections) => set({ detections }),
  setBulletCount: (bulletCount) => set({ bulletCount }),
  setUserSelectedImage: (userSelectedImage: string) =>
    set({ userSelectedImage }),
  detect: async (imageUri: string) => {
    console.log("🔍 Detection store: Starting detection process");
    set({ isDetecting: true, error: null });

    try {
      console.log("📸 Detection store: Processing image:", imageUri);
      const { bulletCount } = useDetectionStore.getState();
      console.log("🎯 Detection store: Expected bullets:", bulletCount);
      const response: AnalyzeResponse = await uploadForDetection(
        imageUri,
        bulletCount
      );

      console.log("📡 Detection store: Received AnalyzeResponse:", response);

      // Transform API results to our Detection interface
      const transformedDetections = response.detections.map(
        transformApiDetection
      );

      console.log("✅ Detection store: Detection completed successfully");
      console.log(
        "🎯 Detection store: Found",
        transformedDetections.length,
        "detections"
      );
      console.log(
        "🖼️ Detection store: Annotated image available:",
        !!response.annotated_image_base64
      );

      set({
        detections: transformedDetections,
        annotatedImageBase64: response.annotated_image_base64,
        quadrantStatsMm: response.quadrant_stats_mm,
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
        annotatedImageBase64: null,
        quadrantStatsMm: null,
      });
    }
  },

  clearError: () => set({ error: null }),

  clearDetections: () =>
    set({
      detections: [],
      annotatedImageBase64: null,
      quadrantStatsMm: null,
      error: null,
    }),

  // Editing actions implementation
  addDetection: (detection: Detection) =>
    set((state) => ({ detections: [...state.detections, detection] })),

  removeDetection: (detectionId: string) =>
    set((state) => ({
      detections: state.detections.filter((d) => d.id !== detectionId),
    })),

  mergeDetections: (detectionIds: string[]) =>
    set((state) => {
      const detectionsToMerge = state.detections.filter((d) =>
        detectionIds.includes(d.id)
      );
      const remainingDetections = state.detections.filter(
        (d) => !detectionIds.includes(d.id)
      );

      if (detectionsToMerge.length < 2) return state;

      // Calculate center point
      const centerX =
        detectionsToMerge.reduce(
          (sum, d) => sum + d.boundingBox.x + d.boundingBox.width / 2,
          0
        ) / detectionsToMerge.length;
      const centerY =
        detectionsToMerge.reduce(
          (sum, d) => sum + d.boundingBox.y + d.boundingBox.height / 2,
          0
        ) / detectionsToMerge.length;

      const mergedDetection: Detection = {
        id: `merged_${Date.now()}`,
        name: "Bullet Hole",
        confidence: Math.max(...detectionsToMerge.map((d) => d.confidence)),
        boundingBox: {
          x: centerX - 2,
          y: centerY - 2,
          width: 4,
          height: 4,
        },
        timestamp: new Date().toISOString(),
      };

      return {
        detections: [...remainingDetections, mergedDetection],
      };
    }),

  separateDetection: (detectionId: string, count: number) =>
    set((state) => {
      const detection = state.detections.find((d) => d.id === detectionId);
      if (!detection) return state;

      const remainingDetections = state.detections.filter(
        (d) => d.id !== detectionId
      );
      const separatedDetections: Detection[] = [];

      for (let i = 0; i < count; i++) {
        const angle = (i / count) * 2 * Math.PI;
        const radius = 3;
        const offsetX = Math.cos(angle) * radius;
        const offsetY = Math.sin(angle) * radius;

        separatedDetections.push({
          id: `separated_${Date.now()}_${i}`,
          name: "Bullet Hole",
          confidence: detection.confidence * 0.9,
          boundingBox: {
            x: detection.boundingBox.x + offsetX,
            y: detection.boundingBox.y + offsetY,
            width: detection.boundingBox.width,
            height: detection.boundingBox.height,
          },
          timestamp: new Date().toISOString(),
        });
      }

      return {
        detections: [...remainingDetections, ...separatedDetections],
      };
    }),
}));
