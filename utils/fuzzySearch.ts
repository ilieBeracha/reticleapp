/**
 * fuzzySearch - Tiny case-insensitive scoring function.
 *
 * Good enough for small in-memory indices (< ~5k items). For each item the
 * score is the sum of:
 *   +3 per query token that is a prefix of a word in the haystack
 *   +1 per query token found anywhere in the haystack
 * Returns items sorted by score descending, zero-score items omitted.
 *
 * Usage:
 *   const hits = fuzzySearch(items, 'long rifle', (i) => i.name);
 */

export interface ScoredItem<T> {
  item: T;
  score: number;
}

export function fuzzySearch<T>(
  items: readonly T[],
  query: string,
  getHaystack: (item: T) => string
): ScoredItem<T>[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const tokens = q.split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];

  const out: ScoredItem<T>[] = [];

  for (const item of items) {
    const hay = getHaystack(item).toLowerCase();
    if (!hay) continue;
    const words = hay.split(/[^a-z0-9]+/).filter(Boolean);
    let score = 0;
    for (const tok of tokens) {
      if (!tok) continue;
      const prefixMatch = words.some((w) => w.startsWith(tok));
      if (prefixMatch) {
        score += 3;
        continue;
      }
      if (hay.includes(tok)) score += 1;
    }
    if (score > 0) out.push({ item, score });
  }

  out.sort((a, b) => b.score - a.score);
  return out;
}
