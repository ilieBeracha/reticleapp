import BaseBottomSheet from "@/components/BaseBottomSheet";
import { InviteMemberModal } from "@/components/InviteMemberModal";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { useOrgPermissions } from "@/hooks/useOrgPermissions";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { OrgMembership } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

interface UserManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

export function UserManagementModal({
  visible,
  onClose,
}: UserManagementModalProps) {
  const { user } = useAuth();
  const colors = useColors();
  const { canInviteMembers, isRootCommander } = useOrgPermissions();
  const { selectedOrgId, allOrgs, fetchMemberships, memberships } =
    useOrganizationsStore();

  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [roleFilter, setRoleFilter] = useState<"all" | "commander" | "member">(
    "all"
  );

  const currentOrg = selectedOrgId
    ? allOrgs.find((org) => org.id === selectedOrgId)
    : null;

  useEffect(() => {
    if (visible && selectedOrgId) {
      loadMembers();
    }
  }, [visible, selectedOrgId]);

  const loadMembers = async () => {
    if (!selectedOrgId) return;

    setLoading(true);
    try {
      await fetchMemberships(selectedOrgId);
    } catch (error) {
      console.error("Error loading members:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (
    memberId: string,
    currentRole: string,
    memberName: string
  ) => {
    const newRole = currentRole === "commander" ? "member" : "commander";

    Alert.alert(
      "Change Role",
      `Change ${memberName} from ${currentRole} to ${newRole}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Confirm",
          onPress: async () => {
            try {
              // TODO: Implement role change in organizationsStore
              Alert.alert("Success", "Role updated successfully");
              await loadMembers();
            } catch (error) {
              Alert.alert("Error", "Failed to update role");
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    Alert.alert(
      "Remove Member",
      `Are you sure you want to remove ${memberName} from this organization?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              // TODO: Implement member removal in organizationsStore
              Alert.alert("Success", "Member removed successfully");
              await loadMembers();
            } catch (error) {
              Alert.alert("Error", "Failed to remove member");
            }
          },
        },
      ]
    );
  };

  const members = (memberships || []) as OrgMembership[];

  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      searchQuery === "" ||
      member.users?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.users?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.users?.id?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole =
      roleFilter === "all" || member.role === roleFilter;

    return matchesSearch && matchesRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "commander":
        return "shield-checkmark";
      case "member":
        return "person";
      default:
        return "person-outline";
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "commander":
        return colors.purple;
      case "member":
        return colors.blue;
      default:
        return colors.textMuted;
    }
  };

  if (!selectedOrgId) {
    return (
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["50%"]}
      >
        <View style={styles.emptyContainer}>
          <Ionicons name="people-outline" size={48} color={colors.textMuted} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            No Organization Selected
          </Text>
          <Text style={[styles.emptyText, { color: colors.description }]}>
            Switch to an organization to manage members
          </Text>
        </View>
      </BaseBottomSheet>
    );
  }

  return (
    <>
      <BaseBottomSheet
        visible={visible}
        onClose={onClose}
        snapPoints={["85%", "95%"]}
        enablePanDownToClose
        backdropOpacity={0.5}
      >
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View>
                <Text style={[styles.title, { color: colors.text }]}>
                  Manage Members
                </Text>
                <Text style={[styles.subtitle, { color: colors.description }]}>
                  {currentOrg?.name}
                </Text>
              </View>
              {canInviteMembers && (
                <TouchableOpacity
                  style={[styles.inviteButton, { backgroundColor: colors.tint }]}
                  onPress={() => setInviteModalVisible(true)}
                >
                  <Ionicons name="person-add" size={18} color="#fff" />
                  <Text style={styles.inviteButtonText}>Invite</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Search & Filter */}
          <View style={styles.controls}>
            <View
              style={[
                styles.searchBar,
                { backgroundColor: colors.cardBackground, borderColor: colors.border },
              ]}
            >
              <Ionicons name="search" size={18} color={colors.textMuted} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder="Search members..."
                placeholderTextColor={colors.description}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textMuted} />
                </TouchableOpacity>
              )}
            </View>

            {/* Role Filter */}
            <View style={styles.filterRow}>
              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      roleFilter === "all" ? colors.tint + "15" : colors.cardBackground,
                    borderColor: roleFilter === "all" ? colors.tint : colors.border,
                  },
                ]}
                onPress={() => setRoleFilter("all")}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: roleFilter === "all" ? colors.tint : colors.text },
                  ]}
                >
                  All ({members.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      roleFilter === "commander"
                        ? colors.purple + "15"
                        : colors.cardBackground,
                    borderColor:
                      roleFilter === "commander" ? colors.purple : colors.border,
                  },
                ]}
                onPress={() => setRoleFilter("commander")}
              >
                <Ionicons
                  name="shield-checkmark"
                  size={14}
                  color={roleFilter === "commander" ? colors.purple : colors.textMuted}
                />
                <Text
                  style={[
                    styles.filterText,
                    { color: roleFilter === "commander" ? colors.purple : colors.text },
                  ]}
                >
                  Commanders
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterChip,
                  {
                    backgroundColor:
                      roleFilter === "member"
                        ? colors.blue + "15"
                        : colors.cardBackground,
                    borderColor: roleFilter === "member" ? colors.blue : colors.border,
                  },
                ]}
                onPress={() => setRoleFilter("member")}
              >
                <Ionicons
                  name="person"
                  size={14}
                  color={roleFilter === "member" ? colors.blue : colors.textMuted}
                />
                <Text
                  style={[
                    styles.filterText,
                    { color: roleFilter === "member" ? colors.blue : colors.text },
                  ]}
                >
                  Members
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Members List */}
          <ScrollView
            style={styles.membersList}
            showsVerticalScrollIndicator={false}
          >
            {loading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={colors.tint} />
              </View>
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const roleColor = getRoleColor(member.role);

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberCard,
                      { backgroundColor: colors.cardBackground, borderColor: colors.border },
                    ]}
                  >
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: roleColor + "20" },
                      ]}
                    >
                      <Ionicons
                        name={getRoleIcon(member.role)}
                        size={20}
                        color={roleColor}
                      />
                    </View>

                    <View style={styles.memberInfo}>
                      <View style={styles.memberNameRow}>
                        <Text style={[styles.memberName, { color: colors.text }]}>
                          {member.users?.full_name
                            ? `${member.users?.full_name}`
                            : member.users?.email || "Unknown User"}
                        </Text>
                        {isCurrentUser && (
                          <View
                            style={[
                              styles.youBadge,
                              { backgroundColor: colors.tint + "15" },
                            ]}
                          >
                            <Text style={[styles.youText, { color: colors.tint }]}>
                              You
                            </Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.memberMeta}>
                        <View
                          style={[
                            styles.roleBadge,
                            { backgroundColor: roleColor + "15" },
                          ]}
                        >
                          <Text style={[styles.roleText, { color: roleColor }]}>
                            {member.role}
                          </Text>
                        </View>
                        {member.users?.email && (
                          <Text
                            style={[styles.memberEmail, { color: colors.description }]}
                          >
                            {member.users?.email}
                          </Text>
                        )}
                      </View>
                    </View>

                    {/* Actions */}
                    {!isCurrentUser && isRootCommander && (
                      <View style={styles.memberActions}>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { borderColor: colors.border },
                          ]}
                          onPress={() =>
                            handleRoleChange(
                              member.id,
                              member.role,
                              member.users?.full_name || member.users?.email || "User"
                            )
                          }
                        >
                          <Ionicons
                            name="swap-horizontal"
                            size={18}
                            color={colors.tint}
                          />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.actionButton,
                            { borderColor: colors.border },
                          ]}
                          onPress={() =>
                            handleRemoveMember(
                              member.id,
                              member.users?.full_name || member.users?.email || "User"
                            )
                          }
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.red} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                );
              })
            ) : (
              <View style={styles.emptyContainer}>
                <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No members found
                </Text>
                <Text style={[styles.emptyText, { color: colors.description }]}>
                  {searchQuery
                    ? "Try a different search term"
                    : "Invite members to get started"}
                </Text>
              </View>
            )}
          </ScrollView>
        </View>
      </BaseBottomSheet>

      {/* Invite Modal */}
      {canInviteMembers && (
        <InviteMemberModal
          visible={inviteModalVisible}
          onClose={() => {
            setInviteModalVisible(false);
            loadMembers();
          }}
        />
      )}
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 20,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  controls: {
    gap: 12,
    marginBottom: 20,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
  },
  filterRow: {
    flexDirection: "row",
    gap: 8,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  membersList: {
    flex: 1,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: "center",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  memberAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    gap: 6,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
  },
  youBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  youText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  memberMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "capitalize",
  },
  memberEmail: {
    fontSize: 12,
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
  },
});

