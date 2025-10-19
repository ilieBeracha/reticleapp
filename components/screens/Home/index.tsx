import { ThemedView } from "@/components/ThemedView";
import { useEnsureActiveOrg } from "@/hooks/organizations/useEnsureActiveOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { sessionsStore } from "@/store/sessionsStore";
import { useAuth, useOrganization, useUser } from "@clerk/clerk-expo";
import { useEffect } from "react";
import { ScrollView, StyleSheet } from "react-native";
import { useStore } from "zustand";
import { GreetingSection } from "./components/GreetingSection";
import { LastRecap } from "./components/LastRecap";

export function Home() {
  useEnsureActiveOrg();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userId, orgId, getToken } = useAuth();

  // Use Zustand store
  const { sessions, loading, fetchSessions } = useStore(sessionsStore);

  const backgroundColor = useThemeColor({}, "background");

  const userName =
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  // Load sessions on mount and when org/user changes
  useEffect(() => {
    const loadSessions = async () => {
      if (userId) {
        const token = await getToken({ template: "supabase" });
        if (token) {
          /**
           * Context-based fetching:
           * - Personal (no orgId): Fetch ALL user's sessions across all orgs
           * - Organization (has orgId): Fetch ALL team sessions from this org
           */
          fetchSessions(token, userId, orgId);
        }
      }
    };
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, orgId]); // Only depend on userId and orgId, not the functions

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <ScrollView
        contentContainerStyle={[styles.content, styles.bottomPadding]}
        showsVerticalScrollIndicator={false}
      >
        <GreetingSection
          userName={userName}
          organizationName={organization?.name}
          isPersonalWorkspace={!organization}
        />

        <LastRecap
          sessions={sessions}
          loading={loading}
          hasOrganization={!!organization}
        />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 120,
  },
  bottomPadding: {
    paddingBottom: 100,
  },
});
