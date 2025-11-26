import { Colors } from "@/constants/Colors";
import { useMemo } from "react";
import { useColorScheme } from "react-native";

/**
 * Optimized useColors hook
 * Returns all theme colors in a single memoized object
 * Only re-computes when color scheme changes
 */
export function useColors() {
  const scheme = useColorScheme() ?? "light";
  
  // Memoize the entire colors object based on the scheme
  return useMemo(() => Colors[scheme], [scheme]);
}
