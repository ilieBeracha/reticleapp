import {
  NetworkError,
  ValidationError,
  handleServiceError,
} from "@/lib/errors";
import { AnalyzeResponse, isAnalyzeResponse } from "@/types/api";

const API_URL = process.env.EXPO_PUBLIC_DETECT_BASE_URL || ""; // your FastAPI endpoint

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_DETECT_BASE_URL is not defined");
}

export async function uploadForDetection(
  imageUri: string,
  expectedBullets: number
): Promise<AnalyzeResponse> {
  console.log("🚀 Detection service: Starting upload to", API_URL);
  console.log("📁 Detection service: Image URI:", imageUri);
  console.log("🎯 Detection service: Expected bullets:", expectedBullets);

  // Validate input parameters
  if (!imageUri) {
    throw new ValidationError("Image URI is required");
  }
  if (expectedBullets < 0) {
    throw new ValidationError("Expected bullets must be a non-negative number");
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
  formData.append("expected_bullets", expectedBullets.toString());

  try {
    console.log("📤 Detection service: Sending request to API...");
    const response = await fetch(`${API_URL}/analyze`, {
      method: "POST",
      // Remove Content-Type header - let the browser set it automatically for FormData
      body: formData,
    });

    console.log(
      "📥 Detection service: Received response with status:",
      response.status
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Detection service: Server error response:", errorText);

      // Handle different HTTP status codes appropriately
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

    // Validate response structure
    if (!isAnalyzeResponse(result)) {
      console.error(
        "❌ Detection service: Invalid response structure:",
        result
      );
      throw new ValidationError(
        "Invalid response structure from detection API"
      );
    }

    console.log("📋 Detection service: Valid AnalyzeResponse received");
    return result;
  } catch (err: any) {
    // If it's already a ServiceError, re-throw it
    if (err.name === "ValidationError" || err.name === "NetworkError") {
      throw err;
    }

    // Handle network/fetch errors
    if (err.name === "TypeError" && err.message?.includes("fetch")) {
      throw new NetworkError("Failed to connect to detection service");
    }

    // Use consistent error handling
    handleServiceError(err, "Failed to upload image for detection");
  }
}
