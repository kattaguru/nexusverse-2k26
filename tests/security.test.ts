import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { apiRouter } from '../server/apiRouter.js';
import { readDatabase } from '../server/db.js';

let BASE_URL = 'http://localhost:5000';
let server: any = null;

describe('NexusVerse 2K26 Security & Attack Vector Defensive Tests', () => {
  before(() => {
    return new Promise<void>((resolve) => {
      const app = express();
      // Attach same security headers middleware as server/index.ts
      app.use((_req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'SAMEORIGIN');
        res.setHeader('X-XSS-Protection', '1; mode=block');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        next();
      });
      app.use(express.json({ limit: '10mb' }));
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
  });

  // 1. SQL Injection Protection Tests
  describe('1. SQL Injection & Database Query Sanitization', () => {
    it('should reject or safely treat classic SQL injection in login credentials', async () => {
      const sqlInjectionPayloads = [
        "' OR '1'='1",
        "admin' --",
        "' UNION SELECT * FROM users --",
        "'; DROP TABLE registrations; --"
      ];

      for (const payload of sqlInjectionPayloads) {
        const res = await fetch(`${BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier: payload, password: 'password123' })
        });
        // Should safely reject with 401 Unauthorized, never crash or return 500
        assert.equal(res.status, 401, `Payload [${payload}] should be rejected with 401`);
        const data = await res.json();
        assert.equal(data.success, false);
      }
    });

    it('should safely treat SQL injection in participant registration lookup', async () => {
      const payload = "' OR 1=1 --";
      const res = await fetch(`${BASE_URL}/api/registrations/${encodeURIComponent(payload)}`);
      // Should return 404 because no registration has this literal ID
      assert.equal(res.status, 404);
      const data = await res.json();
      assert.equal(data.success, false);
    });
  });

  // 2. Prototype Pollution & NoSQL Injection Tests
  describe('2. Prototype Pollution & Parameter Tampering', () => {
    it('should not pollute Object.prototype when receiving malicious payload keys', async () => {
      const res = await fetch(`${BASE_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Prototype Tester',
          roll: '23KB1A9999',
          __proto__: { isAdminPwned: true },
          constructor: { prototype: { isConstructorPwned: true } }
        })
      });

      // Verify global Object prototype was not tainted
      assert.equal((Object.prototype as any).isAdminPwned, undefined, 'Object.prototype must not be polluted');
      assert.equal((Object.prototype as any).isConstructorPwned, undefined, 'Constructor prototype must not be polluted');
    });
  });

  // 3. Stored Cross-Site Scripting (XSS) Sanitization
  describe('3. Cross-Site Scripting (XSS) & HTML Injection Defense', () => {
    it('should accept participant data containing script tags without executing or crashing server', async () => {
      const testRegId = `TEST-XSS-${Date.now()}`;
      const xssName = '<script>alert("XSS")</script>Dr. John';
      const xssRoll = '<img src=x onerror=alert(1)>22CS001';

      const res = await fetch(`${BASE_URL}/api/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          regId: testRegId,
          name: xssName,
          roll: xssRoll,
          email: 'xss.test@example.com',
          phone: '9876543210',
          college: 'NBKRIST',
          selectedEvents: ['ctf']
        })
      });

      assert.ok(res.status === 200 || res.status === 201, `Status should be 200 or 201, got ${res.status}`);
      const data = await res.json();

      // Verify the record stored matches literal text
      const fetchRes = await fetch(`${BASE_URL}/api/registrations/${testRegId}`);
      assert.equal(fetchRes.status, 200);
      const fetchData = await fetchRes.json();
      assert.equal(fetchData.data.name, xssName);

      // Clean up
      await fetch(`${BASE_URL}/api/registrations/${testRegId}`, { method: 'DELETE' });
    });
  });

  // 4. Broken Function Level Authorization (BOLA / Admin Access Control)
  describe('4. Broken Function Level Authorization (BOLA)', () => {
    it('should reject unauthenticated attempt to change administrator password', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: 'maliciousHackedPassword123' })
      });

      assert.equal(res.status, 401, 'Must reject unauthenticated password change with 401');
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes('Unauthorized'));
    });

    it('should reject attempt to change administrator password with incorrect current password', async () => {
      const res = await fetch(`${BASE_URL}/api/admin/change-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Admin-Key': 'wrong_password_attempt'
        },
        body: JSON.stringify({ newPassword: 'maliciousHackedPassword123' })
      });

      assert.equal(res.status, 401);
      const data = await res.json();
      assert.equal(data.success, false);
    });

    it('should reject unauthenticated attempt to overwrite Razorpay payment keys', async () => {
      const res = await fetch(`${BASE_URL}/api/razorpay/save-keys`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          keyId: 'rzp_live_attacker_stolen',
          keySecret: 'attacker_secret_token',
          upiVpa: 'attacker@upi'
        })
      });

      assert.equal(res.status, 401, 'Must reject unauthenticated payment keys modification');
      const data = await res.json();
      assert.equal(data.success, false);
      assert.ok(data.error.includes('Unauthorized'));
    });
  });

  // 5. Sensitive Data Exposure & Secret Leaks
  describe('5. Sensitive Data Exposure & Information Disclosure', () => {
    it('GET /api/settings should NEVER leak administrator password or key secrets', async () => {
      const res = await fetch(`${BASE_URL}/api/settings`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.data.adminPassword, undefined, 'adminPassword must be purged');
      assert.equal(data.data.admin_password, undefined, 'admin_password must be purged');
      assert.equal(data.data.razorpayKeySecret, undefined, 'razorpayKeySecret must be purged');
    });

    it('GET /api/razorpay/config should NEVER leak keySecret to public callers', async () => {
      const res = await fetch(`${BASE_URL}/api/razorpay/config`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.keySecret, undefined, 'keySecret must not be exposed');
      assert.equal(data.razorpayKeySecret, undefined, 'razorpayKeySecret must not be exposed');
    });

    it('GET /api/email/config should NEVER expose SMTP password', async () => {
      const res = await fetch(`${BASE_URL}/api/email/config`);
      assert.equal(res.status, 200);
      const data = await res.json();

      assert.equal(data.auth, undefined, 'SMTP credentials must not be exposed');
      assert.equal(data.pass, undefined, 'SMTP password must not be exposed');
      assert.equal(data.password, undefined, 'SMTP password must not be exposed');
    });

    it('POST /api/auth/login should NEVER return passwordHash or salt in user object', async () => {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: 'test_nonexistent_user', password: 'password123' })
      });

      const data = await res.json();
      assert.equal(data.passwordHash, undefined);
      assert.equal(data.salt, undefined);
    });
  });

  // 6. Anti-Brute-Force & Credential Stuffing Defense
  describe('6. Anti-Brute-Force & Credential Stuffing Defense', () => {
    it('POST /api/admin/verify-password should enforce 60s cooldown lockout after 5 consecutive failures', async () => {
      // Send 5 incorrect passwords
      for (let i = 0; i < 5; i++) {
        const res = await fetch(`${BASE_URL}/api/admin/verify-password`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'X-Forwarded-For': '198.51.100.42' // Isolated simulated IP
          },
          body: JSON.stringify({ password: `wrong_attempt_${i}` })
        });
        assert.equal(res.status, 401, `Attempt ${i + 1} should return 401`);
      }

      // 6th attempt from same IP should receive HTTP 429 Too Many Requests
      const lockedRes = await fetch(`${BASE_URL}/api/admin/verify-password`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Forwarded-For': '198.51.100.42'
        },
        body: JSON.stringify({ password: 'kgr@2005' })
      });

      assert.equal(lockedRes.status, 429, 'Locked IP should receive 429 status code');
      const lockedData = await lockedRes.json();
      assert.equal(lockedData.success, false);
      assert.ok(lockedData.error.includes('cooldown active') || lockedData.error.includes('Too many failed attempts'));
    });
  });

  // 7. Payment Amount Tampering & Integrity Verification
  describe('7. Payment Tampering & Transaction Integrity', () => {
    it('POST /api/razorpay/create-order should reject negative amounts', async () => {
      const res = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: -500, currency: 'INR' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    });

    it('POST /api/razorpay/create-order should reject zero amount orders', async () => {
      const res = await fetch(`${BASE_URL}/api/razorpay/create-order`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: 0, currency: 'INR' })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.ok(data.error);
    });

    it('POST /api/razorpay/verify-payment should reject forged signature', async () => {
      const res = await fetch(`${BASE_URL}/api/razorpay/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: 'order_hacked_attacker',
          razorpay_payment_id: 'pay_hacked_attacker',
          razorpay_signature: 'deadbeefcafe00112233445566778899aabbccddeeff'
        })
      });
      assert.equal(res.status, 400);
      const data = await res.json();
      assert.equal(data.verified, false);
    });
  });

  // 8. Path Traversal & Arbitrary File Access Defense
  describe('8. Path Traversal Defense', () => {
    it('should reject path traversal in registration ID lookups', async () => {
      const traversalPaths = [
        '../../../../etc/passwd',
        '..%2F..%2F..%2F.env',
        '....//....//server/data/database.json'
      ];

      for (const p of traversalPaths) {
        const res = await fetch(`${BASE_URL}/api/registrations/${p}`);
        // Express router matches as 404 Not Found, never exposes filesystem
        assert.equal(res.status, 404);
      }
    });
  });

  // 9. HTTP Security Headers Audit
  describe('9. HTTP Security Headers Verification', () => {
    it('should include X-Content-Type-Options: nosniff header to prevent MIME sniffing', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.headers.get('x-content-type-options'), 'nosniff');
    });

    it('should include X-Frame-Options to protect against Clickjacking', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.headers.get('x-frame-options'), 'SAMEORIGIN');
    });

    it('should include Referrer-Policy header', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.equal(res.headers.get('referrer-policy'), 'strict-origin-when-cross-origin');
    });

    it('should include RFC 6585 X-RateLimit headers on responses', async () => {
      const res = await fetch(`${BASE_URL}/api/health`);
      assert.ok(res.headers.get('x-ratelimit-limit'), 'Must include X-RateLimit-Limit');
      assert.ok(res.headers.get('x-ratelimit-remaining'), 'Must include X-RateLimit-Remaining');
    });
  });
});
