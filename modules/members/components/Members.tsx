import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

import { InviteMemberModal } from "@/components/InviteMemberModal";
import { useIsOrgAdmin } from "@/hooks/useIsOrgAdmin";
import { useOrgInvitations } from "@/hooks/useOrgInvitations";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
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
import { MembersList } from "./MembersList";

type RoleFilter = "all" | "admins" | "members";

export function Members() {
  const { organization } = useOrganization();
  const isAdmin = useIsOrgAdmin();
  const {
    pendingInvitations,
    loading: loadingInvitations,
    revokeInvitation,
    refetch,
  } = useOrgInvitations();
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const borderColor = useThemeColor({}, "border");
  const cardBackground = useThemeColor({}, "cardBackground");
  const placeholderColor = useThemeColor({}, "placeholderText");

  const [inviteModalVisible, setInviteModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("all");

  const handleRevokeInvitation = async (
    invitationId: string,
    email: string
  ) => {
    Alert.alert(
      "Revoke Invitation",
      `Are you sure you want to revoke the invitation for ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Revoke",
          style: "destructive",
          onPress: async () => {
            try {
              await revokeInvitation(invitationId);
              Alert.alert("Success", "Invitation revoked successfully");
            } catch (error) {
              Alert.alert("Error", "Failed to revoke invitation");
            }
          },
        },
      ]
    );
  };

  const handleInviteSuccess = () => {
    setInviteModalVisible(false);
    refetch();
  };

  // Redirect if no organization
  if (!organization) {
    return <Redirect href="/(home)" />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Page Header */}
        <View style={styles.headerSection}>
          <View style={styles.headerText}>
            <ThemedText style={styles.pageTitle}>Team Members</ThemedText>
            <ThemedText style={[styles.subtitle, { color: mutedColor }]}>
              {isAdmin
                ? "Manage your organization members"
                : "View organization members"}
            </ThemedText>
          </View>

          {/* Invite Button (Admin Only) */}
          {isAdmin && (
            <TouchableOpacity
              style={[styles.inviteButton, { backgroundColor: tintColor }]}
              onPress={() => setInviteModalVisible(true)}
            >
              <Ionicons name="person-add" size={16} color="#fff" />
              <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar */}
        <View
          style={[
            styles.searchContainer,
            { backgroundColor: cardBackground, borderColor },
          ]}
        >
          <Ionicons name="search" size={18} color={mutedColor} />
          <TextInput
            style={[styles.searchInput, { color: textColor }]}
            placeholder="Search members..."
            placeholderTextColor={placeholderColor}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={mutedColor} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter Chips */}
        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  roleFilter === "all" ? tintColor + "15" : cardBackground,
                borderColor: roleFilter === "all" ? tintColor : borderColor,
              },
            ]}
            onPress={() => setRoleFilter("all")}
          >
            <Ionicons
              name="people"
              size={14}
              color={roleFilter === "all" ? tintColor : mutedColor}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: roleFilter === "all" ? tintColor : textColor,
                },
              ]}
            >
              All
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  roleFilter === "admins" ? tintColor + "15" : cardBackground,
                borderColor: roleFilter === "admins" ? tintColor : borderColor,
              },
            ]}
            onPress={() => setRoleFilter("admins")}
          >
            <Ionicons
              name="shield-checkmark"
              size={14}
              color={roleFilter === "admins" ? tintColor : mutedColor}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: roleFilter === "admins" ? tintColor : textColor,
                },
              ]}
            >
              Admins
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterChip,
              {
                backgroundColor:
                  roleFilter === "members" ? tintColor + "15" : cardBackground,
                borderColor: roleFilter === "members" ? tintColor : borderColor,
              },
            ]}
            onPress={() => setRoleFilter("members")}
          >
            <Ionicons
              name="person"
              size={14}
              color={roleFilter === "members" ? tintColor : mutedColor}
            />
            <Text
              style={[
                styles.filterText,
                {
                  color: roleFilter === "members" ? tintColor : textColor,
                },
              ]}
            >
              Members
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Invitations (Admin Only) */}
        {isAdmin && (
          <View style={styles.pendingSection}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: textColor }]}>
                Pending Invitations
              </Text>
              {pendingInvitations.length > 0 && (
                <View
                  style={[styles.badge, { backgroundColor: tintColor + "20" }]}
                >
                  <Text style={[styles.badgeText, { color: tintColor }]}>
                    {pendingInvitations.length}
                  </Text>
                </View>
              )}
            </View>

            {loadingInvitations ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={tintColor} />
              </View>
            ) : pendingInvitations.length > 0 ? (
              <View style={styles.invitationsList}>
                {pendingInvitations.map((invitation: any) => (
                  <View
                    key={invitation.id}
                    style={[
                      styles.invitationCard,
                      { backgroundColor: cardBackground, borderColor },
                    ]}
                  >
                    <View style={styles.invitationLeft}>
                      <View
                        style={[
                          styles.invitationIcon,
                          { backgroundColor: tintColor + "20" },
                        ]}
                      >
                        <Ionicons
                          name="mail-outline"
                          size={18}
                          color={tintColor}
                        />
                      </View>
                      <View style={styles.invitationInfo}>
                        <Text
                          style={[styles.invitationEmail, { color: textColor }]}
                        >
                          {invitation.emailAddress}
                        </Text>
                        <Text
                          style={[styles.invitationRole, { color: mutedColor }]}
                        >
                          {invitation.role === "org:admin" ? "Admin" : "Member"}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      style={[styles.revokeButton, { borderColor: "#ef4444" }]}
                      onPress={() =>
                        handleRevokeInvitation(
                          invitation.id,
                          invitation.emailAddress
                        )
                      }
                    >
                      <Ionicons name="close" size={16} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={[styles.emptyText, { color: mutedColor }]}>
                No pending invitations
              </Text>
            )}
          </View>
        )}

        {/* Active Members List */}
        <MembersList searchQuery={searchQuery} roleFilter={roleFilter} />
      </ScrollView>

      {/* Invite Modal (Admin Only) */}
      {isAdmin && (
        <InviteMemberModal
          visible={inviteModalVisible}
          onClose={handleInviteSuccess}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 24,
    gap: 12,
  },
  headerText: {
    flex: 1,
    gap: 4,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 14,
    lineHeight: 18,
  },
  inviteButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inviteButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  // Search Bar
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    fontWeight: "400",
  },
  // Filter Chips
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 24,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    gap: 6,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
  },
  // Pending Invitations
  pendingSection: {
    marginBottom: 24,
    gap: 12,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "400",
    fontStyle: "italic",
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  loadingContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  // Invitations List
  invitationsList: {
    gap: 8,
  },
  invitationCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 12,
  },
  invitationLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  invitationIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  invitationInfo: {
    flex: 1,
    gap: 2,
  },
  invitationEmail: {
    fontSize: 14,
    fontWeight: "600",
  },
  invitationRole: {
    fontSize: 12,
    fontWeight: "500",
  },
  revokeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
