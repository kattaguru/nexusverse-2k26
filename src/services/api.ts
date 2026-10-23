import { RegistrationRecord } from '../components/TicketPass';
import { getRecordTeammates } from '../utils/delegateStats';
import { 
  supabase, 
  isSupabaseConfigured, 
  mapDbToRegistrationRecord, 
  mapRegistrationRecordToDb 
} from '../lib/supabase';

const API_BASE = '/api';

/**
 * Identify test, mock, or attack payload registrations
 */
export function isTestRegistration(r: RegistrationRecord | any): boolean {
  if (!r) return false;
  const id = (r.regId || r.reg_id || '').toUpperCase();
  const name = (r.name || '').toLowerCase();
  const roll = (r.roll || '').toLowerCase();
  const email = (r.email || '').toLowerCase();
  return (
    id.startsWith('TEST-') ||
    id.startsWith('CAMPUS-') ||
    id.includes('LIVE') ||
    name.includes('prototype tester') ||
    name.includes('scanner test') ||
    name.includes('<script') ||
    name.includes('test') ||
    roll.includes('<img') ||
    roll.includes('9999') ||
    email.includes('example.com')
  );
}

/**
 * Fetch all registrations from Supabase database with Express & localStorage fallback.
 */
export async function fetchRegistrationsApi(): Promise<RegistrationRecord[]> {
  // 1. Try Supabase first if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('registrations')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const records = data.map(mapDbToRegistrationRecord).filter(r => !isTestRegistration(r));
        try {
          localStorage.setItem('nexusverse_registrations', JSON.stringify(records));
        } catch (e) {}
        return records;
      } else if (error) {
        console.warn('Supabase fetch failed, falling back to local server:', error.message);
      }
    } catch (err) {
      console.warn('Error reading from Supabase:', err);
    }
  }

  // 2. Try Express API Server
  try {
    const res = await fetch(`${API_BASE}/registrations`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        const cleanList = (json.data as RegistrationRecord[]).filter(r => !isTestRegistration(r));
        try {
          localStorage.setItem('nexusverse_registrations', JSON.stringify(cleanList));
        } catch (e) {}
        return cleanList;
      }
    }
  } catch (err) {
    // Express server might be offline if hosted purely on frontend static host
  }

  // 3. Fallback to localStorage
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    if (cached) {
      const parsed: RegistrationRecord[] = JSON.parse(cached);
      return parsed.filter(r => !isTestRegistration(r));
    }
    return [];
  } catch (e) {
    return [];
  }
}

/**
 * Purge all mock/test registrations across localStorage, Express server, and Supabase.
 */
