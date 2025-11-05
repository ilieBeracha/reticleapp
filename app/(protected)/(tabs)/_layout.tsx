import Header from "@/components/Header";
import QuickActionsFloatingButton from "@/components/QuickActionsFloatingButton";
import { useColors } from "@/hooks/useColors";
import { useIsOrganizationCommander } from "@/hooks/useIsOrgAdmin";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { View } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();
  const isPersonalMode = selectedOrgId == null || selectedOrgId == undefined;
  const isCommander = useIsOrganizationCommander();

  const handleQuickActionsPress = (action: "scan" | "session" | "training") => {
    switch (action) {
      case "scan":
        router.push("/camera-detect");
        break;
      case "session":
        router.push("/");
        break;
      case "training":
        router.push("/loadout");
        break;
    }
  };

  return (
    <>
      <StatusBar
        translucent={false}
        style={colors.background === "#0f172a" ? "dark" : "light"}
      />
      <Header onNotificationPress={() => {}} />

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
            tabBarStyle: {
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

          {/* Calendar - Only shown if user has organization */}
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

          {/* Manage - Only shown if user is commander */}
          <Tabs.Screen
            name="manage"
            options={{
              title: "Manage",
              href:
                !isPersonalMode && isCommander
                  ? "/(protected)/(tabs)/manage"
                  : null,
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "shield-checkmark" : "shield-checkmark-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

          {/* AI - Always shown */}
          <Tabs.Screen
            name="ai"
            options={{
              title: "AI",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "sparkles" : "sparkles-outline"}
                  size={20}
                  color={color}
                />
              ),
            }}
          />

          {/* ===== HIDDEN SCREENS ===== */}

          <Tabs.Screen
            name="members"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="profile"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="camera-detect"
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
        </Tabs>
        <QuickActionsFloatingButton onPress={(action: "scan" | "session" | "training") => handleQuickActionsPress(action)} />
      </View>
    </>
  );
}
