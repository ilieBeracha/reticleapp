import { useThemeColor } from "@/hooks/useThemeColor";
import { OrganizationMembershipResource } from "@clerk/types";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface WorkspaceListProps {
  userName: string;
  isPersonalActive: boolean;
  organizations: OrganizationMembershipResource[];
  activeOrgId?: string | null;
  switchingToId: string | null;
  onSwitchToPersonal: () => void;
  onSwitchToOrg: (orgId: string) => void;
  onCreateOrg: () => void;
}

export function WorkspaceList({
  userName,
  isPersonalActive,
  organizations,
  activeOrgId,
  switchingToId,
  onSwitchToPersonal,
  onSwitchToOrg,
  onCreateOrg,
}: WorkspaceListProps) {
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const cardBackground = useThemeColor({}, "cardBackground");
  const borderColor = useThemeColor({}, "border");

  const [showAll, setShowAll] = useState(false);

  // Get current active workspace
  const activeWorkspace = isPersonalActive
    ? { name: userName, icon: "person-circle", isPersonal: true }
    : {
        name:
          organizations.find((m) => m.organization.id === activeOrgId)
            ?.organization.name || "Organization",
        icon: "business",
        isPersonal: false,
      };

  // Get other workspaces (exclude current)
  const otherWorkspaces = [
    ...(isPersonalActive
      ? []
      : [{ id: "personal", name: userName, icon: "person-circle" as const }]),
    ...organizations
      .filter((m) => m.organization.id !== activeOrgId)
      .map((m) => ({
        id: m.organization.id,
        name: m.organization.name,
        icon: "business" as const,
      })),
  ];

  const maxVisible = 6;
  const visibleWorkspaces = showAll
    ? otherWorkspaces
    : otherWorkspaces.slice(0, maxVisible);
  const hasMore = otherWorkspaces.length > maxVisible;

  const handleWorkspacePress = (id: string) => {
    if (id === "personal") {
      onSwitchToPersonal();
    } else {
      onSwitchToOrg(id);
    }
  };

  return (
    <View style={styles.container}>
      {/* Current Workspace */}
      <View style={styles.section}>
        <Text style={[styles.sectionLabel, { color: mutedColor }]}>
          CURRENT WORKSPACE
        </Text>
        <View
          style={[
            styles.currentCard,
            {
              backgroundColor: tintColor + "15",
              borderColor: tintColor,
            },
          ]}
        >
          <View style={[styles.currentIcon, { backgroundColor: tintColor }]}>
            <Ionicons
              name={activeWorkspace.icon as any}
              size={24}
              color="#FFF"
            />
          </View>
          <View style={styles.currentInfo}>
            <Text style={[styles.currentName, { color: textColor }]}>
              {activeWorkspace.name}
            </Text>
            <Text style={[styles.currentLabel, { color: tintColor }]}>
              {activeWorkspace.isPersonal ? "Personal" : "Organization"} •
              Active
            </Text>
          </View>
          <Ionicons name="checkmark-circle" size={24} color={tintColor} />
        </View>
      </View>

      {/* Quick Switch */}
      {otherWorkspaces.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: mutedColor }]}>
            QUICK SWITCH
          </Text>
          <View style={styles.grid}>
            {visibleWorkspaces.map((w) => {
              const isLoading =
                switchingToId === (w.id === "personal" ? "personal" : w.id);

              return (
                <TouchableOpacity
                  key={w.id}
                  style={[
                    styles.workspaceChip,
                    {
                      backgroundColor: cardBackground,
                      borderColor,
                      opacity: isLoading ? 0.6 : 1,
                    },
                  ]}
                  onPress={() => handleWorkspacePress(w.id)}
                  disabled={isLoading}
                  activeOpacity={0.7}
                >
                  <View
                    style={[styles.chipIcon, { backgroundColor: borderColor }]}
                  >
                    <Ionicons name={w.icon} size={16} color={textColor} />
                  </View>
                  <Text
                    style={[styles.chipName, { color: textColor }]}
                    numberOfLines={1}
                  >
                    {w.name}
                  </Text>
                  {isLoading && (
                    <ActivityIndicator size="small" color={tintColor} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Show More/Less Button */}
          {hasMore && !showAll && (
            <TouchableOpacity
              style={[styles.showMoreButton, { borderColor }]}
              onPress={() => setShowAll(true)}
            >
              <Ionicons
                name="chevron-down-outline"
                size={16}
                color={mutedColor}
              />
              <Text style={[styles.showMoreText, { color: mutedColor }]}>
                Show {otherWorkspaces.length - maxVisible} more
              </Text>
            </TouchableOpacity>
          )}

          {showAll && hasMore && (
            <TouchableOpacity
              style={[styles.showMoreButton, { borderColor }]}
              onPress={() => setShowAll(false)}
            >
              <Ionicons
                name="chevron-up-outline"
                size={16}
                color={mutedColor}
              />
              <Text style={[styles.showMoreText, { color: mutedColor }]}>
                Show less
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Create Organization */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.createButton, { borderColor }]}
          onPress={onCreateOrg}
          activeOpacity={0.7}
        >
          <Ionicons name="add-circle-outline" size={20} color={tintColor} />
          <Text style={[styles.createText, { color: textColor }]}>
            Create New Organization
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    // paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 24,
  },
  section: {
    gap: 12,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Current Workspace Card
  currentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 16,
    borderWidth: 2,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  currentIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  currentInfo: {
    flex: 1,
    gap: 4,
  },
  currentName: {
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  currentLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Quick Switch Grid
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  workspaceChip: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 10,
    flexBasis: "48%",
    flexGrow: 0,
    flexShrink: 0,
  },
  chipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  chipName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
  },
  // Show More Button
  showMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    gap: 6,
    marginTop: 4,
  },
  showMoreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Create Button
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    gap: 8,
  },
  createText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
