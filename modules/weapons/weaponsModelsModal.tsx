import { AddButton } from "@/components/AddButton";
import BaseBottomSheet from "@/components/BaseBottomSheet";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/ui/useColors";
import { weaponModelsStore } from "@/store/weaponModelsStore";
import { WeaponModel } from "@/types/database";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import { useStore } from "zustand";

interface WeaponsModelsModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function WeaponsModelsModal({
  visible,
  onClose,
}: WeaponsModelsModalProps) {
  const { weaponModels, loading, fetchWeaponModels } = useStore(weaponModelsStore);
  const colors = useColors();
  const [isAdding, setIsAdding] = useState(false);

  // Fetch weapon models when modal opens
  useEffect(() => {
    if (visible) {
      fetchWeaponModels();
    }
  }, [visible, fetchWeaponModels]);

  return (
    <BaseBottomSheet visible={visible} onClose={onClose} snapPoints={["90%"]}>
      <ThemedView style={styles.container}>
        {isAdding ? (
          <AddWeaponView onClose={() => setIsAdding(false)} />
        ) : (
          <>
            <FlatList
              data={weaponModels}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContainer}
              renderItem={({ item }) => <WeaponCard weapon={item} />}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Ionicons
                    name="shield-outline"
                    size={64}
                    color={colors.description}
                  />
                  <ThemedText style={styles.emptyText}>
                    No weapons found
                  </ThemedText>
                  <ThemedText type="subtitle" style={styles.emptySubtext}>
                    Tap the + button to add a weapon
                  </ThemedText>
                </View>
              }
              ListHeaderComponent={
                loading && weaponModels.length === 0 ? (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={colors.tint} />
                    <ThemedText style={styles.loadingText}>
                      Loading weapons...
                    </ThemedText>
                  </View>
                ) : null
              }
              refreshControl={
                <RefreshControl
                  refreshing={loading}
                  onRefresh={fetchWeaponModels}
                  tintColor={colors.tint}
                />
              }
            />
            <AddButton onPress={() => setIsAdding(true)} />
          </>
        )}
      </ThemedView>
    </BaseBottomSheet>
  );
}

function WeaponCard({ weapon }: { weapon: WeaponModel }) {
  const colors = useColors();

  return (
    <ThemedView
      style={[styles.card, { backgroundColor: colors.cardBackground }]}
    >
      <View style={styles.cardContent}>
        <ThemedText type="defaultSemiBold" style={styles.weaponName}>
          {weapon.name}
        </ThemedText>

        {weapon.manufacturer && (
          <ThemedText style={styles.cardDetail}>
            <Ionicons
              name="business-outline"
              size={14}
              color={colors.description}
            />{" "}
            {weapon.manufacturer}
          </ThemedText>
        )}

        <View style={styles.cardRow}>
          {weapon.weapon_type && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>
                {weapon.weapon_type}
              </ThemedText>
            </View>
          )}
          {weapon.caliber && (
            <View style={styles.badge}>
              <ThemedText style={styles.badgeText}>{weapon.caliber}</ThemedText>
            </View>
          )}
        </View>

        {weapon.weapon_name && (
          <ThemedText style={styles.cardSecondaryText}>
            {weapon.weapon_name}
          </ThemedText>
        )}
      </View>
    </ThemedView>
  );
}

function AddWeaponView({ onClose }: { onClose: () => void }) {
  const colors = useColors();

  return (
    <View style={styles.addContainer}>
      <Ionicons name="add-circle-outline" size={64} color={colors.tint} />
      <ThemedText type="title" style={styles.addTitle}>
        Add New Weapon
      </ThemedText>
      <ThemedText style={styles.addSubtitle}>
        Weapon models functionality is coming soon
      </ThemedText>
      <ThemedText style={styles.addDescription}>
        The add weapon form will be implemented here. You can close this modal
        to go back to viewing weapons.
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    padding: 16,
    gap: 12,
    paddingBottom: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 64,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 64,
    gap: 12,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardContent: {
    gap: 8,
  },
  weaponName: {
    fontSize: 18,
    flex: 1,
  },
  cardDetail: {
    fontSize: 14,
    opacity: 0.8,
  },
  cardRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "rgba(62, 207, 142, 0.1)",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#3ECF8E",
  },
  cardSecondaryText: {
    fontSize: 13,
    opacity: 0.6,
    marginTop: 4,
  },
  addContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    paddingVertical: 64,
  },
  addTitle: {
    marginTop: 16,
  },
  addSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  addDescription: {
    fontSize: 13,
    opacity: 0.6,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 32,
  },
});
