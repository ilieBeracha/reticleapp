const API_URL = process.env.EXPO_PUBLIC_DETECT_BASE_URL || ""; // your FastAPI endpoint

if (!API_URL) {
  throw new Error("EXPO_PUBLIC_DETECT_BASE_URL is not defined");
}

export async function uploadForDetection(imageUri: string) {
  const formData = new FormData();
  formData.append("file", {
    uri: imageUri,
    name: "target.jpg",
    type: "image/jpeg",
  } as any);

  // Optional: you can send parameters like min_confidence or clustering_distance
  formData.append("min_confidence", "0.2");
  formData.append("clustering_distance", "120.0");

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data",
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Server error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Detection result:", result);

    return result;
  } catch (err) {
    console.error("Error uploading for detection:", err);
    throw err;
  }
}
