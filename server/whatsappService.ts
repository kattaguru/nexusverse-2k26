import dotenv from 'dotenv';

dotenv.config();

export interface WhatsAppRegistrationPayload {
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

/**
 * Format phone number to clean international format (e.g. "919491501919" or "+919491501919")
 */
export function sanitizePhoneNumber(phoneStr: string): string {
  if (!phoneStr) return '';
  const digits = phoneStr.replace(/\D/g, '');
  // If 10 digits (Indian standard without country code), prepend 91
  if (digits.length === 10) {
    return `91${digits}`;
  }
  return digits;
}

/**
 * Check if WhatsApp alert service is configured in environment
 */
export function isWhatsAppConfigured(): boolean {
  // Option A: CallMeBot Free API
  const phone = (process.env.WHATSAPP_ADMIN_PHONE || '').trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || '').trim();
  if (phone && apiKey) return true;

  // Option B: Twilio WhatsApp
  const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const twilioToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
  if (twilioSid && twilioToken && twilioNumber && phone) return true;

  // Option C: Generic Webhook / Gateway URL
  const webhookUrl = (process.env.WHATSAPP_WEBHOOK_URL || '').trim();
  if (webhookUrl) return true;

  return false;
}

/**
 * Format a high-impact, easy-to-read WhatsApp message with emojis and quick links
 */
export function formatWhatsAppAlert(payload: WhatsAppRegistrationPayload): string {
  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');
  const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(payload.regId || '')}&roll=${encodeURIComponent(payload.roll || '')}`;
  const adminUrl = `${appUrl}/nexusadmin`;

  const eventsList = (payload.eventIds || [])
    .map((e) => String(e).toUpperCase())
    .join(', ') || 'Symposium Events';

  const mode = (payload.paymentMode || 'UPI').toUpperCase();
  const cleanPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);

  return (
    `🚨 *NEW NEXUSVERSE 2K26 REGISTRATION!* 🚨\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `👤 *Delegate:* ${payload.name || 'Delegate'}\n` +
    `🎓 *Roll No:* ${payload.roll || 'N/A'}\n` +
    `📞 *Phone:* ${cleanPhone ? `+91 ${cleanPhone}` : 'N/A'}\n` +
    `📧 *Email:* ${payload.email || 'N/A'}\n` +
    `🏛️ *College:* ${payload.college || 'NBKRIST'}\n` +
    `📚 *Branch / Year:* ${payload.dept || 'N/A'} (${payload.year || 'Student'})\n` +
    `🎟️ *Events:* ${eventsList}\n` +
    `💰 *Amount Paid:* ₹${payload.totalPaid || 0} (${mode})\n` +
    `💳 *Payment Ref:* ${payload.paymentId || 'N/A'}\n` +
    `🆔 *Pass ID:* ${payload.regId || 'N/A'}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━\n` +
    `🔗 *View Pass:* ${passUrl}\n` +
    `🛡️ *Admin Portal:* ${adminUrl}`
  );
}

// Cache of recently notified registration IDs to prevent duplicate alerts
const dispatchedWhatsAppRegs = new Set<string>();

/**
 * Dispatch instant WhatsApp alert using CallMeBot, Twilio, or Webhook
 */
