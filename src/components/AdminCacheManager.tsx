import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Database, 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  HardDrive, 
  Sparkles, 
  Zap, 
  Layers, 
  ShieldCheck, 
  Clock,
  Activity
} from 'lucide-react';
import { 
  fetchServerCacheStats, 
  purgeServerCache, 
  getBrowserCacheStats, 
  clearBrowserCache, 
  flushAllSystemCaches, 
  BrowserStorageStats, 
  ServerCacheMetrics 
} from '../utils/cacheManager';
import { loadFormDraft, clearFormDraft, formatDraftAge } from '../utils/formCache';

interface AdminCacheManagerProps {
  theme?: 'dark' | 'light';
}

export function AdminCacheManager({ theme = 'dark' }: AdminCacheManagerProps) {
  const isLight = theme === 'light';

  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');

  // Server Cache Metrics
  const [serverMetrics, setServerMetrics] = useState<ServerCacheMetrics | null>(null);
  // Browser Storage Stats
  const [browserStats, setBrowserStats] = useState<BrowserStorageStats | null>(null);
  // Form Draft Info
  const [formDraftInfo, setFormDraftInfo] = useState<{ hasDraft: boolean; age: string; name?: string; roll?: string } | null>(null);

  const loadAllMetrics = async () => {
    setLoading(true);
    setActionError('');

    try {
      // 1. Fetch Server In-Memory Cache Stats
      const srv = await fetchServerCacheStats();
      if (srv.success && srv.stats) {
        setServerMetrics(srv.stats);
      }

      // 2. Fetch Browser CacheStorage & Quota
      const bwr = await getBrowserCacheStats();
      setBrowserStats(bwr);

      // 3. Inspect Local Form Draft
      const draft = loadFormDraft();
      if (draft) {
        setFormDraftInfo({
          hasDraft: true,
          age: formatDraftAge(draft.savedAt),
          name: draft.name,
          roll: draft.roll
        });
      } else {
        setFormDraftInfo({
          hasDraft: false,
          age: 'None',
        });
      }
    } catch (err: any) {
      setActionError(err.message || 'Failed to load cache metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllMetrics();
  }, []);

  const handlePurgeServerCache = async (key?: string) => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await purgeServerCache(key ? { key } : undefined);
      if (res.success) {
        setActionSuccess(res.message || 'Server in-memory cache purged successfully!');
        await loadAllMetrics();
      } else {
        setActionError(res.error || 'Failed to purge server cache');
      }
    } catch (err: any) {
      setActionError(err.message || 'Network error');
    } finally {
      setLoading(false);
      setTimeout(() => setActionSuccess(''), 4500);
    }
  };

  const handleClearBrowserCache = async () => {
    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await clearBrowserCache();
      if (res.success) {
        setActionSuccess(`Browser CacheStorage cleared (${res.deletedCaches.length} caches purged).`);
        await loadAllMetrics();
      } else {
        setActionError('Failed to clear browser CacheStorage');
      }
    } catch (err: any) {
      setActionError(err.message || 'Error clearing browser cache');
    } finally {
      setLoading(false);
      setTimeout(() => setActionSuccess(''), 4500);
    }
  };

  const handleClearDraft = () => {
    clearFormDraft();
    setFormDraftInfo({ hasDraft: false, age: 'None' });
    setActionSuccess('Local registration form auto-save draft cleared.');
    setTimeout(() => setActionSuccess(''), 4000);
  };

  const handleFlushAll = async () => {
    if (!window.confirm('Are you sure you want to flush ALL system memory caches, browser offline storage, and form drafts?')) {
      return;
    }

    setLoading(true);
    setActionError('');
    setActionSuccess('');
    try {
      const res = await flushAllSystemCaches();
      setActionSuccess(res.details);
      await loadAllMetrics();
    } catch (err: any) {
      setActionError(err.message || 'Error flushing all caches');
    } finally {
      setLoading(false);
      setTimeout(() => setActionSuccess(''), 5000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Actions Bar */}
      <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
        isLight 
          ? 'bg-gradient-to-r from-[#fbf8f0] to-[#f4ede0] border-[#d8cfb8] text-[#1a1710]' 
          : 'bg-gradient-to-r from-[#14141d] to-[#1a1924] border-[#d4a935]/30 text-[#f3ecd9]'
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
              isLight 
                ? 'bg-[#eadebe] text-[#925807] border border-[#d4a935]/40' 
                : 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/50'
            }`}>
              <Cpu className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold">Cache Memory & Architecture Hub</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/30">
                  Operational
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isLight ? 'text-[#6b6250]' : 'text-[#a79f8b]'}`}>
                Sub-millisecond Server In-Memory Cache (TTL), Browser CacheStorage (PWA offline shell), and Form Auto-Save Memory.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={loadAllMetrics}
              disabled={loading}
              className={`px-3 py-2 text-xs font-semibold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                isLight 
                  ? 'bg-white hover:bg-[#ede5d3] border-[#d4cbb3] text-[#1a1710]' 
                  : 'bg-[#0a0a0d] hover:bg-[#1f1b0e] border-[#2e2b22] text-[#f2c14e]'
              }`}
              title="Refresh cache metrics"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Stats</span>
            </button>

            <button
              type="button"
              onClick={handleFlushAll}
              disabled={loading}
              className="px-3.5 py-2 text-xs font-bold rounded-xl bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-[#1a1300] hover:brightness-105 shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>Flush All Caches</span>
            </button>
          </div>
        </div>

        {/* Feedback Alert Messages */}
        {actionSuccess && (
          <div className="mt-4 p-3 rounded-xl bg-[#4cc38a]/15 border border-[#4cc38a]/40 text-[#4cc38a] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{actionSuccess}</span>
          </div>
        )}

        {actionError && (
          <div className="mt-4 p-3 rounded-xl bg-[#ff8a80]/15 border border-[#ff8a80]/40 text-[#ff8a80] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span className="font-semibold">{actionError}</span>
          </div>
        )}
      </div>

      {/* Grid: 3 Main Cache Layers */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        
        {/* CARD 1: SERVER IN-MEMORY CACHE */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-[#e0d6c1]' : 'bg-[#14141d] border-[#2e2b22]'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2b22]/30">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-[#f2c14e]" />
                <h4 className="font-bold text-sm">Server In-Memory Cache</h4>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#f2c14e]/15 text-[#f2c14e] border border-[#d4a935]/30">
                TTL Powered
              </span>
            </div>

            {/* Hit Ratio Gauge */}
            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-[#f7f3ea] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-[#a79f8b]">Hit Ratio Performance</span>
                <span className="font-bold text-sm text-[#4cc38a]">
                  {serverMetrics?.hitRatio || '0.0%'}
                </span>
              </div>
              <div className="w-full bg-[#1e1e24] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#4cc38a] to-[#2ecc71] h-full transition-all duration-500"
                  style={{ width: serverMetrics?.hitRatio || '0%' }}
                />
              </div>
            </div>

            {/* Quick Metrics Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block">Cache Hits</span>
                <span className="text-base font-bold text-[#4cc38a]">{serverMetrics?.hits ?? 0}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block">Cache Misses</span>
                <span className="text-base font-bold text-[#f2c14e]">{serverMetrics?.misses ?? 0}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block">Active Keys</span>
                <span className="text-base font-bold text-white">{serverMetrics?.keyCount ?? 0}</span>
              </div>
              <div className={`p-2.5 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block">Node Heap Used</span>
                <span className="text-base font-bold text-[#f2c14e]">
                  {serverMetrics?.memoryUsage.heapUsedFormatted || '0 B'}
                </span>
              </div>
            </div>

            {/* Cached Keys List */}
            <div>
              <span className="text-[11px] font-semibold text-[#a79f8b] block mb-1.5">
                Active Cached Endpoints:
              </span>
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {serverMetrics?.keys && serverMetrics.keys.length > 0 ? (
                  serverMetrics.keys.map((k) => (
                    <div 
                      key={k.key}
                      className={`p-2 rounded-lg text-xs font-mono flex items-center justify-between border ${
                        isLight ? 'bg-[#f4efe4] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'
                      }`}
                    >
                      <div className="truncate max-w-[140px] text-[#f2c14e]" title={k.key}>
                        {k.key}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-[#a79f8b]">
                        <span>{k.expiresInSeconds}s left</span>
                        <span className="text-[#4cc38a] font-bold">{k.hits} hits</span>
                        <button
                          type="button"
                          onClick={() => handlePurgeServerCache(k.key)}
                          className="text-[#ff8a80] hover:text-white cursor-pointer ml-1"
                          title={`Evict ${k.key}`}
                        >
                          &times;
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-[#a79f8b] italic py-2 text-center">
                    No keys currently in memory (fresh state)
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#2e2b22]/30">
            <button
              type="button"
              onClick={() => handlePurgeServerCache()}
              disabled={loading}
              className={`w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLight 
                  ? 'bg-[#faebd7] hover:bg-[#f3dcbe] border-[#d4a935]/50 text-[#925807]' 
                  : 'bg-[#1f1b0e] hover:bg-[#2e250f] border-[#d4a935]/40 text-[#f2c14e]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Server Memory Cache</span>
            </button>
          </div>
        </div>

        {/* CARD 2: BROWSER CACHESTORAGE & OFFLINE PWA */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-[#e0d6c1]' : 'bg-[#14141d] border-[#2e2b22]'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2b22]/30">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-[#f2c14e]" />
                <h4 className="font-bold text-sm">Browser CacheStorage (Offline PWA)</h4>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                browserStats?.serviceWorkerActive
                  ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/30'
                  : 'bg-[#f2c14e]/15 text-[#f2c14e] border-[#d4a935]/30'
              }`}>
                {browserStats?.serviceWorkerActive ? 'SW Active' : 'PWA Ready'}
              </span>
            </div>

            {/* Storage Quota Gauge */}
            <div className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-[#f7f3ea] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'
            }`}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-medium text-[#a79f8b]">Storage Estimate</span>
                <span className="font-bold text-sm text-[#f2c14e]">
                  {browserStats?.usageFormatted || '0 B'}
                </span>
              </div>
              <div className="w-full bg-[#1e1e24] h-2 rounded-full overflow-hidden">
                <div 
                  className="bg-gradient-to-r from-[#d4a935] to-[#f2c14e] h-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(5, browserStats?.usagePercentage || 5))}%` }}
                />
              </div>
              <div className="text-[10px] text-[#a79f8b] mt-1.5 flex justify-between">
                <span>Quota: {browserStats?.quotaFormatted || 'Unknown'}</span>
                <span>{browserStats?.usagePercentage || 0}% used</span>
              </div>
            </div>

            {/* Cache Buckets & Precached Assets */}
            <div className="space-y-2 text-xs">
              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block mb-1">Active Cache Buckets</span>
                {browserStats?.cacheNames && browserStats.cacheNames.length > 0 ? (
                  <div className="space-y-1">
                    {browserStats.cacheNames.map((name) => (
                      <div key={name} className="flex items-center gap-1.5 font-mono text-[#f2c14e]">
                        <span className="w-2 h-2 rounded-full bg-[#4cc38a]"></span>
                        <span>{name}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="font-mono text-[#a79f8b]">nexusverse-cache-v1 (registered)</span>
                )}
              </div>

              <div className={`p-3 rounded-xl border ${isLight ? 'bg-[#fdfbf7] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'}`}>
                <span className="text-[10px] text-[#a79f8b] block mb-1">Precached Shell Assets</span>
                <ul className="text-[11px] space-y-1 text-[#a79f8b]">
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                    <span>App Shell: /register.html, /starting-page.html</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                    <span>Media: Logos, IEEE-SB & NBKRIST badges</span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                    <span>Strategies: Stale-While-Revalidate & API Network-First</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#2e2b22]/30">
            <button
              type="button"
              onClick={handleClearBrowserCache}
              disabled={loading}
              className={`w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isLight 
                  ? 'bg-[#faebd7] hover:bg-[#f3dcbe] border-[#d4a935]/50 text-[#925807]' 
                  : 'bg-[#1f1b0e] hover:bg-[#2e250f] border-[#d4a935]/40 text-[#f2c14e]'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Browser CacheStorage</span>
            </button>
          </div>
        </div>

        {/* CARD 3: FORM AUTO-SAVE DRAFT CACHE */}
        <div className={`p-5 rounded-2xl border flex flex-col justify-between transition-all ${
          isLight ? 'bg-white border-[#e0d6c1]' : 'bg-[#14141d] border-[#2e2b22]'
        }`}>
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2b22]/30">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#f2c14e]" />
                <h4 className="font-bold text-sm">Form Auto-Save Draft Cache</h4>
              </div>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                formDraftInfo?.hasDraft
                  ? 'bg-[#4cc38a]/15 text-[#4cc38a] border-[#4cc38a]/30'
                  : 'bg-[#a79f8b]/15 text-[#a79f8b] border-[#a79f8b]/30'
              }`}>
                {formDraftInfo?.hasDraft ? 'Draft Active' : 'No Draft'}
              </span>
            </div>

            <div className={`p-3.5 rounded-xl border text-xs space-y-2.5 ${
              isLight ? 'bg-[#f7f3ea] border-[#e0d6c1]' : 'bg-[#0a0a0d] border-[#2e2b22]'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[#a79f8b]">Last Auto-Saved:</span>
                <span className="font-bold text-[#f2c14e] font-mono">
                  {formDraftInfo?.age || 'None'}
                </span>
              </div>
              {formDraftInfo?.hasDraft && (
                <>
                  <div className="flex items-center justify-between pt-1 border-t border-[#2e2b22]/30">
                    <span className="text-[#a79f8b]">Saved Participant:</span>
                    <span className="font-bold text-white truncate max-w-[150px]">
                      {formDraftInfo.name || 'Unnamed'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#a79f8b]">Roll / ID:</span>
                    <span className="font-mono text-[#f2c14e]">
                      {formDraftInfo.roll || 'N/A'}
                    </span>
                  </div>
                </>
              )}
            </div>

            <div className="text-xs space-y-2 text-[#a79f8b] leading-relaxed">
              <div className="flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-[#4cc38a] shrink-0 mt-0.5" />
                <span>
                  Protects delegate inputs in real-time. Debounced at 400ms across name, roll, event selection, and team member fields.
                </span>
              </div>
              <div className="flex items-start gap-2">
                <Clock className="w-4 h-4 text-[#f2c14e] shrink-0 mt-0.5" />
                <span>
                  Auto-expires drafts older than 48 hours. Cleared automatically upon confirmed ticket generation.
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#2e2b22]/30">
            <button
              type="button"
              onClick={handleClearDraft}
              disabled={!formDraftInfo?.hasDraft}
              className={`w-full py-2.5 text-xs font-bold rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                formDraftInfo?.hasDraft
                  ? isLight
                    ? 'bg-[#faebd7] hover:bg-[#f3dcbe] border-[#d4a935]/50 text-[#925807]'
                    : 'bg-[#1f1b0e] hover:bg-[#2e250f] border-[#d4a935]/40 text-[#f2c14e]'
                  : 'bg-[#1e1e24]/40 border-transparent text-[#6e685a] cursor-not-allowed'
              }`}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Form Draft Memory</span>
            </button>
          </div>
        </div>

      </div>

      {/* Architecture Information Box */}
      <div className={`p-4 rounded-xl border text-xs leading-relaxed flex items-start gap-3 ${
        isLight ? 'bg-[#fbf8f0] border-[#e0d6c1] text-[#6b6250]' : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b]'
      }`}>
        <Activity className="w-4 h-4 text-[#f2c14e] shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-white block mb-0.5">Automated Cache Lifecycle & Invalidation:</span>
          Backend API routes (<code className="text-[#f2c14e]">/api/settings</code>, <code className="text-[#f2c14e]">/api/razorpay/config</code>, <code className="text-[#f2c14e]">/api/registrations</code>, and <code className="text-[#f2c14e]">/api/photos</code>) automatically invalidate their respective in-memory cache entries whenever registrations, admin settings, or photos are updated. Client Service Worker serves offline shells with zero network delays.
        </div>
      </div>
    </div>
  );
}
