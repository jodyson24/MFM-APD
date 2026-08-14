const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

/**
 * cPanel SMTP configuration
 *
 * Expected environment variables:
 *
 * SMTP_HOST=sivarenterprise.com
 * SMTP_PORT=465
 * SMTP_SECURE=true
 * SMTP_USER=admin@sivarenterprise.com
 * SMTP_PASS=your-email-password
 *
 * MAIL_FROM=admin@sivarenterprise.com
 * MAIL_FROM_NAME=MFM APD
 *
 * FRONTEND_URL=https://your-frontend-domain.com
 */

function getEmailSendTimeoutMs() {
  const value = Number(process.env.EMAIL_SEND_TIMEOUT_MS || 8000);
  return Number.isFinite(value) && value > 0 ? value : 8000;
}

function withTimeout(promise, label) {
  const timeoutMs = getEmailSendTimeoutMs();

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(
        () => reject(new Error(`${label} timed out after ${timeoutMs}ms`)),
        timeoutMs
      );
    }),
  ]);
}

/**
 * Create the SMTP transporter.
 *
 * cPanel configuration:
 * Host: sivarenterprise.com
 * Port: 465
 * SSL/TLS: enabled
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = Number(process.env.SMTP_PORT || 465);
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;

  const SMTP_SECURE =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : SMTP_PORT === 465;

  // Validate required SMTP configuration
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.error(
      '[mail] Missing SMTP configuration. Required: SMTP_HOST, SMTP_USER, SMTP_PASS'
    );

    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,

    // Port 465 uses implicit TLS.
    // Port 587 would use STARTTLS instead.
    requireTLS: !SMTP_SECURE && SMTP_PORT === 587,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },

    connectionTimeout: getEmailSendTimeoutMs(),
    greetingTimeout: getEmailSendTimeoutMs(),
    socketTimeout: getEmailSendTimeoutMs(),
  });

  return transporter;
}

/**
 * Optional Resend fallback.
 *
 * SMTP remains the primary provider.
 */
async function sendViaResend({ to, subject, text, html }) {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return null;
  }

  const from =
    process.env.RESEND_FROM ||
    process.env.MAIL_FROM ||
    'MFM APD <onboarding@resend.dev>';

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',

    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },

    body: JSON.stringify({
      from,
      to: [to],
      subject,
      text,
      html,
    }),
  });

  if (!response.ok) {
    const errBody = await response.text();

    throw new Error(
      `Resend API request failed (${response.status}): ${
        errBody || 'unknown error'
      }`
    );
  }

  return response;
}

/**
 * Send email through cPanel SMTP.
 *
 * Resend is only used if SMTP is not configured.
 */
