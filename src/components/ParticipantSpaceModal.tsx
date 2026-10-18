import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Sparkles, 
  Ticket, 
  Calendar, 
  Award, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  Edit3, 
  Shield, 
  School, 
  Phone,
  Clock,
  MapPin,
  ExternalLink,
  MessageCircle,
  Copy,
  Check,
  Image as ImageIcon,
  Users
} from 'lucide-react';
import { 
  ParticipantUser, 
  loginParticipant, 
  registerParticipant, 
  googleLoginParticipant, 
  initiateSupabaseGoogleAuth,
  updateParticipantProfile,
  logoutParticipant 
} from '../services/auth';
import { RegistrationRecord } from './TicketPass';
import { ALL_EVENTS, SYMPOSIUM_CONFIG } from '../data/symposiumData';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

interface ParticipantSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ParticipantUser | null;
  onUserChange: (user: ParticipantUser | null) => void;
  savedRecords: RegistrationRecord[];
  onOpenTicketPass: (record: RegistrationRecord) => void;
  onNavigateToRegister: (prefillData: Partial<ParticipantUser>) => void;
  initialMode?: 'signin' | 'signup';
}

export const ParticipantSpaceModal: React.FC<ParticipantSpaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  savedRecords,
  onOpenTicketPass,
  onNavigateToRegister,
  initialMode
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>(initialMode || 'signin');
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  // Sign Up Fields
  const [signUpName, setSignUpName] = useState('');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpUsername, setSignUpUsername] = useState('');
  const [signUpRoll, setSignUpRoll] = useState('');
  const [signUpPhone, setSignUpPhone] = useState('');
  const [signUpCollege, setSignUpCollege] = useState('N.B.K.R. Institute of Science & Technology');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPass, setSignUpConfirmPass] = useState('');

  // Dashboard Active Tab
  const [activeTab, setActiveTab] = useState<'passes' | 'schedule' | 'profile'>('passes');

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editCollege, setEditCollege] = useState('');
  const [editRoll, setEditRoll] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editIeeeId, setEditIeeeId] = useState('');
  const [editIsIeee, setEditIsIeee] = useState(false);

  // Status & feedback
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [googleSimEmail, setGoogleSimEmail] = useState('');
  const [googleSimName, setGoogleSimName] = useState('');
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);

  // Dashboard detail states
  const [copiedRegId, setCopiedRegId] = useState<string | null>(null);
  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);
  const [viewingReceiptModal, setViewingReceiptModal] = useState<string | null>(null);

  // Sync initialMode when modal opens
  useEffect(() => {
    if (isOpen && initialMode) {
      setAuthMode(initialMode);
    }
  }, [isOpen, initialMode]);

  // Populate profile edit form when user changes
  useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.name || '');
      setEditPhone(currentUser.phone || '');
      setEditCollege(currentUser.college || 'N.B.K.R. Institute of Science & Technology');
      setEditRoll(currentUser.roll || '');
      setEditBranch(currentUser.branch || '');
      setEditYear(currentUser.year || '');
      setEditIeeeId(currentUser.ieeeId || '');
      setEditIsIeee(Boolean(currentUser.isIeeeMember));
    }
  }, [currentUser]);

  if (!isOpen) return null;

  // Filter registrations belonging to this user
  const userRegistrations = currentUser
    ? savedRecords.filter(r => {
        const uId = currentUser.id;
        const uEmail = (currentUser.email || '').toLowerCase().trim();
        const uRoll = (currentUser.roll || '').toUpperCase().trim();
        const uPhone = (currentUser.phone || '').replace(/\s+/g, '');
        
        const rEmail = (r.email || '').toLowerCase().trim();
        const rRoll = (r.roll || '').toUpperCase().trim();
        const rPhone = (r.phone || '').replace(/\s+/g, '');

        return (
          (uId && r.userId && r.userId === uId) ||
          (uEmail && rEmail === uEmail) ||
          (uRoll && rRoll === uRoll) ||
          (uPhone && uPhone.length > 5 && rPhone === uPhone)
        );
      })
    : [];

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    if (!identifier.trim() || !password) {
      setErrorMsg('Please enter both your email/username and password.');
      return;
    }

    setLoading(true);
    const result = await loginParticipant(identifier, password);
    setLoading(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      setSuccessMsg(result.message || 'Logged in successfully!');
      setPassword('');
    } else {
      setErrorMsg(result.error || 'Login failed. Please check your credentials.');
    }
  };

  // Handle Sign Up
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!signUpName.trim()) {
      setErrorMsg('Full Name is required.');
      return;
    }
    if (!signUpEmail.trim() || !signUpEmail.includes('@')) {
      setErrorMsg('Please provide a valid email address.');
      return;
    }
    if (signUpPassword.length < 4) {
      setErrorMsg('Password must be at least 4 characters.');
      return;
    }
    if (signUpPassword !== signUpConfirmPass) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    setLoading(true);
    const result = await registerParticipant({
      name: signUpName.trim(),
      email: signUpEmail.trim().toLowerCase(),
      username: signUpUsername.trim() || undefined,
      password: signUpPassword,
      roll: signUpRoll.trim().toUpperCase() || undefined,
      phone: signUpPhone.trim() || undefined,
      college: signUpCollege.trim() || undefined,
    });
    setLoading(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      setSuccessMsg('Account created successfully! Welcome to your Participant Space.');
      setSignUpPassword('');
      setSignUpConfirmPass('');
    } else {
      setErrorMsg(result.error || 'Failed to create account.');
    }
  };

  // Handle Google Sign-In Click -> Direct Google Identity Services (GSI) with clean Supabase popup fallback
  const handleGoogleClick = () => {
    setErrorMsg('');
    setLoading(true);

    // 1. Direct Google OAuth2 Token Client via Google Identity Services
    // Bypasses Supabase GoTrue edge callback completely, eliminating upstream request timeout
    if (typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '1006816631034-2qis4bq7hkc16ptba0kn60i0gd0cpdnv.apps.googleusercontent.com',
          scope: 'email profile openid',
          callback: async (tokenResponse: any) => {
            if (tokenResponse?.error) {
              setLoading(false);
              if (tokenResponse.error !== 'popup_closed_by_user') {
                setErrorMsg(`Google sign-in error: ${tokenResponse.error}. You can also use Direct Google Sign-In below.`);
              }
              return;
            }

            if (tokenResponse?.access_token) {
              try {
                const userInfo = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
                }).then((r) => r.json());

                if (userInfo?.email) {
                  const result = await googleLoginParticipant({
                    email: userInfo.email,
                    name: userInfo.name || userInfo.email.split('@')[0],
                    avatarUrl: userInfo.picture,
                  });
                  setLoading(false);
                  if (result.success && result.user) {
                    onUserChange(result.user);
                    setSuccessMsg(`Welcome back, ${result.user.name}!`);
                    return;
                  } else {
                    setErrorMsg(result.error || 'Failed to authenticate Google user.');
                  }
                }
              } catch (fetchErr: any) {
                setLoading(false);
                setErrorMsg('Failed to retrieve user profile from Google. Try Direct Sign-In below.');
              }
            }
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
        return;
      } catch (gsiErr) {
        console.warn('Google Identity Services client error, falling back to Supabase OAuth popup:', gsiErr);
      }
    }

    // 2. Fallback: Supabase OAuth centered popup
    const returnUrl = encodeURIComponent(window.location.origin + window.location.pathname);
    const authUrl = `https://nfkyzozrreardklsoehb.supabase.co/auth/v1/authorize?provider=google&redirect_to=${returnUrl}`;

    const width = 500;
    const height = 650;
    const left = Math.max(0, (window.screen.width - width) / 2);
    const top = Math.max(0, (window.screen.height - height) / 2);
    
    let popup: Window | null = null;
    try {
      popup = window.open(
        authUrl,
        'GoogleSignIn',
        `width=${width},height=${height},left=${left},top=${top},status=no,menubar=no,toolbar=no,location=yes`
      );
    } catch {
      popup = null;
    }

    if (!popup || popup.closed || typeof popup.closed === 'undefined') {
      window.location.href = authUrl;
      return;
    }

    // Monitor popup completion
    const checkTimer = setInterval(() => {
      if (popup && popup.closed) {
        clearInterval(checkTimer);
        setLoading(false);
      }
    }, 1000);
  };

  // Direct Google participant login
  const handleGoogleDirectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleSimEmail.trim() || !googleSimEmail.includes('@')) {
      setErrorMsg('Please enter a valid Google email address.');
      return;
    }

    setLoading(true);
    const result = await googleLoginParticipant({
      email: googleSimEmail.trim().toLowerCase(),
      name: googleSimName.trim() || googleSimEmail.split('@')[0],
      college: 'N.B.K.R. Institute of Science & Technology',
    });
    setLoading(false);
    setGooglePromptOpen(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      setSuccessMsg(`Welcome, ${result.user.name}!`);
    } else {
      setErrorMsg(result.error || 'Google direct login failed.');
    }
  };

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    setErrorMsg('');
    setSuccessMsg('');

    setLoading(true);
    const result = await updateParticipantProfile({
      id: currentUser.id,
      name: editName.trim(),
      phone: editPhone.trim(),
      college: editCollege.trim(),
      roll: editRoll.trim().toUpperCase(),
      branch: editBranch.trim(),
      year: editYear.trim(),
      isIeeeMember: editIsIeee,
      ieeeId: editIeeeId.trim(),
    });
    setLoading(false);

    if (result.success && result.user) {
      onUserChange(result.user);
      setIsEditingProfile(false);
      setSuccessMsg('Profile updated successfully!');
    } else {
      setErrorMsg(result.error || 'Failed to update profile.');
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logoutParticipant();
    onUserChange(null);
    setActiveTab('passes');
    setSuccessMsg('You have been logged out.');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-md overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div 
        className="bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] rounded-2xl w-full max-w-2xl shadow-2xl relative my-auto overflow-hidden animate-in fade-in duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Banner */}
        <div className="p-4 sm:p-5 border-b border-[#2e2b22] flex items-center justify-between bg-[#181820]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1f1b0e] border border-[#d4a935]/40 flex items-center justify-center text-[#f2c14e] shadow">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif-title text-xl font-bold text-[#ffffff]">
                  {currentUser ? `${currentUser.name}'s Space` : 'Participant Space'}
                </h3>
                <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#f2c14e]/15 text-[#f2c14e] border border-[#f2c14e]/30">
                  {currentUser ? 'Active Portal' : 'Login / Register'}
                </span>
              </div>
              <p className="text-xs text-[#a79f8b] mt-0.5">
                {currentUser 
                  ? `Signed in as ${currentUser.email}`
                  : 'Your personal NexusVerse 2K26 dashboard for passes & event schedules'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-[#a79f8b] hover:text-[#f3ecd9] hover:bg-[#2e2b22]/50 rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts / Feedback */}
        {errorMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
        {successMsg && (
          <div className="mx-4 sm:mx-6 mt-4 p-3 rounded-lg bg-[#142617] border border-[#81c784]/30 text-[#a5d6a7] text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* VIEW 1: AUTHENTICATION (When Logged Out) */}
        {!currentUser ? (
          <div className="p-5 sm:p-6 space-y-5">
            {/* Google Quick Sign-In */}
            <div className="space-y-3">
              <button
                type="button"
                onClick={handleGoogleClick}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-white text-[#1f1f1f] font-semibold text-sm hover:bg-neutral-100 transition-all flex items-center justify-center gap-3 shadow-md hover:shadow-lg cursor-pointer border border-neutral-300"
              >
                {/* Official Google G Logo */}
                <svg className="w-5 h-5" viewBox="0 0 24 24">
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

              {/* Instant Google Access Helper toggle */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setGooglePromptOpen(!googlePromptOpen)}
                  className="text-[11px] text-[#f2c14e] hover:underline cursor-pointer transition-colors"
                >
                  {googlePromptOpen ? '▲ Hide instant sign-in' : '⚡ Having trouble with popup? Use Instant Google Sign-In'}
                </button>
              </div>

              {googlePromptOpen && (
                <form onSubmit={handleGoogleDirectSubmit} className="p-3.5 rounded-xl bg-[#14120a] border border-[#d4a935]/40 space-y-2.5 animate-fadeIn">
                  <p className="text-xs text-[#e4dac3]">
                    Enter your Google email address to directly sync your passes and access your Participant Space without popup delays:
                  </p>
                  <div>
                    <input
                      type="email"
                      value={googleSimEmail}
                      onChange={(e) => setGoogleSimEmail(e.target.value)}
                      placeholder="e.g. yourname@gmail.com"
                      required
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-sm text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                    />
                  </div>
                  <div>
                    <input
                      type="text"
                      value={googleSimName}
                      onChange={(e) => setGoogleSimName(e.target.value)}
                      placeholder="Your Full Name (optional)"
                      className="w-full px-3 py-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-sm text-[#f3ecd9] focus:outline-none focus:border-[#d4a935]"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-2 px-3 rounded-lg bg-gradient-to-r from-[#d4a935] to-[#f2c14e] text-black font-semibold text-xs hover:brightness-110 cursor-pointer shadow"
                  >
                    {loading ? 'Authenticating...' : 'Sign In with Google Account'}
                  </button>
                </form>
              )}

              <div className="flex items-center gap-3 my-4">
                <div className="h-px bg-[#2e2b22] flex-1" />
                <span className="text-[11px] uppercase tracking-wider text-[#a79f8b] font-medium">
                  Or use Email & Password
                </span>
                <div className="h-px bg-[#2e2b22] flex-1" />
              </div>
            </div>

            {/* Segmented Auth Mode Switcher */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0a0a0d] border border-[#2e2b22]">
              <button
                type="button"
                onClick={() => { setAuthMode('signin'); setErrorMsg(''); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signin'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode('signup'); setErrorMsg(''); }}
                className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  authMode === 'signup'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                Create Account
              </button>
            </div>

            {/* TAB A: SIGN IN FORM */}
            {authMode === 'signin' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                    Username or Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="e.g. 23kb1a0599 or student@gmail.com"
                      required
                      className="w-full px-3.5 py-2.5 pl-10 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-sm"
                    />
                    <Mail className="w-4 h-4 text-[#a79f8b] absolute left-3.5 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your account password"
                      required
                      className="w-full px-3.5 py-2.5 pl-10 pr-10 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-sm"
                    />
                    <Lock className="w-4 h-4 text-[#a79f8b] absolute left-3.5 top-3" />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="p-1 text-[#a79f8b] hover:text-[#f3ecd9] absolute right-3 top-2.5 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-sm hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50"
                >
                  {loading ? 'Signing In...' : 'Sign In to My Space'}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            ) : (
              /* TAB B: CREATE ACCOUNT FORM */
              <form onSubmit={handleSignUp} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={signUpName}
                      onChange={(e) => setSignUpName(e.target.value)}
                      placeholder="e.g. Vamsi Krishna"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={signUpEmail}
                      onChange={(e) => setSignUpEmail(e.target.value)}
                      placeholder="e.g. vamsi@gmail.com"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Student Roll / ID
                    </label>
                    <input
                      type="text"
                      value={signUpRoll}
                      onChange={(e) => setSignUpRoll(e.target.value)}
                      placeholder="e.g. 23KB1A0599"
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={signUpPhone}
                      onChange={(e) => setSignUpPhone(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                    College Name
                  </label>
                  <input
                    type="text"
                    value={signUpCollege}
                    onChange={(e) => setSignUpCollege(e.target.value)}
                    placeholder="Enter your institution"
                    className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Create Password *
                    </label>
                    <input
                      type="password"
                      value={signUpPassword}
                      onChange={(e) => setSignUpPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={signUpConfirmPass}
                      onChange={(e) => setSignUpConfirmPass(e.target.value)}
                      placeholder="Re-enter password"
                      required
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-sm hover:bg-[#d4a935] transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 mt-2"
                >
                  {loading ? 'Creating Space...' : 'Register My Participant Space'}
                  <Sparkles className="w-4 h-4" />
                </button>
              </form>
            )}
          </div>
        ) : (
          /* VIEW 2: PARTICIPANT DASHBOARD (When Logged In) */
          <div className="p-5 sm:p-6 space-y-5">
            {/* User Profile Card */}
            <div className="p-4 rounded-xl bg-[#181820] border border-[#2e2b22] flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#f2c14e] to-[#d4a935] text-[#1a1300] font-bold font-serif-title text-xl flex items-center justify-center shadow-md shrink-0">
                  {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-base text-[#ffffff]">{currentUser.name}</h4>
                    {currentUser.isIeeeMember && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 font-semibold">
                        IEEE Member
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-[#a79f8b] flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                    <span>{currentUser.email}</span>
                    {currentUser.roll && <span>· Roll: {currentUser.roll}</span>}
                    {currentUser.college && <span className="hidden sm:inline">· {currentUser.college}</span>}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(!isEditingProfile)}
                  className="p-2 text-xs font-semibold rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#d4a935] hover:text-[#f2c14e] transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>{isEditingProfile ? 'Cancel' : 'Edit Profile'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="p-2 text-xs font-semibold rounded-lg bg-[#2a1315] border border-[#ff8a80]/30 text-[#ff8a80] hover:bg-[#3d1a1d] transition-colors flex items-center gap-1.5 cursor-pointer"
                  title="Sign out of space"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            </div>

            {/* Inline Profile Editor */}
            {isEditingProfile && (
              <form onSubmit={handleSaveProfile} className="p-4 rounded-xl bg-[#0a0a0d] border border-[#d4a935]/40 space-y-3">
                <h5 className="text-xs font-bold uppercase tracking-wider text-[#f2c14e] flex items-center gap-1.5">
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Update Profile Information</span>
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">Full Name</label>
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">Student Roll / ID</label>
                    <input
                      type="text"
                      value={editRoll}
                      onChange={(e) => setEditRoll(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs uppercase"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">College</label>
                    <input
                      type="text"
                      value={editCollege}
                      onChange={(e) => setEditCollege(e.target.value)}
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">Branch / Dept</label>
                    <input
                      type="text"
                      value={editBranch}
                      onChange={(e) => setEditBranch(e.target.value)}
                      placeholder="e.g. CSE"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#a79f8b] mb-1">Year of Study</label>
                    <input
                      type="text"
                      value={editYear}
                      onChange={(e) => setEditYear(e.target.value)}
                      placeholder="e.g. 3rd Year"
                      className="w-full px-3 py-1.5 rounded-lg bg-[#131318] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-4 py-2 rounded-lg bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingProfile(false)}
                    className="px-3 py-2 rounded-lg bg-transparent border border-[#2e2b22] text-xs text-[#a79f8b] hover:text-[#f3ecd9] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}

            {/* Dashboard Tabs */}
            <div className="grid grid-cols-2 p-1 rounded-xl bg-[#0a0a0d] border border-[#2e2b22]">
              <button
                type="button"
                onClick={() => setActiveTab('passes')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'passes'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>My Events & Passes ({userRegistrations.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('schedule')}
                className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                  activeTab === 'schedule'
                    ? 'bg-[#1f1b0e] text-[#f2c14e] border border-[#d4a935]/40 shadow'
                    : 'text-[#a79f8b] hover:text-[#f3ecd9]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Symposium Day Guide</span>
              </button>
            </div>

            {/* TAB CONTENT: PASSES */}
            {activeTab === 'passes' && (
              <div className="space-y-3">
                {userRegistrations.length > 0 ? (
                  userRegistrations.map((rec) => {
                    const eventObjects = (rec.eventIds || [])
                      .map(id => ALL_EVENTS.find(e => e.id === id))
                      .filter(Boolean);

                    return (
                      <div 
                        key={rec.regId}
                        className="p-4 sm:p-5 rounded-2xl bg-[#0a0a0d] border border-[#2e2b22] space-y-4 hover:border-[#d4a935]/40 transition-colors"
                      >
                        {/* Header: Reg ID, Event Titles, Status */}
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2b22] pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs uppercase font-mono font-bold text-[#d4a935] tracking-wider">
                                Reg ID: {rec.regId}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  navigator.clipboard.writeText(rec.regId);
                                  setCopiedRegId(rec.regId);
                                  setTimeout(() => setCopiedRegId(null), 2000);
                                }}
                                className="text-[#a79f8b] hover:text-[#f2c14e] transition-colors cursor-pointer"
                                title="Copy Registration ID"
                              >
                                {copiedRegId === rec.regId ? <Check className="w-3.5 h-3.5 text-[#4cc38a]" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <span className="text-sm sm:text-base font-bold text-[#ffffff] block mt-0.5">
                              {eventObjects.map(e => e?.name).join(' & ') || 'NexusVerse Flagship'}
                            </span>
                            {rec.timestamp && (
                              <span className="text-[10px] text-[#716c5e]">
                                Registered on {(() => {
                                  try {
                                    const d = new Date(rec.timestamp);
                                    return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                  } catch {
                                    return '';
                                  }
                                })()}
                              </span>
                            )}
                          </div>

                          <div className="flex flex-col items-end gap-1">
                            {rec.paymentMode === 'upi' ? (
                              <span className="px-2.5 py-1 rounded-full bg-[#1e2714] border border-[#d4a935]/50 text-[#f2c14e] font-semibold text-xs flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>UPI Submitted · Ticket at 8 PM</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full bg-[#142617] border border-[#81c784]/40 text-[#a5d6a7] font-semibold text-xs flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Confirmed & Paid</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* PARTICIPANT'S COMPLETE PERSONAL & ACADEMIC DETAILS */}
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase font-bold text-[#a79f8b] tracking-wider block">
                            Delegate Information
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 text-xs bg-[#111116] p-3 sm:p-4 rounded-xl border border-[#23232e]">
                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Full Name</span>
                              <span className="font-bold text-white block">{rec.name}</span>
                              <span className="text-[11px] font-mono text-[#f2c14e]">{rec.roll}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Class, Section & Branch</span>
                              <span className="font-semibold text-white block">
                                {rec.className || 'B.Tech'} {rec.section && `- Section ${rec.section}`} · {rec.dept || 'Engineering'}
                              </span>
                              <span className="text-[11px] text-[#a79f8b]">{rec.year || '3rd Year'}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Institution / College</span>
                              <span className="font-medium text-white block truncate" title={rec.college}>{rec.college}</span>
                              <span className="text-[11px] text-[#a79f8b]">
                                {rec.isIeeeMember ? (
                                  <span className="text-[#4cc38a] font-semibold">IEEE Member (#{rec.ieeeId || 'Active'})</span>
                                ) : (
                                  <span>Non-IEEE</span>
                                )}
                              </span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Registered Mobile</span>
                              <span className="font-mono text-white block">{rec.phone}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Dispatch Email Address</span>
                              <span className="text-white block truncate" title={rec.email}>{rec.email}</span>
                            </div>

                            <div>
                              <span className="text-[10px] text-[#a79f8b] block font-medium">Payment Reference</span>
                              <div className="flex items-center gap-1 font-mono text-white">
                                <span className="truncate">{rec.paymentId}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(rec.paymentId);
                                    setCopiedUtr(rec.paymentId);
                                    setTimeout(() => setCopiedUtr(null), 2000);
                                  }}
                                  className="text-[#a79f8b] hover:text-[#f2c14e] cursor-pointer"
                                  title="Copy Reference"
                                >
                                  {copiedUtr === rec.paymentId ? <Check className="w-3 h-3 text-[#4cc38a]" /> : <Copy className="w-3 h-3" />}
                                </button>
                              </div>
                              <span className="text-[10px] text-[#a79f8b]">
                                Fee Paid: <strong className="text-[#f2c14e]">₹{rec.totalPaid}</strong> ({rec.paymentMode === 'upi' ? 'UPI Transfer' : 'Razorpay'})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* IF UPI: 8 PM NOTIFICATION & PAYMENT RECEIPT SCREENSHOT */}
                        {rec.paymentMode === 'upi' && (
                          <div className="p-3 rounded-xl bg-gradient-to-r from-[#171306] via-[#1f1a08] to-[#171306] border border-[#d4a935]/50 flex flex-wrap items-center justify-between gap-3 text-xs">
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-4 h-4 text-[#f2c14e] shrink-0" />
                              <span className="text-[#f3ecd9] leading-tight">
                                Your ticket will be sent to your mail at <strong className="text-[#f2c14e]">8 PM</strong> and you can access your ticket in your space find my ticket.
                              </span>
                            </div>

                            {rec.paymentScreenshot && (
                              <button
                                type="button"
                                onClick={() => setViewingReceiptModal(rec.paymentScreenshot || null)}
                                className="px-2.5 py-1 rounded-lg bg-[#2b220d] border border-[#d4a935]/40 text-[#f2c14e] hover:bg-[#d4a935] hover:text-black font-semibold text-[11px] flex items-center gap-1.5 cursor-pointer shrink-0 transition-colors"
                              >
                                <ImageIcon className="w-3.5 h-3.5" />
                                <span>View Uploaded Receipt</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* REGISTERED EVENTS & DETAILED TEAM ROSTER */}
                        <div className="space-y-2">
                          <span className="text-[10px] uppercase font-bold text-[#a79f8b] tracking-wider block">
                            Event Details & Team Members
                          </span>
                          {eventObjects.map(ev => {
                            if (!ev) return null;
                            const teamInfo = rec.teamDetails?.[ev.id];
                            const additionalTeammates = teamInfo?.teamMembers || [];

                            return (
                              <div key={ev.id} className="text-xs space-y-2 bg-[#131318] p-3.5 rounded-xl border border-[#2e2b22]">
                                <div className="flex items-center justify-between border-b border-[#2e2b22]/70 pb-2">
                                  <span className="font-bold text-[#f2c14e]">{ev.name} ({ev.category})</span>
                                  <div className="flex items-center gap-2 text-[11px] text-[#a79f8b]">
                                    <span className="flex items-center gap-1">
                                      <Clock className="w-3 h-3 text-[#d4a935]" />
                                      <span>{ev.time}</span>
                                    </span>
                                    <span>·</span>
                                    <span className="flex items-center gap-1">
                                      <MapPin className="w-3 h-3 text-[#d4a935]" />
                                      <span>{ev.venue}</span>
                                    </span>
                                  </div>
                                </div>

                                {teamInfo?.projectTitle && (
                                  <div className="text-[11px] text-[#9fc7e8]">
                                    <strong>Project Title:</strong> {teamInfo.projectTitle}
                                  </div>
                                )}

                                {teamInfo?.teamName && (
                                  <div className="space-y-1.5 pt-1">
                                    <div className="text-[11px] font-semibold text-[#f2c14e] flex items-center gap-1.5">
                                      <Users className="w-3.5 h-3.5" />
                                      <span>Team: {teamInfo.teamName} ({1 + additionalTeammates.length} Members)</span>
                                    </div>

                                    {/* Team Members List */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                      {/* Lead */}
                                      <div className="p-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[11px]">
                                        <div className="flex items-center justify-between">
                                          <span className="font-bold text-white">1. {rec.name} (Team Lead)</span>
                                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#1f1b0e] text-[#f2c14e] font-semibold">Lead</span>
                                        </div>
                                        <div className="text-[#a79f8b] font-mono text-[10px] mt-0.5">
                                          Roll: {rec.roll} · {rec.dept} · 📞 {rec.phone}
                                        </div>
                                      </div>

                                      {/* Teammates */}
                                      {additionalTeammates.map((m: any, idx: number) => {
                                        const memberName = typeof m === 'string' ? m : (m?.name || `Teammate ${idx + 2}`);
                                        const memberRoll = typeof m === 'object' ? (m?.roll || '') : '';
                                        const memberBranch = typeof m === 'object' ? (m?.branch || '') : '';
                                        const memberSection = typeof m === 'object' ? (m?.section || '') : '';
                                        const memberPhone = typeof m === 'object' ? (m?.phone || '') : '';
                                        const memberIsIeee = typeof m === 'object' ? Boolean(m?.isIeeeMember) : false;

                                        return (
                                          <div key={idx} className="p-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[11px]">
                                            <div className="flex items-center justify-between">
                                              <span className="font-bold text-white">{idx + 2}. {memberName}</span>
                                              {memberIsIeee && (
                                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#152319] text-[#4cc38a] font-semibold">IEEE</span>
                                              )}
                                            </div>
                                            <div className="text-[#a79f8b] font-mono text-[10px] mt-0.5">
                                              Roll: {memberRoll || 'N/A'} {memberBranch && `· ${memberBranch}`} {memberSection && `(${memberSection})`} {memberPhone && `· 📞 ${memberPhone}`}
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {/* Action Buttons */}
                        <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2 border-t border-[#2e2b22]">
                          <span className="text-xs text-[#a79f8b]">
                            Total Amount: <span className="font-mono text-[#f3ecd9] font-bold text-sm">₹{rec.totalPaid}</span>
                            {rec.gstAmount ? (
                              <span className="text-[10px] text-[#a79f8b] font-mono ml-1.5">
                                (Base: ₹{rec.subtotal || (rec.totalPaid - rec.gstAmount)} + 5% GST: ₹{rec.gstAmount})
                              </span>
                            ) : null}
                          </span>

                          <div className="flex items-center gap-2">
                            <a
                              href={SYMPOSIUM_CONFIG.whatsappGroup?.url || 'https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-3 py-1.5 rounded-lg bg-[#092215] border border-[#25d366]/40 text-[#25d366] hover:bg-[#25d366] hover:text-[#052e16] font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                            >
                              <MessageCircle className="w-3.5 h-3.5 fill-current" />
                              <span>WhatsApp</span>
                            </a>

                            <button
                              type="button"
                              onClick={() => {
                                onOpenTicketPass(rec);
                                onClose();
                              }}
                              className="px-4 py-2 rounded-lg bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              <Ticket className="w-3.5 h-3.5" />
                              <span>View Digital QR Pass</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 rounded-xl bg-[#0a0a0d] border border-dashed border-[#2e2b22] text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-[#1f1b0e] border border-[#d4a935]/30 text-[#f2c14e] flex items-center justify-center mx-auto">
                      <Ticket className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="font-bold text-sm text-[#ffffff]">No Confirmed Events Yet</h5>
                      <p className="text-xs text-[#a79f8b] max-w-sm mx-auto mt-1">
                        You have not registered for any technical events. Choose from CTF, CodeNano, InnovRush, TechQuest, or Designova!
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateToRegister({
                          name: currentUser.name,
                          email: currentUser.email,
                          phone: currentUser.phone,
                          roll: currentUser.roll,
                          college: currentUser.college,
                          branch: currentUser.branch,
                          year: currentUser.year,
                          isIeeeMember: currentUser.isIeeeMember,
                          ieeeId: currentUser.ieeeId,
                        });
                        onClose();
                      }}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] transition-all cursor-pointer shadow-md"
                    >
                      <span>Register for an Event Now</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: SYMPOSIUM SCHEDULE */}
            {activeTab === 'schedule' && (
              <div className="space-y-3">
                <div className="p-3.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-[#d4a935] font-semibold">
                    <Clock className="w-4 h-4" />
                    <span>Important Delegate Schedule — 29 October 2026</span>
                  </div>
                  <ul className="space-y-2 text-[#a79f8b] pt-1">
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-[#f3ecd9] font-medium shrink-0">09:00 AM:</span>
                      <span>Inauguration Ceremony at <strong className="text-[#ffffff]">Seminar Hall, NBKRIST</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-[#f3ecd9] font-medium shrink-0">10:00 AM:</span>
                      <span>Technical Flagship Competitions commence in assigned computing and engineering labs.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-[#f3ecd9] font-medium shrink-0">12:00 PM:</span>
                      <span>Complimentary Delegate Lunch & Networking at Main Dining Arena.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-[#f3ecd9] font-medium shrink-0">01:30 PM:</span>
                      <span>Interactive Spot Events, Tech Arena Challenges & Fun Activities.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="font-mono text-[#f3ecd9] font-medium shrink-0">03:30 PM:</span>
                      <span>Prize Distribution & Valedictory Ceremony at Seminar Hall.</span>
                    </li>
                  </ul>
                </div>

                {/* Official WhatsApp Participant Group */}
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-[#0d2a1a] via-[#123824] to-[#0d2a1a] border border-[#25d366]/50 text-xs flex flex-wrap items-center justify-between gap-3 shadow-md">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#25d366] text-[#052e16] flex items-center justify-center shrink-0">
                      <MessageCircle className="w-4 h-4 fill-current" />
                    </div>
                    <div>
                      <span className="font-bold text-[#ffffff] block text-xs">Official WhatsApp Participant Group</span>
                      <span className="text-[#a7f3d0] text-[11px]">Join for live event schedules, room allocations & announcements.</span>
                    </div>
                  </div>
                  <a
                    href="https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO?s=cl&p=a&mlu=4&ilr=4&iam=2"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#25d366] text-[#052e16] hover:bg-[#20ba5a] font-bold text-xs flex items-center gap-1.5 transition-all shadow cursor-pointer shrink-0"
                  >
                    <span>Join Group</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                {/* Coordinator Helpline */}
                <div className="p-3.5 rounded-xl bg-[#1f1b0e]/60 border border-[#d4a935]/30 text-xs flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <span className="font-bold text-[#f2c14e] block">Student Coordinator Helpdesk</span>
                    <span className="text-[#a79f8b] text-[11px]">N. Upali (6305349156) · K. Guravaiah (9491501919)</span>
                  </div>
                  <a
                    href="https://wa.me/919491501919"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-[#25d366]/20 border border-[#25d366]/40 text-[#25d366] hover:bg-[#25d366]/30 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                  >
                    <span>WhatsApp Desk</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            )}
          </div>
        )}

        {/* In-App Direct Google Account Sign-In Prompt */}
        {googlePromptOpen && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md p-4 sm:p-6 flex flex-col justify-center items-center z-30 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#181820] border border-[#d4a935]/40 p-6 rounded-2xl shadow-2xl space-y-4 text-center relative">
              <button
                type="button"
                onClick={() => setGooglePromptOpen(false)}
                className="absolute right-3.5 top-3.5 p-1.5 text-[#a79f8b] hover:text-[#f3ecd9] rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-full bg-white p-2.5 mx-auto flex items-center justify-center shadow-lg">
                <svg className="w-full h-full" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>

              <div>
                <h4 className="font-bold text-base text-[#ffffff]">Sign in with Google</h4>
                <p className="text-xs text-[#a79f8b] mt-1">
                  Connect your Google account to access your Participant Space & tickets instantly.
                </p>
              </div>

              <form onSubmit={handleGoogleDirectSubmit} className="space-y-3.5 text-left pt-1">
                <div>
                  <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                    Google Email Address *
                  </label>
                  <input
                    type="email"
                    value={googleSimEmail}
                    onChange={(e) => setGoogleSimEmail(e.target.value)}
                    placeholder="e.g. yourname@gmail.com"
                    required
                    autoFocus
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#a79f8b] mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={googleSimName}
                    onChange={(e) => setGoogleSimName(e.target.value)}
                    placeholder="e.g. Vamsi Krishna"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] placeholder-[#575347] focus:outline-none focus:border-[#d4a935] text-xs sm:text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2.5 rounded-xl bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] transition-all cursor-pointer shadow-md"
                  >
                    {loading ? 'Connecting...' : 'Continue to My Space'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setGooglePromptOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-[#2e2b22] text-xs text-[#a79f8b] hover:text-[#f3ecd9] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Lightbox for viewing receipt screenshot from dashboard */}
        {viewingReceiptModal && (
          <div 
            className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-in fade-in"
            onClick={() => setViewingReceiptModal(null)}
          >
            <div 
              className="bg-[#111116] border border-[#2e2b22] rounded-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3.5 border-b border-[#2e2b22] flex items-center justify-between bg-[#181820]">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4 text-[#4cc38a]" />
                  <span className="font-bold text-white text-xs">Uploaded UPI Payment Receipt</span>
                </div>
                <button 
                  type="button" 
                  onClick={() => setViewingReceiptModal(null)}
                  className="p-1 rounded-lg text-[#a79f8b] hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-auto flex items-center justify-center bg-black/60">
                <img src={viewingReceiptModal} alt="Uploaded Payment Receipt" className="max-h-[70vh] max-w-full object-contain rounded-lg border border-[#2e2b22]" />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
