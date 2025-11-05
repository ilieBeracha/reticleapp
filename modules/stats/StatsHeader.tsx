import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface StatsHeaderProps {
  isPersonalMode: boolean;
  organizationName?: string;
  userName?: string;
  selectedFilter: string;
  onFilterPress: () => void;
}

export function StatsHeader({
  isPersonalMode,
  organizationName,
  userName = "User",
  selectedFilter,
  onFilterPress,
}: StatsHeaderProps) {
  const colors = useColors();

  return (
    <View style={styles.container}>
      {/* Title and Filter Button */}
      <View style={styles.titleSection}>
        <Text style={[styles.title, { color: colors.text }]}>
          Activity Summary
        </Text>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: colors.card }]}
          onPress={onFilterPress}
        >
          <Ionicons name="options" size={20} color={colors.text} />
          <Text style={[styles.filterButtonText, { color: colors.text }]}>
            {selectedFilter}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 20,
    marginBottom: 24,
  },
  userSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  userDetails: {
    gap: 2,
  },
  userName: {
    fontSize: 17,
    fontWeight: "600",
  },
  userBadge: {
    fontSize: 13,
    fontWeight: "500",
    opacity: 0.6,
  },
  menuButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -1,
    flex: 1,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
});
