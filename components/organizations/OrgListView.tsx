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
  const { selectedOrgId, switchOrganization, userOrgs, loading } = useOrganizationsStore();

  const handleSwitch = async (orgId: string | null) => {
    await switchOrganization(orgId);
    onBack(); // Go back to info view after switching
  };

  // User's direct organizations
  const currentOrg = userOrgs.find((o) => o.org_id === selectedOrgId);

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
              { backgroundColor: colors.card },
              !selectedOrgId && [styles.selectedItem, { borderColor: colors.accent }],
            ]}
            onPress={() => handleSwitch(null)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: colors.primary + '15' }]}>
              <Ionicons name="person" size={20} color={colors.primary} />
            </View>
            <View style={styles.orgInfo}>
              <Text style={[styles.orgName, { color: colors.text }]}>
                Personal Workspace
              </Text>
              <Text style={[styles.orgSubtext, { color: colors.textMuted }]}>
                Your private sessions & data
              </Text>
            </View>
            {!selectedOrgId && (
              <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
            )}
          </TouchableOpacity>

          {/* Organizations List - Simple (1-3 orgs max) */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
              MY ORGANIZATIONS ({userOrgs.length})
            </Text>

            {userOrgs.map((org) => {
              const isSelected = selectedOrgId === org.org_id;
              const iconName = org.depth === 0 ? 'business' : org.depth === 1 ? 'people' : 'shield';
              const iconColor = org.depth === 0 ? colors.accent : org.depth === 1 ? colors.primary : colors.green;

              return (
                <TouchableOpacity
                  key={org.org_id}
                  style={[
                    styles.orgItem,
                    { backgroundColor: colors.card },
                    isSelected && [styles.selectedItem, { borderColor: colors.accent }],
                  ]}
                  onPress={() => handleSwitch(org.org_id)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
                    <Ionicons
                      name={iconName}
                      size={22}
                      color={iconColor}
                    />
                  </View>
                  <View style={styles.orgInfo}>
                    <View style={styles.orgNameRow}>
                      <Text style={[styles.orgName, { color: colors.text }]}>
                        {org.org_name}
                      </Text>
                      <View style={[styles.typeBadge, { backgroundColor: iconColor + '20' }]}>
                        <Text style={[styles.typeBadgeText, { color: iconColor }]}>
                          {org.org_type}
                        </Text>
                      </View>
                    </View>
                    {org.depth > 0 && org.full_path && (
                      <Text style={[styles.orgContext, { color: colors.textMuted }]}>
                        {org.full_path}
                      </Text>
                    )}
                    <View style={[styles.roleBadge, { 
                      backgroundColor: org.role === 'commander' ? colors.accent + '20' : colors.muted + '30' 
                    }]}>
                      <Text style={[styles.roleBadgeText, { 
                        color: org.role === 'commander' ? colors.accent : colors.textMuted 
                      }]}>
                        {org.role === 'commander' ? '⚡ COMMANDER' : 'MEMBER'}
                      </Text>
                    </View>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={22} color={colors.accent} />
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Empty State */}
            {userOrgs.length === 0 && (
              <View style={styles.emptyState}>
                <View style={[styles.emptyIconContainer, { backgroundColor: colors.muted + '20' }]}>
                  <Ionicons name="business-outline" size={48} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyText, { color: colors.text }]}>
                  No organizations yet
                </Text>
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  Create your first organization to collaborate with your team
                </Text>
                <TouchableOpacity
                  style={[styles.createButton, { backgroundColor: colors.accent }]}
                  onPress={onCreateRoot}
                  activeOpacity={0.8}
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
                style={[styles.addOrgButton, { 
                  borderColor: colors.accent, 
                  backgroundColor: colors.accent + '10' 
                }]}
                onPress={onCreateRoot}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={20} color={colors.accent} />
                <Text style={[styles.addOrgButtonText, { color: colors.accent }]}>
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
    paddingBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  loader: {
    marginVertical: 40,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
    marginHorizontal: 4,
    marginBottom: 12,
    opacity: 0.7,
  },
  orgItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginHorizontal: 0,
    marginBottom: 10,
    borderRadius: 14,
    gap: 14,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  selectedItem: {
    borderWidth: 2,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  orgInfo: {
    flex: 1,
    gap: 6,
  },
  orgNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  orgName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  orgSubtext: {
    fontSize: 13,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  orgContext: {
    fontSize: 12,
    fontWeight: "500",
    letterSpacing: -0.1,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 20,
    gap: 16,
  },
  emptyIconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: -0.3,
  },
  emptyHint: {
    fontSize: 14,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 8,
  },
  createButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  createButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: -0.2,
  },
  addOrgButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    marginTop: 8,
  },
  addOrgButtonText: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});

