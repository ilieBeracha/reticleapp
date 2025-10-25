const API_URL = process.env.EXPO_PUBLIC_DETECT_BASE_URL || ""; // your FastAPI endpoint

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_DETECT_BASE_URL is not defined");
}

export interface DetectionResult {
  class?: string; // Made optional since API might not provide class names
  confidence: number;
  bbox?: [number, number, number, number];
}

export interface DetectionServiceResponse {
  detections: DetectionResult[];
  processingTime?: number;
  imageMetadata?: any;
}

export async function uploadForDetection(
  imageUri: string
): Promise<DetectionServiceResponse> {
  console.log("🚀 Detection service: Starting upload to", API_URL);
  console.log("📁 Detection service: Image URI:", imageUri);

  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "target.jpg",
    type: "image/jpeg",
  } as any);

  formData.append("min_confidence", "0.2");
  formData.append("clustering_distance", "120.0");

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
    // Ensure we return the expected structure
    const formattedResponse = {
      detections: result.detections || result || [],
      processingTime: result.processingTime,
      imageMetadata: result.imageMetadata,
    };

    console.log("📋 Detection service: Formatted response:", formattedResponse);
    return formattedResponse;
  } catch (err) {
    console.error("❌ Detection service: Error uploading for detection:", err);
    throw err;
  }
}
