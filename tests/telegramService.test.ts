import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  formatTelegramAlert, 
  isTelegramConfigured, 
  sendAdminTelegramAlert, 
  isTelegramTestPayload 
} from '../server/telegramService.ts';

describe('Telegram Mobile Alert Service Unit Tests', () => {
  it('should identify test payloads correctly to avoid spamming real phones', () => {
    assert.equal(isTelegramTestPayload({ name: 'Prototype Tester' }), true);
    assert.equal(isTelegramTestPayload({ roll: 'TEST-01' }), true);
    assert.equal(isTelegramTestPayload({ email: 'user@example.com' }), true);
    assert.equal(isTelegramTestPayload({ name: 'K. Guravaiah', roll: '2203A51001', email: 'guravaiah@nbkrist.org' }), false);
  });

  it('should format telegram message with emojis, bold markdown, and amounts', () => {
    const payload = {
      regId: 'NV26-TG-01',
      name: 'K. Guravaiah',
      roll: '2203A51001',
      phone: '9491501919',
      email: 'guravaiah@nbkrist.org',
      college: 'NBKRIST',
      dept: 'ECE',
      year: '4th Year',
      eventIds: ['FLAGHUNT', 'CODE COMBAT'],
      totalPaid: 350,
      paymentMode: 'UPI',
      paymentId: 'UPI-UTR-998877'
    };

    const text = formatTelegramAlert(payload);
    assert.ok(text.includes('NEW NEXUSVERSE 2K26 REGISTRATION'));
    assert.ok(text.includes('K. Guravaiah'));
    assert.ok(text.includes('2203A51001'));
    assert.ok(text.includes('₹350'));
    assert.ok(text.includes('FLAGHUNT, CODE COMBAT'));
    assert.ok(text.includes('UPI-UTR-998877'));
  });

  it('should validate payload before dispatching', async () => {
    const res = await sendAdminTelegramAlert(null);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Registration payload is required'));
  });

  it('should gracefully handle unconfigured bot tokens without throwing', async () => {
    const prevToken = process.env.TELEGRAM_BOT_TOKEN;
    const prevChat = process.env.TELEGRAM_CHAT_ID;

    try {
      delete process.env.TELEGRAM_BOT_TOKEN;
      delete process.env.TELEGRAM_CHAT_ID;

      assert.equal(isTelegramConfigured(), false);

      const res = await sendAdminTelegramAlert({
        regId: 'NV26-REAL-02',
        name: 'K. Rithika',
        roll: '2203A51099',
        email: 'rithika@nbkrist.org',
        totalPaid: 200,
        eventIds: ['paper']
      });

      assert.equal(res.success, false);
      assert.ok(res.error?.includes('not configured'));
    } finally {
      if (prevToken !== undefined) process.env.TELEGRAM_BOT_TOKEN = prevToken;
      if (prevChat !== undefined) process.env.TELEGRAM_CHAT_ID = prevChat;
    }
  });
});
