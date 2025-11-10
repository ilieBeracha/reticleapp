import { useThemeColor } from "@/hooks/ui/useThemeColor";

export function useColors() {
  const text = useThemeColor({}, "text");
  const background = useThemeColor({}, "background");
  const foreground = useThemeColor({}, "foreground");
  const tint = useThemeColor({}, "tint");
  const icon = useThemeColor({}, "icon");
  const tabIconDefault = useThemeColor({}, "tabIconDefault");
  const tabIconSelected = useThemeColor({}, "tabIconSelected");
  const border = useThemeColor({}, "border");
  const input = useThemeColor({}, "input");
  const ring = useThemeColor({}, "ring");
  const cardBackground = useThemeColor({}, "cardBackground");
  const card = useThemeColor({}, "card");
  const cardForeground = useThemeColor({}, "cardForeground");
  const popover = useThemeColor({}, "popover");
  const popoverForeground = useThemeColor({}, "popoverForeground");
  const primary = useThemeColor({}, "primary");
  const primaryForeground = useThemeColor({}, "primaryForeground");
  const secondary = useThemeColor({}, "secondary");
  const secondaryForeground = useThemeColor({}, "secondaryForeground");
  const muted = useThemeColor({}, "muted");
  const mutedForeground = useThemeColor({}, "mutedForeground");
  const accent = useThemeColor({}, "accent");
  const accentForeground = useThemeColor({}, "accentForeground");
  const destructive = useThemeColor({}, "destructive");
  const destructiveForeground = useThemeColor({}, "destructiveForeground");
  const buttonText = useThemeColor({}, "buttonText");
  const buttonBorder = useThemeColor({}, "buttonBorder");
  const placeholderText = useThemeColor({}, "placeholderText");
  const description = useThemeColor({}, "description");
  const textMuted = useThemeColor({}, "textMuted");
  const blue = useThemeColor({}, "blue");
  const green = useThemeColor({}, "green");
  const red = useThemeColor({}, "red");
  const orange = useThemeColor({}, "orange");
  const yellow = useThemeColor({}, "yellow");
  const purple = useThemeColor({}, "purple");
  const pink = useThemeColor({}, "pink");
  const teal = useThemeColor({}, "teal");
  const indigo = useThemeColor({}, "indigo");
  const buttonPrimary = useThemeColor({}, "buttonPrimary");
  
  return {
    text,
    background,
    foreground,
    tint,
    icon,
    tabIconDefault,
    tabIconSelected,
    border,
    input,
    ring,
    cardBackground,
    card,
    cardForeground,
    popover,
    popoverForeground,
    primary,
    primaryForeground,
    secondary,
    secondaryForeground,
    muted,
    mutedForeground,
    accent,
    accentForeground,
    destructive,
    destructiveForeground,
    buttonText,
    buttonBorder,
    placeholderText,
    description,
    textMuted,
    blue,
    green,
    red,
    orange,
    yellow,
    purple,
    pink,
    teal,
    indigo,
    buttonPrimary,
  };
}
