/**
 * NexusVerse 2K26 High-Performance Server In-Memory Cache
 * Provides sub-millisecond TTL-based caching for high-traffic endpoints,
 * with pattern-based invalidation, eviction, and live memory metrics.
 */

export interface CacheEntry<T = any> {
  value: T;
  expiresAt: number;
  createdAt: number;
  sizeBytes: number;
  hitCount: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  evictions: number;
  keyCount: number;
  hitRatio: string;
  keys: Array<{
    key: string;
    expiresInSeconds: number;
    hits: number;
    approxSize: number;
  }>;
  memoryUsage: {
    rss: number;
    heapTotal: number;
    heapUsed: number;
    external: number;
    rssFormatted: string;
    heapUsedFormatted: string;
  };
  uptimeSeconds: number;
}

function estimateObjectSize(obj: any): number {
  try {
    const str = JSON.stringify(obj);
    return str ? str.length * 2 : 64; // ~2 bytes per UTF-16 character
  } catch {
    return 128;
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export class MemoryCache {
  private store: Map<string, CacheEntry> = new Map();
  private hits: number = 0;
  private misses: number = 0;
  private sets: number = 0;
  private evictions: number = 0;
  private startTime: number = Date.now();

  constructor() {
    // Periodic garbage collector for expired cache entries every 60 seconds
    if (typeof setInterval !== 'undefined') {
      const cleanupInterval = setInterval(() => {
        this.pruneExpired();
      }, 60000);
      if (cleanupInterval.unref) {
        cleanupInterval.unref();
      }
    }
  }

  /**
   * Retrieve item from cache if not expired.
   */
  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    const now = Date.now();

    if (!entry) {
      this.misses++;
      return undefined;
    }

    if (entry.expiresAt > 0 && entry.expiresAt <= now) {
      this.store.delete(key);
      this.evictions++;
      this.misses++;
      return undefined;
    }

    entry.hitCount++;
    this.hits++;
    return entry.value as T;
  }

  /**
   * Store item in cache with time-to-live in milliseconds.
   * If ttlMs <= 0, item does not expire.
   */
  set<T>(key: string, value: T, ttlMs: number = 60000): void {
    const now = Date.now();
    const expiresAt = ttlMs > 0 ? now + ttlMs : 0;
    const sizeBytes = estimateObjectSize(value);

    this.store.set(key, {
      value,
      expiresAt,
      createdAt: now,
      sizeBytes,
      hitCount: 0
    });
    this.sets++;
  }

  /**
   * Check if active key exists in cache.
   */
  has(key: string): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (entry.expiresAt > 0 && entry.expiresAt <= Date.now()) {
      this.store.delete(key);
      this.evictions++;
      return false;
    }
    return true;
  }

  /**
   * Delete specific key.
   */
  delete(key: string): boolean {
    return this.store.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix or regular expression.
   * Returns number of keys removed.
   */
  invalidatePattern(pattern: string | RegExp): number {
    let removed = 0;
    const regex = typeof pattern === 'string' ? new RegExp(`^${pattern}`) : pattern;

    for (const key of Array.from(this.store.keys())) {
      if (regex.test(key)) {
        this.store.delete(key);
        removed++;
      }
    }
    return removed;
  }

  /**
   * Clear all items in cache.
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Prune all expired entries from memory.
   */
  pruneExpired(): number {
    const now = Date.now();
    let pruned = 0;
    for (const [key, entry] of Array.from(this.store.entries())) {
      if (entry.expiresAt > 0 && entry.expiresAt <= now) {
        this.store.delete(key);
        this.evictions++;
        pruned++;
      }
    }
    return pruned;
  }

  /**
   * Return complete real-time cache and server RAM statistics.
   */
  getStats(): CacheStats {
    const now = Date.now();
    const totalRequests = this.hits + this.misses;
    const hitRatioNum = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;
    const hitRatio = `${hitRatioNum.toFixed(1)}%`;

    const keysList: CacheStats['keys'] = [];
    for (const [key, entry] of Array.from(this.store.entries())) {
      const expiresInSeconds = entry.expiresAt > 0
        ? Math.max(0, Math.round((entry.expiresAt - now) / 1000))
        : -1;
      keysList.push({
        key,
        expiresInSeconds,
        hits: entry.hitCount,
        approxSize: entry.sizeBytes
      });
    }

    const mem = typeof process !== 'undefined' && process.memoryUsage
      ? process.memoryUsage()
      : { rss: 0, heapTotal: 0, heapUsed: 0, external: 0, arrayBuffers: 0 };

    return {
      hits: this.hits,
      misses: this.misses,
      sets: this.sets,
      evictions: this.evictions,
      keyCount: this.store.size,
      hitRatio,
      keys: keysList,
      memoryUsage: {
        rss: mem.rss,
        heapTotal: mem.heapTotal,
        heapUsed: mem.heapUsed,
        external: mem.external,
        rssFormatted: formatBytes(mem.rss),
        heapUsedFormatted: formatBytes(mem.heapUsed)
      },
      uptimeSeconds: Math.floor((Date.now() - this.startTime) / 1000)
    };
  }
}

// Global server in-memory cache singleton
export const serverCache = new MemoryCache();
