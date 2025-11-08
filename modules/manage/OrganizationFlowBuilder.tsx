import { ThemedView } from "@/components/ThemedView";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useIsRootCommander } from "@/hooks/useIsRootCommander";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { OrgChild, Organization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { CreateChildOrgModal } from "./CreateChildOrgModal";
import { CreateRootOrgModal } from "./CreateRootOrgModal";

export function OrganizationFlowBuilder() {
  const colors = useColors();
  const { user } = useAuth();
  const isRootCommander = useIsRootCommander();
  const {
    selectedOrgId,
    allOrgs,
    orgChildren,
    fetchUserOrgs,
    fetchAllOrgs,
    fetchOrgChildren,
    setSelectedOrg,
  } = useOrganizationsStore();

  const [createRootVisible, setCreateRootVisible] = useState(false);
  const [createChildVisible, setCreateChildVisible] = useState(false);
  const [parentForChild, setParentForChild] = useState<{
    id: string;
    name: string;
  } | null>(null);

  useEffect(() => {
    if (user?.id) {
      fetchUserOrgs(user.id);
      fetchAllOrgs(user.id);
      if (selectedOrgId) {
        fetchOrgChildren(selectedOrgId);
      }
    }
  }, [user?.id, selectedOrgId]);

  const rootOrgs = allOrgs.filter((org: Organization) => !org.parent_id);
  const currentOrg = selectedOrgId
    ? allOrgs.find((org: Organization) => org.id === selectedOrgId)
    : null;

  const handleCreateRoot = () => {
    setCreateRootVisible(true);
  };

  const handleCreateChild = (parentId: string, parentName: string) => {
    setParentForChild({ id: parentId, name: parentName });
    setCreateChildVisible(true);
  };

  const handleOrgCreated = async () => {
    if (user?.id) {
      await fetchUserOrgs(user.id);
      await fetchAllOrgs(user.id);
      if (selectedOrgId) {
        await fetchOrgChildren(selectedOrgId);
      }
    }
  };

  const getDepthColor = (depth: number) => {
    const depthColors = [
      colors.indigo,
      colors.purple,
      colors.blue,
      colors.teal,
      colors.green,
    ];
    return depthColors[Math.min(depth, 4)];
  };

  const canCreateMoreChildren = (org: Organization) => {
    // Maximum depth is 2 (0-2 = 3 levels: Battalion/Company/Platoon)
    if (org.depth >= 2) return false;
    const children = orgChildren.filter((c: OrgChild) => c.parent_id === org.id);
    return children.length < 3;
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.title, { color: colors.text }]}>
            Organization Flow
          </Text>
          <Text style={[styles.subtitle, { color: colors.description }]}>
            Manage your organizational hierarchy
          </Text>
        </View>
        {isRootCommander && (
          <TouchableOpacity
            style={[styles.addRootButton, { backgroundColor: colors.tint }]}
            onPress={handleCreateRoot}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Root Organizations */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Ionicons name="layers" size={18} color={colors.text} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Root Organizations
            </Text>
          </View>

          {rootOrgs.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: colors.cardBackground }]}>
              <Ionicons name="business-outline" size={48} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No root organizations
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.description }]}>
                Create your first organization to get started
              </Text>
            </View>
          ) : (
            rootOrgs.map((org: Organization) => (
              <RootOrgCard
                key={org.id}
                org={org}
                isSelected={org.id === selectedOrgId}
                colors={colors}
                onSelect={() => setSelectedOrg(org.id)}
                onCreateChild={() => handleCreateChild(org.id, org.name)}
                canCreateChild={canCreateMoreChildren(org)}
              />
            ))
          )}
        </View>

        {/* Current Organization Children */}
        {currentOrg && orgChildren.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-network" size={18} color={colors.text} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {currentOrg.name} - Children
              </Text>
              <View
                style={[styles.depthBadge, { backgroundColor: colors.indigo + "15" }]}
              >
                <Text style={[styles.depthText, { color: colors.indigo }]}>
                  Depth {currentOrg.depth + 1}/3
                </Text>
              </View>
            </View>

            {orgChildren.slice(0, 3).map((child: OrgChild) => (
              <ChildOrgCard
                key={child.id}
                child={child}
                colors={colors}
                depthColor={getDepthColor(child.depth)}
                onSelect={() => setSelectedOrg(child.id)}
                onCreateChild={() => handleCreateChild(child.id, child.name)}
                canCreateChild={child.depth < 2}
              />
            ))}

            {orgChildren.length > 3 && (
              <Text style={[styles.moreText, { color: colors.textMuted }]}>
                +{orgChildren.length - 3} more children
              </Text>
            )}
          </View>
        )}

        {/* Depth Limits Info */}
        <View style={[styles.infoCard, { backgroundColor: colors.cardBackground }]}>
          <Ionicons name="information-circle" size={20} color={colors.tint} />
          <View style={styles.infoContent}>
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              Hierarchy Limits
            </Text>
            <Text style={[styles.infoText, { color: colors.description }]}>
              • Maximum 3 levels deep (Battalion → Company → Platoon){"\n"}• Maximum 3 children per organization
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Modals */}
      <CreateRootOrgModal
        visible={createRootVisible}
        onClose={() => setCreateRootVisible(false)}
        onSuccess={handleOrgCreated}
      />

      {parentForChild && (
        <CreateChildOrgModal
          visible={createChildVisible}
          onClose={() => {
            setCreateChildVisible(false);
            setParentForChild(null);
          }}
          parentId={parentForChild.id}
          parentName={parentForChild.name}
          onSuccess={handleOrgCreated}
        />
      )}
    </ThemedView>
  );
}

