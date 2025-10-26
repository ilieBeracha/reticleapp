import { uploadForDetection } from "@/services/detectionService";
import { AnalyzeResponse, Detection as ApiDetection } from "@/types/api";
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
      const response: AnalyzeResponse = await uploadForDetection(imageUri);

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
      });
    }
  },

  clearError: () => set({ error: null }),

  clearDetections: () =>
    set({ detections: [], annotatedImageBase64: null, error: null }),
}));
