import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import { apiRouter } from '../server/apiRouter.ts';
import { readDatabase, writeDatabase, DEFAULT_DB, DatabaseSchema } from '../server/db.ts';

const app = express();
app.use(express.json());
app.use('/api', apiRouter);

describe('Participant Space & Authentication Unit Tests', () => {
  let server: any;
  let baseUrl: string;
  let initialDbBackup: DatabaseSchema;

  before(async () => {
    initialDbBackup = JSON.parse(JSON.stringify(readDatabase()));
    // Seed with a sample registration
    const testDb = readDatabase();
    testDb.users = [];
    testDb.registrations = [
      {
        regId: 'NV26-AUTH01',
        paymentId: 'pay_auth_test_1',
        name: 'Vamsi Krishna',
        email: 'vamsi.test@example.com',
        phone: '9876543210',
        college: 'N.B.K.R. Institute of Science & Technology',
        roll: '23KB1A0501',
        eventIds: ['ctf'],
        totalPaid: 200,
        timestamp: new Date().toISOString()
      }
    ];
    writeDatabase(testDb);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = server.address().port;
        baseUrl = `http://localhost:${port}/api`;
        resolve();
      });
    });
  });

  after(async () => {
    writeDatabase(initialDbBackup);
    if (server) {
      await new Promise<void>((resolve) => server.close(resolve));
    }
  });

  it('should register a new participant with name, email, username, and password', async () => {
    const res = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Vamsi Krishna',
        email: 'vamsi.test@example.com',
        username: 'vamsik26',
        password: 'securePass123',
        phone: '9876543210',
        roll: '23KB1A0501',
        college: 'N.B.K.R. Institute of Science & Technology'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.email, 'vamsi.test@example.com');
    assert.equal(data.user.username, 'vamsik26');
    assert.equal(data.user.passwordHash, undefined, 'passwordHash must never be exposed');
    
    // Check auto-linking of existing registrations
    assert.ok(Array.isArray(data.registrations));
    assert.equal(data.registrations.length, 1);
    assert.equal(data.registrations[0].regId, 'NV26-AUTH01');
  });

  it('should prevent registration with duplicate email or username', async () => {
    // Duplicate email
    const res1 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Tester',
        email: 'vamsi.test@example.com',
        username: 'newuser99',
        password: 'password123'
      })
    });
    const data1 = await res1.json();
    assert.equal(res1.status, 400);
    assert.equal(data1.success, false);
    assert.ok(data1.error.includes('already exists'));

    // Duplicate username
    const res2 = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Duplicate Username',
        email: 'unique.email@example.com',
        username: 'vamsik26',
        password: 'password123'
      })
    });
    const data2 = await res2.json();
    assert.equal(res2.status, 400);
    assert.equal(data2.success, false);
    assert.ok(data2.error.includes('already taken'));
  });

  it('should login participant using Email + Password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'vamsi.test@example.com',
        password: 'securePass123'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.name, 'Vamsi Krishna');
    assert.equal(data.registrations.length, 1);
  });

  it('should login participant using Username + Password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'vamsik26',
        password: 'securePass123'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.username, 'vamsik26');
  });

  it('should reject login with wrong password', async () => {
    const res = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'vamsik26',
        password: 'wrongPassword'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 401);
    assert.equal(data.success, false);
  });

  it('should handle Google OAuth sign-in and account auto-provisioning', async () => {
    const res = await fetch(`${baseUrl}/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'google.student@nbkrist.org',
        name: 'Google Student',
        avatarUrl: 'https://lh3.googleusercontent.com/test-photo'
      })
    });

    const data = await res.json();
    assert.equal(res.status, 200);
    assert.equal(data.success, true);
    assert.equal(data.user.email, 'google.student@nbkrist.org');
    assert.equal(data.user.authProvider, 'google');
  });

  it('should update participant profile and return updated details', async () => {
    // First login to get user id
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        identifier: 'vamsik26',
        password: 'securePass123'
      })
    });
    const loginData = await loginRes.json();
    const userId = loginData.user.id;

    // Update profile
    const updateRes = await fetch(`${baseUrl}/auth/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: userId,
        phone: '9123456789',
        branch: 'CSE (AI & ML)',
        year: '4th Year',
        isIeeeMember: true,
        ieeeId: 'IEEE998877'
      })
    });

    const updateData = await updateRes.json();
    assert.equal(updateRes.status, 200);
    assert.equal(updateData.success, true);
    assert.equal(updateData.user.phone, '9123456789');
    assert.equal(updateData.user.branch, 'CSE (AI & ML)');
    assert.equal(updateData.user.isIeeeMember, true);
    assert.equal(updateData.user.ieeeId, 'IEEE998877');
  });
});
