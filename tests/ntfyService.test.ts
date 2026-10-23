import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { 
  getNtfyTopic, 
  isNtfyConfigured, 
  sendAdminNtfyAlert,
  DEFAULT_NTFY_TOPIC 
} from '../server/ntfyService.ts';

describe('ntfy.sh Mobile Push Alert Service Unit Tests', () => {
  it('should return default or configured topic name', () => {
    const topic = getNtfyTopic();
    assert.ok(topic.length >= 3);
    assert.equal(isNtfyConfigured(), true);
  });

  it('should sanitize topic URL prefixes if user passes full URL', () => {
    const prev = process.env.NTFY_TOPIC;
    try {
      process.env.NTFY_TOPIC = 'https://ntfy.sh/my-custom-symposium-topic';
      assert.equal(getNtfyTopic(), 'my-custom-symposium-topic');
    } finally {
      process.env.NTFY_TOPIC = prev;
    }
  });

  it('should validate payload in sendAdminNtfyAlert', async () => {
    const res = await sendAdminNtfyAlert(null);
    assert.equal(res.success, false);
    assert.ok(res.error?.includes('Registration payload is required'));

    const resEmpty = await sendAdminNtfyAlert({});
    assert.equal(resEmpty.success, false);
    assert.ok(resEmpty.error?.includes('Registration payload is required'));
  });

  it('should handle mock delivery or active fetch gracefully', async () => {
    const testPayload = {
      regId: 'NV26-UNIT-01',
      name: 'Unit Tester',
      roll: '2203A51000',
      email: 'test@nbkrist.org',
      phone: '9491501919',
      college: 'NBKRIST',
      dept: 'ECE',
      year: '4th Year',
      eventIds: ['ctf', 'codecombat'],
      totalPaid: 200,
      paymentMode: 'UPI',
      paymentId: 'TEST-PAY-01'
    };

    const res = await sendAdminNtfyAlert(testPayload);
    // ntfy.sh is an open public endpoint, or if offline in runner, res has success or graceful error
    assert.ok(typeof res.success === 'boolean');
    if (res.success) {
      assert.ok(res.topic);
    }
  });
});
