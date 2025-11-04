// components/Home.tsx
import { ThemedView } from "@/components/ThemedView";
import { useColors } from "@/hooks/useColors";
import { useEnsureActiveOrg } from "@/hooks/useEnsureActiveOrg";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganizationSwitchStore } from "@/store/organizationSwitchStore";
import { useOrganizationsStore } from "@/store/organizationsStore"; // ✅ New import
import { sessionsStore } from "@/store/sessionsStore";
import { useAuth, useUser } from "@clerk/clerk-expo"; // ❌ Removed useOrganization
import { useEffect, useRef } from "react";
import { Animated, ScrollView, StyleSheet } from "react-native";
import { useStore } from "zustand";
import { MetricCards } from "../stats/MetricCards";
import { GreetingSection } from "./GreetingSection";
import { RecentSessions } from "./RecentSessions";

export function Home() {
  useEnsureActiveOrg();
  const { user } = useUser();
  const { userId } = useAuth(); // ❌ Removed orgId

  // ✅ Use new organizations store instead of Clerk
  const { selectedOrgId, allOrgs, fetchUserOrgs, fetchAllOrgs } =
    useOrganizationsStore();

  const { sessions, loading, fetchSessions } = useStore(sessionsStore);
  const { isSwitching } = useStore(useOrganizationSwitchStore);

  const backgroundColor = useThemeColor({}, "background");
  const colors = useColors();
  const userName =
    user?.emailAddresses?.[0]?.emailAddress?.split("@")[0] || "User";

  // ✅ Get selected organization from hierarchy
  const selectedOrg = allOrgs.find((o) => o.id === selectedOrgId);
  const organizationName = selectedOrg?.name;
  const isPersonalWorkspace = !selectedOrgId;

  // Animation values for content fade-in and slide-up
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const previousOrgId = useRef<string | null | undefined>(selectedOrgId); // ✅ Track hierarchy org
  const previousIsSwitching = useRef<boolean>(isSwitching);

  // ✅ Fetch organizations on mount
  useEffect(() => {
    if (userId) {
      fetchUserOrgs(userId);
      fetchAllOrgs(userId);
    }
  }, [userId]);

  /**
   * Handle organization switch lifecycle
   */
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

  // ✅ Fetch sessions when org changes
  useEffect(() => {
    const loadSessions = async () => {
      // Skip fetch if we're in the middle of switching
      if (isSwitching) {
        console.log("Skipping fetch - organization switch in progress");
        return;
      }

      if (userId) {
        console.log("Fetching sessions for orgId:", selectedOrgId); // ✅ Use hierarchy org
        fetchSessions(userId, selectedOrgId); // ✅ Pass hierarchy org ID
      }
    };
    loadSessions();
  }, [userId, selectedOrgId, isSwitching]); // ✅ Track selectedOrgId instead of orgId

  // ✅ Animate when switching orgs
  useEffect(() => {
    if (
      previousOrgId.current !== undefined &&
      previousOrgId.current !== selectedOrgId && // ✅ Compare hierarchy org
      !isSwitching
    ) {
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

    previousOrgId.current = selectedOrgId; // ✅ Track hierarchy org
  }, [selectedOrgId, isSwitching, fadeAnim, slideAnim]);

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
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <GreetingSection
            userName={userName}
            organizationName={organizationName}
            isPersonalWorkspace={isPersonalWorkspace}
          />
          <MetricCards metrics={[
            {
              icon: "stats-chart",
              label: "Total Sessions",
              value: sessions.length,
              change: 12,
              unit: "sessions",
              color: colors.indigo,
            },
            {
              icon: "flame",
              label: "Avg Accuracy",
              value: 95,
              change: 5,
              unit: "%",
              color: colors.blue,
            },
            {
              icon: "time",
              label: "Avg Time",
              value: "24m",
              change: 8,
              unit: "m",
              color: colors.orange,
            },
          ]} />
          <RecentSessions sessions={sessions} loading={loading} />
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
