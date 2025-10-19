import { ThemedView } from "@/components/ThemedView";
import { useEnsureActiveOrg } from "@/hooks/organizations/useEnsureActiveOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import {
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/clerk-expo";
import { ScrollView, StyleSheet } from "react-native";
import { GreetingSection } from "./components/GreetingSection";
import { LastRecap } from "./components/LastRecap";

export function Home() {
  useEnsureActiveOrg();
  const { user } = useUser();
  const { organization, membership } = useOrganization();
  const { userMemberships } = useOrganizationList({
    userMemberships: {
      pageSize: 50,
    },
  });

  const backgroundColor = useThemeColor({}, "background");

  const userName =
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  const organizationCount = userMemberships?.data?.length ?? 0;

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GreetingSection
          userName={userName}
          organizationName={organization?.name}
          organizationRole={membership?.role}
          organizationCount={organizationCount}
        />

        <LastRecap />

        {/* <StatsSection organizationCount={organization ? 1 : 0} /> */}

        {/* {organization && (
          <OrganizationSection organizationName={organization.name} />
        )} */}

        {/* <QuickActionsSection /> */}
      </ScrollView>
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
});
