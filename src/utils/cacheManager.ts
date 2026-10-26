/**
 * NexusVerse 2K26 Cache Manager Utility
 * Unified controller for Client Browser CacheStorage, Service Worker lifecycle,
 * and Server In-Memory Cache monitoring/purging.
 */

import { clearFormDraft } from './formCache';
import { isNativeMobile } from './mobileApp';

export interface BrowserStorageStats {
  supported: boolean;
  cacheNames: string[];
  usageBytes: number;
  quotaBytes: number;
  usageFormatted: string;
  quotaFormatted: string;
  usagePercentage: number;
  serviceWorkerActive: boolean;
  serviceWorkerScope?: string;
}

export interface ServerCacheMetrics {
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

export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Register Service Worker for offline support and asset caching.
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || isNativeMobile()) {
    return null;
  }

  // Avoid registering in local dev mode when Vite HMR is running unless explicitly requested
  try {
    const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
    console.log('⚡ NexusVerse Service Worker registered with scope:', reg.scope);
    return reg;
  } catch (err: any) {
    console.warn('Service Worker registration skipped or failed:', err?.message || err);
    return null;
  }
}

/**
 * Retrieve Browser CacheStorage and Storage Quota metrics.
 */
export async function getBrowserCacheStats(): Promise<BrowserStorageStats> {
  const result: BrowserStorageStats = {
    supported: false,
    cacheNames: [],
    usageBytes: 0,
    quotaBytes: 0,
    usageFormatted: '0 B',
    quotaFormatted: '0 B',
    usagePercentage: 0,
    serviceWorkerActive: false
  };

  if (typeof window === 'undefined') return result;

  try {
    // 1. Check Service Worker status
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      result.serviceWorkerActive = true;
      result.serviceWorkerScope = navigator.serviceWorker.controller.scriptURL;
    }

    // 2. Read CacheStorage caches
    if ('caches' in window) {
      result.supported = true;
      const keys = await window.caches.keys();
      result.cacheNames = keys;
    }

    // 3. Estimate browser storage quota
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      result.usageBytes = estimate.usage || 0;
      result.quotaBytes = estimate.quota || 0;
      result.usageFormatted = formatBytes(result.usageBytes);
      result.quotaFormatted = formatBytes(result.quotaBytes);
      if (result.quotaBytes > 0) {
        result.usagePercentage = parseFloat(((result.usageBytes / result.quotaBytes) * 100).toFixed(2));
      }
    }
  } catch (err) {
    console.warn('Could not inspect browser cache stats:', err);
  }

  return result;
}

/**
 * Clear all Browser CacheStorage items and notify Service Worker.
 */
export async function clearBrowserCache(): Promise<{ success: boolean; deletedCaches: string[] }> {
  const deletedCaches: string[] = [];
  if (typeof window === 'undefined' || !('caches' in window)) {
    return { success: false, deletedCaches };
  }

  try {
    const keys = await window.caches.keys();
    for (const key of keys) {
      await window.caches.delete(key);
      deletedCaches.push(key);
    }

    // Notify Service Worker if active
    if (navigator.serviceWorker && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' });
    }

    return { success: true, deletedCaches };
  } catch (err: any) {
    console.error('Error clearing browser cache:', err);
    return { success: false, deletedCaches };
  }
}

/**
 * Query Server In-Memory Cache metrics from backend API.
 */
export async function fetchServerCacheStats(): Promise<{ success: boolean; stats?: ServerCacheMetrics; error?: string }> {
  try {
    const res = await fetch('/api/cache/stats');
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, stats: data.stats };
    }
    return { success: false, error: data.error || 'Failed to fetch server cache stats' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching backend server' };
  }
}

/**
 * Purge Server In-Memory Cache via backend API.
 */
export async function purgeServerCache(options?: { key?: string; pattern?: string }): Promise<{ success: boolean; clearedCount?: number; message?: string; error?: string }> {
  try {
    const res = await fetch('/api/cache/clear', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    const data = await res.json();
    if (res.ok && data.success) {
      return { success: true, clearedCount: data.clearedCount, message: data.message };
    }
    return { success: false, error: data.error || 'Failed to clear server cache' };
  } catch (err: any) {
    return { success: false, error: err.message || 'Network error reaching backend server' };
  }
}

/**
 * 1-Click Master Cache Flush: Purge Server RAM Cache, Browser CacheStorage, and Form Draft.
 */
export async function flushAllSystemCaches(): Promise<{
  serverCleared: boolean;
  browserCleared: boolean;
  formDraftCleared: boolean;
  details: string;
}> {
  let serverCleared = false;
  let browserCleared = false;
  let formDraftCleared = true;

  try {
    const srv = await purgeServerCache();
    serverCleared = srv.success;
  } catch {}

  try {
    const bwr = await clearBrowserCache();
    browserCleared = bwr.success;
  } catch {}

  try {
    clearFormDraft();
  } catch {}

  return {
    serverCleared,
    browserCleared,
    formDraftCleared,
    details: 'All system memory caches, browser offline storage, and auto-saved form drafts have been completely purged.'
  };
}
