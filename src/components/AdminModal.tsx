import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  Search, 
  Download, 
  Edit3, 
  Trash2, 
  Plus, 
  Check, 
  AlertCircle, 
  Upload, 
  RefreshCw, 
  Users, 
  Eye, 
  EyeOff, 
  DollarSign, 
  Award, 
  Layers, 
  Phone, 
  Mail, 
  Calendar, 
  School, 
  Save, 
  Power,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  ArrowUpDown,
  Filter,
  Database,
  Printer,
  FileSpreadsheet,
  FileJson,
  Sparkles,
  SlidersHorizontal,
  Maximize2,
  CreditCard,
  Key,
  ExternalLink,
  Link,
  Smartphone,
  QrCode,
  CheckCircle2,
  Ticket,
  Clock,
  Sun,
  Moon
} from 'lucide-react';
import { TicketPass, RegistrationRecord, TeamMemberInfo } from './TicketPass';
import { AdminTicketScanner } from './AdminTicketScanner';
import { EVENTS, ALL_EVENTS, SYMPOSIUM_CONFIG } from '../data/symposiumData';
import { fetchPhotosApi, uploadPhotoApi, deletePhotoApi, syncLocalRegistrationsToSupabase, testEmailApi, sendTicketEmailApi, updateSettingsApi } from '../services/api';
import { testSupabaseConnection, isSupabaseConfigured, supabase } from '../lib/supabase';

export interface GalleryPhoto {
  id: string;
  url: string;
  title: string;
  category: string;
  uploadedAt: string;
}

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedRecords: RegistrationRecord[];
  onUpdateRecord: (updated: RegistrationRecord) => void;
  onDeleteRecord: (regId: string) => void;
  onAddManualRecord: (record: RegistrationRecord) => void;
  onViewPass?: (record: RegistrationRecord) => void;
  isRegClosed: boolean;
  onToggleRegClosed: (closed: boolean) => void;
  closedMessage: string;
  onUpdateClosedMessage: (msg: string) => void;
  totalSlotsLimit?: number;
  ieeeSlotsLimit?: number;
  nonIeeeSlotsLimit?: number;
  onUpdateSlotLimits?: (limits: { totalSlotsLimit: number; ieeeSlotsLimit: number; nonIeeeSlotsLimit: number }) => void;
  leftLogo: string;
  rightLogo: string;
  onUpdateLeftLogo: (url: string) => void;
  onUpdateRightLogo: (url: string) => void;
  initialTab?: 'registrations' | 'scan' | 'manual' | 'status' | 'photos' | 'settings';
  isFullPage?: boolean;
  theme?: 'dark' | 'light';
  onToggleTheme?: () => void;
}

type SortOption = 
  | 'date-desc' 
  | 'date-asc' 
  | 'name-asc' 
  | 'name-desc' 
  | 'roll-asc' 
  | 'amount-desc' 
  | 'amount-asc' 
  | 'ieee' 
  | 'ieee-desc'
  | 'ieee-asc'
  | 'event';

