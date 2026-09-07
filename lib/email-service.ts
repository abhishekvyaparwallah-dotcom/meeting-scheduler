import nodemailer from 'nodemailer';
import { Meeting } from '@/lib/types';
import { formatTime12h } from '@/lib/meeting-utils';

interface MeetingEmailPayload {
  meeting: Meeting;
  bookedByName: string;
  bookedByRole: string;
}

/**
 * Creates SMTP Transporter using environment variables
 */
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (!host || !user || !pass) {
    return null;
  }

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
 * Sends branded HTML Email Notification to Admin whenever a new meeting is fixed
 */
export async function sendAdminMeetingNotification({
  meeting,
  bookedByName,
  bookedByRole,
}: MeetingEmailPayload): Promise<{ success: boolean; message: string }> {
  const adminEmail = process.env.ADMIN_NOTIFICATION_EMAIL || 'admin@vyaparwallah.com';
  const fromEmail = process.env.EMAIL_FROM || '"Vyapar Wallah Alert" <no-reply@vyaparwallah.com>';
  const timeFormatted = formatTime12h(meeting.time);

  const subject = `🚀 New Meeting Fixed: ${meeting.clientName} (${meeting.clientType}) - ${meeting.date} at ${timeFormatted}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
    .card { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
    .header { background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 24px; color: #ffffff; }
    .badge { display: inline-block; background-color: #ff6a00; color: #ffffff; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; }
    .title { font-size: 20px; font-weight: 800; margin-top: 10px; color: #ffffff; }
    .content { padding: 24px; }
    .info-table { width: 100%; border-collapse: collapse; margin-top: 15px; }
    .info-table td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
    .info-table td.label { font-weight: 700; color: #64748b; width: 38%; }
    .info-table td.value { font-weight: 600; color: #0f172a; }
    .highlight { background-color: #fff7ed; border-left: 4px solid #ff6a00; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-top: 20px; font-size: 13px; color: #9a3412; }
    .button-wrap { text-align: center; margin-top: 25px; margin-bottom: 10px; }
    .button { display: inline-block; background-color: #ff6a00; color: #ffffff !important; font-weight: 700; font-size: 14px; padding: 12px 28px; border-radius: 10px; text-decoration: none; }
    .footer { background-color: #f8fafc; padding: 16px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="badge">Vyapar Wallah CRM</span>
      <div class="title">🎉 New Client Meeting Booked!</div>
      <p style="margin: 6px 0 0 0; font-size: 13px; color: #cbd5e1;">A telecaller has fixed a new appointment.</p>
    </div>

    <div class="content">
      <table class="info-table">
        <tr>
          <td class="label">Client / Doctor:</td>
          <td class="value" style="font-size: 15px; color: #ff6a00;">${meeting.clientName}</td>
        </tr>
        <tr>
          <td class="label">Category:</td>
          <td class="value">
            <span style="background: ${meeting.clientType === 'Clinic / Hospital' ? '#ecfdf5' : '#eff6ff'}; color: ${meeting.clientType === 'Clinic / Hospital' ? '#047857' : '#1d4ed8'}; padding: 3px 8px; border-radius: 6px; font-size: 12px; font-weight: 700;">
              ${meeting.clientType}
            </span>
          </td>
        </tr>
        <tr>
          <td class="label">Meeting Date:</td>
          <td class="value">📅 <strong>${meeting.date}</strong></td>
        </tr>
        <tr>
          <td class="label">Meeting Time:</td>
          <td class="value">⏰ <strong>${timeFormatted} (IST)</strong></td>
        </tr>
        <tr>
          <td class="label">Phone Number:</td>
          <td class="value">📞 <a href="tel:${meeting.phone}" style="color: #0f172a; text-decoration: none; font-weight: 700;">${meeting.phone}</a></td>
        </tr>
        <tr>
          <td class="label">Booked By:</td>
          <td class="value">👤 ${bookedByName} (${bookedByRole})</td>
        </tr>
        ${
          meeting.notes
            ? `<tr>
                <td class="label">Initial Notes:</td>
                <td class="value" style="color: #475569; font-style: italic;">${meeting.notes}</td>
              </tr>`
            : ''
        }
      </table>

      <div class="highlight">
        💡 <strong>Reminder:</strong> Please ensure the sales team or representative is prepared with demo materials for this slot.
      </div>

      <div class="button-wrap">
        <a href="${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard" class="button">
          Open Admin Portal & Calendar
        </a>
      </div>
    </div>

    <div class="footer">
      Vyapar Wallah Meeting Scheduler & CRM • Automated Notification
    </div>
  </div>
</body>
</html>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n================== [ADMIN EMAIL NOTIFICATION] ==================');
    console.log(`To: ${adminEmail}`);
    console.log(`Subject: ${subject}`);
    console.log(`Client: ${meeting.clientName} (${meeting.clientType})`);
    console.log(`Date & Time: ${meeting.date} at ${timeFormatted}`);
    console.log(`Phone: ${meeting.phone}`);
    console.log(`Booked By: ${bookedByName} (${bookedByRole})`);
    console.log('----------------------------------------------------------------');
    console.log('NOTE: To send live emails, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local.');
    console.log('================================================================\n');

    return {
      success: true,
      message: 'Email preview generated in server console (SMTP credentials not configured).',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: adminEmail,
      subject,
      html: htmlContent,
    });

    console.log(`[EMAIL SENT] Notification delivered to Admin (${adminEmail}): Message ID ${info.messageId}`);
    return {
      success: true,
      message: `Email notification sent successfully to ${adminEmail}`,
    };
  } catch (error: any) {
    console.error('[EMAIL ERROR] Failed to send email via SMTP:', error);
    return {
      success: false,
      message: error?.message || 'Failed to send email via SMTP.',
    };
  }
}

interface LoginOtpPayload {
  email: string;
  name: string;
  otp: string;
  role: string;
}

/**
 * Sends a high-security 6-digit OTP verification email for portal login
 */
export async function sendLoginOtpEmail({
  email,
  name,
  otp,
  role,
}: LoginOtpPayload): Promise<{ success: boolean; message: string }> {
  const fromEmail = process.env.EMAIL_FROM || '"Vyapar Wallah Security" <no-reply@vyaparwallah.com>';
  const subject = `🔐 [Security Code: ${otp}] Login Verification - Vyapar Wallah`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 24px; color: #0f172a; }
    .card { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 18px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 28px 24px; text-align: center; color: #ffffff; }
    .logo-badge { display: inline-block; background-color: #ff6a00; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.8px; }
    .title { font-size: 22px; font-weight: 900; margin-top: 12px; color: #ffffff; letter-spacing: -0.5px; }
    .content { padding: 28px 24px; text-align: center; }
    .greeting { font-size: 15px; font-weight: 600; color: #334155; margin-bottom: 8px; }
    .instructions { font-size: 13px; color: #64748b; line-height: 1.6; margin-bottom: 24px; }
    .otp-box { background: #f8fafc; border: 2px dashed #ff6a00; border-radius: 14px; padding: 18px; margin: 20px 0; text-align: center; }
    .otp-code { font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0f172a; margin: 4px 0; }
    .otp-expiry { font-size: 12px; font-weight: 700; color: #ff6a00; text-transform: uppercase; margin-top: 4px; }
    .warning-box { background-color: #fff7ed; border-radius: 10px; border-left: 4px solid #ea580c; padding: 12px 14px; text-align: left; font-size: 12px; color: #9a3412; line-height: 1.5; margin-top: 24px; }
    .footer { background-color: #f8fafc; padding: 18px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <span class="logo-badge">Vyapar Wallah Portal</span>
      <div class="title">Two-Factor Authentication</div>
    </div>

    <div class="content">
      <div class="greeting">Hello, ${name} (${role}) 👋</div>
      <div class="instructions">
        A login attempt was initiated for your Vyapar Wallah account. Use the one-time security code below to complete sign in.
      </div>

      <div class="otp-box">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Your 6-Digit OTP</div>
        <div class="otp-code">${otp}</div>
        <div class="otp-expiry">⏱️ Valid for 5 minutes only</div>
      </div>

      <div class="warning-box">
        🔒 <strong>Security Notice:</strong> Never share this OTP with anyone, including staff. If you did not request this code, please reset your password immediately.
      </div>
    </div>

    <div class="footer">
      Vyapar Wallah Meeting Scheduler & CRM • Automated Security System
    </div>
  </div>
</body>
</html>
  `;

  const transporter = getTransporter();

  if (!transporter) {
    console.log('\n================== [LOGIN 2FA OTP EMAIL] ==================');
    console.log(`To: ${email} (${name} - ${role})`);
    console.log(`Subject: ${subject}`);
    console.log(`🔐 OTP SECURITY CODE: >>> ${otp} <<<`);
    console.log('Validity: 5 Minutes');
    console.log('-----------------------------------------------------------');
    console.log('NOTE: To send live emails to inbox, configure SMTP_HOST, SMTP_USER, and SMTP_PASS in .env.local.');
    console.log('===========================================================\n');

    return {
      success: true,
      message: 'OTP preview generated in server console (SMTP credentials not configured).',
    };
  }

  try {
    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject,
      html: htmlContent,
    });

    console.log(`[OTP SENT] Security verification code delivered to ${email}: Message ID ${info.messageId}`);
    return {
      success: true,
      message: `OTP delivered to ${email}`,
    };
  } catch (error: any) {
    console.error('[OTP ERROR] Failed to send OTP email via SMTP:', error);
    return {
      success: false,
      message: error?.message || 'Failed to send OTP email via SMTP.',
    };
  }
}