export async function sendAdminWhatsAppAlert(payload: any): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!payload || !payload.name) {
    return { success: false, error: 'Registration payload is required.' };
  }

  // Prevent automated testing and security test suites from dispatching to admin WhatsApp
  const id = String(payload.regId || payload.reg_id || '').toUpperCase();
  const name = String(payload.name || '').toLowerCase();
  const roll = String(payload.roll || '').toLowerCase();
  const email = String(payload.email || '').toLowerCase();
  if (
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
  ) {
    console.log(`[WHATSAPP NOTICE] Suppressed test registration alert for: ${payload.name}`);
    return { success: true, messageId: 'test-suppressed' };
  }

  // De-duplication: Ensure each unique registration ID only triggers ONE WhatsApp alert
  const regKey = String(payload.regId || payload.reg_id || '').trim().toUpperCase();
  if (regKey) {
    if (dispatchedWhatsAppRegs.has(regKey)) {
      console.log(`[WHATSAPP NOTICE] Suppressed duplicate alert for registration: ${regKey}`);
      return { success: true, messageId: 'duplicate-suppressed' };
    }
    dispatchedWhatsAppRegs.add(regKey);
    setTimeout(() => dispatchedWhatsAppRegs.delete(regKey), 30 * 60 * 1000).unref();
  }

  const phone = (process.env.WHATSAPP_ADMIN_PHONE || '9491501919').trim();
  const apiKey = (process.env.WHATSAPP_API_KEY || '').trim();
  const messageText = formatWhatsAppAlert(payload);

  // 1. Check Generic Webhook
  const webhookUrl = (process.env.WHATSAPP_WEBHOOK_URL || '').trim();
  if (webhookUrl) {
    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: sanitizePhoneNumber(phone),
          message: messageText,
          payload,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (response.ok) {
        console.log(`[WHATSAPP SUCCESS] Webhook dispatched to ${webhookUrl}`);
        return { success: true, messageId: 'webhook-success' };
      }
      const errText = await response.text();
      console.warn(`[WHATSAPP WARNING] Webhook failed: ${response.status} - ${errText}`);
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Webhook call failed:`, err.message);
    }
  }

  // 2. Check Twilio WhatsApp
  const twilioSid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
  const twilioToken = (process.env.TWILIO_AUTH_TOKEN || '').trim();
  const twilioNumber = (process.env.TWILIO_WHATSAPP_NUMBER || '').trim();
  if (twilioSid && twilioToken && twilioNumber) {
    try {
      const cleanTo = sanitizePhoneNumber(phone);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
      const authHeader = 'Basic ' + Buffer.from(`${twilioSid}:${twilioToken}`).toString('base64');
      
      const bodyParams = new URLSearchParams();
      bodyParams.append('From', `whatsapp:${twilioNumber}`);
      bodyParams.append('To', `whatsapp:+${cleanTo}`);
      bodyParams.append('Body', messageText);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: bodyParams.toString(),
        signal: AbortSignal.timeout(12000),
      });

      const data: any = await response.json();
      if (response.ok && data.sid) {
        console.log(`[WHATSAPP SUCCESS] Twilio alert sent to ${phone} (SID: ${data.sid})`);
        return { success: true, messageId: data.sid };
      } else {
        console.error(`[WHATSAPP ERROR] Twilio failed:`, data);
        return { success: false, error: data.message || 'Twilio error' };
      }
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] Twilio request failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // 3. CallMeBot Free API (Default)
  if (apiKey) {
    try {
      const cleanPhone = sanitizePhoneNumber(phone);
      // CallMeBot endpoint: https://api.callmebot.com/whatsapp.php?phone=[phone]&text=[text]&apikey=[apiKey]
      const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(cleanPhone)}&text=${encodeURIComponent(messageText)}&apikey=${encodeURIComponent(apiKey)}`;

      const response = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(15000),
      });

      const responseText = await response.text();
      if (response.ok && (responseText.includes('Message queued') || responseText.includes('success') || responseText.includes('OK') || response.status === 200)) {
        console.log(`[WHATSAPP SUCCESS] CallMeBot alert sent to ${cleanPhone}`);
        return { success: true, messageId: 'callmebot-queued' };
      } else {
        console.warn(`[WHATSAPP WARNING] CallMeBot responded with: ${responseText}`);
        return { success: false, error: responseText };
      }
    } catch (err: any) {
      console.error(`[WHATSAPP ERROR] CallMeBot dispatch failed:`, err.message);
      return { success: false, error: err.message };
    }
  }

  // If not configured, log notice for organizers without crashing
  console.log(`[WHATSAPP NOTICE] WhatsApp alert skipped. To enable, configure WHATSAPP_API_KEY in .env`);
  return {
    success: false,
    error: 'WhatsApp alerts not configured. Set WHATSAPP_ADMIN_PHONE and WHATSAPP_API_KEY in .env.'
  };
}

/**
 * Send a test WhatsApp message to verify the configuration
 */
export async function sendWhatsAppTestMessage(targetPhone?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const phone = targetPhone || process.env.WHATSAPP_ADMIN_PHONE || '9491501919';
  const testPayload: WhatsAppRegistrationPayload = {
    regId: 'TEST-NEXUS-01',
    name: 'Vamsi / Admin Tester',
    roll: 'TEST-COORD-01',
    email: 'kattaguravaiah39@gmail.com',
    phone: phone,
    college: 'NBKRIST',
    dept: 'ECE / Organizing Committee',
    year: '4th Year',
    eventIds: ['FLAGHUNT', 'CODE COMBAT'],
    totalPaid: 250,
    paymentMode: 'UPI Test',
    paymentId: 'TEST-UPI-UTR-12345',
  };

  const res = await sendAdminWhatsAppAlert(testPayload);
  if (res.success) {
    return {
      success: true,
      message: `Test WhatsApp message successfully dispatched to ${phone}!`
    };
  } else {
    return {
      success: false,
      error: res.error || 'Failed to dispatch test WhatsApp message. Check your API key and phone number.'
    };
  }
}
