export const INFINITE_SHOTS_SENTINEL = 9999;

export function isInfiniteShots(value: number | null | undefined) {
  return value == null || value >= INFINITE_SHOTS_SENTINEL;
}

export function formatMaxShots(value: number | null | undefined) {
  return isInfiniteShots(value) ? '∞' : String(value);
}

/**
 * For persisted configs that can't store null, represent "infinite" with `INFINITE_SHOTS_SENTINEL`.
 */
export function normalizeMaxShotsForStorage(value: number | null | undefined) {
  if (value == null) return INFINITE_SHOTS_SENTINEL;
  if (value <= 0) return INFINITE_SHOTS_SENTINEL;
  return value;
}

/**
 * For DB fields where null is allowed (e.g. `planned_shots`), store null when infinite.
 */
export function finiteShotsOrNull(value: number | null | undefined) {
  return isInfiniteShots(value) ? null : value!;
}


