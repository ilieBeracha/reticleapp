import { OrganizationSwitchOverlay } from "@/components/OrganizationSwitchOverlay";

import { useColorScheme } from "@/hooks/useColorScheme";
import { EnhancedAuthProvider } from "@/hooks/useEnhancedAuth";
import {
  OrganizationSwitchProvider,
  useOrganizationSwitch,
} from "@/hooks/useOrganizationSwitch";
import { ClerkLoaded, ClerkProvider } from "@clerk/clerk-expo";
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from "@react-navigation/native";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SecureStore from "expo-secure-store";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;
  const tokenCache = {
    async getToken(key: string) {
      try {
        return await SecureStore.getItemAsync(key);
      } catch {
        return null;
      }
    },
    async saveToken(key: string, value: string) {
      try {
        await SecureStore.setItemAsync(key, value);
      } catch {}
    },
  };
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!publishableKey) {
    throw new Error("Add EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
        <ClerkLoaded>
          <EnhancedAuthProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <OrganizationSwitchProvider>
                <Slot />
                <StatusBar style="auto" />
                <AppOverlay />
              </OrganizationSwitchProvider>
            </GestureHandlerRootView>
          </EnhancedAuthProvider>
        </ClerkLoaded>
      </ClerkProvider>
    </ThemeProvider>
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
