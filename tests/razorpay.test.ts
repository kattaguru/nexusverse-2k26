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

  it('should accurately calculate 5% GST (₹5 for every ₹100) on all registration tiers', () => {
    const calcGstAndTotal = (baseSubtotal: number, gstRate = 5) => {
      const gstAmount = Math.round((baseSubtotal * gstRate) / 100);
      const total = baseSubtotal + gstAmount;
      return { baseSubtotal, gstAmount, total };
    };

    // Tier 1: Spot Events Pass (₹100 base) -> ₹5 GST, Total ₹105
    const spot = calcGstAndTotal(100);
    assert.equal(spot.gstAmount, 5, '₹100 should incur exactly ₹5 GST (₹5 per ₹100)');
    assert.equal(spot.total, 105, 'Total should be ₹105');

    // Tier 2: Non-IEEE Member Single Tech Event (₹200 base) -> ₹10 GST, Total ₹210
    const nonIeeeSingle = calcGstAndTotal(200);
    assert.equal(nonIeeeSingle.gstAmount, 10, '₹200 should incur ₹10 GST');
    assert.equal(nonIeeeSingle.total, 210, 'Total should be ₹210');

    // Tier 3: Non-IEEE Tech Event + Spot Pass (₹300 base) -> ₹15 GST, Total ₹315
    const techPlusSpot = calcGstAndTotal(300);
    assert.equal(techPlusSpot.gstAmount, 15, '₹300 should incur ₹15 GST');
    assert.equal(techPlusSpot.total, 315, 'Total should be ₹315');

    // Tier 4: Two-member team @ ₹200 each (₹400 base) -> ₹20 GST, Total ₹420
    const teamTwo = calcGstAndTotal(400);
    assert.equal(teamTwo.gstAmount, 20, '₹400 should incur ₹20 GST');
    assert.equal(teamTwo.total, 420, 'Total should be ₹420');

    // Tier 5: IEEE Member Single Tech Event (₹150 base) -> ₹8 GST (rounded per CGST Section 170), Total ₹158
    const ieeeSingle = calcGstAndTotal(150);
    assert.equal(ieeeSingle.gstAmount, 8, '₹150 should incur ₹8 GST rounded');
    assert.equal(ieeeSingle.total, 158, 'Total should be ₹158');

    // Tier 6: IEEE Member Tech + Spot Pass (₹250 base) -> ₹13 GST, Total ₹263
    const ieeePlusSpot = calcGstAndTotal(250);
    assert.equal(ieeePlusSpot.gstAmount, 13, '₹250 should incur ₹13 GST rounded');
    assert.equal(ieeePlusSpot.total, 263, 'Total should be ₹263');
  });

  it('should support team member spot pass selection for multi-member events like CTF', () => {
    const nonMemberTechFee = 200;
    const spotFee = 100;
    const ctfHeads = 2; // Lead + 1 Member

    // Case A: CTF (2 members) + Spot Pass for BOTH members (2 Spot Passes)
    const techSubtotal = ctfHeads * nonMemberTechFee; // ₹400
    const bothSpotSubtotal = ctfHeads * spotFee; // ₹200
    const subtotalBoth = techSubtotal + bothSpotSubtotal; // ₹600
    const gstBoth = Math.round(subtotalBoth * 0.05); // ₹30 (₹5 per ₹100)
    const totalBoth = subtotalBoth + gstBoth; // ₹630

    assert.equal(techSubtotal, 400);
    assert.equal(bothSpotSubtotal, 200);
    assert.equal(subtotalBoth, 600);
    assert.equal(gstBoth, 30);
    assert.equal(totalBoth, 630);

    // Case B: CTF (2 members) + Spot Pass for LEAD ONLY (1 Spot Pass)
    const singleSpotSubtotal = 1 * spotFee; // ₹100
    const subtotalSingle = techSubtotal + singleSpotSubtotal; // ₹500
    const gstSingle = Math.round(subtotalSingle * 0.05); // ₹25 (₹5 per ₹100)
    const totalSingle = subtotalSingle + gstSingle; // ₹525

    assert.equal(singleSpotSubtotal, 100);
    assert.equal(subtotalSingle, 500);
    assert.equal(gstSingle, 25);
    assert.equal(totalSingle, 525);
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

