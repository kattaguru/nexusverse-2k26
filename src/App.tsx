import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { GallerySection } from './components/GallerySection';
import { EventModal } from './components/EventModal';
import { PaymentModal } from './components/PaymentModal';
import { TicketPass, RegistrationRecord, TeamMemberInfo } from './components/TicketPass';
import { UpiConfirmationView } from './components/UpiConfirmationView';
import { PassLookupModal } from './components/PassLookupModal';
import { AdminModal } from './components/AdminModal';
import { ParticipantSpaceModal } from './components/ParticipantSpaceModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { PreRegistrationEventsShowcase } from './components/PreRegistrationEventsShowcase';
import { 
  ParticipantUser, 
  getStoredParticipant, 
  saveStoredParticipant, 
  fetchCurrentParticipant,
  googleLoginParticipant,
  logoutParticipant 
} from './services/auth';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import { getLeftLogo, getRightLogo, setLeftLogo, setRightLogo } from './utils/logoManager';
import { 
  saveFormDraft, 
  loadFormDraft, 
  clearFormDraft, 
  formatDraftAge 
} from './utils/formCache';
import { registerServiceWorker } from './utils/cacheManager';
import { computeDelegatesStats, getRecordTeammates } from './utils/delegateStats';
import { TimelineSection } from './components/TimelineSection';
import { FaqSection } from './components/FaqSection';
import { ContactSection } from './components/ContactSection';
import { Footer } from './components/Footer';
import { EVENTS, SPOT_EVENT, ALL_EVENTS, SYMPOSIUM_CONFIG, SymposiumEvent } from './data/symposiumData';
import { 
  fetchRegistrationsApi, 
  saveRegistrationApi, 
  updateRegistrationApi, 
  deleteRegistrationApi, 
  fetchSettingsApi, 
  updateSettingsApi,
  sendTicketEmailApi
} from './services/api';
import { 
  ShieldCheck, 
  Info, 
  Sparkles, 
  Check, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Users, 
  Layers, 
  Phone, 
  User, 
  Award,
  ChevronRight,
  Shield,
  Trophy,
  ArrowRight,
  CheckCircle2,
  Utensils
} from 'lucide-react';

export interface FormTeamMember {
  name: string;
  roll: string;
  className: string;
  section: string;
  branch: string;
  year: string;
  phone: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
  wantsFood?: boolean;
}

export interface FormEventTeamData {
  teamName: string;
  projectTitle?: string;
  members: FormTeamMember[];
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallbackTitle?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('NexusVerse ErrorBoundary caught error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-6 my-4 rounded-2xl bg-[#14141d] border border-[#d4a935]/40 text-center space-y-3 max-w-lg mx-auto">
          <div className="w-10 h-10 rounded-full bg-[#2a1315] text-[#ff8a80] border border-[#ff8a80]/30 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5" />
          </div>
          <h4 className="font-bold text-white text-base">
            {this.props.fallbackTitle || 'Something went wrong loading this view'}
          </h4>
          <p className="text-xs text-[#a79f8b]">
            Your registration details are safely recorded. Please try refreshing or reopening the space.
          </p>
          <button
            type="button"
            onClick={() => {
              this.setState({ hasError: false });
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-[#f2c14e] text-black font-bold text-xs hover:bg-[#d4a935] cursor-pointer"
          >
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function App() {
  // Participant form fields (Lead / Individual)
  const [name, setName] = useState('');
  const [roll, setRoll] = useState('');
  const [classNameVal, setClassNameVal] = useState('B.Tech');
  const [sectionVal, setSectionVal] = useState('A');
  const [dept, setDept] = useState('');
  const [year, setYear] = useState('3rd Year');
  const [phone, setPhone] = useState('');
  const [college, setCollege] = useState('N.B.K.R. Institute of Science & Technology');
  const [email, setEmail] = useState('');
  const [isIeeeMember, setIsIeeeMember] = useState(false);
  const [ieeeId, setIeeeId] = useState('');
  const [wantsFood, setWantsFood] = useState(false);
  
  // Selected single technical event (or empty if attending only spot events)
  const [selectedEvents, setSelectedEvents] = useState<string[]>(['ctf']);
  // Spot Events (Non-Technical, ₹100)
  const [includeSpotEvents, setIncludeSpotEvents] = useState<boolean>(false);
  // Spot Events Delegate Selection for Teams ({ lead: boolean, [memberIndex: number]: boolean })
  const [spotMembersSelected, setSpotMembersSelected] = useState<{ lead: boolean; [key: number]: boolean }>({
    lead: true,
    0: true
  });
  // Warning message if user tries to deselect their last remaining event
  const [eventWarning, setEventWarning] = useState<string>('');
  const warningTimerRef = useRef<any>(null);

  const triggerEventWarning = (msg: string) => {
    if (warningTimerRef.current) clearTimeout(warningTimerRef.current);
    setEventWarning(msg);
    warningTimerRef.current = setTimeout(() => {
      setEventWarning('');
    }, 3500);
  };

  // Structured Team Details for team events
  const [teamDetails, setTeamDetails] = useState<Record<string, FormEventTeamData>>({
    ctf: {
      teamName: '',
      members: [
        { name: '', roll: '', className: 'B.Tech', section: 'A', branch: '', year: '3rd Year', phone: '', isIeeeMember: false, ieeeId: '', wantsFood: false }
      ]
    },
    expo: {
      teamName: '',
      projectTitle: '',
      members: []
    },
    bug: {
      teamName: '',
      projectTitle: '',
      members: []
    },
    code: {
      teamName: '',
      members: []
    },
    canva: {
      teamName: '',
      members: []
    }
  });

  // Terms
  const [termsAccepted, setTermsAccepted] = useState(false);

  // Field errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Modals and Active View states
  const [inspectEvent, setInspectEvent] = useState<SymposiumEvent | null>(null);
  const [isPaymentOpen, setIsPaymentOpen] = useState(false);
  const [isLookupOpen, setIsLookupOpen] = useState(false);
  const [confirmedRecord, setConfirmedRecord] = useState<RegistrationRecord | null>(null);
  const [upiPendingRecord, setUpiPendingRecord] = useState<RegistrationRecord | null>(null);
  const [savedRecords, setSavedRecords] = useState<RegistrationRecord[]>([]);
  const [isScannedPass, setIsScannedPass] = useState(false);
  // Pass link (?passId=...) is held here until we confirm the logged-in user owns it
  const [pendingPassRecord, setPendingPassRecord] = useState<RegistrationRecord | null>(null);
  const [passAccessDenied, setPassAccessDenied] = useState<'login' | 'not_owner' | null>(null);

  // Form Draft Cache Memory State
  const [draftRestoredNotice, setDraftRestoredNotice] = useState<{ age: string; timestamp: number } | null>(null);
  const [isDraftSaved, setIsDraftSaved] = useState<boolean>(false);
  const draftSaveTimerRef = useRef<any>(null);

  // Initialize Service Worker for Offline PWA and Asset Caching
  useEffect(() => {
    registerServiceWorker();
  }, []);

  // Restore Form Draft from Cache Memory on initial load
  useEffect(() => {
    const draft = loadFormDraft();
    if (draft) {
      if (draft.name) setName(draft.name);
      if (draft.roll) setRoll(draft.roll);
      if (draft.classNameVal) setClassNameVal(draft.classNameVal);
      if (draft.sectionVal) setSectionVal(draft.sectionVal);
      if (draft.dept) setDept(draft.dept);
      if (draft.year) setYear(draft.year);
      if (draft.phone) setPhone(draft.phone);
      if (draft.college) setCollege(draft.college);
      if (draft.email) setEmail(draft.email);
      if (draft.isIeeeMember !== undefined) setIsIeeeMember(draft.isIeeeMember);
      if (draft.ieeeId) setIeeeId(draft.ieeeId);
      if (draft.wantsFood !== undefined) setWantsFood(draft.wantsFood);
      if (draft.selectedEvents && draft.selectedEvents.length > 0) setSelectedEvents(draft.selectedEvents);
      if (draft.includeSpotEvents !== undefined) setIncludeSpotEvents(draft.includeSpotEvents);
      if (draft.spotMembersSelected) setSpotMembersSelected(draft.spotMembersSelected);
      if (draft.teamDetails && Object.keys(draft.teamDetails).length > 0) {
        setTeamDetails(prev => ({ ...prev, ...draft.teamDetails }));
      }
      if (draft.termsAccepted !== undefined) setTermsAccepted(draft.termsAccepted);

      setDraftRestoredNotice({
        age: formatDraftAge(draft.savedAt),
        timestamp: draft.savedAt
      });
      setIsDraftSaved(true);
    }
  }, []);

  // Auto-save form draft to Cache Memory in background with 400ms debounce
  useEffect(() => {
    if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    draftSaveTimerRef.current = setTimeout(() => {
      const saved = saveFormDraft({
        name,
        roll,
        classNameVal,
        sectionVal,
        dept,
        year,
        phone,
        college,
        email,
        isIeeeMember,
        ieeeId,
        wantsFood,
        selectedEvents,
        includeSpotEvents,
        spotMembersSelected,
        teamDetails,
        termsAccepted
      });
      if (saved) {
        setIsDraftSaved(true);
      }
    }, 400);

    return () => {
      if (draftSaveTimerRef.current) clearTimeout(draftSaveTimerRef.current);
    };
  }, [
    name,
    roll,
    classNameVal,
    sectionVal,
    dept,
    year,
    phone,
    college,
    email,
    isIeeeMember,
    ieeeId,
    selectedEvents,
    includeSpotEvents,
    spotMembersSelected,
    teamDetails,
    termsAccepted
  ]);

  // Participant User Session & Space Modal State
  const [currentUser, setCurrentUser] = useState<ParticipantUser | null>(() => getStoredParticipant());
  const [isParticipantSpaceOpen, setIsParticipantSpaceOpen] = useState(false);
  const [participantSpaceInitialMode, setParticipantSpaceInitialMode] = useState<'signin' | 'signup'>('signup');

  // Auto-populate registration form when participant space user is authenticated
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName(currentUser.name);
      if (currentUser.email) setEmail(currentUser.email);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.college) setCollege(currentUser.college);
      if (currentUser.roll) setRoll(currentUser.roll);
      if (currentUser.branch) setDept(currentUser.branch);
      if (currentUser.year) setYear(currentUser.year);
      if (currentUser.isIeeeMember) {
        setIsIeeeMember(true);
        if (currentUser.ieeeId) setIeeeId(currentUser.ieeeId);
      }
    }
  }, [currentUser]);

  const handleLogoutParticipant = async () => {
    await logoutParticipant();
    setCurrentUser(null);
    // Never leave a pass visible after logout
    setConfirmedRecord(null);
    setIsScannedPass(false);
  };

  // Does the logged-in participant (or verified admin session) own this registration?
  const userOwnsRecord = (rec: RegistrationRecord, user: ParticipantUser | null): boolean => {
    if (!rec) return false;

    // Authorized Admin / Verification Desk session override
    try {
      if (typeof window !== 'undefined' && window.sessionStorage) {
        if (
          sessionStorage.getItem('nexusverse_admin_auth') === 'true' ||
          sessionStorage.getItem('nexusverse_verify_auth') === 'true'
        ) {
          return true;
        }
      }
    } catch {}

    if (!user) return false;

    const norm = (v?: string) => (v || '').trim().toLowerCase();
    const normUpper = (v?: string) => (v || '').trim().toUpperCase();
    const cleanPhoneDigits = (v?: string) => {
      const d = (v || '').replace(/\D/g, '');
      return d.length >= 10 ? d.slice(-10) : '';
    };

    const uId = user.id;
    const uEmail = norm(user.email);
    const uRoll = normUpper(user.roll);
    const uUsername = normUpper(user.username);
    const uEmailPrefix = user.email ? normUpper(user.email.split('@')[0]) : '';
    const uPhoneTen = cleanPhoneDigits(user.phone);

    const rEmail = norm(rec.email);
    const rRoll = normUpper(rec.roll);
    const rPhoneTen = cleanPhoneDigits(rec.phone);

    // 1. Direct Primary Registrant Match
    const matchesPrimary = Boolean(
      (uId && rec.userId && rec.userId === uId) ||
      (uEmail && rEmail === uEmail) ||
      (uRoll && rRoll === uRoll) ||
      (uUsername && rRoll === uUsername) ||
      (uEmailPrefix && rRoll === uEmailPrefix) ||
      (uPhoneTen && rPhoneTen && uPhoneTen === rPhoneTen)
    );
    if (matchesPrimary) return true;

    // 2. Team Member / Delegate Match
    const teammates = getRecordTeammates(rec);
    return teammates.some((m: any) => {
      const mRoll = normUpper(m.roll);
      const mEmail = norm(m.email);
      const mPhoneTen = cleanPhoneDigits(m.phone);

      return Boolean(
        (uRoll && mRoll === uRoll) ||
        (uUsername && mRoll === uUsername) ||
        (uEmailPrefix && mRoll === uEmailPrefix) ||
        (uEmail && mEmail === uEmail) ||
        (uPhoneTen && mPhoneTen && uPhoneTen === mPhoneTen)
      );
    });
  };

  // Pass-link ownership gate: re-evaluated whenever login state changes
  useEffect(() => {
    if (!pendingPassRecord) return;
    if (userOwnsRecord(pendingPassRecord, currentUser)) {
      setConfirmedRecord(pendingPassRecord);
      setUpiPendingRecord(null);
      setIsScannedPass(true);
      setPassAccessDenied(null);
      setPendingPassRecord(null);
      setIsParticipantSpaceOpen(false);
      setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 300);
      return;
    }

    if (!currentUser) {
      setPassAccessDenied('login');
      setConfirmedRecord(null);
      setIsScannedPass(false);
    } else {
      setPassAccessDenied('not_owner');
      setConfirmedRecord(null);
      setIsScannedPass(false);
    }
  }, [pendingPassRecord, currentUser]);

  // Sync fresh participant data on mount if logged in
  useEffect(() => {
    const user = getStoredParticipant();
    if (user?.id) {
      fetchCurrentParticipant(user.id).then(res => {
        if (res.success && res.user) {
          setCurrentUser(res.user);
        }
      }).catch(() => {});
    }
  }, []);

  // Listen for Supabase OAuth login events (Google OAuth popup or redirect)
  useEffect(() => {
    // If this window is an OAuth popup callback, notify parent window and close
    if (typeof window !== 'undefined' && window.opener && window.opener !== window) {
      if (window.location.hash.includes('access_token') || window.location.search.includes('code=')) {
        try {
          window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
          window.close();
          return;
        } catch {
          // Fallback to normal execution if window.opener is inaccessible
        }
      }
    }

    if (isSupabaseConfigured() && supabase) {
      const hasAuthHash = typeof window !== 'undefined' && (
        window.location.hash.includes('access_token') || 
        window.location.hash.includes('refresh_token') ||
        window.location.search.includes('code=')
      );

      // If returning from Google redirect, immediately reveal Participant Space portal
      if (hasAuthHash) {
        setIsParticipantSpaceOpen(true);
      }

      const syncSessionUser = async (session: any) => {
        if (!session?.user?.email) return;
        try {
          const googleRes = await googleLoginParticipant({
            email: session.user.email,
            name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email.split('@')[0],
            avatarUrl: session.user.user_metadata?.avatar_url,
          });
          if (googleRes.success && googleRes.user) {
            setCurrentUser(googleRes.user);
            setIsParticipantSpaceOpen(true);
            // Clean up trailing # or tokens from URL without triggering reload
            if (window.location.hash) {
              window.history.replaceState(null, '', window.location.pathname + window.location.search);
            }
          }
        } catch (e) {
          console.error('Failed to sync Google participant session:', e);
        }
      };

      // 1. Check existing OAuth session on return
      supabase.auth.getSession().then(({ data }) => {
        if (data?.session) {
          syncSessionUser(data.session);
        }
      });

      // 2. Listen for all auth state events (INITIAL_SESSION, SIGNED_IN, USER_UPDATED, TOKEN_REFRESHED)
      const { data: authSub } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user?.email && (
          event === 'SIGNED_IN' || 
          event === 'INITIAL_SESSION' || 
          event === 'USER_UPDATED' || 
          event === 'TOKEN_REFRESHED'
        )) {
          syncSessionUser(session);
        }
      });

