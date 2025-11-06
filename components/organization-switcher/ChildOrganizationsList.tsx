import { useColors } from "@/hooks/ui/useColors";
import { OrgChild } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface ChildOrganizationsListProps {
  childOrgs: OrgChild[];
  userMemberships: { org_id: string; role: string }[];
  onSelectChild: (childId: string, childName: string) => void;
  onExplore?: (childId: string, childName: string) => void;
  currentDepth?: number;
  maxDepth?: number;
  maxChildren?: number;
}

export function ChildOrganizationsList({
  childOrgs,
  userMemberships,
  onSelectChild,
  onExplore,
  currentDepth = 0,
  maxDepth = 5,
  maxChildren = 3,
}: ChildOrganizationsListProps) {
  const colors = useColors();

  if (childOrgs.length === 0) return null;

  const atMaxDepth = currentDepth >= maxDepth;
  const tooManyChildren = childOrgs.length > maxChildren;
  const displayedChildren = tooManyChildren ? childOrgs.slice(0, maxChildren) : childOrgs;
  const hiddenCount = tooManyChildren ? childOrgs.length - maxChildren : 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="git-network" size={16} color={colors.indigo} />
        <Text style={[styles.sectionLabel, { color: colors.text }]}>
          Child Organizations ({childOrgs.length})
        </Text>
        <View style={[styles.depthBadge, { backgroundColor: colors.indigo + "15" }]}>
          <Text style={[styles.depthText, { color: colors.indigo }]}>
            Level {currentDepth + 1}/{maxDepth}
          </Text>
        </View>
      </View>

      {atMaxDepth && (
        <View style={[styles.limitWarning, { backgroundColor: colors.orange + "10", borderColor: colors.orange }]}>
          <Ionicons name="alert-circle" size={16} color={colors.orange} />
          <Text style={[styles.limitText, { color: colors.orange }]}>
            Maximum depth reached (5 levels from root)
          </Text>
        </View>
      )}

      {displayedChildren.map((child) => {
        const membership = userMemberships.find((m) => m.org_id === child.id);
        const isCommander = membership?.role === "commander";
        const hasChildren = (child.child_count || 0) > 0;
        const canExplore = !atMaxDepth && hasChildren;

        return (
          <View key={child.id} style={styles.childWrapper}>
            {/* Explore Button - Primary Action */}
            {canExplore && onExplore && (
              <TouchableOpacity
                style={[
                  styles.childCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isCommander ? colors.purple : colors.border,
                    borderLeftColor: isCommander ? colors.purple : colors.indigo,
                  },
                ]}
                onPress={() => onExplore(child.id, child.name)}
                activeOpacity={0.7}
              >
                <View style={styles.childMain}>
                  <Ionicons
                    name="business"
                    size={20}
                    color={isCommander ? colors.purple : colors.indigo}
                  />
                  <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: colors.text }]}>
                      {child.name}
                    </Text>
                    <View style={styles.childMeta}>
                      {isCommander && (
                        <View style={[styles.roleBadge, { backgroundColor: colors.purple + "15" }]}>
                          <Ionicons name="shield-checkmark" size={10} color={colors.purple} />
                          <Text style={[styles.roleText, { color: colors.purple }]}>
                            Commander
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.metaText, { color: colors.description }]}>
                        {child.child_count} children
                      </Text>
                    </View>
                  </View>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.tint} />
              </TouchableOpacity>
            )}

            {/* Regular card without explore */}
            {!canExplore && (
              <TouchableOpacity
                style={[
                  styles.childCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.buttonBorder, 
                    borderLeftColor: colors.buttonBorder,
                  },
                ]}
                onPress={() => onSelectChild(child.id, child.name)}
                activeOpacity={0.7}
              >
                <View style={styles.childMain}>
                  <Ionicons
                    name="business"
                    size={20}
                    color={isCommander ? colors.purple : colors.indigo}
                  />
                  <View style={styles.childInfo}>
                    <Text style={[styles.childName, { color: colors.text }]}>
                      {child.name}
                    </Text>
                    <View style={styles.childMeta}>
                      {isCommander && (
                        <View style={[styles.roleBadge, { backgroundColor: colors.purple + "15" }]}>
                          <Ionicons name="shield-checkmark" size={10} color={colors.purple} />
                          <Text style={[styles.roleText, { color: colors.purple }]}>
                            Commander
                          </Text>
                        </View>
                      )}
                      {hasChildren && (
                        <Text style={[styles.metaText, { color: colors.description }]}>
                          {child.child_count} sub-orgs
                        </Text>
                      )}
                    </View>
                  </View>
                </View>
                <Ionicons name="log-in" size={18} color={colors.tint} />
              </TouchableOpacity>
            )}

            {/* Switch Button - Secondary Action */}
            <TouchableOpacity
              style={[styles.switchToButton, { borderColor: colors.border }]}
              onPress={() => onSelectChild(child.id, child.name)}
            >
              <Ionicons name="swap-horizontal" size={16} color={colors.tint} />
              <Text style={[styles.switchToText, { color: colors.tint }]}>
                Switch to this
              </Text>
            </TouchableOpacity>
          </View>
        );
      })}

      {hiddenCount > 0 && (
        <View style={[styles.limitWarning, { backgroundColor: colors.blue + "10", borderColor: colors.blue }]}>
          <Ionicons name="information-circle" size={16} color={colors.blue} />
          <Text style={[styles.limitText, { color: colors.blue }]}>
            +{hiddenCount} more (max {maxChildren} per level)
          </Text>
        </View>
      )}
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
    marginBottom: 8,
  },
  sectionLabel: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  depthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  depthText: {
    fontSize: 11,
    fontWeight: "700",
  },
  limitWarning: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  limitText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  childWrapper: {
    gap: 6,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    borderLeftWidth: 4,
    gap: 12,
  },
  childMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  childInfo: {
    flex: 1,
    gap: 4,
  },
  childName: {
    fontSize: 15,
    fontWeight: "600",
  },
  childMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "700",
  },
  metaText: {
    fontSize: 12,
    fontWeight: "500",
  },
  exploreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  exploreText: {
    fontSize: 13,
    fontWeight: "600",
  },
  switchToButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginLeft: 8,
  },
  switchToText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
