import { useThemeColor } from "@/hooks/useThemeColor";
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
  const primary = useThemeColor({}, "tint");
  const muted = useThemeColor({}, "icon");

  const content = (
    <Ionicons name={icon as any} size={24} color={isActive ? primary : muted} />
  );

  if (href) {
    return (
      <Link href={href as RelativePathString} asChild>
        <TouchableOpacity style={styles.navItem}>{content}</TouchableOpacity>
      </Link>
    );
  }

  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress}>
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  navItem: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
  },
});
