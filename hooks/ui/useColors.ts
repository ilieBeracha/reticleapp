import { useThemeColor } from "@/hooks/ui/useThemeColor";

export function useColors() {
  const text = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  const tint = useThemeColor({}, "tint");
  const icon = useThemeColor({}, "icon");
  const tabIconDefault = useThemeColor({}, "tabIconDefault");
  const tabIconSelected = useThemeColor({}, "tabIconSelected");
  const border = useThemeColor({}, "border");
  const cardBackground = useThemeColor({}, "cardBackground");
  const buttonText = useThemeColor({}, "buttonText");
  const buttonBorder = useThemeColor({}, "buttonBorder");
  const placeholderText = useThemeColor({}, "placeholderText");
  const description = useThemeColor({}, "description");
  const textMuted = useThemeColor({}, "textMuted");
  const card = useThemeColor({}, "card");
  const blue = useThemeColor({}, "blue");
  const green = useThemeColor({}, "green");
  const red = useThemeColor({}, "red");
  const orange = useThemeColor({}, "orange");
  const yellow = useThemeColor({}, "yellow");
  const purple = useThemeColor({}, "purple");
  const pink = useThemeColor({}, "pink");
  const teal = useThemeColor({}, "teal");
  const indigo = useThemeColor({}, "indigo");

  return {
    text,
    background,
    tint,
    icon,
    tabIconDefault,
    tabIconSelected,
    border,
    cardBackground,
    buttonText,
    buttonBorder,
    placeholderText,
    description,
    textMuted,
    card,
    blue,
    green,
    red,
    orange,
    yellow,
    purple,
    pink,
    teal,
    indigo,
  };
}
