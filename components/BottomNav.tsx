import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganizationList } from "@clerk/clerk-expo";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, usePathname } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

type BottomNavProps = {
  onAddPress: () => void;
};

export default function BottomNav({ onAddPress }: BottomNavProps) {
  const pathname = usePathname();
  const { userMemberships } = useOrganizationList();
  const hasOrganization = (userMemberships?.data?.length ?? 0) > 0;

  const card = useThemeColor({}, "cardBackground");
  const border = useThemeColor({}, "border");
  const primary = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");
  const background = useThemeColor({}, "background");

  const handleOrganizationPress = () => {
    const target = hasOrganization
      ? "/(home)/organization"
      : "/(home)/create-organization";
    router.push(target as any);
  };

  const isHome = pathname === "/(home)";
  const isOrg = pathname?.startsWith("/(home)/organization");
  const isSession = pathname?.startsWith("/(home)/session");
  const isSettings = pathname?.startsWith("/(home)/settings");

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: card, borderTopColor: border },
      ]}
    >
      <Link href="/(home)" asChild>
        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="home" size={24} color={isHome ? primary : muted} />
        </TouchableOpacity>
      </Link>

      <TouchableOpacity
        style={styles.navItem}
        onPress={handleOrganizationPress}
      >
        <Ionicons name="people" size={24} color={isOrg ? primary : muted} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.addButton, { backgroundColor: primary }]}
        onPress={onAddPress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color={background} />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/(home)/session" as any)}
      >
        <Ionicons
          name="calendar"
          size={24}
          color={isSession ? primary : muted}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push("/(home)/settings" as any)}
      >
        <Ionicons
          name="settings"
          size={24}
          color={isSettings ? primary : muted}
        />
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
  navItem: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
  addButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
});
