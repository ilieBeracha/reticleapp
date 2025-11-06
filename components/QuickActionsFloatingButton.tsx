import { useColors } from "@/hooks/ui/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import BaseBottomSheet from "./BaseBottomSheet";

interface QuickAction {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  onPress: () => void;
}

export default function QuickActionsFloatingButton({
  onPress = (action: "scan" | "session" | "training") => {},
}: {
  onPress: (action: "scan" | "session" | "training") => void;
}) {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const colors = useColors();
  const { selectedOrgId } = useOrganizationsStore();
  const isOrganizationMode =
    selectedOrgId != null && selectedOrgId != undefined;

  const TAB_BAR_HEIGHT = 65;
  const BOTTOM_SPACING = 16;

  const quickActions: QuickAction[] = [
    {
      id: "scan",
      title: "Scan Target",
      icon: "scan",
      color: "#3b82f6",
      onPress: () => {
        setIsModalVisible(false);
        onPress("scan");
      },
    },
    {
      id: "session",
      title: "Create Session",
      icon: "add-circle",
      color: "#10b981",
      onPress: () => {
        setIsModalVisible(false);
        onPress("session");
      },
    },
    ...(isOrganizationMode
      ? [
          {
            id: "training",
            title: "Create Training",
            icon: "fitness" as keyof typeof Ionicons.glyphMap,
            color: colors.orange,
            onPress: () => {
              setIsModalVisible(false);
              onPress("training");
            },
          },
        ]
      : []),
  ];

  return (
    <>
      <Pressable
        style={[
          styles.fab,
          {
            backgroundColor: colors.indigo,
            bottom: TAB_BAR_HEIGHT + BOTTOM_SPACING + insets.bottom,
            right: 20,
          },
        ]}
        onPress={() => setIsModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#fff" />
      </Pressable>

      <BaseBottomSheet
        visible={isModalVisible}
        enableDynamicSizing={true}
        onClose={() => setIsModalVisible(false)}
      >
        <Text style={[styles.modalTitle, { color: colors.text }]}>
          Quick Actions
        </Text>

        <View style={styles.actionsContainer}>
          {quickActions.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[
                styles.actionButton,
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
                  styles.actionIconContainer,
                  { backgroundColor: action.color + "20" },
                ]}
              >
                <Ionicons name={action.icon} size={24} color={action.color} />
              </View>
              <Text style={[styles.actionTitle, { color: colors.text }]}>
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
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: "absolute",
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
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
