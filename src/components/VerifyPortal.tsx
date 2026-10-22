import React, { useState, useEffect, useRef, useMemo } from 'react';
import confetti from 'canvas-confetti';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  Search, 
  Eye, 
  Download, 
  X, 
  Lock, 
  Unlock, 
  RefreshCw, 
  Sun, 
  Moon, 
  Copy, 
  Check, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Users, 
  AlertCircle, 
  Ticket,
  FileCheck,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { RegistrationRecord, TicketPass } from './TicketPass';
import { ALL_EVENTS } from '../data/symposiumData';
import { sendTicketEmailApi } from '../services/api';
import { getRecordTeammates } from '../utils/delegateStats';

interface VerifyPortalProps {
  savedRecords: RegistrationRecord[];
  onRefreshRecords?: () => Promise<void>;
  onUpdateRecord: (updated: RegistrationRecord) => void;
  onViewPass?: (record: RegistrationRecord) => void;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
  leftLogo?: string;
  rightLogo?: string;
}

export const VerifyPortal: React.FC<VerifyPortalProps> = ({
  savedRecords,
  onRefreshRecords,
  onUpdateRecord,
  onViewPass,
  theme: propTheme,
  onToggleTheme: propOnToggleTheme,
  leftLogo,
  rightLogo
}) => {
  // Theme state
  const [internalTheme, setInternalTheme] = useState<'dark' | 'light'>(() => {
    if (typeof document !== 'undefined') {
      const current = document.documentElement.getAttribute('data-theme');
      if (current === 'light' || current === 'dark') return current;
    }
    try {
      return (localStorage.getItem('nexusverse_theme') as 'dark' | 'light') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const activeTheme = propTheme || internalTheme;
  const isLight = activeTheme === 'light';

  const handleThemeToggle = () => {
    if (propOnToggleTheme) {
      propOnToggleTheme();
    } else {
      const nextTheme = activeTheme === 'dark' ? 'light' : 'dark';
      setInternalTheme(nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
      if (nextTheme === 'light') {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      try {
        localStorage.setItem('nexusverse_theme', nextTheme);
      } catch {}
    }
  };

  // Authentication state (password: nexusk26)
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    try {
      return sessionStorage.getItem('nexusverse_verify_auth') === 'true';
    } catch {
      return false;
    }
  });

  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Auto-refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<'pending' | 'verified' | 'all'>('pending');
  const [eventFilter, setEventFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'name' | 'amount'>('newest');

  // Modals & Popups
  const [viewingReceipt, setViewingReceipt] = useState<{
    name: string;
    roll: string;
    paymentId: string;
    screenshot: string;
  } | null>(null);
  const [viewingTicketPass, setViewingTicketPass] = useState<RegistrationRecord | null>(null);
  const [copiedUtrId, setCopiedUtrId] = useState<string | null>(null);
  const [actionToast, setActionToast] = useState<string | null>(null);
  const [resendingEmailId, setResendingEmailId] = useState<string | null>(null);

  // Lockout countdown timer
  useEffect(() => {
    if (lockoutRemaining <= 0) return;
    const timer = setInterval(() => {
      setLockoutRemaining(prev => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutRemaining]);

  // Set document title
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'NexusVerse 2K26 · Payment Verification Desk';
    }
  }, []);

  // Continuous background auto-refresh every 3s when logged in
  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isRefreshingRef.current) return;
      if (onRefreshRecords) {
        onRefreshRecords();
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAuthenticated, onRefreshRecords]);

  const handleManualRefresh = async () => {
    if (isRefreshingRef.current) return;
    isRefreshingRef.current = true;
    setIsRefreshing(true);
    try {
      if (onRefreshRecords) {
        await onRefreshRecords();
      }
    } finally {
      setTimeout(() => {
        isRefreshingRef.current = false;
        setIsRefreshing(false);
      }, 400);
    }
  };

  // Authentication submission (password: nexusk26)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockoutRemaining > 0) {
      setPasswordError(`Too many attempts. Cooldown active: wait ${lockoutRemaining}s.`);
      return;
    }

    const clean = passwordInput.trim();
    if (!clean) {
      setPasswordError('Please enter the verification password.');
      return;
    }

    setIsVerifyingLogin(true);
    setPasswordError('');

    let isAuthorized = false;

    // 1. Check server API endpoint
    try {
      const res = await fetch('/api/verify/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: clean })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          isAuthorized = true;
        }
      }
    } catch (err) {
      // Offline fallback
    }

    // 2. Direct client verification fallback (nexusk26 or kgr@2005)
    if (!isAuthorized) {
      if (clean === 'nexusk26' || clean === 'kgr@2005') {
        isAuthorized = true;
      }
    }

    if (isAuthorized) {
      setIsAuthenticated(true);
      setPasswordError('');
      setPasswordInput('');
      setLoginAttempts(0);
      try {
        sessionStorage.setItem('nexusverse_verify_auth', 'true');
      } catch (e) {}
      setIsVerifyingLogin(false);
      return;
    }

    // Failed
    const nextAttempts = loginAttempts + 1;
    setLoginAttempts(nextAttempts);
    if (nextAttempts >= 5) {
      setLockoutRemaining(60);
      setPasswordError('Access denied. Too many incorrect attempts. Locked for 60 seconds.');
    } else {
      setPasswordError(`Invalid verification key. Access denied. (${5 - nextAttempts} attempts remaining)`);
    }
    setIsVerifyingLogin(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    setPasswordError('');
    try {
      sessionStorage.removeItem('nexusverse_verify_auth');
    } catch (e) {}
  };

  // Toggle Verification status for a record
  const handleToggleVerification = async (record: RegistrationRecord) => {
    const isNowVerified = !record.isVerified;
    const updated: RegistrationRecord = {
      ...record,
      isVerified: isNowVerified,
      verifiedAt: isNowVerified ? new Date().toISOString() : undefined,
      verifiedBy: isNowVerified ? 'nexusverify' : undefined
    };

    onUpdateRecord(updated);

    if (isNowVerified) {
      try {
        confetti({
          particleCount: 70,
          spread: 70,
          origin: { y: 0.6 },
          colors: ['#4cc38a', '#f2c14e', '#ffffff']
        });
      } catch (e) {}

      // Automatically dispatch ticket pass email
      if (updated.email) {
        sendTicketEmailApi(updated)
          .then(res => {
            if (res.success) {
              setActionToast(`✅ ${record.name} verified & pass emailed to ${updated.email}!`);
            }
          })
          .catch(err => {
            console.warn('Auto email dispatch notice:', err);
          });
      }

      setActionToast(`✅ Payment for ${record.name} marked as VERIFIED! Ticket pass is active.`);
    } else {
      setActionToast(`Payment for ${record.name} marked as UNVERIFIED ⏳`);
    }

    setTimeout(() => setActionToast(null), 4000);
  };

  // Resend ticket email
  const handleResendEmail = async (record: RegistrationRecord) => {
    if (!record.email) {
      alert('This registration has no email address.');
      return;
    }
    setResendingEmailId(record.regId);
    try {
      const res = await sendTicketEmailApi(record);
      if (res.success) {
        setActionToast(`Ticket pass email dispatched to ${record.email}!`);
        setTimeout(() => setActionToast(null), 3500);
      } else {
        alert(res.error || 'Failed to dispatch email.');
      }
    } catch (err: any) {
      alert(err.message || 'Error dispatching ticket email.');
    } finally {
      setResendingEmailId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedUtrId(id);
      setTimeout(() => setCopiedUtrId(null), 2000);
    } catch (e) {}
  };

  // Filtered and sorted records (STRICT: no total counters / participant numbers displayed)
  const filteredRecords = useMemo(() => {
    return savedRecords.filter(rec => {
      // 1. Filter mode
      if (filterMode === 'pending') {
        // Pending UPI verification
        if (rec.paymentMode === 'razorpay') return false;
        if (rec.isVerified) return false;
      } else if (filterMode === 'verified') {
        if (!rec.isVerified) return false;
      }

      // 2. Event filter
      if (eventFilter !== 'all') {
        if (!rec.eventIds.includes(eventFilter)) return false;
      }

      // 3. Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const teammates = getRecordTeammates(rec);
        const matchMain = 
          (rec.name && rec.name.toLowerCase().includes(q)) ||
          (rec.roll && rec.roll.toLowerCase().includes(q)) ||
          (rec.phone && rec.phone.toLowerCase().includes(q)) ||
          (rec.email && rec.email.toLowerCase().includes(q)) ||
          (rec.regId && rec.regId.toLowerCase().includes(q)) ||
          (rec.paymentId && rec.paymentId.toLowerCase().includes(q));

        const matchTeammate = teammates.some(t => 
          (t.name && t.name.toLowerCase().includes(q)) ||
          (t.roll && t.roll.toLowerCase().includes(q)) ||
          (t.phone && t.phone.toLowerCase().includes(q))
        );

        if (!matchMain && !matchTeammate) return false;
      }

      return true;
    }).sort((a, b) => {
      if (sortBy === 'newest') {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      } else if (sortBy === 'oldest') {
        return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
      } else if (sortBy === 'name') {
        return (a.name || '').localeCompare(b.name || '');
      } else if (sortBy === 'amount') {
        return (b.totalPaid || 0) - (a.totalPaid || 0);
      }
      return 0;
    });
  }, [savedRecords, filterMode, eventFilter, searchQuery, sortBy]);

  // Count pending records for the badge
  const pendingCount = useMemo(() => {
    return savedRecords.filter(r => r.paymentMode !== 'razorpay' && !r.isVerified).length;
  }, [savedRecords]);

  // LOGIN SCREEN
  if (!isAuthenticated) {
    return (
      <div className={`min-h-screen flex flex-col justify-center items-center p-4 selection:bg-[#d4a935]/30 selection:text-[#f2c14e] ${
        isLight ? 'bg-[#f4f7fb] text-[#1c2833]' : 'bg-[#07070a] text-[#f3ecd9]'
      }`}>
        <div className={`max-w-md w-full p-8 sm:p-10 rounded-3xl border shadow-2xl text-center space-y-6 ${
          isLight ? 'bg-white border-[#d0dbe5]' : 'bg-[#111116] border-[#2e2b22]'
        }`}>
          <div className="w-16 h-16 rounded-2xl bg-[#1f1b0e] border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e] shadow-xl mx-auto">
            <Lock className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <div className="text-[10px] uppercase font-mono tracking-wider font-semibold text-[#f2c14e]">
              NexusVerse 2K26 · Verification Desk
            </div>
            <h2 className="text-xl sm:text-2xl font-bold">
              Payment Verification Portal
            </h2>
            <p className={`text-xs ${isLight ? 'text-[#5a6b7c]' : 'text-[#a79f8b]'}`}>
              Enter the verification password to inspect UPI receipts and confirm registrations.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 text-left">
            <div className="space-y-1">
              <label className="text-[11px] font-semibold uppercase tracking-wider block opacity-80">
                Verification Key
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter Key (nexusk26)"
                  disabled={lockoutRemaining > 0}
                  className={`w-full px-4 py-3 rounded-xl border text-sm font-mono pr-11 focus:outline-none focus:border-[#d4a935] ${
                    isLight 
                      ? 'bg-[#f9fafc] border-[#ccd8e4] text-[#1c2833]' 
                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#f3ecd9]'
                  }`}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs opacity-60 hover:opacity-100 cursor-pointer p-1"
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>

            {passwordError && (
              <div className="p-3 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isVerifyingLogin || lockoutRemaining > 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-black font-bold text-sm hover:brightness-110 active:scale-[0.99] transition-all cursor-pointer shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isVerifyingLogin ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Checking Key...</span>
                </>
              ) : (
                <>
                  <Unlock className="w-4 h-4" />
                  <span>Unlock Verification Desk</span>
                </>
              )}
            </button>
          </form>

          <div className="pt-2 border-t border-dashed border-[#2e2b22]/40">
            <a
              href="/"
              className="text-xs text-[#a79f8b] hover:text-[#f2c14e] transition-colors underline"
            >
              &larr; Return to Public Website
            </a>
          </div>
        </div>
      </div>
    );
  }

  // AUTHENTICATED VERIFICATION DESK
  return (
    <div className={`min-h-screen flex flex-col selection:bg-[#d4a935]/30 selection:text-[#f2c14e] ${
      isLight ? 'bg-[#f4f7fb] text-[#1c2833]' : 'bg-[#07070a] text-[#f3ecd9]'
    }`}>
      
      {/* TOP HEADER */}
      <header className={`p-4 sm:p-5 border-b shrink-0 flex items-center justify-between shadow-md ${
        isLight ? 'bg-white border-[#d8e2ec]' : 'bg-gradient-to-r from-[#181820] via-[#1f1b0e] to-[#181820] border-[#2e2b22]'
      }`}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#d4a935]/20 border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e] shadow-md shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] sm:text-[11px] text-[#f2c14e] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
              <span>NexusVerse 2K26</span>
              <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] animate-pulse" />
              <span>Payment Verification Desk</span>
            </div>
            <h1 className={`text-sm sm:text-lg font-bold leading-tight ${isLight ? 'text-[#102a43]' : 'text-white'}`}>
              Delegate UPI Payment Verification Portal
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Continuous Auto-Refresh Status */}
          <button
            type="button"
            onClick={handleManualRefresh}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLight 
                ? 'bg-[#f0f9f4] border-[#a5d6a7] text-[#1b5e39] hover:bg-[#e2f3e8]' 
                : 'border-[#2e2b22] text-[#4cc38a] hover:bg-[#142617] hover:border-[#4cc38a]/40'
            }`}
            title="Auto-refreshing every 3s. Click to refresh instantly."
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#4cc38a] ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Live 3s</span>
          </button>

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={handleThemeToggle}
            className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLight
                ? 'bg-white border-[#ccd8e4] text-[#825c00] hover:bg-[#faf6e8]'
                : 'border-[#2e2b22] text-[#f2c14e] hover:bg-[#1f1b0e] hover:border-[#d4a935]/40'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-[#825c00]" />
                <span className="hidden sm:inline">Dark</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-[#f2c14e]" />
                <span className="hidden sm:inline">Light</span>
              </>
            )}
          </button>

          {/* Lock Session */}
          <button
            type="button"
            onClick={handleLogout}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] hover:bg-[#ff8a80]/20 transition-colors cursor-pointer"
            title="Lock verification session"
          >
            Lock Session
          </button>

          <a
            href="/"
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer shadow-sm ${
              isLight 
                ? 'bg-white border-[#ccd8e4] text-[#334e68] hover:text-[#102a43]' 
                : 'border-[#2e2b22] text-[#f3ecd9] hover:text-[#f2c14e] hover:bg-[#1f1b0e]'
            }`}
          >
            <span>&larr; View Live Website</span>
          </a>
        </div>
      </header>

      {/* FILTER & SEARCH BAR (Strict: No total numbers or stats) */}
      <div className={`p-4 border-b shrink-0 flex flex-wrap items-center justify-between gap-3 ${
        isLight ? 'bg-[#fbfcfe] border-[#d8e2ec]' : 'bg-[#0a0a0d] border-[#2e2b22]'
      }`}>
        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            type="button"
            onClick={() => setFilterMode('pending')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'pending'
                ? 'bg-gradient-to-r from-[#2e250f] to-[#3a2f14] text-[#f2c14e] border border-[#d4a935] shadow-md'
                : isLight 
                  ? 'bg-white text-[#52606d] border border-[#ccd8e4] hover:bg-[#f0f4f8]'
                  : 'text-[#a79f8b] hover:text-white border border-transparent'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-[#f2c14e]" />
            <span>Pending UPI Verification</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#f2c14e] text-black font-black">
                {pendingCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('verified')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'verified'
                ? 'bg-[#0d2a1c] text-[#4cc38a] border border-[#4cc38a]/60 shadow-md'
                : isLight 
                  ? 'bg-white text-[#52606d] border border-[#ccd8e4] hover:bg-[#f0f4f8]'
                  : 'text-[#a79f8b] hover:text-white border border-transparent'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
            <span>Verified Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              filterMode === 'all'
                ? isLight
                  ? 'bg-[#e2e8f0] text-[#1e293b] border border-[#cbd5e1]'
                  : 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/50'
                : isLight 
                  ? 'bg-white text-[#52606d] border border-[#ccd8e4] hover:bg-[#f0f4f8]'
                  : 'text-[#a79f8b] hover:text-white border border-transparent'
            }`}
          >
            <span>All Registrations</span>
          </button>
        </div>

        {/* Search, Event, and Sort Controls */}
        <div className="flex flex-wrap items-center gap-2 flex-1 max-w-2xl justify-end">
          {/* Search Input */}
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search name, roll no, phone, UTR/ref ID, email..."
              className={`w-full pl-9 pr-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-[#d4a935] ${
                isLight 
                  ? 'bg-white border-[#ccd8e4] text-[#1c2833]' 
                  : 'bg-[#111116] border-[#2e2b22] text-[#f3ecd9]'
              }`}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs opacity-50 hover:opacity-100"
              >
                ✕
              </button>
            )}
          </div>

          {/* Event Filter */}
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
            className={`px-2.5 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-[#d4a935] ${
              isLight 
                ? 'bg-white border-[#ccd8e4] text-[#1c2833]' 
                : 'bg-[#111116] border-[#2e2b22] text-[#f3ecd9]'
            }`}
          >
            <option value="all">All Events</option>
            {ALL_EVENTS.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.title}</option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className={`px-2.5 py-1.5 rounded-xl text-xs border focus:outline-none focus:border-[#d4a935] ${
              isLight 
                ? 'bg-white border-[#ccd8e4] text-[#1c2833]' 
                : 'bg-[#111116] border-[#2e2b22] text-[#f3ecd9]'
            }`}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="name">Name A-Z</option>
            <option value="amount">Amount High-to-Low</option>
          </select>
        </div>
      </div>

      {/* MAIN CARDS LIST */}
      <main className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-3">
        {filteredRecords.length === 0 ? (
          <div className={`p-12 text-center rounded-2xl border space-y-3 max-w-md mx-auto my-12 ${
            isLight ? 'bg-white border-[#d8e2ec]' : 'bg-[#111116] border-[#2e2b22]'
          }`}>
            <div className="w-12 h-12 rounded-full bg-[#1f1b0e] border border-[#d4a935]/40 flex items-center justify-center text-[#f2c14e] mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="font-bold text-base">No registrations matching this filter</h3>
            <p className={`text-xs ${isLight ? 'text-[#52606d]' : 'text-[#a79f8b]'}`}>
              {filterMode === 'pending'
                ? 'All UPI payments are currently verified! Check back when new registrations arrive.'
                : 'Try adjusting your search query or event filter.'}
            </p>
          </div>
        ) : (
          filteredRecords.map((record) => {
            const teammates = getRecordTeammates(record);
            const receiptImg = record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot;
            const eventNames = record.eventIds.map(id => {
              const ev = ALL_EVENTS.find(e => e.id === id);
              return ev ? ev.title : id.toUpperCase();
            });

            return (
              <div
                key={record.regId}
                className={`p-4 sm:p-5 rounded-2xl border transition-all space-y-4 shadow-sm ${
                  record.isVerified
                    ? isLight
                      ? 'bg-white border-[#b7dfcb] hover:border-[#4cc38a]'
                      : 'bg-[#0b100e] border-[#1d3326] hover:border-[#4cc38a]/50'
                    : isLight
                      ? 'bg-[#fffdfa] border-[#e8d5a7] hover:border-[#d4a935]'
                      : 'bg-[#111116] border-[#2e2b22] hover:border-[#d4a935]/60'
                }`}
              >
                {/* Top Row: Delegate Name, Roll, Pass ID, Badges */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 font-bold">
                        {record.regId}
                      </span>
                      <h3 className="font-bold text-base sm:text-lg">
                        {record.name}
                      </h3>
                      <span className={`text-xs font-mono font-semibold ${isLight ? 'text-[#52606d]' : 'text-[#a79f8b]'}`}>
                        ({record.roll})
                      </span>
                      {record.isIeeeMember ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#00629b]/20 text-[#00629b] border border-[#00629b]/40 font-bold">
                          IEEE ({record.ieeeId || 'Active'})
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#334e68]/20 text-[#52606d] border border-[#334e68]/30 font-semibold">
                          Non-IEEE
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-0.5">
                      {eventNames.map((name, i) => (
                        <span
                          key={i}
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-[#0d233a] text-[#70baff] border border-[#0088d4]/30"
                        >
                          {name}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Payment Verification Status Badge */}
                  <div className="shrink-0 flex items-center gap-2">
                    {record.paymentMode === 'upi' ? (
                      record.isVerified ? (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#0d2a1c] text-[#4cc38a] border border-[#4cc38a]/50 flex items-center gap-1.5 shadow-sm">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>UPI Verified ✓</span>
                        </span>
                      ) : (
                        <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#2e250f] text-[#f2c14e] border border-[#d4a935] flex items-center gap-1.5 shadow-sm">
                          <Clock className="w-3.5 h-3.5 text-[#f2c14e] animate-pulse" />
                          <span>UPI · Pending Verification</span>
                        </span>
                      )
                    ) : (
                      <span className="px-3 py-1 rounded-xl text-xs font-bold bg-[#0c1f33] text-[#70baff] border border-[#0088d4]/40 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Razorpay (Auto Verified)</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Team Details (If Team) */}
                {teammates.length > 0 && (
                  <div className={`p-3 rounded-xl border text-xs space-y-1.5 ${
                    isLight ? 'bg-[#f8fafc] border-[#e2e8f0]' : 'bg-[#0e0e13] border-[#22222b]'
                  }`}>
                    <div className="flex items-center gap-1.5 font-bold text-[#f2c14e]">
                      <Users className="w-3.5 h-3.5" />
                      <span>Team: {teammates.length + 1} Members</span>
                    </div>
                    <div className="flex flex-wrap gap-2 text-[11px]">
                      <span className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                        Lead: <strong>{record.name}</strong> ({record.roll})
                      </span>
                      {teammates.map((m, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                          M{idx + 2}: <strong>{m.name}</strong> ({m.roll})
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact & College Info */}
                <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 text-xs ${
                  isLight ? 'text-[#334e68]' : 'text-[#a79f8b]'
                }`}>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">College</span>
                    <span className="font-semibold">{record.college}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Department & Year</span>
                    <span className="font-semibold">{record.dept} · {record.year}</span>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Phone</span>
                    <a href={`tel:${record.phone}`} className="font-mono hover:underline hover:text-[#f2c14e]">
                      {record.phone}
                    </a>
                  </div>
                  <div>
                    <span className="opacity-60 block text-[10px] uppercase">Email</span>
                    <a href={`mailto:${record.email}`} className="font-mono hover:underline hover:text-[#f2c14e] truncate block">
                      {record.email}
                    </a>
                  </div>
                </div>

                {/* Payment Review Box */}
                <div className={`p-3.5 rounded-xl border flex flex-wrap items-center justify-between gap-3 ${
                  isLight ? 'bg-[#f3f7fa] border-[#ccd8e4]' : 'bg-[#0a0a0d] border-[#252530]'
                }`}>
                  <div className="flex flex-wrap items-center gap-4">
                    {/* Amount */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider block opacity-70">Amount Paid</span>
                      <span className="text-lg font-bold font-mono text-[#f2c14e]">
                        ₹{record.totalPaid}
                      </span>
                    </div>

                    {/* Mode */}
                    <div>
                      <span className="text-[10px] uppercase tracking-wider block opacity-70">Payment Mode</span>
                      <span className="text-xs font-bold font-mono uppercase">
                        {record.paymentMode || 'UPI'}
                      </span>
                    </div>

                    {/* Transaction Reference / UTR ID */}
                    <div className="space-y-0.5">
                      <span className="text-[10px] uppercase tracking-wider block opacity-70">Transaction UTR / Ref ID</span>
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs font-mono font-bold text-[#4cc38a] px-2 py-0.5 rounded bg-black/40 border border-white/10">
                          {record.paymentId}
                        </code>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(record.paymentId, record.regId)}
                          className="p-1 text-xs opacity-60 hover:opacity-100 hover:text-[#f2c14e] cursor-pointer"
                          title="Copy Transaction ID"
                        >
                          {copiedUtrId === record.regId ? (
                            <Check className="w-3.5 h-3.5 text-[#4cc38a]" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Screenshot Thumbnail Preview */}
                    {receiptImg && (
                      <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                        <button
                          type="button"
                          onClick={() => setViewingReceipt({
                            name: record.name,
                            roll: record.roll,
                            paymentId: record.paymentId,
                            screenshot: receiptImg
                          })}
                          className="group relative cursor-pointer block rounded-lg overflow-hidden border border-[#d4a935]/40 hover:border-[#d4a935] shadow"
                        >
                          <img
                            src={receiptImg}
                            alt="Receipt"
                            className="w-12 h-12 object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 group-hover:bg-transparent flex items-center justify-center transition-colors">
                            <Eye className="w-3.5 h-3.5 text-white drop-shadow" />
                          </div>
                        </button>
                        <span className="text-[10px] text-[#a79f8b] max-w-[100px] leading-tight hidden md:inline">
                          Delegate Proof Uploaded
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Actions for this delegate */}
                  <div className="flex flex-wrap items-center gap-2 ml-auto">
                    {/* View Full Receipt */}
                    {receiptImg && (
                      <button
                        type="button"
                        onClick={() => setViewingReceipt({
                          name: record.name,
                          roll: record.roll,
                          paymentId: record.paymentId,
                          screenshot: receiptImg
                        })}
                        className="px-3 py-2 rounded-xl text-xs font-bold bg-[#1b5e39] hover:bg-[#27ae60] text-white flex items-center gap-1.5 shadow transition-all cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>View Receipt</span>
                      </button>
                    )}

                    {/* Preview Ticket Pass */}
                    <button
                      type="button"
                      onClick={() => setViewingTicketPass(record)}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                        isLight 
                          ? 'bg-white border-[#ccd8e4] text-[#334e68] hover:bg-[#f0f4f8]' 
                          : 'bg-[#181822] border-[#2e2b22] text-[#f3ecd9] hover:border-[#d4a935]'
                      }`}
                    >
                      <Ticket className="w-3.5 h-3.5 text-[#f2c14e]" />
                      <span>Inspect Pass</span>
                    </button>

                    {/* Resend Email (if verified) */}
                    {record.isVerified && record.email && (
                      <button
                        type="button"
                        onClick={() => handleResendEmail(record)}
                        disabled={resendingEmailId === record.regId}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold border flex items-center gap-1.5 cursor-pointer ${
                          isLight 
                            ? 'bg-white border-[#ccd8e4] text-[#334e68] hover:bg-[#f0f4f8]' 
                            : 'bg-[#181822] border-[#2e2b22] text-[#a79f8b] hover:text-white'
                        }`}
                        title="Resend ticket pass confirmation email"
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{resendingEmailId === record.regId ? 'Sending...' : 'Email Pass'}</span>
                      </button>
                    )}

                    {/* Main Verification Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleVerification(record)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer active:scale-95 ${
                        record.isVerified
                          ? 'bg-[#0d2a1c] border border-[#4cc38a] text-[#4cc38a] hover:bg-[#153e2a]'
                          : 'bg-gradient-to-r from-[#d4a935] via-[#f2c14e] to-[#d4a935] text-black hover:brightness-110'
                      }`}
                    >
                      {record.isVerified ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 text-[#4cc38a]" />
                          <span>Verified ✓ (Unverify)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Verify UPI Payment ✓</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </main>

      {/* RECEIPT MODAL LIGHTBOX */}
      {viewingReceipt && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in"
          onClick={() => setViewingReceipt(null)}
        >
          <div
            className="bg-[#111116] border-2 border-[#d4a935]/70 rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 border-b border-[#2e2b22] flex items-center justify-between bg-[#181822]">
              <div>
                <h4 className="font-bold text-white text-base">
                  UPI Payment Receipt · {viewingReceipt.name}
                </h4>
                <span className="text-xs text-[#a79f8b] font-mono block">
                  Roll: {viewingReceipt.roll} · UTR: {viewingReceipt.paymentId}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setViewingReceipt(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Receipt Image */}
            <div className="p-4 flex-1 flex items-center justify-center overflow-auto bg-black/80 min-h-[300px]">
              <img
                src={viewingReceipt.screenshot}
                alt="Payment Receipt"
                className="max-h-[65vh] max-w-full object-contain rounded-xl border border-white/10 shadow-2xl"
              />
            </div>

            {/* Footer */}
            <div className="p-3 border-t border-[#2e2b22] flex items-center justify-between bg-[#0a0a0d]">
              <span className="text-xs text-[#4cc38a] flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4" />
                <span>Uploaded by delegate during registration</span>
              </span>
              <div className="flex items-center gap-2">
                <a
                  href={viewingReceipt.screenshot}
                  download={`receipt_${viewingReceipt.roll || 'upi'}.jpg`}
                  className="px-3 py-1.5 rounded-lg bg-[#1b5e39] hover:bg-[#27ae60] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Image</span>
                </a>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="px-3 py-1.5 rounded-lg bg-white/10 text-white font-semibold text-xs cursor-pointer hover:bg-white/20"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TICKET PASS INSPECT MODAL */}
      {viewingTicketPass && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in"
          onClick={() => setViewingTicketPass(null)}
        >
          <div
            className="bg-[#111116] border-2 border-[#d4a935]/70 rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2e2b22]">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e]">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">
                    Ticket Pass Preview · {viewingTicketPass.name}
                  </h4>
                  <span className="text-xs text-[#a79f8b] font-mono">
                    Pass ID: {viewingTicketPass.regId} · {viewingTicketPass.isVerified ? '✓ VERIFIED' : '⏳ PENDING'}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleVerification(viewingTicketPass)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer ${
                    viewingTicketPass.isVerified
                      ? 'bg-[#0d2a1c] border border-[#4cc38a] text-[#4cc38a]'
                      : 'bg-[#d4a935] text-black hover:bg-[#f2c14e]'
                  }`}
                >
                  {viewingTicketPass.isVerified ? 'Mark as Unverified' : 'Verify Pass Now ✓'}
                </button>
                <button
                  type="button"
                  onClick={() => setViewingTicketPass(null)}
                  className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <TicketPass
              record={viewingTicketPass}
              events={ALL_EVENTS}
              onReset={() => setViewingTicketPass(null)}
              leftLogo={leftLogo}
              rightLogo={rightLogo}
            />
          </div>
        </div>
      )}

      {/* FLOATING ACTION TOAST */}
      {actionToast && (
        <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#0f2e1e] border-2 border-[#4cc38a] text-[#4cc38a] text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0" />
          <span>{actionToast}</span>
        </div>
      )}

    </div>
  );
};
