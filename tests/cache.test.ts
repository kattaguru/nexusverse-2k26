import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { apiRouter } from '../server/apiRouter.js';
import { MemoryCache, serverCache } from '../server/memoryCache.js';
import { hasMeaningfulContent, formatDraftAge } from '../src/utils/formCache.js';

describe('NexusVerse 2K26 Cache Memory & Architecture Unit Tests', () => {
  let server: any;
  let testBaseUrl = '';

  before(() => {
    return new Promise<void>((resolve) => {
      const app = express();
      app.use(express.json());
      app.use('/api', apiRouter);
      server = app.listen(0, () => {
        const addr = server.address();
        testBaseUrl = `http://localhost:${typeof addr === 'object' && addr ? addr.port : 5000}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server && server.close) {
      server.close();
    }
  });

  it('should store, retrieve, and delete items in MemoryCache', () => {
    const cache = new MemoryCache();
    cache.set('test:key1', { name: 'NexusVerse', role: 'Symposium' }, 5000);

    assert.equal(cache.has('test:key1'), true);
    const item = cache.get<{ name: string; role: string }>('test:key1');
    assert.deepEqual(item, { name: 'NexusVerse', role: 'Symposium' });

    const deleted = cache.delete('test:key1');
    assert.equal(deleted, true);
    assert.equal(cache.has('test:key1'), false);
    assert.equal(cache.get('test:key1'), undefined);
  });

  it('should expire entries based on TTL and update eviction counts', async () => {
    const cache = new MemoryCache();
    cache.set('test:expiring', 'hello', 40); // 40ms TTL

    assert.equal(cache.has('test:expiring'), true);
    assert.equal(cache.get('test:expiring'), 'hello');

    // Wait 65ms for expiry
    await new Promise((resolve) => setTimeout(resolve, 65));

    assert.equal(cache.has('test:expiring'), false);
    assert.equal(cache.get('test:expiring'), undefined);

    const stats = cache.getStats();
    assert.ok(stats.evictions >= 1);
    assert.ok(stats.misses >= 1);
  });

  it('should invalidate keys matching regex or string patterns', () => {
    const cache = new MemoryCache();
    cache.set('api:settings', { open: true }, 60000);
    cache.set('api:settings:limits', { max: 100 }, 60000);
    cache.set('api:registrations:all', [1, 2, 3], 60000);
    cache.set('user:session:1', 'active', 60000);

    assert.equal(cache.getStats().keyCount, 4);

    const evictedSettings = cache.invalidatePattern(/^api:settings/);
    assert.equal(evictedSettings, 2);
    assert.equal(cache.has('api:settings'), false);
    assert.equal(cache.has('api:settings:limits'), false);
    assert.equal(cache.has('api:registrations:all'), true);
    assert.equal(cache.has('user:session:1'), true);

    cache.clear();
    assert.equal(cache.getStats().keyCount, 0);
  });

  it('should calculate accurate hit ratio, key metrics, and memory usage', () => {
    const cache = new MemoryCache();
    cache.set('metric:1', { a: 1 }, 10000);

    // 3 hits
    cache.get('metric:1');
    cache.get('metric:1');
    cache.get('metric:1');

    // 1 miss
    cache.get('metric:nonexistent');

    const stats = cache.getStats();
    assert.equal(stats.hits, 3);
    assert.equal(stats.misses, 1);
    assert.equal(stats.sets, 1);
    assert.equal(stats.hitRatio, '75.0%');
    assert.equal(stats.keyCount, 1);
    assert.ok(stats.memoryUsage.rss > 0);
    assert.ok(stats.memoryUsage.heapUsed > 0);
    assert.ok(stats.keys[0].expiresInSeconds > 0);
  });

  it('should validate form cache draft content logic', () => {
    assert.equal(hasMeaningfulContent({}), false);
    assert.equal(hasMeaningfulContent({ name: '   ' }), false);
    assert.equal(hasMeaningfulContent({ name: 'Vikram', roll: '' }), true);
    assert.equal(hasMeaningfulContent({ selectedEvents: ['ctf'] }), true);
    assert.equal(hasMeaningfulContent({ phone: '9876543210' }), true);
  });

  it('should format relative draft age correctly', () => {
    const now = Date.now();
    assert.equal(formatDraftAge(now - 1000), 'just now');
    assert.equal(formatDraftAge(now - 25000), '25 seconds ago');
    assert.equal(formatDraftAge(now - 60000), '1 minute ago');
    assert.equal(formatDraftAge(now - 300000), '5 minutes ago');
    assert.equal(formatDraftAge(now - 3600000), '1 hour ago');
    assert.equal(formatDraftAge(now - 7200000), '2 hours ago');
    assert.equal(formatDraftAge(now - 86400000), '1 day ago');
    assert.equal(formatDraftAge(now - 172800000), '2 days ago');
  });

  it('GET /api/cache/stats should return valid server cache metrics', async () => {
    const res = await fetch(`${testBaseUrl}/api/cache/stats`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.stats);
    assert.equal(typeof data.stats.hits, 'number');
    assert.equal(typeof data.stats.misses, 'number');
    assert.equal(typeof data.stats.hitRatio, 'string');
    assert.ok(data.stats.memoryUsage);
    assert.ok(data.stats.memoryUsage.heapUsedFormatted);
  });

  it('POST /api/cache/clear should purge cache entries and report evicted count', async () => {
    // Prime a cache key via global singleton
    serverCache.set('api:test:purge', { val: 123 }, 60000);
    assert.equal(serverCache.has('api:test:purge'), true);

    const res = await fetch(`${testBaseUrl}/api/cache/clear`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'api:test:purge' })
    });

    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.ok(data.clearedCount >= 1);
    assert.equal(serverCache.has('api:test:purge'), false);
  });

  it('GET /api/settings should leverage in-memory cache with X-Cache headers', async () => {
    // Invalidate to guarantee cold cache start
    serverCache.delete('api:settings');

    // First call -> Cache MISS
    const res1 = await fetch(`${testBaseUrl}/api/settings`);
    assert.equal(res1.status, 200);
    assert.equal(res1.headers.get('x-cache'), 'MISS');

    // Second call -> Cache HIT
    const res2 = await fetch(`${testBaseUrl}/api/settings`);
    assert.equal(res2.status, 200);
    assert.equal(res2.headers.get('x-cache'), 'HIT');
  });
});