// Root Organization Card
function RootOrgCard({
  org,
  isSelected,
  colors,
  onSelect,
  onCreateChild,
  canCreateChild,
}: {
  org: Organization;
  isSelected: boolean;
  colors: any;
  onSelect: () => void;
  onCreateChild: () => void;
  canCreateChild: boolean;
}) {
  return (
    <View style={styles.rootOrgWrapper}>
      <TouchableOpacity
        style={[
          styles.rootOrgCard,
          {
            backgroundColor: isSelected ? colors.indigo + "10" : colors.cardBackground,
            borderColor: isSelected ? colors.indigo : colors.border,
          },
        ]}
        onPress={onSelect}
      >
        <View
          style={[styles.rootIcon, { backgroundColor: colors.indigo + "20" }]}
        >
          <Ionicons name="business" size={24} color={colors.indigo} />
        </View>
        <View style={styles.rootInfo}>
          <Text style={[styles.rootName, { color: colors.text }]}>
            {org.name}
          </Text>
          <Text style={[styles.rootType, { color: colors.description }]}>
            {org.org_type}
          </Text>
        </View>
        {isSelected && (
          <Ionicons name="checkmark-circle" size={22} color={colors.indigo} />
        )}
      </TouchableOpacity>

      {isSelected && canCreateChild && (
        <TouchableOpacity
          style={[styles.addChildButton, { borderColor: colors.border }]}
          onPress={onCreateChild}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.tint} />
          <Text style={[styles.addChildText, { color: colors.tint }]}>
            Add Child Organization
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// Child Organization Card
function ChildOrgCard({
  child,
  colors,
  depthColor,
  onSelect,
  onCreateChild,
  canCreateChild,
}: {
  child: OrgChild;
  colors: any;
  depthColor: string;
  onSelect: () => void;
  onCreateChild: () => void;
  canCreateChild: boolean;
}) {
  return (
    <View style={styles.childOrgWrapper}>
      <View style={styles.childOrgRow}>
        <View style={[styles.depthLine, { backgroundColor: depthColor }]} />
        <TouchableOpacity
          style={[
            styles.childOrgCard,
            { backgroundColor: colors.cardBackground, borderColor: colors.border },
          ]}
          onPress={onSelect}
        >
          <Ionicons name="business" size={18} color={depthColor} />
          <View style={styles.childOrgInfo}>
            <Text style={[styles.childOrgName, { color: colors.text }]}>
              {child.name}
            </Text>
            <Text style={[styles.childOrgMeta, { color: colors.description }]}>
              {child.org_type} • {child.member_count} members
            </Text>
          </View>
          <Ionicons name="arrow-forward" size={16} color={colors.textMuted} />
        </TouchableOpacity>
      </View>

      {canCreateChild && (
        <TouchableOpacity
          style={[styles.addSubChildButton, { borderColor: colors.border }]}
          onPress={onCreateChild}
        >
          <Ionicons name="add" size={14} color={colors.tint} />
          <Text style={[styles.addSubChildText, { color: colors.tint }]}>
            Add child
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  addRootButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  section: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    flex: 1,
  },
  depthBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  depthText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyState: {
    alignItems: "center",
    padding: 40,
    borderRadius: 16,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptySubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  rootOrgWrapper: {
    marginBottom: 16,
  },
  rootOrgCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 14,
    borderWidth: 2,
    gap: 14,
  },
  rootIcon: {
    width: 52,
    height: 52,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  rootInfo: {
    flex: 1,
    gap: 4,
  },
  rootName: {
    fontSize: 18,
    fontWeight: "700",
  },
  rootType: {
    fontSize: 13,
    fontWeight: "500",
  },
  addChildButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1.5,
    marginTop: 10,
    marginLeft: 66,
  },
  addChildText: {
    fontSize: 14,
    fontWeight: "600",
  },
  childOrgWrapper: {
    marginBottom: 12,
  },
  childOrgRow: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: 12,
  },
  depthLine: {
    width: 3,
    borderRadius: 2,
    marginLeft: 8,
  },
  childOrgCard: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  childOrgInfo: {
    flex: 1,
    gap: 4,
  },
  childOrgName: {
    fontSize: 16,
    fontWeight: "600",
  },
  childOrgMeta: {
    fontSize: 12,
  },
  addSubChildButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1.5,
    marginLeft: 23,
    marginTop: 6,
  },
  addSubChildText: {
    fontSize: 13,
    fontWeight: "600",
  },
  infoCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  infoContent: {
    flex: 1,
    gap: 6,
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  infoText: {
    fontSize: 13,
    lineHeight: 20,
  },
  moreText: {
    fontSize: 13,
    fontWeight: "500",
    textAlign: "center",
    marginTop: 12,
  },
});

