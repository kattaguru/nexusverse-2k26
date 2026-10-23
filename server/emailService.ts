import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_SMTP_USER = 'kattaguravaiah39@gmail.com';
const DEFAULT_SMTP_PASS = 'rvrvpkgbzdldgmyt';

export interface EmailTicketPayload {
  regId: string;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  dept?: string;
  roll: string;
  year?: string;
  eventIds: string[];
  subtotal?: number;
  gstAmount?: number;
  totalPaid: number;
  paymentId: string;
  teammates?: { name?: string; roll?: string; email?: string }[];
}

// Check if SMTP is configured
export function isEmailConfigured(): boolean {
  const user = (process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  const pass = (process.env.SMTP_PASS || DEFAULT_SMTP_PASS).replace(/\s+/g, '').trim();
  return Boolean(user && pass && !user.includes('your-email') && !pass.includes('your-app-password'));
}

// Create Nodemailer Transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;
  const user = (process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  const pass = (process.env.SMTP_PASS || DEFAULT_SMTP_PASS).replace(/\s+/g, '').trim();

  return nodemailer.createTransport({
    service: 'gmail',
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 20000,
  });
}

function escapeHtml(str: any = ''): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Plain-text fallback for maximum spam filter deliverability
 */
function generateTicketEmailText(payload: EmailTicketPayload, passUrl: string): string {
  const events = (payload.eventIds || []).map(e => e.toUpperCase()).join(', ');
  return `NEXUSVERSE 2K26 - OFFICIAL DELEGATE PASS CONFIRMATION
IEEE Student Branch · NBKR Institute of Science & Technology
National Level Technical Symposium · 29 October 2026

Dear ${payload.name},

Your registration for NexusVerse 2K26 has been successfully verified! Below are your official delegate credentials:

--------------------------------------------------
REGISTRATION DETAILS:
- Registration ID : ${payload.regId}
- Roll Number     : ${payload.roll}
- Department      : ${payload.dept || 'N/A'} (${payload.year || 'Student'})
- College         : ${payload.college || 'NBKRIST'}
- Registered Events: ${events || 'Symposium Events'}
- Amount Paid     : ₹${payload.totalPaid} (Paid)
- Payment Ref     : ${payload.paymentId}
--------------------------------------------------

VIEW & DOWNLOAD YOUR DIGITAL QR PASS:
${passUrl}

IMPORTANT INSTRUCTIONS:
1. Please carry this email confirmation or your digital QR pass to the IEEE Registration Help Desk on 29 October 2026.
2. Present your QR code at the desk for your registration kit, official delegate badge, and lunch coupon.
3. Join the Official WhatsApp Group for live symposium schedule and announcements:
   https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO?s=cl&p=a&mlu=4&ilr=4&iam=2

Symposium Venue: NBKR Institute of Science & Technology, Vidyanagar, Nellore Dist, AP - 524413.

(If this email arrived in your Spam/Promotions folder, please mark it as "Not Spam" or move to Primary to ensure you receive future announcements.)
`;
}

/**
 * Generate beautifully styled NexusVerse 2K26 Email Template
 */
function generateTicketEmailHtml(payload: EmailTicketPayload, passUrl: string): string {
  const safeName = escapeHtml(payload.name);
  const safeRoll = escapeHtml(payload.roll);
  const safeRegId = escapeHtml(payload.regId);
  const safeDept = escapeHtml(payload.dept);
  const safeYear = escapeHtml(payload.year);
  const safeCollege = escapeHtml(payload.college);
  const safePaymentId = escapeHtml(payload.paymentId);
  const safePassUrl = escapeHtml(passUrl);

  const eventBadges = payload.eventIds
    .map(
      (ev) =>
        `<span style="display:inline-block;padding:4px 10px;margin:3px;background-color:#1f1b0e;border:1px solid #d4a935;color:#f2c14e;border-radius:6px;font-size:12px;font-weight:600;text-transform:uppercase;">${escapeHtml(ev)}</span>`
    )
    .join(' ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexusVerse 2K26 Pass Confirmation</title>
</head>
<body style="margin:0;padding:0;background-color:#07070a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#f3ecd9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#07070a;padding:24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card -->
        <table role="presentation" width="100%" style="max-width:580px;background:#111116;border:1px solid #2e2b22;border-radius:18px;overflow:hidden;box-shadow:0 12px 36px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding:28px 24px;text-align:center;background:linear-gradient(135deg, #0e1e38 0%, #171720 100%);border-bottom:1px solid #2e2b22;">
              <p style="margin:0 0 6px 0;font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#d4a935;font-weight:700;">
                IEEE-SB NBKRIST PRESENTS
              </p>
              <h1 style="margin:0;font-size:26px;font-weight:800;color:#ffffff;letter-spacing:1px;">
                NEXUSVERSE 2K26
              </h1>
              <p style="margin:6px 0 0 0;font-size:13px;color:#a79f8b;">
                National Level Technical Symposium · 29 October 2026
              </p>
            </td>
          </tr>

          <!-- Confirmation Badge -->
          <tr>
            <td style="padding:24px 24px 12px 24px;text-align:center;">
              <div style="display:inline-block;padding:6px 16px;background:rgba(62,207,142,0.12);border:1px solid rgba(62,207,142,0.4);border-radius:24px;color:#3ecf8e;font-size:13px;font-weight:700;">
                ✓ Payment Received &amp; Delegate Pass Confirmed
              </div>
              <h2 style="margin:16px 0 4px 0;font-size:20px;color:#ffffff;font-weight:700;">
                Greetings, ${safeName}!
              </h2>
              <p style="margin:0;font-size:13px;color:#a79f8b;line-height:1.5;">
                Your registration for NexusVerse 2K26 has been successfully verified. Your official electronic delegate pass details are below.
              </p>
            </td>
          </tr>

          <!-- Ticket Box -->
          <tr>
            <td style="padding:12px 24px;">
              <table role="presentation" width="100%" style="background:#181820;border:1px dashed #d4a935;border-radius:14px;padding:18px;">
                <tr>
                  <td style="padding-bottom:12px;border-bottom:1px solid #282833;">
                    <span style="font-size:11px;text-transform:uppercase;color:#a79f8b;display:block;">Registration ID</span>
                    <strong style="font-size:20px;color:#f2c14e;font-family:monospace;letter-spacing:1px;">${safeRegId}</strong>
                  </td>
                  <td align="right" style="padding-bottom:12px;border-bottom:1px solid #282833;">
                    <span style="font-size:11px;text-transform:uppercase;color:#a79f8b;display:block;">Amount Paid (Incl. 2% GST)</span>
                    <strong style="font-size:20px;color:#3ecf8e;font-family:monospace;">₹${payload.totalPaid}</strong>
                    ${payload.gstAmount ? `<span style="display:block;font-size:10px;color:#a79f8b;font-family:monospace;">Base: ₹${payload.subtotal || (payload.totalPaid - payload.gstAmount)} + 2% GST: ₹${payload.gstAmount}</span>` : ''}
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding-top:14px;">
                    <table width="100%" style="font-size:13px;line-height:1.6;">
                      <tr>
                        <td style="color:#a79f8b;width:120px;">Roll Number:</td>
                        <td style="color:#ffffff;font-weight:600;">${safeRoll}</td>
                      </tr>
                      ${payload.dept ? `<tr><td style="color:#a79f8b;">Department:</td><td style="color:#ffffff;">${safeDept} (${safeYear || 'Student'})</td></tr>` : ''}
                      ${payload.college ? `<tr><td style="color:#a79f8b;">College:</td><td style="color:#ffffff;">${safeCollege}</td></tr>` : ''}
                      <tr>
                        <td style="color:#a79f8b;">Payment Ref:</td>
                        <td style="color:#ffffff;font-family:monospace;font-size:11px;">${safePaymentId}</td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding-top:14px;">
                    <span style="font-size:11px;text-transform:uppercase;color:#a79f8b;display:block;margin-bottom:6px;">Registered Events:</span>
                    <div>${eventBadges}</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- CTA Buttons -->
          <tr>
            <td style="padding:20px 24px;text-align:center;">
              <a href="${safePassUrl}" target="_blank" style="display:inline-block;padding:14px 28px;background:#f2c14e;color:#1a1300;text-decoration:none;font-size:14px;font-weight:800;border-radius:12px;box-shadow:0 4px 16px rgba(242,193,78,0.3);letter-spacing:0.5px;margin:6px;">
                🎟️ View &amp; Download QR Ticket Pass
              </a>
              <a href="https://chat.whatsapp.com/GEpv2i56odNEV0LpLizzaO?s=cl&p=a&mlu=4&ilr=4&iam=2" target="_blank" style="display:inline-block;padding:14px 28px;background:#25d366;color:#052e16;text-decoration:none;font-size:14px;font-weight:800;border-radius:12px;box-shadow:0 4px 16px rgba(37,211,102,0.3);letter-spacing:0.5px;margin:6px;">
                💬 Join Official WhatsApp Group
              </a>
              <p style="margin:14px 0 0 0;font-size:11px;color:#857e6c;">
                You can also look up your pass anytime on the website using your roll number: <strong style="color:#d4a935;">${safeRoll}</strong>
              </p>
            </td>
          </tr>

          <!-- Inbox Guidance Note -->
          <tr>
            <td style="padding:6px 24px 16px 24px;">
              <div style="background:#1b1910;border:1px solid #6b5722;border-radius:10px;padding:12px;font-size:12px;color:#d8caaa;line-height:1.4;text-align:center;">
                💡 <strong style="color:#f2c14e;">Inbox Notice:</strong> If this email appeared in your <em>Spam</em> or <em>Promotions</em> folder, please tap <strong>"Report Not Spam"</strong> or move it to <strong>Primary</strong> so you don't miss live schedule alerts on event day!
              </div>
            </td>
          </tr>

          <!-- Venue & Guidelines -->
          <tr>
            <td style="padding:16px 24px;background:#0d0d12;border-top:1px solid #22222a;font-size:11px;color:#8a8373;line-height:1.5;">
              <strong style="color:#ffffff;">Symposium Venue:</strong> NBKR Institute of Science &amp; Technology, Vidyanagar, Nellore Dist, AP.<br>
              <strong style="color:#ffffff;">Important Instructions:</strong> Please present your digital QR pass or printed ID card at the IEEE Help Desk upon arrival for registration kit, lunch token, and entry badge.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px;text-align:center;font-size:11px;color:#6b6557;">
              © 2026 NexusVerse · IEEE Student Branch NBKRIST<br>
              For support or queries, reply directly to this email or reach out to <a href="mailto:kattaguravaiah39@gmail.com" style="color:#d4a935;text-decoration:none;">kattaguravaiah39@gmail.com</a>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

/**
 * Send official symposium ticket pass confirmation email
 */
export async function sendTicketConfirmationEmail(payload: EmailTicketPayload): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!payload.email || !payload.email.includes('@')) {
    return { success: false, error: 'Invalid recipient email address.' };
  }

  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');
  const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(payload.regId)}&roll=${encodeURIComponent(payload.roll)}`;

  // If SMTP is NOT configured, print clean receipt summary and dev link
  if (!isEmailConfigured()) {
    console.log(`[EMAIL DEV MODE] SMTP not configured. Simulated receipt for ${payload.email}:`);
    console.log(`  - Delegate: ${payload.name} (${payload.roll})`);
    console.log(`  - Pass ID: ${payload.regId} | Amount: ₹${payload.totalPaid}`);
    console.log(`  - Live Pass URL: ${passUrl}`);
    return {
      success: true,
      messageId: `simulated_${Date.now()}`
    };
  }

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || `"NexusVerse 2K26" <${process.env.SMTP_USER || DEFAULT_SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: payload.email,
      replyTo: process.env.SMTP_USER || DEFAULT_SMTP_USER,
      subject: `NexusVerse 2K26 Pass Confirmed [${payload.regId}] · IEEE-SB NBKRIST`,
      text: generateTicketEmailText(payload, passUrl),
      html: generateTicketEmailHtml(payload, passUrl),
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
      }
    });

    console.log(`[EMAIL SUCCESS] Ticket pass email sent to ${payload.email} (ID: ${info.messageId})`);

    // Also dispatch to teammates with valid distinct emails
    if (Array.isArray(payload.teammates)) {
      for (const mate of payload.teammates) {
        if (mate.email && mate.email.includes('@') && mate.email.toLowerCase() !== payload.email.toLowerCase()) {
          try {
            await transporter.sendMail({
              from: fromAddress,
              to: mate.email,
              replyTo: process.env.SMTP_USER || DEFAULT_SMTP_USER,
              subject: `NexusVerse 2K26 Pass Confirmed [${payload.regId}] · IEEE-SB NBKRIST`,
              text: generateTicketEmailText({ ...payload, name: mate.name || payload.name, roll: mate.roll || payload.roll }, passUrl),
              html: generateTicketEmailHtml({ ...payload, name: mate.name || payload.name, roll: mate.roll || payload.roll }, passUrl),
              headers: {
                'X-Priority': '1',
                'Importance': 'high'
              }
            });
            console.log(`[EMAIL SUCCESS] Team pass sent to teammate ${mate.email}`);
          } catch (mErr) {
            console.warn(`[EMAIL WARNING] Could not send to teammate ${mate.email}:`, mErr);
          }
        }
      }
    }

    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error(`[EMAIL ERROR] Failed to send ticket email to ${payload.email}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}

// Cache of recently notified registration IDs to prevent duplicate email alerts
const dispatchedEmailAlertRegs = new Set<string>();

/**
 * Send instant mobile alert to symposium organizer / admin whenever a new registration occurs
 */
export async function sendAdminRegistrationAlert(payload: any): Promise<{
  success: boolean;
  messageId?: string;
  error?: string;
}> {
  if (!payload || !payload.name) {
    return { success: false, error: 'Registration payload is required.' };
  }

  // Prevent automated testing from sending emails
  const id = String(payload.regId || payload.reg_id || '').toUpperCase();
  const name = String(payload.name || '').toLowerCase();
  const roll = String(payload.roll || '').toLowerCase();
  const email = String(payload.email || '').toLowerCase();
  if (
    id.startsWith('TEST-') ||
    id.startsWith('CAMPUS-') ||
    id.startsWith('NV26-UNIT-') ||
    name.includes('prototype tester') ||
    name.includes('unit tester') ||
    name.includes('security test') ||
    name.includes('<script') ||
    roll.includes('test') ||
    roll.includes('<img') ||
    email.includes('example.com')
  ) {
    return { success: true, messageId: 'test-suppressed' };
  }

  // De-duplication: Ensure each unique registration ID only triggers ONE admin email alert
  const regKey = String(payload.regId || payload.reg_id || '').trim().toUpperCase();
  if (regKey) {
    if (dispatchedEmailAlertRegs.has(regKey)) {
      console.log(`[EMAIL NOTICE] Suppressed duplicate admin alert for registration: ${regKey}`);
      return { success: true, messageId: 'duplicate-suppressed' };
    }
    dispatchedEmailAlertRegs.add(regKey);
    setTimeout(() => dispatchedEmailAlertRegs.delete(regKey), 30 * 60 * 1000).unref();
  }

  const adminEmail = (process.env.ADMIN_ALERT_EMAIL || process.env.SMTP_USER || DEFAULT_SMTP_USER).trim();
  if (!adminEmail || !adminEmail.includes('@')) {
    return { success: false, error: 'No admin alert recipient email configured.' };
  }

  const rawAppUrl = (process.env.APP_URL || '').trim();
  const appUrl = (rawAppUrl && !rawAppUrl.includes('localhost') ? rawAppUrl : 'https://www.nbkristieee.in').replace(/\/$/, '');
  const passUrl = `${appUrl}/register.html?passId=${encodeURIComponent(payload.regId || '')}&roll=${encodeURIComponent(payload.roll || '')}`;
  const adminUrl = `${appUrl}/nexusadmin`;

  const safeName = escapeHtml(payload.name || 'Delegate');
  const safeRoll = escapeHtml(payload.roll || 'N/A');
  const safePhone = escapeHtml(payload.phone || 'N/A');
  const cleanPhone = (payload.phone || '').replace(/\D/g, '').slice(-10);
  const safeEmail = escapeHtml(payload.email || 'N/A');
  const safeCollege = escapeHtml(payload.college || 'NBKRIST');
  const safeDept = escapeHtml(payload.dept || 'N/A');
  const safeYear = escapeHtml(payload.year || 'Student');
  const safeRegId = escapeHtml(payload.regId || 'N/A');
  const safePaymentMode = escapeHtml((payload.paymentMode || 'Online').toUpperCase());
  const safePaymentId = escapeHtml(payload.paymentId || 'N/A');
  const safeAmount = payload.totalPaid || 0;
  const eventsList = (payload.eventIds || []).map((e: string) => escapeHtml(String(e).toUpperCase())).join(', ') || 'Symposium Events';

  const textBody = `🚨 NEW NEXUSVERSE 2K26 REGISTRATION ALERT!

A new delegate has just registered:

• Name: ${payload.name}
• Roll: ${payload.roll}
• Phone: ${payload.phone}
• Email: ${payload.email}
• College: ${payload.college || 'NBKRIST'}
• Dept / Year: ${payload.dept || ''} (${payload.year || 'Student'})
• Registered Events: ${eventsList}
• Amount Paid: ₹${safeAmount} (${safePaymentMode})
• Payment Reference: ${payload.paymentId || 'N/A'}
• Registration ID: ${payload.regId}

QUICK ACTIONS:
- Open Executive Admin Portal: ${adminUrl}
- View Delegate Pass: ${passUrl}
- Call Delegate: tel:${cleanPhone}
- WhatsApp Delegate: https://wa.me/91${cleanPhone}
`;

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>New Registration Alert</title>
</head>
<body style="margin:0;padding:0;background-color:#09090d;font-family:'Segoe UI',Roboto,Helvetica,sans-serif;color:#f3ecd9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:20px 10px;background:#09090d;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width:540px;background:#13131a;border:1px solid #d4a935;border-radius:16px;overflow:hidden;box-shadow:0 8px 30px rgba(0,0,0,0.8);">
          <tr>
            <td style="padding:20px;background:linear-gradient(135deg, #1f1b0e 0%, #151520 100%);border-bottom:1px solid #2e2b22;text-align:center;">
              <span style="display:inline-block;padding:4px 12px;background:#2a1a08;border:1px solid #d4a935;border-radius:20px;color:#f2c14e;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">
                🚨 Executive Mobile Alert
              </span>
              <h1 style="margin:10px 0 4px 0;font-size:22px;color:#ffffff;font-weight:800;">
                New Registration Received!
              </h1>
              <p style="margin:0;font-size:16px;color:#3ecf8e;font-weight:700;">
                ₹${safeAmount} · ${safePaymentMode}
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px;">
              <table width="100%" style="font-size:13px;line-height:1.8;">
                <tr><td style="color:#a79f8b;width:120px;">Delegate:</td><td style="color:#ffffff;font-weight:700;">${safeName}</td></tr>
                <tr><td style="color:#a79f8b;">Roll Number:</td><td style="color:#f2c14e;font-weight:700;">${safeRoll}</td></tr>
                <tr><td style="color:#a79f8b;">Phone:</td><td style="color:#ffffff;"><a href="tel:${cleanPhone}" style="color:#3ecf8e;text-decoration:none;font-weight:600;">${safePhone}</a></td></tr>
                <tr><td style="color:#a79f8b;">Email:</td><td style="color:#ffffff;"><a href="mailto:${safeEmail}" style="color:#d4a935;text-decoration:none;">${safeEmail}</a></td></tr>
                <tr><td style="color:#a79f8b;">College:</td><td style="color:#ffffff;">${safeCollege}</td></tr>
                <tr><td style="color:#a79f8b;">Branch / Year:</td><td style="color:#ffffff;">${safeDept} (${safeYear})</td></tr>
                <tr><td style="color:#a79f8b;">Events:</td><td style="color:#ffffff;font-weight:600;">${eventsList}</td></tr>
                <tr><td style="color:#a79f8b;">Pass ID:</td><td style="color:#ffffff;font-family:monospace;font-size:12px;">${safeRegId}</td></tr>
                <tr><td style="color:#a79f8b;">Payment Ref:</td><td style="color:#ffffff;font-family:monospace;font-size:12px;">${safePaymentId}</td></tr>
              </table>

              <div style="margin-top:20px;text-align:center;">
                <a href="${adminUrl}" style="display:inline-block;padding:12px 20px;margin:4px;background:#d4a935;color:#000000;text-decoration:none;font-weight:800;border-radius:10px;font-size:13px;">
                  🛡️ Open Admin Center
                </a>
                <a href="${passUrl}" style="display:inline-block;padding:12px 20px;margin:4px;background:#1f1b0e;border:1px solid #d4a935;color:#f2c14e;text-decoration:none;font-weight:700;border-radius:10px;font-size:13px;">
                  🎟️ View Pass
                </a>
                ${cleanPhone ? `
                <a href="https://wa.me/91${cleanPhone}" style="display:inline-block;padding:12px 20px;margin:4px;background:#25d366;color:#052e16;text-decoration:none;font-weight:800;border-radius:10px;font-size:13px;">
                  💬 WhatsApp
                </a>` : ''}
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  try {
    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || `"NexusVerse 2K26 Alerts" <${process.env.SMTP_USER || DEFAULT_SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: adminEmail,
      subject: `🚨 [NEW REGISTRATION] ${payload.name} (${payload.roll}) - ₹${safeAmount} [${payload.regId}]`,
      text: textBody,
      html: htmlBody,
      headers: {
        'X-Priority': '1',
        'Importance': 'high',
        'X-MSMail-Priority': 'High'
      }
    });

    console.log(`[ADMIN ALERT SUCCESS] Sent mobile registration alert to ${adminEmail} (ID: ${info.messageId})`);
    return {
      success: true,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error(`[ADMIN ALERT ERROR] Failed to send admin alert to ${adminEmail}:`, err.message);
    return {
      success: false,
      error: err.message
    };
  }
}
