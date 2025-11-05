import { useColors } from "@/hooks/ui/useColors";
import { OrgChild } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChildOrganizationsListProps {
  childOrgs: OrgChild[];
  userMemberships: { org_id: string; role: string }[];
  onSelectChild: (childId: string, childName: string) => void;
}

export function ChildOrganizationsList({
  childOrgs,
  userMemberships,
  onSelectChild,
}: ChildOrganizationsListProps) {
  const colors = useColors();

  if (childOrgs.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="arrow-down-circle-outline" size={16} color={colors.indigo} />
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          Child Organizations ({childOrgs.length})
        </Text>
      </View>
      {childOrgs.map((child) => {
        const membership = userMemberships.find(
          (m) => m.org_id === child.id
        );
        const isCommander = membership?.role === "commander";

        return (
          <TouchableOpacity
            key={child.id}
            style={[
              styles.childCard,
              {
                backgroundColor: colors.card,
                borderColor: isCommander ? "#f59e0b" : colors.border,
                borderLeftColor: isCommander ? "#f59e0b" : colors.indigo,
              },
            ]}
            onPress={() => onSelectChild(child.id, child.name)}
            activeOpacity={0.7}
          >
            <Ionicons
              name="arrow-down-circle"
              size={24}
              color={isCommander ? "#f59e0b" : colors.indigo}
            />
            <Text style={[styles.childName, { color: colors.text }]}>
              {child.name}
            </Text>
            {isCommander && (
              <View
                style={[styles.commandBadge, { backgroundColor: "#f59e0b20" }]}
              >
                <Ionicons name="shield" size={12} color="#f59e0b" />
              </View>
            )}
            <Ionicons
              name="chevron-forward"
              size={20}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 10,
    marginBottom: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    gap: 12,
  },
  childName: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
  commandBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
});
