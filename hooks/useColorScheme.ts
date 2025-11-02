import { useTheme } from "@/contexts/ThemeContext";

export function useColorScheme() {
  try {
    const { theme } = useTheme();
    return theme;
  } catch {
    // Fallback if ThemeProvider is not available
    return "dark";
  }
}
