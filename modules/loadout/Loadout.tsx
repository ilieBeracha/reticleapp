import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/useColors";
import { useLoadouts } from "@/hooks/useLoadouts";
import { CORNERS } from "@/theme/globals";
import { LoadoutWithDetails } from "@/types/database";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export function Loadout() {
  const { loadouts, loading, error } = useLoadouts();
  const { cardBackground, border, tint, description } = useColors();

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={tint} />
          <ThemedText style={styles.loadingText}>
            Loading loadouts...
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.errorText}>⚠️ {error}</ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (loadouts.length === 0) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.centerContent}>
          <ThemedText style={styles.emptyIcon}>🎯</ThemedText>
          <ThemedText style={styles.emptyTitle}>No Loadouts Yet</ThemedText>
          <ThemedText style={[styles.emptyDescription, { color: description }]}>
            Create your first loadout to get started
          </ThemedText>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: tint }]}
          >
            <ThemedText style={styles.addButtonText}>+ Add Loadout</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <ThemedText style={styles.title}>Your Loadouts</ThemedText>
            <ThemedText style={[styles.subtitle, { color: description }]}>
              {loadouts.length} {loadouts.length === 1 ? "loadout" : "loadouts"}
            </ThemedText>
          </View>
          <TouchableOpacity
            style={[styles.addButtonSmall, { borderColor: tint }]}
          >
            <ThemedText style={[styles.addButtonSmallText, { color: tint }]}>
              + New
            </ThemedText>
          </TouchableOpacity>
        </View>

        {/* Loadouts Grid */}
        <View style={styles.grid}>
          {loadouts.map((loadout: LoadoutWithDetails) => (
            <LoadoutCard
              key={loadout.id}
              loadout={loadout}
              cardBg={cardBackground}
              borderColor={border}
              accentColor={tint}
              mutedColor={description}
            />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

interface LoadoutCardProps {
  loadout: LoadoutWithDetails;
  cardBg: string;
  borderColor: string;
  accentColor: string;
  mutedColor: string;
}

function LoadoutCard({
  loadout,
  cardBg,
  borderColor,
  accentColor,
  mutedColor,
}: LoadoutCardProps) {
  const weaponModel = loadout.weapon?.model;
  const sightModel = loadout.sight?.model;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: cardBg, borderColor: borderColor },
      ]}
      activeOpacity={0.7}
    >
      {/* Card Header */}
      <View style={styles.cardHeader}>
        <ThemedText style={styles.cardTitle}>{loadout.name}</ThemedText>
        {loadout.zero_distance_m && (
          <View style={[styles.badge, { backgroundColor: accentColor + "20" }]}>
            <ThemedText style={[styles.badgeText, { color: accentColor }]}>
              {loadout.zero_distance_m}m zero
            </ThemedText>
          </View>
        )}
      </View>

      {/* Weapon Info */}
      {weaponModel ? (
        <View style={styles.infoSection}>
          <View style={styles.iconContainer}>
            <ThemedText style={styles.icon}>🔫</ThemedText>
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: mutedColor }]}>
              Weapon
            </ThemedText>
            <ThemedText style={styles.infoValue}>
              {weaponModel.name || weaponModel.weapon_name}
            </ThemedText>
            {weaponModel.caliber && (
              <ThemedText
                style={[styles.infoDetail, { color: mutedColor }]}
                numberOfLines={1}
              >
                {weaponModel.caliber}
                {weaponModel.manufacturer && ` • ${weaponModel.manufacturer}`}
              </ThemedText>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.infoSection, styles.emptyInfo]}>
          <ThemedText style={[styles.emptyInfoText, { color: mutedColor }]}>
            No weapon selected
          </ThemedText>
        </View>
      )}

      {/* Sight Info */}
      {sightModel ? (
        <View style={styles.infoSection}>
          <View style={styles.iconContainer}>
            <ThemedText style={styles.icon}>🔭</ThemedText>
          </View>
          <View style={styles.infoContent}>
            <ThemedText style={[styles.infoLabel, { color: mutedColor }]}>
              Sight
            </ThemedText>
            <ThemedText style={styles.infoValue}>{sightModel.name}</ThemedText>
            {sightModel.kind && (
              <ThemedText
                style={[styles.infoDetail, { color: mutedColor }]}
                numberOfLines={1}
              >
                {sightModel.kind}
                {sightModel.manufacturer && ` • ${sightModel.manufacturer}`}
              </ThemedText>
            )}
          </View>
        </View>
      ) : (
        <View style={[styles.infoSection, styles.emptyInfo]}>
          <ThemedText style={[styles.emptyInfoText, { color: mutedColor }]}>
            No sight selected
          </ThemedText>
        </View>
      )}

      {/* Zero Conditions */}
      {loadout.zero_conditions &&
        Object.keys(loadout.zero_conditions).length > 0 && (
          <View style={[styles.conditions, { borderTopColor: borderColor }]}>
            <ThemedText style={[styles.conditionsLabel, { color: mutedColor }]}>
              Zero Conditions
            </ThemedText>
            <ThemedText style={[styles.conditionsText, { color: mutedColor }]}>
              {JSON.stringify(loadout.zero_conditions)}
            </ThemedText>
          </View>
        )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  emptyIcon: {
    fontSize: 80,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
  },
  addButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: CORNERS,
  },
  addButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 15,
  },
  addButtonSmall: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: CORNERS,
    borderWidth: 2,
  },
  addButtonSmallText: {
    fontSize: 15,
    fontWeight: "600",
  },
  grid: {
    gap: 16,
  },
  card: {
    borderRadius: CORNERS + 4,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: CORNERS,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: CORNERS,
    backgroundColor: "rgba(0, 122, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  icon: {
    fontSize: 24,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 17,
    fontWeight: "600",
    marginBottom: 2,
  },
  infoDetail: {
    fontSize: 14,
  },
  emptyInfo: {
    justifyContent: "center",
    paddingVertical: 8,
  },
  emptyInfoText: {
    fontSize: 15,
    fontStyle: "italic",
  },
  conditions: {
    borderTopWidth: 1,
    paddingTop: 16,
    marginTop: 4,
  },
  conditionsLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  conditionsText: {
    fontSize: 13,
  },
});
