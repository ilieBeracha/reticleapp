/**
 * Miss Analyzer — Mil-based (Thousandths) Encoding
 *
 * Converts tap positions to ballistic-precision miss points using:
 * - Ring: Discrete area bucket (NOT distance)
 * - Mil: Angle in thousandths (0 = 12 o'clock, clockwise)
 *
 * Core principle: Same ring + same angle = identical MissPoint
 * No floating-point drift, no distance storage.
 */

import type { MissPoint } from '@/types/session';

// =============================================================================
// CONSTANTS
// =============================================================================

/** Full circle in mils (thousandths) */
export const MIL_PER_CIRCLE = 6400;

/** Mil step per ring (each ring = 0.5 mil ballistic offset) */
export const RING_MIL_STEP = 0.5;

/** Default number of rings on the canvas */
export const DEFAULT_RING_COUNT = 4;

/** Number of hour positions on the clock face */
export const HOUR_COUNT = 12;

/** Mils per hour position */
export const MILS_PER_HOUR = MIL_PER_CIRCLE / HOUR_COUNT; // ~533.33

/** Inner radius ratio (center hit zone) */
export const INNER_RADIUS_RATIO = 0.32; // Big center hit zone

/** Label offset ratio (space for hour labels) */
export const LABEL_OFFSET_RATIO = 0.0625; // ~20px on 320px canvas

// =============================================================================
// FORWARD MAPPING: Tap → MissPoint
// =============================================================================

/**
 * Convert a tap position (canvas pixels) to a MissPoint (ring + mil).
 *
 * @param tapX - X position of tap in pixels (0 = left edge)
 * @param tapY - Y position of tap in pixels (0 = top edge)
 * @param canvasSize - Size of the square canvas in pixels
 * @param ringCount - Number of concentric rings (default: 4)
 * @returns MissPoint with ring index and mil angle
 */
export function tapToMissPoint(
  tapX: number,
  tapY: number,
  canvasSize: number,
  ringCount: number = DEFAULT_RING_COUNT
): MissPoint {
  const half = canvasSize / 2;

  // Calculate inner and outer radii
  const innerRadius = half * INNER_RADIUS_RATIO;
  const outerRadius = half * (1 - LABEL_OFFSET_RATIO - 0.02);
  const ringWidth = (outerRadius - innerRadius) / ringCount;

  // Convert to centered coordinates
  // Canvas: Y increases downward
  // Our convention: Y increases upward (12 o'clock = positive Y)
  const centeredX = tapX - half;
  const centeredY = half - tapY; // Flip Y

  // Calculate distance from center in pixels
  const distanceFromCenter = Math.sqrt(centeredX * centeredX + centeredY * centeredY);

  // ==========================================================================
  // RING CALCULATION (discrete area bucket)
  // ==========================================================================
  // Rings span from innerRadius to outerRadius
  // Ring 0 = closest to center (just outside hit zone)
  // Ring (ringCount-1) = outermost zone
  let ring: number;
  if (distanceFromCenter <= innerRadius) {
    ring = 0; // Taps in center hit zone go to ring 0
  } else {
    const ringDistance = distanceFromCenter - innerRadius;
    ring = Math.floor(ringDistance / ringWidth);
    if (ring >= ringCount) ring = ringCount - 1; // Clamp to outer ring
  }

  // ==========================================================================
  // ANGLE CALCULATION (snapped to nearest hour position)
  // ==========================================================================
  // atan2(x, y) with swapped args gives angle from +Y axis (12 o'clock)
  // Range: -π to +π, counter-clockwise from +Y
  // We want: snapped to one of 12 hour positions (0, 533, 1067, etc.)
  let angleRad = Math.atan2(centeredX, centeredY);

  // Convert radians to mils (clockwise from 12 o'clock)
  let rawMil = angleRad * (MIL_PER_CIRCLE / (2 * Math.PI));

  // Normalize to 0-6399 range
  if (rawMil < 0) rawMil += MIL_PER_CIRCLE;

  // Snap to nearest hour position (12 discrete positions)
  // Each hour = MIL_PER_CIRCLE / 12 = ~533.33 mils
  const hourIndex = Math.round(rawMil / MILS_PER_HOUR) % HOUR_COUNT;
  const mil = Math.round(hourIndex * MILS_PER_HOUR) % MIL_PER_CIRCLE;

  return { ring, mil };
}

// =============================================================================
// REVERSE MAPPING: MissPoint → Canvas Position
// =============================================================================

/**
 * Convert a MissPoint back to canvas pixel coordinates for rendering.
 *
 * Places the dot at the CENTER of the ring band and angle.
 * Visual rendering only — stored data remains discrete.
 *
 * @param point - MissPoint with ring and mil
 * @param canvasSize - Size of the square canvas in pixels
 * @param ringCount - Number of concentric rings (default: 4)
 * @returns Object with px (pixel X) and py (pixel Y)
 */