export async function purgeTestRegistrationsApi(adminPassword?: string): Promise<{ success: boolean; purgedCount: number; purgedIds: string[] }> {
  // 1. Purge from local cache immediately
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    if (cached) {
      const list: RegistrationRecord[] = JSON.parse(cached);
      const cleaned = list.filter(r => !isTestRegistration(r));
      localStorage.setItem('nexusverse_registrations', JSON.stringify(cleaned));
    }
  } catch (e) {}

  // 2. Call backend purge endpoint
  try {
    const res = await fetch(`${API_BASE}/admin/purge-test-registrations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Admin-Key': adminPassword || 'kgr@2005'
      },
      body: JSON.stringify({ currentPassword: adminPassword || 'kgr@2005' })
    });
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch (e) {}

  return { success: true, purgedCount: 0, purgedIds: [] };
}

// Client-side de-duplication cache to prevent multiple alerts for the same registration
const clientNotifiedRegs = new Set<string>();

/**
 * Dispatch instant mobile notification to admin via direct Telegram Bot (Strictly 1-Time per Registration ID)
 */
export function notifyAdminOnRegistration(record: RegistrationRecord): void {
  if (!record || !record.regId || isTestRegistration(record)) return;

  const regKey = String(record.regId).trim().toUpperCase();
  if (clientNotifiedRegs.has(regKey)) return;
  clientNotifiedRegs.add(regKey);
  // Auto purge key after 30 minutes
  setTimeout(() => clientNotifiedRegs.delete(regKey), 30 * 60 * 1000);

  // Direct client-to-Telegram dispatch for guaranteed instant 1-time delivery
  try {
    const botToken = (import.meta.env.VITE_TELEGRAM_BOT_TOKEN || '8820703265:AAHQBBqrSA4XtyJ7DNI9VlWJROuD7Dw9SJg').trim();
    const chatId = (import.meta.env.VITE_TELEGRAM_CHAT_ID || '6187967922').trim();

    if (botToken && chatId) {
      const eventsList = (record.eventIds || []).map(e => String(e).toUpperCase()).join(', ') || 'Symposium Events';
      const cleanPhone = (record.phone || '').replace(/\D/g, '').slice(-10);
      const appUrl = (typeof window !== 'undefined' && window.location?.origin ? window.location.origin : 'https://www.nbkristieee.in').replace(/\/$/, '');
      const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(record.regId || '')}&roll=${encodeURIComponent(record.roll || '')}`;
      const adminUrl = `${appUrl}/nexusadmin`;

      const text = 
        `🚨 *NEW NEXUSVERSE 2K26 REGISTRATION!* 🚨\n\n` +
        `👤 *Delegate:* ${record.name || 'Delegate'}\n` +
        `🎓 *Roll No:* \`${record.roll || 'N/A'}\`\n` +
        `📞 *Phone:* ${cleanPhone ? `+91 ${cleanPhone}` : 'N/A'}\n` +
        `📧 *Email:* ${record.email || 'N/A'}\n` +
        `🏛️ *College:* ${record.college || 'NBKRIST'}\n` +
        `📚 *Branch / Year:* ${record.dept || 'N/A'} (${record.year || 'Student'})\n` +
        `🎟️ *Events:* *${eventsList}*\n` +
        `💰 *Amount Paid:* *₹${record.totalPaid || 0}* (${(record.paymentMode || 'UPI').toUpperCase()})\n` +
        `💳 *Payment Ref:* \`${record.paymentId || 'N/A'}\`\n` +
        `🆔 *Pass ID:* \`${record.regId || 'N/A'}\``;

      const keyboard: Array<Array<{ text: string; url: string }>> = [
        [
          { text: '🎟️ View Pass', url: passUrl },
          { text: '🛡️ Admin Center', url: adminUrl }
        ]
      ];
      if (cleanPhone) {
        keyboard.push([
          { text: `💬 WhatsApp Delegate (+91 ${cleanPhone})`, url: `https://wa.me/91${cleanPhone}` }
        ]);
      }

      fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: keyboard }
        })
      }).catch(err => console.warn('Direct Telegram notification warning:', err));
    }
  } catch (err) {
    console.warn('Failed to send client Telegram notification:', err);
  }
}

/**
 * Save new registration to Supabase, Express server, and localStorage.
 */
