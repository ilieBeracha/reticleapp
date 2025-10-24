import React, { useEffect, useRef } from "react";
import { Animated, Easing, StyleSheet, useColorScheme } from "react-native";
import { ThemedText } from "./ThemedText";

// App's accent color
const ACCENT_COLOR = "#3ECF8E";

interface OrganizationSwitchOverlayProps {
  visible: boolean;
  organizationName: string | null;
}

// Optimized timing for smooth, premium feel
const FADE_IN_DURATION = 200;
const FADE_OUT_DURATION = 20000;

// Fine-tuned easing curves for premium animation feel
const EASE_IN_EMPHASIZED = Easing.bezier(0.05, 0.7, 0.1, 1.0);
const EASE_OUT_EMPHASIZED = Easing.bezier(0.3, 0.0, 0.8, 0.15);

export function OrganizationSwitchOverlay({
  visible,
  organizationName,
}: OrganizationSwitchOverlayProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.98)).current;

  // Spinner animations - gentler
  const spinAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const innerSpinAnim = useRef(new Animated.Value(0)).current;

  // Dot animations - gentler
  const dot1Scale = useRef(new Animated.Value(1)).current;
  const dot2Scale = useRef(new Animated.Value(1)).current;
  const dot3Scale = useRef(new Animated.Value(1)).current;

  // Text fade animation
  const textFadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Fade in overlay
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: FADE_IN_DURATION,
          easing: EASE_IN_EMPHASIZED,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: FADE_IN_DURATION,
          easing: EASE_IN_EMPHASIZED,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 1,
          duration: 400,
          delay: 100,
          easing: EASE_IN_EMPHASIZED,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous spin animation for outer ring - slower and gentler
      Animated.loop(
        Animated.timing(spinAnim, {
          toValue: 1,
          duration: 10000, // Slower rotation
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Counter-rotation for inner ring - slower
      Animated.loop(
        Animated.timing(innerSpinAnim, {
          toValue: 1,
          duration: 2500, // Slower counter-rotation
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();

      // Continuous pulse animation - gentler
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.08, // Smaller pulse
            duration: 1200, // Slower pulse
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      // Staggered dot pulse animations - gentler
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot1Scale, {
            toValue: 1.3, // Smaller scale
            duration: 900, // Slower
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot1Scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(300),
          Animated.timing(dot2Scale, {
            toValue: 1.3,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot2Scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();

      Animated.loop(
        Animated.sequence([
          Animated.delay(600),
          Animated.timing(dot3Scale, {
            toValue: 1.3,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(dot3Scale, {
            toValue: 1,
            duration: 900,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Fade out
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          easing: EASE_OUT_EMPHASIZED,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnim, {
          toValue: 0.95,
          duration: FADE_OUT_DURATION,
          easing: EASE_OUT_EMPHASIZED,
          useNativeDriver: true,
        }),
        Animated.timing(textFadeAnim, {
          toValue: 0,
          duration: 150,
          easing: EASE_OUT_EMPHASIZED,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [
    visible,
    fadeAnim,
    scaleAnim,
    spinAnim,
    innerSpinAnim,
    pulseAnim,
    dot1Scale,
    dot2Scale,
    dot3Scale,
    textFadeAnim,
  ]);

  // Don't render at all if not visible
  if (!visible) {
    return null;
  }

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0deg", "360deg"],
  });

  const innerSpin = innerSpinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["360deg", "0deg"],
  });

  // Dynamic colors based on theme
  const backgroundColor = isDark
    ? "rgba(14, 16, 18, 0.97)" // Dark theme background
    : "rgba(245, 246, 247, 0.97)"; // Light theme background
  const ringColor = isDark
    ? "rgba(62, 207, 142, 0.4)" // Accent color with transparency
    : "rgba(62, 207, 142, 0.3)";
  const accentRingColor = ACCENT_COLOR;
  const dotColor = ACCENT_COLOR;
  const textColor = isDark ? "#E6E8EB" : "#111418";

  return (
    <Animated.View
      style={[
        styles.container,
        {
          backgroundColor,
          opacity: fadeAnim,
        },
      ]}
    >
      <Animated.View
        style={[
          styles.content,
          {
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        {/* Main spinner container */}
        <Animated.View style={styles.spinnerContainer}>
          {/* Outer ring with gradient effect */}
          <Animated.View
            style={[
              styles.outerRing,
              {
                borderColor: ringColor,
                borderTopColor: accentRingColor,
                borderRightColor: accentRingColor,
                transform: [{ rotate: spin }, { scale: pulseAnim }],
              },
            ]}
          />

          {/* Middle ring */}
          <Animated.View
            style={[
              styles.middleRing,
              {
                borderColor: ringColor,
                borderBottomColor: accentRingColor,
                transform: [{ rotate: spin }],
              },
            ]}
          />

          {/* Inner ring - counter rotation */}
          <Animated.View
            style={[
              styles.innerRing,
              {
                borderColor: ringColor,
                borderLeftColor: accentRingColor,
                transform: [{ rotate: innerSpin }],
              },
            ]}
          />

          {/* Animated dots in a circle pattern */}
          <Animated.View
            style={[
              styles.dot,
              styles.dot1,
              {
                backgroundColor: dotColor,
                shadowColor: dotColor,
                transform: [{ scale: dot1Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              styles.dot2,
              {
                backgroundColor: dotColor,
                shadowColor: dotColor,
                transform: [{ scale: dot2Scale }],
              },
            ]}
          />
          <Animated.View
            style={[
              styles.dot,
              styles.dot3,
              {
                backgroundColor: dotColor,
                shadowColor: dotColor,
                transform: [{ scale: dot3Scale }],
              },
            ]}
          />

          {/* Center icon with pulse */}
          <Animated.View
            style={[
              styles.centerIcon,
              {
                borderColor: ringColor,
              },
            ]}
          >
            <Animated.View
              style={[
                styles.centerIconInner,
                {
                  backgroundColor: accentRingColor,
                  shadowColor: accentRingColor,
                  transform: [{ scale: pulseAnim }],
                },
              ]}
            />
          </Animated.View>
        </Animated.View>

        {/* Text */}
        <Animated.View style={{ opacity: textFadeAnim }}>
          <ThemedText style={[styles.text, { color: textColor }]}>
            {organizationName
              ? `Switching to ${organizationName}...`
              : "Switching to Personal Workspace..."}
          </ThemedText>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 999999,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    alignItems: "center",
    justifyContent: "center",
  },
  spinnerContainer: {
    width: 240,
    height: 240,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  outerRing: {
    position: "absolute",
    width: 180,
    height: 180,
    borderRadius: 90,
    borderWidth: 3,
  },
  middleRing: {
    position: "absolute",
    width: 145,
    height: 145,
    borderRadius: 72.5,
    borderWidth: 2.5,
  },
  innerRing: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 2,
  },
  dot: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: 6,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 6,
    elevation: 3,
  },
  dot1: {
    top: 20,
    left: "50%",
    marginLeft: -6,
  },
  dot2: {
    bottom: 20,
    left: "50%",
    marginLeft: -6,
  },
  dot3: {
    top: "50%",
    right: 20,
    marginTop: -6,
  },
  centerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(62, 207, 142, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
  },
  centerIconInner: {
    width: 26,
    height: 26,
    borderRadius: 13,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 8,
    elevation: 5,
  },
  text: {
    marginTop: 48,
    fontSize: 18,
    fontWeight: "500",
    textAlign: "center",
    letterSpacing: 0.3,
  },
});
