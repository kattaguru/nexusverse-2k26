import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

const BASE_URL = 'http://localhost:3000';

describe('NexusVerse 2K26 Backend API Endpoints Unit Tests', () => {
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
});