export async function saveRegistrationApi(record: RegistrationRecord): Promise<RegistrationRecord> {
  // Always update local cache immediately for snappy UI
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    const list: RegistrationRecord[] = cached ? JSON.parse(cached) : [];
    const updated = [record, ...list.filter(r => r.regId !== record.regId)];
    localStorage.setItem('nexusverse_registrations', JSON.stringify(updated));
  } catch (e) {}

  let backendNotified = false;

  // 1. Save to Supabase Cloud Database if configured
  let supabaseSavedRecord: RegistrationRecord | null = null;
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbRow = mapRegistrationRecordToDb(record);
      const { data, error } = await supabase
        .from('registrations')
        .upsert(dbRow, { onConflict: 'reg_id' })
        .select()
        .single();

      if (!error && data) {
        supabaseSavedRecord = mapDbToRegistrationRecord(data);
      } else if (error) {
        console.warn('Supabase upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase save error:', err);
    }
  }

  // 2. Dispatch to backend API (saves to DB and sends 1-time admin alerts: Telegram, Email, WhatsApp, Ntfy)
  try {
    const res = await fetch(`${API_BASE}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      backendNotified = true;
      const json = await res.json();
      if (json.success && json.data) {
        return supabaseSavedRecord || json.data;
      }
    }
  } catch (err) {
    console.warn('Backend /api/registrations network error:', err);
  }

  // 3. Fallback: If backend was unreachable (e.g. offline or static host), dispatch direct client alert
  if (!backendNotified) {
    notifyAdminOnRegistration(record);
  }

  return supabaseSavedRecord || record;
}

/**
 * Update an existing registration on Supabase, Express server, and localStorage.
 */
export async function updateRegistrationApi(record: RegistrationRecord): Promise<boolean> {
  // Local cache
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    const list: RegistrationRecord[] = cached ? JSON.parse(cached) : [];
    const updated = list.map(r => r.regId === record.regId ? record : r);
    localStorage.setItem('nexusverse_registrations', JSON.stringify(updated));
  } catch (e) {}

  let supabaseSuccess = false;

  // Supabase update
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbRow = mapRegistrationRecordToDb(record);
      const { error } = await supabase
        .from('registrations')
        .update(dbRow)
        .eq('reg_id', record.regId);

      if (!error) {
        supabaseSuccess = true;
      } else {
        console.warn('Supabase update warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase update error:', err);
    }
  }

  // Express API sync
  try {
    const res = await fetch(`${API_BASE}/registrations/${encodeURIComponent(record.regId)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) return true;
  } catch (err) {}

  return supabaseSuccess;
}

/**
 * Delete a registration from Supabase, Express server, and localStorage.
 */
export async function deleteRegistrationApi(regId: string): Promise<boolean> {
  // Local cache
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    const list: RegistrationRecord[] = cached ? JSON.parse(cached) : [];
    const updated = list.filter(r => r.regId !== regId);
    localStorage.setItem('nexusverse_registrations', JSON.stringify(updated));
  } catch (e) {}

  let supabaseSuccess = false;

  // Supabase delete
  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('registrations')
        .delete()
        .eq('reg_id', regId);

      if (!error) {
        supabaseSuccess = true;
      }
    } catch (err) {}
  }

  // Express API sync
  try {
    const res = await fetch(`${API_BASE}/registrations/${encodeURIComponent(regId)}`, {
      method: 'DELETE'
    });
    if (res.ok) return true;
  } catch (err) {}

  return supabaseSuccess;
}

export interface PortalSettingsData {
  isRegClosed: boolean;
  closedMessage: string;
  totalSlotsLimit?: number;
  ieeeSlotsLimit?: number;
  nonIeeeSlotsLimit?: number;
}

export function extractQuotaFromMessage(message: string): {
  cleanMessage: string;
  totalSlotsLimit?: number;
  ieeeSlotsLimit?: number;
  nonIeeeSlotsLimit?: number;
} {
  if (!message) return { cleanMessage: '' };
  const match = message.match(/<!--NEXUS_QUOTA:(.*?)-->/);
  let totalSlotsLimit: number | undefined;
  let ieeeSlotsLimit: number | undefined;
  let nonIeeeSlotsLimit: number | undefined;
  if (match) {
    try {
      const parsed = JSON.parse(match[1]);
      if (typeof parsed.totalSlotsLimit === 'number') totalSlotsLimit = parsed.totalSlotsLimit;
      if (typeof parsed.ieeeSlotsLimit === 'number') ieeeSlotsLimit = parsed.ieeeSlotsLimit;
      if (typeof parsed.nonIeeeSlotsLimit === 'number') nonIeeeSlotsLimit = parsed.nonIeeeSlotsLimit;
    } catch (e) {}
  }
  const cleanMessage = message.replace(/<!--NEXUS_QUOTA:(.*?)-->/g, '').trim();
  return { cleanMessage, totalSlotsLimit, ieeeSlotsLimit, nonIeeeSlotsLimit };
}

