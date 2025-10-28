import { Image, StyleSheet, View } from "react-native";

interface CameraPreviewProps {
  annotatedImageBase64?: string;
  originalImageUri?: string;
}

export function CameraPreview({
  annotatedImageBase64,
  originalImageUri,
}: CameraPreviewProps) {
  return (
    <View style={styles.container}>
      {annotatedImageBase64 ? (
        <Image
          source={{ uri: `data:image/jpeg;base64,${annotatedImageBase64}` }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      ) : originalImageUri ? (
        <Image
          source={{ uri: originalImageUri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
  },
  previewImage: {
    width: "100%",
    height: "100%",
    resizeMode: "contain",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
});
