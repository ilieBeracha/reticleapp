/**
 * services/_shared/normalize.ts
 *
 * Tiny normalization utilities for Supabase payloads.
 * Keep these generic and side-effect free.
 */

export function isNonEmptyString(v: unknown): v is string {
  return typeof v === 'string' && v.trim().length > 0;
}

export function toNullableString(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'string') return v;
  return String(v);
}

export function toNullableNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' && Number.isFinite(v)) return v;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}











