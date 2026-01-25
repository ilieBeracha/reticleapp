import { useTheme } from "@/contexts/ThemeContext";

/**
 * useColorScheme hook
 * 
 * Returns the current color scheme based on user preference.
 * Respects user's choice of light/dark/system from ThemeContext.
 * 
 * @returns 'light' | 'dark'
 */
export function useColorScheme() {
  const { theme } = useTheme();
  return theme;
}
