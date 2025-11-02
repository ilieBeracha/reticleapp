// app/(protected)/(tabs)/_layout.tsx
import CustomHeader from "@/components/Header";
import { useColors } from "@/hooks/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";
import { Platform } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const isDark = colors.background === "#0f172a";

  const { selectedOrgId } = useOrganizationsStore();
  const hasOrganization = selectedOrgId !== null;

  return (
    <>
      <StatusBar translucent={false} style={isDark ? "light" : "dark"} />
      <CustomHeader onNotificationPress={() => {}} />
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
            borderTopWidth: 1,
            borderTopColor: colors.border,
            height: Platform.OS === "ios" ? 84 : 68,
            paddingBottom: Platform.OS === "ios" ? 24 : 8,
            paddingTop: 8,
            elevation: 0,
            shadowColor: "transparent",
          },
          tabBarItemStyle: {
            paddingVertical: 4,
          },
        }}
      >
        {/* ===== LEFT SIDE (Org-only tabs) ===== */}

        {/* Calendar - Only shown if user has organization */}
        <Tabs.Screen
          name="calendar"
          options={{
            title: "Calendar",
            href: hasOrganization ? "/(protected)/(tabs)/calendar" : null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "calendar" : "calendar-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* Members - Only shown if user has organization */}
        <Tabs.Screen
          name="members"
          options={{
            title: "Members",
            href: hasOrganization ? "/(protected)/(tabs)/members" : null,
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* ===== CENTER (Always visible) ===== */}

        {/* Home - Always in the middle */}
        <Tabs.Screen
          name="index"
          options={{
            title: "Home",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "home" : "home-outline"}
                size={26} // ✅ Slightly larger to emphasize center
                color={color}
              />
            ),
          }}
        />

        {/* ===== RIGHT SIDE (Always visible) ===== */}

        {/* AI - Always shown */}
        <Tabs.Screen
          name="ai"
          options={{
            title: "AI",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "sparkles" : "sparkles-outline"}
                size={24}
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
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* ===== HIDDEN SCREENS ===== */}

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
    </>
  );
}
