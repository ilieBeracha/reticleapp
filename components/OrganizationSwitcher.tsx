// components/OrganizationSwitcher.tsx
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { CreateChildOrgModal } from "@/modules/manage/CreateChildOrgModal";
import { CreateRootOrgModal } from "@/modules/manage/CreateRootOrgModal";
import { OrganizationsService } from "@/services/organizationsService";
import { useOrganizationPreferencesStore } from "@/store/organizationPreferencesStore";
import { useOrganizationsStore } from "@/store/organizationsStore";
import type { FlatOrganization } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

// Depth-based color keys for visual hierarchy (optimized as constant)
const DEPTH_COLOR_KEYS = [
  "purple",   // Level 0 (Root)
  "blue",     // Level 1
  "teal",     // Level 2
  "green",    // Level 3
  "yellow",   // Level 4
  "orange",   // Level 5
  "red",      // Level 6
  "indigo",   // Level 7
] as const;

interface OrganizationSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function OrganizationSwitcher({ visible, onClose }: OrganizationSwitcherProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, switchOrganization } = useOrganizationsStore();
  const { trackOrgSwitch, favoriteOrgIds, toggleFavorite } =
    useOrganizationPreferencesStore();

  const [allOrgs, setAllOrgs] = useState<FlatOrganization[]>([]);
  const [filteredOrgs, setFilteredOrgs] = useState<FlatOrganization[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedOrgs, setExpandedOrgs] = useState<Set<string>>(new Set());
  const [showCreateRoot, setShowCreateRoot] = useState(false);
  const [showCreateChild, setShowCreateChild] = useState(false);

  useEffect(() => {
    if (visible && user) {
      loadOrganizations();
    }
  }, [visible, user]);

  useEffect(() => {
    if (searchQuery) {
      const filtered = allOrgs.filter(
        (org) =>
          org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          org.breadcrumb.join(" ").toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredOrgs(filtered);
    } else {
      setFilteredOrgs(allOrgs);
    }
  }, [searchQuery, allOrgs]);

  const loadOrganizations = async () => {
    try {
      setLoading(true);
      const orgs = await OrganizationsService.getAllAccessibleOrganizations(user!.id);


      setAllOrgs(orgs);
      setFilteredOrgs(orgs);

      // Expand ALL roots by default so child orgs are visible
      const rootOrgIds = orgs.filter((o) => o.isRoot).map((o) => o.id);
      setExpandedOrgs(new Set(rootOrgIds));
    } catch (error) {
      console.error("Error loading organizations:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitch = async (orgId: string | null, orgName?: string) => {
    if (orgId) {
      trackOrgSwitch(orgId, orgName || "");
    }
    await switchOrganization(orgId);
    // Don't close - user can continue browsing
  };

  const toggleExpand = (orgId: string) => {
    setExpandedOrgs((prev: Set<string>) => {
      const next = new Set(prev);
      if (next.has(orgId)) {
        next.delete(orgId);
      } else {
        next.add(orgId);
      }
      return next;
    });
  };

  const rootOrgs = filteredOrgs.filter((o) => o.isRoot);

  // Group children by their DIRECT parent_id (not root)
  const childOrgsByParent = filteredOrgs.reduce((acc, org) => {
    if (!org.isRoot && org.parent_id) {
      if (!acc[org.parent_id]) acc[org.parent_id] = [];
      acc[org.parent_id].push(org);
    }
    return acc;
  }, {} as Record<string, FlatOrganization[]>);

  const isPersonalMode = !selectedOrgId;
  const currentOrg = allOrgs.find((o) => o.id === selectedOrgId);

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent
        onRequestClose={onClose}
      >
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} onPress={onClose} activeOpacity={1} />

        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>Switch Organization</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: colors.background }]}>
            <Ionicons name="search" size={20} color={colors.textMuted} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search organizations..."
              placeholderTextColor={colors.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Content */}
          <ScrollView style={styles.content}>
            {loading ? (
              <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
            ) : (
              <>
                {/* Personal Workspace */}
                <TouchableOpacity
                  style={[
                    styles.orgItem,
                    { backgroundColor: colors.cardBackground },
                    isPersonalMode && styles.selectedItem,
                  ]}
                  onPress={() => handleSwitch(null)}
                >
                  <View style={styles.orgItemLeft}>
                    <Ionicons name="person" size={20} color={colors.blue} />
                    <Text style={[styles.orgName, { color: colors.text }]}>
                      Personal Workspace
                    </Text>
                  </View>
                  {isPersonalMode && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.green} />
                  )}
                </TouchableOpacity>

                {/* Favorite Orgs */}
                {favoriteOrgIds.length > 0 && (
                  <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                      FAVORITES
                    </Text>
                    {favoriteOrgIds.map((favId) => {
                      const org = allOrgs.find((o) => o.id === favId);
                      if (!org) return null;
                      return (
                        <OrgListItem
                          key={org.id}
                          org={org}
                          isSelected={selectedOrgId === org.id}
                          isFavorite={true}
                          onPress={() => handleSwitch(org.id, org.name)}
                          onToggleFavorite={() => toggleFavorite(org.id)}
                          colors={colors}
                          depth={org.depth}
                          isContextOnly={org.isContextOnly}
                        />
                      );
                    })}
                  </View>
                )}

                {/* All Organizations */}
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                    ALL ORGANIZATIONS
                  </Text>

                  {rootOrgs.map((rootOrg) => (
                    <OrgTreeItem
                      key={rootOrg.id}
                      org={rootOrg}
                      childOrgsByParent={childOrgsByParent}
                      selectedOrgId={selectedOrgId}
                      favoriteOrgIds={favoriteOrgIds}
                      expandedOrgs={expandedOrgs}
                      handleSwitch={handleSwitch}
                      toggleFavorite={toggleFavorite}
                      toggleExpand={toggleExpand}
                      colors={colors}
                      depth={0}
                    />
                  ))}
                </View>
              </>
            )}
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            {/* Create Root Organization */}
            <TouchableOpacity
              style={[styles.createButton, { backgroundColor: colors.tint }]}
              onPress={() => {
                onClose();
                setShowCreateRoot(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color="white" />
              <Text style={styles.createButtonText}>Create Root Organization</Text>
            </TouchableOpacity>

            {/* Create Child Organization - Only if org selected and has full permission */}
            {selectedOrgId && (() => {
              const currentOrg = allOrgs.find((o) => o.id === selectedOrgId);
              return currentOrg && currentOrg.hasFullPermission ? (
                <TouchableOpacity
                  style={[
                    styles.createButton,
                    styles.secondaryButton,
                    { backgroundColor: colors.cardBackground, borderColor: colors.tint },
                  ]}
                  onPress={() => {
                    onClose();
                    setShowCreateChild(true);
                  }}
                >
                  <Ionicons name="git-branch" size={20} color={colors.tint} />
                  <Text style={[styles.createButtonText, { color: colors.tint }]}>
                    Create Child Organization
                  </Text>
                </TouchableOpacity>
              ) : null;
            })()}
          </View>
        </View>
      </View>
    </Modal>

      {/* Create Modals - Outside parent modal to prevent conflicts */}
      <CreateRootOrgModal
        visible={showCreateRoot}
        onClose={() => setShowCreateRoot(false)}
        onSuccess={() => {
          setShowCreateRoot(false);
          loadOrganizations();
        }}
      />

      {currentOrg && (
        <CreateChildOrgModal
          visible={showCreateChild}
          onClose={() => setShowCreateChild(false)}
          parentId={selectedOrgId!}
          parentName={currentOrg.name}
          onSuccess={() => {
            setShowCreateChild(false);
            loadOrganizations();
          }}
        />
      )}
    </>
  );
}

interface OrgTreeItemProps {
  org: FlatOrganization;
  childOrgsByParent: Record<string, FlatOrganization[]>;
  selectedOrgId: string | null;
  favoriteOrgIds: string[];
  expandedOrgs: Set<string>;
  handleSwitch: (orgId: string, orgName: string) => void;
  toggleFavorite: (orgId: string) => void;
  toggleExpand: (orgId: string) => void;
  colors: ReturnType<typeof useColors>;
  depth: number;
}

function OrgTreeItem({
  org,
  childOrgsByParent,
  selectedOrgId,
  favoriteOrgIds,
  expandedOrgs,
  handleSwitch,
  toggleFavorite,
  toggleExpand,
  colors,
  depth,
}: OrgTreeItemProps) {
  const children = childOrgsByParent[org.id] || [];
  const isExpanded = expandedOrgs.has(org.id);
  const hasChildren = children.length > 0;

  return (
    <View>
      {/* Org Item */}
      <View style={styles.orgTreeItem}>
        {hasChildren && (
          <TouchableOpacity
            onPress={() => toggleExpand(org.id)}
            style={styles.expandButton}
          >
            <Ionicons
              name={isExpanded ? "chevron-down" : "chevron-forward"}
              size={16}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        )}
        {!hasChildren && depth > 0 && (
          <View style={styles.expandButton}>
            <Ionicons name="remove" size={16} color={colors.border} />
          </View>
        )}
        <View style={{ flex: 1 }}>
          <OrgListItem
            org={org}
            isSelected={selectedOrgId === org.id}
            isFavorite={favoriteOrgIds.includes(org.id)}
            onPress={() => handleSwitch(org.id, org.name)}
            onToggleFavorite={() => toggleFavorite(org.id)}
            colors={colors}
            isRoot={depth === 0}
            depth={depth}
            isContextOnly={org.isContextOnly}
          />
        </View>
      </View>

      {/* Recursively render children */}
      {isExpanded && hasChildren && (
        <View>
          {children.map((childOrg) => (
            <OrgTreeItem
              key={childOrg.id}
              org={childOrg}
              childOrgsByParent={childOrgsByParent}
              selectedOrgId={selectedOrgId}
              favoriteOrgIds={favoriteOrgIds}
              expandedOrgs={expandedOrgs}
              handleSwitch={handleSwitch}
              toggleFavorite={toggleFavorite}
              toggleExpand={toggleExpand}
              colors={colors}
              depth={depth + 1}
            />
          ))}
        </View>
      )}
    </View>
  );
}

interface OrgListItemProps {
  org: FlatOrganization;
  isSelected: boolean;
  isFavorite: boolean;
  onPress: () => void;
  onToggleFavorite: () => void;
  colors: ReturnType<typeof useColors>;
  isRoot?: boolean;
  depth?: number;
  isContextOnly?: boolean;
}

function OrgListItem({
  org,
  isSelected,
  isFavorite,
  onPress,
  onToggleFavorite,
  colors,
  isRoot = false,
  depth = 0,
  isContextOnly = false,
}: OrgListItemProps) {
  const roleColors = {
    commander: colors.orange,
    member: colors.blue,
    viewer: colors.textMuted,
  };

  // Get icon color from depth-based hierarchy (cycles after 8 levels)
  const colorKey = DEPTH_COLOR_KEYS[depth % DEPTH_COLOR_KEYS.length];
  const iconColor = colors[colorKey];

  return (
    <TouchableOpacity
      style={[
        styles.orgItem,
        { backgroundColor: colors.cardBackground },
        isSelected && styles.selectedItem,
        isContextOnly && styles.contextOnlyItem,
      ]}
      onPress={onPress}
      disabled={isContextOnly}
      activeOpacity={isContextOnly ? 1 : 0.7}
    >
      <View style={styles.orgItemLeft}>
        <Ionicons
          name={isRoot ? "business" : "git-branch"}
          size={18}
          color={iconColor}
          style={isContextOnly && { opacity: 0.4 }}
        />
        <View style={styles.orgItemText}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Text style={[styles.orgName, { color: colors.text }, isContextOnly && { opacity: 0.5 }]}>
              {org.name}
            </Text>
            {isContextOnly && (
              <View style={[styles.contextBadge, { backgroundColor: colors.border }]}>
                <Text style={[styles.contextBadgeText, { color: colors.textMuted }]}>
                  CONTEXT
                </Text>
              </View>
            )}
          </View>
          {org.breadcrumb.length > 1 && (
            <Text style={[styles.orgPath, { color: colors.textMuted }, isContextOnly && { opacity: 0.4 }]}>
              {org.breadcrumb.join(" → ")}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.orgItemRight}>
        {!isContextOnly && (
          <>
            <View
              style={[
                styles.roleBadge,
                { backgroundColor: roleColors[org.role] + "20", borderColor: roleColors[org.role] },
              ]}
            >
              <Text
                style={[styles.roleBadgeText, { color: roleColors[org.role] }]}
                numberOfLines={1}
              >
                {org.role.toUpperCase()}
              </Text>
            </View>

            <TouchableOpacity
              onPress={onToggleFavorite}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={16}
                color={isFavorite ? colors.yellow : colors.textMuted}
              />
            </TouchableOpacity>

            {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.green} />}
          </>
        )}
        {isContextOnly && (
          <Ionicons name="eye-outline" size={16} color={colors.textMuted} style={{ opacity: 0.4 }} />
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modal: {
    maxHeight: "85%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  content: {
    maxHeight: 400,
  },
  loader: {
    marginVertical: 40,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginHorizontal: 20,
    marginBottom: 8,
  },
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginHorizontal: 12,
    marginBottom: 4,
    borderRadius: 10,
    gap: 10,
  },
  selectedItem: {
    opacity: 0.9,
  },
  contextOnlyItem: {
    opacity: 0.6,
  },
  contextBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  contextBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  rootOrgContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingLeft: 12,
  },
  expandButton: {
    padding: 4,
  },
  orgTreeItem: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    marginBottom: 2,
  },
  childOrgContainer: {
    paddingLeft: 28,
  },
  orgItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orgItemText: {
    flex: 1,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  orgPath: {
    fontSize: 12,
    marginTop: 2,
  },
  orgItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actionButtons: {
    paddingHorizontal: 20,
    paddingTop: 10,
    gap: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  secondaryButton: {
    borderWidth: 1.5,
  },
  createButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
});
