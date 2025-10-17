import { SignOutButton } from "@/components/SignOutButton";
import { useThemeColor } from "@/hooks/useThemeColor";
import { StyleSheet, View } from "react-native";
import { MenuItem } from "./MenuItem";

interface ProfileMenuItem {
  icon: string;
  label: string;
  action: string;
  danger?: boolean;
}

interface MenuListProps {
  items: ProfileMenuItem[];
  onMenuAction: (action: string) => void;
}

export function MenuList({ items, onMenuAction }: MenuListProps) {
  const border = useThemeColor({}, "border");

  return (
    <>
      <View style={[styles.divider, { backgroundColor: border }]} />
      {items.map((item, idx) => (
        <MenuItem
          key={idx}
          icon={item.icon}
          label={item.label}
          danger={item.danger}
          onPress={() => onMenuAction(item.action)}
        />
      ))}
      <SignOutButton />
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
});
