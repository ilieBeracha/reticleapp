import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useMemo } from "react";

/**
 * Optimized useColors hook
 * Returns all theme colors in a single memoized object
 * Only re-computes when theme changes
 * 
 * Uses ThemeContext which respects user preference (light/dark/system)
 */
export function useColors() {
  const { theme } = useTheme();
  
  // Memoize the entire colors object based on the theme
  return useMemo(() => Colors[theme], [theme]);
}
