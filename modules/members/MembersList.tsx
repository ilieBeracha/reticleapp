import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { useEffect, useMemo } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MemberItem } from "./MemberItem";

export interface MembersListProps {
  searchQuery?: string;
  roleFilter?: "all" | "admins" | "members";
}

export function MembersList({
  searchQuery = "",
  roleFilter = "all",
}: MembersListProps) {
  const { selectedOrgId, memberships, fetchMemberships, loading } =
    useOrganizationsStore();
  
  useEffect(() => {
    if (selectedOrgId) {
      fetchMemberships(selectedOrgId);
    }
  }, [selectedOrgId, fetchMemberships]);
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");

  // Filter members based on search and role
  const filteredMembers = useMemo(() => {
    if (!memberships || memberships.length === 0) return [];

    let filtered = memberships;

    // Filter by search query
    if (searchQuery.trim()) {
      filtered = filtered.filter((member) => {
        // If you have a users mirror table, replace below accordingly
        const name = member.user_id || "";
        const email = member.user_id || "";
        const query = searchQuery.toLowerCase();
        return name.includes(query) || email.includes(query);
      });
    }

    // Filter by role
    if (roleFilter === "admins") {
      filtered = filtered.filter((member) => member.role === "commander");
    } else if (roleFilter === "members") {
      filtered = filtered.filter((member) => member.role !== "commander");
    }

    return filtered;
  }, [memberships, searchQuery, roleFilter]);

  if (!memberships || loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  const memberCount = filteredMembers.length;
  const totalCount = memberships?.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Active Members
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText style={[styles.badgeText, { color: mutedColor }]}>
            {searchQuery || roleFilter !== "all"
              ? `${memberCount} of ${totalCount}`
              : memberCount}
          </ThemedText>
        </View>
      </View>

      {memberCount > 0 ? (
        filteredMembers.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))
      ) : searchQuery || roleFilter !== "all" ? (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
            No members match your filters
          </ThemedText>
        </View>
      ) : (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
            No members yet. Start by inviting team members!
          </ThemedText>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  loadingContainer: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
