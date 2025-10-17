import { ThemedView } from "@/components/ThemedView";
import { useThemeColor } from "@/hooks/useThemeColor";
import { useOrganization } from "@clerk/clerk-expo";
import { router, usePathname } from "expo-router";
import { StyleSheet } from "react-native";
import { AddButton } from "./BottomNav/components/AddButton";
import { NavItem } from "./BottomNav/components/NavItem";

type BottomNavProps = {
  onAddPress: () => void;
};

export default function BottomNav({ onAddPress }: BottomNavProps) {
  const pathname = usePathname();
  const { organization } = useOrganization();

  const card = useThemeColor({}, "cardBackground");
  const border = useThemeColor({}, "border");

  const isHome = pathname === "/(home)";
  const isMembers = pathname?.startsWith("/(home)/members");
  const isSession = pathname?.startsWith("/(home)/session");
  const isStats = pathname?.startsWith("/(home)/stats");
  const isSettings = pathname?.startsWith("/(home)/settings");

  // Show Members nav only when in an organization
  const inOrganization = !!organization;

  return (
    <ThemedView
      style={[
        styles.container,
        {
          backgroundColor: card,
          borderTopColor: border,
          justifyContent: inOrganization ? "space-between" : "space-around",
        },
      ]}
    >
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

      {/* Organization only: Members */}
      {inOrganization ? (
        <NavItem
          icon="people"
          isActive={isMembers}
          onPress={() => router.push("/(home)/members")}
        />
      ) : (
        <></>
      )}
      {inOrganization && (
        <NavItem
          icon="calendar"
          isActive={isSession}
          onPress={() => router.push("/(home)/calendar" as any)}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 34,
    borderTopWidth: 1,
  },
});
