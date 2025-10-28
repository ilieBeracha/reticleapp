import {
  MAXIMUM_SWITCH_TIMEOUT,
  MINIMUM_SWITCH_DURATION,
  useOrganizationSwitchStore,
  waitForMinimumDuration,
} from "@/store/organizationSwitchStore";
import { useAuth, useOrganizationList } from "@clerk/clerk-expo";
import { useRouter } from "expo-router";
import React, { createContext, ReactNode, useContext, useEffect } from "react";
import { Alert, AppState, AppStateStatus } from "react-native";

interface OrganizationSwitchContextValue {
  switchOrganization: (
    organizationId: string | null,
    organizationName: string
  ) => Promise<void>;
  isSwitching: boolean;
  targetOrganization: string | null;
}

const OrganizationSwitchContext =
  createContext<OrganizationSwitchContextValue | null>(null);

interface OrganizationSwitchProviderProps {
  children: ReactNode;
}

export function OrganizationSwitchProvider({
  children,
}: OrganizationSwitchProviderProps) {
  const router = useRouter();
  const { orgId } = useAuth();
  const { setActive } = useOrganizationList();

  const {
    isSwitching,
    targetOrganizationName,
    switchStartTime,
    startSwitch,
    completeSwitch,
    cancelSwitch,
  } = useOrganizationSwitchStore();

  // Handle app backgrounding scenarios
  useEffect(() => {
    const subscription = AppState.addEventListener(
      "change",
      (nextAppState: AppStateStatus) => {
        // If app goes to background while switching, cancel the switch
        if (isSwitching && nextAppState === "background") {
          console.log(
            "App backgrounded during organization switch, canceling switch"
          );
          cancelSwitch();
          Alert.alert(
            "Switch Interrupted",
            "Organization switch was interrupted. Please try again.",
            [{ text: "OK" }]
          );
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [isSwitching, cancelSwitch]);

  const switchOrganization = async (
    organizationId: string | null,
    organizationName: string
  ) => {
    // Prevent switching while already switching (debounce)
    if (isSwitching) {
      console.log("Switch already in progress, ignoring request");
      return;
    }

    // Skip transition if switching to current organization
    if (organizationId === orgId) {
      console.log("Already in target organization, skipping switch");
      return;
    }

    // Start the switch process
    startSwitch(organizationId, organizationName);

    try {
      // Set up maximum timeout safety net
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Organization switch timeout")),
          MAXIMUM_SWITCH_TIMEOUT
        );
      });

      // Perform the Clerk organization switch
      const switchPromise = (async () => {
        if (!setActive) {
          throw new Error("Clerk setActive not available");
        }

        console.log(
          `Switching to organization: ${organizationName} (${
            organizationId || "personal"
          })`
        );

        await setActive({ organization: organizationId });

        console.log("Clerk organization switch successful");
      })();

      // Wait for either the switch to complete or timeout
      await Promise.race([switchPromise, timeoutPromise]);

      // Navigate to home page (reset navigation stack)
      console.log("Navigating to home page");
      router.replace("/(home)");

      // Wait for minimum duration to ensure smooth UX
      console.log(
        `Waiting for minimum duration (${MINIMUM_SWITCH_DURATION}ms)`
      );
      await waitForMinimumDuration(switchStartTime);

      // Complete the switch
      console.log("Organization switch complete");
      completeSwitch();
    } catch (error) {
      // Handle errors
      console.error("Organization switch failed:", error);

      // Cancel the switch state
      cancelSwitch();

      // Show error message to user
      Alert.alert(
        "Switch Failed",
        "Could not switch organization. Please try again.",
        [{ text: "OK" }]
      );
    }
  };

  const value: OrganizationSwitchContextValue = {
    switchOrganization,
    isSwitching,
    targetOrganization: targetOrganizationName,
  };

  return (
    <OrganizationSwitchContext.Provider value={value}>
      {children}
    </OrganizationSwitchContext.Provider>
  );
}

export function useOrganizationSwitch(): OrganizationSwitchContextValue {
  const context = useContext(OrganizationSwitchContext);

  if (!context) {
    throw new Error(
      "useOrganizationSwitch must be used within OrganizationSwitchProvider"
    );
  }

  return context;
}
