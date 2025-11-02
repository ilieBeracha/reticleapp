import Header from "@/components/Header";
import { useColors } from "@/hooks/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React from "react";

export default function TabLayout() {
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();
  const isPersonalMode = selectedOrgId == null || selectedOrgId == undefined;

  return (
    <>
      <StatusBar
        translucent={false}
        style={colors.background === "#0f172a" ? "dark" : "light"}
      />
      <Header onNotificationPress={() => {}} />

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

        {/* Members - Only shown if user has organization */}
        <Tabs.Screen
          name="members"
          options={{
            title: "Members",
            href: isPersonalMode ? null : "/(protected)/(tabs)/members",
            tabBarIcon: ({ color, focused }) => (
              <Ionicons
                name={focused ? "people" : "people-outline"}
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
