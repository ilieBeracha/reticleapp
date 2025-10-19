import { useThemeColor } from "./useThemeColor";

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
  };
}
