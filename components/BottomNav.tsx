import { useColors } from "@/hooks/useColors";
import { useOrganization } from "@clerk/clerk-expo";
import { BlurView } from "expo-blur";
import { router, usePathname } from "expo-router";
import { Platform, StyleSheet, useColorScheme, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { AddButton } from "./BottomNav/components/AddButton";
import { NavItem } from "./BottomNav/components/NavItem";

type BottomNavProps = {
  onAddPress: () => void;
};

export default function BottomNav({ onAddPress }: BottomNavProps) {
  const pathname = usePathname();
  const { organization } = useOrganization();
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const colors = useColors();
  const isHome = pathname === "/(home)";
  const isMembers = pathname?.startsWith("/(home)/members");
  const isSession = pathname?.startsWith("/(home)/session");
  const isStats = pathname?.startsWith("/(home)/stats");

  const inOrganization = !!organization;

  const navContent = (
    <>
      {/* Always: Home */}
      <NavItem icon="home" isActive={isHome} href="/(home)" />

      {/* Personal: Add button is 2nd position */}
      {!inOrganization && <AddButton onPress={onAddPress} />}

      {/* Always: Stats */}
      <NavItem
        icon="bar-chart-sharp"
        isActive={isStats}
        onPress={() => router.push("/(home)/stats" as any)}
      />

      {/* Organization: Add button is 3rd position (middle) */}
      {inOrganization && <AddButton onPress={onAddPress} />}

      {inOrganization && (
        <NavItem
          icon="calendar"
          isActive={isSession}
          onPress={() => router.push("/(home)/calendar" as any)}
        />
      )}

      {/* Organization only: Members */}
      {inOrganization && (
        <NavItem
          icon="people"
          isActive={isMembers}
          onPress={() => router.push("/(home)/members")}
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
          intensity={80}
          tint={colorScheme === "dark" ? "dark" : "light"}
          style={[
            styles.container,
            {
              borderColor: colors.border,
              justifyContent: inOrganization ? "space-between" : "space-around",
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
              justifyContent: inOrganization ? "space-between" : "space-around",
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
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 12,
    },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 16,
  },
  androidGlass: {
    // Fallback for Android (no BlurView)
    backdropFilter: "blur(10px)",
  },
});
