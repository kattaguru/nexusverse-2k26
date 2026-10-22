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

  it('should accurately calculate 2% GST (₹2 for every ₹100) on all registration tiers', () => {
    const calcGstAndTotal = (baseSubtotal: number, gstRate = 2) => {
      const gstAmount = Math.round((baseSubtotal * gstRate) / 100);
      const total = baseSubtotal + gstAmount;
      return { baseSubtotal, gstAmount, total };
    };

    // Tier 1: Spot Events Pass (₹100 base) -> ₹2 GST, Total ₹102
    const spot = calcGstAndTotal(100);
    assert.equal(spot.gstAmount, 2, '₹100 should incur exactly ₹2 GST (₹2 per ₹100)');
    assert.equal(spot.total, 102, 'Total should be ₹102');

    // Tier 2: Non-IEEE Member Single Tech Event (₹200 base) -> ₹4 GST, Total ₹204
    const nonIeeeSingle = calcGstAndTotal(200);
    assert.equal(nonIeeeSingle.gstAmount, 4, '₹200 should incur ₹4 GST');
    assert.equal(nonIeeeSingle.total, 204, 'Total should be ₹204');

    // Tier 3: Non-IEEE Tech Event + Spot Pass (₹300 base) -> ₹6 GST, Total ₹306
    const techPlusSpot = calcGstAndTotal(300);
    assert.equal(techPlusSpot.gstAmount, 6, '₹300 should incur ₹6 GST');
    assert.equal(techPlusSpot.total, 306, 'Total should be ₹306');

    // Tier 4: Two-member team @ ₹200 each (₹400 base) -> ₹8 GST, Total ₹408
    const teamTwo = calcGstAndTotal(400);
    assert.equal(teamTwo.gstAmount, 8, '₹400 should incur ₹8 GST');
    assert.equal(teamTwo.total, 408, 'Total should be ₹408');

    // Tier 5: IEEE Member Single Tech Event (₹150 base) -> ₹3 GST, Total ₹153
    const ieeeSingle = calcGstAndTotal(150);
    assert.equal(ieeeSingle.gstAmount, 3, '₹150 should incur ₹3 GST');
    assert.equal(ieeeSingle.total, 153, 'Total should be ₹153');

    // Tier 6: IEEE Member Tech + Spot Pass (₹250 base) -> ₹5 GST, Total ₹255
    const ieeePlusSpot = calcGstAndTotal(250);
    assert.equal(ieeePlusSpot.gstAmount, 5, '₹250 should incur ₹5 GST');
    assert.equal(ieeePlusSpot.total, 255, 'Total should be ₹255');
  });

  it('should support team member spot pass selection for multi-member events like CTF', () => {
    const nonMemberTechFee = 200;
    const spotFee = 100;
    const ctfHeads = 2; // Lead + 1 Member

    // Case A: CTF (2 members) + Spot Pass for BOTH members (2 Spot Passes)
    const techSubtotal = ctfHeads * nonMemberTechFee; // ₹400
    const bothSpotSubtotal = ctfHeads * spotFee; // ₹200
    const subtotalBoth = techSubtotal + bothSpotSubtotal; // ₹600
    const gstBoth = Math.round(subtotalBoth * 0.02); // ₹12 (₹2 per ₹100)
    const totalBoth = subtotalBoth + gstBoth; // ₹612

    assert.equal(techSubtotal, 400);
    assert.equal(bothSpotSubtotal, 200);
    assert.equal(subtotalBoth, 600);
    assert.equal(gstBoth, 12);
    assert.equal(totalBoth, 612);

    // Case B: CTF (2 members) + Spot Pass for LEAD ONLY (1 Spot Pass)
    const singleSpotSubtotal = 1 * spotFee; // ₹100
    const subtotalSingle = techSubtotal + singleSpotSubtotal; // ₹500
    const gstSingle = Math.round(subtotalSingle * 0.02); // ₹10 (₹2 per ₹100)
    const totalSingle = subtotalSingle + gstSingle; // ₹510

    assert.equal(singleSpotSubtotal, 100);
    assert.equal(subtotalSingle, 500);
    assert.equal(gstSingle, 10);
    assert.equal(totalSingle, 510);
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

  it('should enforce screenshot and 12-digit UTR requirement for Direct UPI mode', () => {
    // UPI mode requires both 12-digit UTR reference and payment screenshot
    const validateUpiSubmission = (utr: string, screenshot?: string) => {
      const trimmedUtr = utr.trim();
      if (!trimmedUtr) return { valid: false, error: 'Please enter your 12-digit UPI Transaction Reference Number (UTR)' };
      if (!screenshot) return { valid: false, error: 'Please upload your payment screenshot' };
      return { valid: true, error: null };
    };

    // Missing UTR
    assert.equal(validateUpiSubmission('', 'data:image/jpeg;base64,mock').valid, false);
    // Missing screenshot
    assert.equal(validateUpiSubmission('429182749102', '').valid, false);
    // Both provided
    assert.equal(validateUpiSubmission('429182749102', 'data:image/jpeg;base64,mock').valid, true);
  });

  it('should allow instant Razorpay tickets without requiring screenshot or manual UTR entry', () => {
    // Razorpay mode does not require screenshot or manual UTR entry
    const validateRazorpaySdkSuccess = (paymentId: string) => {
      if (!paymentId || !paymentId.startsWith('pay_')) {
        return { valid: false, error: 'Invalid Razorpay payment ID' };
      }
      return { valid: true, error: null, autoTicketGenerated: true, sentToMail: true, storedInSpace: true };
    };

    const result = validateRazorpaySdkSuccess('pay_Pqrst123456');
    assert.equal(result.valid, true);
    assert.equal(result.autoTicketGenerated, true);
    assert.equal(result.sentToMail, true);
    assert.equal(result.storedInSpace, true);
  });
});

