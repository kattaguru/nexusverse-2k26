/**
 * NexusVerse 2K26 Registration Form Draft Cache
 * Real-time client-side memory and localStorage draft synchronization.
 * Prevents loss of entered participant and team data across reloads, accidental navigation,
 * and browser crashes.
 */

export interface FormDraftMember {
  name: string;
  roll: string;
  className: string;
  section: string;
  branch: string;
  year: string;
  phone: string;
  isIeeeMember?: boolean;
  ieeeId?: string;
}

export interface FormDraftTeamData {
  teamName: string;
  projectTitle?: string;
  members: FormDraftMember[];
}

export interface RegistrationFormDraft {
  name: string;
  roll: string;
  classNameVal?: string;
  sectionVal?: string;
  dept: string;
  year: string;
  phone: string;
  college: string;
  email: string;
  isIeeeMember: boolean;
  ieeeId?: string;
  selectedEvents: string[];
  includeSpotEvents: boolean;
  spotMembersSelected: { lead: boolean; [key: number]: boolean };
  teamDetails: Record<string, FormDraftTeamData>;
  termsAccepted?: boolean;
  savedAt: number; // epoch ms
}

const FORM_CACHE_KEY = 'nexusverse_form_draft_v1';
const DRAFT_MAX_AGE_MS = 48 * 60 * 60 * 1000; // 48 Hours

/**
 * Checks whether an object is a plausible draft with at least one field populated
 */
export function hasMeaningfulContent(draft: Partial<RegistrationFormDraft>): boolean {
  if (!draft) return false;
  return Boolean(
    (draft.name && draft.name.trim().length > 0) ||
    (draft.roll && draft.roll.trim().length > 0) ||
    (draft.email && draft.email.trim().length > 0) ||
    (draft.phone && draft.phone.trim().length > 0) ||
    (draft.dept && draft.dept.trim().length > 0) ||
    (draft.selectedEvents && draft.selectedEvents.length > 0) ||
    (draft.teamDetails && Object.values(draft.teamDetails).some(t => t.teamName || (t.members && t.members.length > 0)))
  );
}

/**
 * Save form draft into browser storage.
 */
export function saveFormDraft(data: Omit<RegistrationFormDraft, 'savedAt'>): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (!hasMeaningfulContent(data)) {
      return false;
    }
    const payload: RegistrationFormDraft = {
      ...data,
      savedAt: Date.now()
    };
    localStorage.setItem(FORM_CACHE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('Form cache auto-save notice:', err);
    return false;
  }
}

/**
 * Load persisted form draft if available and not expired.
 */
export function loadFormDraft(): RegistrationFormDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(FORM_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RegistrationFormDraft;
    if (!parsed || typeof parsed !== 'object') return null;

    // Check expiration
    if (parsed.savedAt && (Date.now() - parsed.savedAt) > DRAFT_MAX_AGE_MS) {
      clearFormDraft();
      return null;
    }

    if (!hasMeaningfulContent(parsed)) {
      return null;
    }

    return parsed;
  } catch (err) {
    console.warn('Form cache load notice:', err);
    return null;
  }
}

/**
 * Delete persisted form draft (e.g. upon successful registration submission).
 */
export function clearFormDraft(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(FORM_CACHE_KEY);
  } catch (err) {
    console.warn('Form cache clear notice:', err);
  }
}

/**
 * Check if a valid non-empty draft currently exists in memory.
 */
export function hasFormDraft(): boolean {
  return loadFormDraft() !== null;
}

/**
 * Returns human-friendly relative time for when the draft was cached.
 */
export function formatDraftAge(timestamp: number): string {
  const diffSec = Math.floor((Date.now() - timestamp) / 1000);
  if (diffSec < 5) return 'just now';
  if (diffSec < 60) return `${diffSec} seconds ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin === 1) return '1 minute ago';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
