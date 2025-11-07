// components/OrgSwitchIndicator.tsx
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

export function OrgSwitchIndicator() {
  const colors = useColors();
  const switching = useOrganizationsStore((state) => state.switching);

  if (!switching) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.tint }]}>
      <ActivityIndicator size="small" color="white" />
      <Text style={styles.text}>Switching...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  text: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: -0.2,
  },
});
