import dotenv from 'dotenv';

dotenv.config();

export interface TelegramRegistrationPayload {
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
 * Filter automated testing & security test vectors
 */
export function isTelegramTestPayload(payload: any): boolean {
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

/**
 * Check if Telegram bot is configured in environment
 */
export function isTelegramConfigured(): boolean {
  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();
  return Boolean(token && chatId);
}

/**
 * Format markdown alert message for Telegram
 */
export function formatTelegramAlert(payload: any): string {
  const eventsList = (payload.eventIds || [])
    .map((e: any) => String(e).toUpperCase())
    .join(', ') || 'Symposium Events';

  const mode = (payload.paymentMode || 'UPI').toUpperCase();
  const cleanPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);

  return (
    `🚨 *NEW NEXUSVERSE 2K26 REGISTRATION!* 🚨\n\n` +
    `👤 *Delegate:* ${payload.name || 'Delegate'}\n` +
    `🎓 *Roll No:* \`${payload.roll || 'N/A'}\`\n` +
    `📞 *Phone:* ${cleanPhone ? `+91 ${cleanPhone}` : 'N/A'}\n` +
    `📧 *Email:* ${payload.email || 'N/A'}\n` +
    `🏛️ *College:* ${payload.college || 'NBKRIST'}\n` +
    `📚 *Branch / Year:* ${payload.dept || 'N/A'} (${payload.year || 'Student'})\n` +
    `🎟️ *Events:* *${eventsList}*\n` +
    `💰 *Amount Paid:* *₹${payload.totalPaid || 0}* (${mode})\n` +
    `💳 *Payment Ref:* \`${payload.paymentId || 'N/A'}\`\n` +
    `🆔 *Pass ID:* \`${payload.regId || 'N/A'}\``
  );
}

// Cache of recently notified registration IDs to prevent duplicate alerts
const dispatchedTelegramRegs = new Set<string>();

/**
 * Dispatch instant mobile alert to organizer via Telegram Bot
 */
export async function sendAdminTelegramAlert(payload: any): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!payload || !payload.name) {
    return { success: false, error: 'Registration payload is required.' };
  }

  // Prevent automated testing from spamming Telegram
  if (isTelegramTestPayload(payload)) {
    return { success: true, messageId: 'test-suppressed' };
  }

  if (!isTelegramConfigured()) {
    console.log(`[TELEGRAM NOTICE] Telegram alert skipped. To enable, configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env`);
    return { success: false, error: 'Telegram bot not configured. Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID in .env.' };
  }

  // De-duplication: Ensure each unique registration ID only triggers ONE Telegram alert
  const regKey = String(payload.regId || payload.reg_id || '').trim().toUpperCase();
  if (regKey) {
    if (dispatchedTelegramRegs.has(regKey)) {
      console.log(`[TELEGRAM NOTICE] Suppressed duplicate alert for registration: ${regKey}`);
      return { success: true, messageId: 'duplicate-suppressed' };
    }
    dispatchedTelegramRegs.add(regKey);
    // Keep in de-dup set for 30 minutes, then purge
    setTimeout(() => dispatchedTelegramRegs.delete(regKey), 30 * 60 * 1000).unref();
  }

  const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (process.env.TELEGRAM_CHAT_ID || '').trim();

  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');
  const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(payload.regId || '')}&roll=${encodeURIComponent(payload.roll || '')}`;
  const adminUrl = `${appUrl}/nexusadmin`;

  const cleanPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);

  // Build inline keyboard action buttons
  const keyboardButtons: Array<Array<{ text: string; url: string }>> = [
    [
      { text: '🎟️ View Pass', url: passUrl },
      { text: '🛡️ Admin Center', url: adminUrl }
    ]
  ];

  if (cleanPhone) {
    keyboardButtons.push([
      { text: `💬 WhatsApp Delegate (+91 ${cleanPhone})`, url: `https://wa.me/91${cleanPhone}` }
    ]);
  }

  const telegramPayload = {
    chat_id: chatId,
    text: formatTelegramAlert(payload),
    parse_mode: 'Markdown',
    disable_web_page_preview: false,
    reply_markup: {
      inline_keyboard: keyboardButtons
    }
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(telegramPayload),
      signal: AbortSignal.timeout(12000),
    });

    const data: any = await response.json();
    if (response.ok && data.ok) {
      console.log(`[TELEGRAM SUCCESS] Alert dispatched to chat ID: ${chatId}`);
      return { success: true, messageId: String(data.result?.message_id || '') };
    } else {
      console.warn(`[TELEGRAM WARNING] API responded with error:`, data);
      return { success: false, error: data.description || 'Telegram API error' };
    }
  } catch (err: any) {
    console.error(`[TELEGRAM ERROR] Dispatch failed:`, err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Automatically detect user Chat ID by checking recent messages sent to the bot
 */
export async function detectTelegramChatId(customToken?: string): Promise<{
  success: boolean;
  chatId?: string;
  name?: string;
  username?: string;
  error?: string;
}> {
  const token = (customToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  if (!token) {
    return { success: false, error: 'Telegram Bot Token is required to detect chat ID.' };
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`, {
      signal: AbortSignal.timeout(10000)
    });
    const data: any = await res.json();
    if (!res.ok || !data.ok) {
      return { success: false, error: data.description || 'Failed to fetch updates from Telegram.' };
    }

    const updates = data.result || [];
    if (updates.length === 0) {
      return {
        success: false,
        error: 'No messages received yet. Please open your Telegram bot on your phone and tap "Start" or send any message to it first!'
      };
    }

    // Get the most recent message
    const lastUpdate = updates[updates.length - 1];
    const message = lastUpdate.message || lastUpdate.channel_post || lastUpdate.my_chat_member;
    const chat = message?.chat;

    if (chat && chat.id) {
      return {
        success: true,
        chatId: String(chat.id),
        name: [chat.first_name, chat.last_name].filter(Boolean).join(' ') || chat.title || 'User',
        username: chat.username || ''
      };
    }

    return { success: false, error: 'Could not extract Chat ID from recent updates.' };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Send a test Telegram alert to verify configuration
 */
export async function sendTelegramTestMessage(customChatId?: string, customToken?: string): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  const token = (customToken || process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const chatId = (customChatId || process.env.TELEGRAM_CHAT_ID || '').trim();

  if (!token || !chatId) {
    return {
      success: false,
      error: 'Please enter both Telegram Bot Token and Chat ID to send a test message.'
    };
  }

  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');

  const payload = {
    chat_id: chatId,
    text: (
      `⚡ *NEXUSVERSE 2K26 - TELEGRAM ALERT TEST* ⚡\n\n` +
      `🎉 *Congratulations!* Your Telegram bot is active and connected!\n\n` +
      `Whenever any student registers or completes payment on *NexusVerse 2K26*, you will receive an instant alert here with their Name, Roll Number, Events, and one-tap pass verification buttons.\n\n` +
      `Symposium Date: *29 October 2026*\n` +
      `Host: *IEEE Student Branch · NBKRIST*`
    ),
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [
          { text: '🛡️ Open Admin Center', url: `${appUrl}/nexusadmin` },
          { text: '🌐 Live Website', url: `${appUrl}/register.html` }
        ]
      ]
    }
  };

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(10000),
    });

    const data: any = await response.json();
    if (response.ok && data.ok) {
      return {
        success: true,
        message: 'Telegram test alert sent successfully! Check your Telegram app now.'
      };
    } else {
      return {
        success: false,
        error: data.description || 'Failed to send Telegram message.'
      };
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
