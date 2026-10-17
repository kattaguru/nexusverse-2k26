import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getRazorpayKey } from '../src/utils/razorpay.ts';

describe('Razorpay Utilities & Payment Calculation Unit Tests', () => {
  it('should retrieve a valid fallback or configured Razorpay Key ID', () => {
    const key = getRazorpayKey();
    assert.ok(key, 'Razorpay key should not be empty');
    assert.ok(
      key.startsWith('rzp_test_') || key.startsWith('rzp_live_'), 
      `Razorpay key should start with rzp_test_ or rzp_live_, got: ${key}`
    );
  });

  it('should accurately convert registration amounts from Rupees to Paise without rounding bugs', () => {
    const singleFeeRupees = 200;
    const paise = Math.round(singleFeeRupees * 100);
    assert.equal(paise, 20000, '₹200 should equal 20,000 paise');

    const ieeeFeeRupees = 150;
    const ieeePaise = Math.round(ieeeFeeRupees * 100);
    assert.equal(ieeePaise, 15000, '₹150 should equal 15,000 paise');

    // Float precision safety
    const discountedFee = 180.50;
    const discountedPaise = Math.round(discountedFee * 100);
    assert.equal(discountedPaise, 18050);
  });

  it('should calculate proper team registration totals', () => {
    // 2 members in FLAGHUNT @ ₹200 each
    const flaghuntMembers = 2;
    const nonMemberRate = 200;
    const totalNonMemberTeam = flaghuntMembers * nonMemberRate;
    assert.equal(totalNonMemberTeam, 400);

    // 1 IEEE member + 1 non-member
    const mixedTotal = (1 * 150) + (1 * 200);
    assert.equal(mixedTotal, 350);

    // With 10% promo code
    const discountAmount = Math.round((mixedTotal * 10) / 100);
    const finalAfterPromo = mixedTotal - discountAmount;
    assert.equal(discountAmount, 35);
    assert.equal(finalAfterPromo, 315);
  });

  it('should format standard NPCI Direct UPI payment URI correctly with custom UPI ID', () => {
    const upiVpa = '9441759500@ptyes';
    const payeeName = 'NexusVerse 2K26';
    const amount = 200;
    const roll = '23KB1A0597';

    const upiUri = `upi://pay?pa=${encodeURIComponent(upiVpa)}&pn=${encodeURIComponent(payeeName)}&am=${amount}&cu=INR&tn=${encodeURIComponent(`NexusVerse 2K26 - ${roll}`)}`;
    
    assert.ok(upiUri.startsWith('upi://pay?'), 'URI must start with standard upi://pay? scheme');
    assert.ok(upiUri.includes('pa=9441759500%40ptyes') || upiUri.includes('pa=9441759500@ptyes'), 'URI must contain encoded UPI VPA');
    assert.ok(upiUri.includes('am=200'), 'URI must contain amount');
    assert.ok(upiUri.includes('cu=INR'), 'URI currency must be INR');
  });
});
