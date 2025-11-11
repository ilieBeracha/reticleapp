import BaseBottomSheet from "@/components/BaseBottomSheet";
import { CreateSessionBottomSheet } from "@/components/CreateSessionBottomSheet";
import CreateTrainingModal from "@/components/CreateTrainingModal";
import Header from "@/components/Header";
import { OrgBreadcrumb } from "@/components/organizations/OrgBreadcrumb";
import { OrgSwitchIndicator } from "@/components/organizations/OrgSwitchIndicator";
import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import { router, Tabs, usePathname } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export default function TabLayout() {
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();
  const isPersonalMode = selectedOrgId == null || selectedOrgId == undefined;
  const [isCreateSessionModalVisible, setIsCreateSessionModalVisible] = useState(false);
  const [isCreateTrainingModalVisible, setIsCreateTrainingModalVisible] = useState(false);
  const [isQuickActionsModalVisible, setIsQuickActionsModalVisible] = useState(false);
  const pathname = usePathname();
  const isCameraPath = pathname.includes("/camera");
  
  const handleQuickActionsPress = (action: "scan" | "session" | "training") => {
    setIsQuickActionsModalVisible(false);
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

  const quickActions = [
    {
      id: "scan",
      title: "Scan Target",
      icon: "scan" as keyof typeof Ionicons.glyphMap,
      color: colors.primary,
      onPress: () => handleQuickActionsPress("scan"),
    },
    {
      id: "session",
      title: "Create Session",
      icon: "add-circle" as keyof typeof Ionicons.glyphMap,
      color: colors.green,
      onPress: () => handleQuickActionsPress("session"),
    },
    ...(isPersonalMode ? [] : [
      {
        id: "training",
        title: "Create Training",
        icon: "fitness" as keyof typeof Ionicons.glyphMap,
        color: colors.teal,
        onPress: () => handleQuickActionsPress("training"),
      },
    ]),
  ];

  return (
    <>
      <StatusBar
        translucent={isCameraPath}

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
                  size={22}
                  color={color}
                />
              ),
            }}
          />

          {/* Training Calendar - Org mode only */}
          <Tabs.Screen
            name="calendar"
            options={{
              title: "Calendar",
              href: isPersonalMode ? null : "/(protected)/(tabs)/calendar",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "calendar" : "calendar-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />

          {/* Center Action Button - Always shown */}
          <Tabs.Screen
            name="programs"
            listeners={{
              tabPress: (e) => {
                e.preventDefault();
                setIsQuickActionsModalVisible(true);
              },
            }}
            options={{
              title: "",
              tabBarIcon: () => (
                <View style={[localStyles.centerButton, { backgroundColor: colors.indigo }]}>
                  <Ionicons name="add" size={28} color="#FFFFFF" />
                </View>
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
                  size={22}
                  color={color}
                />
              ),
            }}
          />

          {/* AI Insights - Org mode only */}
          <Tabs.Screen
            name="weapons"
            options={{
              title: "AI",
              href: isPersonalMode ? null : "/(protected)/(tabs)/weapons",
              tabBarIcon: ({ color, focused }) => (
                <Ionicons
                  name={focused ? "sparkles" : "sparkles-outline"}
                  size={22}
                  color={color}
                />
              ),
            }}
          />

          {/* Settings - Hidden from tabs, accessible via other routes */}
          <Tabs.Screen
            name="settings"
            options={{
              href: null,
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
        </Tabs>
      </View>

      {/* Quick Actions Modal */}
      <BaseBottomSheet
        visible={isQuickActionsModalVisible}
        enableDynamicSizing={true}
        onClose={() => setIsQuickActionsModalVisible(false)}
      >
        <Text style={[localStyles.modalTitle, { color: colors.text }]}>
          Quick Actions
        </Text>

        <View style={localStyles.actionsContainer}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                localStyles.actionButton,
                {
                  backgroundColor: colors.card,
                  borderColor: colors.border,
                },
              ]}
              onPress={action.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  localStyles.actionIconContainer,
                  { backgroundColor: action.color + "20" },
                ]}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[localStyles.actionTitle, { color: colors.text }]}>
                {action.title}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.textMuted}
              />
            </TouchableOpacity>
          ))}
        </View>
      </BaseBottomSheet>

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

const localStyles = StyleSheet.create({
  centerButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  actionsContainer: {
    gap: 12,
    marginBottom: 10,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  actionIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  actionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
  },
});
