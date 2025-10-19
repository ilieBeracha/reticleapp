import { InviteMemberModal } from "@/components/organizations/InviteMemberModal";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { useIsOrgAdmin } from "@/hooks/organizations/useIsOrgAdmin";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { MembersList } from "./components/MembersList";

export function Members() {
  const { organization } = useOrganization();
  const isAdmin = useIsOrgAdmin();
  const mutedColor = useThemeColor({}, "description");
  const tintColor = useThemeColor({}, "tint");
  const buttonText = useThemeColor({}, "buttonText");
  const [inviteModalVisible, setInviteModalVisible] = useState(false);

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
              <Ionicons name="person-add" size={14} color="#fff" />
              <ThemedText style={styles.inviteButtonText}>Invite</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        {/* Members List */}
        <MembersList />
      </ScrollView>

      {/* Invite Modal (Admin Only) */}
      {isAdmin && (
        <InviteMemberModal
          visible={inviteModalVisible}
          onClose={() => setInviteModalVisible(false)}
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
    paddingVertical: 8,
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
});
