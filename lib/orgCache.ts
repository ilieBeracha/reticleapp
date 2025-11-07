// lib/orgCache.ts
// In-memory cache for organization data with TTL

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

class OrgCache {
  private static cache = new Map<string, CacheEntry<any>>();
  private static readonly TTL = 60000; // 1 minute

  /**
   * Get cached data by key
   * @param key - Cache key
   * @returns Cached data or null if expired/not found
   */
  static get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    if (now - entry.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  /**
   * Set cache data with current timestamp
   * @param key - Cache key
   * @param data - Data to cache
   */
  static set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  /**
   * Invalidate specific cache entry
   * @param key - Cache key to invalidate
   */
  static invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear entire cache
   */
  static clear(): void {
    this.cache.clear();
  }

  /**
   * Invalidate all cache entries for a user
   * @param userId - User ID to invalidate
   */
  static invalidateUser(userId: string): void {
    // Invalidate all keys starting with userId
    for (const key of this.cache.keys()) {
      if (key.startsWith(userId) || key.startsWith(`orgs:${userId}`)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Get cache statistics (for debugging)
   */
  static getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

export default OrgCache;