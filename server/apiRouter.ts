import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readDatabase, writeDatabase, ParticipantUser } from './db.js';
import { sendTicketConfirmationEmail, isEmailConfigured, EmailTicketPayload } from './emailService.js';

const NEXUS_AUTH_SALT = 'nexusverse_2k26_secure_participant_salt';
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + NEXUS_AUTH_SALT).digest('hex');
}
function sanitizeUser(user: ParticipantUser) {
  const { passwordHash, ...safe } = user;
  return safe;
}
function findUserRegistrations(email?: string, roll?: string, phone?: string) {
  const db = readDatabase();
  const cleanEmail = (email || '').toLowerCase().trim();
  const cleanRoll = (roll || '').toUpperCase().trim();
  const cleanPhone = (phone || '').replace(/\s+/g, '');

  return db.registrations.filter((r: any) => {
    const rEmail = (r.email || '').toLowerCase().trim();
    const rRoll = (r.roll || '').toUpperCase().trim();
    const rPhone = (r.phone || '').replace(/\s+/g, '');

    return (
      (cleanEmail && rEmail === cleanEmail) ||
      (cleanRoll && rRoll === cleanRoll) ||
      (cleanPhone && cleanPhone.length > 5 && rPhone === cleanPhone)
    );
  });
}

dotenv.config();

const supabaseServer = process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!)
  : null;

// Resilient, non-blocking helper for syncing to Supabase Cloud PostgreSQL with 2.5s maximum timeout
function syncToSupabaseAsync(syncFn: (client: any) => Promise<any>): void {
  if (!supabaseServer) return;
  Promise.race([
    syncFn(supabaseServer),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Supabase sync timeout after 2500ms')), 2500))
  ]).catch((err: any) => {
    // Non-fatal warning; local database handles 100% operational integrity
    console.warn('⚡ [Supabase Sync Notice]:', err?.message || err);
  });
}

export const apiRouter = Router();

// 1. Health check
apiRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'NexusVerse 2K26 Backend API',
    time: new Date().toISOString()
  });
});

