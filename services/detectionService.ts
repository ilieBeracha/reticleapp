import {
  NetworkError,
  ValidationError,
  handleServiceError,
} from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import {
  AnalyzeDocumentResponse,
  AnalyzeResponse,
  DetectDocumentResponse,
  RectifyOnlyResponse,
  isAnalyzeDocumentResponse,
  isAnalyzeResponse,
  isDetectDocumentResponse,
  isRectifyOnlyResponse,
} from "@/types/api";
import { decode } from "base64-arraybuffer";

// Type for training/correction data
export interface TrainingDataPayload {
  original_image_base64: string;
  edited_image_base64?: string;
  original_detections: Array<{
    center: [number, number];
    bbox: [number, number, number, number];
    confidence: number;
  }>;
  final_detections: Array<{
    center: [number, number];
    bbox: [number, number, number, number];
    confidence: number;
    is_manual: boolean;
  }>;
  edits: {
    added: number;
    removed: number;
  };
}

// Storage bucket name for training images
const TRAINING_BUCKET = "training-corrections";
  
  const API_URL = process.env.EXPO_PUBLIC_DETECT_BASE_URL || ""; // your FastAPI endpoint
  
  if (!API_URL) {
    throw new Error("EXPO_PUBLIC_DETECT_BASE_URL is not defined");
  }
  
  export async function uploadForDetection(
    imageUri: string,
  ): Promise<AnalyzeResponse> {
    if (!imageUri) {
      throw new ValidationError("Image URI is required");
    }   
  
    const formData = new FormData();
    formData.append("file", {
      uri: imageUri,
      name: "target.jpg",
      type: "image/jpeg",
    } as any);
  
    formData.append("min_confidence", "0.2");
    formData.append("clustering_distance", "120.0");
    formData.append("enhance_closeup", "true");
  
    try {
      const response = await fetch(`${API_URL}/analyze`, {
        method: "POST",
        body: formData,
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        if (response.status >= 400 && response.status < 500) {
          throw new ValidationError(
            `Client error: ${response.status} - ${errorText}`
          );
        } else if (response.status >= 500) {
          throw new NetworkError(
            `Server error: ${response.status} - ${errorText}`
          );
        } else {
          throw new NetworkError(`HTTP error: ${response.status} - ${errorText}`);
        }
      }
  
      const result = await response.json();
      console.log("[DetectionService] Detection result:", result);
      if (!isAnalyzeResponse(result)) {
        throw new ValidationError(
          "Invalid response structure from detection API"
        );
      }
  
      return result;
    } catch (err: any) {
      if (err.name === "ValidationError" || err.name === "NetworkError") {
        throw err;
      }

      if (err.name === "TypeError" && err.message?.includes("fetch")) {
        throw new NetworkError("Failed to connect to detection service");
      }

      handleServiceError(err, "Failed to upload image for detection");
    }
  }

/** Options for document analysis */
export interface AnalyzeDocumentOptions {
  /** Pre-detected corner coordinates [[x,y], ...] in order: TL, TR, BR, BL */
  corners?: [number, number][];
  /** Minimum confidence threshold (default: 0.2 - same as legacy) */
  minConfidence?: number;
  /** Use multi-scale detection for close-ups (default: true) */
  enhanceCloseup?: boolean;
  /** Skip rectification and process as-is (default: false) */
  skipRectification?: boolean;
}

/**
 * Analyze A4 document with automatic perspective correction and bullet detection.
 *
 * This is the RECOMMENDED function for mobile scanning workflows.
 * It handles document detection, perspective warp, and bullet detection in one call.
 *
 * @param imageUri - URI to the image file
 * @param options - Optional configuration for analysis
 * @returns Document analysis response with world coordinates (mm)
 *
 * @example
 * ```ts
 * // Basic usage
 * const result = await analyzeDocument(imageUri);
 *
 * // With pre-detected corners from device
 * const result = await analyzeDocument(imageUri, {
 *   corners: [[100, 100], [900, 100], [900, 1200], [100, 1200]]
 * });
 *
 * // Skip rectification (fallback mode)
 * const result = await analyzeDocument(imageUri, { skipRectification: true });
 * ```
 */
export async function analyzeDocument(
  imageUri: string,
  options: AnalyzeDocumentOptions = {}
): Promise<AnalyzeDocumentResponse> {
  if (!imageUri) {
    throw new ValidationError("Image URI is required");
  }

  const {
    corners,
    minConfidence = 0.2, // Match legacy threshold for better detection
    enhanceCloseup = true,
    skipRectification = false,
  } = options;

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "document.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("min_confidence", minConfidence.toString());
  formData.append("enhance_closeup", enhanceCloseup.toString());
  formData.append("skip_rectification", skipRectification.toString());

  // Add corners if provided
  if (corners && corners.length === 4) {
    formData.append("corners", JSON.stringify(corners));
  }

  try {
    const response = await fetch(`${API_URL}/analyze_document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status >= 400 && response.status < 500) {
        throw new ValidationError(
          `Client error: ${response.status} - ${errorText}`
        );
      } else if (response.status >= 500) {
        throw new NetworkError(
          `Server error: ${response.status} - ${errorText}`
        );
      } else {
        throw new NetworkError(`HTTP error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log("[DetectionService] Document analysis result:", result);

    if (!isAnalyzeDocumentResponse(result)) {
      throw new ValidationError(
        "Invalid response structure from document analysis API"
      );
    }

    return result;
  } catch (err: any) {
    if (err.name === "ValidationError" || err.name === "NetworkError") {
      throw err;
    }

    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new NetworkError("Failed to connect to detection service");
    }

    handleServiceError(err, "Failed to analyze document");
  }

}

/**
 * Detect document corners only (no bullet detection).
 *
 * Use this to:
 * - Check if document is detected before full analysis
 * - Get corner coordinates for preview/UI feedback
 * - Validate document alignment quality
 *
 * @param imageUri - URI to the image file
 * @param debug - If true, return debug visualization image
 * @returns Document detection result with corners if found
 */
export async function detectDocument(
  imageUri: string,
  debug: boolean = false
): Promise<DetectDocumentResponse> {
  if (!imageUri) {
    throw new ValidationError("Image URI is required");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "document.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("debug", debug.toString());

  try {
    const response = await fetch(`${API_URL}/detect_document`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status >= 400 && response.status < 500) {
        throw new ValidationError(
          `Client error: ${response.status} - ${errorText}`
        );
      } else if (response.status >= 500) {
        throw new NetworkError(
          `Server error: ${response.status} - ${errorText}`
        );
      } else {
        throw new NetworkError(`HTTP error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log("[DetectionService] Document detection result:", result);

    if (!isDetectDocumentResponse(result)) {
      throw new ValidationError(
        "Invalid response structure from document detection API"
      );
    }

    return result;
  } catch (err: any) {
    if (err.name === "ValidationError" || err.name === "NetworkError") {
      throw err;
    }

    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new NetworkError("Failed to connect to detection service");
    }

    handleServiceError(err, "Failed to detect document");
  }

}

/**
 * Rectify document without running bullet detection.
 *
 * Use this for:
 * - Getting a clean top-down document image
 * - Manual inspection before analysis
 * - Debugging rectification issues
 *
 * @param imageUri - URI to the image file
 * @param corners - Optional pre-detected corners
 * @returns Rectified image and scale info
 */
export async function rectifyOnly(
  imageUri: string,
  corners?: [number, number][]
): Promise<RectifyOnlyResponse> {
  if (!imageUri) {
    throw new ValidationError("Image URI is required");
  }

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "document.jpg",
    type: "image/jpeg",
  } as any);

  if (corners && corners.length === 4) {
    formData.append("corners", JSON.stringify(corners));
  }

  try {
    const response = await fetch(`${API_URL}/rectify_only`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status >= 400 && response.status < 500) {
        throw new ValidationError(
          `Client error: ${response.status} - ${errorText}`
        );
      } else if (response.status >= 500) {
        throw new NetworkError(
          `Server error: ${response.status} - ${errorText}`
        );
      } else {
        throw new NetworkError(`HTTP error: ${response.status} - ${errorText}`);
      }
    }

    const result = await response.json();
    console.log("[DetectionService] Rectification result:", result);

    if (!isRectifyOnlyResponse(result)) {
      throw new ValidationError(
        "Invalid response structure from rectify API"
      );
    }

    return result;
  } catch (err: any) {
    if (err.name === "ValidationError" || err.name === "NetworkError") {
      throw err;
    }

    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new NetworkError("Failed to connect to detection service");
    }

    handleServiceError(err, "Failed to rectify document");
  }

}

/**
 * Upload an image to Supabase Storage for training
 * @param base64Image - Base64 encoded image (with or without data URI prefix)
 * @param filename - The filename to save as
 * @returns Public URL of the uploaded image
 */
async function uploadTrainingImage(
  base64Image: string,
  filename: string
): Promise<string | null> {
  try {
    // Strip data URI prefix if present
    const base64Data = base64Image.includes(",")
      ? base64Image.split(",")[1]
      : base64Image;

    // Convert base64 to ArrayBuffer
    const arrayBuffer = decode(base64Data);

    // Upload to Supabase Storage
    const { data, error } = await supabase.storage
      .from(TRAINING_BUCKET)
      .upload(`images/${filename}`, arrayBuffer, {
        contentType: "image/jpeg",
        upsert: true,
      });

    if (error) {
      console.warn("[Storage] Upload failed:", error.message);
      return null;
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(TRAINING_BUCKET)
      .getPublicUrl(`images/${filename}`);

    console.log("[Storage] Uploaded:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (err: any) {
    console.warn("[Storage] Upload error:", err.message);
    return null;
  }
}

/**
 * Submit user-corrected detection data for model training/improvement.
 * Uploads images to Supabase Storage first, then sends URLs to backend.
 * 
 * @param trainingData - The training payload with original + corrected detections
 * @returns Success status and any feedback from the training endpoint
 */
export async function submitTrainingData(
  trainingData: TrainingDataPayload
): Promise<{ success: boolean; message?: string }> {
  if (!trainingData.original_image_base64) {
    throw new ValidationError("Original image is required for training");
  }

  if (trainingData.final_detections.length === 0 && trainingData.edits.removed === 0) {
    // No meaningful corrections to submit
    return { success: true, message: "No corrections to submit" };
  }

  try {
    // Generate unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `correction_${timestamp}.jpg`;

    // Upload original image to Supabase Storage
    console.log("[Training] Uploading image to Supabase Storage...");
    const imageUrl = await uploadTrainingImage(
      trainingData.original_image_base64,
      filename
    );

    // Upload annotated image if available
    let annotatedUrl: string | null = null;
    if (trainingData.edited_image_base64) {
      annotatedUrl = await uploadTrainingImage(
        trainingData.edited_image_base64,
        `annotated_${filename}`
      );
    }

    // Send URLs (or fall back to base64 if upload failed)
    const payload = imageUrl
      ? {
          // New format: URLs
          image_url: imageUrl,
          annotated_image_url: annotatedUrl,
          original_predictions: trainingData.original_detections,
          user_corrections: trainingData.final_detections,
          correction_summary: trainingData.edits,
          timestamp: new Date().toISOString(),
        }
      : {
          // Fallback: base64 (if storage upload failed)
          image: trainingData.original_image_base64,
          annotated_image: trainingData.edited_image_base64,
          original_predictions: trainingData.original_detections,
          user_corrections: trainingData.final_detections,
          correction_summary: trainingData.edits,
          timestamp: new Date().toISOString(),
        };

    console.log("[Training] Sending to backend:", imageUrl ? "URL mode" : "base64 fallback");

    const response = await fetch(`${API_URL}/training/submit`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn("[TrainingData] Failed to submit:", errorText);
      // Don't throw - training submission is best-effort
      return { success: false, message: errorText };
    }

    const result = await response.json();
    console.log("[TrainingData] Successfully submitted correction data");
    return { success: true, message: result.message };
  } catch (err: any) {
    console.warn("[TrainingData] Could not submit training data:", err.message);
    // Best-effort - don't fail the main save operation
    return { success: false, message: err.message };
  }
}

/**
 * Helper to check if we should submit training data based on edit threshold
 */
export function shouldSubmitForTraining(trainingData: TrainingDataPayload | null): boolean {
  if (!trainingData) return false;
  
  // Submit if user made any corrections
  return trainingData.edits.added > 0 || trainingData.edits.removed > 0;
}