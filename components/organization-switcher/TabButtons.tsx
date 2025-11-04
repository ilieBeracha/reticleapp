import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, Text, useColorScheme, View } from "react-native";

type TabType = "hierarchy" | "all";

interface Tab {
  id: TabType;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}

interface TabButtonsProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const tabs: Tab[] = [
  { id: "hierarchy", label: "Hierarchy", icon: "git-network-outline" },
  { id: "all", label: "All", icon: "list" },
];

export function TabButtons({ activeTab, onTabChange }: TabButtonsProps) {
  const colors = useColors();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";

  const containerBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.05)";

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <Pressable
            key={tab.id}
            style={[
              styles.tab,
              {
                backgroundColor: isActive ? colors.indigo : "transparent",
              },
            ]}
            onPress={() => onTabChange(tab.id)}
          >
            <View style={styles.tabContent}>
              <Ionicons
                name={tab.icon}
                size={18}
                color={isActive ? "#FFFFFF" : colors.textMuted}
              />
              <Text
                style={[
                  styles.tabText,
                  {
                    color: isActive ? "#FFFFFF" : colors.text,
                    fontWeight: isActive ? "700" : "600",
                  },
                ]}
              >
                {tab.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    padding: 4,
    borderRadius: 12,
    marginBottom: 16,
    gap: 4,
  },
  tab: {
    flex: 1,
    width: "50%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  tabText: {
    fontSize: 13,
    letterSpacing: 0.2,
  },
});

