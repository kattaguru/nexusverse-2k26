import dotenv from 'dotenv';

dotenv.config();

export interface NtfyRegistrationPayload {
  regId: string;
  name: string;
  roll: string;
  email: string;
  phone?: string;
  college?: string;
  dept?: string;
  year?: string;
  eventIds: string[];
  totalPaid: number;
  paymentMode?: string;
  paymentId?: string;
  timestamp?: string;
}

export const DEFAULT_NTFY_TOPIC = 'nexusverse-kgr-alerts';

/**
 * Get the currently configured or default ntfy topic
 */
export function getNtfyTopic(): string {
  const custom = (process.env.NTFY_TOPIC || '').trim().replace(/^https?:\/\/ntfy\.sh\//, '');
  return custom || DEFAULT_NTFY_TOPIC;
}

/**
 * Check if ntfy push notifications are enabled
 */
export function isNtfyConfigured(): boolean {
  return Boolean(getNtfyTopic());
}

/**
 * Check if a registration payload is an automated test, mock or attack test vector
 */
export function isTestPayload(payload: any): boolean {
  if (!payload) return false;
  const id = String(payload.regId || payload.reg_id || '').toUpperCase();
  const name = String(payload.name || '').toLowerCase();
  const roll = String(payload.roll || '').toLowerCase();
  const email = String(payload.email || '').toLowerCase();

  return (
    id.startsWith('TEST-') ||
    id.startsWith('CAMPUS-') ||
    id.startsWith('NV26-UNIT-') ||
    name.includes('prototype tester') ||
    name.includes('unit tester') ||
    name.includes('security test') ||
    name.includes('<script') ||
    roll.includes('test') ||
    roll.includes('<img') ||
    email.includes('example.com')
  );
}

// Cache of recently notified registration IDs to prevent duplicate alerts
const dispatchedNtfyRegs = new Set<string>();

/**
 * Dispatch instant mobile push notification via ntfy.sh JSON publishing API
 * Completely free, no account or API keys required.
 */
export async function sendAdminNtfyAlert(payload: any): Promise<{
  success: boolean;
  topic?: string;
  error?: string;
}> {
  if (!payload || !payload.name) {
    return { success: false, error: 'Registration payload is required.' };
  }

  // Prevent automated testing and security test suites from spamming organizer's phone
  if (isTestPayload(payload)) {
    console.log(`[NTFY NOTICE] Suppressed test registration push alert for: ${payload.name}`);
    return { success: true, topic: 'test-suppressed' };
  }

  // De-duplication: Ensure each unique registration ID only triggers ONE ntfy alert
  const regKey = String(payload.regId || payload.reg_id || '').trim().toUpperCase();
  if (regKey) {
    if (dispatchedNtfyRegs.has(regKey)) {
      console.log(`[NTFY NOTICE] Suppressed duplicate alert for registration: ${regKey}`);
      return { success: true, topic: 'duplicate-suppressed' };
    }
    dispatchedNtfyRegs.add(regKey);
    setTimeout(() => dispatchedNtfyRegs.delete(regKey), 30 * 60 * 1000).unref();
  }

  const topic = getNtfyTopic();
  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');
  const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(payload.regId || '')}&roll=${encodeURIComponent(payload.roll || '')}`;
  const adminUrl = `${appUrl}/nexusadmin`;

  const eventsList = (payload.eventIds || [])
    .map((e: any) => String(e).toUpperCase())
    .join(', ') || 'Symposium Events';

  const mode = (payload.paymentMode || 'UPI').toUpperCase();
  const cleanPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);

  const title = `🚨 New Registration: ${payload.name} (${payload.roll})`;
  const body = 
    `${payload.name} (${payload.dept || 'Student'}, ${payload.college || 'NBKRIST'})\n` +
    `Paid ₹${payload.totalPaid || 0} (${mode}) for ${eventsList}\n` +
    `Pass: ${payload.regId} · Ref: ${payload.paymentId || 'N/A'}`;

  // Build ntfy action buttons
  const actions: Array<{ action: string; label: string; url: string }> = [
    { action: 'view', label: '🎟️ View Pass', url: passUrl },
    { action: 'view', label: '🛡️ Admin Center', url: adminUrl }
  ];
  if (cleanPhone) {
    actions.push({ action: 'view', label: '💬 WhatsApp', url: `https://wa.me/91${cleanPhone}` });
  }

  const ntfyPayload = {
    topic,
    title,
    message: body,
    priority: 4, // High priority triggers instant banner + sound
    tags: ['tada', 'dollar', 'admission_tickets', 'sparkles'],
    click: passUrl,
    actions,
  };

  try {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ntfyPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      console.log(`[NTFY SUCCESS] Mobile push alert dispatched to topic: ${topic}`);
      return { success: true, topic };
    } else {
      const errText = await response.text();
      console.warn(`[NTFY WARNING] Push alert returned ${response.status}: ${errText}`);
      return { success: false, error: `ntfy responded with ${response.status}: ${errText}` };
    }
  } catch (err: any) {
    console.error(`[NTFY ERROR] Failed to dispatch push alert:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a test push notification to verify phone reception
 */
export async function sendNtfyTestMessage(customTopic?: string): Promise<{
  success: boolean;
  topic?: string;
  message?: string;
  error?: string;
}> {
  const topic = customTopic?.trim() || getNtfyTopic();
  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');

  const testPayload = {
    topic,
    title: '⚡ NexusVerse 2K26 Test Alert',
    message: 'Push notifications are working! You will receive an instant banner alert on your phone whenever anyone registers or pays.',
    priority: 5, // Urgent priority
    tags: ['sparkles', 'bell', 'shield'],
    click: `${appUrl}/nexusadmin`,
    actions: [
      { action: 'view', label: '🛡️ Open Admin Center', url: `${appUrl}/nexusadmin` }
    ]
  };

  try {
    const response = await fetch('https://ntfy.sh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPayload),
      signal: AbortSignal.timeout(10000),
    });

    if (response.ok) {
      return {
        success: true,
        topic,
        message: `Push alert sent to topic "${topic}"! Check your phone now.`
      };
    } else {
      const errText = await response.text();
      return { success: false, error: `ntfy server error: ${errText}` };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
