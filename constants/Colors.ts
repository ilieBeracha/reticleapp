const tintColor = "#3ECF8E"; // Premium mint-green accent

export const Colors = {
  light: {
    text: "#111418", // Deep gray-black for modern contrast
    background: "#F5F6F7", // Subtle gray-white, softer on eyes
    tint: tintColor,
    icon: "#6B7280", // Medium neutral gray
    tabIconDefault: "#9CA3AF",
    tabIconSelected: tintColor + "33", // translucent accent
    border: "#E2E4E7", // gentle, minimal border tone
    cardBackground: "#FFFFFF", // elevated card white
    buttonText: "#111418",
    buttonBorder: "#DADDE0",
    placeholderText: "#9CA3AF",
    description: "#70737A", // muted descriptive text
    overlay: "rgba(0,0,0,0.04)", // subtle hover/press feedback
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
