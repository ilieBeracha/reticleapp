/**
 * Miss Analyzer utility functions
 *
 * Handles conversion between:
 * - Normalized MissPoint coordinates (resolution-independent)
 * - Canvas pixel coordinates (for rendering)
 * - Tap coordinates (from user interaction)
 */

import type { MissPoint } from '@/types/session';

/**
 * Convert a tap position (in canvas pixels) to a normalized MissPoint.
 *
 * @param tapX - X position of tap in pixels (0 = left edge)
 * @param tapY - Y position of tap in pixels (0 = top edge)
 * @param canvasSize - Size of the square canvas in pixels
 * @returns Normalized MissPoint with x, y, distance, and angle_deg
 */
export function tapToMissPoint(
  tapX: number,
  tapY: number,
  canvasSize: number
): MissPoint {
  const half = canvasSize / 2;

  // Convert to centered coordinates (-half to +half)
  const centeredX = tapX - half;
  const centeredY = half - tapY; // Flip Y: canvas Y increases downward, but our Y increases upward

  // Normalize to -1 to +1 range
  const x = centeredX / half;
  const y = centeredY / half;

  // Calculate distance from center (0 to 1, clamped)
  const distance = Math.min(1, Math.sqrt(x * x + y * y));

  // Calculate angle in degrees (compass convention: 0 = up, clockwise)
  // atan2 gives angle from positive X axis, counter-clockwise
  // We want angle from positive Y axis (up), clockwise
  let angle_deg = Math.atan2(x, y) * (180 / Math.PI);
  if (angle_deg < 0) {
    angle_deg += 360;
  }

  return {
    x: Math.round(x * 1000) / 1000, // 3 decimal precision
    y: Math.round(y * 1000) / 1000,
    distance: Math.round(distance * 1000) / 1000,
    angle_deg: Math.round(angle_deg * 10) / 10, // 1 decimal precision
  };
}

/**
 * Convert a normalized MissPoint back to canvas pixel coordinates.
 *
 * @param point - Normalized MissPoint
 * @param canvasSize - Size of the square canvas in pixels
 * @returns Object with px (pixel X) and py (pixel Y)
 */
export function missPointToCanvas(
  point: MissPoint,
  canvasSize: number
): { px: number; py: number } {
  const half = canvasSize / 2;

  // Convert from -1..+1 to pixel coordinates
  const px = half + point.x * half;
  const py = half - point.y * half; // Flip Y back

  return { px, py };
}

/**
 * Calculate the average miss direction from an array of MissPoints.
 * Useful for showing "your shots tend to go X direction".
 *
 * @param points - Array of MissPoints
 * @returns Object with average x, y, distance, and angle_deg, or null if no points
 */
export function calculateAverageMissDirection(
  points: MissPoint[]
): MissPoint | null {
  if (points.length === 0) return null;

  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);

  const avgX = sumX / points.length;
  const avgY = sumY / points.length;

  const distance = Math.sqrt(avgX * avgX + avgY * avgY);

  let angle_deg = Math.atan2(avgX, avgY) * (180 / Math.PI);
  if (angle_deg < 0) {
    angle_deg += 360;
  }

  return {
    x: Math.round(avgX * 1000) / 1000,
    y: Math.round(avgY * 1000) / 1000,
    distance: Math.round(distance * 1000) / 1000,
    angle_deg: Math.round(angle_deg * 10) / 10,
  };
}

/**
 * Get a human-readable direction description from an angle.
 *
 * @param angle_deg - Angle in degrees (compass convention)
 * @returns Direction string like "up", "upper-right", "right", etc.
 */
export function getDirectionFromAngle(angle_deg: number): string {
  // Normalize angle to 0-360
  const normalized = ((angle_deg % 360) + 360) % 360;

  if (normalized >= 337.5 || normalized < 22.5) return 'up';
  if (normalized >= 22.5 && normalized < 67.5) return 'upper-right';
  if (normalized >= 67.5 && normalized < 112.5) return 'right';
  if (normalized >= 112.5 && normalized < 157.5) return 'lower-right';
  if (normalized >= 157.5 && normalized < 202.5) return 'down';
  if (normalized >= 202.5 && normalized < 247.5) return 'lower-left';
  if (normalized >= 247.5 && normalized < 292.5) return 'left';
  return 'upper-left';
}

/**
 * Calculate dispersion (spread) of miss points.
 * Returns the max distance between any two points.
 *
 * @param points - Array of MissPoints
 * @returns Normalized dispersion value (0-2 range), or 0 if < 2 points
 */
export function calculateMissDispersion(points: MissPoint[]): number {
  if (points.length < 2) return 0;

  let maxDistance = 0;

  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const dx = points[i].x - points[j].x;
      const dy = points[i].y - points[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      maxDistance = Math.max(maxDistance, dist);
    }
  }

  return Math.round(maxDistance * 1000) / 1000;
}