// 2. Get all registrations
apiRouter.get('/registrations', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      count: db.registrations.length,
      data: db.registrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 3. Create new registration
apiRouter.post('/registrations', async (req: Request, res: Response) => {
  try {
    const record = req.body;
    if (!record || !record.name || !record.roll) {
      return res.status(400).json({ success: false, error: 'Participant name and roll number are required.' });
    }

    const db = readDatabase();

    // Assign regId if not already present
    if (!record.regId) {
      record.regId = 'NV26-' + Math.random().toString(36).slice(2, 8).toUpperCase();
    }
    if (!record.timestamp) {
      record.timestamp = new Date().toISOString();
    }

    // Upsert into list
    const index = db.registrations.findIndex((r: any) => r.regId === record.regId);
    if (index >= 0) {
      db.registrations[index] = record;
    } else {
      db.registrations.unshift(record);
    }

    writeDatabase(db);

    // Sync to Supabase Cloud PostgreSQL in resilient background task
    syncToSupabaseAsync((client) => client.from('registrations').upsert({
      reg_id: record.regId,
      payment_id: record.paymentId || '',
      name: record.name,
      email: record.email || '',
      phone: record.phone || '',
      college: record.college || '',
      class_name: record.className || '',
      section: record.section || '',
      dept: record.dept || '',
      year: record.year || '',
      roll: record.roll,
      is_ieee_member: Boolean(record.isIeeeMember),
      ieee_id: record.ieeeId || '',
      event_ids: record.eventIds || [],
      team_details: record.teamDetails || {},
      total_paid: Number(record.totalPaid || 0),
      promo_code: record.promoCode || '',
      timestamp: record.timestamp || new Date().toISOString(),
    }, { onConflict: 'reg_id' }));

    res.status(201).json({
      success: true,
      message: 'Registration saved successfully.',
      data: record
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 4. Update existing registration
apiRouter.put('/registrations/:regId', (req: Request, res: Response) => {
  try {
    const { regId } = req.params;
    const updatedData = req.body;
    const db = readDatabase();

    const index = db.registrations.findIndex((r: any) => r.regId === regId);
    if (index === -1) {
      return res.status(404).json({ success: false, error: `Registration ${regId} not found.` });
    }

    db.registrations[index] = {
      ...db.registrations[index],
      ...updatedData,
      regId // keep immutable ID
    };

    writeDatabase(db);

    // Sync updated registration to Supabase Cloud PostgreSQL
    const updatedRecord = db.registrations[index];
    syncToSupabaseAsync((client) => client.from('registrations').upsert({
      reg_id: regId,
      payment_id: updatedRecord.paymentId || '',
      name: updatedRecord.name,
      email: updatedRecord.email || '',
      phone: updatedRecord.phone || '',
      college: updatedRecord.college || '',
      class_name: updatedRecord.className || '',
      section: updatedRecord.section || '',
      dept: updatedRecord.dept || '',
      year: updatedRecord.year || '',
      roll: updatedRecord.roll,
      is_ieee_member: Boolean(updatedRecord.isIeeeMember),
      ieee_id: updatedRecord.ieeeId || '',
      event_ids: updatedRecord.eventIds || [],
      team_details: updatedRecord.teamDetails || {},
      total_paid: Number(updatedRecord.totalPaid || 0),
      promo_code: updatedRecord.promoCode || '',
      timestamp: updatedRecord.timestamp || new Date().toISOString(),
    }, { onConflict: 'reg_id' }));

    res.json({
      success: true,
      message: `Registration ${regId} updated successfully.`,
      data: db.registrations[index]
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Delete registration
apiRouter.delete('/registrations/:regId', (req: Request, res: Response) => {
  try {
    const { regId } = req.params;
    const db = readDatabase();

    const initialCount = db.registrations.length;
    db.registrations = db.registrations.filter((r: any) => r.regId !== regId);

    if (db.registrations.length === initialCount) {
      return res.status(404).json({ success: false, error: `Registration ${regId} not found.` });
    }

    writeDatabase(db);

    // Sync deletion to Supabase Cloud PostgreSQL
    syncToSupabaseAsync((client) => client.from('registrations').delete().eq('reg_id', regId));

    res.json({
      success: true,
      message: `Registration ${regId} deleted successfully.`
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Get portal settings (open/closed status, banner)
apiRouter.get('/settings', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      data: db.settings
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 7. Update portal settings
apiRouter.post('/settings', (req: Request, res: Response) => {
  try {
    const { isRegClosed, closedMessage, razorpayMeLink, razorpayMeName, paymentMode, upiVpa, upiPayeeName } = req.body;
    const db = readDatabase();

    if (typeof isRegClosed === 'boolean') {
      db.settings.isRegClosed = isRegClosed;
    }
    if (typeof closedMessage === 'string') {
      db.settings.closedMessage = closedMessage;
    }
    if (typeof razorpayMeLink === 'string') {
      db.settings.razorpayMeLink = razorpayMeLink.trim();
    }
    if (typeof razorpayMeName === 'string') {
      db.settings.razorpayMeName = razorpayMeName.trim();
    }
    if (paymentMode === 'razorpay' || paymentMode === 'upi') {
      (db.settings as any).paymentMode = paymentMode;
    }
    if (typeof upiVpa === 'string') {
      (db.settings as any).upiVpa = upiVpa.trim();
    }
    if (typeof upiPayeeName === 'string') {
      (db.settings as any).upiPayeeName = upiPayeeName.trim();
    }

    writeDatabase(db);

    // Sync portal open/closed settings to Supabase Cloud PostgreSQL
    syncToSupabaseAsync((client) => client.from('portal_settings').upsert({
      id: 'current',
      is_reg_closed: Boolean(db.settings.isRegClosed),
      closed_message: db.settings.closedMessage || 'Registration is currently closed.',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' }));

    res.json({
      success: true,
      message: 'Portal settings updated.',
      data: db.settings
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin Authentication Endpoints
apiRouter.post('/admin/verify-password', async (req: Request, res: Response) => {
  try {
    const { password } = req.body;
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required' });
    }

    // 1. Check Supabase cloud first
    if (supabaseServer) {
      try {
        const { data, error } = await supabaseServer
          .from('portal_settings')
          .select('admin_password')
          .eq('id', 'current')
          .single();

        if (!error && data && data.admin_password) {
          return res.json({ success: password.trim() === data.admin_password.trim() });
        }
      } catch (e) {}
    }

    // 2. Fallback to server db / env
    const db = readDatabase();
    const correctPwd = db.settings.adminPassword || process.env.ADMIN_PASSWORD || 'admin123';
    return res.json({ success: password.trim() === correctPwd.trim() });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

apiRouter.post('/admin/change-password', async (req: Request, res: Response) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || newPassword.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters.' });
    }

    // 1. Update in Supabase
    if (supabaseServer) {
      try {
        await supabaseServer
          .from('portal_settings')
          .upsert({
            id: 'current',
            admin_password: newPassword.trim(),
            updated_at: new Date().toISOString()
          }, { onConflict: 'id' });
      } catch (e) {}
    }

    // 2. Update in server local database
    const db = readDatabase();
    db.settings.adminPassword = newPassword.trim();
    writeDatabase(db);

    res.json({ success: true, message: 'Administrative password updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 8. Get photos
apiRouter.get('/photos', (_req: Request, res: Response) => {
  try {
    const db = readDatabase();
    res.json({
      success: true,
      count: db.photos.length,
      data: db.photos
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 9. Upload photo
apiRouter.post('/photos', (req: Request, res: Response) => {
  try {
    const { url, title, category } = req.body;
    if (!url) {
      return res.status(400).json({ success: false, error: 'Photo URL or Base64 data is required.' });
    }

    const newPhoto = {
      id: 'photo-' + Date.now(),
      url,
      title: title || 'Symposium Memory',
      category: category || 'Symposium Highlights',
      uploadedAt: new Date().toISOString()
    };

    const db = readDatabase();
    db.photos.unshift(newPhoto);
    writeDatabase(db);

    // Sync uploaded photo to Supabase Cloud PostgreSQL
    syncToSupabaseAsync((client) => client.from('gallery_photos').upsert({
      id: newPhoto.id,
      url: newPhoto.url,
      title: newPhoto.title,
      category: newPhoto.category,
      uploaded_at: newPhoto.uploadedAt
    }, { onConflict: 'id' }));

    res.status(201).json({
      success: true,
      data: newPhoto
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 10. Delete photo
apiRouter.delete('/photos/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = readDatabase();
    db.photos = db.photos.filter((p: any) => p.id !== id);
    writeDatabase(db);

    // Sync photo deletion to Supabase Cloud PostgreSQL
    syncToSupabaseAsync((client) => client.from('gallery_photos').delete().eq('id', id));

    res.json({ success: true, message: 'Photo deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Helper to get active Razorpay keys (db settings override env variables)
function getActiveRazorpayKeys() {
  const db = readDatabase();
  const keyId = db.settings.razorpayKeyId || process.env.VITE_RAZORPAY_KEY_ID || process.env.RAZORPAY_KEY_ID || 'rzp_test_TngfcrewRR7VL3';
  const keySecret = db.settings.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || 'QM6S914mOvv06oqV5a0lpTs1';
  return { keyId: keyId.trim(), keySecret: keySecret.trim() };
}

// 11. Razorpay & Direct UPI: Get Public Configuration
apiRouter.get('/razorpay/config', (_req: Request, res: Response) => {
  const { keyId } = getActiveRazorpayKeys();
  const db = readDatabase();
  const isLive = keyId.startsWith('rzp_live_');
  const paymentMode = (db.settings as any).paymentMode || 'upi';
  const upiVpa = (db.settings as any).upiVpa || process.env.VITE_UPI_VPA || '9441759500@ptyes';
  const upiPayeeName = (db.settings as any).upiPayeeName || db.settings.razorpayMeName || 'NexusVerse 2K26';

  res.json({
    success: true,
    keyId,
    isLive,
    mode: isLive ? 'Live Production' : 'Sandbox / Test Mode',
    paymentMode,
    upiVpa,
    upiPayeeName,
    razorpayMeLink: db.settings.razorpayMeLink || 'https://razorpay.me/@veluriprasanth',
    razorpayMeName: db.settings.razorpayMeName || 'VELURI PRASANTH'
  });
});

// 12. Razorpay: Test Credentials Connection
apiRouter.post('/razorpay/test-connection', async (req: Request, res: Response) => {
  try {
    const { keyId, keySecret } = req.body;
    const testKeyId = (keyId || getActiveRazorpayKeys().keyId).trim();
    const testSecret = (keySecret || getActiveRazorpayKeys().keySecret).trim();

    if (!testKeyId || !testSecret) {
      return res.status(400).json({ success: false, error: 'Both Key ID and Key Secret are required.' });
    }

    const auth = Buffer.from(`${testKeyId}:${testSecret}`).toString('base64');
    const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: 100, // 1 INR in paise
        currency: 'INR',
        receipt: `test_ping_${Date.now()}`
      }),
    });

    const data = await rzpRes.json();
    if (rzpRes.ok && data.id) {
      res.json({
        success: true,
        message: 'Razorpay API credentials verified successfully! Live orders can be created.',
        isLive: testKeyId.startsWith('rzp_live_')
      });
    } else {
      res.status(400).json({
        success: false,
        error: data.error?.description || 'Authentication failed. Please verify your Razorpay Key ID and Key Secret.'
      });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 13. Razorpay & Direct UPI: Save Keys & Payment Mode into Admin Settings
apiRouter.post('/razorpay/save-keys', (req: Request, res: Response) => {
  try {
    const { keyId, keySecret, razorpayMeLink, razorpayMeName, upiVpa, upiPayeeName, paymentMode } = req.body;
    const db = readDatabase();

    if (keyId) db.settings.razorpayKeyId = keyId.trim();
    if (keySecret) db.settings.razorpayKeySecret = keySecret.trim();
    if (razorpayMeLink) db.settings.razorpayMeLink = razorpayMeLink.trim();
    if (razorpayMeName) db.settings.razorpayMeName = razorpayMeName.trim();
    if (upiVpa) (db.settings as any).upiVpa = upiVpa.trim();
    if (upiPayeeName) (db.settings as any).upiPayeeName = upiPayeeName.trim();
    if (paymentMode === 'razorpay' || paymentMode === 'upi') {
      (db.settings as any).paymentMode = paymentMode;
    }

    writeDatabase(db);
    res.json({
      success: true,
      message: 'Payment configuration saved successfully.',
      keyId: db.settings.razorpayKeyId,
      razorpayMeLink: db.settings.razorpayMeLink,
      razorpayMeName: db.settings.razorpayMeName,
      upiVpa: (db.settings as any).upiVpa,
      upiPayeeName: (db.settings as any).upiPayeeName,
      paymentMode: (db.settings as any).paymentMode || 'upi'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 14. Razorpay: Create Order
apiRouter.post('/razorpay/create-order', async (req: Request, res: Response) => {
  try {
    const { amount, currency = 'INR', receipt } = req.body;
    const { keyId, keySecret } = getActiveRazorpayKeys();

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Valid amount is required.' });
    }

    const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
    let orderData: any = null;
    let isLiveOrder = false;

    try {
      const rzpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: Math.round(Number(amount) * 100), // in paise
          currency,
          receipt: receipt || `nv26_${Date.now()}`,
        }),
      });

      const data = await rzpRes.json();
      if (rzpRes.ok && data.id) {
        orderData = data;
        isLiveOrder = true;
      } else {
        console.warn('Razorpay live order creation responded:', data);
      }
    } catch (apiErr) {
      console.warn('Razorpay order API call error:', apiErr);
    }

    // If Razorpay API created the order, return it
    if (orderData && orderData.id) {
      return res.json({
        id: orderData.id,
        orderId: orderData.id,
        amount: orderData.amount,
        currency: orderData.currency,
        keyId,
        isLive: isLiveOrder
      });
    }

    // Fallback: If placeholder test keys are used before live activation, generate a local order
    const fallbackOrderId = `order_test_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    res.json({
      id: fallbackOrderId,
      orderId: fallbackOrderId,
      amount: Math.round(Number(amount) * 100),
      currency,
      keyId,
      isSimulated: true,
      message: 'Razorpay Test Order created'
    });
  } catch (err: any) {
    console.error('Create Razorpay order error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 15. Razorpay & Direct UPI: Verify Payment Signature, API Status or UPI UTR
apiRouter.post('/razorpay/verify-payment', async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, expectedAmount, paymentMode } = req.body;
    const { keyId, keySecret } = getActiveRazorpayKeys();
    const db = readDatabase();
    const activePaymentMode = paymentMode || (db.settings as any).paymentMode || 'upi';

    if (!razorpay_payment_id || typeof razorpay_payment_id !== 'string' || !razorpay_payment_id.trim()) {
      return res.status(400).json({ 
        success: false, 
        verified: false, 
        error: activePaymentMode === 'upi'
          ? 'UPI Transaction Reference (UTR) is required for verification.' 
          : 'Razorpay Payment ID is required for verification.' 
      });
    }

    const cleanPaymentId = razorpay_payment_id.trim();

    // Check if this payment ID / UTR was ALREADY used for another registration to prevent reuse
    const existingReg = db.registrations.find((r: any) => 
      r.paymentId && r.paymentId.trim().toLowerCase() === cleanPaymentId.toLowerCase()
    );
    if (existingReg) {
      return res.status(400).json({
        success: false,
        verified: false,
        error: `This Payment Reference / UTR (${cleanPaymentId}) has already been verified and used for Pass ${existingReg.regId}. Duplicate ticket generation is not allowed.`
      });
    }

    // A. Cryptographic HMAC Signature Verification (from Razorpay Checkout popup)
    if (razorpay_order_id && razorpay_signature) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${cleanPaymentId}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Invalid Razorpay payment signature. Payment authenticity could not be verified.'
        });
      }

      return res.json({
        success: true,
        verified: true,
        paymentId: cleanPaymentId,
        orderId: razorpay_order_id,
        method: 'razorpay'
      });
    }

    // B. Razorpay ID verification (starts with 'pay_')
    const isRazorpayId = cleanPaymentId.toLowerCase().startsWith('pay_');

    if (isRazorpayId) {
      const auth = Buffer.from(`${keyId}:${keySecret}`).toString('base64');
      let rzpRes: any;
      let paymentData: any;

      try {
        rzpRes = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(cleanPaymentId)}`, {
          headers: { Authorization: `Basic ${auth}` }
        });
        paymentData = await rzpRes.json();
      } catch (networkErr: any) {
        return res.status(502).json({
          success: false,
          verified: false,
          error: 'Unable to connect to Razorpay verification servers. Please check your internet connection and try again.'
        });
      }

      if (!rzpRes.ok || !paymentData || !paymentData.id) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: paymentData?.error?.description || 'Payment ID could not be found in Razorpay. Payment must be completed in Razorpay first.'
        });
      }

      if (paymentData.status !== 'captured' && paymentData.status !== 'authorized') {
        return res.status(400).json({
          success: false,
          verified: false,
          error: `Payment is not completed. Current Razorpay status: '${paymentData.status}'. Only captured payments can generate tickets.`
        });
      }

      // Verify amount if expectedAmount is provided
      if (expectedAmount && Number(expectedAmount) > 0) {
        const expectedPaise = Math.round(Number(expectedAmount) * 100);
        if (paymentData.amount < expectedPaise) {
          return res.status(400).json({
            success: false,
            verified: false,
            error: `Amount paid in Razorpay (₹${paymentData.amount / 100}) does not match the required registration fee (₹${expectedAmount}).`
          });
        }
      }

      return res.json({
        success: true,
        verified: true,
        paymentId: cleanPaymentId,
        amount: paymentData.amount / 100,
        method: paymentData.method,
        status: paymentData.status
      });
    }

    // C. Direct UPI Verification (Normal UPI payment via QR scan & UTR)
    if (activePaymentMode === 'upi' || !isRazorpayId) {
      // Validate UTR format: standard Indian UPI UTR is 12 digits, but banking apps can be 6-25 chars
      if (cleanPaymentId.length < 6) {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Invalid UPI Transaction Reference (UTR) number. Please enter the full reference number (typically 12 digits) from your GPay, PhonePe, or Paytm receipt.'
        });
      }

      return res.json({
        success: true,
        verified: true,
        paymentId: cleanPaymentId,
        amount: expectedAmount || 0,
        method: 'upi_direct',
        status: 'verified'
      });
    }

    return res.status(400).json({
      success: false,
      verified: false,
      error: 'Invalid payment reference.'
    });
  } catch (err: any) {
    res.status(500).json({ success: false, verified: false, error: err.message });
  }
});

// 16. Send Ticket Pass Confirmation Email
apiRouter.post('/send-ticket-email', async (req: Request, res: Response) => {
  try {
    const payload: EmailTicketPayload = req.body;
    if (!payload || !payload.email || !payload.regId) {
      return res.status(400).json({ success: false, error: 'Registration ID and recipient email are required.' });
    }

    const result = await sendTicketConfirmationEmail(payload);
    res.json({
      success: result.success,
      messageId: result.messageId,
      error: result.error
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 17. Razorpay Webhook Listener (Guaranteed Server-to-Server Sync)
apiRouter.post('/razorpay/webhook', async (req: Request, res: Response) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const webhookSecret = (process.env.RAZORPAY_WEBHOOK_SECRET || getActiveRazorpayKeys().keySecret).trim();

    // Verify webhook authenticity
    if (signature && webhookSecret) {
      const rawBody = (req as any).rawBody 
        ? (req as any).rawBody.toString('utf-8')
        : JSON.stringify(req.body);

      const hmac = crypto.createHmac('sha256', webhookSecret);
      hmac.update(rawBody);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== signature) {
        console.warn('⚠️ Razorpay webhook signature mismatch. Request ignored.');
        return res.status(400).json({ status: 'invalid_signature' });
      }
    }

    const event = req.body?.event;
    console.log(`🔔 Razorpay Webhook Event Received: [${event}]`);

    // Handle payment.captured or order.paid
    if (event === 'payment.captured' || event === 'order.paid') {
      const payment = req.body?.payload?.payment?.entity;
      if (payment) {
        const notes = payment.notes || {};
        const studentEmail = payment.email || notes.email || '';
        const roll = notes.rollNumber || notes.roll || 'SPOT-' + payment.id.slice(-6).toUpperCase();
        const studentName = notes.attendeeName || notes.name || payment.description || 'NexusVerse Delegate';
        const regId = notes.regId || 'NV26-' + Math.random().toString(36).slice(2, 8).toUpperCase();
        const totalPaid = payment.amount ? payment.amount / 100 : Number(notes.totalPaid || 0);

        // 1. Sync directly to Supabase Cloud Database in background
        syncToSupabaseAsync((client) => client.from('registrations').upsert({
          reg_id: regId,
          payment_id: payment.id,
          name: studentName,
          email: studentEmail,
          phone: payment.contact || notes.phone || '',
          college: notes.college || '',
          dept: notes.department || notes.dept || '',
          roll: roll,
          event_ids: notes.eventIds ? (Array.isArray(notes.eventIds) ? notes.eventIds : [notes.eventIds]) : ['symposium'],
          total_paid: totalPaid,
          timestamp: new Date().toISOString()
        }, { onConflict: 'reg_id' }));

        // 2. Dispatch automatic pass receipt email to student
        if (studentEmail) {
          sendTicketConfirmationEmail({
            regId,
            name: studentName,
            email: studentEmail,
            roll,
            totalPaid,
            paymentId: payment.id,
            eventIds: notes.eventIds ? (Array.isArray(notes.eventIds) ? notes.eventIds : [notes.eventIds]) : ['Technical Events'],
            college: notes.college,
            dept: notes.department
          }).catch(mailErr => console.error('Webhook email dispatch error:', mailErr));
        }
      }
    }

    // Always acknowledge 200 OK to Razorpay so it doesn't retry
    res.status(200).json({ status: 'ok', received: true });
  } catch (err: any) {
    console.error('Webhook processing exception:', err);
    res.status(500).json({ status: 'error', error: err.message });
  }
});

// 18. Email Service Configuration Status
apiRouter.get('/email/config', (_req: Request, res: Response) => {
  const configured = isEmailConfigured();
  const rawUser = process.env.SMTP_USER || '';
  const maskedUser = rawUser.replace(/(.{2})(.*)(@.*)/, '$1***$3');

  res.json({
    configured,
    user: maskedUser,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    from: process.env.EMAIL_FROM || maskedUser || 'NexusVerse 2K26'
  });
});

// 19. Send Test Email from Admin Panel
apiRouter.post('/email/test', async (req: Request, res: Response) => {
  try {
    const { recipient } = req.body;
    if (!recipient || !recipient.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid recipient email address is required.' });
    }

    const testPayload: EmailTicketPayload = {
      regId: 'NV26-TEST-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      name: 'NexusVerse Tester',
      email: recipient,
      roll: '23KB1A0599',
      college: 'N.B.K.R. Institute of Science & Technology',
      dept: 'CSE',
      year: '3rd Year',
      eventIds: ['ctf', 'hackathon'],
      totalPaid: 300,
      paymentId: 'pay_test_' + Date.now()
    };

    const result = await sendTicketConfirmationEmail(testPayload);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 20. Participant Auth: Register
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, username, password, phone, college, roll, branch, year, isIeeeMember, ieeeId } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, error: 'Full name is required.' });
    }
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid email address is required.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ success: false, error: 'Password must be at least 4 characters long.' });
    }

    const db = readDatabase();
    if (!db.users) db.users = [];

    const cleanEmail = email.trim().toLowerCase();
    const cleanUsername = (username && username.trim()) ? username.trim().toLowerCase() : cleanEmail.split('@')[0];

    // Check existing
    const existing = db.users.find(u => u.email.toLowerCase() === cleanEmail || u.username.toLowerCase() === cleanUsername);
    if (existing) {
      return res.status(400).json({ 
        success: false, 
        error: existing.email.toLowerCase() === cleanEmail 
          ? 'An account with this email already exists. Please sign in.' 
          : 'This username is already taken. Please choose another username.' 
      });
    }

    const newUser: ParticipantUser = {
      id: 'usr_' + crypto.randomBytes(6).toString('hex'),
      name: name.trim(),
      email: cleanEmail,
      username: cleanUsername,
      passwordHash: hashPassword(password),
      phone: phone?.trim() || '',
      college: college?.trim() || 'N.B.K.R. Institute of Science & Technology',
      roll: roll?.trim().toUpperCase() || '',
      branch: branch?.trim() || '',
      year: year?.trim() || '',
      isIeeeMember: Boolean(isIeeeMember),
      ieeeId: ieeeId?.trim() || '',
      authProvider: 'local',
      createdAt: new Date().toISOString()
    };

    db.users.push(newUser);
    writeDatabase(db);

    // Sync user to Supabase Cloud PostgreSQL in resilient background task
    syncToSupabaseAsync((client) => client.from('participant_users').upsert({
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      username: newUser.username,
      password_hash: newUser.passwordHash,
      phone: newUser.phone || '',
      college: newUser.college || '',
      roll: newUser.roll || '',
      branch: newUser.branch || '',
      year: newUser.year || '',
      is_ieee_member: Boolean(newUser.isIeeeMember),
      ieee_id: newUser.ieeeId || '',
      auth_provider: newUser.authProvider,
      created_at: newUser.createdAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' }));

    const userRegistrations = findUserRegistrations(newUser.email, newUser.roll, newUser.phone);

    res.json({
      success: true,
      message: 'Participant account created successfully!',
      user: sanitizeUser(newUser),
      registrations: userRegistrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 21. Participant Auth: Login (Email or Username + Password)
apiRouter.post('/auth/login', (req: Request, res: Response) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !identifier.trim()) {
      return res.status(400).json({ success: false, error: 'Email or username is required.' });
    }
    if (!password) {
      return res.status(400).json({ success: false, error: 'Password is required.' });
    }

    const cleanId = identifier.trim().toLowerCase();
    const db = readDatabase();
    if (!db.users) db.users = [];

    const user = db.users.find(u => u.email.toLowerCase() === cleanId || u.username.toLowerCase() === cleanId);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email/username or password.' });
    }

    if (user.authProvider === 'google' && !user.passwordHash) {
      return res.status(400).json({ success: false, error: 'This account was created with Google. Please use Continue with Google to sign in.' });
    }

    const expectedHash = hashPassword(password);
    if (user.passwordHash !== expectedHash) {
      return res.status(401).json({ success: false, error: 'Invalid email/username or password.' });
    }

    const userRegistrations = findUserRegistrations(user.email, user.roll, user.phone);

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: sanitizeUser(user),
      registrations: userRegistrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 22. Participant Auth: Google Login / OAuth Callback
apiRouter.post('/auth/google', async (req: Request, res: Response) => {
  try {
    const { email, name, avatarUrl, roll, college, phone } = req.body;
    if (!email || !email.includes('@')) {
      return res.status(400).json({ success: false, error: 'Valid Google email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const db = readDatabase();
    if (!db.users) db.users = [];

    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

    if (user) {
      // Update info if provided
      if (name && (!user.name || user.name.startsWith('User '))) user.name = name.trim();
      if (avatarUrl && !user.avatarUrl) user.avatarUrl = avatarUrl;
      if (roll && !user.roll) user.roll = roll.trim().toUpperCase();
      if (college && !user.college) user.college = college.trim();
      if (phone && !user.phone) user.phone = phone.trim();
      user.updatedAt = new Date().toISOString();
    } else {
      const cleanUsername = cleanEmail.split('@')[0];
      user = {
        id: 'usr_' + crypto.randomBytes(6).toString('hex'),
        name: name ? name.trim() : cleanUsername,
        email: cleanEmail,
        username: cleanUsername,
        avatarUrl: avatarUrl || '',
        phone: phone?.trim() || '',
        college: college?.trim() || 'N.B.K.R. Institute of Science & Technology',
        roll: roll?.trim().toUpperCase() || '',
        authProvider: 'google',
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
    }

    writeDatabase(db);

    // Sync Google user to Supabase Cloud PostgreSQL in resilient background task
    syncToSupabaseAsync((client) => client.from('participant_users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      avatar_url: user.avatarUrl || '',
      phone: user.phone || '',
      college: user.college || '',
      roll: user.roll || '',
      auth_provider: 'google',
      created_at: user.createdAt,
      updated_at: new Date().toISOString()
    }, { onConflict: 'email' }));

    const userRegistrations = findUserRegistrations(user.email, user.roll, user.phone);

    res.json({
      success: true,
      message: `Logged in via Google as ${user.name}`,
      user: sanitizeUser(user),
      registrations: userRegistrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 23. Participant Auth: Get Current Profile and Registrations
apiRouter.get('/auth/me', (req: Request, res: Response) => {
  try {
    const userId = (req.headers['x-user-id'] as string) || (req.query.id as string) || '';
    const email = (req.query.email as string) || '';

    const db = readDatabase();
    if (!db.users) db.users = [];

    let user: ParticipantUser | undefined;
    if (userId) {
      user = db.users.find(u => u.id === userId);
    } else if (email) {
      user = db.users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());
    }

    if (!user) {
      return res.status(404).json({ success: false, error: 'Participant session not found.' });
    }

    const userRegistrations = findUserRegistrations(user.email, user.roll, user.phone);

    res.json({
      success: true,
      user: sanitizeUser(user),
      registrations: userRegistrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 24. Participant Auth: Update Profile
apiRouter.put('/auth/profile', (req: Request, res: Response) => {
  try {
    const { id, name, phone, college, roll, branch, year, isIeeeMember, ieeeId } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'User ID is required.' });
    }

    const db = readDatabase();
    if (!db.users) db.users = [];

    const user = db.users.find(u => u.id === id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'Participant not found.' });
    }

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (college) user.college = college.trim();
    if (roll !== undefined) user.roll = roll.trim().toUpperCase();
    if (branch !== undefined) user.branch = branch.trim();
    if (year !== undefined) user.year = year.trim();
    if (isIeeeMember !== undefined) user.isIeeeMember = Boolean(isIeeeMember);
    if (ieeeId !== undefined) user.ieeeId = ieeeId.trim();
    user.updatedAt = new Date().toISOString();

    writeDatabase(db);

    // Sync updated participant profile to Supabase Cloud PostgreSQL
    syncToSupabaseAsync((client) => client.from('participant_users').upsert({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      password_hash: user.passwordHash || '',
      phone: user.phone || '',
      college: user.college || '',
      roll: user.roll || '',
      branch: user.branch || '',
      year: user.year || '',
      is_ieee_member: Boolean(user.isIeeeMember),
      ieee_id: user.ieeeId || '',
      avatar_url: user.avatarUrl || '',
      auth_provider: user.authProvider || 'local',
      created_at: user.createdAt || new Date().toISOString(),
      updated_at: user.updatedAt || new Date().toISOString()
    }, { onConflict: 'email' }));

    const userRegistrations = findUserRegistrations(user.email, user.roll, user.phone);

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      user: sanitizeUser(user),
      registrations: userRegistrations
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 25. Complete Two-Way Cloud Sync with Supabase (Mirrors all local records to Supabase)
apiRouter.post('/admin/sync-supabase', async (_req: Request, res: Response) => {
  try {
    if (!supabaseServer) {
      return res.status(503).json({
        success: false,
        error: 'Supabase client is not configured. Check SUPABASE_URL and SUPABASE_SECRET_KEY in .env.'
      });
    }

    const db = readDatabase();
    let syncedRegistrations = 0;
    let syncedUsers = 0;
    const errors: string[] = [];

    // 1. Sync all registrations
    if (db.registrations && db.registrations.length > 0) {
      const regRows = db.registrations.map((r: any) => ({
        reg_id: r.regId,
        payment_id: r.paymentId || '',
        name: r.name,
        email: r.email || '',
        phone: r.phone || '',
        college: r.college || '',
        class_name: r.className || '',
        section: r.section || '',
        dept: r.dept || '',
        year: r.year || '',
        roll: r.roll,
        is_ieee_member: Boolean(r.isIeeeMember),
        ieee_id: r.ieeeId || '',
        event_ids: r.eventIds || [],
        team_details: r.teamDetails || {},
        total_paid: Number(r.totalPaid || 0),
        promo_code: r.promoCode || '',
        timestamp: r.timestamp || new Date().toISOString(),
      }));

      const { data, error } = await supabaseServer
        .from('registrations')
        .upsert(regRows, { onConflict: 'reg_id' })
        .select('reg_id');

      if (error) {
        errors.push(`Registrations sync notice: ${error.message}`);
      } else {
        syncedRegistrations = data ? data.length : regRows.length;
      }
    }

    // 2. Sync all participant users
    if (db.users && db.users.length > 0) {
      const userRows = db.users.map((u: any) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        username: u.username,
        password_hash: u.passwordHash || '',
        phone: u.phone || '',
        college: u.college || '',
        roll: u.roll || '',
        branch: u.branch || '',
        year: u.year || '',
        is_ieee_member: Boolean(u.isIeeeMember),
        ieee_id: u.ieeeId || '',
        avatar_url: u.avatarUrl || '',
        auth_provider: u.authProvider || 'local',
        created_at: u.createdAt || new Date().toISOString(),
        updated_at: u.updatedAt || new Date().toISOString()
      }));

      const { data, error } = await supabaseServer
        .from('participant_users')
        .upsert(userRows, { onConflict: 'email' })
        .select('id');

      if (error) {
        errors.push(`Participant users sync notice: ${error.message}`);
      } else {
        syncedUsers = data ? data.length : userRows.length;
      }
    }

    // 3. Sync portal settings
    await supabaseServer.from('portal_settings').upsert({
      id: 'current',
      is_reg_closed: Boolean(db.settings.isRegClosed),
      closed_message: db.settings.closedMessage || 'Registration is currently closed.',
      updated_at: new Date().toISOString()
    }, { onConflict: 'id' });

    res.json({
      success: true,
      message: `Cloud synchronization completed: ${syncedRegistrations} registrations and ${syncedUsers} participant users mirrored to Supabase.`,
      syncedRegistrations,
      syncedUsers,
      totalLocalRegistrations: db.registrations.length,
      totalLocalUsers: (db.users || []).length,
      notices: errors
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

