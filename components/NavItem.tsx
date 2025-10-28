import { useColors } from "@/hooks/useColors";
import { Ionicons } from "@expo/vector-icons";
import { Link, RelativePathString } from "expo-router";
import { StyleSheet, TouchableOpacity } from "react-native";

interface NavItemProps {
  icon: string;
  isActive: boolean;
  href?: string;
  onPress?: () => void;
}

export function NavItem({ icon, isActive, href, onPress }: NavItemProps) {
  const colors = useColors();

  const content = (
    <Ionicons
      name={icon as any}
      size={22}
      color={isActive ? colors.tint : colors.icon}
      style={{ opacity: isActive ? 1 : 0.6 }}
    />
  );

  if (href) {
    return (
      <Link href={href as RelativePathString} asChild>
        <TouchableOpacity style={styles.navItem} activeOpacity={0.6}>
          {content}
        </TouchableOpacity>
      </Link>
    );
  }

  return (
    <TouchableOpacity
      style={styles.navItem}
      onPress={onPress}
      activeOpacity={0.6}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navItem: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
  },
});
