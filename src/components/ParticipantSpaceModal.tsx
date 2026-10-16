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
  ExternalLink
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
import { EVENTS } from '../data/symposiumData';

interface ParticipantSpaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: ParticipantUser | null;
  onUserChange: (user: ParticipantUser | null) => void;
  savedRecords: RegistrationRecord[];
  onOpenTicketPass: (record: RegistrationRecord) => void;
  onNavigateToRegister: (prefillData: Partial<ParticipantUser>) => void;
}

export const ParticipantSpaceModal: React.FC<ParticipantSpaceModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserChange,
  savedRecords,
  onOpenTicketPass,
  onNavigateToRegister,
}) => {
  // Auth Form State
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');
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
  const [googlePromptOpen, setGooglePromptOpen] = useState(false);
  const [googleSimEmail, setGoogleSimEmail] = useState('');
  const [googleSimName, setGoogleSimName] = useState('');

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
        const uEmail = (currentUser.email || '').toLowerCase().trim();
        const uRoll = (currentUser.roll || '').toUpperCase().trim();
        const uPhone = (currentUser.phone || '').replace(/\s+/g, '');
        
        const rEmail = (r.email || '').toLowerCase().trim();
        const rRoll = (r.roll || '').toUpperCase().trim();
        const rPhone = (r.phone || '').replace(/\s+/g, '');

        return (
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

  // Handle Google Sign-In Click
  const handleGoogleClick = async () => {
    setErrorMsg('');
    setLoading(true);
    // Attempt Supabase Google OAuth
    const oAuthRes = await initiateSupabaseGoogleAuth();
    if (!oAuthRes.success) {
      // Show instant Google email fallback popup for local/sandboxed test
      setGooglePromptOpen(true);
    }
    setLoading(false);
  };

  // Complete Google simulation login
  const handleGoogleSimSubmit = async (e: React.FormEvent) => {
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
      setSuccessMsg('Logged in with Google successfully!');
    } else {
      setErrorMsg(result.error || 'Google login failed.');
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
                      placeholder="e.g. 9876543210"
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
                      .map(id => EVENTS.find(e => e.id === id))
                      .filter(Boolean);

                    return (
                      <div 
                        key={rec.regId}
                        className="p-4 rounded-xl bg-[#0a0a0d] border border-[#2e2b22] space-y-3 hover:border-[#d4a935]/40 transition-colors"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#2e2b22] pb-3">
                          <div>
                            <span className="text-[10px] uppercase font-mono font-bold text-[#d4a935] tracking-wider block">
                              Reg ID: {rec.regId}
                            </span>
                            <span className="text-sm font-bold text-[#ffffff]">
                              {eventObjects.map(e => e?.name).join(' & ') || 'NexusVerse Flagship'}
                            </span>
                          </div>
                          <span className="px-2.5 py-1 rounded-full bg-[#142617] border border-[#81c784]/40 text-[#a5d6a7] font-semibold text-xs flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Confirmed & Paid</span>
                          </span>
                        </div>

                        {/* Event Details */}
                        {eventObjects.map(ev => {
                          if (!ev) return null;
                          const teamInfo = rec.teamDetails?.[ev.id];
                          return (
                            <div key={ev.id} className="text-xs space-y-1 bg-[#131318] p-3 rounded-lg border border-[#2e2b22]/70">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-[#f2c14e]">{ev.name} ({ev.category})</span>
                                <span className="text-[#a79f8b] text-[11px]">{ev.time}</span>
                              </div>
                              <div className="text-[#a79f8b] flex items-center gap-1 text-[11px]">
                                <MapPin className="w-3 h-3 text-[#d4a935]" />
                                <span>{ev.venue}</span>
                              </div>
                              {teamInfo?.teamName && (
                                <div className="text-[#d4a935] text-[11px] font-medium pt-1">
                                  Team: <span className="text-[#f3ecd9]">{teamInfo.teamName}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}

                        {/* Action Buttons */}
                        <div className="flex items-center justify-between pt-1">
                          <span className="text-xs text-[#a79f8b]">
                            Paid: <span className="font-mono text-[#f3ecd9] font-bold">₹{rec.totalPaid}</span>
                          </span>
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

        {/* Fallback Google Prompt Simulator */}
        {googlePromptOpen && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-md p-6 flex flex-col justify-center items-center z-20 animate-in fade-in">
            <div className="w-full max-w-sm bg-[#131318] border border-[#d4a935]/40 p-5 rounded-2xl shadow-2xl space-y-4 text-center">
              <div className="w-10 h-10 rounded-full bg-white p-2 mx-auto flex items-center justify-center shadow">
                <svg className="w-6 h-6" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
              </div>
              <div>
                <h4 className="font-bold text-sm text-[#ffffff]">Sign in with Google</h4>
                <p className="text-xs text-[#a79f8b] mt-1">Enter your Google account details to proceed.</p>
              </div>
              <form onSubmit={handleGoogleSimSubmit} className="space-y-3 text-left">
                <div>
                  <label className="block text-[11px] text-[#a79f8b] mb-1">Google Email Address</label>
                  <input
                    type="email"
                    value={googleSimEmail}
                    onChange={(e) => setGoogleSimEmail(e.target.value)}
                    placeholder="student@gmail.com"
                    required
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-[#a79f8b] mb-1">Your Full Name</label>
                  <input
                    type="text"
                    value={googleSimName}
                    onChange={(e) => setGoogleSimName(e.target.value)}
                    placeholder="e.g. Vamsi Krishna"
                    className="w-full px-3 py-2 rounded-lg bg-[#0a0a0d] border border-[#2e2b22] text-[#f3ecd9] text-xs"
                  />
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-lg bg-[#f2c14e] text-[#1a1300] font-bold text-xs hover:bg-[#d4a935] cursor-pointer"
                  >
                    Confirm & Enter Space
                  </button>
                  <button
                    type="button"
                    onClick={() => setGooglePromptOpen(false)}
                    className="px-3 py-2 rounded-lg bg-[#2e2b22] text-xs text-[#a79f8b] hover:text-[#f3ecd9] cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
