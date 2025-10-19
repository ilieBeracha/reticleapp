import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface LoadingOverlayProps {
  visible: boolean;
}

export function LoadingOverlay({ visible }: LoadingOverlayProps) {
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const tintColor = useThemeColor({}, "tint");

  if (!visible) return null;

  return (
    <View style={[styles.overlay, { backgroundColor: backgroundColor }]}>
      <View style={[styles.content]}>
        <ActivityIndicator size="large" color={tintColor} />
        <ThemedText style={[styles.text, { color: textColor }]}>
          Switching workspace...
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "black",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 99999,
    elevation: 99999,
  },
  content: {
    padding: 32,
    borderRadius: 20,
    alignItems: "center",
    gap: 16,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 12,
  },
  text: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