export function missPointToCanvas(
  point: MissPoint,
  canvasSize: number,
  ringCount: number = DEFAULT_RING_COUNT
): { px: number; py: number } {
  const half = canvasSize / 2;

  // Calculate inner and outer radii (must match tapToMissPoint)
  const innerRadius = half * INNER_RADIUS_RATIO;
  const outerRadius = half * (1 - LABEL_OFFSET_RATIO - 0.02);
  const ringWidth = (outerRadius - innerRadius) / ringCount;

  // Calculate the center radius of this ring band (in pixels)
  // Ring 0 center is at innerRadius + ringWidth/2
  // Ring n center is at innerRadius + ringWidth * (n + 0.5)
  const ringCenterDistance = innerRadius + ringWidth * (point.ring + 0.5);

  // Convert mil to radians
  // 0 mil = 12 o'clock = +Y direction
  const angleRad = point.mil * (2 * Math.PI) / MIL_PER_CIRCLE;

  // Convert polar to cartesian (centered coordinates)
  // sin(angle) gives X component, cos(angle) gives Y component
  // (because angle is measured from +Y axis)
  const centeredX = ringCenterDistance * Math.sin(angleRad);
  const centeredY = ringCenterDistance * Math.cos(angleRad);

  // Convert to canvas pixels (flip Y back)
  const px = half + centeredX;
  const py = half - centeredY;

  return { px, py };
}

// =============================================================================
// ANALYSIS UTILITIES
// =============================================================================

/**
 * Convert mil angle to clock direction (1-12).
 *
 * @param mil - Angle in mils (0-6399)
 * @returns Clock hour (1-12)
 */
export function milToClockHour(mil: number): number {
  // 0 mil = 12 o'clock
  // Each hour = 6400/12 ≈ 533.33 mils
  const milsPerHour = MIL_PER_CIRCLE / 12;
  let hour = Math.round(mil / milsPerHour);
  if (hour === 0) hour = 12;
  if (hour > 12) hour = hour - 12;
  return hour;
}

/**
 * Get clock direction string from mil angle.
 *
 * @param mil - Angle in mils (0-6399)
 * @returns String like "12 o'clock", "3 o'clock", etc.
 */
export function milToClockString(mil: number): string {
  return `${milToClockHour(mil)} o'clock`;
}

/**
 * Get human-readable direction from mil angle.
 *
 * @param mil - Angle in mils (0-6399)
 * @returns Direction string like "up", "upper-right", "right", etc.
 */
export function getDirectionFromMil(mil: number): string {
  // Normalize to 0-6399
  const normalized = ((mil % MIL_PER_CIRCLE) + MIL_PER_CIRCLE) % MIL_PER_CIRCLE;

  // Each direction segment = 800 mils (6400 / 8)
  // Offset by 400 so boundaries fall between directions
  const segment = Math.floor((normalized + 400) / 800) % 8;

  const directions = ['up', 'upper-right', 'right', 'lower-right', 'down', 'lower-left', 'left', 'upper-left'];
  return directions[segment];
}

/**
 * Calculate the average (centroid) miss direction from an array of MissPoints.
 *
 * Returns a synthetic MissPoint representing the average direction.
 * Note: Averaging angular data uses vector math to avoid wraparound issues.
 *
 * @param points - Array of MissPoints
 * @returns Averaged MissPoint, or null if no points
 */
export function calculateAverageMissDirection(
  points: MissPoint[]
): MissPoint | null {
  if (points.length === 0) return null;

  // Convert each point to unit vectors and sum
  let sumX = 0;
  let sumY = 0;
  let sumRing = 0;

  for (const p of points) {
    const angleRad = p.mil * (2 * Math.PI) / MIL_PER_CIRCLE;
    sumX += Math.sin(angleRad);
    sumY += Math.cos(angleRad);
    sumRing += p.ring;
  }

  // Average
  const avgX = sumX / points.length;
  const avgY = sumY / points.length;
  const avgRing = Math.round(sumRing / points.length);

  // Convert back to angle
  let avgAngleRad = Math.atan2(avgX, avgY);
  let avgMil = avgAngleRad * (MIL_PER_CIRCLE / (2 * Math.PI));
  if (avgMil < 0) avgMil += MIL_PER_CIRCLE;
  avgMil = Math.round(avgMil) % MIL_PER_CIRCLE;

  return { ring: avgRing, mil: avgMil };
}

/**
 * Calculate ring spread (dispersion) of miss points.
 *
 * @param points - Array of MissPoints
 * @returns Max ring difference, or 0 if < 2 points
 */
export function calculateRingSpread(points: MissPoint[]): number {
  if (points.length < 2) return 0;

  const rings = points.map(p => p.ring);
  const minRing = Math.min(...rings);
  const maxRing = Math.max(...rings);

  return maxRing - minRing;
}

/**
 * Calculate angular spread (in mils) of miss points.
 * Handles wraparound at 0/6400 boundary.
 *
 * @param points - Array of MissPoints
 * @returns Angular spread in mils, or 0 if < 2 points
 */
export function calculateAngularSpread(points: MissPoint[]): number {
  if (points.length < 2) return 0;

  const mils = points.map(p => p.mil).sort((a, b) => a - b);

  // Check all gaps including wraparound
  let maxGap = 0;
  for (let i = 0; i < mils.length; i++) {
    const current = mils[i];
    const next = mils[(i + 1) % mils.length];
    const gap = i === mils.length - 1
      ? (MIL_PER_CIRCLE - current + next) // Wraparound gap
      : (next - current);
    maxGap = Math.max(maxGap, gap);
  }

  // Spread is the arc NOT covered by the max gap
  return MIL_PER_CIRCLE - maxGap;
}

/**
 * Convert ring index to ballistic offset in mils.
 *
 * @param ring - Ring index (0, 1, 2, ...)
 * @returns Offset in mils (0.0, 0.5, 1.0, ...)
 */
export function ringToBallisticOffset(ring: number): number {
  return ring * RING_MIL_STEP;
}
