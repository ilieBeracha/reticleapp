import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";

/**
 * useThemeColor hook
 * 
 * Returns a color based on the current theme (light/dark).
 * Supports optional overrides for specific light/dark values.
 * 
 * Uses ThemeContext which respects user preference (light/dark/system)
 * 
 * @param props - Optional overrides { light?: string, dark?: string }
 * @param colorName - Key from the Colors constant (e.g., 'background', 'text')
 * @returns The resolved color string
 * 
 * @example
 * ```tsx
 * const backgroundColor = useThemeColor({ light: '#fff', dark: '#000' }, 'background');
 * ```
 */
export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
): string {
  const { theme } = useTheme();
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  }
  
  return Colors[theme][colorName];
}