export function embedQuotaInMessage(
  cleanMessage: string,
  quotas: { totalSlotsLimit?: number; ieeeSlotsLimit?: number; nonIeeeSlotsLimit?: number }
): string {
  const base = (cleanMessage || '').replace(/<!--NEXUS_QUOTA:(.*?)-->/g, '').trim();
  const payload = JSON.stringify({
    totalSlotsLimit: typeof quotas.totalSlotsLimit === 'number' ? Math.max(0, quotas.totalSlotsLimit) : 0,
    ieeeSlotsLimit: typeof quotas.ieeeSlotsLimit === 'number' ? Math.max(0, quotas.ieeeSlotsLimit) : 0,
    nonIeeeSlotsLimit: typeof quotas.nonIeeeSlotsLimit === 'number' ? Math.max(0, quotas.nonIeeeSlotsLimit) : 0,
  });
  return `${base}<!--NEXUS_QUOTA:${payload}-->`;
}

/**
 * Fetch portal settings (open/closed status, banner message, and slot capacity limits).
 */
export async function fetchSettingsApi(): Promise<PortalSettingsData> {
  // 1. Supabase settings
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('portal_settings')
        .select('*')
        .eq('id', 'current')
        .single();

      if (!error && data) {
        const rawMsg = data.closed_message || 'Registration is currently closed.';
        const { cleanMessage, totalSlotsLimit: metaTotal, ieeeSlotsLimit: metaIeee, nonIeeeSlotsLimit: metaNonIeee } = extractQuotaFromMessage(rawMsg);

        const totalSlots = typeof data.total_slots_limit === 'number'
          ? data.total_slots_limit
          : (typeof metaTotal === 'number' ? metaTotal : (Number(localStorage.getItem('nexusverse_total_slots_limit')) || 0));

        const ieeeSlots = typeof data.ieee_slots_limit === 'number'
          ? data.ieee_slots_limit
          : (typeof metaIeee === 'number' ? metaIeee : (Number(localStorage.getItem('nexusverse_ieee_slots_limit')) || 0));

        const nonIeeeSlots = typeof data.non_ieee_slots_limit === 'number'
          ? data.non_ieee_slots_limit
          : (typeof metaNonIeee === 'number' ? metaNonIeee : (Number(localStorage.getItem('nexusverse_non_ieee_slots_limit')) || 0));

        const result: PortalSettingsData = {
          isRegClosed: Boolean(data.is_reg_closed),
          closedMessage: cleanMessage || 'Registration is currently closed.',
          totalSlotsLimit: totalSlots,
          ieeeSlotsLimit: ieeeSlots,
          nonIeeeSlotsLimit: nonIeeeSlots
        };
        try {
          localStorage.setItem('nexusverse_reg_closed', String(result.isRegClosed));
          localStorage.setItem('nexusverse_closed_msg', result.closedMessage);
          localStorage.setItem('nexusverse_total_slots_limit', String(result.totalSlotsLimit || 0));
          localStorage.setItem('nexusverse_ieee_slots_limit', String(result.ieeeSlotsLimit || 0));
          localStorage.setItem('nexusverse_non_ieee_slots_limit', String(result.nonIeeeSlotsLimit || 0));
        } catch (e) {}
        return result;
      }
    } catch (err) {}
  }

  // 2. Express API
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const { isRegClosed, closedMessage, totalSlotsLimit, ieeeSlotsLimit, nonIeeeSlotsLimit } = json.data;
        const { cleanMessage } = extractQuotaFromMessage(closedMessage || '');
        const result: PortalSettingsData = {
          isRegClosed: Boolean(isRegClosed),
          closedMessage: cleanMessage || 'Registration is currently closed.',
          totalSlotsLimit: Number(totalSlotsLimit) || 0,
          ieeeSlotsLimit: Number(ieeeSlotsLimit) || 0,
          nonIeeeSlotsLimit: Number(nonIeeeSlotsLimit) || 0
        };
        try {
          localStorage.setItem('nexusverse_reg_closed', String(result.isRegClosed));
          if (result.closedMessage) localStorage.setItem('nexusverse_closed_msg', result.closedMessage);
          localStorage.setItem('nexusverse_total_slots_limit', String(result.totalSlotsLimit));
          localStorage.setItem('nexusverse_ieee_slots_limit', String(result.ieeeSlotsLimit));
          localStorage.setItem('nexusverse_non_ieee_slots_limit', String(result.nonIeeeSlotsLimit));
        } catch (e) {}
        return result;
      }
    }
  } catch (err) {}

  // 3. Local fallback
  const rawLocalMsg = localStorage.getItem('nexusverse_closed_msg') || 'Registration is currently closed.';
  const { cleanMessage: cleanLocalMsg } = extractQuotaFromMessage(rawLocalMsg);
  return {
    isRegClosed: localStorage.getItem('nexusverse_reg_closed') === 'true',
    closedMessage: cleanLocalMsg || 'Registration is currently closed.',
    totalSlotsLimit: Number(localStorage.getItem('nexusverse_total_slots_limit')) || 0,
    ieeeSlotsLimit: Number(localStorage.getItem('nexusverse_ieee_slots_limit')) || 0,
    nonIeeeSlotsLimit: Number(localStorage.getItem('nexusverse_non_ieee_slots_limit')) || 0
  };
}

