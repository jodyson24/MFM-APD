const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

/**
 * SMTP transport is configured via env vars. When SMTP is not configured
 * (dev mode), emails are logged to the console instead of being sent.
 */
let transporter = null;

function getTransporter() {
  if (transporter) return transporter;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST) {
    return null; // dev fallback below
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: parseInt(SMTP_PORT || '587', 10),
    secure: SMTP_PORT === '465',
    auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
  return transporter;
}

function sendOrLog(message, email) {
  const t = getTransporter();
  if (!t) {
    logger.info(`[mail:dev] would send to ${email}: ${message.subject}`);
    return Promise.resolve();
  }
  return t.sendMail(message);
}

// Invite email with a one-time set-password link (§8.1)
exports.sendInviteEmail = async (email, token, user = {}) => {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  const link = `${frontendUrl}/set-password?token=${token}`;
  const name = user.name || 'there';

  const message = {
    from: process.env.MAIL_FROM || `"MFM APD" <${process.env.SMTP_USER || 'no-reply@localhost'}>`,
    to: email,
    subject: 'You have been invited to the MFM Activity Performance Dashboard',
    text: `Hello ${name},

You have been invited to use the MFM Activity Performance Dashboard.

Set your password using this link (valid for 72 hours):
${link}

If you did not expect this invitation, you can safely ignore this email.

— MFM Administration`,
    html: `<p>Hello ${name},</p>
<p>You have been invited to use the <strong>MFM Activity Performance Dashboard</strong>.</p>
<p>Set your password using this link (valid for 72 hours):</p>
<p><a href="${link}">${link}</a></p>
<p>If you did not expect this invitation, you can safely ignore this email.</p>
<p>— MFM Administration</p>`,
  };

  try {
    await sendOrLog(message, email);
    return true;
  } catch (error) {
    logger.error(`Failed to send invite to ${email}: ${error.message}`);
    throw error;
  }
};

// Generic mail helper for future alerting (e.g. compliance shortfalls)
exports.sendMail = async (to, subject, text, html) => {
  const message = {
    from: process.env.MAIL_FROM || `"MFM APD" <${process.env.SMTP_USER || 'no-reply@localhost'}>`,
    to,
    subject,
    text,
    html,
  };
  await sendOrLog(message, to);
};
