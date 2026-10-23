import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  sanitizePhoneNumber, 
  formatWhatsAppAlert, 
  isWhatsAppConfigured, 
  sendAdminWhatsAppAlert 
} from '../server/whatsappService.ts';

describe('WhatsApp Alert Service Unit Tests', () => {
  it('should sanitize phone numbers correctly for international WhatsApp delivery', () => {
    // 10-digit Indian numbers should get '91' prefix
    assert.equal(sanitizePhoneNumber('9491501919'), '919491501919');
    assert.equal(sanitizePhoneNumber('+91 94915 01919'), '919491501919');
    assert.equal(sanitizePhoneNumber('9441759500'), '919441759500');
    assert.equal(sanitizePhoneNumber('+919441759500'), '919441759500');
    assert.equal(sanitizePhoneNumber(''), '');
  });

  it('should format WhatsApp alert message with complete delegate details and links', () => {
    const payload = {
      regId: 'NEXUS-7788',
      name: 'K. Guravaiah',
      roll: '2203A51001',
      phone: '9491501919',
      email: 'guravaiah@nbkrist.org',
      college: 'NBKRIST',
      dept: 'ECE',
      year: '4th Year',
      eventIds: ['ctf', 'codecombat'],
      totalPaid: 350,
      paymentMode: 'UPI',
      paymentId: 'UPI-UTR-998877',
    };

    const text = formatWhatsAppAlert(payload);
    assert.ok(text.includes('NEXUSVERSE 2K26 REGISTRATION'));
    assert.ok(text.includes('K. Guravaiah'));
    assert.ok(text.includes('2203A51001'));
    assert.ok(text.includes('9491501919'));
    assert.ok(text.includes('₹350'));
    assert.ok(text.includes('UPI-UTR-998877'));
    assert.ok(text.includes('CTF, CODECOMBAT'));
    assert.ok(text.includes('NEXUS-7788'));
  });

  it('should validate registration payload in sendAdminWhatsAppAlert', async () => {
    const res = await sendAdminWhatsAppAlert(null);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Registration payload is required'));

    const resEmpty = await sendAdminWhatsAppAlert({});
    assert.equal(resEmpty.success, false);
    assert.ok(resEmpty.error?.includes('Registration payload is required'));
  });

  it('should gracefully handle unconfigured WhatsApp without crashing server', async () => {
    // If no API key is provided, it should return a friendly error and not throw
    const originalApiKey = process.env.WHATSAPP_API_KEY;
    const originalPhone = process.env.WHATSAPP_ADMIN_PHONE;
    const originalTwilio = process.env.TWILIO_ACCOUNT_SID;
    const originalWebhook = process.env.WHATSAPP_WEBHOOK_URL;

    try {
      delete process.env.WHATSAPP_API_KEY;
      delete process.env.TWILIO_ACCOUNT_SID;
      delete process.env.WHATSAPP_WEBHOOK_URL;
      process.env.WHATSAPP_ADMIN_PHONE = '9491501919';

      assert.equal(isWhatsAppConfigured(), false);

      const res = await sendAdminWhatsAppAlert({
        regId: 'NV26-REAL-01',
        name: 'K. Rithika',
        roll: '2203A51099',
        email: 'rithika@nbkrist.org',
        eventIds: ['ctf'],
        totalPaid: 200
      });

      assert.equal(res.success, false);
      assert.ok(res.error?.includes('not configured'));
    } finally {
      if (originalApiKey !== undefined) process.env.WHATSAPP_API_KEY = originalApiKey;
      if (originalPhone !== undefined) process.env.WHATSAPP_ADMIN_PHONE = originalPhone;
      if (originalTwilio !== undefined) process.env.TWILIO_ACCOUNT_SID = originalTwilio;
      if (originalWebhook !== undefined) process.env.WHATSAPP_WEBHOOK_URL = originalWebhook;
    }
  });
});
