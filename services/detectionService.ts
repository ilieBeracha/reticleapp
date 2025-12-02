import {
  NetworkError,
  ValidationError,
  handleServiceError,
} from "@/lib/errors";
import { supabase } from "@/lib/supabase";
import { AnalyzeResponse, isAnalyzeResponse } from "@/types/api";
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