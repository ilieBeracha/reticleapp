import { useColors } from "@/hooks/ui/useColors";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, View } from "react-native";

interface CurrentLocationCardProps {
  name: string;
  role?: "commander" | "member" | "viewer";
  depth?: number;
  isPersonal?: boolean;
}

export function CurrentLocationCard({
  name,
  role,
  depth,
  isPersonal = false,
}: CurrentLocationCardProps) {
  const colors = useColors();

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.indigo + "12",
          borderColor: colors.indigo + "30",
        },
      ]}
    >
      <View style={styles.header}>
        <View style={[styles.iconBox, { backgroundColor: colors.indigo }]}>
          <Ionicons name="location-sharp" size={18} color="#FFFFFF" />
        </View>
        <Text style={[styles.label, { color: colors.text }]}>
          Current Location
        </Text>
      </View>
      <Text style={[styles.name, { color: colors.text }]}>{name}</Text>
      <View style={styles.meta}>
        {role && (
          <View
            style={[
              styles.metaBadge,
              {
                backgroundColor:
                  role === "commander" ? "#f59e0b20" : colors.indigo + "20",
              },
            ]}
          >
            <Ionicons
              name={role === "commander" ? "shield-checkmark" : "person-outline"}
              size={13}
              color={role === "commander" ? "#f59e0b" : colors.indigo}
            />
            <Text
              style={[
                styles.metaText,
                {
                  color: role === "commander" ? "#f59e0b" : colors.indigo,
                },
              ]}
            >
              {role.charAt(0).toUpperCase() + role.slice(1)}
            </Text>
          </View>
        )}
        {depth !== undefined && (
          <View
            style={[
              styles.metaBadge,
              { backgroundColor: colors.indigo + "20" },
            ]}
          >
            <Ionicons name="layers-outline" size={13} color={colors.indigo} />
            <Text style={[styles.metaText, { color: colors.indigo }]}>
              Level {depth + 1}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 18,
    borderRadius: 16,
    borderWidth: 1.5,
    gap: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  name: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.3,
    lineHeight: 26,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  metaBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.2,
  },
});
