import { ThemedView } from "@/components/ThemedView";
import { useEnsureActiveOrg } from "@/hooks/organizations/useEnsureActiveOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganizationSwitchStore } from "@/store/organizationSwitchStore";
import { sessionsStore } from "@/store/sessionsStore";
import { useAuth, useOrganization, useUser } from "@clerk/clerk-expo";
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet } from "react-native";
import { useStore } from "zustand";
import { GreetingSection } from "./GreetingSection";
import { LastRecap } from "./LastRecap";

export function Home() {
  useEnsureActiveOrg();
  const { user } = useUser();
  const { organization } = useOrganization();
  const { userId, orgId, getToken } = useAuth();

  // Use Zustand stores
  const { sessions, loading, fetchSessions } = useStore(sessionsStore);
  const { isSwitching } = useOrganizationSwitchStore();

  const backgroundColor = useThemeColor({}, "background");

  const userName =
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  // Animation values for content fade-in and slide-up
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const previousOrgId = useRef<string | null | undefined>(orgId);
  const previousIsSwitching = useRef<boolean>(isSwitching);

  // Unified effect to handle switch lifecycle
  useEffect(() => {
    const switchStarted = isSwitching && previousIsSwitching.current === false;
    const switchCompleted =
      !isSwitching && previousIsSwitching.current === true;

    if (switchStarted) {
      console.log("Switch started - hiding content and clearing sessions");
      fadeAnim.setValue(0);
      slideAnim.setValue(20);
      sessionsStore.getState().resetSessions();
    }

    /**
     * If we're in the middle of switching, we don't want to fetch sessions
     * as that would cause a flash of the previous org's sessions.
     */
    if (switchCompleted) {
      console.log("Switch completed - triggering content animation");
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    previousIsSwitching.current = isSwitching;
  }, [isSwitching, fadeAnim, slideAnim]);

  useEffect(() => {
    const loadSessions = async () => {
      // Skip fetch if we're in the middle of switching
      if (isSwitching) {
        console.log("Skipping fetch - organization switch in progress");
        return;
      }

      if (userId) {
        const token = await getToken({ template: "supabase" });
        if (token) {
          /**
           * Context-based fetching:
           * - Personal (no orgId): Fetch ALL user's sessions across all orgs
           * - Organization (has orgId): Fetch ALL team sessions from this org
           */
          console.log("Fetching sessions for orgId:", orgId);
          fetchSessions(token, userId, orgId);
        }
      }
    };
    loadSessions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, orgId, isSwitching]); // Include isSwitching to refetch when switch completes

  // Track orgId changes for animation (non-switch scenarios)
  useEffect(() => {
    const orgIdChanged =
      previousOrgId.current !== undefined &&
      previousOrgId.current !== orgId &&
      !isSwitching;

    if (orgIdChanged) {
      console.log("OrgId changed without switch overlay - animating");
      fadeAnim.setValue(0);
      slideAnim.setValue(20);

      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 400,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]).start();
    }

    previousOrgId.current = orgId;
  }, [orgId, isSwitching, fadeAnim, slideAnim]);

  return (
    <ThemedView style={[styles.container, { backgroundColor }]}>
      <Animated.View
        style={[
          styles.animatedContainer,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }],
          },
        ]}
      >
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
      </Animated.View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  animatedContainer: {
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
