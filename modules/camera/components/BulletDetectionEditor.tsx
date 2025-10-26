// BulletDetectionEditor.tsx
import { useColors } from "@/hooks/useColors";
import { Detection } from "@/store/detectionStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContent: {
    alignItems: "center",
    gap: 16,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  loadingSubtext: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  container: {
    flex: 1,
    padding: 20,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
    paddingTop: 8,
    paddingBottom: 16,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
  },
  placeholder: {
    width: 44,
  },
  imageContainer: {
    marginBottom: 32,
  },
  imageCard: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  imageTouchable: {
    width: "100%",
    height: 400, // Match the targetImage height
    position: "relative" as any,
  },
  targetImage: {
    width: "100%",
    height: 400, // Match ResultsPage and PreviewPage height
    borderRadius: 12,
  },
  detectionOverlay: {
    position: "absolute",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  detectionDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "white",
  },
  detectionNumber: {
    fontSize: 10,
    fontWeight: "700",
    color: "white",
  },
  actionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
    minHeight: 50,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  instructions: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 20,
    borderRadius: 12,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
  },
  summary: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    alignItems: "center",
  },
  summaryText: {
    fontSize: 14,
    fontWeight: "500",
    opacity: 0.7,
  },
});

interface BulletDetectionEditorProps {
  photoUri: string;
  annotatedImageBase64?: string | null;
  detections: Detection[];
  onDetectionsChange: (detections: Detection[]) => void;
  visible: boolean;
  onClose: () => void;
  isLoading?: boolean;
}

export function BulletDetectionEditor({
  photoUri,
  annotatedImageBase64,
  detections,
  onDetectionsChange,
  visible,
  onClose,
  isLoading = false,
}: BulletDetectionEditorProps) {
  const colors = useColors();

  const [isAddingMode, setIsAddingMode] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  // Handle loading state with minimum 3 seconds display
  useEffect(() => {
    if (isLoading) {
      setShowLoader(true);
      const timer = setTimeout(() => {
        setShowLoader(false);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const imageRef = useRef<View>(null);
  const [imageLayout, setImageLayout] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });

  const handleImageLayout = (event: any) => {
    const { x, y, width, height } = event.nativeEvent.layout;
    setImageLayout({ x, y, width, height });
  };

  const handleImagePress = (event: any) => {
    if (isAddingMode) {
      const { locationX, locationY } = event.nativeEvent;
      addDetectionAtPoint(locationX, locationY);
    }
  };

  const addDetectionAtPoint = (x: number, y: number) => {
    // Convert screen coordinates to image coordinates
    const imageX = (x / imageLayout.width) * 100;
    const imageY = (y / imageLayout.height) * 100;

    const newDetection: Detection = {
      id: `manual_${Date.now()}`,
      name: "Bullet Hole",
      confidence: 1.0,
      boundingBox: {
        x: imageX - 1.5,
        y: imageY - 1.5,
        width: 3,
        height: 3,
      },
      timestamp: new Date().toISOString(),
    };

    onDetectionsChange([...detections, newDetection]);
    setIsAddingMode(false);
  };

  const clearAllDetections = () => {
    onDetectionsChange([]);
  };

  // Show loading screen if loading
  if (showLoader) {
    return (
      <Modal
        visible={visible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: colors.background },
          ]}
        >
          <View style={styles.loadingContent}>
            <ActivityIndicator size="large" color={colors.tint} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Analyzing image...
            </Text>
            <Text
              style={[styles.loadingSubtext, { color: colors.description }]}
            >
              This may take a few seconds
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Simple Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            Edit Bullets
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Image with Detection Overlay */}
        <View style={styles.imageContainer}>
          <View
            style={[
              styles.imageCard,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <TouchableOpacity
              ref={imageRef}
              onLayout={handleImageLayout}
              onPress={handleImagePress}
              style={styles.imageTouchable}
              activeOpacity={isAddingMode ? 0.7 : 1}
            >
              <Image
                source={{
                  uri: annotatedImageBase64
                    ? `data:image/jpeg;base64,${annotatedImageBase64}`
                    : photoUri,
                }}
                style={styles.targetImage}
                resizeMode="contain"
              />

              {/* Detection Overlays */}
              {detections.map((detection, index) => (
                <View
                  key={detection.id}
                  style={[
                    styles.detectionOverlay,
                    {
                      left: `${detection.boundingBox.x}%`,
                      top: `${detection.boundingBox.y}%`,
                      width: `${detection.boundingBox.width}%`,
                      height: `${detection.boundingBox.height}%`,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.detectionDot,
                      { backgroundColor: colors.tint },
                    ]}
                  >
                    <Text style={styles.detectionNumber}>{index + 1}</Text>
                  </View>
                </View>
              ))}
            </TouchableOpacity>
          </View>
        </View>

        {/* Simple Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: isAddingMode
                  ? colors.tint
                  : colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={() => setIsAddingMode(!isAddingMode)}
          >
            <Ionicons
              name="add-circle"
              size={20}
              color={isAddingMode ? "white" : colors.text}
            />
            <Text
              style={[
                styles.actionButtonText,
                { color: isAddingMode ? "white" : colors.text },
              ]}
            >
              {isAddingMode ? "Cancel Add" : "Add Bullet"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionButton,
              {
                backgroundColor: colors.cardBackground,
                borderColor: colors.border,
              },
            ]}
            onPress={clearAllDetections}
          >
            <Ionicons name="trash" size={20} color={colors.text} />
            <Text style={[styles.actionButtonText, { color: colors.text }]}>
              Clear All
            </Text>
          </TouchableOpacity>
        </View>

        {/* Instructions */}
        {isAddingMode && (
          <View
            style={[
              styles.instructions,
              { backgroundColor: colors.cardBackground },
            ]}
          >
            <Text style={[styles.instructionText, { color: colors.text }]}>
              Tap anywhere on the image to add a bullet detection
            </Text>
          </View>
        )}

        {/* Simple Summary */}
        <View style={styles.summary}>
          <Text style={[styles.summaryText, { color: colors.description }]}>
            {detections.length} bullet{detections.length !== 1 ? "s" : ""}{" "}
            detected
          </Text>
        </View>
      </View>
    </Modal>
  );
}
