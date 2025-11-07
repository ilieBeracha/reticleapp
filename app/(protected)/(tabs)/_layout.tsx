import { CreateSessionBottomSheet } from "@/components/CreateSessionBottomSheet";
import CreateTrainingModal from "@/components/CreateTrainingModal";
import Header from "@/components/Header";
import { OrgBreadcrumb } from "@/components/OrgBreadcrumb";
import { OrgSwitchIndicator } from "@/components/OrgSwitchIndicator";
import QuickActionsFloatingButton from "@/components/QuickActionsFloatingButton";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { View } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();
  const isPersonalMode = selectedOrgId == null || selectedOrgId == undefined;
  const [isCreateSessionModalVisible, setIsCreateSessionModalVisible] = useState(false);
  const [isCreateTrainingModalVisible, setIsCreateTrainingModalVisible] = useState(false); 
  const pathname = usePathname();
  const isCameraPath = pathname.includes("/camera");
  const handleQuickActionsPress = (action: "scan" | "session" | "training") => {
    switch (action) {
      case "scan":
        router.push("/(protected)/(tabs)/camera");
        break;
      case "session":
        setIsCreateSessionModalVisible(true);
        break;
      case "training":
        setIsCreateTrainingModalVisible(true);
        break;
    }
  };

  return (
    <>
      <StatusBar
        translucent={isCameraPath}
        style={isCameraPath ? "light" : (colors.background === "#0f172a" ? "dark" : "light")}
      />
      {!isCameraPath && <Header onNotificationPress={() => {}} />}
      {!isCameraPath && <OrgBreadcrumb />}
      <OrgSwitchIndicator />

      <View style={{ flex: 1 }}>
        <Tabs
          screenOptions={{
            headerShown: false,
            tabBarShowLabel: true,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: "600",
              marginTop: 2,
            },
            tabBarActiveTintColor: colors.indigo,
            tabBarInactiveTintColor: colors.textMuted,
            tabBarStyle: isCameraPath ? {
              display: 'none'
            } : {
              backgroundColor: colors.background,
              justifyContent: "center",
              borderTopWidth: 1,
              borderTopColor: colors.border,
              paddingHorizontal: 10,
              paddingBottom: 12,
              paddingTop: 12,
            },
          }}
        >
          {/* Home - Always shown */}
          <Tabs.Screen
            name="index"
            options={{
              title: "Home",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "home" : "home-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

          {/* Training Programs - Only in org mode */}
          <Tabs.Screen
            name="programs"
            options={{
              title: "Programs",
              href: isPersonalMode ? null : "/(protected)/(tabs)/programs",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "folder" : "folder-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

          {/* Training Calendar - Only in org mode */}
          <Tabs.Screen
            name="calendar"
            options={{
              title: "Calendar",
              href: isPersonalMode ? null : "/(protected)/(tabs)/calendar",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "calendar" : "calendar-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

          {/* Stats - Always shown */}
          <Tabs.Screen
            name="stats"
            options={{
              title: "Stats",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "stats-chart" : "stats-chart-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

        

          {/* ===== HIDDEN SCREENS ===== */}


          <Tabs.Screen
            name="camera"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="loadout"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="settings"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="weapons"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="manage"
            options={{
              href: null,
            }}
          />
        </Tabs>
        {!isCameraPath && <QuickActionsFloatingButton onPress={(action: "scan" | "session" | "training") => handleQuickActionsPress(action)} />}
      </View>

      {/* Modals */}
      <CreateSessionBottomSheet
        visible={isCreateSessionModalVisible}
        onClose={() => setIsCreateSessionModalVisible(false)}
      />
      <CreateTrainingModal
        visible={isCreateTrainingModalVisible}
        onClose={() => setIsCreateTrainingModalVisible(false)}
      />
    </>
  );
}
