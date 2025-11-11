// components/organizations/OrgMembersSheet.tsx
// Elegant member list with organization grouping

import BaseBottomSheet from "@/components/BaseBottomSheet";
import { useAuth } from "@/contexts/AuthContext";
import { useColors } from "@/hooks/ui/useColors";
import { OrganizationsService } from "@/services/organizationsService";
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
  onCreateChild?: (orgId: string, orgName: string) => void;
  onInviteToOrg?: (orgId: string, orgName: string) => void;
}

interface ScopedMember {
  userId: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  orgId: string;
  orgName: string;
  orgDepth: number;
  role: "commander" | "member" | "viewer";
}

export function OrgMembersSheet({
  visible,
  onClose,
  orgId,
  orgName,
  userRole,
  onInvite,
  onCreateChild,
  onInviteToOrg,
}: OrgMembersSheetProps) {
  const colors = useColors();
  const { user } = useAuth();
  const [members, setMembers] = useState<ScopedMember[]>([]);
  const [loading, setLoading] = useState(false);

  const isCommander = userRole === "commander";

  useEffect(() => {
    if (visible) {
      loadMembers();
    }
  }, [visible]);

  const loadMembers = async () => {
    setLoading(true);
    try {
      const scopedMembers = await OrganizationsService.getMembersInScope();
      setMembers(scopedMembers);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Failed to load members");
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = (memberId: string, memberName: string, memberOrgId: string) => {
    if (!isCommander) return;

    Alert.alert(
      "Remove Member",
      `Remove ${memberName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            try {
              await OrganizationsService.removeMember(memberId, memberOrgId);
              await loadMembers();
            } catch (error: any) {
              Alert.alert("Error", error.message);
            }
          },
        },
      ]
    );
  };

  // Group members by organization
  const membersByOrg = members.reduce((acc, member) => {
    if (!acc[member.orgId]) {
      acc[member.orgId] = {
        orgName: member.orgName,
        orgDepth: member.orgDepth,
        members: [],
      };
    }
    acc[member.orgId].members.push(member);
    return acc;
  }, {} as Record<string, { orgName: string; orgDepth: number; members: ScopedMember[] }>);

  const orgGroups = Object.entries(membersByOrg).sort(
    ([, a], [, b]) => a.orgDepth - b.orgDepth
  );

  const totalMembers = members.length;
  const showGrouping = orgGroups.length > 1;

  const getRoleColor = (role: string) => {
    if (role === "commander") return colors.orange;
    if (role === "member") return colors.blue;
    return colors.textMuted;
  };

  const getDepthIcon = (depth: number): any => {
    if (depth === 0) return "business";
    if (depth === 1) return "people";
    if (depth === 2) return "shield";
    return "business";
  };

  return (
    <BaseBottomSheet
      visible={visible}
      onClose={onClose}
      snapPoints={["75%", "90%"]}
      enablePanDownToClose
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="people" size={24} color={colors.tint} />
            <Text style={[styles.title, { color: colors.text }]}>
              Team Members
            </Text>
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close" size={24} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        {/* Stats Bar */}
        <View style={[styles.statsBar, { backgroundColor: colors.background }]}>
          <View style={styles.stat}>
            <Text style={[styles.statValue, { color: colors.text }]}>{totalMembers}</Text>
            <Text style={[styles.statLabel, { color: colors.textMuted }]}>
              {totalMembers === 1 ? "Member" : "Members"}
            </Text>
          </View>
          {showGrouping && (
            <>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.stat}>
                <Text style={[styles.statValue, { color: colors.text }]}>{orgGroups.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textMuted }]}>
                  {orgGroups.length === 1 ? "Org" : "Orgs"}
                </Text>
              </View>
            </>
          )}
        </View>

        {/* Invite Button */}
        {isCommander && onInvite && (
          <TouchableOpacity
            style={[styles.inviteButton, { backgroundColor: colors.tint }]}
            onPress={() => {
              onClose();
              onInvite();
            }}
          >
            <Ionicons name="person-add" size={18} color="#fff" />
            <Text style={styles.inviteButtonText}>Invite Members</Text>
          </TouchableOpacity>
        )}

        {/* Members List */}
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {loading ? (
            <ActivityIndicator size="large" color={colors.tint} style={styles.loader} />
          ) : members.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={56} color={colors.border} />
              <Text style={[styles.emptyText, { color: colors.textMuted }]}>
                No members yet
              </Text>
              {isCommander && (
                <Text style={[styles.emptyHint, { color: colors.textMuted }]}>
                  Tap "Invite Members" to get started
                </Text>
              )}
            </View>
          ) : showGrouping ? (
            // Grouped by organization
            orgGroups.map(([orgId, group]) => {
              const canCreateChild = group.orgDepth < 2; // Can't create at max depth
              
              return (
                <View key={orgId} style={styles.orgGroup}>
                  {/* Org Header with Actions */}
                  <View style={styles.orgHeaderContainer}>
                    <View style={styles.orgHeader}>
                      <View style={[styles.orgIcon, { backgroundColor: colors.tint + '15' }]}>
                        <Ionicons
                          name={getDepthIcon(group.orgDepth)}
                          size={14}
                          color={colors.tint}
                        />
                      </View>
                      <Text style={[styles.orgTitle, { color: colors.text }]}>
                        {group.orgName}
                      </Text>
                      <View style={[styles.countBadge, { backgroundColor: colors.border }]}>
                        <Text style={[styles.countText, { color: colors.textMuted }]}>
                          {group.members.length}
                        </Text>
                      </View>
                    </View>

                    {/* Org Actions (Commander only) */}
                    {isCommander && (
                      <View style={styles.orgActions}>
                        {onInviteToOrg && (
                          <TouchableOpacity
                            style={[styles.orgActionButton, { backgroundColor: colors.green + "10" }]}
                            onPress={() => {
                              onClose();
                              onInviteToOrg(orgId, group.orgName);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="person-add-outline" size={14} color={colors.green} />
                          </TouchableOpacity>
                        )}
                        {onCreateChild && canCreateChild && (
                          <TouchableOpacity
                            style={[styles.orgActionButton, { backgroundColor: colors.blue + "10" }]}
                            onPress={() => {
                              onClose();
                              onCreateChild(orgId, group.orgName);
                            }}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                          >
                            <Ionicons name="git-branch-outline" size={14} color={colors.blue} />
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>

                  {/* Members in this org */}
                  {group.members.map((member) => (
                    <MemberRow
                      key={member.userId}
                      member={member}
                      isCurrentUser={member.userId === user?.id}
                      isCommander={isCommander}
                      colors={colors}
                      onRemove={() => handleRemoveMember(member.userId, member.fullName, member.orgId)}
                    />
                  ))}
                </View>
              );
            })
          ) : (
            // Flat list (single org)
            members.map((member) => (
              <MemberRow
                key={member.userId}
                member={member}
                isCurrentUser={member.userId === user?.id}
                isCommander={isCommander}
                colors={colors}
                onRemove={() => handleRemoveMember(member.userId, member.fullName, member.orgId)}
              />
            ))
          )}
        </ScrollView>

        {/* Footer Info */}
        {!isCommander && (
          <View style={[styles.footer, { backgroundColor: colors.background }]}>
            <Ionicons name="information-circle" size={14} color={colors.textMuted} />
            <Text style={[styles.footerText, { color: colors.textMuted }]}>
              Only commanders can manage members
            </Text>
          </View>
        )}
      </View>
    </BaseBottomSheet>
  );
}

// Extracted MemberRow component for cleaner code
function MemberRow({
  member,
  isCurrentUser,
  isCommander,
  colors,
  onRemove,
}: {
  member: ScopedMember;
  isCurrentUser: boolean;
  isCommander: boolean;
  colors: any;
  onRemove: () => void;
}) {
  const roleColor = 
    member.role === "commander" ? colors.orange :
    member.role === "member" ? colors.blue :
    colors.textMuted;

  const canManage = isCommander && !isCurrentUser;

  return (
    <View
      style={[
        styles.memberCard,
        { backgroundColor: colors.cardBackground },
        isCurrentUser && { borderColor: colors.tint, borderWidth: 2 },
      ]}
    >
      {/* Avatar */}
      <View style={[styles.avatar, { backgroundColor: roleColor + "20" }]}>
        <Text style={[styles.avatarText, { color: roleColor }]}>
          {member.fullName?.[0]?.toUpperCase() || "?"}
        </Text>
      </View>

      {/* Info */}
      <View style={styles.memberInfo}>
        <View style={styles.nameRow}>
          <Text style={[styles.memberName, { color: colors.text }]} numberOfLines={1}>
            {member.fullName || "Unknown"}
          </Text>
          {isCurrentUser && (
            <View style={[styles.youBadge, { backgroundColor: colors.tint + "15" }]}>
              <Text style={[styles.youBadgeText, { color: colors.tint }]}>YOU</Text>
            </View>
          )}
        </View>
        <Text style={[styles.memberEmail, { color: colors.textMuted }]} numberOfLines={1}>
          {member.email}
        </Text>
      </View>

      {/* Role Badge - No star, just letter */}
      <View style={[styles.roleBadge, { backgroundColor: roleColor + "15", borderColor: roleColor + "40" }]}>
        <Text style={[styles.roleText, { color: roleColor }]}>
          {member.role.charAt(0).toUpperCase()}
        </Text>
      </View>

      {/* Actions (Commander only, not self) */}
      {canManage && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: colors.red + "10" }]}
            onPress={onRemove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons name="trash-outline" size={16} color={colors.red} />
          </TouchableOpacity>
        </View>
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
    paddingHorizontal: 20,
    paddingBottom: 16,
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
  statsBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    marginBottom: 16,
    borderRadius: 12,
    marginHorizontal: 20,
  },
  stat: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
  },
  statLabel: {
    fontSize: 13,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 20,
    marginHorizontal: 16,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingVertical: 14,
    borderRadius: 12,
  },
  inviteButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  loader: {
    marginTop: 40,
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
  orgGroup: {
    marginBottom: 24,
  },
  orgHeaderContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
  },
  orgHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  orgActions: {
    flexDirection: "row",
    gap: 6,
  },
  orgActionButton: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orgIcon: {
    width: 26,
    height: 26,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orgTitle: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.3,
    textTransform: "uppercase",
    flex: 1,
  },
  countBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  countText: {
    fontSize: 11,
    fontWeight: "700",
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "700",
  },
  memberInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  memberName: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: -0.2,
    flex: 1,
  },
  youBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  youBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  memberEmail: {
    fontSize: 13,
    fontWeight: "400",
  },
  roleBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  roleText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  actions: {
    flexDirection: "row",
    gap: 6,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(128, 128, 128, 0.1)",
  },
  footerText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
