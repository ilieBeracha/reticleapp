import { useColorScheme as useRNColorScheme } from "react-native";

export function useColorScheme() {
  const colorScheme = useRNColorScheme();
  // Return device color scheme, defaulting to 'dark' if null
  return colorScheme ?? "dark";
}
