import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";

export function ModalHandle() {
  const mutedColor = useThemeColor({}, "description");

  return (
    <View style={styles.container}>
      <View style={[styles.handle, { backgroundColor: mutedColor }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 8,
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
  },
});
