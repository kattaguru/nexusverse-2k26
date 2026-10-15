import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readDatabase, writeDatabase, DatabaseSchema } from '../server/db.ts';

describe('Server Database Module Unit Tests', () => {
  it('should successfully read existing database and match schema structure', () => {
    const db = readDatabase();
    assert.ok(db, 'Database should be readable');
    assert.ok(Array.isArray(db.registrations), 'db.registrations should be an array');
    assert.ok(db.settings, 'db.settings should be defined');
    assert.equal(typeof db.settings.isRegClosed, 'boolean');
    assert.equal(typeof db.settings.closedMessage, 'string');
    assert.ok(Array.isArray(db.photos), 'db.photos should be an array');
  });

  it('should contain Razorpay.me configuration in settings', () => {
    const db = readDatabase();
    assert.ok(db.settings.razorpayMeLink, 'razorpayMeLink should exist in db settings');
    assert.equal(db.settings.razorpayMeLink, 'https://razorpay.me/@veluriprasanth');
    assert.equal(db.settings.razorpayMeName, 'VELURI PRASANTH');
  });

  it('should support safe in-memory updates and persistent schema integrity', () => {
    const db = readDatabase();
    const originalRegCount = db.registrations.length;

    // Test a temporary registration record insertion
    const testRecord = {
      regId: 'NV26-TEST-' + Date.now(),
      paymentId: 'pay_test_unit_123',
      name: 'Unit Test Attendee',
      email: 'test@nexusverse.org',
      phone: '9999999999',
      college: 'NBKRIST',
      roll: '23KB1A0000',
      isIeeeMember: false,
      eventIds: ['ctf'],
      totalPaid: 200,
      timestamp: new Date().toISOString()
    };

    db.registrations.push(testRecord);
    const writeResult = writeDatabase(db);
    assert.equal(writeResult, true, 'writeDatabase should succeed');

    // Re-read and verify record was added
    const updatedDb = readDatabase();
    assert.equal(updatedDb.registrations.length, originalRegCount + 1);
    const found = updatedDb.registrations.find(r => r.regId === testRecord.regId);
    assert.ok(found, 'Added test record should be found in db');
    assert.equal(found.totalPaid, 200);

    // Clean up test record to keep database pristine
    updatedDb.registrations = updatedDb.registrations.filter(r => r.regId !== testRecord.regId);
    writeDatabase(updatedDb);

    // Verify cleanup
    const finalDb = readDatabase();
    assert.equal(finalDb.registrations.length, originalRegCount);
  });
});
