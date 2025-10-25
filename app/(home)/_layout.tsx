import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import ActionMenuModal, {
  type Action,
} from "@/components/modals/ActionMenuModal";
import CreateSessionModal from "@/components/modals/CreateSessionModal";
import { useOrganization } from "@clerk/clerk-expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { router, Stack, usePathname } from "expo-router";
import { useState } from "react";
import { View } from "react-native";

const actions: Action[] = [
  {
    title: "Scan Target",
    description: "Scan and calculate hits",
    icon: "scan-outline",
    action: "scan",
    isOnlyOrganizationMember: false,
  },
  {
    title: "Create Session",
    description: "Create a new session",
    icon: "create-outline",
    action: "create-session",
    isOnlyOrganizationMember: false,
  },
  {
    title: "New Training",
    description: "Create a new training for your organization",
    icon: "add-circle-outline",
    action: "new-training",
    isOnlyOrganizationMember: true,
  },
];

export default function Layout() {
  const [actionMenuVisible, setActionMenuVisible] = useState(false);
  const [createSessionVisible, setCreateSessionVisible] = useState(false); // ✅ Add this state
  const { organization } = useOrganization();
  const pathname = usePathname();

  // Check if current route is camera-detect for full-screen display
  const isCameraScreen = pathname === "/camera-detect";

  const handleActionSelect = (action: string) => {
    switch (action) {
      case "scan":
        router.push("/(home)/camera-detect");
        break;
      case "create-session":
        setCreateSessionVisible(true);
        break;
      case "new-training":
        console.log("Navigate to new training");
        break;
      default:
        console.log("Unknown action:", action);
    }
  };

  return (
    <BottomSheetModalProvider>
      <View style={{ flex: 1 }}>
        <Header onNotificationPress={() => {}} />

        <View style={{ flex: 1 }}>
          <Stack screenOptions={{ headerShown: false, animation: "none" }}>
            <Stack.Screen name="index" options={{ animation: "none" }} />
            <Stack.Screen name="settings" options={{ animation: "none" }} />
            <Stack.Screen name="members" options={{ animation: "none" }} />
            <Stack.Screen name="stats" options={{ animation: "none" }} />
            <Stack.Screen name="calendar" options={{ animation: "none" }} />
            <Stack.Screen
              name="camera-detect"
              options={{
                animation: "slide_from_bottom",
                presentation: "modal",
              }}
            />
          </Stack>
        </View>

        {!isCameraScreen && (
          <BottomNav onAddPress={() => setActionMenuVisible(true)} />
        )}

        {!isCameraScreen && (
          <ActionMenuModal
            visible={actionMenuVisible}
            onClose={() => setActionMenuVisible(false)}
            title="Quick Actions"
            actions={actions}
            onActionSelect={handleActionSelect}
            hasOrganization={!!organization}
          />
        )}

        {/* Create Session Modal - only show when not on camera screen */}
        {!isCameraScreen && (
          <CreateSessionModal
            visible={createSessionVisible}
            onClose={() => setCreateSessionVisible(false)}
          />
        )}
      </View>
    </BottomSheetModalProvider>
  );
}
