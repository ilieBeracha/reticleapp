import {
  AnalyzeDocumentOptions,
  analyzeDocument as analyzeDocumentService,
  uploadForDetection,
} from "@/services/detectionService";
import type { AnalyzeDocumentResponse, AnalyzeResponse } from "@/types/api";
import { create } from "zustand";

// ============================================================================
// TYPES
// ============================================================================
export type DetectionStatus =
  | "idle" // Initial state
  | "capturing" // Camera is open
  | "analyzing" // Processing image
  | "success" // Results ready
  | "error"; // Something went wrong

/** Union type for detection results - supports both legacy and document analysis */
export type DetectionResult = AnalyzeResponse | AnalyzeDocumentResponse;

export interface DetectionState {
  status: DetectionStatus;
  imageUri: string | null;
  result: DetectionResult | null;
  error: string | null;
  expectedBullets: number;
  /** Whether document rectification was used */
  useDocumentAnalysis: boolean;
}

export interface DetectionActions {
  // Start the detection flow
  startCapture: () => void;
  // Set the captured image
  setImage: (uri: string) => void;
  // Run document analysis with rectification (recommended)
  analyzeDocument: (options?: AnalyzeDocumentOptions) => Promise<AnalyzeDocumentResponse | null>;
  // Run legacy analysis without rectification
  analyze: () => Promise<AnalyzeResponse | null>;
  // Clear everything and reset
  reset: () => void;
  // Set error state
  setError: (error: string) => void;
  // Toggle document analysis mode
  setUseDocumentAnalysis: (use: boolean) => void;
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
  // Disabled until /analyze_document endpoint is deployed to backend
  // Set to true once the endpoint is live
  useDocumentAnalysis: true,
};

export const useDetectionStore = create<DetectionState & DetectionActions>(
  (set, get) => ({
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

    setUseDocumentAnalysis: (use: boolean) => {
      set({ useDocumentAnalysis: use });
    },

    /**
     * Run document analysis with automatic perspective correction.
     * This is the RECOMMENDED method for mobile scanning workflows.
     */
    analyzeDocument: async (options?: AnalyzeDocumentOptions) => {
      const { imageUri } = get();

      if (!imageUri) {
        set({ status: "error", error: "No image captured" });
        return null;
      }

      set({ status: "analyzing", error: null });

      try {
        console.log("[DetectionStore] Starting document analysis...");
        const result = await analyzeDocumentService(imageUri, options);

        // Log rectification info
        if (result.rectification_info) {
          console.log(
            "[DetectionStore] Rectification:",
            result.rectification_info.success
              ? `✅ ${result.rectification_info.method}`
              : `⚠️ ${result.rectification_info.message}`
          );
        }

        set({ status: "success", result });
        return result;
      } catch (err: any) {
        const errorMessage = err.message || "Document analysis failed";
        console.error("[DetectionStore] Analysis error:", errorMessage);
        set({ status: "error", error: errorMessage });
        return null;
      }
    },

    /**
     * Run analysis - tries document analysis first, falls back to legacy if needed.
     */
    analyze: async () => {
      const { imageUri, useDocumentAnalysis } = get();

      if (!imageUri) {
        set({ status: "error", error: "No image captured" });
        return null;
      }

      set({ status: "analyzing", error: null });

      // Try document analysis first if enabled
      if (useDocumentAnalysis) {
        try {
          console.log("[DetectionStore] Trying document analysis...");
          const docResult = await get().analyzeDocument();
          if (docResult && docResult.detections) {
            console.log("[DetectionStore] Document analysis succeeded with", docResult.detections.length, "detections");
            return docResult as unknown as AnalyzeResponse;
          }
        } catch (err: any) {
          console.warn("[DetectionStore] Document analysis failed, falling back to legacy:", err.message);
          // Fall through to legacy analysis
        }
      }

      // Legacy analysis (fallback or if document analysis is disabled)
      try {
        console.log("[DetectionStore] Using legacy analysis...");
        const result = await uploadForDetection(imageUri);
        console.log("[DetectionStore] Legacy analysis succeeded with", result.detections?.length || 0, "detections");
        set({ status: "success", result });
        return result;
      } catch (err: any) {
        const errorMessage = err.message || "Analysis failed";
        console.error("[DetectionStore] All analysis methods failed:", errorMessage);
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
  })
);