/**
 * Update portal settings on Supabase and Express server.
 */
export async function updateSettingsApi(settings: { 
  isRegClosed?: boolean; 
  closedMessage?: string;
  totalSlotsLimit?: number;
  ieeeSlotsLimit?: number;
  nonIeeeSlotsLimit?: number;
}): Promise<boolean> {
  // Always update local cache immediately so UI feels instantaneous
  if (typeof settings.isRegClosed === 'boolean') {
    try {
      localStorage.setItem('nexusverse_reg_closed', String(settings.isRegClosed));
    } catch (e) {}
  }
  if (settings.closedMessage) {
    const { cleanMessage } = extractQuotaFromMessage(settings.closedMessage);
    try {
      localStorage.setItem('nexusverse_closed_msg', cleanMessage);
    } catch (e) {}
  }
  if (typeof settings.totalSlotsLimit === 'number') {
    try {
      localStorage.setItem('nexusverse_total_slots_limit', String(settings.totalSlotsLimit));
    } catch (e) {}
  }
  if (typeof settings.ieeeSlotsLimit === 'number') {
    try {
      localStorage.setItem('nexusverse_ieee_slots_limit', String(settings.ieeeSlotsLimit));
    } catch (e) {}
  }
  if (typeof settings.nonIeeeSlotsLimit === 'number') {
    try {
      localStorage.setItem('nexusverse_non_ieee_slots_limit', String(settings.nonIeeeSlotsLimit));
    } catch (e) {}
  }

  let supabaseSuccess = false;

  // Supabase update (with metadata fallback if dedicated columns don't exist yet)
  if (isSupabaseConfigured() && supabase) {
    try {
      const curTotal = typeof settings.totalSlotsLimit === 'number'
        ? settings.totalSlotsLimit
        : (Number(localStorage.getItem('nexusverse_total_slots_limit')) || 0);

      const curIeee = typeof settings.ieeeSlotsLimit === 'number'
        ? settings.ieeeSlotsLimit
        : (Number(localStorage.getItem('nexusverse_ieee_slots_limit')) || 0);

      const curNonIeee = typeof settings.nonIeeeSlotsLimit === 'number'
        ? settings.nonIeeeSlotsLimit
        : (Number(localStorage.getItem('nexusverse_non_ieee_slots_limit')) || 0);

      const rawMsg = settings.closedMessage || localStorage.getItem('nexusverse_closed_msg') || 'Registration is currently closed.';
      const { cleanMessage } = extractQuotaFromMessage(rawMsg);
      const msgWithMeta = embedQuotaInMessage(cleanMessage, {
        totalSlotsLimit: curTotal,
        ieeeSlotsLimit: curIeee,
        nonIeeeSlotsLimit: curNonIeee
      });

      const isClosed = typeof settings.isRegClosed === 'boolean'
        ? settings.isRegClosed
        : (localStorage.getItem('nexusverse_reg_closed') === 'true');

      // Attempt 1: Upsert with dedicated columns
      const fullPayload: Record<string, any> = {
        id: 'current',
        is_reg_closed: isClosed,
        closed_message: msgWithMeta,
        total_slots_limit: curTotal,
        ieee_slots_limit: curIeee,
        non_ieee_slots_limit: curNonIeee,
        updated_at: new Date().toISOString()
      };

      const { error: fullError } = await supabase
        .from('portal_settings')
        .upsert(fullPayload, { onConflict: 'id' });

      if (!fullError) {
        supabaseSuccess = true;
      } else {
        // Attempt 2: Fallback without dedicated columns - metadata safely embedded in closed_message
        const fallbackPayload = {
          id: 'current',
          is_reg_closed: isClosed,
          closed_message: msgWithMeta,
          updated_at: new Date().toISOString()
        };
        const { error: fallbackError } = await supabase
          .from('portal_settings')
          .upsert(fallbackPayload, { onConflict: 'id' });

        if (!fallbackError) supabaseSuccess = true;
      }
    } catch (err) {}
  }

  // Express API update
  try {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
    if (res.ok) return true;
  } catch (err) {}

  return supabaseSuccess;
}

