const lightColors = {
  // Base colors - Clean and modern
  background: "#F8F9FA",
  foreground: "#2A2A2A",

  // Card colors - Clean white
  card: "#FFFFFF",
  cardForeground: "#2A2A2A",

  // Popover colors
  popover: "#FFFFFF",
  popoverForeground: "#2A2A2A",

  // Primary colors - Logo dark gray
  primary: "#4A4A4A",
  primaryForeground: "#FFFFFF",

  // Secondary colors - Light neutral
  secondary: "#F0F0F0",
  secondaryForeground: "#4A4A4A",

  // Muted colors - Soft neutrals
  muted: "#B0B0B0",
  mutedForeground: "#6A6A6A",

  // Accent colors - Professional indigo
  accent: "#5B6B8C",
  accentForeground: "#FFFFFF",

  // Destructive colors - Clean red
  destructive: "#DC3545",
  destructiveForeground: "#FFFFFF",

  // Border and input
  border: "#E0E0E0",
  input: "#F5F5F5",
  ring: "#5B6B8C",

  // Text colors
  text: "#2A2A2A",
  textMuted: "#6A6A6A",

  // Legacy support for existing components
  tint: "#4A4A4A",
  icon: "#6A6A6A",
  tabIconDefault: "#6A6A6A",
  tabIconSelected: "#4A4A4A",

  // Brand accent colors
  blue: "#5A7A8C", // Steel blue
  green: "#5A8473", // Tactical green
  red: "#DC3545", // Alert red
  orange: "#E76925", // Brand orange
  yellow: "#F39C12", // Warm yellow
  pink: "#C85A8E", // Soft pink
  purple: "#8B7FA1", // Soft purple
  teal: "#5A9B9B", // Teal
  indigo: "#5B6B8C", // Indigo
};

const darkColors = {
  // Base colors - True dark with logo colors
  background: "#1A1A1A",
  foreground: "#E8E8E8",

  // Card colors - Elevated dark surface
  card: "#2A2A2A",
  cardForeground: "#E8E8E8",

  // Popover colors
  popover: "#2A2A2A",
  popoverForeground: "#E8E8E8",

  // Primary colors - Lighter logo gray for dark mode
  primary: "#8A8A8A",
  primaryForeground: "#1A1A1A",

  // Secondary colors - Dark neutral
  secondary: "#3A3A3A",
  secondaryForeground: "#D0D0D0",

  // Muted colors - Mid grays
  muted: "#505050",
  mutedForeground: "#A0A0A0",

  // Accent colors - Professional indigo (lighter for dark mode)
  accent: "#7A8BAD",
  accentForeground: "#FFFFFF",

  // Destructive colors - Soft red
  destructive: "#E85D5D",
  destructiveForeground: "#FFFFFF",

  // Border and input
  border: "#3A3A3A",
  input: "rgba(122, 139, 173, 0.15)",
  ring: "#7A8BAD",

  // Text colors
  text: "#E8E8E8",
  textMuted: "#A0A0A0",

  // Legacy support for existing components
  tint: "#8A8A8A",
  icon: "#A0A0A0",
  tabIconDefault: "#A0A0A0",
  tabIconSelected: "#D0D0D0",

  // Brand accent colors (dark mode adjusted)
  blue: "#7A9DBD", // Steel blue
  green: "#6B9D8A", // Tactical green
  red: "#E85D5D", // Alert red
  orange: "#FF7A3D", // Brand orange (lighter)
  yellow: "#FFB340", // Warm yellow
  pink: "#D88AAE", // Soft pink
  purple: "#A397C4", // Soft purple
  teal: "#6AADAD", // Teal
  indigo: "#7A8BAD", // Indigo
};

export const Colors = {
  light: lightColors,
  dark: darkColors,
};

// Primary action button gradient - sleek dark with subtle depth
export const BUTTON_GRADIENT = [
  'rgba(55,55,55,0.98)',
  'rgba(38,38,38,0.98)',
  'rgba(23,23,23,0.98)',
] as const;

// Disabled/loading button gradient
export const BUTTON_GRADIENT_DISABLED = ['#4B5563', '#374151'] as const;

// Export individual color schemes for easier access
export { darkColors, lightColors };

// Utility type for color keys
export type ColorKeys = keyof typeof lightColors;
