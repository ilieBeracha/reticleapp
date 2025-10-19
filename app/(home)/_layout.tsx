import ActionMenuModal, { type Action } from "@/components/ActionMenuModal";
import BottomNav from "@/components/BottomNav";
import Header from "@/components/Header";
import { useOrganization } from "@clerk/clerk-expo";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack } from "expo-router";
import { useState } from "react";
import { View } from "react-native";
import CreateSessionModal from "../auth/components/CreateSessionModal"; // ✅ Add this import

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

  const handleActionSelect = (action: string) => {
    console.log("Action selected:", action);

    switch (action) {
      case "scan":
        console.log("Navigate to scan target");
        break;
      case "create-session":
        setCreateSessionVisible(true); // ✅ Open modal instead of just logging
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
          </Stack>
        </View>
        <BottomNav onAddPress={() => setActionMenuVisible(true)} />

        {/* Action Menu Modal */}
        <ActionMenuModal
          visible={actionMenuVisible}
          onClose={() => setActionMenuVisible(false)}
          title="Quick Actions"
          actions={actions}
          onActionSelect={handleActionSelect}
          hasOrganization={!!organization}
        />

        {/* ✅ Create Session Modal */}
        <CreateSessionModal
          visible={createSessionVisible}
          onClose={() => setCreateSessionVisible(false)}
        />
      </View>
    </BottomSheetModalProvider>
  );
}
