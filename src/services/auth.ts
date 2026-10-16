import { RegistrationRecord } from '../components/TicketPass';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface ParticipantUser {
  id: string;
  name: string;
  email: string;
  username: string;
  phone?: string;
  college?: string;
  roll?: string;
  branch?: string;
  year?: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
  avatarUrl?: string;
  authProvider: 'local' | 'google';
  createdAt: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: ParticipantUser;
  registrations?: RegistrationRecord[];
}

const STORAGE_KEY_USER = 'nexusverse_participant_user';

export function getStoredParticipant(): ParticipantUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveStoredParticipant(user: ParticipantUser | null): void {
  try {
    if (!user) {
      localStorage.removeItem(STORAGE_KEY_USER);
    } else {
      localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    }
  } catch (e) {
    console.warn('Failed to save user session to localStorage:', e);
  }
}

/**
 * Register with Name, Email/Username, and Password
 */
export async function registerParticipant(data: {
  name: string;
  email: string;
  username?: string;
  password: string;
  phone?: string;
  college?: string;
  roll?: string;
  branch?: string;
  year?: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.user) {
      saveStoredParticipant(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Registration failed due to network error.' };
  }
}

/**
 * Login with Email or Username + Password
 */
export async function loginParticipant(identifier: string, password: string): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier, password }),
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.user) {
      saveStoredParticipant(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Login failed due to network error.' };
  }
}

/**
 * Authenticate or link participant with Google account
 */
export async function googleLoginParticipant(googleData: {
  email: string;
  name: string;
  avatarUrl?: string;
  roll?: string;
  college?: string;
  phone?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(googleData),
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.user) {
      saveStoredParticipant(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message || 'Google login failed due to network error.' };
  }
}

/**
 * Trigger Supabase OAuth Google Sign-in if configured
 */
export async function initiateSupabaseGoogleAuth(): Promise<{ success: boolean; error?: string }> {
  try {
    if (isSupabaseConfigured() && supabase) {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) return { success: false, error: error.message };
      return { success: true };
    }
    return { success: false, error: 'Supabase OAuth is not active.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Fetch fresh user profile & registrations
 */
export async function fetchCurrentParticipant(userId: string): Promise<AuthResponse> {
  try {
    const res = await fetch(`/api/auth/me?id=${encodeURIComponent(userId)}`, {
      headers: { 'x-user-id': userId },
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.user) {
      saveStoredParticipant(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Update Participant Profile (phone, roll, college, branch, year)
 */
export async function updateParticipantProfile(data: {
  id: string;
  name?: string;
  phone?: string;
  college?: string;
  roll?: string;
  branch?: string;
  year?: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
}): Promise<AuthResponse> {
  try {
    const res = await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result: AuthResponse = await res.json();
    if (result.success && result.user) {
      saveStoredParticipant(result.user);
    }
    return result;
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Logout
 */
export async function logoutParticipant(): Promise<void> {
  saveStoredParticipant(null);
  try {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
  } catch (e) {
    // Ignore
  }
}
