/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/guides/color-schemes/
 */

import { useColorScheme } from "@/hooks/useColorScheme";
import { Colors } from "@/theme/colors";

export function useColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? "light";
  const colorFromProps = props[theme];

  if (colorFromProps) {
    // If a specific color value is provided as prop, use it
    return colorFromProps;
  } else {
    // Otherwise, return the color from the theme palette
    return Colors[theme][colorName];
  }
}
