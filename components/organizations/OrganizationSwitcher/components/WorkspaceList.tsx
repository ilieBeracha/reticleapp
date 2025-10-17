import { ThemedText } from "@/components/ThemedText";
import { useThemeColor } from "@/hooks/useThemeColor";
import { OrganizationMembershipResource } from "@clerk/types";
import { ScrollView, StyleSheet, View } from "react-native";
import { CreateOrgButton } from "./CreateOrgButton";
import { WorkspaceOption } from "./WorkspaceOption";

interface WorkspaceListProps {
  userName: string;
  isPersonalActive: boolean;
  organizations: OrganizationMembershipResource[];
  activeOrgId?: string | null;
  switchingToId: string | null;
  onSwitchToPersonal: () => void;
  onSwitchToOrg: (orgId: string) => void;
  onCreateOrg: () => void;
}

export function WorkspaceList({
  userName,
  isPersonalActive,
  organizations,
  activeOrgId,
  switchingToId,
  onSwitchToPersonal,
  onSwitchToOrg,
  onCreateOrg,
}: WorkspaceListProps) {
  const mutedColor = useThemeColor({}, "description");

  return (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Personal Workspace */}
      <WorkspaceOption
        name={userName}
        isActive={isPersonalActive}
        isPrimary
        icon="person-circle"
        onPress={onSwitchToPersonal}
        isLoading={switchingToId === "personal"}
      />

      {/* Organizations Section */}
      <View style={styles.sectionHeader}>
        <ThemedText style={[styles.sectionTitle, { color: mutedColor }]}>
          Organizations
        </ThemedText>
      </View>

      {organizations.length > 0 ? (
        organizations.map((membership) => (
          <WorkspaceOption
            key={membership.id}
            name={membership.organization.name}
            isActive={activeOrgId === membership.organization.id}
            icon="business"
            onPress={() => onSwitchToOrg(membership.organization.id)}
            isLoading={switchingToId === membership.organization.id}
          />
        ))
      ) : (
        <View style={styles.emptyState}>
          <ThemedText style={[styles.emptyText, { color: mutedColor }]}>
            No organizations yet
          </ThemedText>
        </View>
      )}

      {/* Create Organization Button */}
      <CreateOrgButton onPress={onCreateOrg} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flexGrow: 1,
    flexShrink: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    paddingBottom: 20,
  },
  sectionHeader: {
    paddingVertical: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  emptyState: {
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 14,
    fontWeight: "400",
  },
});
