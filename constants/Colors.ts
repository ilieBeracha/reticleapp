const tintColor = "#3ECF8E"; // Premium mint-green accent

export const Colors = {
  light: {
    text: "#1C1C1E", // Apple's system dark gray
    background: "#F5F5F7", // Apple's subtle off-white
    tint: tintColor,
    icon: "#8E8E93", // Apple's icon gray
    tabIconDefault: "#8E8E93",
    tabIconSelected: tintColor + "20", // Subtle accent
    border: "#D1D1D6", // Apple's border gray
    cardBackground: "#FFFFFF", // Pure white
    buttonText: "#1C1C1E",
    buttonBorder: "#C7C7CC",
    placeholderText: "#8E8E93",
    description: "#636366", // Muted gray
    overlay: "rgba(0,0,0,0.04)", // Apple's subtle feedback
  },
  dark: {
    text: "#E6E8EB", // calm white-gray (not pure white)
    background: "#0E1012", // rich near-black with depth
    tint: tintColor,
    icon: "#9CA3AF",
    tabIconDefault: "#6B7280",
    tabIconSelected: tintColor + "33",
    border: "#1E242A", // faint border tone
    cardBackground: "#14171A", // lifted dark surface
    buttonText: "#E6E8EB",
    buttonBorder: "#2A2F34",
    placeholderText: "#9CA3AF",
    description: "#9CA3AF",
    overlay: "rgba(255,255,255,0.05)", // for active states
  },
};
