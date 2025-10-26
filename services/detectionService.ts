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
      throw new Error(`Server error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();

    // Validate response structure
    if (!isAnalyzeResponse(result)) {
      console.error(
        "❌ Detection service: Invalid response structure:",
        result
      );
      throw new Error("Invalid response structure from API");
    }

    console.log("📋 Detection service: Valid AnalyzeResponse received");
    return result;
  } catch (err) {
    console.error("❌ Detection service: Error uploading for detection:", err);
    throw err;
  }
}
