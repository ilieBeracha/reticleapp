import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";

type ThemeMode = "light" | "dark";

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_STORAGE_KEY = "@app_theme";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Initialize with current device color scheme
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const initialScheme = Appearance.getColorScheme();
    return initialScheme === "dark" ? "dark" : "light";
  });

  // Listen to device theme changes
  useEffect(() => {
    // Clear any old cached theme preference (migrate to automatic mode)
    AsyncStorage.removeItem(THEME_STORAGE_KEY).catch(() => {});

    // Set initial theme
    const currentScheme = Appearance.getColorScheme();
    if (currentScheme) {
      setThemeState(currentScheme === "dark" ? "dark" : "light");
    }

    // Listen for changes
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      setThemeState(colorScheme === "dark" ? "dark" : "light");
    });

    return () => subscription.remove();
  }, []);

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark: theme === "dark",
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
