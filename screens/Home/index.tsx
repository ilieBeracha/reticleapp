import { ThemedView } from "@/components/ThemedView";
import { useEnsureActiveOrg } from "@/hooks/organizations/useEnsureActiveOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization, useUser } from "@clerk/clerk-expo";
import { ScrollView, StyleSheet } from "react-native";
import { GreetingSection } from "./components/GreetingSection";
import { OrganizationSection } from "./components/OrganizationSection";
import { QuickActionsSection } from "./components/QuickActionsSection";
import { StatsSection } from "./components/StatsSection";

export function Home() {
  useEnsureActiveOrg();
  const { user } = useUser();
  const { organization } = useOrganization();

  const backgroundColor = useThemeColor({}, "background");

  const userName =
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <GreetingSection userName={userName} />

        <StatsSection organizationCount={organization ? 1 : 0} />

        {organization && (
          <OrganizationSection organizationName={organization.name} />
        )}

        <QuickActionsSection />
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
    paddingTop: 8,
    paddingBottom: 20,
  },
});
