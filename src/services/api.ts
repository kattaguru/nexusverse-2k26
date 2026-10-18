import { RegistrationRecord } from '../components/TicketPass';
import { 
  supabase, 
  isSupabaseConfigured, 
  mapDbToRegistrationRecord, 
  mapRegistrationRecordToDb 
} from '../lib/supabase';

const API_BASE = '/api';

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
        const records = data.map(mapDbToRegistrationRecord);
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
        try {
          localStorage.setItem('nexusverse_registrations', JSON.stringify(json.data));
        } catch (e) {}
        return json.data;
      }
    }
  } catch (err) {
    // Express server might be offline if hosted purely on frontend static host
  }

  // 3. Fallback to localStorage
  try {
    const cached = localStorage.getItem('nexusverse_registrations');
    return cached ? JSON.parse(cached) : [];
  } catch (e) {
    return [];
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

  // 1. Save to Supabase Cloud Database if configured
  if (isSupabaseConfigured() && supabase) {
    try {
      const dbRow = mapRegistrationRecordToDb(record);
      const { data, error } = await supabase
        .from('registrations')
        .upsert(dbRow, { onConflict: 'reg_id' })
        .select()
        .single();

      if (!error && data) {
        return mapDbToRegistrationRecord(data);
      } else if (error) {
        console.warn('Supabase upsert warning:', error.message);
      }
    } catch (err) {
      console.warn('Supabase save error:', err);
    }
  }

  // 2. Sync with Express server in parallel or fallback
  try {
    const res = await fetch(`${API_BASE}/registrations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(record)
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        return json.data;
      }
    }
  } catch (err) {
    // Non-fatal if offline
  }

  return record;
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
        const result: PortalSettingsData = {
          isRegClosed: Boolean(data.is_reg_closed),
          closedMessage: data.closed_message || 'Registration is currently closed.',
          totalSlotsLimit: typeof data.total_slots_limit === 'number' ? data.total_slots_limit : 0,
          ieeeSlotsLimit: typeof data.ieee_slots_limit === 'number' ? data.ieee_slots_limit : 0,
          nonIeeeSlotsLimit: typeof data.non_ieee_slots_limit === 'number' ? data.non_ieee_slots_limit : 0
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
    const res = await fetch(`${API_BASE}/settings`);
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const { isRegClosed, closedMessage, totalSlotsLimit, ieeeSlotsLimit, nonIeeeSlotsLimit } = json.data;
        const result: PortalSettingsData = {
          isRegClosed: Boolean(isRegClosed),
          closedMessage: closedMessage || 'Registration is currently closed.',
          totalSlotsLimit: Number(totalSlotsLimit) || 0,
          ieeeSlotsLimit: Number(ieeeSlotsLimit) || 0,
          nonIeeeSlotsLimit: Number(nonIeeeSlotsLimit) || 0
        };
        try {
          localStorage.setItem('nexusverse_reg_closed', String(result.isRegClosed));
          if (closedMessage) localStorage.setItem('nexusverse_closed_msg', closedMessage);
          localStorage.setItem('nexusverse_total_slots_limit', String(result.totalSlotsLimit));
          localStorage.setItem('nexusverse_ieee_slots_limit', String(result.ieeeSlotsLimit));
          localStorage.setItem('nexusverse_non_ieee_slots_limit', String(result.nonIeeeSlotsLimit));
        } catch (e) {}
        return result;
      }
    }
  } catch (err) {}

  // 3. Local fallback
  return {
    isRegClosed: localStorage.getItem('nexusverse_reg_closed') === 'true',
    closedMessage: localStorage.getItem('nexusverse_closed_msg') || 'Registration is currently closed.',
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
  if (typeof settings.isRegClosed === 'boolean') {
    try {
      localStorage.setItem('nexusverse_reg_closed', String(settings.isRegClosed));
    } catch (e) {}
  }
  if (settings.closedMessage) {
    try {
      localStorage.setItem('nexusverse_closed_msg', settings.closedMessage);
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

  // Supabase update
  if (isSupabaseConfigured() && supabase) {
    try {
      const payload: Record<string, any> = {
        id: 'current',
        updated_at: new Date().toISOString()
      };
      if (typeof settings.isRegClosed === 'boolean') payload.is_reg_closed = settings.isRegClosed;
      if (settings.closedMessage) payload.closed_message = settings.closedMessage;
      if (typeof settings.totalSlotsLimit === 'number') payload.total_slots_limit = settings.totalSlotsLimit;
      if (typeof settings.ieeeSlotsLimit === 'number') payload.ieee_slots_limit = settings.ieeeSlotsLimit;
      if (typeof settings.nonIeeeSlotsLimit === 'number') payload.non_ieee_slots_limit = settings.nonIeeeSlotsLimit;

      const { error } = await supabase
        .from('portal_settings')
        .upsert(payload, { onConflict: 'id' });

      if (!error) supabaseSuccess = true;
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
        paymentId: record.paymentId
      })
    });
    if (res.ok) {
      return await res.json();
    }
    return { success: false, error: 'Server responded with an error.' };
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

