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