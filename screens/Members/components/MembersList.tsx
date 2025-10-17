import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization } from "@clerk/clerk-expo";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { MemberItem } from "./MemberItem";

export function MembersList() {
  const { memberships } = useOrganization({
    memberships: {
      pageSize: 50,
    },
  });
  const textColor = useThemeColor({}, "text");
  const mutedColor = useThemeColor({}, "description");

  if (!memberships) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  const memberCount = memberships?.data?.length ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={[styles.title, { color: textColor }]}>
          Members
        </ThemedText>
        <View style={styles.badge}>
          <ThemedText style={[styles.badgeText, { color: mutedColor }]}>
            {memberCount}
          </ThemedText>
        </View>
      </View>

      {memberCount > 0 ? (
        memberships.data?.map((member) => (
          <MemberItem key={member.id} member={member} />
        ))
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
