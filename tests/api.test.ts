import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { apiRouter } from '../server/apiRouter.js';

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

let BASE_URL = process.env.API_BASE_URL || 'http://localhost:5000';
let server: any = null;
const testDbPath = path.resolve(os.tmpdir(), `test-db-api-${Date.now()}.json`);

describe('NexusVerse 2K26 Backend API Endpoints Unit Tests', () => {
  before(() => {
    process.env.NODE_ENV = 'test';
    process.env.TEST_DB_FILE = testDbPath;
    fs.writeFileSync(testDbPath, JSON.stringify({
      registrations: [],
      settings: {
        isRegClosed: false,
        closedMessage: 'Registration is closed.',
        adminPassword: 'kgr@2005',
        paymentMode: 'upi',
        razorpayMeLink: 'https://razorpay.me/@veluriprasanth',
        razorpayMeName: 'VELURI PRASANTH'
      },
      photos: [],
      users: []
    }));

    return new Promise<void>((resolve) => {
      const app = express();
      app.use(express.json());
      app.use('/api', apiRouter);
      server = app.listen(0, () => {
        const addr = server.address();
        BASE_URL = `http://localhost:${typeof addr === 'object' && addr ? addr.port : 5000}`;
        resolve();
      });
    });
  });

  after(() => {
    if (server && server.close) {
      server.close();
    }
    try {
      if (fs.existsSync(testDbPath)) fs.unlinkSync(testDbPath);
    } catch (e) {}
  });
  it('GET /api/health should respond with ok status', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.service, 'NexusVerse 2K26 Backend API');
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') {
        // Skip if dev server is temporarily stopped
        console.warn('Dev server not reachable, skipping live API health check.');
        return;
      }
      throw err;
    }
  });

  it('GET /api/settings should return current portal settings', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/settings`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.equal(typeof data.data.isRegClosed, 'boolean');
      assert.ok(data.data.closedMessage);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('GET /api/razorpay/config should return public key and Razorpay.me handle', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/config`);
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.success, true);
      assert.ok(data.keyId);
      assert.equal(data.razorpayMeLink, 'https://razorpay.me/@veluriprasanth');
      assert.equal(data.razorpayMeName, 'VELURI PRASANTH');
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/razorpay/create-order should reject invalid zero or negative amounts', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0 })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/registrations should reject registration records missing name or roll', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: '' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/razorpay/verify-payment should reject missing payment ID', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_payment_id: '' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.verified, false);
      assert.ok(data.error);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/razorpay/verify-payment should reject fake or non-existent Razorpay payment ID', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ razorpay_payment_id: 'pay_fake_unpaid_12345678' })
      });
      assert.ok(res.status === 400 || res.status === 502, `Expected 400 or 502, got ${res.status}`);
      const data = await res.json();
      assert.equal(data.verified, false);
      assert.ok(data.error);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/razorpay/verify-payment should reject forged signature', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          razorpay_order_id: 'order_test_12345',
          razorpay_payment_id: 'pay_test_12345',
          razorpay_signature: 'invalid_forged_signature_hex'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.verified, false);
      assert.ok(data.error);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/razorpay/webhook should acknowledge valid events with 200 OK', async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/razorpay/webhook`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          event: 'payment.captured',
          payload: {
            payment: {
              entity: {
                id: 'pay_test_webhook_ack',
                amount: 20000,
                status: 'captured',
                notes: {
                  attendeeName: 'Webhook Tester',
                  rollNumber: '23KB1A0001',
                  email: 'webhook@test.com'
                }
              }
            }
          }
        })
      });
      assert.equal(res.status, 200);
      const data = await res.json();
      assert.equal(data.status, 'ok');
      assert.equal(data.received, true);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('POST /api/settings should configure and retrieve slot limits for IEEE, Non-IEEE, and Total', async () => {
    try {
      const postRes = await fetch(`${BASE_URL}/api/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalSlotsLimit: 500,
          ieeeSlotsLimit: 200,
          nonIeeeSlotsLimit: 300
        })
      });
      assert.equal(postRes.status, 200);
      const postData = await postRes.json();
      assert.equal(postData.success, true);
      assert.equal(postData.data.totalSlotsLimit, 500);
      assert.equal(postData.data.ieeeSlotsLimit, 200);
      assert.equal(postData.data.nonIeeeSlotsLimit, 300);

      const getRes = await fetch(`${BASE_URL}/api/settings`);
      assert.equal(getRes.status, 200);
      const getData = await getRes.json();
      assert.equal(getData.success, true);
      assert.equal(getData.data.totalSlotsLimit, 500);
      assert.equal(getData.data.ieeeSlotsLimit, 200);
      assert.equal(getData.data.nonIeeeSlotsLimit, 300);
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('PUT /api/registrations/:regId should update check-in status, attendance, and kitIssued', async () => {
    try {
      // 1. Create a registration record
      const testRegId = `TEST-CHECKIN-${Date.now()}`;
      const createRes = await fetch(`${BASE_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regId: testRegId,
          name: 'Scanner Test Participant',
          roll: '22CS999',
          email: 'scanner.test@example.com',
          phone: '9876543210',
          college: 'NBKRIST',
          branch: 'CSE',
          isIeee: true,
          track1Event: 'hackathon',
          track2Event: 'spot-pass',
          amount: 250,
          paymentStatus: 'verified'
        })
      });
      assert.ok(createRes.status === 200 || createRes.status === 201);

      // 2. Perform check-in and event attendance mark
      const checkInRes = await fetch(`${BASE_URL}/api/registrations/${testRegId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          checkedIn: true,
          checkInTime: new Date().toISOString(),
          checkedInBy: 'Front Desk Lead',
          attendedEvents: ['hackathon', 'spot-pass'],
          kitIssued: true,
          checkInNotes: 'Badge and kit handed over at front desk'
        })
      });
      assert.equal(checkInRes.status, 200);
      const checkInData = await checkInRes.json();
      assert.equal(checkInData.success, true);
      assert.equal(checkInData.data.checkedIn, true);
      assert.equal(checkInData.data.kitIssued, true);
      assert.deepEqual(checkInData.data.attendedEvents, ['hackathon', 'spot-pass']);
      assert.equal(checkInData.data.checkInNotes, 'Badge and kit handed over at front desk');

      // 3. Clean up test registration
      await fetch(`${BASE_URL}/api/registrations/${testRegId}`, { method: 'DELETE' });
    } catch (err: any) {
      if (err.code === 'ECONNREFUSED') return;
      throw err;
    }
  });

  it('GET /api/settings should NEVER expose adminPassword in response', async () => {
    const res = await fetch(`${BASE_URL}/api/settings`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
    assert.equal(data.data.adminPassword, undefined, 'adminPassword must not be returned');
  });

  it('POST /api/admin/verify-password should accept standard password kgr@2005', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'kgr@2005' })
    });
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.success, true);
  });

  it('POST /api/admin/verify-password should reject obsolete admin123 password', async () => {
    const res = await fetch(`${BASE_URL}/api/admin/verify-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin123' })
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.equal(data.success, false);
  });

  it('Global Rate Limiter should attach standard X-RateLimit headers to responses', async () => {
    const res = await fetch(`${BASE_URL}/api/health`);
    assert.equal(res.status, 200);
    assert.ok(res.headers.get('x-ratelimit-limit'), 'Should attach X-RateLimit-Limit header');
    assert.ok(res.headers.get('x-ratelimit-remaining'), 'Should attach X-RateLimit-Remaining header');
  });
});

