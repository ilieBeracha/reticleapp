import { useColors } from "@/hooks/useColors";
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
          backgroundColor: colors.indigo + "15",
          borderColor: colors.indigo,
        },
      ]}
    >
      <View style={styles.header}>
        <Ionicons name="location" size={24} color={colors.indigo} />
        <Text style={[styles.label, { color: colors.indigo }]}>
          YOU ARE HERE
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
                  role === "commander" ? "#f59e0b25" : colors.indigo + "25",
              },
            ]}
          >
            <Ionicons
              name={role === "commander" ? "shield-checkmark" : "person"}
              size={14}
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
              {role.toUpperCase()}
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
            <Ionicons name="layers" size={14} color={colors.indigo} />
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
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  label: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 1,
  },
  name: {
    fontSize: 24,
    fontWeight: "800",
    letterSpacing: -0.5,
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
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  metaText: {
    fontSize: 12,
    fontWeight: "700",
  },
});
