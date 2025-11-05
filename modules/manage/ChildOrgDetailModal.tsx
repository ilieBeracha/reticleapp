import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useColors } from "@/hooks/ui/useColors";
import { useThemeColor } from "@/hooks/ui/useThemeColor";
import { useOrganizationSwitch } from "@/hooks/useOrganizationSwitch";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { OrgChild } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface ChildOrgDetailModalProps {
  visible: boolean;
  onClose: () => void;
  childOrg: OrgChild | null;
}

interface OrgMember {
  id: string;
  user_id: string;
  role: string;
  first_name?: string;
  last_name?: string;
  email?: string;
}

export function ChildOrgDetailModal({
  visible,
  onClose,
  childOrg,
}: ChildOrgDetailModalProps) {
  const colors = useColors();
  const { switchOrganization } = useOrganizationSwitch();
  const { fetchMemberships, fetchOrgChildren, memberships, orgChildren } = useOrganizationsStore();

  const cardBackground = useThemeColor({}, "cardBackground");
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const borderColor = useThemeColor({}, "border");
  const tintColor = useThemeColor({}, "tint");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible && childOrg) {
      fetchOrgDetails();
    }
  }, [visible, childOrg]);

  const fetchOrgDetails = async () => {
    if (!childOrg) return;

    setLoading(true);
    try {
      // Fetch members and children using store
      await Promise.all([
        fetchMemberships(childOrg.id),
        fetchOrgChildren(childOrg.id),
      ]);
    } catch (error) {
      console.error("Error fetching org details:", error);
    } finally {
      setLoading(false);
    }
  };

  // Use store state directly
  const members = (memberships || []) as OrgMember[];
  const subChildren = orgChildren || [];

  const handleSwitchTo = async () => {
    if (!childOrg) return;
    await switchOrganization(childOrg.id, childOrg.name);
    onClose();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "commander":
        return "Commander";
      case "member":
        return "Member";
      case "viewer":
        return "Viewer";
      default:
        return role;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "commander":
        return colors.purple;
      case "member":
        return colors.blue;
      case "viewer":
        return colors.textMuted;
      default:
        return mutedColor;
    }
  };

  if (!childOrg) return null;


  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      keyboardBehavior="interactive"
      snapPoints={["75%", "90%"]}
      enablePanDownToClose={true}
      backdropOpacity={0.45}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={[styles.header, { borderColor }]}>
          <View style={styles.headerTop}>
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: colors.blue + "20" },
              ]}
            >
              <Ionicons name="business" size={32} color={colors.blue} />
            </View>
            <View style={styles.headerText}>
              <Text style={[styles.orgName, { color: textColor }]}>
                {childOrg.name}
              </Text>
              <View style={styles.badges}>
                <View
                  style={[
                    styles.typeBadge,
                    { backgroundColor: colors.indigo + "15" },
                  ]}
                >
                  <Text style={[styles.typeText, { color: colors.indigo }]}>
                    {childOrg.org_type}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {childOrg.description && (
            <Text style={[styles.description, { color: mutedColor }]}>
              {childOrg.description}
            </Text>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={tintColor} />
          </View>
        ) : (
          <>
            {/* Metadata */}
            <View style={styles.section}>
              <View style={styles.metadataGrid}>
                <View style={styles.metadataItem}>
                  <Ionicons
                    name="calendar-outline"
                    size={16}
                    color={mutedColor}
                  />
                  
                </View>

                <View style={styles.metadataItem}>
                  <Ionicons name="layers-outline" size={16} color={mutedColor} />
                  <View>
                    <Text style={[styles.metadataLabel, { color: mutedColor }]}>
                      Depth Level
                    </Text>
                    <Text style={[styles.metadataValue, { color: textColor }]}>
                      Level {childOrg.depth}
                    </Text>
                  </View>
                </View>

                <View style={styles.metadataItem}>
                  <Ionicons name="people-outline" size={16} color={mutedColor} />
                  <View>
                    <Text style={[styles.metadataLabel, { color: mutedColor }]}>
                      Members
                    </Text>
                    <Text style={[styles.metadataValue, { color: textColor }]}>
                      {members.length}
                    </Text>
                  </View>
                </View>
              </View>
            </View>

            {/* Members Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Ionicons name="people" size={18} color={tintColor} />
                <Text style={[styles.sectionTitle, { color: textColor }]}>
                  Team Members
                </Text>
                <View
                  style={[styles.countBadge, { backgroundColor: tintColor + "20" }]}
                >
                  <Text style={[styles.countText, { color: tintColor }]}>
                    {members.length}
                  </Text>
                </View>
              </View>

              {members && members.length > 0 ? (
                <View style={styles.membersList}>
                  {members.map((member) => (
                    <View
                      key={member.id}
                      style={[
                        styles.memberCard,
                        { backgroundColor: cardBackground, borderColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.memberAvatar,
                          {
                            backgroundColor:
                              getRoleColor(member.role) + "20",
                          },
                        ]}
                      >
                        <Ionicons
                          name="person"
                          size={18}
                          color={getRoleColor(member.role)}
                        />
                      </View>
                      <View style={styles.memberInfo}>
                        <Text style={[styles.memberName, { color: textColor }]}>
                          {member.first_name && member.last_name
                            ? `${member.first_name} ${member.last_name}`
                            : member.email || "Unknown User"}
                        </Text>
                        <Text style={[styles.memberRole, { color: mutedColor }]}>
                          {getRoleLabel(member.role)}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Ionicons
                    name="people-outline"
                    size={32}
                    color={mutedColor}
                  />
                  <Text style={[styles.emptyText, { color: mutedColor }]}>
                    No members yet
                  </Text>
                </View>
              )}
            </View>

            {/* Sub-Children Section */}
            {subChildren.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="git-network" size={18} color={tintColor} />
                  <Text style={[styles.sectionTitle, { color: textColor }]}>
                    Child Organizations
                  </Text>
                  <View
                    style={[
                      styles.countBadge,
                      { backgroundColor: tintColor + "20" },
                    ]}
                  >
                    <Text style={[styles.countText, { color: tintColor }]}>
                      {subChildren.length}
                    </Text>
                  </View>
                </View>

                <View style={styles.childrenList}>
                  {subChildren.map((child) => (
                    <View
                      key={child.id}
                      style={[
                        styles.childCard,
                        { backgroundColor: cardBackground, borderColor },
                      ]}
                    >
                      <View
                        style={[
                          styles.childIcon,
                          { backgroundColor: colors.indigo + "20" },
                        ]}
                      >
                        <Ionicons
                          name="business"
                          size={16}
                          color={colors.indigo}
                        />
                      </View>
                      <View style={styles.childInfo}>
                        <Text style={[styles.childName, { color: textColor }]}>
                          {child.name}
                        </Text>
                        <Text style={[styles.childType, { color: mutedColor }]}>
                          {child.org_type} • {child.member_count} members
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* Action Buttons */}
      <View style={[styles.footer, { borderColor }]}>
        <TouchableOpacity
          style={[styles.button, styles.cancelButton, { borderColor }]}
          onPress={onClose}
        >
          <Text style={[styles.buttonText, { color: textColor }]}>Close</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.switchButton,
            { backgroundColor: tintColor },
          ]}
          onPress={handleSwitchTo}
        >
          <Ionicons name="swap-horizontal" size={18} color="#fff" />
          <Text style={styles.switchButtonText}>Switch To</Text>
        </TouchableOpacity>
      </View>
    </BaseBottomSheet>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  header: {
    gap: 12,
    paddingBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: 16,
  },
  headerTop: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    gap: 8,
  },
  orgName: {
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 24,
  },
  badges: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typeText: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 4,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: "center",
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  countText: {
    fontSize: 12,
    fontWeight: "700",
  },
  metadataGrid: {
    gap: 12,
  },
  metadataItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
  },
  metadataLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  metadataValue: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 2,
  },
  membersList: {
    gap: 8,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontSize: 14,
    fontWeight: "600",
  },
  memberRole: {
    fontSize: 12,
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "500",
  },
  childrenList: {
    gap: 8,
  },
  childCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  childIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  childInfo: {
    flex: 1,
    gap: 2,
  },
  childName: {
    fontSize: 14,
    fontWeight: "600",
  },
  childType: {
    fontSize: 12,
    fontWeight: "500",
  },
  footer: {
    flexDirection: "row",
    gap: 12,
    paddingTop: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  button: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  cancelButton: {
    borderWidth: 1.5,
  },
  switchButton: {
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  buttonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  switchButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
});
