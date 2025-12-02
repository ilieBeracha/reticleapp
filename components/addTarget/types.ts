import { Dimensions } from "react-native";
import type { Detection } from "@/types/api";

// ═══════════════════════════════════════════════════════════════════════════
// TARGET TYPES
// ═══════════════════════════════════════════════════════════════════════════
export type TargetType = "paper" | "tactical";
export type Step = "form" | "camera" | "preview" | "analyzing" | "results" | "tactical_results";
export type EditMode = "add" | "remove";

// ═══════════════════════════════════════════════════════════════════════════
// DETECTION TYPES
// ═══════════════════════════════════════════════════════════════════════════
export interface EditableDetection extends Detection {
  id: string;
  isManual: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════
const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const CANVAS_SIZE = SCREEN_WIDTH - 40;
export const MARKER_RADIUS = 12;

// Preset values
export const DISTANCE_PRESETS = [25, 50, 100, 200, 300, 500];
export const DISTANCE_QUICK_PICKS = [5, 7, 10, 15, 25, 50, 100, 200, 300];
export const BULLET_PRESETS = [1, 3, 5, 10];

// ═══════════════════════════════════════════════════════════════════════════
// COLORS
// ═══════════════════════════════════════════════════════════════════════════
export const COLORS = {
  primary: "#10B981",
  primaryLight: "#34D399",
  primaryLighter: "#6EE7B7",
  warning: "#F59E0B",
  danger: "#EF4444",
  info: "#3B82F6",
  white: "#fff",
  text: "rgba(255,255,255,0.7)",
  textMuted: "rgba(255,255,255,0.5)",
  textDim: "rgba(255,255,255,0.4)",
  textDimmer: "rgba(255,255,255,0.3)",
  background: "#0f0f0f",
  card: "rgba(255,255,255,0.05)",
  cardHover: "rgba(255,255,255,0.08)",
  border: "rgba(255,255,255,0.08)",
  borderLight: "rgba(255,255,255,0.1)",
} as const;