async function sendOrLog(message, email) {
  const transporter = getTransporter();

  // Primary provider: cPanel SMTP
  if (transporter) {
    try {
      const result = await withTimeout(
        transporter.sendMail(message),
        `Email send to ${email}`
      );

      logger.info(
        `[mail:smtp] Email sent successfully to ${email}. Message ID: ${result.messageId}`
      );

      return result;
    } catch (error) {
      logger.error(
        `[mail:smtp] Failed to send email to ${email}: ${error.message}`
      );

      throw error;
    }
  }

  // Optional fallback: Resend
  if (process.env.RESEND_API_KEY) {
    try {
      logger.warn(
        `[mail:resend] SMTP unavailable. Attempting Resend fallback for ${email}`
      );

      const result = await sendViaResend({
        to: email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      logger.info(`[mail:resend] Email sent successfully to ${email}`);

      return result;
    } catch (error) {
      logger.error(
        `[mail:resend] Failed to send email to ${email}: ${error.message}`
      );

      throw error;
    }
  }

  const missingConfigMessage =
    'Email configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.';

  if (process.env.NODE_ENV === 'production') {
    logger.error(`[mail:prod] ${missingConfigMessage}`);
    throw new Error(missingConfigMessage);
  }

  // Development mode
  logger.info(`[mail:dev] ${missingConfigMessage}`);
  logger.info(`[mail:dev] Email would have been sent to: ${email}`);

  return null;
}

/**
 * Build invitation email HTML.
 */
function buildInviteHtml({ name, link }) {
  const appName = 'MFM Activity Performance Dashboard';

  return `
    <div style="margin:0;padding:0;background-color:#f4f4f9;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f9;padding:32px 0;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;background-color:#ffffff;border:1px solid #e7e5f3;border-radius:16px;overflow:hidden;">
              
              <tr>
                <td style="padding:24px 32px 16px 32px;background:linear-gradient(135deg,#5b21b6 0%,#7c3aed 100%);">
                  <div style="font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:#ede9fe;">
                    MFM APD
                  </div>

                  <div style="font-size:28px;line-height:34px;font-weight:700;color:#ffffff;margin-top:8px;">
                    Account Invitation
                  </div>
                </td>
              </tr>

              <tr>
                <td style="padding:32px;">
                  <p style="margin:0 0 16px;font-size:16px;line-height:24px;color:#22253a;">
                    Hello ${name},
                  </p>

                  <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#32384f;">
                    You have been invited to join the
                    <strong style="color:#5b21b6;">
                      ${appName}
                    </strong>.
                  </p>

                  <p style="margin:0 0 20px;font-size:16px;line-height:24px;color:#32384f;">
                    To set up your password and activate your account,
                    click the button below. This invite is valid for 72 hours.
                  </p>

                  <div style="margin:0 0 24px;">
                    <a
                      href="${link}"
                      style="display:inline-block;background-color:#7c3aed;color:#ffffff;text-decoration:none;font-size:15px;font-weight:700;line-height:18px;padding:14px 24px;border-radius:10px;"
                    >
                      Set your password
                    </a>
                  </div>

                  <p style="margin:0 0 8px;font-size:14px;line-height:22px;color:#4f5a80;">
                    If the button does not work, use this link:
                  </p>

                  <p style="margin:0 0 24px;font-size:14px;line-height:22px;word-break:break-all;color:#4f5a80;">
                    <a
                      href="${link}"
                      style="color:#6d28d9;text-decoration:none;"
                    >
                      ${link}
                    </a>
                  </p>

                  <p style="margin:0;font-size:14px;line-height:22px;color:#4f5a80;">
                    If you did not expect this invitation, you can safely ignore this email.
                  </p>
                </td>
              </tr>

              <tr>
                <td style="padding:0 32px 28px 32px;">
                  <div style="border-top:1px solid #e7e5f3;padding-top:16px;font-size:12px;line-height:18px;color:#64709a;">
                    MFM Administration<br />
                    Activity Performance Dashboard
                  </div>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

/**
 * Email sender address.
 *
 * If MAIL_FROM is provided, it is used directly.
 * Otherwise it uses the SMTP account.
 */
function getFromAddress() {
  const senderName = process.env.MAIL_FROM_NAME || 'MFM APD';

  const smtpUser =
    process.env.SMTP_USER || 'admin@sivarenterprise.com';

  return (
    process.env.MAIL_FROM ||
    `${senderName} <${smtpUser}>`
  );
}

/**
 * Send invitation email.
 */
exports.sendInviteEmail = async (email, token, user = {}) => {
  const frontendUrl =
    process.env.FRONTEND_URL || 'http://localhost:5173';

  const link =
    `${frontendUrl}/set-password?token=${encodeURIComponent(token)}`;

  const name = user.name || 'there';

  const message = {
    from: getFromAddress(),

    to: email,

    subject:
      'You have been invited to the MFM Activity Performance Dashboard',

    text: `Hello ${name},

You have been invited to use the MFM Activity Performance Dashboard.

Set your password using this link (valid for 72 hours):
${link}

If you did not expect this invitation, you can safely ignore this email.

— MFM Administration`,

    html: buildInviteHtml({
      name,
      link,
    }),
  };

  try {
    await sendOrLog(message, email);

    return true;
  } catch (error) {
    logger.warn(
      `Failed to send invite to ${email}: ${error.message}`
    );

    throw error;
  }
};

/**
 * Generic mail helper.
 */
exports.sendMail = async (
  to,
  subject,
  text,
  html
) => {
  const message = {
    from: getFromAddress(),
    to,
    subject,
    text,
    html,
  };

  await sendOrLog(message, to);
};

/**
 * Optional SMTP connection test.
 *
 * Useful during deployment/debugging.
 */
exports.verifyEmailConnection = async () => {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error(
      'SMTP configuration is missing.'
    );
  }

  await transporter.verify();

  logger.info(
    '[mail:smtp] SMTP connection verified successfully.'
  );

  return true;
};