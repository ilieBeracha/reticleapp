import { useColors } from "@/hooks/useColors";
import { View } from "react-native";
import { Weapons } from "../weapons/Weapons";
export function Loadout() {
  const colors = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Weapons />
    </View>
  );
}
