/**
 * Offline & Stale-While-Revalidate (SWR) Cache Manager
 *
 * Provides a two-tier cache (L1 in-memory + L2 localStorage) for instant
 * (<5ms) data loading, tab switching, and reliable offline operation.
 */

interface CacheEntry<T = unknown> {
  data: T;
  timestamp: number;
  url: string;
}

const MEMORY_CACHE = new Map<string, CacheEntry>();
const CACHE_PREFIX = 'billings_cache:';
const DEFAULT_TTL_MS = 5 * 60 * 1000; // 5 minutes fresh, but kept indefinitely for offline fallback

export const offlineCache = {
  /**
   * Retrieves an item from L1 (memory) or L2 (localStorage).
   * Returns data even if stale so the UI can render instantly while revalidating.
   */
  get<T = unknown>(url: string): { data: T; isStale: boolean; timestamp: number } | null {
    // 1. Check L1 Memory Cache
    const inMem = MEMORY_CACHE.get(url);
    if (inMem) {
      const isStale = Date.now() - inMem.timestamp > DEFAULT_TTL_MS;
      return { data: inMem.data as T, isStale, timestamp: inMem.timestamp };
    }

    // 2. Check L2 LocalStorage
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_PREFIX + url);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as CacheEntry<T>;
      // Populate L1 cache for subsequent fast reads
      MEMORY_CACHE.set(url, parsed);
      const isStale = Date.now() - parsed.timestamp > DEFAULT_TTL_MS;
      return { data: parsed.data, isStale, timestamp: parsed.timestamp };
    } catch (e) {
      console.warn('Failed to read from localStorage cache:', e);
      return null;
    }
  },

  /**
   * Saves response data into both L1 (memory) and L2 (localStorage).
   */
  set<T = unknown>(url: string, data: T): void {
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      url,
    };

    // Update L1
    MEMORY_CACHE.set(url, entry as CacheEntry);

    // Update L2
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(entry));
      } catch (e) {
        // If quota exceeded, clear older cache entries
        console.warn('LocalStorage cache full or restricted, pruning older entries:', e);
        offlineCache.pruneOldEntries();
        try {
          localStorage.setItem(CACHE_PREFIX + url, JSON.stringify(entry));
        } catch {
          // If still fails, memory cache still holds it
        }
      }
    }
  },

  /**
   * Invalidate cache matching a URL or prefix.
   */
  invalidate(pattern: string | RegExp): void {
    // 1. Invalidate L1
    for (const key of MEMORY_CACHE.keys()) {
      if (typeof pattern === 'string' ? key.includes(pattern) : pattern.test(key)) {
        MEMORY_CACHE.delete(key);
      }
    }

    // 2. Invalidate L2
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) {
            const rawUrl = k.substring(CACHE_PREFIX.length);
            if (typeof pattern === 'string' ? rawUrl.includes(pattern) : pattern.test(rawUrl)) {
              keysToRemove.push(k);
            }
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch (e) {
        console.warn('Failed to invalidate localStorage cache:', e);
      }
    }
  },

  /**
   * Smart invalidation based on API route mutation.
   * Cleans up dependent queries so UI never shows stale data after an edit/add/delete.
   */
  invalidateOnMutation(mutationUrl: string): void {
    if (mutationUrl.includes('/api/budget/expenses')) {
      offlineCache.invalidate('/api/budget/expenses');
      offlineCache.invalidate('/api/budget/borrow');
      offlineCache.invalidate('/api/budget/months');
      offlineCache.invalidate('/api/budget/summary');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
      offlineCache.invalidate('/api/budget/allocations');
    } else if (mutationUrl.includes('/api/budget/income')) {
      offlineCache.invalidate('/api/budget/income');
      offlineCache.invalidate('/api/budget/months');
      offlineCache.invalidate('/api/budget/summary');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
      offlineCache.invalidate('/api/budget/allocations');
      offlineCache.invalidate('/api/budget/current-account');
    } else if (mutationUrl.includes('/api/budget/borrow')) {
      offlineCache.invalidate('/api/budget/borrow');
      offlineCache.invalidate('/api/budget/expenses');
      offlineCache.invalidate('/api/budget/months');
      offlineCache.invalidate('/api/budget/summary');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
      offlineCache.invalidate('/api/budget/allocations');
    } else if (mutationUrl.includes('/api/budget/months')) {
      offlineCache.invalidate('/api/budget/months');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
      offlineCache.invalidate('/api/budget/summary');
    } else if (mutationUrl.includes('/api/budget/goals')) {
      offlineCache.invalidate('/api/budget/goals');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/expenses');
      offlineCache.invalidate('/api/budget/borrow');
      offlineCache.invalidate('/api/budget/summary');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
    } else if (mutationUrl.includes('/api/budget/summary')) {
      offlineCache.invalidate('/api/budget/summary');
      offlineCache.invalidate('/api/budget/month-bundle');
      offlineCache.invalidate('/api/budget/monthly-breakdown');
    } else if (mutationUrl.includes('/api/budget/allocations')) {
      offlineCache.invalidate('/api/budget/allocations');
      offlineCache.invalidate('/api/budget/month-bundle');
    } else if (mutationUrl.includes('/api/budget/current-account')) {
      offlineCache.invalidate('/api/budget/current-account');
      offlineCache.invalidate('/api/budget/summary');
    } else if (mutationUrl.includes('/api/invoices')) {
      offlineCache.invalidate('/api/invoices');
      offlineCache.invalidate('/api/next-number');
      offlineCache.invalidate('/api/budget/current-account');
    } else if (mutationUrl.includes('/api/organizations')) {
      offlineCache.invalidate('/api/organizations');
    } else if (mutationUrl.includes('/api/catalog')) {
      offlineCache.invalidate('/api/catalog');
    } else if (mutationUrl.includes('/api/settings')) {
      offlineCache.invalidate('/api/settings');
    }
  },

  /**
   * Cleans up oldest cache entries when localStorage is near limit.
   */
  pruneOldEntries(): void {
    if (typeof window === 'undefined') return;
    try {
      const entries: { key: string; timestamp: number }[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(CACHE_PREFIX)) {
          try {
            const parsed = JSON.parse(localStorage.getItem(k) || '{}');
            entries.push({ key: k, timestamp: parsed.timestamp || 0 });
          } catch {
            entries.push({ key: k, timestamp: 0 });
          }
        }
      }

      // Sort oldest first and delete the oldest 50%
      entries.sort((a, b) => a.timestamp - b.timestamp);
      const toRemove = entries.slice(0, Math.max(1, Math.floor(entries.length / 2)));
      toRemove.forEach((e) => localStorage.removeItem(e.key));
    } catch {}
  },

  /**
   * Clears all local cache.
   */
  clearAll(): void {
    MEMORY_CACHE.clear();
    if (typeof window !== 'undefined') {
      try {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k.startsWith(CACHE_PREFIX)) {
            keysToRemove.push(k);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
      } catch {}
    }
  },
};
