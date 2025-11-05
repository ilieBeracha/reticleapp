import { useColors } from "@/hooks/useColors";
import { useOrganizationsStore } from "@/store/organizationsStore";
import { BlurView } from "expo-blur";
import { router, usePathname } from "expo-router";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddButton } from "./AddButton";
import { NavItem } from "./NavItem";

type BottomNavProps = {
  onAddPress: () => void;
};

export default function BottomNav({ onAddPress }: BottomNavProps) {
  const pathname = usePathname();
  const { selectedOrgId } = useOrganizationsStore();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = useColors();
  const isHome = pathname === "/(protected)/(tabs)";
  const isMembers = pathname?.startsWith("/(protected)/(tabs)/members");
  const isSession = pathname?.startsWith("/(protected)/(tabs)/session");
  const isStats = pathname?.startsWith("/(protected)/(tabs)/stats");

  const navContent = (
    <>
      {/* Always: Home */}
      <NavItem icon="home" isActive={isHome} href="/(protected)/(tabs)" />

      {/* Personal: Add button is 2nd position */}
      {!selectedOrgId && <AddButton onPress={onAddPress} />}

      {/* Always: Stats */}
      <NavItem
        icon="bar-chart-sharp"
        isActive={isStats}
        onPress={() => router.push("/(protected)/(tabs)/stats" as any)}
      />

      {/* Organization: Add button is 3rd position (middle) */}
      {selectedOrgId && <AddButton onPress={onAddPress} />}

      {selectedOrgId && (
        <NavItem
          icon="calendar"
          isActive={isSession}
          onPress={() => router.push("/(protected)/(tabs)/calendar" as any)}
        />
      )}

      {/* Organization only: Members */}
      {selectedOrgId && (
        <NavItem
          icon="people"
          isActive={isMembers}
          onPress={() => router.push("/(protected)/(tabs)/members")}
        />
      )}
    </>
  );

  return (
    <View
      style={[
        styles.wrapper,
        {
          borderColor: colors.border,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={90}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.container,
            {
              borderColor: colors.border,
              justifyContent: selectedOrgId ? "space-between" : "space-around",
            },
          ]}
        >
          {navContent}
        </BlurView>
      ) : (
        <View
          style={[
            styles.container,
            styles.androidGlass,
            {
              borderColor: colors.border,
              backgroundColor:
                colorScheme === "dark"
                  ? "rgba(17, 19, 23, 0.85)"
                  : "rgba(255, 255, 255, 0.85)",
              justifyContent: selectedOrgId ? "space-between" : "space-around",
            },
          ]}
        >
          {navContent}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  androidGlass: {
    // Fallback for Android (no BlurView)
    backdropFilter: "blur(10px)",
  },
});
