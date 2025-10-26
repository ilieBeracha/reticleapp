// CameraPage.tsx
import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { CameraType, CameraView } from "expo-camera";
import { LinearGradient } from "expo-linear-gradient";
import { RefObject, useEffect, useRef } from "react";
import { Animated, Text, TouchableOpacity, View } from "react-native";
import {
  makeCameraStyles,
  type CameraStyles,
  type ThemeColors,
} from "./CameraPage.styles";

type ColorProps = { colors: ThemeColors; styles: CameraStyles };

interface CameraPageProps {
  cameraRef: RefObject<CameraView>;
  facing: CameraType;
  isCapturing: boolean;
  isOpeningMediaLibrary: boolean;
  onTakePicture: () => void;
  onPickFromLibrary: () => void;
}

export function CameraPage({
  cameraRef,
  facing,
  isCapturing,
  isOpeningMediaLibrary,
  onTakePicture,
  onPickFromLibrary,
}: CameraPageProps) {
  const colors = useColors();
  const styles = makeCameraStyles(colors);

  // Gentle pulse on the shutter
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.12,
          duration: 900,
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 900,
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <View style={styles.cameraRoot}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing={facing}
        mode="picture"
      />

      {/* Simple framing guide */}
      <View pointerEvents="none" style={styles.cameraOverlay}>
        <View style={styles.frameGuide} />
      </View>

      {/* Capture bar */}
      <View style={styles.captureBar}>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={onPickFromLibrary}
          disabled={isCapturing || isOpeningMediaLibrary}
          style={[
            styles.galleryBtn,
            (isCapturing || isOpeningMediaLibrary) && { opacity: 0.6 },
          ]}
        >
          <Ionicons
            name={
              isOpeningMediaLibrary ? "hourglass-outline" : "images-outline"
            }
            size={28}
            color="white"
          />
        </TouchableOpacity>

        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <TouchableOpacity
            activeOpacity={0.9}
            onPress={onTakePicture}
            disabled={isCapturing}
            style={[
              styles.shutterBtn,
              isCapturing && { transform: [{ scale: 0.96 }] },
            ]}
          >
            <View style={styles.shutterInner} />
          </TouchableOpacity>
        </Animated.View>

        <View style={styles.placeholderBtn}>
          <View style={styles.placeholderDot} />
        </View>
      </View>

      {/* Subtle banner */}
      <View style={styles.infoBanner}>
        <Text style={styles.infoBannerText}>
          Align the target inside the frame and tap capture
        </Text>
      </View>
    </View>
  );
}

// Loading and Permission Views
export function LoadingView({ colors }: { colors: ThemeColors }) {
  const styles = makeCameraStyles(colors);
  return (
    <View style={[styles.fullCenter, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.centerCol}>
          <Ionicons name="camera" size={64} color={colors.tint} />
          <Text style={[styles.titleMd, { color: colors.text }]}>
            Loading camera…
          </Text>
        </View>
      </View>
    </View>
  );
}

export function PermissionView({
  colors,
  onGrant,
}: {
  colors: ThemeColors;
  onGrant: () => void;
}) {
  const styles = makeCameraStyles(colors);
  return (
    <View style={[styles.fullCenter, { backgroundColor: colors.background }]}>
      <View style={[styles.card, { backgroundColor: colors.cardBackground }]}>
        <View style={styles.centerCol}>
          <View
            style={[styles.circleLg, { backgroundColor: colors.tint + "20" }]}
          >
            <Ionicons name="camera-outline" size={64} color={colors.tint} />
          </View>
          <Text style={[styles.titleLg, { color: colors.text }]}>
            Camera Access Required
          </Text>
          <Text
            style={[
              styles.body,
              { color: colors.description, textAlign: "center" },
            ]}
          >
            We need access to your camera to capture the target and run
            detection.
          </Text>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={onGrant}
            style={styles.primaryButton}
          >
            <LinearGradient
              colors={[colors.tint, colors.tint + "DD"]}
              style={styles.primaryButtonGradient}
            >
              <Ionicons name="shield-checkmark" size={20} color="white" />
              <Text style={styles.primaryButtonText}>Grant Permission</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
