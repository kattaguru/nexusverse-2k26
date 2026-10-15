import nodemailer from 'nodemailer';
import dotenv from 'dotenv';

dotenv.config();

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
  totalPaid: number;
  paymentId: string;
}

// Check if SMTP is configured
export function isEmailConfigured(): boolean {
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();
  return Boolean(user && pass && !user.includes('your-email') && !pass.includes('your-app-password'));
}

// Create Nodemailer Transporter
function getTransporter() {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT || 465);
  const secure = port === 465;
  const user = (process.env.SMTP_USER || '').trim();
  const pass = (process.env.SMTP_PASS || '').trim();

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

/**
 * Generate beautifully styled NexusVerse 2K26 Email Template
 */
function generateTicketEmailHtml(payload: EmailTicketPayload, passUrl: string): string {
  const eventBadges = payload.eventIds
    .map(
      (ev) =>
        `<span style="display:inline-block;padding:4px 10px;margin:3px;background-color:#1f1b0e;border:1px solid #d4a935;color:#f2c14e;border-radius:6px;font-size:12px;font-weight:600;text-transform:uppercase;">${ev}</span>`
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
                ✓ Payment Received & Delegate Pass Confirmed
              </div>
              <h2 style="margin:16px 0 4px 0;font-size:20px;color:#ffffff;font-weight:700;">
                Greetings, ${payload.name}!
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
                    <strong style="font-size:20px;color:#f2c14e;font-family:monospace;letter-spacing:1px;">${payload.regId}</strong>
                  </td>
                  <td align="right" style="padding-bottom:12px;border-bottom:1px solid #282833;">
                    <span style="font-size:11px;text-transform:uppercase;color:#a79f8b;display:block;">Amount Paid</span>
                    <strong style="font-size:20px;color:#3ecf8e;font-family:monospace;">₹${payload.totalPaid}</strong>
                  </td>
                </tr>

                <tr>
                  <td colspan="2" style="padding-top:14px;">
                    <table width="100%" style="font-size:13px;line-height:1.6;">
                      <tr>
                        <td style="color:#a79f8b;width:120px;">Roll Number:</td>
                        <td style="color:#ffffff;font-weight:600;">${payload.roll}</td>
                      </tr>
                      ${payload.dept ? `<tr><td style="color:#a79f8b;">Department:</td><td style="color:#ffffff;">${payload.dept} (${payload.year || 'Student'})</td></tr>` : ''}
                      ${payload.college ? `<tr><td style="color:#a79f8b;">College:</td><td style="color:#ffffff;">${payload.college}</td></tr>` : ''}
                      <tr>
                        <td style="color:#a79f8b;">Payment Ref:</td>
                        <td style="color:#ffffff;font-family:monospace;font-size:11px;">${payload.paymentId}</td>
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

          <!-- CTA Button -->
          <tr>
            <td style="padding:20px 24px;text-align:center;">
              <a href="${passUrl}" target="_blank" style="display:inline-block;padding:14px 32px;background:#f2c14e;color:#1a1300;text-decoration:none;font-size:14px;font-weight:800;border-radius:12px;box-shadow:0 4px 16px rgba(242,193,78,0.3);letter-spacing:0.5px;">
                🎟️ View & Download QR Ticket Pass
              </a>
              <p style="margin:12px 0 0 0;font-size:11px;color:#857e6c;">
                You can also look up your pass anytime on the website using your roll number: <strong style="color:#d4a935;">${payload.roll}</strong>
              </p>
            </td>
          </tr>

          <!-- Venue & Guidelines -->
          <tr>
            <td style="padding:16px 24px;background:#0d0d12;border-top:1px solid #22222a;font-size:11px;color:#8a8373;line-height:1.5;">
              <strong style="color:#ffffff;">Symposium Venue:</strong> NBKR Institute of Science & Technology, Vidyanagar, Nellore Dist, AP.<br>
              <strong style="color:#ffffff;">Important Instructions:</strong> Please present your digital QR pass or printed ID card at the IEEE Help Desk upon arrival for registration kit and entry badge.
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:18px 24px;text-align:center;font-size:11px;color:#6b6557;">
              © 2026 NexusVerse · IEEE Student Branch NBKRIST<br>
              For support or spot entries, reach out to <a href="mailto:support@nexusverse.org" style="color:#d4a935;text-decoration:none;">support@nexusverse.org</a>
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

  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const passUrl = `${appUrl}/register?lookup=${encodeURIComponent(payload.roll)}`;

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
    const fromAddress = process.env.EMAIL_FROM || `"NexusVerse 2K26" <${process.env.SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress,
      to: payload.email,
      subject: `🎟️ NexusVerse 2K26 Pass Confirmed [${payload.regId}] · IEEE-SB NBKRIST`,
      html: generateTicketEmailHtml(payload, passUrl),
    });

    console.log(`[EMAIL SUCCESS] Ticket pass email sent to ${payload.email} (ID: ${info.messageId})`);
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