      // 3. Listen for popup message completion (even across origins)
      const handlePopupMessage = async (e: MessageEvent) => {
        if (e.data?.type === 'GOOGLE_AUTH_SUCCESS') {
          if (e.data.hash && supabase) {
            try {
              const hashParams = new URLSearchParams(e.data.hash.replace(/^#/, ''));
              const accessToken = hashParams.get('access_token');
              const refreshToken = hashParams.get('refresh_token');
              if (accessToken && refreshToken) {
                const { data } = await supabase.auth.setSession({
                  access_token: accessToken,
                  refresh_token: refreshToken
                });
                if (data?.session) {
                  syncSessionUser(data.session);
                  return;
                }
              }
            } catch (err) {
              console.warn('Notice parsing popup tokens:', err);
            }
          }

          if (supabase) {
            supabase.auth.getSession().then(({ data }) => {
              if (data?.session) {
                syncSessionUser(data.session);
              }
            });
          }
        }
      };
      window.addEventListener('message', handlePopupMessage);

      return () => {
        authSub?.subscription?.unsubscribe();
        window.removeEventListener('message', handlePopupMessage);
      };
    }
  }, []);

  // Pre-fill form from user space profile
  const handlePrefillFromUser = (user: Partial<ParticipantUser>) => {
    if (user.name) setName(user.name);
    if (user.email) setEmail(user.email);
    if (user.phone) setPhone(user.phone);
    if (user.college) setCollege(user.college);
    if (user.roll) setRoll(user.roll);
    if (user.branch) setDept(user.branch);
    if (user.year) setYear(user.year);
    if (user.isIeeeMember) {
      setIsIeeeMember(true);
      if (user.ieeeId) setIeeeId(user.ieeeId);
    }
    const el = document.getElementById('register-section') || document.getElementById('events-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  // Dedicated Secure Admin Route & Tab Detection (/nexusadmin for All Registrations, /nexusadmin/scan for Scanner, /nexusverify for Verification Desk)
  const getAdminRouteState = () => {
    if (typeof window === 'undefined') return { isAdmin: false, isVerify: false, tab: 'registrations' as const };
    const p = window.location.pathname.toLowerCase().replace(/\/+$/, '');
    if (p === '/admin' || p === '/admin.html' || p.endsWith('/admin') || p.endsWith('/admin.html')) {
      window.location.replace('/');
      return { isAdmin: false, isVerify: false, tab: 'registrations' as const };
    }
    const search = new URLSearchParams(window.location.search);
    const tabParam = search.get('tab') || search.get('page');

    const isVerify = p === '/nexusverify' || p.startsWith('/nexusverify') || p.endsWith('/nexusverify.html') || search.has('nexusverify') || window.location.hash.includes('nexusverify');
    const isScanRoute = p === '/nexusadmin/scan' || p.endsWith('/nexusadmin/scan') || p === '/nexusscan' || p === '/scan' || tabParam === 'scan';
    const isAdmin = !isVerify && (p === '/nexusadmin' || p.startsWith('/nexusadmin') || p.endsWith('/nexusadmin') || p.endsWith('/nexusadmin.html') || p === '/nexusscan' || p === '/scan' || search.has('nexusadmin') || window.location.hash.includes('nexusadmin'));

    let tab: 'registrations' | 'scan' | 'manual' | 'status' | 'photos' | 'settings' | 'cache' = 'registrations';
    if (isScanRoute || isVerify) {
      if (tabParam === 'registrations') {
        tab = 'registrations';
      } else if (tabParam === 'manual') {
        tab = 'manual';
      } else {
        tab = 'scan';
      }
    } else if (tabParam === 'manual') {
      tab = 'manual';
    } else if (tabParam === 'status') {
      tab = 'status';
    } else if (tabParam === 'photos') {
      tab = 'photos';
    } else if (tabParam === 'settings') {
      tab = 'settings';
    } else if (tabParam === 'cache') {
      tab = 'cache';
    } else {
      tab = 'registrations';
    }

    return { isAdmin, isVerify, tab };
  };

  const [isAdminRoute, setIsAdminRoute] = useState(() => getAdminRouteState().isAdmin);
  const [isVerifyRoute, setIsVerifyRoute] = useState(() => getAdminRouteState().isVerify);
  const [adminInitialTab, setAdminInitialTab] = useState<'registrations' | 'scan' | 'manual' | 'status' | 'photos' | 'settings' | 'cache'>(() => getAdminRouteState().tab);

  useEffect(() => {
    const handleLocationChange = () => {
      const state = getAdminRouteState();
      setIsAdminRoute(state.isAdmin);
      setIsVerifyRoute(state.isVerify);
      setAdminInitialTab(state.tab);
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  // Handle initial page load and hash change for sections (e.g. #events, #events-section, #gallery-section, etc.)
  useEffect(() => {
    const handleHashNavigation = () => {
      if (typeof window === 'undefined') return;
      const rawHash = window.location.hash.replace('#', '').trim();
      if (!rawHash) return;

      const targetId = (rawHash === 'events' || rawHash === 'events-section')
        ? (document.getElementById('events-section') ? 'events-section' : 'events')
        : rawHash;

      setTimeout(() => {
        let el = document.getElementById(targetId);
        if (!el && (rawHash === 'events' || rawHash === 'events-section')) {
          el = document.getElementById('events-section') || document.getElementById('events');
        }
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 150);
    };

    handleHashNavigation();
    window.addEventListener('hashchange', handleHashNavigation);
    return () => window.removeEventListener('hashchange', handleHashNavigation);
  }, [currentUser]);

  // Handle Android native hardware back button to smoothly dismiss active modals
  // Admin Portal & Customization States
  const [isAdminOpen, setIsAdminOpen] = useState(false);

  useEffect(() => {
    const handleNativeBack = (e: Event) => {
      if (isAdminOpen) {
        e.preventDefault();
        setIsAdminOpen(false);
        return;
      }
      if (isParticipantSpaceOpen) {
        e.preventDefault();
        setIsParticipantSpaceOpen(false);
        return;
      }
      if (isLookupOpen) {
        e.preventDefault();
        setIsLookupOpen(false);
        return;
      }
      if (isPaymentOpen) {
        e.preventDefault();
        setIsPaymentOpen(false);
        return;
      }
      if (inspectEvent) {
        e.preventDefault();
        setInspectEvent(null);
        return;
      }
      if (confirmedRecord) {
        e.preventDefault();
        setConfirmedRecord(null);
        return;
      }
    };

    window.addEventListener('nexusverse:back', handleNativeBack);
    return () => window.removeEventListener('nexusverse:back', handleNativeBack);
  }, [isAdminOpen, isParticipantSpaceOpen, isLookupOpen, isPaymentOpen, inspectEvent, confirmedRecord]);

  const [isRegClosed, setIsRegClosed] = useState(false);
  const [closedMessage, setClosedMessage] = useState(() => {
    try {
      return localStorage.getItem('nexusverse_closed_msg') || 'Registration for NexusVerse 2K26 is currently closed. For inquiries, contact IEEE-SB NBKRIST.';
    } catch (e) {
      return 'Registration for NexusVerse 2K26 is currently closed. For inquiries, contact IEEE-SB NBKRIST.';
    }
  });

  // Slot Quotas & Limits State (Total, IEEE, Non-IEEE)
  const [totalSlotsLimit, setTotalSlotsLimit] = useState<number>(() => {
    try {
      const v = localStorage.getItem('nexusverse_total_slots_limit');
      return v ? Number(v) : 0;
    } catch (e) { return 0; }
  });
  const [ieeeSlotsLimit, setIeeeSlotsLimit] = useState<number>(() => {
    try {
      const v = localStorage.getItem('nexusverse_ieee_slots_limit');
      return v ? Number(v) : 0;
    } catch (e) { return 0; }
  });
  const [nonIeeeSlotsLimit, setNonIeeeSlotsLimit] = useState<number>(() => {
    try {
      const v = localStorage.getItem('nexusverse_non_ieee_slots_limit');
      return v ? Number(v) : 0;
    } catch (e) { return 0; }
  });

  const [leftLogo, setLeftLogoState] = useState(() => getLeftLogo());
  const [rightLogo, setRightLogoState] = useState(() => getRightLogo());

  // Force registrations open on mount and migrate left logo to symposium poster
  useEffect(() => {
    try {
      localStorage.setItem('nexusverse_reg_closed', 'false');
      const stored = localStorage.getItem('nexusverse_logo_left');
      if (!stored || stored === '/nbkrist-logo.png') {
        localStorage.setItem('nexusverse_logo_left', '/symposium-poster.jpg');
        setLeftLogoState('/symposium-poster.jpg');
      }
    } catch (e) {}
  }, []);

  // Dark / Light Theme Mode State & Sync
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    try {
      const saved = localStorage.getItem('nexusverse_theme');
      if (saved === 'light' || saved === 'dark') return saved;
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    } catch (e) {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      if (theme === 'light') {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
        document.documentElement.setAttribute('data-theme', 'light');
      } else {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
        document.documentElement.setAttribute('data-theme', 'dark');
      }
      localStorage.setItem('nexusverse_theme', theme);
    } catch (e) {
      // Ignore
    }
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load saved registrations and settings from backend API (with local fallback)
  useEffect(() => {
    let mounted = true;
    async function loadBackendData() {
      try {
        const records = await fetchRegistrationsApi();
        if (mounted && Array.isArray(records)) {
          setSavedRecords(records);
        }
        const settings = await fetchSettingsApi();
        if (mounted && settings) {
          if (typeof settings.isRegClosed === 'boolean') {
            setIsRegClosed(settings.isRegClosed);
          }
          if (settings.closedMessage) {
            setClosedMessage(settings.closedMessage);
          }
          if (typeof settings.totalSlotsLimit === 'number') {
            setTotalSlotsLimit(settings.totalSlotsLimit);
          }
          if (typeof settings.ieeeSlotsLimit === 'number') {
            setIeeeSlotsLimit(settings.ieeeSlotsLimit);
          }
          if (typeof settings.nonIeeeSlotsLimit === 'number') {
            setNonIeeeSlotsLimit(settings.nonIeeeSlotsLimit);
          }
        }

        // Direct QR Code Scan & Pass Verification Handling (?passId=NV26-... or ?verify=...)
        const urlParams = new URLSearchParams(window.location.search);
        const targetPassId = urlParams.get('passId') || urlParams.get('regId') || urlParams.get('verify');
        const targetRoll = urlParams.get('roll');
        if ((targetPassId || targetRoll) && mounted) {
          const cleanTarget = (targetPassId || '').trim().toLowerCase();
          const cleanRoll = (targetRoll || '').trim().toLowerCase();
          const baseRegId = cleanTarget.replace(/-m\d+$/i, '');
          const matched = (records || []).find((r: RegistrationRecord) => 
            (cleanTarget && (
              r.regId.toLowerCase() === cleanTarget || 
              r.regId.toLowerCase() === baseRegId ||
              (r.roll && r.roll.toLowerCase() === cleanTarget) ||
              getRecordTeammates(r).some(m => m.roll && m.roll.toLowerCase() === cleanTarget)
            )) ||
            (cleanRoll && (
              (r.roll && r.roll.toLowerCase() === cleanRoll) ||
              getRecordTeammates(r).some(m => m.roll && m.roll.toLowerCase() === cleanRoll)
            ))
          );
          if (matched) {
            // Do NOT reveal directly — ownership gate decides
            setPendingPassRecord(matched);
          } else {
            try {
              const lookupId = baseRegId || cleanTarget || cleanRoll;
              const singleRes = await fetch(`/api/registrations/${encodeURIComponent(lookupId)}`);
              if (singleRes.ok) {
                const singleJson = await singleRes.json();
                if (singleJson.success && singleJson.data && mounted) {
                  setPendingPassRecord(singleJson.data);
                }
              }
            } catch (e) {}
          }
        }
      } catch (err) {
        console.warn('Backend sync failed, using local cache:', err);
      }
    }
    loadBackendData();
    return () => { mounted = false; };
  }, []);

  // Dedicated background refresh handler for admin portal
  const refreshAllAdminData = async () => {
    try {
      const records = await fetchRegistrationsApi();
      if (Array.isArray(records)) {
        setSavedRecords(prev => {
          if (prev.length !== records.length || JSON.stringify(prev) !== JSON.stringify(records)) {
            return records;
          }
          return prev;
        });
      }
      const settings = await fetchSettingsApi();
      if (settings) {
        if (typeof settings.isRegClosed === 'boolean') setIsRegClosed(settings.isRegClosed);
        if (settings.closedMessage) setClosedMessage(settings.closedMessage);
        if (typeof settings.totalSlotsLimit === 'number') setTotalSlotsLimit(settings.totalSlotsLimit);
        if (typeof settings.ieeeSlotsLimit === 'number') setIeeeSlotsLimit(settings.ieeeSlotsLimit);
        if (typeof settings.nonIeeeSlotsLimit === 'number') setNonIeeeSlotsLimit(settings.nonIeeeSlotsLimit);
      }
    } catch (e) {}
  };

  // Continuous auto-refresh every 3 seconds while in admin portal or participant space
  useEffect(() => {
    if (!isAdminRoute && !isAdminOpen && !isParticipantSpaceOpen) return;

    if (isParticipantSpaceOpen) {
      refreshAllAdminData();
    }

    let isPolling = false;
    const interval = setInterval(async () => {
      if (isPolling || (typeof document !== 'undefined' && document.hidden)) return;
      isPolling = true;
      try {
        await refreshAllAdminData();
      } finally {
        isPolling = false;
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [isAdminRoute, isAdminOpen, isParticipantSpaceOpen]);

  // Save registration record helper (synced to backend API + local cache)
  const saveRegistration = async (record: RegistrationRecord) => {
    const saved = await saveRegistrationApi(record);
    setSavedRecords(prev => [saved, ...prev.filter(r => r.regId !== saved.regId)]);
  };

  // Admin CRUD and control handlers (synced to backend API + local cache)
  const handleUpdateRecord = async (updated: RegistrationRecord) => {
    setSavedRecords(prev => prev.map(r => r.regId === updated.regId ? updated : r));
    await updateRegistrationApi(updated);
    if (confirmedRecord?.regId === updated.regId) {
      setConfirmedRecord(updated);
    }
  };

  const handleDeleteRecord = async (regId: string) => {
    setSavedRecords(prev => prev.filter(r => r.regId !== regId));
    await deleteRegistrationApi(regId);
    if (confirmedRecord?.regId === regId) {
      setConfirmedRecord(null);
    }
  };

  const handleToggleRegClosed = async (closed: boolean) => {
    setIsRegClosed(closed);
    await updateSettingsApi({ isRegClosed: closed });
  };

  const handleUpdateClosedMessage = async (msg: string) => {
    setClosedMessage(msg);
    await updateSettingsApi({ closedMessage: msg });
  };

  const handleUpdateSlotLimits = async (limits: { totalSlotsLimit: number; ieeeSlotsLimit: number; nonIeeeSlotsLimit: number }) => {
    try {
      localStorage.setItem('nexusverse_total_slots_limit', String(limits.totalSlotsLimit));
      localStorage.setItem('nexusverse_ieee_slots_limit', String(limits.ieeeSlotsLimit));
      localStorage.setItem('nexusverse_non_ieee_slots_limit', String(limits.nonIeeeSlotsLimit));
    } catch (e) {}
    setTotalSlotsLimit(limits.totalSlotsLimit);
    setIeeeSlotsLimit(limits.ieeeSlotsLimit);
    setNonIeeeSlotsLimit(limits.nonIeeeSlotsLimit);
    await updateSettingsApi(limits);
  };

  // Quota Calculations - counting all individual team members across registrations
  const delegateStats = computeDelegatesStats(savedRecords);
  const totalDelegatesCount = delegateStats.totalDelegates;
  const ieeeMembersCount = delegateStats.totalIeeeDelegates;
  const nonIeeeDelegatesCount = delegateStats.totalNonIeeeDelegates;

  const isTotalSlotsFull = totalSlotsLimit > 0 && totalDelegatesCount >= totalSlotsLimit;
  const isIeeeSlotsFull = ieeeSlotsLimit > 0 && ieeeMembersCount >= ieeeSlotsLimit;
  const isNonIeeeSlotsFull = nonIeeeSlotsLimit > 0 && nonIeeeDelegatesCount >= nonIeeeSlotsLimit;

  const handleUpdateLeftLogo = (url: string) => {
    setLeftLogoState(url);
    setLeftLogo(url);
  };

  const handleUpdateRightLogo = (url: string) => {
    setRightLogoState(url);
    setRightLogo(url);
  };

  // Select or toggle single technical event (clicking an already selected event unselects it ONLY IF spot pass is selected)
  const selectEvent = (id: string) => {
    if (selectedEvents.includes(id)) {
      if (!includeSpotEvents) {
        triggerEventWarning('At least one event (Technical or Spot Pass) must be selected.');
        return;
      }
      setSelectedEvents([]);
      return;
    }

    setEventWarning('');
    setSelectedEvents([id]);
    if (errors.events) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.events;
        return copy;
      });
    }

    // FLAGHUNT requires exactly 2 participants (Leader + 1 Teammate)
    if (id === 'ctf') {
      setTeamDetails(prev => {
        const cur = prev.ctf || { teamName: '', members: [] };
        if (!cur.members || cur.members.length === 0) {
          return {
            ...prev,
            ctf: {
              ...cur,
              members: [
                { name: '', roll: '', className: classNameVal || 'B.Tech', section: sectionVal || 'A', branch: dept || '', year: year || '3rd Year', phone: '', isIeeeMember: false, ieeeId: '', wantsFood: false }
              ]
            }
          };
        }
        return prev;
      });
    }
  };

  // Toggle Spot Events pass (ensuring at least one event remains selected)
  const toggleSpotEvents = (forceValue?: boolean) => {
    const nextVal = forceValue !== undefined ? forceValue : !includeSpotEvents;
    if (!nextVal && selectedEvents.length === 0) {
      triggerEventWarning('At least one event (Technical or Spot Pass) must be selected.');
      return;
    }

    setEventWarning('');
    setIncludeSpotEvents(nextVal);
    if (nextVal) {
      // By default auto-select all members in active team
      const updated: { lead: boolean; [key: number]: boolean } = { lead: true };
      teamMembersList.forEach((_, idx) => {
        updated[idx] = true;
      });
      setSpotMembersSelected(updated);
    }
    if (errors.events) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy.events;
        return copy;
      });
    }
  };

  // Auto-heal to guarantee at least one event is always selected
  useEffect(() => {
    if (selectedEvents.length === 0 && !includeSpotEvents) {
      setSelectedEvents(['ctf']);
    }
  }, [selectedEvents, includeSpotEvents]);

  const handleAddTeamMember = (eventId: string, maxAllowed: number) => {
    const current = teamDetails[eventId] || { teamName: '', members: [] };
    const newIndex = current.members?.length || 0;
    // Leader is 1, so additional members can be at most maxAllowed - 1
    if ((current.members?.length || 0) + 1 >= maxAllowed) return;

    setTeamDetails(prev => ({
      ...prev,
      [eventId]: {
        ...current,
        members: [
          ...(current.members || []),
          { 
            name: '', 
            roll: '', 
            className: classNameVal || 'B.Tech', 
            section: sectionVal || 'A', 
            branch: dept || '', 
            year: year || '3rd Year', 
            phone: '',
            isIeeeMember: false,
            ieeeId: '',
            wantsFood: false
          }
        ]
      }
    }));

    // Auto-include newly added team member in Spot Pass by default
    setSpotMembersSelected(prev => ({
      ...prev,
      [newIndex]: true
    }));
  };

  const handleRemoveTeamMember = (eventId: string, index: number) => {
    const current = teamDetails[eventId] || { teamName: '', members: [] };
    setTeamDetails(prev => ({
      ...prev,
      [eventId]: {
        ...current,
        members: (current.members || []).filter((_, i) => i !== index)
      }
    }));
  };

  const handleUpdateTeamMemberField = (
    eventId: string, 
    index: number, 
    field: keyof FormTeamMember, 
    value: any
  ) => {
    setTeamDetails(prev => {
      const current = prev[eventId] || { teamName: '', members: [] };
      const updatedMembers = [...(current.members || [])];
      if (!updatedMembers[index]) {
        updatedMembers[index] = { 
          name: '', 
          roll: '', 
          className: 'B.Tech', 
          section: 'A', 
          branch: '', 
          year: '3rd Year', 
          phone: '',
          isIeeeMember: false,
          ieeeId: '',
          wantsFood: false
        };
      }
      updatedMembers[index] = {
        ...updatedMembers[index],
        [field]: value
      };
      return {
        ...prev,
        [eventId]: {
          ...current,
          members: updatedMembers
        }
      };
    });

    const errorKey = `member_${eventId}_${index}_${field}`;
    if (errors[errorKey]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[errorKey];
        return copy;
      });
    }
  };

  // Active technical event team details (if any)
  const activeTechEvent = selectedEvents[0] ? EVENTS.find(e => e.id === selectedEvents[0]) : null;
  const activeTechDetails = selectedEvents[0] ? teamDetails[selectedEvents[0]] : null;
  const teamMembersList = (activeTechEvent && activeTechEvent.max > 1) ? (activeTechDetails?.members || []) : [];
  const totalTeamHeads = 1 + teamMembersList.length;

  // Calculate how many spot passes are selected across team members
  const getSelectedSpotCount = () => {
    if (!includeSpotEvents) return 0;
    if (totalTeamHeads <= 1) return 1;

    let count = 0;
    if (spotMembersSelected.lead !== false) count++;
    teamMembersList.forEach((_, idx) => {
      if (spotMembersSelected[idx] !== false) count++;
    });
    return Math.max(1, count);
  };

  const getSelectedSpotMemberNames = () => {
    if (!includeSpotEvents) return [];
    if (totalTeamHeads <= 1) return [name.trim() || 'Team Lead'];

    const names: string[] = [];
    if (spotMembersSelected.lead !== false) {
      names.push(name.trim() || 'Team Lead');
    }
    teamMembersList.forEach((m, idx) => {
      if (spotMembersSelected[idx] !== false) {
        names.push(m.name.trim() || `Member ${idx + 2}`);
      }
    });
    return names;
  };

  const effectiveSpotCount = getSelectedSpotCount();
  const spotMemberNames = getSelectedSpotMemberNames();

  const toggleSpotMember = (target: 'lead' | number) => {
    setSpotMembersSelected(prev => {
      const currentVal = prev[target] !== false;
      const nextVal = !currentVal;

      let remainingCount = 0;
      if (target === 'lead' ? nextVal : (prev.lead !== false)) remainingCount++;
      teamMembersList.forEach((_, idx) => {
        const val = target === idx ? nextVal : (prev[idx] !== false);
        if (val) remainingCount++;
      });

      if (remainingCount === 0) {
        toggleSpotEvents(false);
        return prev;
      }

      return {
        ...prev,
        [target]: nextVal
      };
    });
  };

  const selectAllSpotMembers = () => {
    const updated: { lead: boolean; [key: number]: boolean } = { lead: true };
    teamMembersList.forEach((_, idx) => {
      updated[idx] = true;
    });
    setSpotMembersSelected(updated);
  };

  const selectLeadOnlySpot = () => {
    const updated: { lead: boolean; [key: number]: boolean } = { lead: true };
    teamMembersList.forEach((_, idx) => {
      updated[idx] = false;
    });
    setSpotMembersSelected(updated);
  };

  // Pricing calculations: Technical events: ₹150 base (IEEE includes food; Non-IEEE has +₹50 food option); Spot Events: ₹100 per member; GST: 2%
  const calculateTotal = () => {
    let subtotal = 0;
    let foodAddonTotal = 0;
    let foodCount = 0;

    // 1. Technical event subtotal (if selected)
    if (selectedEvents.length > 0) {
      for (const id of selectedEvents) {
        const ev = EVENTS.find(e => e.id === id);
        if (!ev) continue;
        const details = teamDetails[id] || { teamName: '', members: [] };
        const leaderBase = isIeeeMember ? ev.feeMember : ev.feeNonMember;
        const leaderFood = (!isIeeeMember && wantsFood) ? 50 : 0;
        if (!isIeeeMember && wantsFood) {
          foodAddonTotal += 50;
          foodCount += 1;
        } else if (isIeeeMember) {
          foodCount += 1;
        }
        const leaderFee = leaderBase + leaderFood;

        const teammatesFee = (details.members || []).reduce((mSum, m) => {
          const mBase = m.isIeeeMember ? ev.feeMember : ev.feeNonMember;
          const mFood = (!m.isIeeeMember && m.wantsFood) ? 50 : 0;
          if (!m.isIeeeMember && m.wantsFood) {
            foodAddonTotal += 50;
            foodCount += 1;
          } else if (m.isIeeeMember) {
            foodCount += 1;
          }
          return mSum + mBase + mFood;
        }, 0);

        subtotal += leaderFee + teammatesFee;
      }
    } else if (includeSpotEvents) {
      // Spot Event ONLY: base registration is ₹100 per member.
      // For spot events, food is not included by default (even for IEEE members).
      // If wantsFood is selected, extra ₹50 is added for lunch token.
      if (wantsFood) {
        foodAddonTotal += 50;
        foodCount += 1;
        subtotal += 50;
      }
    }

    // 2. Spot events pass (₹100 per selected team member / registrant)
    const spotPassCount = effectiveSpotCount;
    const spotSubtotal = spotPassCount * SPOT_EVENT.feeNonMember;
    if (includeSpotEvents) {
      subtotal += spotSubtotal;
    }

    // 3. GST: 2% (₹2 for every ₹100 of base registration fee)
    const gstPercent = SYMPOSIUM_CONFIG.gstPercent || 2;
    const gstAmount = Math.round((subtotal * gstPercent) / 100);
    const total = subtotal + gstAmount;

    return { subtotal, spotPassCount, spotSubtotal, gstAmount, gstPercent, total, foodAddonTotal, foodCount };
  };

  const { subtotal, spotPassCount, spotSubtotal, gstAmount, gstPercent, total, foodAddonTotal, foodCount } = calculateTotal();

  // Validate form
  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Participant (Lead) validation
    if (!name.trim() || name.trim().length < 2) newErrors.name = 'Please enter participant full name.';
    if (!roll.trim() || roll.trim().length < 1) newErrors.roll = 'Enter roll number / registration number.';
    if (!classNameVal.trim()) newErrors.className = 'Please enter or select class/degree.';
    if (!sectionVal.trim()) newErrors.section = 'Please enter section.';
    if (!dept.trim() || dept.trim().length < 2) newErrors.dept = 'Enter department / branch.';
    if (!year) newErrors.year = 'Select year of study.';
    if (!phone.trim() || !/^[6-9]\d{9}$/.test(phone.replace(/\s+/g, ''))) {
      newErrors.phone = 'Enter a valid 10-digit mobile number.';
    }
    if (!college.trim() || college.trim().length < 2) newErrors.college = 'Enter college or institution name.';
    if (!email.trim() || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      newErrors.email = 'Enter a valid email address.';
    }

    if (isIeeeMember && (!ieeeId.trim() || ieeeId.trim().length < 4)) {
      newErrors.ieeeId = 'Enter your valid IEEE membership number.';
    }

    if (selectedEvents.length === 0 && !includeSpotEvents) {
      newErrors.events = 'Please select at least one event: a Technical Event (₹150/₹200), Spot Events pass (₹100), or both.';
    }

    // Validate per-event team requirements
    for (const id of selectedEvents) {
      const ev = EVENTS.find(e => e.id === id);
      if (!ev) continue;
      const details = teamDetails[id] || { teamName: '', members: [] };

      if (ev.max > 1) {
        if (!details.teamName?.trim()) {
          newErrors[`teamName_${id}`] = 'Please provide a team name.';
        }
        
        const totalTeamMembers = 1 + (details.members?.length || 0); // 1 is Lead
        if (totalTeamMembers < ev.min) {
          newErrors[`teamCount_${id}`] = `This event requires at least ${ev.min} members (including leader). Please add ${ev.min - totalTeamMembers} more teammate(s).`;
        }

        // Validate each additional team member: name, roll, class, section, branch, year, phone
        (details.members || []).forEach((m, idx) => {
          if (!m.name.trim() || m.name.trim().length < 2) {
            newErrors[`member_${id}_${idx}_name`] = `Member ${idx + 2}: Enter name.`;
          }
          if (!m.roll.trim()) {
            newErrors[`member_${id}_${idx}_roll`] = `Member ${idx + 2}: Enter roll number.`;
          }
          if (!m.className.trim()) {
            newErrors[`member_${id}_${idx}_className`] = `Member ${idx + 2}: Enter class.`;
          }
          if (!m.section.trim()) {
            newErrors[`member_${id}_${idx}_section`] = `Member ${idx + 2}: Enter section.`;
          }
          if (!m.branch.trim()) {
            newErrors[`member_${id}_${idx}_branch`] = `Member ${idx + 2}: Enter branch.`;
          }
          if (!m.year.trim()) {
            newErrors[`member_${id}_${idx}_year`] = `Member ${idx + 2}: Select year.`;
          }
          if (!m.phone.trim() || !/^[6-9]\d{9}$/.test(m.phone.replace(/\s+/g, ''))) {
            newErrors[`member_${id}_${idx}_phone`] = `Member ${idx + 2}: Enter 10-digit phone.`;
          }
          if (m.isIeeeMember && (!m.ieeeId?.trim() || m.ieeeId.trim().length < 4)) {
            newErrors[`member_${id}_${idx}_ieeeId`] = `Member ${idx + 2}: Enter valid IEEE membership ID.`;
          }
        });
      }

      if (ev.project && !details.projectTitle?.trim()) {
        newErrors[`projectTitle_${id}`] = 'Please provide your project / prototype title.';
      }
    }

    if (!termsAccepted) {
      newErrors.terms = 'You must accept the event rules and refund policy.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) {
      alert('Please continue with Google or create your separate space first before registering.');
      setParticipantSpaceInitialMode('signup');
      setIsParticipantSpaceOpen(true);
      return;
    }
    if (isRegClosed) {
      alert(closedMessage || 'Registration is currently closed.');
      return;
    }
    const currentRegistrationMemberCount = 1 + (teamMembersList?.length || 0);
    if (totalSlotsLimit > 0 && totalDelegatesCount + currentRegistrationMemberCount > totalSlotsLimit) {
      alert(`Registration Closed: Total symposium capacity of ${totalSlotsLimit} slots would be exceeded. Only ${Math.max(0, totalSlotsLimit - totalDelegatesCount)} slot(s) remaining for this registration of ${currentRegistrationMemberCount} member(s).`);
      return;
    }
    if (isTotalSlotsFull) {
      alert(`Registration Closed: Total symposium capacity of ${totalSlotsLimit} slots has been reached.`);
      return;
    }
    if (isIeeeMember && isIeeeSlotsFull) {
      alert(`IEEE Quota Full: All ${ieeeSlotsLimit} IEEE member slots are filled. You may still register as a Non-IEEE Delegate if slots are open.`);
      return;
    }
    if (!isIeeeMember && isNonIeeeSlotsFull) {
      alert(`Non-IEEE Quota Full: All ${nonIeeeSlotsLimit} Non-IEEE delegate slots are filled.`);
      return;
    }
    if (!validateForm()) {
      const firstErrorKey = Object.keys(errors)[0];
      if (firstErrorKey) {
        const el = document.getElementById(`field-${firstErrorKey}`);
        el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    // Open Razorpay / Automatic QR Payment Gateway Modal
    setIsPaymentOpen(true);
  };

  // Payment successful callback -> Generate Digital Ticket Pass
  const handlePaymentSuccess = (paymentId: string, paymentScreenshot?: string, paymentModeUsed?: 'upi' | 'razorpay') => {
    setIsPaymentOpen(false);

    const regId = 'NV26-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    
    // Parse team member details into structured objects
    const formattedTeamDetails: Record<string, { 
      teamName?: string; 
      members?: string[]; 
      teamMembers?: TeamMemberInfo[]; 
      projectTitle?: string 
    }> = {};

    for (const [id, det] of Object.entries(teamDetails)) {
      if (selectedEvents.includes(id)) {
        const teamMemberList: TeamMemberInfo[] = (det.members || []).map(m => ({
          name: m.name.trim(),
          roll: m.roll.trim().toUpperCase(),
          className: m.className.trim(),
          section: m.section.trim().toUpperCase(),
          branch: m.branch.trim(),
          year: m.year.trim(),
          phone: m.phone.trim(),
          isIeeeMember: !!m.isIeeeMember,
          ieeeId: m.isIeeeMember ? m.ieeeId?.trim() : undefined,
          wantsFood: m.isIeeeMember ? true : Boolean(m.wantsFood)
        }));

        formattedTeamDetails[id] = {
          teamName: det.teamName?.trim(),
          members: [name.trim(), ...teamMemberList.map(m => m.name)],
          teamMembers: teamMemberList,
          projectTitle: det.projectTitle?.trim()
        };
      }
    }

    const combinedEventIds = [
      ...selectedEvents,
      ...(includeSpotEvents ? ['spot'] : [])
    ];

    const effectiveMode = paymentModeUsed || (paymentId.startsWith('pay_') ? 'razorpay' : 'upi');

    const newRecord: RegistrationRecord = {
      regId,
      userId: currentUser?.id,
      paymentId,
      paymentScreenshot: paymentScreenshot || undefined,
      paymentMode: effectiveMode,
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim(),
      college: college.trim(),
      className: classNameVal.trim(),
      section: sectionVal.trim().toUpperCase(),
      dept: dept.trim(),
      year,
      roll: roll.trim().toUpperCase(),
      isIeeeMember,
      ieeeId: isIeeeMember ? ieeeId.trim() : undefined,
      wantsFood: (selectedEvents.length > 0 && isIeeeMember) ? true : Boolean(wantsFood),
      eventIds: combinedEventIds,
      teamDetails: formattedTeamDetails,
      spotPassCount: effectiveSpotCount,
      spotMembers: spotMemberNames,
      subtotal,
      gstAmount,
      totalPaid: total,
      promoCode: undefined,
      timestamp: new Date().toISOString()
    };

    saveRegistration(newRecord);

    // If participant is not yet logged in, auto-initialize their Participant Space session
    if (!currentUser) {
      const autoUser: ParticipantUser = {
        id: 'usr_' + Math.random().toString(36).slice(2, 8),
        name: newRecord.name,
        email: newRecord.email,
        username: newRecord.email.split('@')[0],
        phone: newRecord.phone,
        college: newRecord.college,
        roll: newRecord.roll,
        branch: newRecord.dept,
        year: newRecord.year,
        isIeeeMember: newRecord.isIeeeMember,
        ieeeId: newRecord.ieeeId,
        authProvider: 'local',
        createdAt: new Date().toISOString()
      };
      saveStoredParticipant(autoUser);
      setCurrentUser(autoUser);
    }

    // UPI mode: Display "your ticket will be sent to your mail at 8 PM and you can access your ticket in your space find my ticket"
    // Razorpay mode: Automatic instant pass and immediate email
    if (effectiveMode === 'upi') {
      setUpiPendingRecord(newRecord);
      setConfirmedRecord(null);
      // Note: Ticket email is scheduled and dispatched to mail at 8 PM (not sent immediately)
    } else {
      setConfirmedRecord(newRecord);
      setUpiPendingRecord(null);
      if (newRecord.email) {
        sendTicketEmailApi(newRecord).catch(() => {});
      }
    }

    // Clear auto-saved form draft memory upon successful ticket registration
    clearFormDraft();
    setDraftRestoredNotice(null);
    setIsDraftSaved(false);

    // Trigger celebratory confetti
    try {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f2c14e', '#d4a935', '#ffffff', '#4cc38a', '#00629b']
      });
    } catch (e) {
      // Confetti fallback
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Dedicated Full-Page Registration & Verification Desk (/nexusverify) - password: nexusk26
  if (isVerifyRoute) {
    return (
      <AdminModal
        isOpen={true}
        isFullPage={true}
        isVerifyPortal={true}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClose={() => {
          window.location.href = '/';
        }}
        savedRecords={savedRecords}
        onRefreshRecords={refreshAllAdminData}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onAddManualRecord={(rec) => saveRegistration(rec)}
        onViewPass={(rec) => {
          setConfirmedRecord(rec);
          window.location.href = `/register.html?passId=${encodeURIComponent(rec.regId)}`;
        }}
        isRegClosed={isRegClosed}
        onToggleRegClosed={handleToggleRegClosed}
        closedMessage={closedMessage}
        onUpdateClosedMessage={handleUpdateClosedMessage}
        totalSlotsLimit={totalSlotsLimit}
        ieeeSlotsLimit={ieeeSlotsLimit}
        nonIeeeSlotsLimit={nonIeeeSlotsLimit}
        onUpdateSlotLimits={handleUpdateSlotLimits}
        leftLogo={leftLogo}
        rightLogo={rightLogo}
        onUpdateLeftLogo={handleUpdateLeftLogo}
        onUpdateRightLogo={handleUpdateRightLogo}
        initialTab={adminInitialTab}
      />
    );
  }

  // Dedicated Full-Page Admin Portal: ONLY opens when user navigates to /nexusadmin or /nexusadmin.html
  if (isAdminRoute) {
    return (
      <AdminModal
        isOpen={true}
        isFullPage={true}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClose={() => {
          window.location.href = '/';
        }}
        savedRecords={savedRecords}
        onRefreshRecords={refreshAllAdminData}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onAddManualRecord={(rec) => saveRegistration(rec)}
        onViewPass={(rec) => {
          setConfirmedRecord(rec);
          window.location.href = `/register.html?passId=${encodeURIComponent(rec.regId)}`;
        }}
        isRegClosed={isRegClosed}
        onToggleRegClosed={handleToggleRegClosed}
        closedMessage={closedMessage}
        onUpdateClosedMessage={handleUpdateClosedMessage}
        totalSlotsLimit={totalSlotsLimit}
        ieeeSlotsLimit={ieeeSlotsLimit}
        nonIeeeSlotsLimit={nonIeeeSlotsLimit}
        onUpdateSlotLimits={handleUpdateSlotLimits}
        leftLogo={leftLogo}
        rightLogo={rightLogo}
        onUpdateLeftLogo={handleUpdateLeftLogo}
        onUpdateRightLogo={handleUpdateRightLogo}
        initialTab={adminInitialTab}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0d] text-[#f3ecd9] selection:bg-[#d4a935]/30 selection:text-[#f2c14e] font-sans antialiased w-full max-w-full overflow-x-hidden pb-20 md:pb-0">
      {/* Top Navbar with Top Left Logo (Image 1), Top Right Logo (Image 2), and Admin button */}
      <Navbar 
        onOpenLookup={() => setIsLookupOpen(true)} 
        onRegisterClick={() => {
          document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        onOpenAdmin={() => setIsAdminOpen(true)}
        onOpenParticipantSpace={() => setIsParticipantSpaceOpen(true)}
        currentUser={currentUser}
        leftLogo={leftLogo}
        rightLogo={rightLogo}
        isRegClosed={isRegClosed}
        theme={theme}
        onToggleTheme={handleToggleTheme}
      />

      {/* Prominent Announcement Banner when Registration is Closed */}
      {isRegClosed && (
        <div className="bg-[#2a1315] border-b border-[#ff8a80]/30 py-3.5 px-4 text-center animate-in fade-in sticky top-18 z-30 shadow-md">
          <div className="max-w-4xl mx-auto flex items-center justify-center gap-2.5 text-xs sm:text-sm font-semibold text-[#ffb4ab]">
            <AlertCircle className="w-4 h-4 text-[#ff8a80] shrink-0" />
            <span>{closedMessage}</span>
          </div>
        </div>
      )}

      <main className="relative w-full max-w-full overflow-x-hidden">
        {/* Scanned QR Pass Verified Banner */}
        {isScannedPass && confirmedRecord && (
          <div className="bg-gradient-to-r from-[#0d2a1c] via-[#143a28] to-[#0d2a1c] border-b-2 border-[#4cc38a] py-3.5 px-4 text-center sticky top-18 z-40 shadow-xl no-print animate-in slide-in-from-top duration-300">
            <div className="max-w-4xl mx-auto flex items-center justify-center gap-2.5 text-xs sm:text-sm font-bold text-[#4cc38a]">
              <CheckCircle2 className="w-5 h-5 text-[#4cc38a] shrink-0" />
              <span>LIVE QR SCAN AUTHENTICATED · OFFICIAL NEXUSVERSE 2K26 ENTRY PASS VERIFIED</span>
            </div>
          </div>
        )}

        {/* Confirmed Ticket Pass View OR UPI Submission Confirmation */}
        {passAccessDenied && !confirmedRecord ? (
          <section className="min-h-[70vh] flex items-center justify-center px-4 py-16">
            <div className="w-full max-w-md text-center p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-[#121218] via-[#171724] to-[#0e0e14] border-2 border-[#d4a935]/60 shadow-2xl space-y-5">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-[#2a1315] border border-[#ff8a80]/40 flex items-center justify-center">
                <ShieldCheck className="w-8 h-8 text-[#ff8a80]" />
              </div>
              <h2 className="font-serif-title text-2xl font-bold text-white">
                {passAccessDenied === 'login' ? 'Private Delegate Pass' : 'Access Denied'}
              </h2>
              <p className="text-sm text-[#b9ae94] leading-relaxed">
                {passAccessDenied === 'login'
                  ? 'This ticket is private. Please sign in to your space to view your own pass.'
                  : 'This pass belongs to another delegate. You can only view passes registered with your own account.'}
              </p>
              <div className="flex flex-col gap-2.5 pt-1">
                {passAccessDenied === 'login' ? (
                  <button
                    type="button"
                    id="pass-gate-signin"
                    onClick={() => {
                      setParticipantSpaceInitialMode('signin');
                      setIsParticipantSpaceOpen(true);
                    }}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-black hover:brightness-105 transition-all cursor-pointer"
                  >
                    Sign In to View Your Pass
                  </button>
                ) : (
                  <button
                    type="button"
                    id="pass-gate-dashboard"
                    onClick={() => setIsParticipantSpaceOpen(true)}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-black hover:brightness-105 transition-all cursor-pointer"
                  >
                    Open My Passes
                  </button>
                )}
                <button
                  type="button"
                  id="pass-gate-home"
                  onClick={() => {
                    setPendingPassRecord(null);
                    setPassAccessDenied(null);
                    window.history.replaceState(null, '', window.location.pathname);
                  }}
                  className="w-full py-3 rounded-xl font-semibold text-sm bg-[#0a0a0d] border border-[#2e2b22] text-[#a79f8b] hover:text-white transition-colors cursor-pointer"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </section>
        ) : confirmedRecord ? (
          <TicketPass 
            record={confirmedRecord}
            events={ALL_EVENTS}
            leftLogo={leftLogo}
            rightLogo={rightLogo}
            onOpenParticipantSpace={() => setIsParticipantSpaceOpen(true)}
            onReset={() => {
              setConfirmedRecord(null);
              setUpiPendingRecord(null);
              setIsScannedPass(false);
              setPendingPassRecord(null);
              setPassAccessDenied(null);
              try {
                window.history.replaceState(null, '', window.location.pathname);
              } catch {}
              setSelectedEvents(['ctf']);
              setIncludeSpotEvents(false);
              setName('');
              setRoll('');
              setPhone('');
              setEmail('');
            }}
          />
        ) : upiPendingRecord ? (
          <UpiConfirmationView
            record={upiPendingRecord}
            events={ALL_EVENTS}
            leftLogo={leftLogo}
            rightLogo={rightLogo}
            onOpenParticipantSpace={() => setIsParticipantSpaceOpen(true)}
            onOpenLookup={() => setIsLookupOpen(true)}
            onViewPass={() => {
              setConfirmedRecord(upiPendingRecord);
              setUpiPendingRecord(null);
              setPendingPassRecord(null);
              setPassAccessDenied(null);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onReset={() => {
              setUpiPendingRecord(null);
              setConfirmedRecord(null);
              setPendingPassRecord(null);
              setPassAccessDenied(null);
              try {
                window.history.replaceState(null, '', window.location.pathname);
              } catch {}
              setSelectedEvents(['ctf']);
              setIncludeSpotEvents(false);
              setName('');
              setRoll('');
              setPhone('');
              setEmail('');
            }}
          />
        ) : (
          <>
            {/* Hero Section */}
            <Hero 
              onRegisterClick={() => {
                document.getElementById('register-section')?.scrollIntoView({ behavior: 'smooth' });
              }}
              onSelectEvent={(eventId) => {
                if (eventId === 'spot') {
                  toggleSpotEvents();
                } else {
                  selectEvent(eventId);
                }
              }}
              selectedEventIds={[...selectedEvents, ...(includeSpotEvents ? ['spot'] : [])]}
              attendeeName={name || currentUser?.name || ''}
              isIeeeMember={isIeeeMember}
              leftLogo={leftLogo}
              rightLogo={rightLogo}
              eventWarning={eventWarning}
            />

            {/* Previous Symposium Memories & Photo Gallery Section */}
            <GallerySection 
              isAdmin={isAdminRoute || isAdminOpen}
              onOpenAdmin={(tab) => {
                setAdminInitialTab(tab || 'photos');
                setIsAdminOpen(true);
              }} 
            />

            {/* Registration Form Section */}
            <section id="register-section" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <div className="space-y-8">
                {/* Section Title */}
                <div className="max-w-3xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1f1b0e] border border-[#d4a935]/40 text-[#f2c14e] text-xs font-semibold tracking-wider uppercase mb-3">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Official Registration Portal</span>
                  </div>
                  <h2 className="font-serif-title text-2xl xs:text-3xl sm:text-4xl lg:text-5xl font-bold text-[#ffffff] tracking-tight break-words">
                    Register for NexusVerse 2K26
                  </h2>
                  <p className="text-base text-[#b9ae94] mt-3 leading-relaxed">
                    Enter participant details, add team members for team events, scan the dynamic QR or checkout via Razorpay, and download your instant verified entry pass. Technical events cost <span className="text-[#f2c14e] font-semibold">₹150 per head for IEEE members</span> and <span className="text-[#f3ecd9] font-medium">₹200 per head for non-members</span>.
                  </p>
                </div>

                {/* AUTHENTICATION GATE: Required before registration */}
                {!currentUser ? (
                  <div className="space-y-8">
                    <div className="bg-gradient-to-br from-[#121218] via-[#171724] to-[#0e0e14] border-2 border-[#d4a935]/70 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden space-y-6">
                    <div className="max-w-2xl mx-auto text-center space-y-3">
                      <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#1f1b0e] border border-[#d4a935]/50 text-[#f2c14e] text-xs font-bold uppercase tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Step 1 of 2: Create Space or Sign In</span>
                      </div>

                      <h3 className="font-serif-title text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
                        Continue with Google or Create Your Space First
                      </h3>

                      <p className="text-sm text-[#b9ae94] leading-relaxed">
                        To register for NexusVerse 2K26, please continue with Google or create your separate space first. Once signed in, you can register and all your passes, schedules, team details, and payment receipts will be safely stored in your dashboard!
                      </p>
                    </div>

                    {/* Primary Action Buttons */}
                    <div className="max-w-md mx-auto space-y-3">
                      {/* Button 1: Continue with Google */}
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantSpaceInitialMode('signin');
                          setIsParticipantSpaceOpen(true);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-white text-gray-800 hover:bg-gray-100 transition-all flex items-center justify-center gap-3 shadow-lg cursor-pointer hover:scale-[1.01] active:scale-95"
                      >
                        <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                          <path
                            fill="#4285F4"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="#34A853"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="#FBBC05"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          />
                          <path
                            fill="#EA4335"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                          />
                        </svg>
                        <span>Continue with Google</span>
                      </button>

                      {/* Button 2: Create Your Separate Space */}
                      <button
                        type="button"
                        onClick={() => {
                          setParticipantSpaceInitialMode('signup');
                          setIsParticipantSpaceOpen(true);
                        }}
                        className="w-full py-3.5 px-4 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-[#f2c14e] to-[#d4a935] hover:from-[#d4a935] hover:to-[#b88f28] text-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f2c14e]/20 cursor-pointer hover:scale-[1.01] active:scale-95"
                      >
                        <User className="w-4 h-4" />
                        <span>Create Your Separate Space</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>

                      {/* Button 3: Already have a space? Sign In */}
                      <div className="text-center pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setParticipantSpaceInitialMode('signin');
                            setIsParticipantSpaceOpen(true);
                          }}
                          className="text-xs text-[#a79f8b] hover:text-[#f2c14e] transition-colors cursor-pointer"
                        >
                          Already created your space? <span className="text-[#f2c14e] font-semibold underline">Sign In Here</span>
                        </button>
                      </div>
                    </div>

                    {/* Value Highlights */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4 border-t border-[#2e2b22]/70 text-xs text-[#a79f8b] max-w-2xl mx-auto">
                      <div className="flex items-center gap-2 bg-[#0a0a0d] p-3 rounded-xl border border-[#2e2b22]">
                        <Check className="w-4 h-4 text-[#4cc38a] shrink-0" />
                        <span>Passes stored in your dashboard</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#0a0a0d] p-3 rounded-xl border border-[#2e2b22]">
                        <Check className="w-4 h-4 text-[#4cc38a] shrink-0" />
                        <span>Instant digital QR pass access</span>
                      </div>
                      <div className="flex items-center gap-2 bg-[#0a0a0d] p-3 rounded-xl border border-[#2e2b22]">
                        <Check className="w-4 h-4 text-[#4cc38a] shrink-0" />
                        <span>Receipt & UTR verified record</span>
                      </div>
                    </div>
                  </div>

                  {/* PRE-REGISTRATION EVENTS SHOWCASE: All 5 Technical Events + Spot Arena */}
                  <PreRegistrationEventsShowcase
                    onInspectEvent={(event) => setInspectEvent(event)}
                    onSelectEventAndRegister={(eventId) => {
                      setSelectedEvents([eventId]);
                      setParticipantSpaceInitialMode('signup');
                      setIsParticipantSpaceOpen(true);
                    }}
                    onSelectSpotAndRegister={() => {
                      setIncludeSpotEvents(true);
                      setParticipantSpaceInitialMode('signup');
                      setIsParticipantSpaceOpen(true);
                    }}
                    onOpenGoogleSignIn={() => {
                      setParticipantSpaceInitialMode('signin');
                      setIsParticipantSpaceOpen(true);
                    }}
                    onOpenCreateSpace={() => {
                      setParticipantSpaceInitialMode('signup');
                      setIsParticipantSpaceOpen(true);
                    }}
                  />
                </div>
                ) : (
                  <form onSubmit={handleRegisterSubmit} noValidate className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    {/* Active Space User Banner */}
                    <div className="lg:col-span-12 p-4 rounded-2xl bg-gradient-to-r from-[#111e14] via-[#15271a] to-[#111e14] border-2 border-[#4cc38a]/50 flex flex-wrap items-center justify-between gap-3 shadow-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-[#4cc38a] text-black font-bold flex items-center justify-center font-serif-title text-base shrink-0">
                          {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-white">{currentUser.name}</span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1b5e39] text-[#a5d6a7] font-semibold border border-[#4cc38a]/40">
                              Your Space Active
                            </span>
                          </div>
                          <span className="text-xs text-[#a79f8b] block">
                            {currentUser.email} {currentUser.roll && `· Roll: ${currentUser.roll}`}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setIsParticipantSpaceOpen(true)}
                          className="px-3.5 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#d4a935]/40 text-[#f2c14e] text-xs font-semibold hover:bg-[#d4a935] hover:text-black transition-colors cursor-pointer"
                        >
                          View Your Dashboard
                        </button>
                        <button
                          type="button"
                          onClick={handleLogoutParticipant}
                          className="px-3 py-1.5 rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] text-xs font-semibold hover:bg-[#3d191d] transition-colors cursor-pointer"
                        >
                          Switch User
                        </button>
                      </div>
                    </div>

                    {/* Draft Restored from Cache Memory Banner */}
                    {draftRestoredNotice && (
                      <div className="lg:col-span-12 p-3.5 rounded-2xl bg-gradient-to-r from-[#1f1b0e] via-[#242013] to-[#14141d] border border-[#d4a935]/50 flex flex-wrap items-center justify-between gap-3 text-xs shadow-lg animate-in fade-in">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-[#d4a935]/20 text-[#f2c14e] border border-[#d4a935]/30 flex items-center justify-center font-bold text-sm">
                            ⚡
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-[#f2c14e]">
                                Form draft restored from cache memory
                              </span>
                              <span className="text-[10px] text-[#4cc38a] font-mono px-2 py-0.5 rounded-full bg-[#4cc38a]/15 border border-[#4cc38a]/30">
                                Auto-Loaded
                              </span>
                            </div>
                            <span className="text-xs text-[#a79f8b]">
                              Saved {draftRestoredNotice.age}. All participant details and team choices are intact.
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              clearFormDraft();
                              setDraftRestoredNotice(null);
                              setIsDraftSaved(false);
                              setName('');
                              setRoll('');
                              setPhone('');
                              setDept('');
                            }}
                            className="px-3 py-1.5 rounded-xl bg-[#2a1315] hover:bg-[#3d191d] text-[#ff8a80] border border-[#ff8a80]/30 font-semibold text-xs cursor-pointer transition-colors"
                          >
                            Clear Draft
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Left Column: Form Details & Events Selection */}
                    <div className="lg:col-span-8 space-y-8">
                    {/* 1. PARTICIPANT INFORMATION CARD */}
                    <div className="bg-[#131318] p-4 sm:p-6 md:p-8 rounded-2xl border border-[#2e2b22]">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
                        <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-[#ffffff] flex items-center gap-2">
                          <User className="w-5 h-5 sm:w-6 sm:h-6 text-[#d4a935]" />
                          <span>1. Participant Information (Team Lead / Delegate)</span>
                        </h3>
                        <div className="flex items-center gap-2">
                          {isDraftSaved && (
                            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#4cc38a]/15 text-[#4cc38a] border border-[#4cc38a]/30 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a]" />
                              Saved in Cache Memory
                            </span>
                          )}
                          <span className="text-xs font-sans text-[#a79f8b] font-normal">All fields required</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                        {/* 1. Full Name */}
                        <div id="field-name">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Full Name <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => {
                              setName(e.target.value);
                              if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                            }}
                            placeholder="e.g. Ananya Sharma"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.name ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.name && <p className="text-xs text-[#ff8a80] mt-1">{errors.name}</p>}
                        </div>

                        {/* 2. Roll Number */}
                        <div id="field-roll">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Roll Number / Reg No <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="text"
                            value={roll}
                            onChange={(e) => {
                              setRoll(e.target.value);
                              if (errors.roll) setErrors(prev => ({ ...prev, roll: '' }));
                            }}
                            placeholder="e.g. 23B91A0512"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] font-mono placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.roll ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.roll && <p className="text-xs text-[#ff8a80] mt-1">{errors.roll}</p>}
                        </div>

                        {/* 3. Class */}
                        <div id="field-className">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Class / Degree <span className="text-[#ff8a80]">*</span>
                          </label>
                          <select
                            value={classNameVal}
                            onChange={(e) => {
                              setClassNameVal(e.target.value);
                              if (errors.className) setErrors(prev => ({ ...prev, className: '' }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.className ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          >
                            <option value="B.Tech">B.Tech</option>
                            <option value="M.Tech">M.Tech</option>
                            <option value="MCA">MCA</option>
                            <option value="MBA">MBA</option>
                            <option value="Diploma">Diploma</option>
                            <option value="B.Sc / Degree">B.Sc / Degree</option>
                          </select>
                          {errors.className && <p className="text-xs text-[#ff8a80] mt-1">{errors.className}</p>}
                        </div>

                        {/* 4. Section */}
                        <div id="field-section">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Section <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="text"
                            value={sectionVal}
                            onChange={(e) => {
                              setSectionVal(e.target.value);
                              if (errors.section) setErrors(prev => ({ ...prev, section: '' }));
                            }}
                            placeholder="e.g. A, B, C or 1, 2"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.section ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.section && <p className="text-xs text-[#ff8a80] mt-1">{errors.section}</p>}
                        </div>

                        {/* 5. Branch / Department */}
                        <div id="field-dept">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Branch / Department <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="text"
                            value={dept}
                            onChange={(e) => {
                              setDept(e.target.value);
                              if (errors.dept) setErrors(prev => ({ ...prev, dept: '' }));
                            }}
                            placeholder="e.g. Computer Science & Engineering"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.dept ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.dept && <p className="text-xs text-[#ff8a80] mt-1">{errors.dept}</p>}
                        </div>

                        {/* 6. Year of Study */}
                        <div id="field-year">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Year of Study <span className="text-[#ff8a80]">*</span>
                          </label>
                          <select
                            value={year}
                            onChange={(e) => {
                              setYear(e.target.value);
                              if (errors.year) setErrors(prev => ({ ...prev, year: '' }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.year ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          >
                            <option value="1st Year">1st Year (Freshman)</option>
                            <option value="2nd Year">2nd Year (Sophomore)</option>
                            <option value="3rd Year">3rd Year (Junior)</option>
                            <option value="4th Year">4th Year (Senior)</option>
                          </select>
                          {errors.year && <p className="text-xs text-[#ff8a80] mt-1">{errors.year}</p>}
                        </div>

                        {/* 7. Phone Number */}
                        <div id="field-phone">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Phone Number <span className="text-[#a79f8b] font-normal">(10 digits)</span> <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={phone}
                            onChange={(e) => {
                              setPhone(e.target.value);
                              if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
                            }}
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] font-mono transition-colors ${
                              errors.phone ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.phone && <p className="text-xs text-[#ff8a80] mt-1">{errors.phone}</p>}
                        </div>

                        {/* College Name */}
                        <div id="field-college">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            College / Institution <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="text"
                            value={college}
                            onChange={(e) => {
                              setCollege(e.target.value);
                              if (errors.college) setErrors(prev => ({ ...prev, college: '' }));
                            }}
                            placeholder="e.g. NBKRIST, Vidyanagar"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.college ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.college && <p className="text-xs text-[#ff8a80] mt-1">{errors.college}</p>}
                        </div>

                        {/* Email Address */}
                        <div id="field-email" className="sm:col-span-2">
                          <label className="block text-xs font-semibold text-[#f3ecd9] mb-1.5">
                            Email Address <span className="text-[#ff8a80]">*</span>
                          </label>
                          <input
                            type="email"
                            value={email}
                            onChange={(e) => {
                              setEmail(e.target.value);
                              if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                            }}
                            placeholder="ananya@gmail.com"
                            className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                              errors.email ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                            }`}
                          />
                          {errors.email && <p className="text-xs text-[#ff8a80] mt-1">{errors.email}</p>}
                        </div>

                        {/* IEEE Membership Toggle */}
                        <div className="sm:col-span-2 space-y-3 pt-1">
                          <label className="block text-xs font-semibold text-[#f3ecd9]">
                            IEEE Membership Status
                          </label>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            <button
                              type="button"
                              onClick={() => {
                                if (isNonIeeeSlotsFull) {
                                  alert(`Non-IEEE Delegate quota of ${nonIeeeSlotsLimit} slots is fully booked.`);
                                  return;
                                }
                                setIsIeeeMember(false);
                                setIeeeId('');
                              }}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                !isIeeeMember
                                  ? 'bg-[#181820] border-[#d4a935] text-[#f3ecd9] ring-1 ring-[#d4a935]/40'
                                  : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#a79f8b]'
                              } ${isNonIeeeSlotsFull ? 'opacity-60 border-red-500/40 cursor-not-allowed' : ''}`}
                            >
                              <span>Non-IEEE Member (₹150)</span>
                              {nonIeeeSlotsLimit > 0 && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  isNonIeeeSlotsFull
                                    ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                                    : 'bg-[#70baff]/20 text-[#70baff]'
                                }`}>
                                  {isNonIeeeSlotsFull ? 'FULL' : `${nonIeeeSlotsLimit - nonIeeeDelegatesCount} left`}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (isIeeeSlotsFull) {
                                  alert(`IEEE Member quota of ${ieeeSlotsLimit} slots is fully booked.`);
                                  return;
                                }
                                setIsIeeeMember(true);
                              }}
                              className={`py-2.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer flex items-center justify-between gap-1.5 ${
                                isIeeeMember
                                  ? 'bg-[#1f1b0e] border-[#f2c14e] text-[#f2c14e] ring-1 ring-[#f2c14e]/40'
                                  : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#a79f8b]'
                              } ${isIeeeSlotsFull ? 'opacity-60 border-red-500/40 cursor-not-allowed' : ''}`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5 text-[#f2c14e]" />
                                <span>IEEE Member (₹150)</span>
                              </span>
                              {ieeeSlotsLimit > 0 && (
                                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                                  isIeeeSlotsFull
                                    ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                                    : 'bg-[#4cc38a]/20 text-[#4cc38a]'
                                }`}>
                                  {isIeeeSlotsFull ? 'FULL' : `${ieeeSlotsLimit - ieeeMembersCount} left`}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* Spot Event Food Preference or Technical Food Preference */}
                          {selectedEvents.length === 0 && includeSpotEvents ? (
                            <div className="p-3.5 rounded-xl bg-[#14141d] border border-[#2e2b22] space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Utensils className="w-4 h-4 text-[#f2c14e]" />
                                  <span className="text-xs font-bold text-[#ffffff]">
                                    Spot Event Lunch & Food Token (Desk 3)
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[#f2c14e]/10 text-[#f2c14e] border border-[#f2c14e]/30">
                                  Optional +₹50
                                </span>
                              </div>
                              <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                                For Spot Events, food is not included by default (<strong>₹100</strong> Standard Entry). If you want networking lunch & meal tray token, you can add food for an extra <strong>₹50</strong> (Total <strong>₹150</strong>).
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(false)}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    !wantsFood
                                      ? 'bg-[#1f1b0e] border-[#d4a935] ring-1 ring-[#d4a935]/40 text-[#ffffff]'
                                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#3d382c]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Standard Spot Entry</span>
                                    <span className="font-mono font-bold text-xs text-[#f2c14e]">₹100</span>
                                  </div>
                                  <span className="text-[10px] text-[#a79f8b] block mt-0.5">
                                    No Food / Lunch (Afternoon Games Pass)
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(true)}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    wantsFood
                                      ? 'bg-[#1f1b0e] border-[#d4a935] ring-1 ring-[#d4a935]/40 text-[#ffffff]'
                                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#3d382c]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold flex items-center gap-1">
                                      <span>Spot Pass + Food</span>
                                      <span className="text-[9px] bg-[#4cc38a]/20 text-[#4cc38a] px-1 rounded font-mono">+₹50</span>
                                    </span>
                                    <span className="font-mono font-bold text-xs text-[#f2c14e]">₹150</span>
                                  </div>
                                  <span className="text-[10px] text-[#86efac] block mt-0.5">
                                    Includes Official Desk 3 Meal Tray Token ✓
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : !isIeeeMember ? (
                            <div className="p-3.5 rounded-xl bg-[#14141d] border border-[#2e2b22] space-y-2.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <Utensils className="w-4 h-4 text-[#f2c14e]" />
                                  <span className="text-xs font-bold text-[#ffffff]">
                                    Symposium Lunch & Food Token (Desk 3)
                                  </span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold bg-[#f2c14e]/10 text-[#f2c14e] border border-[#f2c14e]/30">
                                  Optional +₹50
                                </span>
                              </div>
                              <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                                Normal registration fee is <strong>₹150</strong> (Without Food). If you want networking lunch & meal tray token, you can add food for an extra <strong>₹50</strong> (Total <strong>₹200</strong>).
                              </p>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(false)}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    !wantsFood
                                      ? 'bg-[#1f1b0e] border-[#d4a935] ring-1 ring-[#d4a935]/40 text-[#ffffff]'
                                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#3d382c]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold">Standard Entry</span>
                                    <span className="font-mono font-bold text-xs text-[#f2c14e]">₹150</span>
                                  </div>
                                  <span className="text-[10px] text-[#a79f8b] block mt-0.5">
                                    No Food / Lunch (Registration & Kit only)
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(true)}
                                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                    wantsFood
                                      ? 'bg-[#1f1b0e] border-[#d4a935] ring-1 ring-[#d4a935]/40 text-[#ffffff]'
                                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-[#3d382c]'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold flex items-center gap-1">
                                      <span>Include Food / Lunch</span>
                                      <span className="text-[9px] bg-[#4cc38a]/20 text-[#4cc38a] px-1 rounded font-mono">+₹50</span>
                                    </span>
                                    <span className="font-mono font-bold text-xs text-[#f2c14e]">₹200</span>
                                  </div>
                                  <span className="text-[10px] text-[#86efac] block mt-0.5">
                                    Includes Official Desk 3 Meal Tray Token ✓
                                  </span>
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 rounded-xl bg-[#0f2419] border border-[#4cc38a]/40 text-xs text-[#86efac] flex items-center gap-2">
                              <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0" />
                              <span>
                                <strong>IEEE Member Perk:</strong> 1 Complimentary Lunch Meal Tray Token is <strong>included</strong> with your ₹150 registration!
                              </span>
                            </div>
                          )}

                          {isIeeeMember && (
                            <div className="pt-2" id="field-ieeeId">
                              <label className="block text-xs font-semibold text-[#f2c14e] mb-1.5 flex items-center justify-between">
                                <span>IEEE Membership Number *</span>
                                <span className="text-[11px] text-[#a79f8b]">8-digit ID verified on entrance</span>
                              </label>
                              <input
                                type="text"
                                value={ieeeId}
                                onChange={(e) => {
                                  setIeeeId(e.target.value);
                                  if (errors.ieeeId) setErrors(prev => ({ ...prev, ieeeId: '' }));
                                }}
                                placeholder="e.g. 98124578"
                                className={`w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border text-sm text-[#f3ecd9] font-mono placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] transition-colors ${
                                  errors.ieeeId ? 'border-[#ff8a80]' : 'border-[#d4a935]/50'
                                }`}
                              />
                              {errors.ieeeId && <p className="text-xs text-[#ff8a80] mt-1">{errors.ieeeId}</p>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 2. CHOOSE YOUR EVENTS (TECHNICAL & SPOT) */}
                    <div id="events" className="scroll-mt-24" />
                    <div className="bg-[#131318] p-4 sm:p-6 md:p-8 rounded-2xl border border-[#2e2b22] space-y-6 scroll-mt-24" id="events-section">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2b22] pb-4">
                        <div>
                          <h3 className="font-serif-title text-xl sm:text-2xl font-bold text-[#ffffff]">
                            2. Choose Your Events
                          </h3>
                          <p className="text-xs text-[#a79f8b] mt-1">
                            Register for a <span className="text-[#f2c14e] font-semibold">Technical Event</span> (1 max), <span className="text-[#70baff] font-semibold">Spot Events Pass</span> (₹100), or <span className="text-[#4cc38a] font-semibold">Both</span>:
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          {selectedEvents.length > 0 && (
                            <span className="text-xs font-mono text-[#d4a935] bg-[#1f1b0e] px-2.5 py-1 rounded-md border border-[#d4a935]/30">
                              Tech: {EVENTS.find(e => e.id === selectedEvents[0])?.name}
                            </span>
                          )}
                          {includeSpotEvents && (
                            <span className="text-xs font-mono text-[#70baff] bg-[#0c1c2e] px-2.5 py-1 rounded-md border border-[#0088d4]/30">
                              + Spot Pass ({effectiveSpotCount} {effectiveSpotCount === 1 ? 'Head' : 'Heads'} · ₹{spotSubtotal})
                            </span>
                          )}
                        </div>
                      </div>

                      {eventWarning && (
                        <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/40 text-xs text-amber-300 flex items-center gap-2 animate-pulse">
                          <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                          <span className="font-medium">{eventWarning}</span>
                        </div>
                      )}

                      {errors.events && (
                        <div className="p-3 rounded-xl bg-[#ff8a80]/10 border border-[#ff8a80]/30 text-xs text-[#ff8a80] flex items-center gap-2">
                          <AlertCircle className="w-4 h-4 shrink-0" />
                          <span>{errors.events}</span>
                        </div>
                      )}

                      {/* TRACK 1: TECHNICAL EVENTS (5 EVENTS) */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between pb-1">
                          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#d4a935]">
                            <Trophy className="w-4 h-4" />
                            <span>Track 1: Flagship Technical Events (10:00 AM – 12:00 PM)</span>
                          </div>
                          <span className="text-[11px] font-mono text-[#f2c14e]">
                            {isIeeeMember ? '₹150 for IEEE Member (Meal Included)' : wantsFood ? '₹200 with Food (₹150 Base + ₹50 Lunch)' : '₹150 Standard (Food +₹50 Option)'}
                          </span>
                        </div>

                        {/* Event Cards List */}
                        <div className="space-y-4">
                        {EVENTS.map((event) => {
                          const isSelected = selectedEvents.includes(event.id);
                          const fee = isIeeeMember ? event.feeMember : event.feeNonMember;
                          const details = teamDetails[event.id] || { teamName: '', members: [] };
                          const currentMembers = details.members || [];
                          const totalTeamMembers = 1 + currentMembers.length; // 1 is lead

                          return (
                            <div
                              key={event.id}
                              onClick={() => selectEvent(event.id)}
                              className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                                isSelected
                                  ? 'bg-[#181820] border-[#d4a935] shadow-lg shadow-[#d4a935]/10 ring-1 ring-[#d4a935]/50'
                                  : 'bg-[#0a0a0d] border-[#2e2b22] hover:border-[#a79f8b]/50'
                              }`}
                            >
                              {/* Event Header row */}
                              <div className="p-5 flex items-start justify-between gap-4">
                                <div className="flex items-start gap-3.5 flex-1">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={(e) => {
                                      e.stopPropagation();
                                      selectEvent(event.id);
                                    }}
                                    onClick={(e) => e.stopPropagation()}
                                    className="mt-1 w-5 h-5 rounded border-[#2e2b22] bg-[#0a0a0d] text-[#d4a935] accent-[#d4a935] cursor-pointer shrink-0"
                                  />
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <span className="font-serif-title text-xl font-bold text-[#ffffff]">
                                        {event.name}
                                      </span>
                                      <span className="text-xs text-[#a79f8b]">
                                        · {event.teamLabel}
                                      </span>
                                      <span className="text-[11px] text-[#d4a935] bg-[#1f1b0e] px-2 py-0.5 rounded border border-[#d4a935]/30">
                                        {event.slot}
                                      </span>
                                      {isSelected && (
                                        <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#f2c14e]/20 text-[#f2c14e] border border-[#f2c14e]/40">
                                          Your Selected Event
                                        </span>
                                      )}
                                    </div>
                                    {event.tagline && (
                                      <p className="text-xs font-semibold text-[#f2c14e] italic">
                                        "{event.tagline}"
                                      </p>
                                    )}
                                    <p className="text-xs text-[#b9ae94] leading-relaxed max-w-xl">
                                      {event.tag}
                                    </p>
                                  </div>
                                </div>

                                <div className="text-right shrink-0 flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                                  <span className="font-mono tabular-nums text-lg font-bold text-[#f2c14e]">
                                    ₹{isIeeeMember ? event.feeMember : (event.feeNonMember + (wantsFood ? 50 : 0))} <span className="text-xs font-sans font-normal text-[#a79f8b]">/ head</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setInspectEvent(event)}
                                    className="text-[11px] text-[#d4a935] hover:text-[#f2c14e] underline transition-colors cursor-pointer"
                                  >
                                    View Rules & Rounds
                                  </button>
                                </div>
                              </div>

                              {/* STRUCTURED TEAM MEMBERS INPUT SECTION */}
                              {isSelected && (event.max > 1 || event.project) && (
                                <div 
                                  className="p-5 pt-0 border-t border-[#2e2b22] bg-[#131318]/70 space-y-5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {event.max > 1 && (
                                    <>
                                      {/* Team Name */}
                                      <div id={`field-teamName_${event.id}`} className="pt-4">
                                        <label className="block text-xs font-semibold text-[#f3ecd9] mb-1">
                                          Team Name <span className="text-[#ff8a80]">*</span>
                                        </label>
                                        <input
                                          type="text"
                                          value={details.teamName || ''}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            setTeamDetails(prev => ({
                                              ...prev,
                                              [event.id]: { ...details, teamName: val }
                                            }));
                                            if (errors[`teamName_${event.id}`]) {
                                              setErrors(errs => {
                                                const copy = { ...errs };
                                                delete copy[`teamName_${event.id}`];
                                                return copy;
                                              });
                                            }
                                          }}
                                          placeholder="e.g. CyberKnights"
                                          className={`w-full px-3.5 py-2 text-xs rounded-xl bg-[#0a0a0d] border text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] ${
                                            errors[`teamName_${event.id}`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                          }`}
                                        />
                                        {errors[`teamName_${event.id}`] && (
                                          <p className="text-[11px] text-[#ff8a80] mt-1">{errors[`teamName_${event.id}`]}</p>
                                        )}
                                      </div>

                                      {/* Team Members Header & Status */}
                                      <div className="pt-2 border-t border-[#2e2b22] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                          <div className="text-xs font-semibold text-[#f2c14e] flex items-center gap-1.5">
                                            <Users className="w-4 h-4" />
                                            <span>Team Members ({totalTeamMembers} of {event.max} max)</span>
                                          </div>
                                          <p className="text-[11px] text-[#a79f8b]">
                                            {event.participationText ? `${event.participationText} Each member enters Name, Roll No, Class, Section, Branch, Year, and Phone.` : `Requires ${event.min} to ${event.max} members. Each member enters Name, Roll No, Class, Section, Branch, Year, and Phone.`}
                                          </p>
                                        </div>

                                        {totalTeamMembers < event.max && (
                                          <button
                                            type="button"
                                            onClick={() => handleAddTeamMember(event.id, event.max)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors cursor-pointer self-start sm:self-auto"
                                          >
                                            <Plus className="w-3.5 h-3.5" />
                                            <span>Add Team Member</span>
                                          </button>
                                        )}
                                      </div>

                                      {errors[`teamCount_${event.id}`] && (
                                        <p className="text-xs text-[#ff8a80]">{errors[`teamCount_${event.id}`]}</p>
                                      )}

                                      {/* MEMBER 1 (TEAM LEAD - PREFILLED FROM PARTICIPANT) */}
                                      <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#d4a935]/40 text-xs space-y-1">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-[#ffffff] flex items-center gap-1.5">
                                            <span>Member 1 (Team Leader):</span>
                                            <span className="text-[#f2c14e] font-medium">{name || 'Your Name'}</span>
                                          </span>
                                          <span className="px-2 py-0.5 rounded bg-[#f2c14e]/20 text-[#f2c14e] font-mono text-[10px] font-bold">
                                            LEAD (YOU)
                                          </span>
                                        </div>
                                        <div className="text-[#a79f8b] text-[11px] font-mono">
                                          Roll: {roll || 'Pending'} · Phone: {phone || 'Pending'} · {classNameVal} ({sectionVal ? `Sec ${sectionVal}` : 'Sec A'}) · {dept || 'Branch'} ({year})
                                        </div>
                                        <div className="text-[11px] pt-0.5">
                                          {isIeeeMember ? (
                                            <span className="text-[#f2c14e] font-medium flex items-center gap-1">
                                              <Award className="w-3 h-3 text-[#f2c14e]" />
                                              <span>IEEE Member (ID: {ieeeId || 'Pending'})</span>
                                            </span>
                                          ) : (
                                            <span className="text-[#a79f8b]">Non-IEEE Member</span>
                                          )}
                                        </div>
                                      </div>

                                      {/* ADDITIONAL TEAM MEMBERS FORM CARDS */}
                                      <div className="space-y-3">
                                        {currentMembers.map((member, mIdx) => (
                                          <div 
                                            key={mIdx} 
                                            className="p-4 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3"
                                          >
                                            <div className="flex items-center justify-between">
                                              <span className="text-xs font-bold text-[#f3ecd9] flex items-center gap-1.5">
                                                <User className="w-3.5 h-3.5 text-[#d4a935]" />
                                                <span>Member {mIdx + 2} Details</span>
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => handleRemoveTeamMember(event.id, mIdx)}
                                                className="text-[11px] text-[#ff8a80] hover:text-[#ffb4ab] flex items-center gap-1 transition-colors cursor-pointer"
                                              >
                                                <Trash2 className="w-3.5 h-3.5" />
                                                <span>Remove</span>
                                              </button>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 text-xs">
                                              {/* Member Name */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Full Name *</label>
                                                <input
                                                  type="text"
                                                  value={member.name}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'name', e.target.value)}
                                                  placeholder="Teammate name"
                                                  className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] ${
                                                    errors[`member_${event.id}_${mIdx}_name`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Member Roll No */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Roll Number *</label>
                                                <input
                                                  type="text"
                                                  value={member.roll}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'roll', e.target.value)}
                                                  placeholder="e.g. 23B91A0515"
                                                  className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] font-mono focus:outline-none focus:border-[#d4a935] ${
                                                    errors[`member_${event.id}_${mIdx}_roll`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Member Phone */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Phone Number (10 digits) *</label>
                                                <input
                                                  type="tel"
                                                  maxLength={10}
                                                  value={member.phone}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'phone', e.target.value)}
                                                  className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] font-mono focus:outline-none focus:border-[#d4a935] ${
                                                    errors[`member_${event.id}_${mIdx}_phone`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Member Class */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Class / Degree *</label>
                                                <select
                                                  value={member.className}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'className', e.target.value)}
                                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                                                >
                                                  <option value="B.Tech">B.Tech</option>
                                                  <option value="M.Tech">M.Tech</option>
                                                  <option value="MCA">MCA</option>
                                                  <option value="MBA">MBA</option>
                                                  <option value="Diploma">Diploma</option>
                                                  <option value="B.Sc / Degree">B.Sc / Degree</option>
                                                </select>
                                              </div>

                                              {/* Member Section */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Section *</label>
                                                <input
                                                  type="text"
                                                  value={member.section}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'section', e.target.value)}
                                                  placeholder="e.g. A, B"
                                                  className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] ${
                                                    errors[`member_${event.id}_${mIdx}_section`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Member Branch */}
                                              <div>
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Branch *</label>
                                                <input
                                                  type="text"
                                                  value={member.branch}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'branch', e.target.value)}
                                                  placeholder="e.g. CSE"
                                                  className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] ${
                                                    errors[`member_${event.id}_${mIdx}_branch`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                  }`}
                                                />
                                              </div>

                                              {/* Member Year */}
                                              <div className="sm:col-span-2 md:col-span-1">
                                                <label className="text-[10px] text-[#a79f8b] block mb-1">Year *</label>
                                                <select
                                                  value={member.year}
                                                  onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'year', e.target.value)}
                                                  className="w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                                                >
                                                  <option value="1st Year">1st Year</option>
                                                  <option value="2nd Year">2nd Year</option>
                                                  <option value="3rd Year">3rd Year</option>
                                                  <option value="4th Year">4th Year</option>
                                                </select>
                                              </div>
                                            </div>

                                            {/* Member IEEE Membership Selection */}
                                            <div className="pt-2 border-t border-[#2e2b22] space-y-2">
                                              <label className="text-[10px] text-[#a79f8b] block font-medium">
                                                IEEE Membership Status *
                                              </label>
                                              <div className="grid grid-cols-2 gap-2">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    handleUpdateTeamMemberField(event.id, mIdx, 'isIeeeMember', false);
                                                    handleUpdateTeamMemberField(event.id, mIdx, 'ieeeId', '');
                                                  }}
                                                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                                                    !member.isIeeeMember
                                                      ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]'
                                                      : 'bg-[#131318] text-[#a79f8b] border-[#2e2b22] hover:border-[#3d382c]'
                                                  }`}
                                                >
                                                  Non-IEEE Member
                                                </button>
                                                <button
                                                  type="button"
                                                  onClick={() => handleUpdateTeamMemberField(event.id, mIdx, 'isIeeeMember', true)}
                                                  className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                                    member.isIeeeMember
                                                      ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]'
                                                      : 'bg-[#131318] text-[#a79f8b] border-[#2e2b22] hover:border-[#3d382c]'
                                                  }`}
                                                >
                                                  <Award className="w-3.5 h-3.5" />
                                                  <span>IEEE Member</span>
                                                </button>
                                              </div>

                                              {member.isIeeeMember && (
                                                <div id={`field-member_${event.id}_${mIdx}_ieeeId`} className="pt-1">
                                                  <label className="text-[10px] text-[#f2c14e] block mb-1 font-medium">
                                                    Member {mIdx + 2} IEEE Membership ID *
                                                  </label>
                                                  <input
                                                    type="text"
                                                    value={member.ieeeId || ''}
                                                    onChange={(e) => handleUpdateTeamMemberField(event.id, mIdx, 'ieeeId', e.target.value)}
                                                    placeholder="Enter IEEE Membership ID (e.g. 99123456)"
                                                    className={`w-full px-2.5 py-1.5 rounded-lg bg-[#131318] border text-xs text-[#f3ecd9] font-mono focus:outline-none focus:border-[#d4a935] ${
                                                      errors[`member_${event.id}_${mIdx}_ieeeId`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                                    }`}
                                                  />
                                                  {errors[`member_${event.id}_${mIdx}_ieeeId`] && (
                                                    <p className="text-[10px] text-[#ff8a80] mt-1">{errors[`member_${event.id}_${mIdx}_ieeeId`]}</p>
                                                  )}
                                                </div>
                                              )}

                                              {/* Teammate Food Selection if Non-IEEE */}
                                              {!member.isIeeeMember && (
                                                <div className="pt-2 flex items-center justify-between border-t border-[#2e2b22]/60 mt-1">
                                                  <div>
                                                    <span className="text-[11px] font-semibold text-[#f3ecd9] flex items-center gap-1">
                                                      <Utensils className="w-3.5 h-3.5 text-[#d4a935]" />
                                                      <span>Food / Lunch Token (+₹50)</span>
                                                    </span>
                                                    <span className="text-[10px] text-[#a79f8b] block">
                                                      {member.wantsFood ? '₹200 total (₹150 + ₹50 Lunch)' : '₹150 standard (Without Food)'}
                                                    </span>
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <button
                                                      type="button"
                                                      onClick={() => handleUpdateTeamMemberField(event.id, mIdx, 'wantsFood', false)}
                                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                                        !member.wantsFood
                                                          ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]'
                                                          : 'bg-[#131318] text-[#a79f8b] border-[#2e2b22]'
                                                      }`}
                                                    >
                                                      No Food (₹150)
                                                    </button>
                                                    <button
                                                      type="button"
                                                      onClick={() => handleUpdateTeamMemberField(event.id, mIdx, 'wantsFood', true)}
                                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border transition-colors cursor-pointer ${
                                                        member.wantsFood
                                                          ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]'
                                                          : 'bg-[#131318] text-[#a79f8b] border-[#2e2b22]'
                                                      }`}
                                                    >
                                                      With Food (₹200)
                                                    </button>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </>
                                  )}

                                  {/* Project Expo Title */}
                                  {event.project && (
                                    <div id={`field-projectTitle_${event.id}`} className="pt-2">
                                      <label className="block text-xs font-semibold text-[#f3ecd9] mb-1">
                                        Project / Prototype Title <span className="text-[#ff8a80]">*</span>
                                      </label>
                                      <input
                                        type="text"
                                        value={details.projectTitle || ''}
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          setTeamDetails(prev => ({
                                            ...prev,
                                            [event.id]: { ...details, projectTitle: val }
                                          }));
                                          if (errors[`projectTitle_${event.id}`]) {
                                            setErrors(errs => {
                                              const copy = { ...errs };
                                              delete copy[`projectTitle_${event.id}`];
                                              return copy;
                                            });
                                          }
                                        }}
                                        placeholder="e.g. Autonomous Solar Powered IoT Irrigation Node"
                                        className={`w-full px-3.5 py-2 text-xs rounded-xl bg-[#0a0a0d] border text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#d4a935] ${
                                          errors[`projectTitle_${event.id}`] ? 'border-[#ff8a80]' : 'border-[#2e2b22]'
                                        }`}
                                      />
                                      {errors[`projectTitle_${event.id}`] && (
                                        <p className="text-[11px] text-[#ff8a80] mt-1">{errors[`projectTitle_${event.id}`]}</p>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Option to clear technical event if participant only wants Spot Events */}
                      {selectedEvents.length > 0 ? (
                        <div className="flex justify-end pt-2 pb-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedEvents([]);
                              setIncludeSpotEvents(true);
                              setEventWarning('');
                            }}
                            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#1f1b0e] hover:bg-[#2a2312] text-[#f2c14e] hover:text-[#fff2b2] border border-[#d4a935]/60 hover:border-[#f2c14e] text-xs font-semibold transition-all shadow-sm hover:shadow-[#f2c14e]/10 cursor-pointer active:scale-95"
                          >
                            <span className="text-[#ff8a80] font-bold text-sm leading-none">✕</span>
                            <span>Deselect Technical Event (Attend Spot Events Only)</span>
                          </button>
                        </div>
                      ) : (
                        <div className="p-4 rounded-xl bg-[#fff9ea] dark:bg-[#1f1a0e] border-2 border-[#d4a935] shadow-lg text-xs sm:text-sm text-[#2a1e05] dark:text-[#f5ebd6] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 transition-all">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-[#f2c14e]/25 text-[#b38600] dark:text-[#f2c14e] shrink-0">
                              <Info className="w-4 h-4" />
                            </div>
                            <span className="font-medium leading-relaxed">
                              <strong className="text-[#b38600] dark:text-[#f2c14e] font-bold">No Technical Event selected.</strong>{' '}
                              Choose one above, or proceed with Spot Events below.
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => selectEvent('ctf')}
                            className="px-3.5 py-2 rounded-lg bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] font-bold text-xs shadow-md transition-all shrink-0 hover:scale-[1.03] cursor-pointer flex items-center gap-1.5 self-end sm:self-auto"
                          >
                            <span>Select FLAGHUNT</span>
                            <span aria-hidden="true">&rarr;</span>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* TRACK 2: SPOT EVENTS (NON-TECHNICAL) */}
                    <div className="pt-6 border-t border-[#2e2b22] space-y-4">
                      <div className="flex items-center justify-between pb-1">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#70baff]">
                          <Sparkles className="w-4 h-4 text-[#70baff]" />
                          <span>Track 2: Spot Events / Non-Technical Pass (01:30 PM – 03:30 PM)</span>
                        </div>
                        <span className="text-[11px] font-mono font-bold text-[#4cc38a] bg-[#142617] px-2.5 py-0.5 rounded-full border border-[#4cc38a]/40">
                          100/- For Spot Events
                        </span>
                      </div>

                      {/* Interactive Spot Events Card */}
                      <div
                        onClick={() => toggleSpotEvents()}
                        className={`rounded-2xl border transition-all duration-200 overflow-hidden cursor-pointer ${
                          includeSpotEvents
                            ? 'bg-gradient-to-r from-[#0d1e34] via-[#091524] to-[#070e17] border-[#0088d4] shadow-lg shadow-[#0088d4]/15 ring-1 ring-[#0088d4]/50'
                            : 'bg-[#0a0a0d] border-[#2e2b22] hover:border-[#0088d4]/40'
                        }`}
                      >
                        <div className="p-5 flex items-start justify-between gap-4">
                          <label className="flex items-start gap-3.5 flex-1 cursor-pointer" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={includeSpotEvents}
                              onChange={(e) => toggleSpotEvents(e.target.checked)}
                              className="mt-1 w-5 h-5 rounded border-[#2e2b22] bg-[#0a0a0d] text-[#0088d4] accent-[#0088d4] cursor-pointer"
                            />
                            <div className="space-y-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-serif-title text-xl font-bold text-[#ffffff]">
                                  Spot Events Pass (Non-Technical)
                                </span>
                                <span className="text-xs text-[#a79f8b]">
                                  · Individual / Open Entry
                                </span>
                                <span className="text-[11px] text-[#70baff] bg-[#0c1c2e] px-2 py-0.5 rounded border border-[#0088d4]/30">
                                  01:30 PM – 03:30 PM
                                </span>
                                {includeSpotEvents && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#0088d4]/20 text-[#70baff] border border-[#0088d4]/40">
                                    Pass Selected
                                  </span>
                                )}
                              </div>
                              <p className="text-xs font-semibold text-[#f2c14e] italic">
                                "{SPOT_EVENT.tagline}"
                              </p>
                              <p className="text-xs text-[#b9ae94] leading-relaxed max-w-xl">
                                {SPOT_EVENT.tag}
                              </p>
                              <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-[#8ea8c9]">
                                <span className="flex items-center gap-1 text-[#4cc38a]">
                                  <Check className="w-3.5 h-3.5" /> Entry to all non-technical spot games
                                </span>
                                <span className="flex items-center gap-1 text-[#4cc38a]">
                                  <Check className="w-3.5 h-3.5" /> Central Courtyard & Seminar Halls
                                </span>
                                <span className="flex items-center gap-1 text-[#f2c14e]">
                                  <Utensils className="w-3.5 h-3.5" /> No Food Included (Add Food: +₹50)
                                </span>
                              </div>
                            </div>
                          </label>

                          <div className="text-right shrink-0 flex flex-col items-end gap-1" onClick={(e) => e.stopPropagation()}>
                            <span className="font-mono tabular-nums text-2xl font-bold text-[#4cc38a]">
                              ₹{includeSpotEvents && totalTeamHeads > 1 ? spotSubtotal : 100}
                            </span>
                            <span className="text-[10px] uppercase font-bold tracking-wider text-[#8ea8c9]">
                              {includeSpotEvents && totalTeamHeads > 1 ? `${effectiveSpotCount} Passes (₹100/ea · No Food)` : 'Spot Events (₹100 · No Food)'}
                            </span>
                          </div>
                        </div>

                        {/* When a team event (like CTF 2 members) is active, allow selecting Spot Passes for all or specific team members */}
                        {includeSpotEvents && totalTeamHeads > 1 && (
                          <div className="p-4 pt-3.5 border-t border-[#0088d4]/30 bg-[#071320]/70 space-y-3" onClick={(e) => e.stopPropagation()}>
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-[#ffffff] flex items-center gap-1.5">
                                  <Users className="w-3.5 h-3.5 text-[#70baff]" />
                                  <span>Team Spot Event Passes ({effectiveSpotCount} of {totalTeamHeads} Selected · ₹{spotSubtotal})</span>
                                </span>
                                <p className="text-[11px] text-[#8ea8c9] mt-0.5">
                                  Select which team members participate in afternoon spot games (₹100 per member):
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={selectAllSpotMembers}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                                    effectiveSpotCount === totalTeamHeads
                                      ? 'bg-[#0088d4] text-white shadow-sm'
                                      : 'bg-white/5 hover:bg-white/10 text-[#70baff] border border-[#0088d4]/40'
                                  }`}
                                >
                                  All ({totalTeamHeads} Passes · ₹{totalTeamHeads * 100})
                                </button>
                                <button
                                  type="button"
                                  onClick={selectLeadOnlySpot}
                                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                    effectiveSpotCount === 1 && spotMembersSelected.lead !== false && !teamMembersList.some((_, i) => spotMembersSelected[i])
                                      ? 'bg-[#0088d4] text-white shadow-sm'
                                      : 'bg-white/5 hover:bg-white/10 text-[#a79f8b] border border-white/10'
                                  }`}
                                >
                                  Lead Only (1 Pass · ₹100)
                                </button>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                              {/* Team Lead Checkbox */}
                              <label className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                spotMembersSelected.lead !== false
                                  ? 'bg-[#0088d4]/15 border-[#0088d4]/60 text-white shadow-sm'
                                  : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-white/20'
                              }`}>
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <input
                                    type="checkbox"
                                    checked={spotMembersSelected.lead !== false}
                                    onChange={() => toggleSpotMember('lead')}
                                    className="w-4 h-4 rounded border-[#2e2b22] text-[#0088d4] accent-[#0088d4] cursor-pointer"
                                  />
                                  <div className="truncate">
                                    <span className="font-semibold text-xs text-[#f3ecd9] block truncate">
                                      {name.trim() || 'Team Lead'} (Leader)
                                    </span>
                                    <span className="text-[10px] text-[#70baff] font-mono">
                                      {roll ? `Roll: ${roll}` : 'Lead Participant'}
                                    </span>
                                  </div>
                                </div>
                                <span className="font-mono text-xs font-bold text-[#4cc38a] ml-2 shrink-0">
                                  ₹100
                                </span>
                              </label>

                              {/* Teammates Checkboxes */}
                              {teamMembersList.map((m, idx) => {
                                const isChecked = spotMembersSelected[idx] !== false;
                                return (
                                  <label key={idx} className={`flex items-center justify-between p-3 rounded-xl border transition-all cursor-pointer ${
                                    isChecked
                                      ? 'bg-[#0088d4]/15 border-[#0088d4]/60 text-white shadow-sm'
                                      : 'bg-[#0a0a0d] border-[#2e2b22] text-[#a79f8b] hover:border-white/20'
                                  }`}>
                                    <div className="flex items-center gap-2.5 min-w-0">
                                      <input
                                        type="checkbox"
                                        checked={isChecked}
                                        onChange={() => toggleSpotMember(idx)}
                                        className="w-4 h-4 rounded border-[#2e2b22] text-[#0088d4] accent-[#0088d4] cursor-pointer"
                                      />
                                      <div className="truncate">
                                        <span className="font-semibold text-xs text-[#f3ecd9] block truncate">
                                          {m.name.trim() || `Member ${idx + 2}`} (Teammate)
                                        </span>
                                        <span className="text-[10px] text-[#8ea8c9] font-mono">
                                          {m.roll ? `Roll: ${m.roll}` : `Team Member ${idx + 2}`}
                                        </span>
                                      </div>
                                    </div>
                                    <span className="font-mono text-xs font-bold text-[#4cc38a] ml-2 shrink-0">
                                      ₹100
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right Column: Checkout Summary & Proceed Button */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
                  <div id="checkout-card" className="bg-[#131318] p-5 sm:p-6 rounded-2xl border border-[#2e2b22] space-y-6 shadow-xl scroll-mt-24">
                    <div className="flex items-center justify-between border-b border-[#2e2b22] pb-4">
                      <h4 className="font-serif-title text-xl font-bold text-[#ffffff]">
                        Registration Summary
                      </h4>
                      <span className="text-xs font-mono text-[#a79f8b]">
                        {totalTeamHeads} {totalTeamHeads === 1 ? 'Delegate Pass' : 'Delegate Passes'}
                      </span>
                    </div>

                    {/* Participant Preview Pill */}
                    <div className="p-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#a79f8b]">Participant:</span>
                        <span className="font-semibold text-[#f3ecd9]">{name || 'Your Name'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a79f8b]">
                        <span>Roll & Phone:</span>
                        <span className="font-mono text-[#f2c14e]">{roll || '---'} · {phone || '---'}</span>
                      </div>
                      <div className="flex items-center justify-between text-[#a79f8b]">
                        <span>Class & Sec:</span>
                        <span>{classNameVal} {sectionVal ? `(${sectionVal})` : ''} · {dept || 'Branch'}</span>
                      </div>
                    </div>

                    {/* Line Items for Selected Events */}
                    <div className="space-y-3">
                      {selectedEvents.map(id => {
                        const ev = EVENTS.find(e => e.id === id);
                        if (!ev) return null;
                        const details = teamDetails[id] || { teamName: '', members: [] };
                        const totalHeads = 1 + (ev.max > 1 ? (details.members?.length || 0) : 0);
                        const leaderBase = isIeeeMember ? ev.feeMember : ev.feeNonMember;
                        const leaderFood = (!isIeeeMember && wantsFood) ? 50 : 0;
                        const leaderFee = leaderBase + leaderFood;
                        const teammatesFee = (details.members || []).reduce((mSum, m) => {
                          const mBase = m.isIeeeMember ? ev.feeMember : ev.feeNonMember;
                          const mFood = (!m.isIeeeMember && m.wantsFood) ? 50 : 0;
                          return mSum + mBase + mFood;
                        }, 0);
                        const evTotal = leaderFee + teammatesFee;

                        return (
                          <div key={id} className="p-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-1.5 text-xs">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <span className="font-semibold text-[#f3ecd9] block">{ev.name}</span>
                                <span className="text-[#a79f8b] text-[11px] block">{ev.slot} · {ev.teamLabel}</span>
                              </div>
                              <span className="font-mono font-bold text-[#f2c14e] text-sm">₹{evTotal}</span>
                            </div>
                            <div className="pt-1.5 border-t border-[#2e2b22]/60 flex items-center justify-between text-[11px] text-[#a79f8b]">
                              <span>{totalHeads} {totalHeads === 1 ? 'Head (1 Participant)' : `Heads (${totalHeads} Participants)`}</span>
                              <span className="font-mono">
                                {isIeeeMember 
                                  ? '₹150 / head (IEEE · Lunch Incl.)' 
                                  : wantsFood 
                                  ? '₹200 / head (₹150 + ₹50 Food)' 
                                  : '₹150 / head (Standard · No Food)'}
                              </span>
                            </div>
                          </div>
                        );
                      })}

                      {/* Line Item for Spot Events Pass */}
                      {includeSpotEvents && (
                        <div className="p-3 rounded-xl bg-gradient-to-r from-[#0d1e34] to-[#070e17] border border-[#0088d4]/40 space-y-1.5 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <span className="font-semibold text-[#f3ecd9] flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#70baff]" />
                                <span>Spot Events Pass</span>
                              </span>
                              <span className="text-[#8ea8c9] text-[11px] block">01:30 PM – 03:30 PM · Non-Technical (No Food Included)</span>
                            </div>
                            <span className="font-mono font-bold text-[#70baff] text-sm">₹{spotSubtotal}</span>
                          </div>
                          <div className="pt-1.5 border-t border-[#1b324d]/60 flex items-center justify-between text-[11px] text-[#8ea8c9]">
                            <span>
                              {effectiveSpotCount} {effectiveSpotCount === 1 ? 'Delegate' : 'Delegates'}
                              {totalTeamHeads > 1 ? ` (${spotMemberNames.join(' + ')})` : ' (Afternoon Arena Pass · No Food)'}
                            </span>
                            <span className="font-mono">
                              {effectiveSpotCount > 1 ? `₹100 × ${effectiveSpotCount}` : '₹100 flat'}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Interactive Food Option in Delegate Pass Summary */}
                    {isIeeeMember && selectedEvents.length > 0 ? (
                      <div className="p-2.5 rounded-xl bg-[#0f2419] border border-[#4cc38a]/40 text-xs text-[#86efac] flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0" />
                          <span>IEEE Member Perk: Lunch Included</span>
                        </div>
                        <span className="text-[10px] bg-[#4cc38a]/20 text-[#86efac] px-2 py-0.5 rounded font-mono font-bold">
                          Free ✓
                        </span>
                      </div>
                    ) : totalTeamHeads === 1 ? (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-[#17161f] via-[#1a1710] to-[#17161f] border border-[#d4a935]/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#f2c14e]" />
                            <span>Lunch & Food Option</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-[#f2c14e]/10 text-[#f2c14e] border border-[#f2c14e]/30">
                            Optional +₹50
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setWantsFood(false)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center ${
                              !wantsFood
                                ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935] ring-1 ring-[#d4a935]/40 shadow-sm'
                                : 'bg-[#0a0a0d] text-[#a79f8b] border-[#2e2b22] hover:border-[#3d382c]'
                            }`}
                          >
                            <span className="font-bold">No Food</span>
                            <span className="text-[10px] opacity-75 font-mono">₹{selectedEvents.length === 0 ? 100 : 150} Base</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setWantsFood(true)}
                            className={`py-2 px-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex flex-col items-center justify-center gap-0.5 text-center ${
                              wantsFood
                                ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935] ring-1 ring-[#d4a935]/40 shadow-sm'
                                : 'bg-[#0a0a0d] text-[#a79f8b] border-[#2e2b22] hover:border-[#3d382c]'
                            }`}
                          >
                            <span className="font-bold flex items-center gap-1">
                              <span>Add Food</span>
                              <span className="text-[9px] bg-[#4cc38a]/20 text-[#4cc38a] px-1 rounded font-mono">+₹50</span>
                            </span>
                            <span className="text-[10px] opacity-75 font-mono">₹{selectedEvents.length === 0 ? 150 : 200} Total</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3 rounded-xl bg-gradient-to-r from-[#17161f] via-[#1a1710] to-[#17161f] border border-[#d4a935]/40 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#f2c14e]" />
                            <span>Team Food Tokens ({foodCount}/{totalTeamHeads} Selected)</span>
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold bg-[#f2c14e]/10 text-[#f2c14e] border border-[#f2c14e]/30">
                            +₹50 / head
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {/* Team Lead Food Toggle */}
                          <div className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                            <span className="text-xs text-white truncate max-w-[130px]">
                              {name.trim() || 'Leader'} <span className="text-[10px] text-[#a79f8b]">(Lead)</span>
                            </span>
                            {isIeeeMember && selectedEvents.length > 0 ? (
                              <span className="text-[10px] text-[#86efac] font-bold">IEEE Lunch Incl. ✓</span>
                            ) : (
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(false)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                    !wantsFood ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]' : 'text-[#a79f8b] hover:text-white'
                                  }`}
                                >
                                  No Food
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setWantsFood(true)}
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                    wantsFood ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]' : 'text-[#a79f8b] hover:text-white'
                                  }`}
                                >
                                  +₹50 Food
                                </button>
                              </div>
                            )}
                          </div>

                          {/* Teammates Food Toggles */}
                          {activeTechEvent && activeTechDetails && activeTechDetails.members?.map((m, mIdx) => (
                            <div key={mIdx} className="flex items-center justify-between p-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                              <span className="text-xs text-white truncate max-w-[130px]">
                                {m.name.trim() || `Member ${mIdx + 2}`}
                              </span>
                              {m.isIeeeMember ? (
                                <span className="text-[10px] text-[#86efac] font-bold">IEEE Lunch Incl. ✓</span>
                              ) : (
                                <div className="flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTeamMemberField(activeTechEvent.id, mIdx, 'wantsFood', false)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                      !m.wantsFood ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]' : 'text-[#a79f8b] hover:text-white'
                                    }`}
                                  >
                                    No Food
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateTeamMemberField(activeTechEvent.id, mIdx, 'wantsFood', true)}
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-all cursor-pointer ${
                                      m.wantsFood ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]' : 'text-[#a79f8b] hover:text-white'
                                    }`}
                                  >
                                    +₹50 Food
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Cost Breakdown with GST */}
                    <div className="space-y-2 pt-2 border-t border-[#2e2b22] text-xs">
                      <div className="flex justify-between items-center text-[#a79f8b]">
                        <span>Base Registration Subtotal</span>
                        <span className="font-mono text-[#f3ecd9] font-medium">₹{subtotal - foodAddonTotal}</span>
                      </div>
                      {foodAddonTotal > 0 ? (
                        <div className="flex justify-between items-center text-[#86efac]">
                          <span className="flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#4cc38a]" />
                            <span>Food & Lunch Token ({foodAddonTotal / 50} × ₹50)</span>
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold">+₹{foodAddonTotal}</span>
                            {totalTeamHeads === 1 && (
                              <button
                                type="button"
                                onClick={() => setWantsFood(false)}
                                className="text-[10px] text-[#f87171] hover:underline cursor-pointer ml-0.5"
                                title="Remove food option"
                              >
                                (Remove)
                              </button>
                            )}
                          </div>
                        </div>
                      ) : (!isIeeeMember || selectedEvents.length === 0) ? (
                        <div className="flex justify-between items-center text-[#a79f8b]">
                          <span className="flex items-center gap-1.5">
                            <Utensils className="w-3.5 h-3.5 text-[#a79f8b]" />
                            <span>Food & Lunch Token</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => setWantsFood(true)}
                            className="text-[10px] font-bold text-[#f2c14e] hover:text-[#ffd166] cursor-pointer bg-[#f2c14e]/10 hover:bg-[#f2c14e]/20 px-2 py-0.5 rounded border border-[#f2c14e]/30 transition-all flex items-center gap-1"
                          >
                            <span>+ Add Food (₹50)</span>
                          </button>
                        </div>
                      ) : null}
                        <div className="flex justify-between items-center text-[#a79f8b]">
                          <span>Net Subtotal</span>
                          <span className="font-mono text-[#f3ecd9] font-medium">₹{subtotal}</span>
                        </div>
                        <div className="flex justify-between items-center text-[#a79f8b]">
                          <span className="flex items-center gap-1.5">
                            <span>GST ({gstPercent}% · ₹2 per ₹100)</span>
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#f2c14e]/10 text-[#f2c14e] border border-[#f2c14e]/30 font-mono">
                              Govt. Tax
                            </span>
                          </span>
                          <span className="font-mono text-[#f2c14e] font-semibold">+₹{gstAmount}</span>
                        </div>
                        <div className="flex justify-between items-baseline pt-2 border-t border-[#2e2b22] font-bold text-sm text-[#ffffff]">
                          <span>Total Payable</span>
                          <div className="text-right">
                            <span className="font-mono tabular-nums text-2xl text-[#f2c14e]">₹{total}</span>
                            <span className="text-[10px] text-[#a79f8b] font-normal block">Razorpay & UPI · Incl. {gstPercent}% GST</span>
                          </div>
                        </div>
                      </div>

                      {/* Terms and Conditions Checkbox */}
                      <div className="pt-2">
                        <label className="flex items-start gap-2.5 text-xs text-[#a79f8b] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={termsAccepted}
                            onChange={(e) => {
                              setTermsAccepted(e.target.checked);
                              if (errors.terms) setErrors(prev => ({ ...prev, terms: '' }));
                            }}
                            className="mt-0.5 rounded border-[#2e2b22] bg-[#0a0a0d] text-[#d4a935] accent-[#d4a935] cursor-pointer"
                          />
                          <span>
                            I agree to the NexusVerse 2K26 symposium guidelines and code of conduct.
                          </span>
                        </label>
                        {errors.terms && <p className="text-xs text-[#ff8a80] mt-1">{errors.terms}</p>}
                      </div>

                      {/* Submit / Proceed to Payment Button */}
                      {isRegClosed ? (
                        <div className="p-4 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-center space-y-1.5">
                          <span className="font-bold text-sm text-[#ff8a80] block">Registration Closed</span>
                          <p className="text-[11px] text-[#ffb4ab] leading-relaxed">
                            {closedMessage}
                          </p>
                        </div>
                      ) : isTotalSlotsFull ? (
                        <div className="p-4 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-center space-y-1.5">
                          <span className="font-bold text-sm text-[#ff8a80] block">Symposium Registration Full</span>
                          <p className="text-[11px] text-[#ffb4ab] leading-relaxed">
                            Total symposium quota of {totalSlotsLimit} delegate slots has been fully booked. For spot entries or waitlist, contact the IEEE-SB reception.
                          </p>
                        </div>
                      ) : (isIeeeMember && isIeeeSlotsFull) ? (
                        <div className="p-4 rounded-xl bg-[#2a1a0f] border border-[#f59e0b]/40 text-center space-y-1.5">
                          <span className="font-bold text-sm text-[#f59e0b] block">IEEE Member Quota Filled</span>
                          <p className="text-[11px] text-[#fcd34d] leading-relaxed">
                            All {ieeeSlotsLimit} IEEE delegate slots are booked. You can switch to Non-IEEE Member above if general slots are available.
                          </p>
                        </div>
                      ) : (!isIeeeMember && isNonIeeeSlotsFull) ? (
                        <div className="p-4 rounded-xl bg-[#2a1a0f] border border-[#f59e0b]/40 text-center space-y-1.5">
                          <span className="font-bold text-sm text-[#f59e0b] block">Non-IEEE Quota Filled</span>
                          <p className="text-[11px] text-[#fcd34d] leading-relaxed">
                            All {nonIeeeSlotsLimit} Non-IEEE delegate slots are booked.
                          </p>
                        </div>
                      ) : (
                        <button
                          type="submit"
                          className="w-full py-4 px-6 rounded-xl font-bold text-base bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-[#1a1300] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-xl shadow-[#f2c14e]/20 cursor-pointer"
                        >
                          <span>Proceed to Payment</span>
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      )}

                      <div className="flex items-center justify-center gap-1.5 text-[11px] text-[#a79f8b]">
                        <ShieldCheck className="w-4 h-4 text-[#4cc38a]" />
                        <span>Automatic QR & Razorpay Checkout</span>
                      </div>
                    </div>
                  </div>
                </form>
              )}

                {/* Mobile Sticky Quick-Checkout Bar (Only visible when space active and events are chosen) */}
                {Boolean(currentUser) && !confirmedRecord && (selectedEvents.length > 0 || includeSpotEvents) && (
                  <div className="lg:hidden fixed bottom-0 left-0 right-0 z-30 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[#0a0a0d]/95 backdrop-blur-md border-t border-[#2e2b22] flex items-center justify-between gap-3 shadow-2xl max-w-full">
                    <div className="min-w-0">
                      <span className="text-[10px] uppercase font-bold text-[#a79f8b] block">Total Payable</span>
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-xl font-mono font-extrabold text-[#f2c14e]">₹{total}</span>
                        <span className="text-[10px] text-[#4cc38a] font-medium truncate">
                          Incl. {gstPercent}% GST (Base: ₹{subtotal})
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById('checkout-card');
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth' });
                        }
                      }}
                      className="px-4 py-2 rounded-xl font-bold text-xs bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-[#1a1300] hover:brightness-105 active:scale-95 transition-all flex items-center gap-1.5 shadow-md shadow-[#f2c14e]/20 cursor-pointer shrink-0"
                    >
                      <span>Review & Pay</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </section>

            {/* Timeline, FAQ, and Contact Sections */}
            <TimelineSection />
            <FaqSection />
            <ContactSection />
          </>
        )}
      </main>

      {/* Footer */}
      <Footer />

      {/* Event Details Modal */}
      <EventModal
        event={inspectEvent}
        onClose={() => setInspectEvent(null)}
        isIeeeMember={isIeeeMember}
        isSelected={inspectEvent ? selectedEvents.includes(inspectEvent.id) : false}
        onToggleSelect={selectEvent}
      />

      {/* Razorpay & Automatic Dynamic QR Payment Modal */}
      <PaymentModal
        isOpen={isPaymentOpen}
        onClose={() => setIsPaymentOpen(false)}
        amount={total}
        subtotal={subtotal}
        gstAmount={gstAmount}
        attendeeName={name}
        email={email}
        phone={phone}
        college={college}
        classNameVal={classNameVal}
        sectionVal={sectionVal}
        dept={dept}
        roll={roll}
        year={year}
        eventName={[
          ...selectedEvents.map(id => EVENTS.find(e => e.id === id)?.name).filter(Boolean),
          ...(includeSpotEvents ? [`Spot Events Pass (${effectiveSpotCount} ${effectiveSpotCount === 1 ? 'Delegate' : 'Delegates'})`] : [])
        ].join(' + ') || 'NexusVerse 2K26 Registration'}
        onSuccess={handlePaymentSuccess}
      />

      {/* Find My Ticket Lookup Modal */}
      <PassLookupModal
        isOpen={isLookupOpen}
        onClose={() => setIsLookupOpen(false)}
        savedRecords={savedRecords}
        onSelectRecord={(rec) => {
          setIsLookupOpen(false);
          setPendingPassRecord(rec);
        }}
      />

      {/* Admin Operations & Executive Control Modal */}
      <AdminModal
        isOpen={isAdminOpen}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClose={() => setIsAdminOpen(false)}
        savedRecords={savedRecords}
        onRefreshRecords={refreshAllAdminData}
        onUpdateRecord={handleUpdateRecord}
        onDeleteRecord={handleDeleteRecord}
        onAddManualRecord={(rec) => saveRegistration(rec)}
        onViewPass={(rec) => {
          setConfirmedRecord(rec);
          setUpiPendingRecord(null);
          setIsAdminOpen(false);
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
        isRegClosed={isRegClosed}
        onToggleRegClosed={handleToggleRegClosed}
        closedMessage={closedMessage}
        onUpdateClosedMessage={handleUpdateClosedMessage}
        totalSlotsLimit={totalSlotsLimit}
        ieeeSlotsLimit={ieeeSlotsLimit}
        nonIeeeSlotsLimit={nonIeeeSlotsLimit}
        onUpdateSlotLimits={handleUpdateSlotLimits}
        leftLogo={leftLogo}
        rightLogo={rightLogo}
        onUpdateLeftLogo={handleUpdateLeftLogo}
        onUpdateRightLogo={handleUpdateRightLogo}
        initialTab={adminInitialTab}
      />

      {/* Participant Space Modal */}
      <ErrorBoundary fallbackTitle="Participant Space Dashboard">
        <ParticipantSpaceModal
          isOpen={isParticipantSpaceOpen}
          onClose={() => setIsParticipantSpaceOpen(false)}
          currentUser={currentUser}
          onUserChange={(usr) => setCurrentUser(usr)}
          savedRecords={savedRecords}
          onRefreshRecords={refreshAllAdminData}
          onOpenTicketPass={(rec) => {
            setConfirmedRecord(rec);
            setUpiPendingRecord(null);
            setPendingPassRecord(null);
            setPassAccessDenied(null);
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          onNavigateToRegister={handlePrefillFromUser}
          initialMode={participantSpaceInitialMode}
        />
      </ErrorBoundary>

      {/* Mobile-Native Bottom Navigation Dock */}
      <MobileBottomNav
        activeTab={
          isAdminOpen ? 'admin' :
          isParticipantSpaceOpen ? 'space' :
          isLookupOpen || confirmedRecord ? 'pass' : 'register'
        }
        onSelectTab={(tab) => {
          if (tab === 'events' || tab === 'register') {
            setIsAdminOpen(false);
            setIsParticipantSpaceOpen(false);
            setIsLookupOpen(false);
            const el = document.getElementById('register-section') || document.getElementById('events-section') || document.getElementById('events');
            if (el) el.scrollIntoView({ behavior: 'smooth' });
            else window.scrollTo({ top: 350, behavior: 'smooth' });
          } else if (tab === 'pass') {
            setIsAdminOpen(false);
            setIsParticipantSpaceOpen(false);
            if (confirmedRecord) {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              setIsLookupOpen(true);
            }
          } else if (tab === 'space') {
            setIsAdminOpen(false);
            setIsLookupOpen(false);
            setIsParticipantSpaceOpen(true);
          } else if (tab === 'admin') {
            setIsParticipantSpaceOpen(false);
            setIsLookupOpen(false);
            setAdminInitialTab('scan');
            setIsAdminOpen(true);
          }
        }}
        isLoggedIn={Boolean(currentUser)}
        hasConfirmedPass={Boolean(confirmedRecord)}
      />
    </div>
  );
}
