import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import {
    ActivityIndicator,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface OrgListViewProps {
  onBack: () => void;
  onClose: () => void;
  onCreateRoot: () => void;
  onCreateChild: () => void;
  onInviteMembers: () => void;
}

export function OrgListView({
  onBack,
  onClose,
  onCreateRoot,
  onCreateChild,
  onInviteMembers,
}: OrgListViewProps) {
  const colors = useColors();
  const { user } = useAuth();
  const { selectedOrgId, switchOrganization, accessibleOrgs, loading } = useOrganizationsStore();

  const handleSwitch = async (orgId: string | null) => {
    await switchOrganization(orgId);
    onBack(); // Go back to info view after switching
  };

  // Get user's actual organizations (not context-only) - should be 1-3 max
  const userOrgs = accessibleOrgs.filter((org) => !org.isContextOnly);
  const currentOrg = accessibleOrgs.find((o) => o.id === selectedOrgId);

  return (
    <View style={styles.container}>
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity 
          onPress={onBack}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>
          Switch Organization
        </Text>
        <TouchableOpacity 
          onPress={onClose}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading ? (
        <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
      ) : (
        <>
          {/* Personal Workspace */}
          <TouchableOpacity
            style={[
              styles.orgItem,
              { backgroundColor: colors.cardBackground },
              !selectedOrgId && styles.selectedItem,
            ]}
            onPress={() => handleSwitch(null)}
          >
            <View style={styles.orgItemLeft}>
              <Ionicons name="person" size={20} color={colors.blue} />
              <Text style={[styles.orgName, { color: colors.text }]}>
                Personal Workspace
              </Text>
            </View>
            {!selectedOrgId && (
              <Ionicons name="checkmark-circle" size={20} color={colors.green} />
            )}
          </TouchableOpacity>

          {/* Organizations List - Simple (1-3 orgs max) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              MY ORGANIZATIONS ({userOrgs.length})
            </Text>

            {userOrgs.map((org) => {
              const isSelected = selectedOrgId === org.id;

              return (
                <TouchableOpacity
                  key={org.id}
                  style={[
                    styles.orgItem,
                    { backgroundColor: colors.cardBackground },
                    isSelected && { borderColor: colors.tint, borderWidth: 2 },
                  ]}
                  onPress={() => handleSwitch(org.id)}
                >
                  <Ionicons
                    name={
                      org.depth === 0 ? 'business' :  // Battalion
                      org.depth === 1 ? 'people' :    // Company
                      'shield'                        // Platoon
                    }
                    size={24}
                    color={isSelected ? colors.tint : colors.icon}
                  />
                  <View style={styles.orgInfo}>
                    <View style={styles.orgNameRow}>
                      <Text style={[styles.orgName, { color: colors.text }]}>
                        {org.name}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.typeBadgeText, { color: colors.textMuted }]}>
                          {org.org_type}
                        </Text>
                      </View>
                    </View>
                    {org.depth > 0 && (
                      <Text style={[styles.orgContext, { color: colors.textMuted }]}>
                        in {org.breadcrumb[0]}
                      </Text>
                    )}
                  </View>
                  <View style={[styles.roleBadge, { 
                    backgroundColor: org.role === 'commander' ? colors.blue + '20' : colors.border 
                  }]}>
                    <Text style={[styles.roleBadgeText, { 
                      color: org.role === 'commander' ? colors.blue : colors.textMuted 
                    }]}>
                      {org.role === 'commander' ? 'ADMIN' : 'MEMBER'}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={20} color={colors.tint} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Empty State */}
            {userOrgs.length === 0 && (
              <View style={styles.emptyState}>
                <Ionicons name="business-outline" size={48} color={colors.border} />
                <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                  No organizations yet
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  Create one to get started
                </Text>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.tint }]}
                  onPress={onCreateRoot}
                >
                  <Ionicons name="add-circle" size={20} color="#fff" />
                  <Text style={styles.createButtonText}>
                    Create Organization
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Create Button (when orgs exist) */}
            {userOrgs.length > 0 && (
              <TouchableOpacity
                style={[styles.addOrgButton, { borderColor: colors.tint, backgroundColor: colors.tint + '10' }]}
                onPress={onCreateRoot}
              >
                <Ionicons name="add-circle" size={20} color={colors.tint} />
                <Text style={[styles.addOrgButtonText, { color: colors.tint }]}>
                  Create New Organization
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingTop: 8,
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
    marginHorizontal: 4,
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
    marginHorizontal: 4,
    marginBottom: 8,
  },
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginHorizontal: 0,
    marginBottom: 8,
    borderRadius: 12,
    gap: 12,
  },
  selectedItem: {
    borderWidth: 2,
    borderColor: "#6366f1",
  },
  orgItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  orgInfo: {
    flex: 1,
    gap: 4,
  },
  orgNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
    flex: 1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "capitalize",
  },
  orgContext: {
    fontSize: 13,
    fontWeight: "500",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 14,
    marginBottom: 12,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#fff",
  },
  addOrgButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    marginTop: 16,
  },
  addOrgButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});

