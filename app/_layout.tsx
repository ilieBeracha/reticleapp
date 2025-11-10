import { OrganizationSwitchOverlay } from "@/components/OrganizationSwitchOverlay";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/ui/useColorScheme";
import {
  OrganizationSwitchProvider,
  useOrganizationSwitch,
} from "@/hooks/useOrganizationSwitch";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import * as Sentry from '@sentry/react-native';
import { useFonts } from "expo-font";
import * as Linking from "expo-linking";
import { Slot, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";

Sentry.init({
  dsn: 'https://5d3b6c98533d4f43d24c5ea946c21c45@o4510334793744384.ingest.de.sentry.io/4510334826643536',

  // Adds more context data to events (IP address, cookies, user, etc.)
  // For more information, visit: https://docs.sentry.io/platforms/react-native/data-management/data-collected/
  sendDefaultPii: true,

  // Enable Logs
  enableLogs: true,

  // Configure Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1,
  integrations: [Sentry.mobileReplayIntegration(), Sentry.feedbackIntegration()],

  // uncomment the line below to enable Spotlight (https://spotlightjs.com)
  // spotlight: __DEV__,
});
SplashScreen.preventAutoHideAsync();

export default Sentry.wrap(function RootLayout() {
  const router = useRouter();
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  // Handle deep links
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url ?? "";
      console.log("🔗 Deep link received:", url);
      
      const { path, queryParams } = Linking.parse(url);
      console.log("📍 Parsed - path:", path, "queryParams:", queryParams);

      // Handle invite links: reticle://invite?code=ABC123
      if (path === "invite" && queryParams?.code) {
        console.log("✅ Navigating to /invite with code:", queryParams.code);
        router.push({
          pathname: "/invite",
          params: { code: queryParams.code as string },
        });
      }
    };

    // Listen for incoming links when app is already open
    const subscription = Linking.addEventListener("url", handleDeepLink);

    // Handle the case when app is opened from a deep link (cold start)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url });
    });

    return () => subscription.remove();
  }, []);

  return <RootLayoutInner />;
});

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <GluestackUIProvider mode={colorScheme === "dark" ? "dark" : "light"}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <AuthProvider>
        <BottomSheetModalProvider>
          <OrganizationSwitchProvider>
            <Slot />
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <AppOverlay />
          </OrganizationSwitchProvider>
        </BottomSheetModalProvider>
        </AuthProvider>
      </GestureHandlerRootView>
    </GluestackUIProvider>
  );
}

function AppOverlay() {
  const { isSwitching, targetOrganization } = useOrganizationSwitch();

  return (
    <OrganizationSwitchOverlay
      visible={isSwitching}
      organizationName={targetOrganization}
    />
  );
}