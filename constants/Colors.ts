const tintColor = "#6366f1"; // Vibrant indigo accent

export const Colors = {
  light: {
    text: "#0E1116",                  // Deep graphite — crisp and legible on off-white
    background: "#F6F7FB",            // Slightly blue-tinted white, less sterile
    tint: "#2563EB",                  // Refined cobalt blue for primary actions
    icon: "#475569",                  // Muted slate for icons
    tabIconDefault: "#94A3B8",        // Desaturated gray-blue
    tabIconSelected: "#2563EB",       // Matches tint
    border: "#D4D8E2",                // Soft neutral border with enough contrast
    cardBackground: "#FFFFFF",        // Clean white for cards
    card: "#FFFFFF",
    buttonText: "#0E1116",
    buttonBorder: "#CBD2E0",
    placeholderText: "#94A3B8",
    description: "#5B6473",           // Subtle contrast from main text
    overlay: "rgba(15, 17, 26, 0.04)",
    textMuted: "#6B7280",             // Gentle muted gray-blue for secondary text
  
    // Refined accent palette — vivid but balanced
    blue: "#2563EB",                  // Vibrant yet professional blue
    green: "#0E9F6E",                 // Deep emerald (not neon)
    red: "#DC2626",                   // Rich crimson for alerts
    orange: "#EA580C",                // Muted, warm orange
    yellow: "#CA8A04",                // Golden amber for highlights
    pink: "#DB2777",                  // Elegant rose-magenta
    purple: "#7C3AED",                // Royal violet with strong contrast
    teal: "#0D9488",                  // Cool deep teal
    indigo: "#4338CA",                // Mature indigo accent
  },
  
  dark: {
    text: "#f1f5f9",
    background: "#000000",
    tint: tintColor,
    icon: "#94a3b8",
    tabIconDefault: "#64748b",
    tabIconSelected: tintColor,
    border: "#1a1a1a",
    cardBackground: "#0f0f0f",
    card: "#0f0f0f",
    buttonText: "#f1f5f9",
    buttonBorder: "#262626",
    placeholderText: "#64748b",
    description: "#94a3b8",
    overlay: "rgba(255,255,255,0.05)",
    textMuted: "#94a3b8",

    // Vibrant theme colors
    blue: "#60a5fa",
    green: "#34d399",
    red: "#f87171",
    orange: "#fb923c",
    yellow: "#facc15",
    pink: "#f472b6",
    purple: "#c084fc",
    teal: "#2dd4bf",
    indigo: "#818cf8",
  },
};
