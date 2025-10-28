import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { weaponModelsStore } from "@/store/weaponModelsStore";
import { useOrganization } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useStore } from "zustand";

export function Loadout() {
  const { weaponModels, loading, error, fetchWeaponModels } =
    useStore(weaponModelsStore);
  const { organization } = useOrganization();

  useEffect(() => {
    fetchWeaponModels();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {!organization ? "My Loadout" : "Team Loadout"}
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          {!organization
            ? "Manage your personal equipment"
            : "Manage team equipment"}
        </ThemedText>
      </View>

      {loading && <ActivityIndicator size="large" />}
      {error && <Text style={styles.error}>{error}</Text>}
      {!loading && weaponModels.length > 0 && (
        <Text style={styles.info}>
          Loaded {weaponModels.length} weapon models
        </Text>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  header: {
    gap: 8,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    opacity: 0.7,
    fontWeight: "500",
  },
  error: {
    color: "red",
    padding: 16,
  },
  info: {
    padding: 16,
    opacity: 0.7,
  },
});
