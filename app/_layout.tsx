import { OrganizationSwitchOverlay } from "@/components/OrganizationSwitchOverlay";

import { GluestackUIProvider } from "@/components/ui/gluestack-ui-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { useColorScheme } from "@/hooks/ui/useColorScheme";
import {
  OrganizationSwitchProvider,
  useOrganizationSwitch,
} from "@/hooks/useOrganizationSwitch";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { useFonts } from "expo-font";
import { Slot } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import "../global.css";
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require("../assets/fonts/SpaceMono-Regular.ttf"),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  
 

  return <RootLayoutInner />;
}

function RootLayoutInner() {
  const colorScheme = useColorScheme();

  return (
    <GluestackUIProvider mode={colorScheme === "dark" ? "dark" : "light"}>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AuthProvider>
            <BottomSheetModalProvider>
              <OrganizationSwitchProvider>
                <Slot />
                <StatusBar style="auto" />
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
