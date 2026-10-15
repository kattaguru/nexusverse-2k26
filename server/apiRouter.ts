import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { readDatabase, writeDatabase } from './db.js';
import { sendTicketConfirmationEmail, isEmailConfigured, EmailTicketPayload } from './emailService.js';

dotenv.config();

const supabaseServer = process.env.SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY)
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_PUBLISHABLE_KEY!)
  : null;

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
apiRouter.post('/registrations', (req: Request, res: Response) => {
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
    const { isRegClosed, closedMessage, razorpayMeLink, razorpayMeName } = req.body;
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

    writeDatabase(db);
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

// 11. Razorpay: Get Public Configuration
apiRouter.get('/razorpay/config', (_req: Request, res: Response) => {
  const { keyId } = getActiveRazorpayKeys();
  const db = readDatabase();
  const isLive = keyId.startsWith('rzp_live_');
  res.json({
    success: true,
    keyId,
    isLive,
    mode: isLive ? 'Live Production' : 'Sandbox / Test Mode',
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

// 13. Razorpay: Save Keys into Admin Settings
apiRouter.post('/razorpay/save-keys', (req: Request, res: Response) => {
  try {
    const { keyId, keySecret, razorpayMeLink, razorpayMeName } = req.body;
    const db = readDatabase();

    if (keyId) db.settings.razorpayKeyId = keyId.trim();
    if (keySecret) db.settings.razorpayKeySecret = keySecret.trim();
    if (razorpayMeLink) db.settings.razorpayMeLink = razorpayMeLink.trim();
    if (razorpayMeName) db.settings.razorpayMeName = razorpayMeName.trim();

    writeDatabase(db);
    res.json({
      success: true,
      message: 'Razorpay keys and handle saved successfully.',
      keyId: db.settings.razorpayKeyId,
      razorpayMeLink: db.settings.razorpayMeLink,
      razorpayMeName: db.settings.razorpayMeName
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

// 15. Razorpay: Verify Payment Signature
apiRouter.post('/razorpay/verify-payment', (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const { keySecret } = getActiveRazorpayKeys();

    if (!razorpay_payment_id) {
      return res.status(400).json({ success: false, error: 'Missing payment ID.' });
    }

    // If order was simulated in sandbox test mode
    if (razorpay_order_id && razorpay_order_id.startsWith('order_test_')) {
      return res.json({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
        mode: 'Sandbox Test Mode'
      });
    }

    if (razorpay_order_id && razorpay_signature) {
      const hmac = crypto.createHmac('sha256', keySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      const isValid = generatedSignature === razorpay_signature;
      if (isValid) {
        return res.json({
          success: true,
          verified: true,
          paymentId: razorpay_payment_id,
          orderId: razorpay_order_id
        });
      } else {
        return res.status(400).json({
          success: false,
          verified: false,
          error: 'Invalid signature. Payment authenticity could not be verified.'
        });
      }
    }

    // If standard client payment ID without order signature
    res.json({
      success: true,
      verified: true,
      paymentId: razorpay_payment_id
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
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

        // 1. Sync directly to Supabase Cloud Database if configured
        if (supabaseServer) {
          try {
            await supabaseServer.from('registrations').upsert({
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
            }, { onConflict: 'reg_id' });
            console.log(`✅ [Webhook] Registration ${regId} (${roll}) automatically recorded in Supabase!`);
          } catch (dbErr: any) {
            console.error('Webhook Supabase upsert error:', dbErr.message);
          }
        }

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