const DEFAULT_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'symp-1',
    url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1200&auto=format&fit=crop&q=80',
    title: 'Inaugural Keynote & National Tech Symposium Hall',
    category: 'Symposium Highlights',
    uploadedAt: '2026-10-10T09:30:00Z'
  },
  {
    id: 'symp-2',
    url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=1200&auto=format&fit=crop&q=80',
    title: 'Coding Sprints & Flaghunt 24H Cyber CTF Arena',
    category: 'Technical Events',
    uploadedAt: '2026-10-11T14:15:00Z'
  },
  {
    id: 'symp-3',
    url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80',
    title: 'Hardware Expo & IoT Autonomous Robotics Prototype',
    category: 'Expo & Projects',
    uploadedAt: '2026-10-12T11:45:00Z'
  },
  {
    id: 'symp-4',
    url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=1200&auto=format&fit=crop&q=80',
    title: 'IEEE Distinguished Faculty & Chief Guest Address',
    category: 'Guest Dignitaries',
    uploadedAt: '2026-10-12T16:00:00Z'
  },
  {
    id: 'symp-5',
    url: 'https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=1200&auto=format&fit=crop&q=80',
    title: 'Innovrush Grand Finale Project Presentation & Jury Defense',
    category: 'Technical Events',
    uploadedAt: '2026-10-13T10:20:00Z'
  },
  {
    id: 'symp-6',
    url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=1200&auto=format&fit=crop&q=80',
    title: 'Grand Award Felicitation & Valedictory Ceremony',
    category: 'Symposium Highlights',
    uploadedAt: '2026-10-13T17:30:00Z'
  },
  {
    id: 'symp-7',
    url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?w=1200&auto=format&fit=crop&q=80',
    title: 'Technical Panel Discussion & Emerging Tech Fireside',
    category: 'Guest Dignitaries',
    uploadedAt: '2026-10-13T14:40:00Z'
  },
  {
    id: 'symp-8',
    url: 'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?w=1200&auto=format&fit=crop&q=80',
    title: 'Code Genesis Live Hackathon Showdown & Mentorship',
    category: 'Technical Events',
    uploadedAt: '2026-10-14T11:00:00Z'
  }
];

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  savedRecords,
  onUpdateRecord,
  onDeleteRecord,
  onAddManualRecord,
  onViewPass,
  isRegClosed,
  onToggleRegClosed,
  closedMessage,
  onUpdateClosedMessage,
  totalSlotsLimit = 0,
  ieeeSlotsLimit = 0,
  nonIeeeSlotsLimit = 0,
  onUpdateSlotLimits,
  leftLogo,
  rightLogo,
  onUpdateLeftLogo,
  onUpdateRightLogo,
  initialTab,
  isFullPage = false,
  theme: propTheme,
  onToggleTheme: propOnToggleTheme
}) => {
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

  useEffect(() => {
    const handleStorage = () => {
      try {
        const t = localStorage.getItem('nexusverse_theme');
        if (t === 'light' || t === 'dark') setInternalTheme(t);
      } catch {}
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [isVerifyingLogin, setIsVerifyingLogin] = useState(false);
  const [activeTab, setActiveTab] = useState<'registrations' | 'scan' | 'manual' | 'status' | 'photos' | 'settings'>(initialTab || 'registrations');

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Search, Filter & Sort
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventFilter, setSelectedEventFilter] = useState('all');
  const [ieeeFilter, setIeeeFilter] = useState<'all' | 'ieee' | 'non-ieee'>('all');
  const [verificationFilter, setVerificationFilter] = useState<'all' | 'verified' | 'unverified' | 'upi' | 'razorpay'>('all');
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked-in' | 'not-checked-in'>('all');
  const [sortBy, setSortBy] = useState<SortOption>('date-desc');
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // In-admin Ticket Pass Lightbox Viewer state
  const [viewingAdminTicket, setViewingAdminTicket] = useState<RegistrationRecord | null>(null);

  // Edit record state
  const [editingRecord, setEditingRecord] = useState<RegistrationRecord | null>(null);

  // Manual / Spot Registration Form state
  const [manualName, setManualName] = useState('');
  const [manualRoll, setManualRoll] = useState('');
  const [manualClass, setManualClass] = useState('B.Tech');
  const [manualSec, setManualSec] = useState('A');
  const [manualDept, setManualDept] = useState('CSE');
  const [manualYear, setManualYear] = useState('3rd Year');
  const [manualPhone, setManualPhone] = useState('');
  const [manualEmail, setManualEmail] = useState('');
  const [manualCollege, setManualCollege] = useState('N.B.K.R. Institute of Science & Technology');
  const [manualIsIeee, setManualIsIeee] = useState(false);
  const [manualIeeeId, setManualIeeeId] = useState('');
  const [manualEventId, setManualEventId] = useState('ctf');
  const [manualTeamName, setManualTeamName] = useState('');
  const [manualProjectTitle, setManualProjectTitle] = useState('');
  const [manualTeammates, setManualTeammates] = useState<TeamMemberInfo[]>([]);
  const [manualFee, setManualFee] = useState<number>(300);
  const [manualPayMethod, setManualPayMethod] = useState<'Cash Spot' | 'UPI Spot' | 'Special Waiver'>('UPI Spot');
  const [manualSuccessMsg, setManualSuccessMsg] = useState('');

  // Photos Management state
  const [galleryPhotos, setGalleryPhotos] = useState<GalleryPhoto[]>([]);
  const [photoSourceMode, setPhotoSourceMode] = useState<'url' | 'upload'>('url');
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [newPhotoTitle, setNewPhotoTitle] = useState('');
  const [newPhotoCategory, setNewPhotoCategory] = useState('Symposium Highlights');
  const [isAddingPhoto, setIsAddingPhoto] = useState(false);
  const [photoAddSuccess, setPhotoAddSuccess] = useState('');
  const [previewLightbox, setPreviewLightbox] = useState<string | null>(null);
  const [viewingReceipt, setViewingReceipt] = useState<{ name: string; roll: string; paymentId: string; screenshot: string } | null>(null);

  // Custom password management
  const [newAdminPassword, setNewAdminPassword] = useState('');
  const [pwdChangeSuccess, setPwdChangeSuccess] = useState(false);

  // Slot Quotas & Capacity Limits State (IEEE, Non-IEEE, Total)
  const [inputTotalSlots, setInputTotalSlots] = useState<number | string>(totalSlotsLimit || 0);
  const [inputIeeeSlots, setInputIeeeSlots] = useState<number | string>(ieeeSlotsLimit || 0);
  const [inputNonIeeeSlots, setInputNonIeeeSlots] = useState<number | string>(nonIeeeSlotsLimit || 0);
  const [isSavingLimits, setIsSavingLimits] = useState(false);
  const [limitsSaveMsg, setLimitsSaveMsg] = useState('');

  useEffect(() => {
    if (typeof totalSlotsLimit === 'number') setInputTotalSlots(totalSlotsLimit);
    if (typeof ieeeSlotsLimit === 'number') setInputIeeeSlots(ieeeSlotsLimit);
    if (typeof nonIeeeSlotsLimit === 'number') setInputNonIeeeSlots(nonIeeeSlotsLimit);
  }, [totalSlotsLimit, ieeeSlotsLimit, nonIeeeSlotsLimit]);

  const handleSaveSlotLimits = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const tSlots = Math.max(0, parseInt(String(inputTotalSlots), 10) || 0);
    const iSlots = Math.max(0, parseInt(String(inputIeeeSlots), 10) || 0);
    const niSlots = Math.max(0, parseInt(String(inputNonIeeeSlots), 10) || 0);

    setIsSavingLimits(true);
    setLimitsSaveMsg('');
    try {
      if (onUpdateSlotLimits) {
        onUpdateSlotLimits({ totalSlotsLimit: tSlots, ieeeSlotsLimit: iSlots, nonIeeeSlotsLimit: niSlots });
      } else {
        await updateSettingsApi({ totalSlotsLimit: tSlots, ieeeSlotsLimit: iSlots, nonIeeeSlotsLimit: niSlots });
      }
      setLimitsSaveMsg('Slot capacity limits updated & active on registration portal!');
      setTimeout(() => setLimitsSaveMsg(''), 4000);
    } catch (err: any) {
      alert('Failed to save slot limits: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSavingLimits(false);
    }
  };

  // Payment Gateway & Direct UPI Settings state
  const [paymentMode, setPaymentMode] = useState<'razorpay' | 'upi'>('upi');
  const [rzpKeyId, setRzpKeyId] = useState('');
  const [rzpKeySecret, setRzpKeySecret] = useState('');
  const [rzpMeLink, setRzpMeLink] = useState('https://razorpay.me/@veluriprasanth');
  const [rzpMeName, setRzpMeName] = useState('NexusVerse 2K26');
  const [rzpUpiVpa, setRzpUpiVpa] = useState('9441759500@ptyes');
  const [upiPayeeName, setUpiPayeeName] = useState('NexusVerse 2K26');
  const [rzpTestStatus, setRzpTestStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });
  const [rzpSaveStatus, setRzpSaveStatus] = useState<string>('');

  // Supabase Cloud Database Status
  const [supabaseTestStatus, setSupabaseTestStatus] = useState<{
    testing: boolean;
    tested: boolean;
    success?: boolean;
    message?: string;
    error?: string;
  }>({ testing: false, tested: false });
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<{
    syncing: boolean;
    result?: string;
    success?: boolean;
  }>({ syncing: false });

  const handleTestSupabase = async () => {
    setSupabaseTestStatus({ testing: true, tested: false });
    const res = await testSupabaseConnection();
    setSupabaseTestStatus({
      testing: false,
      tested: true,
      success: res.success,
      message: res.message,
      error: res.error
    });
  };

  const handleSyncToSupabase = async () => {
    setSupabaseSyncStatus({ syncing: true });
    const res = await syncLocalRegistrationsToSupabase(savedRecords);
    if (res.success) {
      setSupabaseSyncStatus({
        syncing: false,
        success: true,
        result: `Successfully synchronized ${res.insertedCount} registrations to Supabase!`
      });
    } else {
      setSupabaseSyncStatus({
        syncing: false,
        success: false,
        result: res.error || 'Failed to sync to Supabase.'
      });
    }
  };

  // Email Receipt testing state
  const [testEmailRecipient, setTestEmailRecipient] = useState('');
  const [testEmailStatus, setTestEmailStatus] = useState<{ testing: boolean; success?: boolean; message?: string }>({ testing: false });

  // 8 PM UPI Email Dispatch States
  const [sendingEmailRegId, setSendingEmailRegId] = useState<string | null>(null);
  const [isSendingUpiBatch, setIsSendingUpiBatch] = useState(false);
  const [emailSendToast, setEmailSendToast] = useState<string | null>(null);

  // Toggle payment verification status (manual for UPI, auto for Razorpay)
  const handleToggleVerify = (record: RegistrationRecord) => {
    const isNowVerified = !record.isVerified;
    const updated: RegistrationRecord = {
      ...record,
      isVerified: isNowVerified,
      verifiedAt: isNowVerified ? new Date().toISOString() : undefined,
      verifiedBy: isNowVerified ? 'admin' : undefined
    };
    onUpdateRecord(updated);
    setEmailSendToast(
      isNowVerified 
        ? `Payment for ${record.name} marked as VERIFIED ✓` 
        : `Payment for ${record.name} marked as UNVERIFIED ⏳`
    );
    setTimeout(() => setEmailSendToast(null), 3500);
  };

  const handleSendTicketEmail = async (record: RegistrationRecord) => {
    setSendingEmailRegId(record.regId);
    try {
      const res = await sendTicketEmailApi(record);
      if (res.success) {
        setEmailSendToast(`Ticket pass email dispatched to ${record.email}!`);
        setTimeout(() => setEmailSendToast(null), 3500);
      } else {
        alert(res.error || 'Failed to dispatch ticket email.');
      }
    } catch (err: any) {
      alert(err.message || 'Error dispatching email.');
    } finally {
      setSendingEmailRegId(null);
    }
  };

  const handleSendAllUpiBatchEmails = async () => {
    const upiRecords = savedRecords.filter(r => r.paymentMode === 'upi' && r.email);
    if (upiRecords.length === 0) {
      alert('No UPI registrations found with valid email addresses.');
      return;
    }
    if (!window.confirm(`Are you ready to dispatch 8 PM ticket emails to all ${upiRecords.length} UPI registrants?`)) {
      return;
    }

    setIsSendingUpiBatch(true);
    let sentCount = 0;
    for (const rec of upiRecords) {
      try {
        await sendTicketEmailApi(rec);
        sentCount++;
      } catch (err) {
        console.warn('Batch email send notice for', rec.regId, err);
      }
    }
    setIsSendingUpiBatch(false);
    setEmailSendToast(`Successfully dispatched 8 PM ticket emails to ${sentCount} UPI delegates!`);
    setTimeout(() => setEmailSendToast(null), 4000);
  };

  const handleSendTestEmail = async () => {
    if (!testEmailRecipient || !testEmailRecipient.includes('@')) {
      setTestEmailStatus({ testing: false, success: false, message: 'Please enter a valid recipient email address.' });
      return;
    }
    setTestEmailStatus({ testing: true });
    const res = await testEmailApi(testEmailRecipient);
    setTestEmailStatus({
      testing: false,
      success: res.success,
      message: res.success ? `Ticket confirmation email sent successfully to ${testEmailRecipient}!` : (res.error || 'Failed to send email.')
    });
  };

  // File upload refs
  const leftFileRef = useRef<HTMLInputElement>(null);
  const rightFileRef = useRef<HTMLInputElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  // Load auth state & gallery photos on open
  useEffect(() => {
    if (isOpen || isFullPage) {
      try {
        const auth = sessionStorage.getItem('nexusverse_admin_auth');
        if (auth === 'true') {
          setIsAuthenticated(true);
        }
      } catch (e) {}

      const handleAuthEvent = (e: any) => {
        if (e?.detail?.isAuthenticated !== undefined) {
          setIsAuthenticated(Boolean(e.detail.isAuthenticated));
        } else {
          try {
            setIsAuthenticated(sessionStorage.getItem('nexusverse_admin_auth') === 'true');
          } catch (err) {}
        }
      };
      window.addEventListener('nexusverse_admin_auth_changed', handleAuthEvent);

      // Fetch active Razorpay & Direct UPI configuration from server
      fetch('/api/razorpay/config')
        .then(res => res.json())
        .then(data => {
          if (data && data.keyId) {
            setRzpKeyId(data.keyId);
          }
          if (data && data.paymentMode) {
            setPaymentMode(data.paymentMode === 'razorpay' ? 'razorpay' : 'upi');
          }
          if (data && data.razorpayMeLink) {
            setRzpMeLink(data.razorpayMeLink);
          }
          if (data && data.razorpayMeName) {
            setRzpMeName(data.razorpayMeName);
          }
          if (data && data.upiVpa) {
            setRzpUpiVpa(data.upiVpa);
          }
          if (data && data.upiPayeeName) {
            setUpiPayeeName(data.upiPayeeName);
          }
        })
        .catch(() => {});

      // Load gallery photos from backend API (with local fallback)
      fetchPhotosApi().then(photos => {
        if (photos && photos.length > 0) {
          setGalleryPhotos(photos);
        } else {
          setGalleryPhotos(DEFAULT_GALLERY_PHOTOS);
        }
      }).catch(() => {
        setGalleryPhotos(DEFAULT_GALLERY_PHOTOS);
      });
    }
  }, [isOpen, isFullPage]);

  if (!isOpen && !isFullPage) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanInput = passwordInput.trim();
    if (!cleanInput) {
      setPasswordError('Please enter the administrator password.');
      return;
    }

    setIsVerifyingLogin(true);
    setPasswordError('');

    // 1. Master rescue defaults ('admin123' or 'admin' always grants access)
    if (cleanInput === 'admin123' || cleanInput.toLowerCase() === 'admin') {
      setIsAuthenticated(true);
      setPasswordError('');
      try {
        sessionStorage.setItem('nexusverse_admin_auth', 'true');
        window.dispatchEvent(new CustomEvent('nexusverse_admin_auth_changed', { detail: { isAuthenticated: true } }));
      } catch (e) {}
      setIsVerifyingLogin(false);
      return;
    }

    // 2. Direct verify against this domain's localStorage updated password
    const localPwd = (localStorage.getItem('nexusverse_admin_pwd') || '').trim();
    if (localPwd && cleanInput === localPwd) {
      setIsAuthenticated(true);
      setPasswordError('');
      try {
        sessionStorage.setItem('nexusverse_admin_auth', 'true');
        window.dispatchEvent(new CustomEvent('nexusverse_admin_auth_changed', { detail: { isAuthenticated: true } }));
      } catch (e) {}
      setIsVerifyingLogin(false);
      return;
    }

    // 3. Query Supabase Cloud Database directly from browser (cross-domain persistent)
    if (isSupabaseConfigured() && supabase) {
      try {
        const { data, error } = await supabase
          .from('portal_settings')
          .select('admin_password')
          .eq('id', 'current')
          .single();

        if (!error && data && data.admin_password) {
          const cloudPwd = String(data.admin_password).trim();
          if (cleanInput === cloudPwd) {
            try {
              localStorage.setItem('nexusverse_admin_pwd', cloudPwd);
              sessionStorage.setItem('nexusverse_admin_auth', 'true');
              window.dispatchEvent(new CustomEvent('nexusverse_admin_auth_changed', { detail: { isAuthenticated: true } }));
            } catch (e) {}
            setIsAuthenticated(true);
            setPasswordError('');
            setIsVerifyingLogin(false);
            return;
          }
        }
      } catch (supaErr) {
        console.warn('Supabase admin password check notice:', supaErr);
      }
    }

    // 4. Query backend API endpoint
    try {
      const res = await fetch('/api/admin/verify-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: cleanInput })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.success) {
          try {
            localStorage.setItem('nexusverse_admin_pwd', cleanInput);
            sessionStorage.setItem('nexusverse_admin_auth', 'true');
            window.dispatchEvent(new CustomEvent('nexusverse_admin_auth_changed', { detail: { isAuthenticated: true } }));
          } catch (e) {}
          setIsAuthenticated(true);
          setPasswordError('');
          setIsVerifyingLogin(false);
          return;
        }
      }
    } catch (e) {
      // Offline fallback
    }

    setPasswordError('Incorrect administrator password. (Default is admin123).');
    setIsVerifyingLogin(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setPasswordInput('');
    try {
      sessionStorage.removeItem('nexusverse_admin_auth');
      window.dispatchEvent(new CustomEvent('nexusverse_admin_auth_changed', { detail: { isAuthenticated: false } }));
    } catch (e) {}
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 4) {
      alert('Password must be at least 4 characters.');
      return;
    }
    try {
      const cleanPassword = newAdminPassword.trim();
      localStorage.setItem('nexusverse_admin_pwd', cleanPassword);

      // 1. Directly persist to Supabase Cloud PostgreSQL from client (permanent across all domains)
      if (isSupabaseConfigured() && supabase) {
        try {
          await supabase
            .from('portal_settings')
            .upsert({
              id: 'current',
              admin_password: cleanPassword,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
        } catch (supaErr) {
          console.warn('Direct Supabase cloud password save notice:', supaErr);
        }
      }

      // 2. Sync password update to server database and backend
      try {
        await fetch('/api/admin/change-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newPassword: cleanPassword })
        });
      } catch (apiErr) {}

      setPwdChangeSuccess(true);
      setNewAdminPassword('');
      setTimeout(() => setPwdChangeSuccess(false), 4000);
    } catch (e) {
      console.warn('Could not save new admin password:', e);
    }
  };

  const handleTestRazorpayConnection = async () => {
    setRzpTestStatus({ testing: true });
    try {
      const res = await fetch('/api/razorpay/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyId: rzpKeyId, keySecret: rzpKeySecret })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRzpTestStatus({ testing: false, success: true, message: data.message || 'Razorpay connection test succeeded!' });
      } else {
        setRzpTestStatus({ testing: false, success: false, message: data.error || 'Authentication failed. Please verify Key ID & Secret.' });
      }
    } catch (err: any) {
      setRzpTestStatus({ testing: false, success: false, message: 'Could not connect to backend server.' });
    }
  };

  const handleSaveRazorpayKeys = async () => {
    try {
      const res = await fetch('/api/razorpay/save-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyId: rzpKeyId, 
          keySecret: rzpKeySecret,
          razorpayMeLink: rzpMeLink,
          razorpayMeName: rzpMeName,
          upiVpa: rzpUpiVpa,
          upiPayeeName: upiPayeeName,
          paymentMode: paymentMode
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setRzpSaveStatus(`Payment settings saved! Active mode: ${paymentMode === 'upi' ? `Direct UPI (${rzpUpiVpa})` : 'Razorpay Gateway'}`);
        setTimeout(() => setRzpSaveStatus(''), 4500);
      } else {
        alert('Error saving keys: ' + (data.error || 'Unknown error'));
      }
    } catch (err: any) {
      alert('Failed to save keys: ' + err.message);
    }
  };

  // Logos Upload Handlers
  const handleLeftImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) onUpdateLeftLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleRightImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) onUpdateRightLogo(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  // Gallery Photos Handlers
  const handleAddPhotoUrl = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!newPhotoUrl.trim()) {
      alert('Please enter or paste an image URL.');
      return;
    }
    setIsAddingPhoto(true);
    const newPhoto: GalleryPhoto = {
      id: 'photo-' + Date.now(),
      url: newPhotoUrl.trim(),
      title: newPhotoTitle.trim() || 'Symposium Memory',
      category: newPhotoCategory,
      uploadedAt: new Date().toISOString()
    };
    const updated = [newPhoto, ...galleryPhotos];
    setGalleryPhotos(updated);
    try {
      localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(updated));
    } catch (err) {}
    await uploadPhotoApi(newPhoto);
    window.dispatchEvent(new CustomEvent('nexusverse_photos_updated'));
    setNewPhotoUrl('');
    setNewPhotoTitle('');
    setIsAddingPhoto(false);
    setPhotoAddSuccess('Photo added to gallery successfully!');
    setTimeout(() => setPhotoAddSuccess(''), 4000);
  };

  // Helper to compress camera/large photos before upload for fast transfer and storage
  const compressImageFile = (file: File, maxWidth = 1920, quality = 0.85): Promise<string> => {
    return new Promise((resolve) => {
      // If svg or gif, read as data url directly
      if (file.type === 'image/svg+xml' || file.type === 'image/gif') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve('');
        reader.readAsDataURL(file);
        return;
      }

      const img = new Image();
      const objUrl = URL.createObjectURL(file);
      img.onload = () => {
        URL.revokeObjectURL(objUrl);
        let { width, height } = img;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.readAsDataURL(file);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = () => {
        URL.revokeObjectURL(objUrl);
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      };
      img.src = objUrl;
    });
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsAddingPhoto(true);
      const dataUrl = await compressImageFile(file);
      if (dataUrl) {
        const tempPhoto: GalleryPhoto = {
          id: 'photo-' + Date.now(),
          url: dataUrl,
          title: newPhotoTitle.trim() || file.name.replace(/\.[^/.]+$/, ''),
          category: newPhotoCategory,
          uploadedAt: new Date().toISOString()
        };

        // Upload to server/Supabase Storage bucket to obtain permanent high-speed CDN URL
        const savedPhoto = await uploadPhotoApi(tempPhoto);
        const finalPhoto: GalleryPhoto = savedPhoto && savedPhoto.url ? savedPhoto : tempPhoto;

        const updated = [finalPhoto, ...galleryPhotos.filter(p => p.id !== finalPhoto.id)];
        setGalleryPhotos(updated);
        try {
          localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(updated));
        } catch (err) {}

        window.dispatchEvent(new CustomEvent('nexusverse_photos_updated'));
        setNewPhotoTitle('');
        setPhotoAddSuccess('Photo uploaded and synced to symposium gallery successfully!');
        setTimeout(() => setPhotoAddSuccess(''), 4000);
        if (photoUploadRef.current) photoUploadRef.current.value = '';
      }
    } catch (err: any) {
      console.error('Photo upload error:', err);
      alert('Failed to process image. Please try another image.');
    } finally {
      setIsAddingPhoto(false);
    }
  };

  const handleDeletePhoto = async (id: string) => {
    if (!confirm('Are you sure you want to delete this photo from the symposium gallery?')) return;
    const updated = galleryPhotos.filter(p => p.id !== id);
    setGalleryPhotos(updated);
    try {
      localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(updated));
    } catch (e) {}
    await deletePhotoApi(id);
    window.dispatchEvent(new CustomEvent('nexusverse_photos_updated'));
  };

  // Export registrations to CSV Spreadsheet
  const handleExportCsv = () => {
    if (savedRecords.length === 0) {
      alert('No registrations available to export.');
      return;
    }

    const headers = [
      'Registration ID',
      'Date & Time',
      'Participant Name',
      'Roll Number',
      'Class',
      'Section',
      'Branch/Dept',
      'Year',
      'Phone Number',
      'Email Address',
      'College Name',
      'IEEE Member',
      'IEEE Member ID',
      'Registered Event',
      'Base Fee (INR)',
      'GST 5% (INR)',
      'Total Paid (INR)',
      'Payment ID',
      'Team Name',
      'Project Title',
      'Teammate 1 Name',
      'Teammate 1 Roll',
      'Teammate 1 Class',
      'Teammate 1 Sec',
      'Teammate 1 Branch',
      'Teammate 1 Year',
      'Teammate 1 Phone',
      'Teammate 1 IEEE Member',
      'Teammate 1 IEEE ID',
      'Teammate 2 Name',
      'Teammate 2 Roll',
      'Teammate 2 Class',
      'Teammate 2 Sec',
      'Teammate 2 Branch',
      'Teammate 2 Year',
      'Teammate 2 Phone',
      'Teammate 2 IEEE Member',
      'Teammate 2 IEEE ID',
      'Teammate 3 Name',
      'Teammate 3 Roll',
      'Teammate 3 Class',
      'Teammate 3 Sec',
      'Teammate 3 Branch',
      'Teammate 3 Year',
      'Teammate 3 Phone',
      'Teammate 3 IEEE Member',
      'Teammate 3 IEEE ID'
    ];

    const rows = savedRecords.map(r => {
      const eventName = r.eventIds.map(id => ALL_EVENTS.find(e => e.id === id)?.name).filter(Boolean).join('; ');
      const primaryEventId = r.eventIds[0] || '';
      const team = r.teamDetails?.[primaryEventId];
      const members = team?.teamMembers || [];

      const m1 = members[0] || {};
      const m2 = members[1] || {};
      const m3 = members[2] || {};

      return [
        `"${r.regId}"`,
        `"${new Date(r.timestamp).toLocaleString()}"`,
        `"${r.name}"`,
        `"${r.roll}"`,
        `"${r.className || ''}"`,
        `"${r.section || ''}"`,
        `"${r.dept}"`,
        `"${r.year}"`,
        `"${r.phone}"`,
        `"${r.email}"`,
        `"${r.college}"`,
        `"${r.isIeeeMember ? 'YES' : 'NO'}"`,
        `"${r.ieeeId || ''}"`,
        `"${eventName}"`,
        r.subtotal || (r.totalPaid ? Math.round(r.totalPaid / 1.05) : 0),
        r.gstAmount || (r.totalPaid ? Math.round(r.totalPaid - Math.round(r.totalPaid / 1.05)) : 0),
        r.totalPaid,
        `"${r.paymentId}"`,
        `"${team?.teamName || ''}"`,
        `"${team?.projectTitle || ''}"`,
        `"${m1.name || ''}"`,
        `"${m1.roll || ''}"`,
        `"${m1.className || ''}"`,
        `"${m1.section || ''}"`,
        `"${m1.branch || ''}"`,
        `"${m1.year || ''}"`,
        `"${m1.phone || ''}"`,
        `"${m1.isIeeeMember ? 'YES' : 'NO'}"`,
        `"${m1.ieeeId || ''}"`,
        `"${m2.name || ''}"`,
        `"${m2.roll || ''}"`,
        `"${m2.className || ''}"`,
        `"${m2.section || ''}"`,
        `"${m2.branch || ''}"`,
        `"${m2.year || ''}"`,
        `"${m2.phone || ''}"`,
        `"${m2.isIeeeMember ? 'YES' : 'NO'}"`,
        `"${m2.ieeeId || ''}"`,
        `"${m3.name || ''}"`,
        `"${m3.roll || ''}"`,
        `"${m3.className || ''}"`,
        `"${m3.section || ''}"`,
        `"${m3.branch || ''}"`,
        `"${m3.year || ''}"`,
        `"${m3.phone || ''}"`,
        `"${m3.isIeeeMember ? 'YES' : 'NO'}"`,
        `"${m3.ieeeId || ''}"`
      ].join(',');
    });

    // Add UTF-8 BOM so Excel opens it with proper Indian formatting and fonts
    const csvContent = '\uFEFF' + [headers.join(','), ...rows].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `NexusVerse_2K26_Registrations_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Download full JSON database backup
  const handleDownloadJsonBackup = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(savedRecords, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `NexusVerse_Registrations_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON backup
  const handleImportJsonBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          if (confirm(`Found ${parsed.length} registration records in file. Replace/merge existing records?`)) {
            // merge unique by regId
            const map = new Map<string, RegistrationRecord>();
            savedRecords.forEach(r => map.set(r.regId, r));
            parsed.forEach(r => {
              if (r.regId) map.set(r.regId, r);
            });
            const merged = Array.from(map.values());
            localStorage.setItem('nexusverse_registrations', JSON.stringify(merged));
            alert(`Successfully restored ${merged.length} registrations! Reloading view.`);
            window.location.reload();
          }
        } else {
          alert('Invalid backup JSON format: Expected array of records.');
        }
      } catch (err) {
        alert('Failed to parse backup JSON file: ' + err);
      }
    };
    reader.readAsText(file);
  };

  // Clear all registrations with safe confirmation
  const handleClearAllRegistrations = () => {
    const verification = prompt('Type "RESET" to confirm clearing all stored delegate registrations:');
    if (verification === 'RESET') {
      try {
        localStorage.removeItem('nexusverse_registrations');
        alert('All registration records have been cleared.');
        window.location.reload();
      } catch (e) {}
    } else if (verification !== null) {
      alert('Reset cancelled: verification text did not match.');
    }
  };

  // Handle Manual Spot Registration Submit
  const handleManualRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualName.trim() || !manualRoll.trim() || !manualPhone.trim()) {
      alert('Please fill in delegate Name, Roll Number, and Mobile Number.');
      return;
    }
    if (manualIsIeee && (!manualIeeeId.trim() || manualIeeeId.trim().length < 4)) {
      alert('Please enter a valid IEEE Membership ID.');
      return;
    }

    const regId = 'NV26-SPOT-' + Math.random().toString(36).slice(2, 7).toUpperCase();
    const paymentId = `${manualPayMethod.toUpperCase().replace(/\s+/g, '_')}_${Date.now().toString().slice(-6)}`;

    const eventObj = ALL_EVENTS.find(ev => ev.id === manualEventId);
    const isTeamEvent = eventObj ? eventObj.max > 1 : false;

    const formattedTeamDetails: Record<string, { 
      teamName?: string; 
      members?: string[]; 
      teamMembers?: TeamMemberInfo[]; 
      projectTitle?: string 
    }> = {};

    if (isTeamEvent) {
      formattedTeamDetails[manualEventId] = {
        teamName: manualTeamName.trim() || `${manualName.trim()}'s Team`,
        members: [manualName.trim(), ...manualTeammates.map(m => m.name.trim()).filter(Boolean)],
        teamMembers: manualTeammates.map(m => ({
          name: m.name.trim(),
          roll: m.roll.trim().toUpperCase(),
          className: m.className || 'B.Tech',
          section: m.section || 'A',
          branch: m.branch || 'CSE',
          year: m.year || '3rd Year',
          phone: m.phone || '',
          isIeeeMember: !!m.isIeeeMember,
          ieeeId: m.isIeeeMember ? m.ieeeId?.trim() : undefined
        })),
        projectTitle: manualProjectTitle.trim() || undefined
      };
    }

    const record: RegistrationRecord = {
      regId,
      paymentId,
      name: manualName.trim(),
      email: manualEmail.trim() || `${manualRoll.toLowerCase().trim()}@nbkrist.org`,
      phone: manualPhone.trim(),
      college: manualCollege.trim(),
      className: manualClass.trim(),
      section: manualSec.trim().toUpperCase(),
      dept: manualDept.trim(),
      year: manualYear,
      roll: manualRoll.trim().toUpperCase(),
      isIeeeMember: manualIsIeee,
      ieeeId: manualIsIeee ? manualIeeeId.trim() : undefined,
      eventIds: [manualEventId],
      teamDetails: isTeamEvent ? formattedTeamDetails : undefined,
      totalPaid: Number(manualFee) || 0,
      timestamp: new Date().toISOString()
    };

    onAddManualRecord(record);
    setManualSuccessMsg(`Spot registration created successfully! Pass ID: ${regId}`);
    setTimeout(() => setManualSuccessMsg(''), 5000);

    // Reset manual form
    setManualName('');
    setManualRoll('');
    setManualPhone('');
    setManualEmail('');
    setManualIeeeId('');
    setManualTeamName('');
    setManualProjectTitle('');
    setManualTeammates([]);
  };

  // Filtering & Sorting Logic
  const filteredAndSortedRecords = savedRecords
    .filter(r => {
      // Event filter
      const matchesEvent = selectedEventFilter === 'all' || r.eventIds.includes(selectedEventFilter);
      
      // IEEE membership filter
      const matchesIeee = 
        ieeeFilter === 'all' || 
        (ieeeFilter === 'ieee' && r.isIeeeMember) || 
        (ieeeFilter === 'non-ieee' && !r.isIeeeMember);

      // Payment verification filter (UPI verified vs pending, Razorpay auto verified)
      const isAutoVerified = r.paymentMode !== 'upi';
      const isVerified = isAutoVerified || Boolean(r.isVerified);
      const matchesVerification = 
        verificationFilter === 'all' ||
        (verificationFilter === 'verified' && isVerified) ||
        (verificationFilter === 'unverified' && !isVerified) ||
        (verificationFilter === 'upi' && r.paymentMode === 'upi') ||
        (verificationFilter === 'razorpay' && r.paymentMode !== 'upi');

      // Search query filter (matches lead, team members, IDs, event names)
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesEvent && matchesIeee && matchesVerification;

      const primaryEventId = r.eventIds[0] || '';
      const team = r.teamDetails?.[primaryEventId];
      const teammateMatch = (team?.teamMembers || []).some(m => 
        m.name.toLowerCase().includes(q) ||
        m.roll.toLowerCase().includes(q) ||
        (m.ieeeId && m.ieeeId.toLowerCase().includes(q)) ||
        m.phone.includes(q)
      );

      const matchesQuery = 
        r.name.toLowerCase().includes(q) ||
        r.roll.toLowerCase().includes(q) ||
        r.phone.includes(q) ||
        r.email.toLowerCase().includes(q) ||
        r.regId.toLowerCase().includes(q) ||
        r.paymentId.toLowerCase().includes(q) ||
        (r.ieeeId && r.ieeeId.toLowerCase().includes(q)) ||
        (r.college && r.college.toLowerCase().includes(q)) ||
        (r.dept && r.dept.toLowerCase().includes(q)) ||
        (team?.teamName && team.teamName.toLowerCase().includes(q)) ||
        (team?.projectTitle && team.projectTitle.toLowerCase().includes(q)) ||
        teammateMatch;

      const matchesCheckIn = checkInFilter === 'all'
        ? true
        : checkInFilter === 'checked-in'
        ? Boolean(r.checkedIn)
        : !r.checkedIn;

      return matchesEvent && matchesIeee && matchesVerification && matchesCheckIn && matchesQuery;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'date-desc':
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        case 'date-asc':
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case 'name-asc':
          return a.name.localeCompare(b.name);
        case 'name-desc':
          return b.name.localeCompare(a.name);
        case 'roll-asc':
          return a.roll.localeCompare(b.roll);
        case 'amount-desc':
          return (b.totalPaid || 0) - (a.totalPaid || 0);
        case 'amount-asc':
          return (a.totalPaid || 0) - (b.totalPaid || 0);
        case 'ieee':
        case 'ieee-desc':
          return (b.isIeeeMember ? 1 : 0) - (a.isIeeeMember ? 1 : 0);
        case 'ieee-asc':
          return (a.isIeeeMember ? 1 : 0) - (b.isIeeeMember ? 1 : 0);
        case 'event':
          return (a.eventIds[0] || '').localeCompare(b.eventIds[0] || '');
        default:
          return 0;
      }
    });

  // KPI Stats
  const totalRegistrations = savedRecords.length;
  const totalRevenue = savedRecords.reduce((sum, r) => sum + (r.totalPaid || 0), 0);
  const totalIeeeMembers = savedRecords.filter(r => r.isIeeeMember).length;
  const totalNonIeeeMembers = totalRegistrations - totalIeeeMembers;
  const upiPendingCount = savedRecords.filter(r => r.paymentMode === 'upi' && !r.isVerified).length;
  const verifiedCount = savedRecords.filter(r => r.paymentMode !== 'upi' || r.isVerified).length;
  const upiTotalCount = savedRecords.filter(r => r.paymentMode === 'upi').length;
  const razorpayTotalCount = savedRecords.filter(r => r.paymentMode !== 'upi').length;
  const checkedInCount = savedRecords.filter(r => r.checkedIn).length;
  const checkInPercent = totalRegistrations > 0 ? Math.round((checkedInCount / totalRegistrations) * 100) : 0;

  const handleToggleCheckIn = (record: RegistrationRecord) => {
    const isNowChecked = !record.checkedIn;
    const updated: RegistrationRecord = {
      ...record,
      checkedIn: isNowChecked,
      checkInTime: isNowChecked ? new Date().toISOString() : undefined,
      checkedInBy: isNowChecked ? 'Admin Table' : undefined,
      attendedEvents: isNowChecked ? Array.from(new Set([...(record.attendedEvents || []), ...record.eventIds])) : [],
      kitIssued: isNowChecked ? true : false
    };
    onUpdateRecord(updated);
  };

  return (
    <div 
      className={`admin-modal-root admin-portal-wrapper ${
        isFullPage
          ? "min-h-screen bg-[#07070a] text-[#f3ecd9] flex flex-col selection:bg-[#d4a935]/30 selection:text-[#f2c14e]"
          : "fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-200 selection:bg-[#d4a935]/30 selection:text-[#f2c14e]"
      }`}
      role={isFullPage ? "region" : "dialog"}
      aria-modal={isFullPage ? undefined : true}
      aria-labelledby="admin-panel-title"
      onClick={isFullPage ? undefined : onClose}
    >
      <div 
        className={`admin-modal-inner ${
          isFullPage
            ? "w-full flex-1 flex flex-col min-h-screen bg-[#0e0e13]"
            : "bg-[#111116] border border-[#2e2b22] text-[#f3ecd9] rounded-2xl w-full max-w-6xl shadow-2xl flex flex-col max-h-[96vh] overflow-hidden animate-in zoom-in-95 duration-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* TOP HEADER */}
        <div className="admin-header bg-gradient-to-r from-[#181820] via-[#1f1b0e] to-[#181820] p-4 sm:p-5 border-b border-[#2e2b22] flex items-center justify-between shrink-0 shadow-md">
          <div className="flex items-center gap-3">
            <div className="admin-header-shield w-10 h-10 rounded-xl bg-[#d4a935]/20 border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e] shadow-md shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[10px] sm:text-[11px] text-[#f2c14e] font-mono tracking-wider uppercase font-semibold flex items-center gap-1.5">
                <span>NexusVerse 2K26</span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#4cc38a] animate-pulse" />
                <span className="admin-header-badge-text">Executive Operations Center</span>
              </div>
              <h3 id="admin-panel-title" className="admin-header-title text-sm sm:text-lg font-bold text-[#ffffff] leading-tight">
                Symposium Admin & Delegate Management Portal
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark / Light Theme Toggle Button */}
            <button
              type="button"
              onClick={handleThemeToggle}
              className="admin-header-btn px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#2e2b22] text-[#f2c14e] hover:bg-[#1f1b0e] hover:border-[#d4a935]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              title={`Switch to ${activeTheme === 'dark' ? 'Light' : 'Dark'} Mode`}
              aria-label="Toggle dark/light theme mode"
            >
              {activeTheme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-[#f2c14e]" />
                  <span className="hidden sm:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#925807]" />
                  <span className="hidden sm:inline">Dark</span>
                </>
              )}
            </button>

            {isAuthenticated && (
              <button
                type="button"
                onClick={handleLogout}
                className="admin-lock-btn px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] hover:bg-[#ff8a80]/20 transition-colors cursor-pointer"
                title="Lock admin session"
              >
                Lock Session
              </button>
            )}
            {isFullPage ? (
              <a
                href="/register.html"
                className="admin-header-btn px-3 py-1.5 text-xs font-semibold text-[#f3ecd9] hover:text-[#f2c14e] rounded-lg border border-[#2e2b22] hover:bg-[#1f1b0e] hover:border-[#d4a935]/40 transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                title="Return to Public Website"
              >
                <span>&larr; View Live Website</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={onClose}
                className="admin-header-btn p-1.5 text-[#a79f8b] hover:text-[#ffffff] rounded-lg border border-[#2e2b22] hover:bg-[#0a0a0d] transition-colors cursor-pointer"
                aria-label="Close Admin Modal"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* AUTHENTICATION SCREEN */}
        {!isAuthenticated ? (
          <div className="p-8 sm:p-14 flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6 flex-1 my-auto">
            <div className="w-20 h-20 rounded-2xl bg-[#1f1b0e] border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e] shadow-2xl">
              <Lock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h4 className="text-2xl font-bold text-white">Administrator Access Required</h4>
              <p className="text-xs text-[#a79f8b] leading-relaxed">
                Enter your administrative key to control registrations, manage team delegates, upload photos, sort, search, and download symposium records.
              </p>
            </div>

            <form onSubmit={handleLogin} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => {
                    setPasswordInput(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Enter Admin Password"
                  className="w-full px-4 py-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] text-sm focus:outline-none focus:border-[#d4a935] font-mono pr-10"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3.5 text-[#a79f8b] hover:text-white"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {passwordError && (
                <div className="text-xs text-[#ff8a80] bg-[#2a1315] border border-[#ff8a80]/30 p-2.5 rounded-lg flex items-center gap-2 text-left">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifyingLogin}
                className="w-full py-3 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-sm hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
              >
                {isVerifyingLogin ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying Access...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Authenticate & Unlock</span>
                  </>
                )}
              </button>

              <a
                href="/register.html"
                className="text-xs text-[#a79f8b] hover:text-[#f2c14e] transition-colors underline pt-2 block"
              >
                &larr; Return to Public Website
              </a>
            </form>
          </div>
        ) : (
          /* AUTHENTICATED TABS & CONTENT */
          <div className="flex flex-col flex-1 overflow-hidden">
            {/* Navigation Tabs */}
            <div className="bg-[#0a0a0d] border-b border-[#2e2b22] px-3 sm:px-6 flex items-center gap-1 sm:gap-2 overflow-x-auto shrink-0 py-2.5">
              <button
                type="button"
                onClick={() => setActiveTab('registrations')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'registrations'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>All Registrations ({totalRegistrations})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('scan')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'scan'
                    ? 'bg-gradient-to-r from-[#1f1b0e] to-[#2e250f] text-[#f2c14e] border border-[#d4a935] shadow-md shadow-[#d4a935]/15'
                    : 'text-[#f2c14e] bg-[#1f1b0e]/50 hover:bg-[#1f1b0e] border border-[#d4a935]/30 hover:border-[#d4a935]/60'
                }`}
              >
                <QrCode className="w-3.5 h-3.5 text-[#f2c14e]" />
                <span className="font-bold">Scan & Check-In</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-[#4cc38a]/20 text-[#4cc38a] border border-[#4cc38a]/30">
                  {checkedInCount}/{totalRegistrations}
                </span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('manual')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'manual'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Spot / Manual Register</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('status')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'status'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Power className="w-3.5 h-3.5" />
                <span>Control Registration: {isRegClosed ? 'CLOSED' : 'OPEN'}</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('photos')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'photos'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Upload Photos & Media ({galleryPhotos.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('settings')}
                className={`py-2 px-3 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  activeTab === 'settings'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow-sm'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Backup & Security</span>
              </button>
            </div>

            {/* TAB CONTENT CONTAINER */}
            <div className="p-3.5 sm:p-6 overflow-y-auto flex-1 space-y-5">
              
              {/* TAB: TICKET SCAN & CHECK-IN */}
              {activeTab === 'scan' && (
                <AdminTicketScanner
                  records={savedRecords}
                  onUpdateRecord={onUpdateRecord}
                  onViewPass={onViewPass}
                  theme={activeTheme}
                />
              )}

              {/* TAB 1: ALL REGISTRATIONS (SEARCH, SORT, FILTER, DOWNLOAD CSV/JSON, EDIT MEMBERS) */}
              {activeTab === 'registrations' && (
                <div className="space-y-4">
                  {/* KPI Quick Stats Cards (Clickable Filter Shortcuts with Slot Quota Caps) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    <button
                      type="button"
                      onClick={() => { setIeeeFilter('all'); setVerificationFilter('all'); }}
                      className={`admin-kpi-card p-3 rounded-xl bg-[#0a0a0d] border text-left transition-all cursor-pointer ${
                        ieeeFilter === 'all' && verificationFilter === 'all'
                          ? 'border-[#d4a935] ring-1 ring-[#d4a935]/50 shadow-md shadow-[#d4a935]/10'
                          : 'border-[#2e2b22] hover:border-[#a79f8b]'
                      }`}
                      title="Show all registered delegates"
                    >
                      <div className="flex items-center justify-between">
                        <span className="admin-kpi-title text-[10px] text-[#a79f8b] uppercase block font-semibold">Total Delegates</span>
                        {Number(inputTotalSlots) > 0 ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            totalRegistrations >= Number(inputTotalSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : 'bg-[#d4a935]/20 text-[#f2c14e]'
                          }`}>
                            {totalRegistrations >= Number(inputTotalSlots) ? 'FULL' : `${Number(inputTotalSlots) - totalRegistrations} left`}
                          </span>
                        ) : (
                          ieeeFilter === 'all' && verificationFilter === 'all' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#d4a935]/20 text-[#f2c14e] font-semibold">All</span>
                          )
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="admin-kpi-value text-lg sm:text-xl font-bold font-mono text-white">{totalRegistrations}</span>
                        {Number(inputTotalSlots) > 0 && (
                          <span className="text-xs font-mono text-[#a79f8b]">/ {inputTotalSlots}</span>
                        )}
                      </div>
                    </button>

                    <div className="admin-kpi-card p-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22]">
                      <span className="admin-kpi-title text-[10px] text-[#a79f8b] uppercase block font-semibold">Total Collected</span>
                      <span className="admin-kpi-value-gold text-lg sm:text-xl font-bold font-mono text-[#f2c14e]">₹{totalRevenue}</span>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIeeeFilter(ieeeFilter === 'ieee' ? 'all' : 'ieee')}
                      className={`admin-kpi-card p-3 rounded-xl bg-[#0a0a0d] border text-left transition-all cursor-pointer ${
                        ieeeFilter === 'ieee'
                          ? 'border-[#4cc38a] ring-1 ring-[#4cc38a]/50 shadow-md shadow-[#4cc38a]/10 bg-[#0d2316]'
                          : 'border-[#2e2b22] hover:border-[#4cc38a]/60'
                      }`}
                      title="Click to filter by IEEE Members"
                    >
                      <div className="flex items-center justify-between">
                        <span className="admin-kpi-title text-[10px] text-[#a79f8b] uppercase block font-semibold">IEEE Members</span>
                        {Number(inputIeeeSlots) > 0 ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            totalIeeeMembers >= Number(inputIeeeSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : 'bg-[#4cc38a]/20 text-[#4cc38a]'
                          }`}>
                            {totalIeeeMembers >= Number(inputIeeeSlots) ? 'QUOTA FULL' : `${Number(inputIeeeSlots) - totalIeeeMembers} left`}
                          </span>
                        ) : (
                          ieeeFilter === 'ieee' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#4cc38a]/20 text-[#4cc38a] font-semibold">Filtered</span>
                          )
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="admin-kpi-value-green text-lg sm:text-xl font-bold font-mono text-[#4cc38a]">{totalIeeeMembers}</span>
                        {Number(inputIeeeSlots) > 0 && (
                          <span className="text-xs font-mono text-[#a79f8b]">/ {inputIeeeSlots}</span>
                        )}
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIeeeFilter(ieeeFilter === 'non-ieee' ? 'all' : 'non-ieee')}
                      className={`admin-kpi-card p-3 rounded-xl bg-[#0a0a0d] border text-left transition-all cursor-pointer ${
                        ieeeFilter === 'non-ieee'
                          ? 'border-[#70baff] ring-1 ring-[#70baff]/50 shadow-md shadow-[#70baff]/10 bg-[#0c1c2a]'
                          : 'border-[#2e2b22] hover:border-[#70baff]/60'
                      }`}
                      title="Click to filter by Non-IEEE Delegates"
                    >
                      <div className="flex items-center justify-between">
                        <span className="admin-kpi-title text-[10px] text-[#a79f8b] uppercase block font-semibold">Non-IEEE Delegates</span>
                        {Number(inputNonIeeeSlots) > 0 ? (
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-semibold ${
                            totalNonIeeeMembers >= Number(inputNonIeeeSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : 'bg-[#70baff]/20 text-[#70baff]'
                          }`}>
                            {totalNonIeeeMembers >= Number(inputNonIeeeSlots) ? 'QUOTA FULL' : `${Number(inputNonIeeeSlots) - totalNonIeeeMembers} left`}
                          </span>
                        ) : (
                          ieeeFilter === 'non-ieee' && (
                            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#70baff]/20 text-[#70baff] font-semibold">Filtered</span>
                          )
                        )}
                      </div>
                      <div className="flex items-baseline gap-1.5">
                        <span className="admin-kpi-value-blue text-lg sm:text-xl font-bold font-mono text-[#9fc7e8]">{totalNonIeeeMembers}</span>
                        {Number(inputNonIeeeSlots) > 0 && (
                          <span className="text-xs font-mono text-[#a79f8b]">/ {inputNonIeeeSlots}</span>
                        )}
                      </div>
                    </button>
                  </div>

                  {/* SEARCH, SORT, FILTER & DOWNLOAD TOOLBAR */}
                  <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3">
                    <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5">
                      {/* Search Input */}
                      <div className="relative flex-1">
                        <Search className="w-4 h-4 text-[#a79f8b] absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search delegate, roll no, phone, team name, teammate, IEEE ID, pass ID..."
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                        />
                        {searchQuery && (
                          <button
                            type="button"
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] text-[#a79f8b] hover:text-white"
                          >
                            Clear
                          </button>
                        )}
                      </div>

                      {/* Dropdown Filters: Event, Membership, Payment Verification */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Event Filter */}
                        <select
                          value={selectedEventFilter}
                          onChange={(e) => setSelectedEventFilter(e.target.value)}
                          className="px-2.5 py-2 text-xs rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] cursor-pointer"
                          aria-label="Filter by Event"
                        >
                          <option value="all">All Events (Tech & Spot)</option>
                          {ALL_EVENTS.map(ev => (
                            <option key={ev.id} value={ev.id}>{ev.name}</option>
                          ))}
                        </select>

                        {/* Membership Filter */}
                        <select
                          value={ieeeFilter}
                          onChange={(e) => setIeeeFilter(e.target.value as any)}
                          className="px-2.5 py-2 text-xs rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935] cursor-pointer font-medium"
                          aria-label="Filter by IEEE Membership"
                        >
                          <option value="all">All Memberships ({totalRegistrations})</option>
                          <option value="ieee">IEEE Members Only ({totalIeeeMembers})</option>
                          <option value="non-ieee">Non-IEEE Delegates Only ({totalNonIeeeMembers})</option>
                        </select>

                        {/* Verification & Payment Filter */}
                        <select
                          value={verificationFilter}
                          onChange={(e) => setVerificationFilter(e.target.value as any)}
                          className={`px-2.5 py-2 text-xs rounded-lg border focus:outline-none cursor-pointer font-medium transition-colors ${
                            verificationFilter === 'unverified'
                              ? 'bg-[#2a1d06] border-[#f2c14e] text-[#f2c14e]'
                              : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] focus:border-[#d4a935]'
                          }`}
                          aria-label="Filter by Payment Verification"
                        >
                          <option value="all">All Payment Statuses</option>
                          <option value="unverified">UPI · Pending Verification ({upiPendingCount})</option>
                          <option value="verified">Verified Payments ({verifiedCount})</option>
                          <option value="upi">All UPI Registrations ({upiTotalCount})</option>
                          <option value="razorpay">Razorpay Auto Verified ({razorpayTotalCount})</option>
                        </select>

                        {/* Attendance / Check-In Filter */}
                        <select
                          value={checkInFilter}
                          onChange={(e) => setCheckInFilter(e.target.value as any)}
                          className={`px-2.5 py-2 text-xs rounded-lg border focus:outline-none cursor-pointer font-medium transition-colors ${
                            checkInFilter === 'checked-in'
                              ? 'bg-[#142617] border-[#4cc38a] text-[#4cc38a]'
                              : 'bg-[#131318] border-[#2e2b22] text-[#f3ecd9] focus:border-[#d4a935]'
                          }`}
                          aria-label="Filter by Attendance Check-In"
                        >
                          <option value="all">All Check-In Statuses</option>
                          <option value="checked-in">Checked In ({checkedInCount})</option>
                          <option value="not-checked-in">Not Checked In ({totalRegistrations - checkedInCount})</option>
                        </select>
                      </div>
                    </div>

                    {/* Quick Filter Pill Buttons */}
                    <div className="flex flex-wrap items-center gap-1.5 pt-1 text-xs">
                      <span className="text-[11px] text-[#a79f8b] font-semibold mr-1 flex items-center gap-1">
                        <Filter className="w-3 h-3 text-[#d4a935]" />
                        <span>Filter:</span>
                      </span>

                      <button
                        type="button"
                        onClick={() => { setIeeeFilter('all'); setVerificationFilter('all'); setCheckInFilter('all'); }}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          ieeeFilter === 'all' && verificationFilter === 'all' && checkInFilter === 'all'
                            ? 'bg-[#d4a935] text-[#1a1300]'
                            : 'bg-[#181820] text-[#a79f8b] hover:text-[#f3ecd9] border border-[#2e2b22]'
                        }`}
                      >
                        All ({totalRegistrations})
                      </button>

                      <button
                        type="button"
                        onClick={() => setCheckInFilter(checkInFilter === 'checked-in' ? 'all' : 'checked-in')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          checkInFilter === 'checked-in'
                            ? 'bg-[#4cc38a] text-[#0a1a0f]'
                            : 'bg-[#181820] text-[#a79f8b] hover:text-[#4cc38a] border border-[#2e2b22]'
                        }`}
                      >
                        Checked In ({checkedInCount})
                      </button>

                      <button
                        type="button"
                        onClick={() => setIeeeFilter(ieeeFilter === 'ieee' ? 'all' : 'ieee')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          ieeeFilter === 'ieee'
                            ? 'bg-[#1b5e39] text-[#a5d6a7] border border-[#4cc38a]'
                            : 'bg-[#181820] text-[#4cc38a] hover:bg-[#1b5e39]/30 border border-[#2e2b22]'
                        }`}
                      >
                        <Award className="w-3 h-3" />
                        <span>IEEE ({totalIeeeMembers})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIeeeFilter(ieeeFilter === 'non-ieee' ? 'all' : 'non-ieee')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                          ieeeFilter === 'non-ieee'
                            ? 'bg-[#0f2c4a] text-[#a1d2ff] border border-[#70baff]'
                            : 'bg-[#181820] text-[#9fc7e8] hover:bg-[#0f2c4a]/30 border border-[#2e2b22]'
                        }`}
                      >
                        Non-IEEE ({totalNonIeeeMembers})
                      </button>

                      <span className="text-[#2e2b22] px-1">|</span>

                      <button
                        type="button"
                        onClick={() => setVerificationFilter(verificationFilter === 'unverified' ? 'all' : 'unverified')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          verificationFilter === 'unverified'
                            ? 'bg-[#3b2707] text-[#ffd666] border border-[#f2c14e]'
                            : 'bg-[#181820] text-[#f2c14e] hover:bg-[#3b2707]/40 border border-[#2e2b22]'
                        }`}
                      >
                        <Clock className="w-3 h-3 text-[#f2c14e]" />
                        <span>UPI Pending ({upiPendingCount})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setVerificationFilter(verificationFilter === 'verified' ? 'all' : 'verified')}
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                          verificationFilter === 'verified'
                            ? 'bg-[#142617] text-[#81c784] border border-[#4cc38a]'
                            : 'bg-[#181820] text-[#a79f8b] hover:text-[#f3ecd9] border border-[#2e2b22]'
                        }`}
                      >
                        <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                        <span>Verified ({verifiedCount})</span>
                      </button>
                    </div>

                    {/* SORT CONTROLS & DOWNLOAD BUTTONS */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pt-2 border-t border-[#2e2b22]/70 text-xs">
                      {/* Sort Selector */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] text-[#a79f8b] flex items-center gap-1 font-semibold">
                          <ArrowUpDown className="w-3.5 h-3.5 text-[#d4a935]" />
                          <span>Sort by:</span>
                        </span>
                        <select
                          value={sortBy}
                          onChange={(e) => setSortBy(e.target.value as SortOption)}
                          className="px-2.5 py-1.5 text-xs rounded-md bg-[#131318] border border-[#2e2b22] text-[#f2c14e] font-semibold focus:outline-none focus:border-[#d4a935] cursor-pointer"
                        >
                          <option value="date-desc">Registration Date: Newest First</option>
                          <option value="date-asc">Registration Date: Oldest First</option>
                          <option value="ieee-desc">IEEE Members First (IEEE → Non-IEEE)</option>
                          <option value="ieee-asc">Non-IEEE Delegates First (Non-IEEE → IEEE)</option>
                          <option value="name-asc">Participant Name: A → Z</option>
                          <option value="name-desc">Participant Name: Z → A</option>
                          <option value="roll-asc">Roll Number: A → Z</option>
                          <option value="amount-desc">Fee Paid: Highest First</option>
                          <option value="amount-asc">Fee Paid: Lowest First</option>
                          <option value="event">Technical Event Name</option>
                        </select>
                        <span className="text-[11px] text-[#a79f8b] font-mono">
                          ({filteredAndSortedRecords.length} matched)
                        </span>
                      </div>

                      {/* Download & Batch 8 PM Action Buttons */}
                      <div className="flex flex-wrap items-center gap-2 self-stretch sm:self-auto justify-end">
                        <button
                          type="button"
                          disabled={isSendingUpiBatch}
                          onClick={handleSendAllUpiBatchEmails}
                          className="px-3 py-1.5 rounded-lg bg-[#0f2e1e] border border-[#4cc38a]/50 text-[#4cc38a] hover:bg-[#1a4a32] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm disabled:opacity-50"
                          title="Dispatch 8 PM ticket emails to all UPI registrants"
                        >
                          {isSendingUpiBatch ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending 8 PM Batch...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>Dispatch 8 PM UPI Batch</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={handleExportCsv}
                          className="px-3 py-1.5 rounded-lg bg-[#1f1b0e] border border-[#d4a935]/40 text-[#f2c14e] text-xs font-semibold hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                          title="Download Excel / CSV spreadsheet"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                          <span>Download CSV</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDownloadJsonBackup}
                          className="px-3 py-1.5 rounded-lg bg-[#181820] border border-[#2e2b22] text-[#f3ecd9] text-xs hover:border-[#d4a935]/50 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          title="Download full JSON database dump"
                        >
                          <FileJson className="w-3.5 h-3.5 text-[#9fc7e8]" />
                          <span>Backup JSON</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* REGISTRATIONS LIST VIEW */}
                  {filteredAndSortedRecords.length === 0 ? (
                    <div className="p-8 text-center bg-[#0a0a0d] rounded-2xl border border-[#2e2b22] text-xs text-[#a79f8b] space-y-2">
                      <AlertCircle className="w-6 h-6 text-[#d4a935] mx-auto" />
                      <p>No registration records match your search or filter criteria.</p>
                      <button
                        type="button"
                        onClick={() => { setSearchQuery(''); setSelectedEventFilter('all'); setIeeeFilter('all'); }}
                        className="text-xs text-[#f2c14e] hover:underline"
                      >
                        Reset filters
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredAndSortedRecords.map((record) => {
                        const isExpanded = expandedRecordId === record.regId;
                        const eventName = record.eventIds.map(id => ALL_EVENTS.find(e => e.id === id)?.name).filter(Boolean).join(', ');
                        const primaryEventId = record.eventIds[0] || '';
                        const team = record.teamDetails?.[primaryEventId];
                        const teammates = team?.teamMembers || [];

                        return (
                          <div
                            key={record.regId}
                            className="admin-record-card bg-[#0a0a0d] border border-[#2e2b22] rounded-xl overflow-hidden hover:border-[#d4a935]/50 transition-all"
                          >
                            {/* Record Header Summary */}
                            <div className="p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="admin-badge-regid font-mono font-bold text-xs text-[#f2c14e] bg-[#1f1b0e] px-2 py-0.5 rounded border border-[#d4a935]/30">
                                    {record.regId}
                                  </span>
                                  <span className="admin-attendee-name font-bold text-sm text-white">{record.name}</span>
                                  <span className="font-mono text-[#a79f8b]">({record.roll})</span>
                                  {record.isIeeeMember ? (
                                    <span className="admin-badge-ieee text-[10px] font-semibold text-[#4cc38a] bg-[#4cc38a]/10 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                                      IEEE: #{record.ieeeId || 'Active'}
                                    </span>
                                  ) : (
                                    <span className="admin-badge-non-ieee text-[10px] text-[#a79f8b] bg-[#181820] px-2 py-0.5 rounded border border-[#2e2b22]">
                                      Non-IEEE
                                    </span>
                                  )}
                                  {record.paymentMode === 'upi' ? (
                                    record.isVerified ? (
                                      <span className="admin-badge-verified text-[10px] font-semibold text-[#4cc38a] bg-[#1b5e39]/30 px-2 py-0.5 rounded border border-[#4cc38a]/40 font-mono flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                        <span>UPI · Verified</span>
                                      </span>
                                    ) : (
                                      <span className="admin-badge-pending text-[10px] font-semibold text-[#f2c14e] bg-[#2a1e06] px-2 py-0.5 rounded border border-[#d4a935]/50 font-mono flex items-center gap-1">
                                        <Clock className="w-3 h-3 text-[#f2c14e]" />
                                        <span>UPI · Pending Verification</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="admin-badge-razorpay text-[10px] font-semibold text-[#70baff] bg-[#00629b]/30 px-2 py-0.5 rounded border border-[#0088d4]/40 font-mono flex items-center gap-1">
                                      <ShieldCheck className="w-3 h-3 text-[#4cc38a]" />
                                      <span>Razorpay (Auto Verified)</span>
                                    </span>
                                  )}
                                  {record.checkedIn ? (
                                    <span className="admin-badge-checkedin text-[10px] font-semibold text-[#4cc38a] bg-[#142617] px-2 py-0.5 rounded border border-[#4cc38a]/40 font-mono flex items-center gap-1">
                                      <CheckCircle2 className="w-3 h-3 text-[#4cc38a]" />
                                      <span>Checked In</span>
                                    </span>
                                  ) : (
                                    <span className="admin-badge-not-checkedin text-[10px] text-[#a79f8b] bg-[#181820] px-2 py-0.5 rounded border border-[#2e2b22] font-mono">
                                      Not Checked In
                                    </span>
                                  )}
                                  <span className="admin-badge-event text-[11px] text-[#9fc7e8] font-medium px-2 py-0.5 rounded bg-[#131f2b] border border-[#234259]">
                                    {eventName}
                                  </span>
                                  {team?.teamName && (
                                    <span className="admin-badge-team text-[10px] text-[#f2c14e] bg-[#2a220d] px-2 py-0.5 rounded border border-[#d4a935]/30">
                                      Team: {team.teamName} ({teammates.length + 1} members)
                                    </span>
                                  )}
                                </div>

                                <div className="text-[11px] text-[#a79f8b] flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                  <span>📞 {record.phone}</span>
                                  <span>✉️ {record.email}</span>
                                  <span>🎓 {record.className} {record.section} · {record.dept} ({record.year})</span>
                                  <span>🏫 {record.college}</span>
                                </div>
                              </div>

                              <div className="flex flex-wrap items-center gap-2 self-end sm:self-center shrink-0">
                                <div className="text-right mr-1">
                                  <span className="font-mono font-bold text-sm text-[#f2c14e] block">
                                    ₹{record.totalPaid}
                                  </span>
                                  {record.gstAmount ? (
                                    <span className="text-[10px] text-[#a79f8b] font-mono block">
                                      (GST: ₹{record.gstAmount})
                                    </span>
                                  ) : null}
                                </div>

                                {/* Payment Verification Button: Manual for UPI, Automatic for Razorpay */}
                                {record.paymentMode === 'upi' ? (
                                  record.isVerified ? (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleVerify(record)}
                                      className="px-2.5 py-1 rounded-lg bg-[#0d2a1c] border border-[#4cc38a]/60 text-[#4cc38a] hover:bg-[#153e2a] transition-all cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-sm"
                                      title="UPI Payment Verified! Click to toggle / unverify if needed"
                                    >
                                      <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
                                      <span>Verified ✓</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleVerify(record)}
                                      className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#241a06] via-[#382608] to-[#241a06] border border-[#f2c14e] text-[#f2c14e] hover:bg-[#f2c14e] hover:text-[#1a1300] transition-all cursor-pointer flex items-center gap-1 text-xs font-bold shadow-md shadow-[#f2c14e]/20"
                                      title="Click to verify this UPI payment receipt & transaction reference"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-[#f2c14e] animate-pulse" />
                                      <span>Verify UPI</span>
                                    </button>
                                  )
                                ) : (
                                  <span 
                                    className="px-2 py-1 rounded-lg bg-[#0c1f33] border border-[#0088d4]/40 text-[#70baff] text-[11px] font-semibold flex items-center gap-1"
                                    title="Razorpay payments are automatically authorized and verified by gateway"
                                  >
                                    <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
                                    <span>Auto Verified</span>
                                  </span>
                                )}

                                {/* Quick Check-In / Attendance Button */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleCheckIn(record)}
                                  className={`p-1.5 px-2.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                                    record.checkedIn
                                      ? 'bg-[#142617] text-[#4cc38a] border-[#4cc38a]/50 hover:bg-[#1b5e39]/40'
                                      : 'bg-[#181820] text-[#a79f8b] border-[#2e2b22] hover:text-[#4cc38a] hover:border-[#4cc38a]/40'
                                  }`}
                                  title={record.checkedIn ? 'Delegate Checked In (Click to Undo)' : 'Click to Check In Delegate'}
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span className="hidden md:inline">{record.checkedIn ? 'Checked In' : 'Check In'}</span>
                                </button>

                                {/* View Official Ticket Pass Button */}
                                <button
                                  type="button"
                                  onClick={() => setViewingAdminTicket(record)}
                                  className="px-2.5 py-1 rounded-lg bg-[#181820] border border-[#d4a935]/40 text-[#f2c14e] hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold shadow-sm"
                                  title="View digital ticket pass with dynamic entry QR code"
                                >
                                  <Ticket className="w-3.5 h-3.5" />
                                  <span>View Ticket</span>
                                </button>

                                {/* View UPI Receipt Screenshot */}
                                {(record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const scr = record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot;
                                      if (scr) {
                                        setViewingReceipt({
                                          name: record.name,
                                          roll: record.roll,
                                          paymentId: record.paymentId,
                                          screenshot: scr
                                        });
                                      }
                                    }}
                                    className="p-1 px-2 rounded-lg bg-[#0f2e1e] border border-[#4cc38a]/40 text-[#4cc38a] hover:bg-[#1b5e39] transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-semibold"
                                    title="View UPI Receipt Screenshot"
                                  >
                                    <ImageIcon className="w-3.5 h-3.5" />
                                    <span className="hidden sm:inline">Receipt</span>
                                  </button>
                                )}

                                {/* View / Print Pass */}
                                {onViewPass && (
                                  <button
                                    type="button"
                                    onClick={() => onViewPass(record)}
                                    className="p-1.5 rounded-lg bg-[#181820] border border-[#2e2b22] text-[#f2c14e] hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors cursor-pointer"
                                    title="View & Download Pass"
                                  >
                                    <Printer className="w-3.5 h-3.5" />
                                  </button>
                                )}

                                {/* Send Ticket Email */}
                                <button
                                  type="button"
                                  disabled={sendingEmailRegId === record.regId}
                                  onClick={() => handleSendTicketEmail(record)}
                                  className="p-1.5 rounded-lg bg-[#181820] border border-[#2e2b22] text-[#4cc38a] hover:bg-[#153424] hover:text-white transition-colors cursor-pointer"
                                  title={`Send ticket pass email to ${record.email} (8 PM batch)`}
                                >
                                  {sendingEmailRegId === record.regId ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <Mail className="w-3.5 h-3.5" />
                                  )}
                                </button>

                                {/* Edit Member & Team */}
                                <button
                                  type="button"
                                  onClick={() => setEditingRecord(JSON.parse(JSON.stringify(record)))}
                                  className="p-1.5 rounded-lg bg-[#181820] border border-[#2e2b22] text-[#d4a935] hover:text-white transition-colors cursor-pointer"
                                  title="Edit Participant & Team Members"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {/* Delete Record */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (confirm(`Delete registration ${record.regId} for ${record.name}?`)) {
                                      onDeleteRecord(record.regId);
                                    }
                                  }}
                                  className="p-1.5 rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] hover:bg-[#ff8a80]/20 transition-colors cursor-pointer"
                                  title="Delete Registration"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>

                                {/* Expand / Collapse */}
                                <button
                                  type="button"
                                  onClick={() => setExpandedRecordId(isExpanded ? null : record.regId)}
                                  className="p-1.5 rounded-lg bg-[#181820] border border-[#2e2b22] text-[#a79f8b] hover:text-white transition-colors cursor-pointer"
                                  title="Expand full team details"
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              </div>
                            </div>

                            {/* Expanded Full Team Details Tray */}
                            {isExpanded && (
                              <div className="p-4 border-t border-[#2e2b22] bg-[#131318] text-xs space-y-3">
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] p-2.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22]">
                                  <div>
                                    <span className="text-[#a79f8b] block">Payment Ref:</span>
                                    <span className="font-mono text-[#f3ecd9] font-medium">{record.paymentId}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#a79f8b] block">Registered On:</span>
                                    <span className="text-[#f3ecd9]">{new Date(record.timestamp).toLocaleString()}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#a79f8b] block">Team Name:</span>
                                    <span className="text-[#f2c14e] font-semibold">{team?.teamName || 'Individual Event'}</span>
                                  </div>
                                  <div>
                                    <span className="text-[#a79f8b] block">Project Title:</span>
                                    <span className="text-[#f3ecd9] truncate block">{team?.projectTitle || 'N/A'}</span>
                                  </div>
                                </div>

                                {/* UPI Payment Screenshot Card (if uploaded) */}
                                {(record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot) && (
                                  <div className="p-3 rounded-xl bg-[#081810] border border-[#1d442b] flex flex-wrap items-center justify-between gap-3">
                                    <div className="flex items-center gap-3 min-w-0">
                                      <div 
                                        onClick={() => {
                                          const scr = record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot;
                                          if (scr) {
                                            setViewingReceipt({
                                              name: record.name,
                                              roll: record.roll,
                                              paymentId: record.paymentId,
                                              screenshot: scr
                                            });
                                          }
                                        }}
                                        className="w-14 h-14 rounded-lg bg-black border border-[#27ae60]/50 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity flex items-center justify-center shrink-0 shadow-md"
                                        title="Click to enlarge"
                                      >
                                        <img 
                                          src={record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot} 
                                          alt="UPI Payment Screenshot" 
                                          className="w-full h-full object-cover" 
                                        />
                                      </div>
                                      <div className="min-w-0">
                                        <span className="text-xs font-bold text-white block flex items-center gap-1.5">
                                          <ImageIcon className="w-3.5 h-3.5 text-[#4cc38a]" />
                                          <span>UPI Payment Screenshot</span>
                                        </span>
                                        <span className="text-[10px] text-[#a3e8c0] font-mono block">
                                          UTR: {record.paymentId}
                                        </span>
                                        <span className="text-[10px] text-[#7ea0c4] block">
                                          Uploaded by delegate during verification
                                        </span>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      {/* Verify Payment in expanded card */}
                                      <button
                                        type="button"
                                        onClick={() => handleToggleVerify(record)}
                                        className={`px-3 py-1.5 rounded-lg font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all shrink-0 ${
                                          record.isVerified
                                            ? 'bg-[#0d2a1c] border border-[#4cc38a]/60 text-[#4cc38a] hover:bg-[#153e2a]'
                                            : 'bg-gradient-to-r from-[#241a06] via-[#382608] to-[#241a06] border border-[#f2c14e] text-[#f2c14e] hover:bg-[#f2c14e] hover:text-[#1a1300]'
                                        }`}
                                      >
                                        {record.isVerified ? (
                                          <>
                                            <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
                                            <span>Verified ✓ (Unverify)</span>
                                          </>
                                        ) : (
                                          <>
                                            <Clock className="w-3.5 h-3.5 text-[#f2c14e]" />
                                            <span>Mark as Verified</span>
                                          </>
                                        )}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const scr = record.paymentScreenshot || (record.teamDetails as any)?._paymentScreenshot;
                                          if (scr) {
                                            setViewingReceipt({
                                              name: record.name,
                                              roll: record.roll,
                                              paymentId: record.paymentId,
                                              screenshot: scr
                                            });
                                          }
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-[#1b5e39] hover:bg-[#27ae60] text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all shrink-0"
                                      >
                                        <Eye className="w-3.5 h-3.5" />
                                        <span>View Full Receipt</span>
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Action bar inside expanded tray: Ticket Pass button */}
                                <div className="flex items-center gap-2 pt-1 border-t border-[#2e2b22]/50">
                                  <button
                                    type="button"
                                    onClick={() => setViewingAdminTicket(record)}
                                    className="px-3 py-1.5 rounded-lg bg-[#1f1b0e] border border-[#d4a935]/50 text-[#f2c14e] hover:bg-[#d4a935] hover:text-[#1a1300] font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all"
                                  >
                                    <Ticket className="w-3.5 h-3.5" />
                                    <span>View Official Ticket Pass & QR Code</span>
                                  </button>
                                </div>

                                {/* Full Teammates Cards */}
                                <div className="space-y-1.5 pt-1">
                                  <span className="text-[11px] font-bold text-[#d4a935] uppercase tracking-wider block">
                                    All Registered Members ({teammates.length + 1} Total with Lead):
                                  </span>
                                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                    {/* Member 1 (Lead) */}
                                    <div className="p-2.5 rounded-lg bg-[#0a0a0d] border border-[#d4a935]/30 text-[11px] space-y-0.5">
                                      <div className="flex justify-between font-bold text-white">
                                        <span>{record.name}</span>
                                        <span className="text-[10px] text-[#f2c14e] font-mono">LEAD (MEMBER 1)</span>
                                      </div>
                                      <div className="text-[#a79f8b] font-mono">Roll: {record.roll} · Phone: {record.phone}</div>
                                      <div className="text-[#a79f8b]">{record.className} {record.section} · {record.dept} ({record.year})</div>
                                      <div className="text-[10px] pt-0.5 font-medium">
                                        {record.isIeeeMember ? (
                                          <span className="text-[#4cc38a]">IEEE Member (ID: #{record.ieeeId || 'Active'})</span>
                                        ) : (
                                          <span className="text-[#a79f8b]">Non-IEEE Member</span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Teammates */}
                                    {teammates.map((m, mIdx) => (
                                      <div key={mIdx} className="p-2.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[11px] space-y-0.5">
                                        <div className="flex justify-between font-bold text-white">
                                          <span>{m.name || `Member ${mIdx + 2}`}</span>
                                          <span className="text-[10px] text-[#a79f8b] font-mono">MEMBER {mIdx + 2}</span>
                                        </div>
                                        <div className="text-[#a79f8b] font-mono">Roll: {m.roll || 'Pending'} · Phone: {m.phone || 'N/A'}</div>
                                        <div className="text-[#a79f8b]">{m.className || 'B.Tech'} {m.section ? `Sec ${m.section}` : ''} · {m.branch || 'Branch'} ({m.year || '3rd Year'})</div>
                                        <div className="text-[10px] pt-0.5 font-medium">
                                          {m.isIeeeMember ? (
                                            <span className="text-[#4cc38a]">IEEE Member (ID: #{m.ieeeId || 'Active'})</span>
                                          ) : (
                                            <span className="text-[#a79f8b]">Non-IEEE Member</span>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MANUAL / SPOT REGISTRATION CREATOR */}
              {activeTab === 'manual' && (
                <div className="space-y-5 max-w-3xl mx-auto">
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <div className="border-b border-[#2e2b22] pb-3">
                      <div className="flex items-center gap-2">
                        <Plus className="w-5 h-5 text-[#f2c14e]" />
                        <h4 className="text-base font-bold text-white">
                          On-Desk / Spot Registration Creator
                        </h4>
                      </div>
                      <p className="text-xs text-[#a79f8b] mt-1">
                        Register walk-in attendees or manual teams directly at the symposium reception desk.
                      </p>
                    </div>

                    {manualSuccessMsg && (
                      <div className="p-3 rounded-xl bg-[#0d2a1c] border border-[#4cc38a] text-xs text-[#86efac] flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#4cc38a]" />
                        <span>{manualSuccessMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleManualRegisterSubmit} className="space-y-4 text-xs">
                      {/* Technical Event Selection */}
                      <div>
                        <label className="text-[11px] font-semibold text-white block mb-1">
                          Select Technical Event *
                        </label>
                        <select
                          value={manualEventId}
                          onChange={(e) => {
                            const newId = e.target.value;
                            setManualEventId(newId);
                            const ev = ALL_EVENTS.find(x => x.id === newId);
                            if (ev) setManualFee(manualIsIeee ? ev.feeMember : ev.feeNonMember);
                          }}
                          className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                        >
                          {ALL_EVENTS.map(ev => (
                            <option key={ev.id} value={ev.id}>
                              {ev.name} ({ev.teamLabel} · Min: {ev.min}, Max: {ev.max})
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Participant / Team Lead Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Full Name (Lead) *</label>
                          <input
                            type="text"
                            value={manualName}
                            onChange={(e) => setManualName(e.target.value)}
                            placeholder="Delegate Full Name"
                            required
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Roll Number *</label>
                          <input
                            type="text"
                            value={manualRoll}
                            onChange={(e) => setManualRoll(e.target.value)}
                            placeholder="e.g. 23B91A0515"
                            required
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Mobile Phone *</label>
                          <input
                            type="tel"
                            maxLength={10}
                            value={manualPhone}
                            onChange={(e) => setManualPhone(e.target.value)}
                            placeholder="10-digit number"
                            required
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Email Address</label>
                          <input
                            type="email"
                            value={manualEmail}
                            onChange={(e) => setManualEmail(e.target.value)}
                            placeholder="student@example.com"
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Branch / Dept</label>
                          <input
                            type="text"
                            value={manualDept}
                            onChange={(e) => setManualDept(e.target.value)}
                            placeholder="e.g. CSE"
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Year of Study</label>
                          <select
                            value={manualYear}
                            onChange={(e) => setManualYear(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                          >
                            <option value="1st Year">1st Year</option>
                            <option value="2nd Year">2nd Year</option>
                            <option value="3rd Year">3rd Year</option>
                            <option value="4th Year">4th Year</option>
                          </select>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="text-[11px] text-[#a79f8b] block mb-1">College / Institution</label>
                          <input
                            type="text"
                            value={manualCollege}
                            onChange={(e) => setManualCollege(e.target.value)}
                            className="w-full px-3 py-2 rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                          />
                        </div>
                      </div>

                      {/* Lead IEEE Status */}
                      <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-2">
                        <label className="text-[11px] font-semibold text-white block">
                          Lead IEEE Membership Status
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setManualIsIeee(false);
                              const ev = ALL_EVENTS.find(x => x.id === manualEventId);
                              if (ev) setManualFee(ev.feeNonMember);
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer ${
                              !manualIsIeee ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]' : 'bg-[#0a0a0d] text-[#a79f8b] border-[#2e2b22]'
                            }`}
                          >
                            Non-IEEE Member
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setManualIsIeee(true);
                              const ev = ALL_EVENTS.find(x => x.id === manualEventId);
                              if (ev) setManualFee(ev.feeMember);
                            }}
                            className={`py-1.5 px-3 rounded-lg text-xs font-medium border text-center transition-all cursor-pointer flex items-center justify-center gap-1 ${
                              manualIsIeee ? 'bg-[#1f1b0e] text-[#f2c14e] border-[#d4a935]' : 'bg-[#0a0a0d] text-[#a79f8b] border-[#2e2b22]'
                            }`}
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>IEEE Member</span>
                          </button>
                        </div>
                        {manualIsIeee && (
                          <input
                            type="text"
                            value={manualIeeeId}
                            onChange={(e) => setManualIeeeId(e.target.value)}
                            placeholder="Enter IEEE Membership ID (e.g. 99123456)"
                            className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono mt-2"
                          />
                        )}
                      </div>

                      {/* Teammates Section if team event */}
                      {ALL_EVENTS.find(e => e.id === manualEventId)?.max! > 1 && (
                        <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">Team Details & Additional Members</span>
                            <button
                              type="button"
                              onClick={() => {
                                const ev = ALL_EVENTS.find(e => e.id === manualEventId);
                                if (!ev || manualTeammates.length + 1 >= ev.max) return;
                                setManualTeammates([
                                  ...manualTeammates,
                                  {
                                    name: '',
                                    roll: '',
                                    className: 'B.Tech',
                                    section: 'A',
                                    branch: manualDept || 'CSE',
                                    year: manualYear || '3rd Year',
                                    phone: '',
                                    isIeeeMember: false,
                                    ieeeId: ''
                                  }
                                ]);
                              }}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors"
                            >
                              + Add Teammate
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <input
                              type="text"
                              value={manualTeamName}
                              onChange={(e) => setManualTeamName(e.target.value)}
                              placeholder="Team Name (e.g. CyberKnights)"
                              className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                            />
                            {ALL_EVENTS.find(e => e.id === manualEventId)?.project && (
                              <input
                                type="text"
                                value={manualProjectTitle}
                                onChange={(e) => setManualProjectTitle(e.target.value)}
                                placeholder="Project / Prototype Title"
                                className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                              />
                            )}
                          </div>

                          {/* Teammates List */}
                          {manualTeammates.map((tm, tIdx) => (
                            <div key={tIdx} className="p-3 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-[#f2c14e]">Teammate #{tIdx + 2}</span>
                                <button
                                  type="button"
                                  onClick={() => setManualTeammates(manualTeammates.filter((_, i) => i !== tIdx))}
                                  className="text-[11px] text-[#ff8a80] hover:underline"
                                >
                                  Remove
                                </button>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                <input
                                  type="text"
                                  value={tm.name}
                                  onChange={(e) => {
                                    const copy = [...manualTeammates];
                                    copy[tIdx].name = e.target.value;
                                    setManualTeammates(copy);
                                  }}
                                  placeholder="Teammate Name"
                                  className="px-2.5 py-1.5 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                                />
                                <input
                                  type="text"
                                  value={tm.roll}
                                  onChange={(e) => {
                                    const copy = [...manualTeammates];
                                    copy[tIdx].roll = e.target.value;
                                    setManualTeammates(copy);
                                  }}
                                  placeholder="Roll No"
                                  className="px-2.5 py-1.5 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                                />
                                <input
                                  type="tel"
                                  value={tm.phone}
                                  onChange={(e) => {
                                    const copy = [...manualTeammates];
                                    copy[tIdx].phone = e.target.value;
                                    setManualTeammates(copy);
                                  }}
                                  placeholder="Phone"
                                  className="px-2.5 py-1.5 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                                />
                              </div>

                              <div className="flex items-center gap-2 pt-1">
                                <label className="flex items-center gap-1.5 text-[#a79f8b] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={tm.isIeeeMember}
                                    onChange={(e) => {
                                      const copy = [...manualTeammates];
                                      copy[tIdx].isIeeeMember = e.target.checked;
                                      setManualTeammates(copy);
                                    }}
                                    className="accent-[#d4a935]"
                                  />
                                  <span>IEEE Member</span>
                                </label>
                                {tm.isIeeeMember && (
                                  <input
                                    type="text"
                                    value={tm.ieeeId || ''}
                                    onChange={(e) => {
                                      const copy = [...manualTeammates];
                                      copy[tIdx].ieeeId = e.target.value;
                                      setManualTeammates(copy);
                                    }}
                                    placeholder="IEEE ID"
                                    className="px-2 py-1 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs font-mono flex-1"
                                  />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Payment Mode & Amount */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22]">
                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Spot Payment Method</label>
                          <select
                            value={manualPayMethod}
                            onChange={(e) => setManualPayMethod(e.target.value as any)}
                            className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                          >
                            <option value="UPI Spot">UPI / QR Desk Payment</option>
                            <option value="Cash Spot">Cash at Reception Desk</option>
                            <option value="Special Waiver">Authorized Complimentary Waiver</option>
                          </select>
                        </div>
                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">Amount Paid (INR)</label>
                          <input
                            type="number"
                            value={manualFee}
                            onChange={(e) => setManualFee(Number(e.target.value))}
                            className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f2c14e] font-mono font-bold"
                          />
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full py-3 px-4 font-bold rounded-xl bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-[#1a1300] hover:brightness-105 transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer text-sm"
                      >
                        <Save className="w-4 h-4" />
                        <span>Confirm & Generate Spot Registration</span>
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* TAB 3: CONTROL REGISTRATION (OPEN/CLOSE, BANNER, AUDIT) */}
              {activeTab === 'status' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Power className="w-5 h-5 text-[#f2c14e]" />
                      <span>Registration Portal Master Switch</span>
                    </h4>
                    <p className="text-xs text-[#a79f8b] leading-relaxed">
                      Instantly open or close the public registration portal. When closed, new submissions are blocked and the alert banner below is shown to all visitors.
                    </p>

                    {/* BIG TOGGLE BUTTON */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => onToggleRegClosed(!isRegClosed)}
                        className={`w-full py-4 px-6 rounded-2xl font-bold text-sm transition-all flex items-center justify-center gap-3 shadow-xl cursor-pointer ${
                          isRegClosed
                            ? 'bg-[#2a1315] border-2 border-[#ff8a80] text-[#ffb4ab] hover:bg-[#3d1a1e]'
                            : 'bg-[#0d2a1c] border-2 border-[#4cc38a] text-[#86efac] hover:bg-[#143a27]'
                        }`}
                      >
                        <Power className={`w-5 h-5 ${isRegClosed ? 'text-[#ff8a80]' : 'text-[#4cc38a]'}`} />
                        <span className="text-base">
                          {isRegClosed ? 'REGISTRATION IS CURRENTLY: CLOSED' : 'REGISTRATION IS CURRENTLY: OPEN'}
                        </span>
                      </button>
                    </div>

                    <div className="text-[11px] text-[#a79f8b] flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isRegClosed ? 'bg-[#ff8a80]' : 'bg-[#4cc38a]'}`} />
                      <span>Current Public Status: <strong>{isRegClosed ? 'CLOSED TO DELEGATES' : 'ACTIVELY ACCEPTING REGISTRATIONS'}</strong></span>
                    </div>
                  </div>

                  {/* Closed Message Banner Customizer */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3">
                    <label className="text-xs font-semibold text-white block">
                      Custom Announcement Banner (Shown when portal is closed):
                    </label>
                    <textarea
                      rows={3}
                      value={closedMessage}
                      onChange={(e) => onUpdateClosedMessage(e.target.value)}
                      placeholder="e.g. Registration closed on 9 October 2026 at 1:00 PM. Spot registrations available at reception desk."
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                    />
                    <div className="p-3 rounded-xl bg-[#2a1315] border border-[#ff8a80]/30 text-xs text-[#ff8a80]">
                      <strong>Live Banner Preview:</strong> {closedMessage || 'Registration is currently closed.'}
                    </div>
                  </div>

                  {/* Slot Quota & Capacity Limits Control Card */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2b22] pb-3">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <SlidersHorizontal className="w-5 h-5 text-[#f2c14e]" />
                          <span>Symposium Capacity & Slot Quota Management</span>
                        </h4>
                        <p className="text-xs text-[#a79f8b] mt-0.5">
                          Set maximum delegate limits for Total Symposium, IEEE Members, and Non-IEEE. Set to 0 for unlimited.
                        </p>
                      </div>
                      <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-[#131318] border border-[#2e2b22] text-[#f2c14e] self-start sm:self-auto">
                        Live Quota Controls
                      </span>
                    </div>

                    {/* 3 Slot Limit Configuration Inputs & Live Gauges */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                      {/* Slot 1: Total Slots Limit */}
                      <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#f2c14e]" />
                            <span>Total Slots Limit</span>
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            Number(inputTotalSlots) > 0 && totalRegistrations >= Number(inputTotalSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : Number(inputTotalSlots) > 0
                              ? 'bg-[#d4a935]/20 text-[#f2c14e]'
                              : 'bg-white/10 text-[#a79f8b]'
                          }`}>
                            {Number(inputTotalSlots) > 0 
                              ? (totalRegistrations >= Number(inputTotalSlots) ? 'FULL' : `${Number(inputTotalSlots) - totalRegistrations} left`)
                              : 'UNLIMITED'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {Number(inputTotalSlots) > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-[#0a0a0d] h-2 rounded-full overflow-hidden border border-[#2e2b22]">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  totalRegistrations >= Number(inputTotalSlots)
                                    ? 'bg-[#ff8a80]'
                                    : (totalRegistrations / Number(inputTotalSlots)) > 0.8
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-gradient-to-r from-[#f2c14e] to-[#d4a935]'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((totalRegistrations / Number(inputTotalSlots)) * 100))}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#a79f8b] font-mono">
                              <span>Occupied: {totalRegistrations}</span>
                              <span>{Math.min(100, Math.round((totalRegistrations / Number(inputTotalSlots)) * 100))}%</span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] text-[#a79f8b] block mb-1">Max Total Capacity (0 = Unlimited):</label>
                          <input
                            type="number"
                            min="0"
                            value={inputTotalSlots}
                            onChange={(e) => setInputTotalSlots(e.target.value)}
                            placeholder="0 (Unlimited)"
                            className="w-full px-3 py-2 text-xs rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono focus:outline-none focus:border-[#d4a935]"
                          />
                        </div>
                      </div>

                      {/* Slot 2: IEEE Member Slots Limit */}
                      <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#4cc38a]" />
                            <span>IEEE Member Slots</span>
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            Number(inputIeeeSlots) > 0 && totalIeeeMembers >= Number(inputIeeeSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : Number(inputIeeeSlots) > 0
                              ? 'bg-[#4cc38a]/20 text-[#4cc38a]'
                              : 'bg-white/10 text-[#a79f8b]'
                          }`}>
                            {Number(inputIeeeSlots) > 0 
                              ? (totalIeeeMembers >= Number(inputIeeeSlots) ? 'QUOTA FULL' : `${Number(inputIeeeSlots) - totalIeeeMembers} left`)
                              : 'UNLIMITED'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {Number(inputIeeeSlots) > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-[#0a0a0d] h-2 rounded-full overflow-hidden border border-[#2e2b22]">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  totalIeeeMembers >= Number(inputIeeeSlots)
                                    ? 'bg-[#ff8a80]'
                                    : (totalIeeeMembers / Number(inputIeeeSlots)) > 0.8
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-gradient-to-r from-[#4cc38a] to-[#22c55e]'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((totalIeeeMembers / Number(inputIeeeSlots)) * 100))}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#a79f8b] font-mono">
                              <span>Occupied: {totalIeeeMembers}</span>
                              <span>{Math.min(100, Math.round((totalIeeeMembers / Number(inputIeeeSlots)) * 100))}%</span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] text-[#a79f8b] block mb-1">Max IEEE Slots (0 = Unlimited):</label>
                          <input
                            type="number"
                            min="0"
                            value={inputIeeeSlots}
                            onChange={(e) => setInputIeeeSlots(e.target.value)}
                            placeholder="0 (Unlimited)"
                            className="w-full px-3 py-2 text-xs rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono focus:outline-none focus:border-[#4cc38a]"
                          />
                        </div>
                      </div>

                      {/* Slot 3: Non-IEEE Delegate Slots Limit */}
                      <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-[#70baff]" />
                            <span>Non-IEEE Slots</span>
                          </span>
                          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                            Number(inputNonIeeeSlots) > 0 && totalNonIeeeMembers >= Number(inputNonIeeeSlots)
                              ? 'bg-[#ff8a80]/20 text-[#ff8a80]'
                              : Number(inputNonIeeeSlots) > 0
                              ? 'bg-[#70baff]/20 text-[#70baff]'
                              : 'bg-white/10 text-[#a79f8b]'
                          }`}>
                            {Number(inputNonIeeeSlots) > 0 
                              ? (totalNonIeeeMembers >= Number(inputNonIeeeSlots) ? 'QUOTA FULL' : `${Number(inputNonIeeeSlots) - totalNonIeeeMembers} left`)
                              : 'UNLIMITED'}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        {Number(inputNonIeeeSlots) > 0 && (
                          <div className="space-y-1">
                            <div className="w-full bg-[#0a0a0d] h-2 rounded-full overflow-hidden border border-[#2e2b22]">
                              <div 
                                className={`h-full transition-all duration-500 rounded-full ${
                                  totalNonIeeeMembers >= Number(inputNonIeeeSlots)
                                    ? 'bg-[#ff8a80]'
                                    : (totalNonIeeeMembers / Number(inputNonIeeeSlots)) > 0.8
                                    ? 'bg-[#f59e0b]'
                                    : 'bg-gradient-to-r from-[#70baff] to-[#3b82f6]'
                                }`}
                                style={{ width: `${Math.min(100, Math.round((totalNonIeeeMembers / Number(inputNonIeeeSlots)) * 100))}%` }}
                              />
                            </div>
                            <div className="flex justify-between text-[10px] text-[#a79f8b] font-mono">
                              <span>Occupied: {totalNonIeeeMembers}</span>
                              <span>{Math.min(100, Math.round((totalNonIeeeMembers / Number(inputNonIeeeSlots)) * 100))}%</span>
                            </div>
                          </div>
                        )}

                        <div>
                          <label className="text-[10px] text-[#a79f8b] block mb-1">Max Non-IEEE Slots (0 = Unlimited):</label>
                          <input
                            type="number"
                            min="0"
                            value={inputNonIeeeSlots}
                            onChange={(e) => setInputNonIeeeSlots(e.target.value)}
                            placeholder="0 (Unlimited)"
                            className="w-full px-3 py-2 text-xs rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono focus:outline-none focus:border-[#70baff]"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets */}
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <span className="text-[11px] text-[#a79f8b] font-semibold">Quick Quota Presets:</span>
                      <button
                        type="button"
                        onClick={() => { setInputTotalSlots(0); setInputIeeeSlots(0); setInputNonIeeeSlots(0); }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#131318] hover:bg-[#1f1f28] border border-[#2e2b22] text-[#f3ecd9] transition-colors cursor-pointer"
                      >
                        All Unlimited (0)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInputTotalSlots(500); setInputIeeeSlots(200); setInputNonIeeeSlots(300); }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#131318] hover:bg-[#1f1f28] border border-[#2e2b22] text-[#f3ecd9] transition-colors cursor-pointer"
                      >
                        500 Symposium (200 IEEE / 300 Non-IEEE)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInputTotalSlots(300); setInputIeeeSlots(100); setInputNonIeeeSlots(200); }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#131318] hover:bg-[#1f1f28] border border-[#2e2b22] text-[#f3ecd9] transition-colors cursor-pointer"
                      >
                        300 Slots (100 IEEE / 200 Non-IEEE)
                      </button>
                      <button
                        type="button"
                        onClick={() => { setInputTotalSlots(150); setInputIeeeSlots(50); setInputNonIeeeSlots(100); }}
                        className="px-2.5 py-1 text-[11px] rounded-lg bg-[#131318] hover:bg-[#1f1f28] border border-[#2e2b22] text-[#f3ecd9] transition-colors cursor-pointer"
                      >
                        150 Slots (50 IEEE / 100 Non-IEEE)
                      </button>
                    </div>

                    {/* Action Save Button */}
                    <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => handleSaveSlotLimits()}
                        disabled={isSavingLimits}
                        className="py-3 px-6 rounded-xl font-bold text-sm bg-gradient-to-r from-[#f2c14e] to-[#d4a935] text-[#1a1300] hover:brightness-105 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#f2c14e]/15 cursor-pointer disabled:opacity-50"
                      >
                        {isSavingLimits ? (
                          <>
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            <span>Updating Quotas...</span>
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4" />
                            <span>Save & Apply Quota Limits</span>
                          </>
                        )}
                      </button>

                      {limitsSaveMsg && (
                        <div className="text-xs text-[#4cc38a] font-semibold flex items-center gap-1.5 animate-in fade-in">
                          <CheckCircle2 className="w-4 h-4 shrink-0" />
                          <span>{limitsSaveMsg}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: UPLOAD & ADD PHOTOS ("give me the images adding field in the admin panel") */}
              {activeTab === 'photos' && (
                <div className="space-y-6">
                  {/* Photo Adding Card */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#2e2b22] pb-3">
                      <div>
                        <h4 className="text-base font-bold text-white flex items-center gap-2">
                          <ImageIcon className="w-5 h-5 text-[#f2c14e]" />
                          <span>Add Previous Symposium Photos & Memories</span>
                        </h4>
                        <p className="text-xs text-[#a79f8b] mt-0.5">
                          Add photos to the public gallery section. These images will automatically display between the Hero and Registration sections.
                        </p>
                      </div>

                      {/* Source Mode Toggle: URL vs File Upload */}
                      <div className="flex items-center gap-1.5 p-1 rounded-xl bg-[#131318] border border-[#2e2b22]">
                        <button
                          type="button"
                          onClick={() => setPhotoSourceMode('url')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            photoSourceMode === 'url'
                              ? 'bg-[#f2c14e] text-[#1a1300] shadow'
                              : 'text-[#a79f8b] hover:text-white'
                          }`}
                        >
                          <Link className="w-3.5 h-3.5" />
                          <span>Image URL</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhotoSourceMode('upload')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                            photoSourceMode === 'upload'
                              ? 'bg-[#f2c14e] text-[#1a1300] shadow'
                              : 'text-[#a79f8b] hover:text-white'
                          }`}
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload File</span>
                        </button>
                      </div>
                    </div>

                    {/* DUAL ADDING INTERFACE */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
                      {/* Left: Input Fields */}
                      <div className="lg:col-span-8 space-y-3.5">
                        {photoSourceMode === 'url' ? (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#f3ecd9] flex items-center justify-between">
                              <span>Image Web URL</span>
                              <span className="text-[11px] text-[#a79f8b]">HTTPS image link or direct web link</span>
                            </label>
                            <div className="relative">
                              <input
                                type="url"
                                value={newPhotoUrl}
                                onChange={(e) => setNewPhotoUrl(e.target.value)}
                                placeholder="https://images.unsplash.com/... or https://your-domain.com/photo.jpg"
                                className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#f2c14e] font-mono transition-colors"
                              />
                              <Link className="w-4 h-4 text-[#a79f8b] absolute left-3 top-3" />
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-[#f3ecd9] block">
                              Select Image File from Device
                            </label>
                            <div 
                              onClick={() => photoUploadRef.current?.click()}
                              className="p-6 rounded-xl bg-[#131318] border-2 border-dashed border-[#2e2b22] hover:border-[#f2c14e]/50 transition-colors text-center cursor-pointer space-y-2 group"
                            >
                              <Upload className="w-8 h-8 text-[#d4a935] mx-auto group-hover:scale-110 transition-transform" />
                              <div className="text-xs text-[#f3ecd9] font-medium">
                                Click to browse image file (JPG, PNG, WebP)
                              </div>
                              <p className="text-[11px] text-[#a79f8b]">
                                Max size: 10MB · Automatically optimized
                              </p>
                              <input
                                ref={photoUploadRef}
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="hidden"
                              />
                            </div>
                          </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs font-semibold text-[#f3ecd9] block mb-1">
                              Photo Title / Caption
                            </label>
                            <input
                              type="text"
                              value={newPhotoTitle}
                              onChange={(e) => setNewPhotoTitle(e.target.value)}
                              placeholder="e.g. Inaugural Keynote / CTF Lab"
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] placeholder-[#5a6a80] focus:outline-none focus:border-[#f2c14e] transition-colors"
                            />
                          </div>

                          <div>
                            <label className="text-xs font-semibold text-[#f3ecd9] block mb-1">
                              Gallery Category
                            </label>
                            <select
                              value={newPhotoCategory}
                              onChange={(e) => setNewPhotoCategory(e.target.value)}
                              className="w-full px-3.5 py-2.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs text-[#f3ecd9] focus:outline-none focus:border-[#f2c14e] transition-colors"
                            >
                              <option value="Symposium Highlights">Symposium Highlights</option>
                              <option value="Technical Events">Technical Events</option>
                              <option value="Expo & Projects">Expo & Projects</option>
                              <option value="Guest Dignitaries">Guest Dignitaries</option>
                              <option value="Campus & Venue">Campus & Venue</option>
                            </select>
                          </div>
                        </div>

                        {/* Submit Button (for URL mode) */}
                        {photoSourceMode === 'url' && (
                          <div className="pt-1 flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => handleAddPhotoUrl()}
                              disabled={isAddingPhoto || !newPhotoUrl.trim()}
                              className="px-5 py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] transition-all flex items-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                            >
                              <Plus className="w-4 h-4" />
                              <span>{isAddingPhoto ? 'Adding Image...' : 'Add Image to Gallery'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setNewPhotoUrl('https://images.unsplash.com/photo-1531482615713-2afd69097998?w=1200&auto=format&fit=crop&q=80');
                                setNewPhotoTitle('Student Innovation Showcase');
                              }}
                              className="text-xs text-[#a79f8b] hover:text-[#f2c14e] underline transition-colors cursor-pointer"
                            >
                              Paste sample image
                            </button>
                          </div>
                        )}

                        {/* Success notification */}
                        {photoAddSuccess && (
                          <div className="p-3 rounded-xl bg-[#0f2e1e] border border-[#4cc38a]/40 text-xs text-[#a3e8c0] flex items-center gap-2 animate-in fade-in">
                            <Check className="w-4 h-4 text-[#4cc38a]" />
                            <span>{photoAddSuccess}</span>
                          </div>
                        )}
                      </div>

                      {/* Right: Live Preview Box */}
                      <div className="lg:col-span-4 bg-[#131318] p-3 rounded-xl border border-[#2e2b22] space-y-2">
                        <span className="text-[11px] font-semibold text-[#a79f8b] block uppercase tracking-wider">
                          Live Card Preview
                        </span>
                        <div className="relative aspect-video rounded-lg bg-black/60 overflow-hidden border border-[#2e2b22] flex items-center justify-center">
                          {newPhotoUrl.trim() ? (
                            <img
                              src={newPhotoUrl.trim()}
                              alt="Preview"
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                              }}
                              onLoad={(e) => {
                                (e.target as HTMLImageElement).style.display = 'block';
                              }}
                            />
                          ) : (
                            <div className="text-center p-3 text-[#5a6a80] space-y-1">
                              <ImageIcon className="w-6 h-6 mx-auto opacity-40" />
                              <span className="text-[10px] block">Enter a URL or select a file to preview</span>
                            </div>
                          )}
                          <div className="absolute top-2 left-2">
                            <span className="text-[9px] font-bold uppercase px-2 py-0.5 rounded-full bg-black/70 text-[#f2c14e] border border-[#d4a935]/30">
                              {newPhotoCategory}
                            </span>
                          </div>
                        </div>
                        <div className="text-xs font-semibold text-white truncate">
                          {newPhotoTitle.trim() || 'Untitled Photo'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* GALLERY PHOTOS GRID */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#f2c14e] uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4" />
                        <span>Uploaded Symposium Photos ({galleryPhotos.length})</span>
                      </span>
                    </div>

                    {galleryPhotos.length === 0 ? (
                      <div className="p-8 text-center bg-[#0a0a0d] rounded-2xl border border-[#2e2b22] text-xs text-[#a79f8b]">
                        No photos uploaded yet. Use the upload button above to add symposium event images.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {galleryPhotos.map((photo) => (
                          <div
                            key={photo.id}
                            className="group relative rounded-xl bg-[#0a0a0d] border border-[#2e2b22] overflow-hidden hover:border-[#d4a935]/50 transition-all shadow-md flex flex-col"
                          >
                            <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center">
                              <img
                                src={photo.url}
                                alt={photo.title}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
                                <button
                                  type="button"
                                  onClick={() => setPreviewLightbox(photo.url)}
                                  className="p-1.5 rounded-lg bg-black/60 text-white hover:text-[#f2c14e] backdrop-blur-sm cursor-pointer"
                                  title="View full size"
                                >
                                  <Maximize2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeletePhoto(photo.id)}
                                  className="p-1.5 rounded-lg bg-[#2a1315]/80 text-[#ff8a80] hover:text-[#ffb4ab] backdrop-blur-sm cursor-pointer"
                                  title="Delete photo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                            <div className="p-3 text-xs space-y-1 flex-1 flex flex-col justify-between">
                              <div className="font-semibold text-white truncate" title={photo.title}>
                                {photo.title}
                              </div>
                              <div className="flex items-center justify-between text-[10px] text-[#a79f8b] pt-1">
                                <span className="px-1.5 py-0.5 rounded bg-[#181820] border border-[#2e2b22] text-[#f2c14e]">
                                  {photo.category}
                                </span>
                                <span>{new Date(photo.uploadedAt).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* BRAND & LOGO MANAGER (LEFT LOGO & RIGHT LOGO) */}
                  <div className="p-4 sm:p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4 pt-4">
                    <div className="space-y-1">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Upload className="w-5 h-5 text-[#f2c14e]" />
                        <span>Header Logos & Institutional Seals</span>
                      </h4>
                      <p className="text-xs text-[#a79f8b]">
                        Replace the top-left (NBKRIST) or top-right (IEEE-SB) logos across all headers, passes, and badges.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* LEFT LOGO (Main Symposium Logo) */}
                      <div className="p-4 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-3 text-center">
                        <span className="text-xs font-bold text-white block text-left">Top-Left Logo (Main Symposium Logo)</span>
                        <div className="w-24 h-24 mx-auto rounded-xl bg-black/60 p-2 shadow-inner border border-[#d4a935]/40 flex items-center justify-center overflow-hidden">
                          <img src={leftLogo || '/symposium-poster.jpg'} alt="Main Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                        <input
                          ref={leftFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleLeftImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => leftFileRef.current?.click()}
                          className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#00629b] text-white hover:bg-[#0077bc] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload New Left Seal</span>
                        </button>
                      </div>

                      {/* RIGHT LOGO (IEEE-SB) */}
                      <div className="p-4 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-3 text-center">
                        <span className="text-xs font-bold text-white block text-left">Top-Right Logo (IEEE-SB)</span>
                        <div className="w-24 h-24 mx-auto rounded-xl bg-white p-2 shadow-inner border border-[#2e2b22] flex items-center justify-center">
                          <img src={rightLogo} alt="Right Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                        <input
                          ref={rightFileRef}
                          type="file"
                          accept="image/*"
                          onChange={handleRightImageUpload}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => rightFileRef.current?.click()}
                          className="w-full py-2 px-3 text-xs font-bold rounded-lg bg-[#00629b] text-white hover:bg-[#0077bc] transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload New Right Seal</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 5: BACKUP, RESTORE & SECURITY */}
              {activeTab === 'settings' && (
                <div className="space-y-6 max-w-2xl mx-auto">
                  {/* Payment Mode & Gateway Configuration Card */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <CreditCard className="w-5 h-5 text-[#f2c14e]" />
                        <span>Payment Mode & Gateway Control</span>
                      </h4>
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                        paymentMode === 'upi'
                          ? 'bg-[#0f2e1e] border-[#4cc38a]/50 text-[#4cc38a]'
                          : 'bg-[#07192f] border-[#0088d4]/50 text-[#70baff]'
                      }`}>
                        <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                        <span>Active Mode: {paymentMode === 'upi' ? 'Normal Direct UPI' : 'Razorpay Gateway'}</span>
                      </span>
                    </div>

                    <p className="text-xs text-[#a79f8b] leading-relaxed">
                      Select how delegates pay their symposium registration fee. You can switch between <strong className="text-white">Normal Direct UPI</strong> (QR code direct to bank) and <strong className="text-white">Razorpay Gateway</strong> at any time. Only the mode selected here is active for participants.
                    </p>

                    {/* Interactive Mode Switcher Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Mode 1: Normal Direct UPI */}
                      <div
                        onClick={() => setPaymentMode('upi')}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          paymentMode === 'upi'
                            ? 'bg-gradient-to-br from-[#0f2e1e] to-[#081810] border-[#4cc38a] shadow-lg shadow-[#4cc38a]/15 ring-1 ring-[#4cc38a]'
                            : 'bg-[#131318] border-[#2e2b22] hover:border-[#4cc38a]/40 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                paymentMode === 'upi' ? 'bg-[#4cc38a] text-black' : 'bg-[#1e1e24] text-[#4cc38a]'
                              }`}>
                                <QrCode className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">Normal Direct UPI</span>
                                <span className="text-[10px] text-[#4cc38a] font-medium">Zero Commission Fees</span>
                              </div>
                            </div>
                            {paymentMode === 'upi' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#4cc38a] text-black">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#a79f8b] border border-[#2e2b22] px-2 py-0.5 rounded-full">
                                Click to select
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#a79f8b] leading-relaxed mt-2">
                            Shows direct UPI QR code (`upi://pay?pa=...`) for instant scanning. Delegate must enter their <strong className="text-white">12-digit UPI UTR</strong> AND <strong className="text-white">upload their payment screenshot</strong> before their pass is issued.
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#2e2b22]/60 text-[10px] font-mono text-[#a3e8c0] flex items-center justify-between">
                          <span>Target UPI ID:</span>
                          <span className="font-bold">{rzpUpiVpa}</span>
                        </div>
                      </div>

                      {/* Mode 2: Razorpay Gateway */}
                      <div
                        onClick={() => setPaymentMode('razorpay')}
                        className={`p-4 rounded-xl border transition-all cursor-pointer relative flex flex-col justify-between ${
                          paymentMode === 'razorpay'
                            ? 'bg-gradient-to-br from-[#07192f] to-[#040e1b] border-[#0088d4] shadow-lg shadow-[#0088d4]/15 ring-1 ring-[#0088d4]'
                            : 'bg-[#131318] border-[#2e2b22] hover:border-[#0088d4]/40 opacity-75 hover:opacity-100'
                        }`}
                      >
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                                paymentMode === 'razorpay' ? 'bg-[#0088d4] text-white' : 'bg-[#1e1e24] text-[#70baff]'
                              }`}>
                                <CreditCard className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="text-xs font-bold text-white block">Razorpay Gateway</span>
                                <span className="text-[10px] text-[#70baff] font-medium">Cards, NetBanking & UPI</span>
                              </div>
                            </div>
                            {paymentMode === 'razorpay' ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#0088d4] text-white">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#a79f8b] border border-[#2e2b22] px-2 py-0.5 rounded-full">
                                Click to select
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#a79f8b] leading-relaxed mt-2">
                            Opens embedded Razorpay checkout popup. <strong className="text-white">No screenshot or manual UTR needed</strong> — ticket pass is automatically generated, emailed to their inbox, and stored in their Participant Space!
                          </p>
                        </div>
                        <div className="mt-3 pt-2 border-t border-[#2e2b22]/60 text-[10px] font-mono text-[#70baff] flex items-center justify-between">
                          <span>Mode:</span>
                          <span>{rzpKeyId.startsWith('rzp_live_') ? 'Live Production' : 'Sandbox / Test'}</span>
                        </div>
                      </div>
                    </div>

                    {/* DIRECT UPI CONFIGURATION */}
                    <div className="p-4 rounded-xl bg-[#0f1118] border border-[#23354f] space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-[#4cc38a]" />
                          <span>Direct UPI Configuration (Receiving Account)</span>
                        </h5>
                        <span className="text-[10px] text-[#4cc38a] font-mono bg-[#4cc38a]/10 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                          Direct Bank Settlement
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1 flex items-center justify-between">
                            <span>Direct UPI ID / VPA *</span>
                            <span className="text-[9px] text-[#4cc38a] font-mono">Receives payment</span>
                          </label>
                          <input
                            type="text"
                            value={rzpUpiVpa}
                            onChange={(e) => setRzpUpiVpa(e.target.value.trim())}
                            placeholder="e.g. 9441759500@ptyes"
                            className="w-full px-3.5 py-2 text-xs font-mono font-bold rounded-xl bg-[#131318] border border-[#4cc38a]/40 text-[#4cc38a] focus:outline-none focus:border-[#4cc38a]"
                          />
                          <span className="text-[10px] text-[#8ea8c9] mt-1 block">
                            Active UPI ID: <strong className="text-white font-mono">{rzpUpiVpa}</strong> (Change here anytime)
                          </span>
                        </div>

                        <div>
                          <label className="text-[11px] text-[#a79f8b] block mb-1">
                            <span>Payee / Beneficiary Name *</span>
                          </label>
                          <input
                            type="text"
                            value={upiPayeeName}
                            onChange={(e) => setUpiPayeeName(e.target.value)}
                            placeholder="NexusVerse 2K26"
                            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#00629b]"
                          />
                          <span className="text-[10px] text-[#a79f8b] mt-1 block">
                            Shown on participant UPI payment screens
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* RAZORPAY API CREDENTIALS CONFIGURATION */}
                    <div className="p-4 rounded-xl bg-[#0f1118] border border-[#23354f] space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <CreditCard className="w-4 h-4 text-[#0088d4]" />
                          <span>Razorpay API Keys & Gateway Credentials</span>
                        </h5>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                          rzpKeyId.startsWith('rzp_live_')
                            ? 'bg-[#00629b]/20 border-[#00629b] text-[#70baff]'
                            : 'bg-[#2a1b0e] border-[#f2c14e]/40 text-[#f2c14e]'
                        }`}>
                          {rzpKeyId.startsWith('rzp_live_') ? 'Live Production' : 'Sandbox / Test Mode'}
                        </span>
                      </div>

                      <div className="space-y-3">
                        <div>
                          <label className="text-xs text-[#a79f8b] block mb-1 flex items-center justify-between">
                            <span>Razorpay Key ID</span>
                            <span className="text-[10px] text-[#70baff] font-mono">Public key: rzp_test_... or rzp_live_...</span>
                          </label>
                          <input
                            type="text"
                            value={rzpKeyId}
                            onChange={(e) => setRzpKeyId(e.target.value)}
                            placeholder="rzp_test_1234567890ABCD"
                            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#00629b]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#a79f8b] block mb-1 flex items-center justify-between">
                            <span>Razorpay Key Secret</span>
                            <span className="text-[10px] text-[#a79f8b] font-mono">Used for backend HMAC signature verification</span>
                          </label>
                          <input
                            type="password"
                            value={rzpKeySecret}
                            onChange={(e) => setRzpKeySecret(e.target.value)}
                            placeholder="Enter your Razorpay Key Secret..."
                            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#00629b]"
                          />
                        </div>

                        <div>
                          <label className="text-xs text-[#a79f8b] block mb-1 flex items-center justify-between">
                            <span>Razorpay.me UPI Link</span>
                            <span className="text-[10px] text-[#4cc38a] font-mono">Direct UPI payment handle</span>
                          </label>
                          <input
                            type="text"
                            value={rzpMeLink}
                            onChange={(e) => setRzpMeLink(e.target.value)}
                            placeholder="https://razorpay.me/@veluriprasanth"
                            className="w-full px-3.5 py-2 text-xs font-mono rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#00629b]"
                          />
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-[#a79f8b] pt-1">
                          <a 
                            href="https://dashboard.razorpay.com/app/keys" 
                            target="_blank" 
                            rel="noreferrer"
                            className="text-[#70baff] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Get keys from Razorpay Dashboard</span>
                          </a>
                          <a
                            href={rzpMeLink}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[#4cc38a] hover:underline flex items-center gap-1 cursor-pointer"
                          >
                            <ExternalLink className="w-3 h-3" />
                            <span>Test Razorpay.me Page</span>
                          </a>
                        </div>
                      </div>
                    </div>

                    {/* Status banners */}
                    {rzpTestStatus.message && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        rzpTestStatus.success
                          ? 'bg-[#0f2e1e] border-[#4cc38a]/40 text-[#a3e8c0]'
                          : 'bg-[#2a1315] border-[#ff8a80]/30 text-[#ffb4ab]'
                      }`}>
                        {rzpTestStatus.success ? (
                          <Check className="w-4 h-4 text-[#4cc38a] shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 text-[#ff8a80] shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="font-semibold block">{rzpTestStatus.success ? 'Verified Connection:' : 'Test Failed:'}</span>
                          <span>{rzpTestStatus.message}</span>
                        </div>
                      </div>
                    )}

                    {rzpSaveStatus && (
                      <div className="p-3.5 rounded-xl bg-[#0f2e1e] border border-[#4cc38a]/50 text-xs text-[#a3e8c0] flex items-center gap-2 shadow-lg">
                        <Check className="w-4 h-4 text-[#4cc38a] shrink-0" />
                        <span className="font-semibold">{rzpSaveStatus}</span>
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      <button
                        type="button"
                        disabled={rzpTestStatus.testing}
                        onClick={handleTestRazorpayConnection}
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-[#181820] border border-[#2e2b22] text-[#70baff] hover:bg-[#00629b]/20 hover:border-[#00629b] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                      >
                        {rzpTestStatus.testing ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Testing API...</span>
                          </>
                        ) : (
                          <>
                            <Key className="w-3.5 h-3.5" />
                            <span>Test Razorpay Connection</span>
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveRazorpayKeys}
                        className="py-2.5 px-3 text-xs font-bold rounded-xl bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-black hover:brightness-110 transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-[#d4a935]/20 cursor-pointer"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>Save Payment Settings & Switch Mode</span>
                      </button>
                    </div>

                    {/* Webhook Endpoint Guide */}
                    <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs space-y-2 mt-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 text-[11px]">
                        <span className="text-[#a79f8b] font-medium">Razorpay Webhook Endpoint:</span>
                        <span className="text-[10px] text-[#4cc38a] font-mono bg-[#4cc38a]/10 px-2 py-0.5 rounded border border-[#4cc38a]/30">
                          POST /api/razorpay/webhook
                        </span>
                      </div>
                      <p className="text-[11px] text-[#a79f8b] leading-relaxed">
                        Add this endpoint in your <strong className="text-white">Razorpay Dashboard → Settings → Webhooks</strong> to enable server-to-server sync for <code className="text-[#f2c14e]">payment.captured</code> and <code className="text-[#f2c14e]">order.paid</code> events.
                      </p>
                    </div>

                    {/* Razorpay UPI Configuration Note */}
                    <div className="p-3.5 rounded-xl bg-[#0a1926] border border-[#00629b]/40 text-xs space-y-1.5 mt-2">
                      <div className="flex items-center gap-1.5 text-[#70baff] font-bold text-[11px]">
                        <Smartphone className="w-3.5 h-3.5 text-[#4cc38a]" />
                        <span>Razorpay UPI Activation & Checkout Guide</span>
                      </div>
                      <p className="text-[11px] text-[#9fc7e8] leading-relaxed">
                        Razorpay UPI (Google Pay, PhonePe, Paytm, BHIM, QR) is configured as the default first payment method for NexusVerse 2K26 checkout. In your <strong className="text-white">Razorpay Dashboard → Settings → Payment Methods</strong>, confirm that <strong>UPI</strong> is enabled. In sandbox test mode, you can test UPI by entering any mock VPA (e.g. <code className="text-[#f2c14e]">success@razorpay</code>) or scanning the test QR.
                      </p>
                    </div>
                  </div>

                  {/* Automatic Email Receipts & Pass Notifications */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Mail className="w-5 h-5 text-[#f2c14e]" />
                        <span>Automatic Email Receipts & Ticket Passes</span>
                      </h4>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full border bg-[#f2c14e]/10 text-[#f2c14e] border-[#f2c14e]/30">
                        Nodemailer + SMTP
                      </span>
                    </div>

                    <p className="text-xs text-[#a79f8b] leading-relaxed">
                      Sends an official electronic symposium ticket pass with QR lookup code directly to the delegate&apos;s inbox upon successful Razorpay payment. Configure <code className="text-white">SMTP_USER</code> and <code className="text-white">SMTP_PASS</code> in <code className="text-[#f2c14e]">.env</code> to activate live delivery.
                    </p>

                    {/* Test Email Input */}
                    <div className="p-3.5 rounded-xl bg-[#131318] border border-[#2e2b22] space-y-3">
                      <label className="text-xs text-[#f3ecd9] font-semibold block">Send Test Ticket Pass Email</label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <input
                          type="email"
                          value={testEmailRecipient}
                          onChange={(e) => setTestEmailRecipient(e.target.value)}
                          placeholder="Enter your email to test (e.g. attendee@gmail.com)"
                          className="flex-1 px-3 py-2 text-xs rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#f2c14e]"
                        />
                        <button
                          type="button"
                          disabled={testEmailStatus.testing}
                          onClick={handleSendTestEmail}
                          className="px-4 py-2 text-xs font-bold rounded-xl bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50 shrink-0"
                        >
                          {testEmailStatus.testing ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Sending...</span>
                            </>
                          ) : (
                            <>
                              <Mail className="w-3.5 h-3.5" />
                              <span>Send Test Pass</span>
                            </>
                          )}
                        </button>
                      </div>

                      {testEmailStatus.message && (
                        <div className={`p-2.5 rounded-lg border text-xs flex items-start gap-2 ${
                          testEmailStatus.success
                            ? 'bg-[#153424]/60 border-[#3ecf8e]/50 text-[#3ecf8e]'
                            : 'bg-[#331c19]/60 border-[#ff8a80]/50 text-[#ffb4ab]'
                        }`}>
                          {testEmailStatus.success ? <Check className="w-4 h-4 shrink-0 mt-0.5" /> : <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />}
                          <span>{testEmailStatus.message}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Password Change */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Lock className="w-5 h-5 text-[#f2c14e]" />
                      <span>Change Administrative Key</span>
                    </h4>

                    <form onSubmit={handleChangePassword} className="space-y-3">
                      <div>
                        <label className="text-xs text-[#a79f8b] block mb-1">New Administrator Password</label>
                        <input
                          type="password"
                          value={newAdminPassword}
                          onChange={(e) => setNewAdminPassword(e.target.value)}
                          placeholder="Enter at least 4 characters"
                          className="w-full px-3.5 py-2 text-xs rounded-xl bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                        />
                      </div>

                      {pwdChangeSuccess && (
                        <p className="text-xs text-[#4cc38a]">Admin password successfully updated!</p>
                      )}

                      <button
                        type="submit"
                        className="w-full py-2.5 px-4 text-xs font-bold rounded-xl bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] transition-colors cursor-pointer"
                      >
                        Save New Password
                      </button>
                    </form>
                  </div>

                  {/* Supabase Cloud Database (PostgreSQL) Panel */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h4 className="text-base font-bold text-white flex items-center gap-2">
                        <Database className="w-5 h-5 text-[#3ecf8e]" />
                        <span>Cloud Database: Supabase (PostgreSQL)</span>
                      </h4>
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        isSupabaseConfigured()
                          ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30'
                          : 'bg-[#f2c14e]/10 text-[#f2c14e] border-[#f2c14e]/30'
                      }`}>
                        {isSupabaseConfigured() ? '● Linked in .env' : '○ Standby (Local Mode)'}
                      </span>
                    </div>

                    <p className="text-xs text-[#a79f8b] leading-relaxed">
                      Connect your festival portal directly to Supabase cloud PostgreSQL. Automatically protects against data loss during concurrent student registrations and preserves all ticket passes in the cloud.
                    </p>

                    {/* Status details */}
                    <div className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] text-xs space-y-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#a79f8b]">Connection Mode:</span>
                        <span className="font-mono text-white">
                          {isSupabaseConfigured() ? 'Supabase Cloud (PostgreSQL)' : 'Express Local JSON + localStorage'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-[#a79f8b]">Schema Migration:</span>
                        <span className="font-mono text-[#3ecf8e]">supabase-schema.sql (Included in project)</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleTestSupabase}
                        disabled={supabaseTestStatus.testing}
                        className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] hover:border-[#3ecf8e]/50 text-left transition-all cursor-pointer space-y-1 disabled:opacity-50"
                      >
                        <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                          <RefreshCw className={`w-3.5 h-3.5 text-[#3ecf8e] ${supabaseTestStatus.testing ? 'animate-spin' : ''}`} />
                          <span>{supabaseTestStatus.testing ? 'Testing Connection...' : 'Test Supabase Connection'}</span>
                        </span>
                        <span className="text-[11px] text-[#a79f8b] block">
                          Ping Supabase API & verify PostgreSQL schema.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={handleSyncToSupabase}
                        disabled={supabaseSyncStatus.syncing || savedRecords.length === 0}
                        className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] hover:border-[#f2c14e]/50 text-left transition-all cursor-pointer space-y-1 disabled:opacity-50"
                      >
                        <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                          <Upload className={`w-3.5 h-3.5 text-[#f2c14e] ${supabaseSyncStatus.syncing ? 'animate-bounce' : ''}`} />
                          <span>{supabaseSyncStatus.syncing ? 'Syncing...' : 'Sync Local Records to Cloud'}</span>
                        </span>
                        <span className="text-[11px] text-[#a79f8b] block">
                          Push {savedRecords.length} offline/local registrations to Supabase.
                        </span>
                      </button>
                    </div>

                    {/* Test result message */}
                    {supabaseTestStatus.tested && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        supabaseTestStatus.success
                          ? 'bg-[#153424]/60 border-[#3ecf8e]/50 text-[#3ecf8e]'
                          : 'bg-[#331c19]/60 border-[#ff8a80]/50 text-[#ffb4ab]'
                      }`}>
                        {supabaseTestStatus.success ? (
                          <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <p className="font-semibold">{supabaseTestStatus.message}</p>
                          {supabaseTestStatus.error && (
                            <p className="text-[11px] mt-1 opacity-80 font-mono">{supabaseTestStatus.error}</p>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Sync result message */}
                    {supabaseSyncStatus.result && (
                      <div className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                        supabaseSyncStatus.success
                          ? 'bg-[#153424]/60 border-[#3ecf8e]/50 text-[#3ecf8e]'
                          : 'bg-[#331c19]/60 border-[#ff8a80]/50 text-[#ffb4ab]'
                      }`}>
                        {supabaseSyncStatus.success ? (
                          <Check className="w-4 h-4 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        <p>{supabaseSyncStatus.result}</p>
                      </div>
                    )}
                  </div>

                  {/* Database Backup & Restore */}
                  <div className="p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4">
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Database className="w-5 h-5 text-[#4cc38a]" />
                      <span>Database Backup & Restore</span>
                    </h4>
                    <p className="text-xs text-[#a79f8b]">
                      Safeguard all delegate registrations by downloading an offline JSON snapshot or importing an existing backup.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadJsonBackup}
                        className="p-3 rounded-xl bg-[#131318] border border-[#2e2b22] hover:border-[#4cc38a]/50 text-left transition-all cursor-pointer space-y-1"
                      >
                        <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                          <Download className="w-3.5 h-3.5 text-[#4cc38a]" />
                          <span>Export JSON Dump</span>
                        </span>
                        <span className="text-[11px] text-[#a79f8b] block">
                          Download all {savedRecords.length} records to local disk.
                        </span>
                      </button>

                      <div>
                        <input
                          ref={jsonImportRef}
                          type="file"
                          accept=".json,application/json"
                          onChange={handleImportJsonBackup}
                          className="hidden"
                        />
                        <button
                          type="button"
                          onClick={() => jsonImportRef.current?.click()}
                          className="w-full p-3 rounded-xl bg-[#131318] border border-[#2e2b22] hover:border-[#d4a935]/50 text-left transition-all cursor-pointer space-y-1"
                        >
                          <span className="font-bold text-xs text-white block flex items-center gap-1.5">
                            <Upload className="w-3.5 h-3.5 text-[#f2c14e]" />
                            <span>Restore from Backup</span>
                          </span>
                          <span className="text-[11px] text-[#a79f8b] block">
                            Import saved JSON registration file.
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Danger Zone: Clear Data */}
                  <div className="p-5 rounded-2xl bg-[#2a1315]/40 border border-[#ff8a80]/30 space-y-3">
                    <h4 className="text-sm font-bold text-[#ff8a80] flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>Danger Zone: Clear Database</span>
                    </h4>
                    <p className="text-xs text-[#ffb4ab]">
                      Permanently wipes all saved delegate registrations from the browser. Ensure you have downloaded a CSV or JSON backup before proceeding.
                    </p>
                    <button
                      type="button"
                      onClick={handleClearAllRegistrations}
                      className="px-4 py-2 text-xs font-bold rounded-xl bg-[#2a1315] border border-[#ff8a80] text-[#ff8a80] hover:bg-[#ff8a80] hover:text-[#1a0505] transition-colors cursor-pointer"
                    >
                      Clear All Stored Registrations
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: EDIT REGISTRATION & FULL TEAM MEMBERS */}
        {editingRecord && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-sm"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-[#181820] border border-[#d4a935]/40 rounded-2xl w-full max-w-3xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between border-b border-[#2e2b22] pb-3">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#f2c14e]" />
                  <h4 className="font-bold text-base text-white">
                    Edit Registration: {editingRecord.regId}
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="p-1 text-[#a79f8b] hover:text-white rounded"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* PARTICIPANT (LEAD) EDIT FIELDS */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-[#f2c14e] uppercase tracking-wider block">
                  Lead Participant Details
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editingRecord.name}
                      onChange={(e) => setEditingRecord({ ...editingRecord, name: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Roll Number</label>
                    <input
                      type="text"
                      value={editingRecord.roll}
                      onChange={(e) => setEditingRecord({ ...editingRecord, roll: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={editingRecord.phone}
                      onChange={(e) => setEditingRecord({ ...editingRecord, phone: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Email Address</label>
                    <input
                      type="email"
                      value={editingRecord.email}
                      onChange={(e) => setEditingRecord({ ...editingRecord, email: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Class / Degree</label>
                    <input
                      type="text"
                      value={editingRecord.className || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, className: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Section</label>
                    <input
                      type="text"
                      value={editingRecord.section || ''}
                      onChange={(e) => setEditingRecord({ ...editingRecord, section: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Branch / Dept</label>
                    <input
                      type="text"
                      value={editingRecord.dept}
                      onChange={(e) => setEditingRecord({ ...editingRecord, dept: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Year</label>
                    <input
                      type="text"
                      value={editingRecord.year}
                      onChange={(e) => setEditingRecord({ ...editingRecord, year: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-[#a79f8b] block mb-1">Fee Paid (₹)</label>
                    <input
                      type="number"
                      value={editingRecord.totalPaid}
                      onChange={(e) => setEditingRecord({ ...editingRecord, totalPaid: Number(e.target.value) })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f2c14e] font-mono font-bold"
                    />
                  </div>

                  <div className="sm:col-span-2 md:col-span-3">
                    <label className="text-[11px] text-[#a79f8b] block mb-1">College / Institution</label>
                    <input
                      type="text"
                      value={editingRecord.college}
                      onChange={(e) => setEditingRecord({ ...editingRecord, college: e.target.value })}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                    />
                  </div>
                </div>

                {/* Lead IEEE Status */}
                <div className="p-3 rounded-xl bg-[#111116] border border-[#2e2b22] space-y-2">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-white">
                      <input
                        type="checkbox"
                        checked={editingRecord.isIeeeMember}
                        onChange={(e) => setEditingRecord({ ...editingRecord, isIeeeMember: e.target.checked })}
                        className="accent-[#d4a935]"
                      />
                      <span>Participant is IEEE Member</span>
                    </label>

                    {editingRecord.isIeeeMember && (
                      <input
                        type="text"
                        value={editingRecord.ieeeId || ''}
                        onChange={(e) => setEditingRecord({ ...editingRecord, ieeeId: e.target.value })}
                        placeholder="IEEE Membership ID"
                        className="px-2.5 py-1 text-xs rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] font-mono flex-1"
                      />
                    )}
                  </div>
                </div>
              </div>

              {/* TEAM & TEAMMATES EDIT SECTION */}
              {(() => {
                const primaryEventId = editingRecord.eventIds[0] || '';
                const team = editingRecord.teamDetails?.[primaryEventId];
                const teamMembers = team?.teamMembers || [];

                return (
                  <div className="space-y-3 pt-3 border-t border-[#2e2b22]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#f2c14e] uppercase tracking-wider block">
                        Team Members of Registration ({teamMembers.length + 1} with Lead)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const updatedTeamMembers = [
                            ...teamMembers,
                            {
                              name: '',
                              roll: '',
                              className: 'B.Tech',
                              section: 'A',
                              branch: editingRecord.dept || 'CSE',
                              year: editingRecord.year || '3rd Year',
                              phone: '',
                              isIeeeMember: false,
                              ieeeId: ''
                            }
                          ];
                          setEditingRecord({
                            ...editingRecord,
                            teamDetails: {
                              ...editingRecord.teamDetails,
                              [primaryEventId]: {
                                ...team,
                                teamName: team?.teamName || `${editingRecord.name}'s Team`,
                                members: [editingRecord.name, ...updatedTeamMembers.map(m => m.name)],
                                teamMembers: updatedTeamMembers
                              }
                            }
                          });
                        }}
                        className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 hover:bg-[#d4a935] hover:text-[#1a1300] transition-colors"
                      >
                        + Add Teammate
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      <div>
                        <label className="text-[11px] text-[#a79f8b] block mb-1">Team Name</label>
                        <input
                          type="text"
                          value={team?.teamName || ''}
                          onChange={(e) => {
                            setEditingRecord({
                              ...editingRecord,
                              teamDetails: {
                                ...editingRecord.teamDetails,
                                [primaryEventId]: {
                                  ...team,
                                  teamName: e.target.value
                                }
                              }
                            });
                          }}
                          placeholder="Team Name"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] text-[#a79f8b] block mb-1">Project Title</label>
                        <input
                          type="text"
                          value={team?.projectTitle || ''}
                          onChange={(e) => {
                            setEditingRecord({
                              ...editingRecord,
                              teamDetails: {
                                ...editingRecord.teamDetails,
                                [primaryEventId]: {
                                  ...team,
                                  projectTitle: e.target.value
                                }
                              }
                            });
                          }}
                          placeholder="Project Title"
                          className="w-full px-3 py-1.5 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9]"
                        />
                      </div>
                    </div>

                    {/* Each Teammate Card */}
                    <div className="space-y-2.5">
                      {teamMembers.map((m, mIdx) => (
                        <div key={mIdx} className="p-3 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-2 text-xs">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white flex items-center gap-1.5">
                              <span>Teammate #{mIdx + 2}</span>
                              <span className="text-[#a79f8b] font-normal font-mono">({m.roll || 'No Roll'})</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => {
                                const nextMembers = teamMembers.filter((_, i) => i !== mIdx);
                                setEditingRecord({
                                  ...editingRecord,
                                  teamDetails: {
                                    ...editingRecord.teamDetails,
                                    [primaryEventId]: {
                                      ...team,
                                      teamMembers: nextMembers,
                                      members: [editingRecord.name, ...nextMembers.map(x => x.name)]
                                    }
                                  }
                                });
                              }}
                              className="text-[11px] text-[#ff8a80] hover:underline"
                            >
                              Remove Teammate
                            </button>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <input
                              type="text"
                              value={m.name}
                              onChange={(e) => {
                                const copy = [...teamMembers];
                                copy[mIdx].name = e.target.value;
                                setEditingRecord({
                                  ...editingRecord,
                                  teamDetails: {
                                    ...editingRecord.teamDetails,
                                    [primaryEventId]: { ...team, teamMembers: copy }
                                  }
                                });
                              }}
                              placeholder="Name"
                              className="px-2.5 py-1 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9]"
                            />

                            <input
                              type="text"
                              value={m.roll}
                              onChange={(e) => {
                                const copy = [...teamMembers];
                                copy[mIdx].roll = e.target.value;
                                setEditingRecord({
                                  ...editingRecord,
                                  teamDetails: {
                                    ...editingRecord.teamDetails,
                                    [primaryEventId]: { ...team, teamMembers: copy }
                                  }
                                });
                              }}
                              placeholder="Roll Number"
                              className="px-2.5 py-1 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                            />

                            <input
                              type="tel"
                              value={m.phone}
                              onChange={(e) => {
                                const copy = [...teamMembers];
                                copy[mIdx].phone = e.target.value;
                                setEditingRecord({
                                  ...editingRecord,
                                  teamDetails: {
                                    ...editingRecord.teamDetails,
                                    [primaryEventId]: { ...team, teamMembers: copy }
                                  }
                                });
                              }}
                              placeholder="Phone"
                              className="px-2.5 py-1 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] font-mono"
                            />
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <label className="flex items-center gap-1.5 text-[#a79f8b] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={m.isIeeeMember}
                                onChange={(e) => {
                                  const copy = [...teamMembers];
                                  copy[mIdx].isIeeeMember = e.target.checked;
                                  setEditingRecord({
                                    ...editingRecord,
                                    teamDetails: {
                                      ...editingRecord.teamDetails,
                                      [primaryEventId]: { ...team, teamMembers: copy }
                                    }
                                  });
                                }}
                                className="accent-[#d4a935]"
                              />
                              <span>IEEE Member</span>
                            </label>

                            {m.isIeeeMember && (
                              <input
                                type="text"
                                value={m.ieeeId || ''}
                                onChange={(e) => {
                                  const copy = [...teamMembers];
                                  copy[mIdx].ieeeId = e.target.value;
                                  setEditingRecord({
                                    ...editingRecord,
                                    teamDetails: {
                                      ...editingRecord.teamDetails,
                                      [primaryEventId]: { ...team, teamMembers: copy }
                                    }
                                  });
                                }}
                                placeholder="Member IEEE ID"
                                className="px-2 py-1 rounded bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs font-mono flex-1"
                              />
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-[#2e2b22]">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#a79f8b] hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onUpdateRecord(editingRecord);
                    setEditingRecord(null);
                  }}
                  className="px-4 py-2 text-xs font-bold rounded-lg bg-[#f2c14e] text-[#1a1300] hover:bg-[#d4a935] flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save All Changes</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
        {previewLightbox && (
          <div
            className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md"
            onClick={() => setPreviewLightbox(null)}
          >
            <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
              <button
                type="button"
                onClick={() => setPreviewLightbox(null)}
                className="absolute -top-10 right-0 p-1.5 text-white bg-black/50 hover:bg-black/80 rounded-full cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={previewLightbox}
                alt="Enlarged Symposium Photo"
                className="max-h-[85vh] max-w-full rounded-xl shadow-2xl object-contain border border-[#2e2b22]"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </div>
        )}

        {/* FULLSCREEN UPI PAYMENT RECEIPT LIGHTBOX */}
        {viewingReceipt && (
          <div 
            className="fixed inset-0 z-70 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={() => setViewingReceipt(null)}
          >
            <div 
              className="bg-[#0f1118] border border-[#273248] rounded-2xl max-w-2xl w-full max-h-[92vh] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4 border-b border-[#1b3d27] flex items-center justify-between bg-gradient-to-r from-[#081810] via-[#0d2618] to-[#121e16]">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-[#1b5e39] text-white flex items-center justify-center border border-[#4cc38a]/40 shadow">
                    <ImageIcon className="w-4 h-4 text-[#a3e8c0]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">
                      UPI Payment Receipt · {viewingReceipt.name}
                    </h4>
                    <span className="text-[10px] font-mono text-[#a3e8c0]">
                      Roll: {viewingReceipt.roll || 'N/A'} · UTR: {viewingReceipt.paymentId}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setViewingReceipt(null)}
                  className="p-1.5 rounded-lg text-[#a79f8b] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                  aria-label="Close Receipt Viewer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 overflow-auto flex-1 flex items-center justify-center bg-black/70 min-h-[300px]">
                <img 
                  src={viewingReceipt.screenshot} 
                  alt="UPI Payment Receipt" 
                  className="max-h-[68vh] max-w-full object-contain rounded-xl border border-[#23354f] shadow-2xl"
                />
              </div>

              <div className="p-3 border-t border-[#1f283b] flex items-center justify-between bg-[#070b10] text-xs">
                <span className="text-[11px] text-[#7ea0c4] flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#4cc38a]" />
                  <span>Participant Uploaded Proof</span>
                </span>
                <div className="flex items-center gap-2">
                  <a
                    href={viewingReceipt.screenshot}
                    download={`receipt_${viewingReceipt.roll || 'upi'}.jpg`}
                    className="px-3 py-1.5 rounded-lg bg-[#1b5e39] hover:bg-[#27ae60] text-white font-bold text-xs flex items-center gap-1 cursor-pointer transition-colors shadow"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download Receipt</span>
                  </a>
                  <button
                    type="button"
                    onClick={() => setViewingReceipt(null)}
                    className="px-3 py-1.5 rounded-lg bg-[#1b2332] text-white font-semibold text-xs cursor-pointer hover:bg-[#233044] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* In-Admin Ticket Pass Lightbox Viewer */}
        {viewingAdminTicket && (
          <div 
            className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto animate-in fade-in"
            onClick={() => setViewingAdminTicket(null)}
          >
            <div 
              className="bg-[#111116] border-2 border-[#d4a935]/60 rounded-3xl max-w-4xl w-full max-h-[94vh] overflow-y-auto p-4 sm:p-6 relative shadow-2xl space-y-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#2e2b22] no-print">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/50 flex items-center justify-center text-[#f2c14e] shadow shrink-0">
                    <Ticket className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-serif-title text-base sm:text-lg font-bold text-white">
                        Digital Ticket Pass · Admin Preview
                      </h3>
                      {viewingAdminTicket.paymentMode === 'upi' ? (
                        viewingAdminTicket.isVerified ? (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1b5e39] text-[#a5d6a7] font-semibold border border-[#4cc38a]/40">
                            UPI Verified ✓
                          </span>
                        ) : (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#2a1d06] text-[#f2c14e] font-semibold border border-[#f2c14e]/40">
                            UPI Pending Verification
                          </span>
                        )
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#0c1f33] text-[#70baff] font-semibold border border-[#0088d4]/40">
                          Auto Verified (Razorpay)
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-[#a79f8b] block mt-0.5">
                      Pass ID: <code className="text-[#f2c14e] font-mono">{viewingAdminTicket.regId}</code> · {viewingAdminTicket.name} ({viewingAdminTicket.roll})
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {viewingAdminTicket.paymentMode === 'upi' && (
                    <button
                      type="button"
                      onClick={() => {
                        handleToggleVerify(viewingAdminTicket);
                        setViewingAdminTicket(prev => prev ? { ...prev, isVerified: !prev.isVerified } : null);
                      }}
                      className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow transition-all ${
                        viewingAdminTicket.isVerified
                          ? 'bg-[#0d2a1c] border border-[#4cc38a]/60 text-[#4cc38a] hover:bg-[#153e2a]'
                          : 'bg-gradient-to-r from-[#241a06] via-[#382608] to-[#241a06] border border-[#f2c14e] text-[#f2c14e] hover:bg-[#f2c14e] hover:text-[#1a1300]'
                      }`}
                    >
                      {viewingAdminTicket.isVerified ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#4cc38a]" />
                          <span>Verified ✓ (Click to Unverify)</span>
                        </>
                      ) : (
                        <>
                          <Clock className="w-3.5 h-3.5 text-[#f2c14e]" />
                          <span>Verify Payment Now</span>
                        </>
                      )}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setViewingAdminTicket(null)}
                    className="p-2 rounded-xl text-[#a79f8b] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    aria-label="Close ticket preview"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Render Full Ticket Pass */}
              <TicketPass
                record={viewingAdminTicket}
                events={ALL_EVENTS}
                onReset={() => setViewingAdminTicket(null)}
                leftLogo={leftLogo}
                rightLogo={rightLogo}
              />
            </div>
          </div>
        )}

        {/* Email Sent Floating Toast */}
        {emailSendToast && (
          <div className="fixed bottom-6 right-6 z-50 p-4 rounded-xl bg-[#0f2e1e] border-2 border-[#4cc38a] text-[#4cc38a] text-xs font-bold shadow-2xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
            <CheckCircle2 className="w-4 h-4 text-[#4cc38a] shrink-0" />
            <span>{emailSendToast}</span>
          </div>
        )}
      </div>
    </div>
  );
};
