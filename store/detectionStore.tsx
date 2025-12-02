import { uploadForDetection } from "@/services/detectionService";
import type { AnalyzeResponse } from "@/types/api";
import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================
export type DetectionStatus = 
  | "idle"           // Initial state
  | "capturing"      // Camera is open
  | "analyzing"      // Processing image
  | "success"        // Results ready
  | "error";         // Something went wrong

export interface DetectionState {
  status: DetectionStatus;
  imageUri: string | null;
  result: AnalyzeResponse | null;
  error: string | null;
  expectedBullets: number;
}

export interface DetectionActions {
  // Start the detection flow
  startCapture: () => void;
  // Set the captured image
  setImage: (uri: string) => void;
  // Run analysis on the captured image
  analyze: () => Promise<AnalyzeResponse | null>;
  // Clear everything and reset
  reset: () => void;
  // Set error state
  setError: (error: string) => void;
}

// ============================================================================
// STORE
// ============================================================================
const initialState: DetectionState = {
  status: "idle",
  imageUri: null,
  result: null,
  error: null,
  expectedBullets: 0,
};

export const useDetectionStore = create<DetectionState & DetectionActions>((set, get) => ({
  ...initialState,

  startCapture: () => {
    set({
      status: "capturing",
      imageUri: null,
      result: null,
      error: null,
    });
  },

  setImage: (uri: string) => {
    set({ imageUri: uri });
  },

  analyze: async () => {
    const { imageUri } = get();

    if (!imageUri) {
      set({ status: "error", error: "No image captured" });
      return null;
    }

    set({ status: "analyzing", error: null });

    try {
      const result = await uploadForDetection(imageUri);
      set({ status: "success", result });
      return result;
    } catch (err: any) {
      const errorMessage = err.message || "Analysis failed";
      set({ status: "error", error: errorMessage });
      return null;
    }
  },

  reset: () => {
    set(initialState);
  },

  setError: (error: string) => {
    set({ status: "error", error });
  },
}));



