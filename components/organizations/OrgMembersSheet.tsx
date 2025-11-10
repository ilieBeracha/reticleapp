// components/organizations/OrgMembersSheet.tsx
// Bottom sheet displaying org members with role-based permissions

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { OrganizationsService } from "@/services/organizationsService";
import type { OrgMembership } from "@/types/organizations";
import { Ionicons } from "@expo/vector-icons";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

interface OrgMembersSheetProps {
  visible: boolean;
  onClose: () => void;
  orgId: string;
  orgName: string;
  userRole: "commander" | "member" | "viewer";
  onInvite?: () => void;
}

export function OrgMembersSheet({
  visible,
  onClose,
  orgId,
  orgName,
  userRole,
  onInvite,
}: OrgMembersSheetProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [members, setMembers] = useState<OrgMembership[]>([]);
  const [loading, setLoading] = useState(false);

  const isCommander = userRole === "commander";

  useEffect(() => {
    if (visible && orgId) {
      loadMembers();
    }
  }, [visible, orgId]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      // Get members in user's scope (automatically filtered by role)
      // Commanders see org + descendants, members see only their org
      const scopedMembers = await OrganizationsService.getMembersInScope();
      
      // DEDUPLICATE: User should only appear once even if in multiple orgs
      const userMap = new Map<string, typeof scopedMembers[0]>();
      
      for (const member of scopedMembers) {
        // Keep the highest role membership (commander > member > viewer)
        const existing = userMap.get(member.userId);
        if (!existing || 
            (member.role === 'commander' && existing.role !== 'commander') ||
            (member.role === 'member' && existing.role === 'viewer')) {
          userMap.set(member.userId, member);
        }
      }
      
      // Transform deduplicated members to OrgMembership format
      const memberships = Array.from(userMap.values()).map(m => ({
        id: m.userId,
        user_id: m.userId,
        org_id: m.orgId,
        role: m.role as "commander" | "member" | "viewer",
        created_at: new Date().toISOString(),
        users: {
          id: m.userId,
          email: m.email,
          full_name: m.fullName,
          avatar_url: m.avatarUrl || "",
          created_at: new Date().toISOString(),
        },
      })) as OrgMembership[];
      
      setMembers(memberships);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (!isCommander) return;

    Alert.alert(
      "Remove Member",
      `Remove ${memberName} from ${orgName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await OrganizationsService.removeMember(memberId, orgId);
              await loadMembers();
              Alert.alert("Success", `${memberName} removed`);
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  const handleChangeRole = async (
    memberId: string,
    memberName: string,
    currentRole: string
  ) => {
    if (!isCommander) return;

    const roles = ["commander", "member", "viewer"];
    const otherRoles = roles.filter((r) => r !== currentRole);

    Alert.alert(
      "Change Role",
      `Select new role for ${memberName}`,
      [
        ...otherRoles.map((role) => ({
          text: role.charAt(0).toUpperCase() + role.slice(1),
          onPress: async () => {
            try {
              await OrganizationsService.updateMemberRole(
                memberId,
                orgId,
                role as any
              );
              await loadMembers();
              Alert.alert("Success", `${memberName} is now a ${role}`);
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        })),
        { text: "Cancel", style: "cancel" },
      ]
    );
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "commander":
        return colors.orange;
      case "member":
        return colors.blue;
      case "viewer":
        return colors.textMuted;
      default:
        return colors.textMuted;
    }
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["75%"]}
      enableDynamicSizing={false}
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={24} color={colors.text} />
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Members</Text>
              <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                {orgName}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Invite Button (Commanders Only) */}
        {isCommander && onInvite && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.green + "15", borderColor: colors.green }]}
            onPress={() => {
              onClose();
              onInvite();
            }}
          >
            <Ionicons name="person-add" size={18} color={colors.green} />
            <Text style={[styles.inviteButtonText, { color: colors.green }]}>
              Invite Members
            </Text>
          </TouchableOpacity>
        )}

        {/* Members List */}
        <ScrollView style={styles.scrollView}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: colors.textMuted }]}>
                {members.length} MEMBER{members.length !== 1 ? "S" : ""} IN SCOPE
              </Text>

              {members.map((member) => {
                const isCurrentUser = member.user_id === user?.id;
                const roleColor = getRoleColor(member.role);

                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberCard,
                      {
                        backgroundColor: colors.cardBackground,
                        borderColor: isCurrentUser ? colors.tint : "transparent",
                        borderWidth: isCurrentUser ? 2 : 0,
                      },
                    ]}
                  >
                    <View style={styles.memberLeft}>
                      {/* Avatar */}
                      <View
                        style={[
                          styles.avatar,
                          { backgroundColor: roleColor + "20" },
                        ]}
                      >
                        <Text style={[styles.avatarText, { color: roleColor }]}>
                          {member.users.full_name?.[0]?.toUpperCase() || "?"}
                        </Text>
                      </View>

                      {/* Info */}
                      <View style={styles.memberInfo}>
                        <View style={styles.nameRow}>
                          <Text style={[styles.memberName, { color: colors.text }]}>
                            {member.users.full_name || "Unknown"}
                          </Text>
                          {isCurrentUser && (
                            <View
                              style={[
                                styles.youBadge,
                                { backgroundColor: colors.tint + "15" },
                              ]}
                            >
                              <Text
                                style={[styles.youBadgeText, { color: colors.tint }]}
                              >
                                YOU
                              </Text>
                            </View>
                          )}
                        </View>
                        <Text style={[styles.memberEmail, { color: colors.textMuted }]}>
                          {member.users.email}
                        </Text>
                      </View>
                    </View>

                    {/* Role & Actions */}
                    <View style={styles.memberRight}>
                      <TouchableOpacity
                        style={[
                          styles.roleBadge,
                          {
                            backgroundColor: roleColor + "20",
                            borderColor: roleColor,
                          },
                        ]}
                        onPress={() =>
                          isCommander &&
                          !isCurrentUser &&
                          handleChangeRole(member.user_id, member.users.full_name, member.role)
                        }
                        disabled={!isCommander || isCurrentUser}
                      >
                        <Text style={[styles.roleText, { color: roleColor }]}>
                          {member.role.toUpperCase()}
                        </Text>
                        {isCommander && !isCurrentUser && (
                          <Ionicons name="chevron-down" size={14} color={roleColor} />
                        )}
                      </TouchableOpacity>

                      {/* Remove Button (Commanders Only, Not Self) */}
                      {isCommander && !isCurrentUser && (
                        <TouchableOpacity
                          style={styles.removeButton}
                          onPress={() =>
                            handleRemoveMember(member.user_id, member.users.full_name)
                          }
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons name="trash-outline" size={18} color={colors.red} />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              {members.length === 0 && (
                <View style={styles.emptyState}>
                  <Ionicons name="people-outline" size={48} color={colors.border} />
                  <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                    No members yet
                  </Text>
                  <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                    Invite members to get started
                  </Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        {/* Permission Info (Members & Viewers) */}
        {!isCommander && (
          <View style={[styles.permissionInfo, { backgroundColor: colors.background }]}>
            <Ionicons name="information-circle" size={16} color={colors.textMuted} />
            <Text style={[styles.permissionText, { color: colors.textMuted }]}>
              Only commanders can manage members
            </Text>
          </View>
        )}
      </View>
    </BaseBottomSheet>
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
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    letterSpacing: -0.4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 16,
  },
  loader: {
    marginVertical: 40,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    marginBottom: 10,
    borderRadius: 12,
  },
  memberLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
    gap: 4,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.3,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  memberEmail: {
    fontSize: 13,
  },
  memberRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  roleBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  roleText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  removeButton: {
    padding: 6,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: 60,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
  },
  emptyHint: {
    fontSize: 14,
  },
  permissionInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 14,
    marginTop: 8,
  },
  permissionText: {
    fontSize: 13,
  },
});