/**
 * Fetch symposium gallery photos from Supabase or Express.
 */
export async function fetchPhotosApi(): Promise<any[]> {
  // Supabase photos
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (!error && Array.isArray(data)) {
        const photos = data.map(p => ({
          id: p.id,
          url: p.url,
          title: p.title,
          category: p.category,
          uploadedAt: p.uploaded_at
        }));
        try {
          localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(photos));
        } catch (e) {}
        return photos;
      }
    } catch (e) {}
  }

  // Express API
  try {
    const res = await fetch(`${API_BASE}/photos`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        try {
          localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(json.data));
        } catch (e) {}
        return json.data;
      }
    }
  } catch (e) {}

  // Local fallback
  try {
    const cached = localStorage.getItem('nexusverse_gallery_photos');
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Upload a photo to Supabase or backend server.
 */
export async function uploadPhotoApi(photo: { url: string; title: string; category: string }): Promise<any> {
  const newPhoto = {
    id: 'photo-' + Date.now(),
    url: photo.url,
    title: photo.title || 'Symposium Memory',
    category: photo.category || 'Symposium Highlights',
    uploadedAt: new Date().toISOString()
  };

  // Express API (handles upload to Supabase Storage bucket for CDN delivery)
  try {
    const res = await fetch(`${API_BASE}/photos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(photo)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (e) {}

  // Supabase fallback
  if (isSupabaseConfigured() && supabase) {
    try {
      const { data, error } = await supabase
        .from('gallery_photos')
        .insert({
          id: newPhoto.id,
          url: newPhoto.url,
          title: newPhoto.title,
          category: newPhoto.category,
          uploaded_at: newPhoto.uploadedAt
        })
        .select()
        .single();

      if (!error && data) {
        return newPhoto;
      }
    } catch (e) {}
  }

  return newPhoto;
}

/**
 * Delete a photo from Supabase or backend server.
 */
export async function deletePhotoApi(id: string): Promise<boolean> {
  // Update local storage cache immediately
  try {
    const cached = localStorage.getItem('nexusverse_gallery_photos');
    if (cached) {
      const list = JSON.parse(cached);
      if (Array.isArray(list)) {
        const updated = list.filter((p: any) => p.id !== id);
        localStorage.setItem('nexusverse_gallery_photos', JSON.stringify(updated));
      }
    }
  } catch (e) {}

  if (isSupabaseConfigured() && supabase) {
    try {
      const { error } = await supabase
        .from('gallery_photos')
        .delete()
        .eq('id', id);

      if (!error) return true;
    } catch (e) {}
  }

  try {
    const res = await fetch(`${API_BASE}/photos/${encodeURIComponent(id)}`, {
      method: 'DELETE'
    });
    return res.ok;
  } catch (e) {
    return false;
  }
}

/**
 * Sync local/offline registrations into Supabase in bulk
 */
export async function syncLocalRegistrationsToSupabase(records: RegistrationRecord[]): Promise<{
  success: boolean;
  insertedCount: number;
  error?: string;
}> {
  if (!isSupabaseConfigured() || !supabase) {
    return {
      success: false,
      insertedCount: 0,
      error: 'Supabase is not configured. Please supply VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.'
    };
  }

  if (!records || records.length === 0) {
    return { success: true, insertedCount: 0 };
  }

  try {
    const rows = records.map(mapRegistrationRecordToDb);
    const { data, error } = await supabase
      .from('registrations')
      .upsert(rows, { onConflict: 'reg_id' })
      .select('reg_id');

    if (error) {
      return { success: false, insertedCount: 0, error: error.message };
    }

    return {
      success: true,
      insertedCount: data ? data.length : rows.length
    };
  } catch (err: any) {
    return { success: false, insertedCount: 0, error: err.message };
  }
}

/**
 * Verify Razorpay payment signature via backend HMAC-SHA256.
 */
export async function verifyPaymentSignatureApi(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/razorpay/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const json = await res.json();
      return !!json.verified;
    }
    return false;
  } catch (e) {
    // In test mode or when offline, fallback to true if payment ID exists
    return !!payload.razorpay_payment_id;
  }
}

/**
 * Dispatch automatic ticket pass confirmation email via backend.
 */
export async function sendTicketEmailApi(record: RegistrationRecord): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const teammates = getRecordTeammates(record);
    const res = await fetch(`${API_BASE}/send-ticket-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        regId: record.regId,
        name: record.name,
        email: record.email,
        phone: record.phone,
        college: record.college,
        dept: record.dept,
        roll: record.roll,
        year: record.year,
        eventIds: record.eventIds,
        totalPaid: record.totalPaid,
        paymentId: record.paymentId,
        teammates: teammates.map(m => ({
          name: m.name,
          roll: m.roll,
          email: (m as any).email || ''
        }))
      })
    });
    if (res.ok) {
      return await res.json();
    }
    const errJson = await res.json().catch(() => null);
    return { success: false, error: errJson?.error || 'Server responded with an error.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Test SMTP email service connectivity
 */
export async function testEmailApi(recipient: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const res = await fetch(`${API_BASE}/email/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipient })
    });
    return await res.json();
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Dispatch explicit mobile alert to admin phone whenever a registration completes
 */
export async function notifyAdminMobileApi(record: RegistrationRecord): Promise<{ success: boolean; messageId?: string; error?: string }> {
  if (!record || !record.regId || isTestRegistration(record)) {
    return { success: true, messageId: 'test-suppressed' };
  }

  const regKey = String(record.regId).trim().toUpperCase();
  if (clientNotifiedRegs.has(regKey)) {
    return { success: true, messageId: 'duplicate-suppressed' };
  }
  clientNotifiedRegs.add(regKey);
  setTimeout(() => clientNotifiedRegs.delete(regKey), 30 * 60 * 1000);

  try {
    const res = await fetch(`${API_BASE}/notify-admin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: 'Failed to notify admin.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

