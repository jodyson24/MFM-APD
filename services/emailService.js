const nodemailer = require('nodemailer');
const logger = require('../utils/logger');
const { renderInviteEmail, renderPasswordResetEmail } = require('../utils/templateRenderer');

/**
 * ============================================================
 * EMAIL SERVICE
 * ============================================================
 *
 * PROVIDER ORDER:
 *
 * 1. Brevo SMTP       -> PRIMARY
 * 2. cPanel SMTP      -> BACKUP
 * 3. Resend API       -> OPTIONAL FINAL FALLBACK
 *
 *
 * BREVO:
 *
 * BREVO_SMTP_HOST=smtp-relay.brevo.com
 * BREVO_SMTP_PORT=587
 * BREVO_SMTP_SECURE=false
 * BREVO_SMTP_USER=your-brevo-smtp-login
 * BREVO_SMTP_PASS=your-brevo-smtp-key
 *
 *
 * CPANEL:
 *
 * SMTP_HOST=sivarenterprise.com
 * SMTP_PORT=465
 * SMTP_SECURE=true
 * SMTP_USER=admin@sivarenterprise.com
 * SMTP_PASS=your-cpanel-email-password
 *
 *
 * MAIL:
 *
 * MAIL_FROM=admin@sivarenterprise.com
 * MAIL_FROM_NAME=MFM APD
 *
 *
 * OTHER:
 *
 * EMAIL_SEND_TIMEOUT_MS=30000
 * FRONTEND_URL=https://your-frontend-url.com
 *
 *
 * OPTIONAL RESEND:
 *
 * RESEND_API_KEY=re_xxxxxxxxx
 * RESEND_FROM=MFM APD <admin@sivarenterprise.com>
 *
 * ============================================================
 */


let brevoTransporter = null;
let smtpTransporter = null;


/**
 * ============================================================
 * TIMEOUT
 * ============================================================
 */

function getEmailSendTimeoutMs() {
  const value = Number(
    process.env.EMAIL_SEND_TIMEOUT_MS || 30000
  );

  return Number.isFinite(value) && value > 0
    ? value
    : 30000;
}


/**
 * ============================================================
 * PROMISE TIMEOUT
 * ============================================================
 */

function withTimeout(promise, label) {
  const timeoutMs = getEmailSendTimeoutMs();

  let timeout;

  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => {
      reject(
        new Error(
          `${label} timed out after ${timeoutMs}ms`
        )
      );
    }, timeoutMs);
  });

  return Promise.race([
    promise,
    timeoutPromise,
  ]).finally(() => {
    clearTimeout(timeout);
  });
}


/**
 * ============================================================
 * BREVO SMTP TRANSPORTER
 * ============================================================
 *
 * Brevo SMTP:
 *
 * Host: smtp-relay.brevo.com
 * Port: 587
 * Security: STARTTLS
 *
 * IMPORTANT:
 * BREVO_SMTP_PASS must contain the SMTP key value.
 *
 * Do NOT put the SMTP key directly in this file.
 * ============================================================
 */

function getBrevoTransporter() {
  if (brevoTransporter) {
    return brevoTransporter;
  }

  const BREVO_SMTP_HOST =
    process.env.BREVO_SMTP_HOST ||
    'smtp-relay.brevo.com';

  const BREVO_SMTP_PORT =
    Number(
      process.env.BREVO_SMTP_PORT || 587
    );

  const BREVO_SMTP_USER =
    process.env.BREVO_SMTP_USER;

  const BREVO_SMTP_PASS =
    process.env.BREVO_SMTP_PASS;

  const BREVO_SMTP_SECURE =
    process.env.BREVO_SMTP_SECURE !== undefined
      ? String(
        process.env.BREVO_SMTP_SECURE
      ).toLowerCase() === 'true'
      : false;


  /**
   * Validate Brevo configuration.
   */
  if (
    !BREVO_SMTP_USER ||
    !BREVO_SMTP_PASS
  ) {
    logger.warn(
      '[mail:brevo] Brevo SMTP credentials are not configured.'
    );

    return null;
  }


  /**
   * Create Brevo transporter.
   *
   * Port 587 uses STARTTLS.
   */
  brevoTransporter =
    nodemailer.createTransport({
      host: BREVO_SMTP_HOST,

      port: BREVO_SMTP_PORT,

      secure: BREVO_SMTP_SECURE,

      requireTLS:
        BREVO_SMTP_PORT === 587,

      auth: {
        user: BREVO_SMTP_USER,
        pass: BREVO_SMTP_PASS,
      },

      connectionTimeout:
        getEmailSendTimeoutMs(),

      greetingTimeout:
        getEmailSendTimeoutMs(),

      socketTimeout:
        getEmailSendTimeoutMs(),
    });


  logger.info(
    `[mail:brevo] SMTP transporter configured for ${BREVO_SMTP_HOST}:${BREVO_SMTP_PORT}`
  );


  return brevoTransporter;
}


/**
 * ============================================================
 * CPANEL SMTP TRANSPORTER
 * ============================================================
 *
 * Backup provider.
 *
 * cPanel:
 *
 * Host: sivarenterprise.com
 * Port: 465
 * Security: SSL/TLS
 * User: admin@sivarenterprise.com
 *
 * ============================================================
 */

function getCpanelTransporter() {
  if (smtpTransporter) {
    return smtpTransporter;
  }


  const SMTP_HOST =
    process.env.SMTP_HOST;

  const SMTP_PORT =
    Number(
      process.env.SMTP_PORT || 465
    );

  const SMTP_USER =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.SMTP_EMAIL;

  const SMTP_PASS =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD;

  const SMTP_SECURE =
    process.env.SMTP_SECURE !== undefined
      ? String(
        process.env.SMTP_SECURE
      ).toLowerCase() === 'true'
      : SMTP_PORT === 465;


  /**
   * Validate cPanel configuration.
   */
  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    logger.warn(
      '[mail:cpanel] cPanel SMTP credentials are not configured.'
    );

    return null;
  }


  /**
   * Create cPanel transporter.
   */
  smtpTransporter =
    nodemailer.createTransport({
      host: SMTP_HOST,

      port: SMTP_PORT,

      secure: SMTP_SECURE,

      requireTLS:
        !SMTP_SECURE &&
        SMTP_PORT === 587,

      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS,
      },

      connectionTimeout:
        getEmailSendTimeoutMs(),

      greetingTimeout:
        getEmailSendTimeoutMs(),

      socketTimeout:
        getEmailSendTimeoutMs(),
    });


  logger.info(
    `[mail:cpanel] SMTP transporter configured for ${SMTP_HOST}:${SMTP_PORT}`
  );


  return smtpTransporter;
}


/**
 * ============================================================
 * BREVO API
 * ============================================================
 *
 * Primary API route using the Brevo v3 email endpoint.
 *
 * This is preferred when BREVO_API_KEY is present.
 *
 * ============================================================
 */

async function sendViaBrevoApi({
  to,
  subject,
  text,
  html,
}) {
  const apiKey = process.env.BREVO_API_KEY;

  if (!apiKey) {
    return null;
  }

  const from =
    process.env.BREVO_MAIL_FROM ||
    process.env.MAIL_FROM ||
    'MFM APD <noreply@brevo.com>';

  const response = await fetch(
    'https://api.brevo.com/v3/smtp/email',
    {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        sender: {
          name: from.includes('<') ? from.split('<')[0].trim() : 'MFM APD',
          email: from.includes('<') ? from.match(/<([^>]+)>/)?.[1] || from : from,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html || text,
        textContent: text || html,
      }),
    }
  );

  if (!response.ok) {
    const errBody = await response.text();
    throw new Error(
      `Brevo API request failed (${response.status}): ${errBody || 'unknown error'}`
    );
  }

  return response;
}


/**
 * ============================================================
 * RESEND API
 * ============================================================
 *
 * Optional final fallback.
 *
 * Brevo -> cPanel -> Resend
 *
 * ============================================================
 */

async function sendViaResend({
  to,
  subject,
  text,
  html,
}) {
  const apiKey =
    process.env.RESEND_API_KEY;


  if (!apiKey) {
    return null;
  }


  const from =
    process.env.RESEND_FROM ||
    process.env.MAIL_FROM ||
    'MFM APD <onboarding@resend.dev>';


  const response =
    await fetch(
      'https://api.resend.com/emails',
      {
        method: 'POST',

        headers: {
          Authorization:
            `Bearer ${apiKey}`,

          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
          from,

          to: [to],

          subject,

          text,

          html,
        }),
      }
    );


  if (!response.ok) {
    const errBody =
      await response.text();


    throw new Error(
      `Resend API request failed (${response.status}): ${errBody || 'unknown error'
      }`
    );
  }


  return response;
}


/**
 * ============================================================
 * SEND THROUGH BREVO
 * ============================================================
 */

async function sendViaBrevo(
  message,
  email
) {
  const transporter =
    getBrevoTransporter();


  if (!transporter) {
    return null;
  }


  try {
    logger.info(
      `[mail:brevo] Attempting to send email to ${email}`
    );


    const result =
      await withTimeout(
        transporter.sendMail(
          message
        ),
        `Brevo email send to ${email}`
      );


    logger.info(
      `[mail:brevo] Email sent successfully to ${email}. Message ID: ${result.messageId}`
    );


    return result;

  } catch (error) {

    logger.error(
      `[mail:brevo] Failed to send email to ${email}: ${error.message}`
    );


    /**
     * Reset transporter so the next attempt
     * creates a fresh connection.
     */
    brevoTransporter = null;


    throw error;
  }
}


/**
 * ============================================================
 * SEND THROUGH CPANEL
 * ============================================================
 */

async function sendViaCpanel(
  message,
  email
) {
  const transporter =
    getCpanelTransporter();


  if (!transporter) {
    return null;
  }


  try {
    logger.info(
      `[mail:cpanel] Attempting to send email to ${email}`
    );


    const result =
      await withTimeout(
        transporter.sendMail(
          message
        ),
        `cPanel email send to ${email}`
      );


    logger.info(
      `[mail:cpanel] Email sent successfully to ${email}. Message ID: ${result.messageId}`
    );


    return result;

  } catch (error) {

    logger.error(
      `[mail:cpanel] Failed to send email to ${email}: ${error.message}`
    );


    /**
     * Reset transporter.
     */
    smtpTransporter = null;


    throw error;
  }
}


/**
 * ============================================================
 * MAIN SEND FUNCTION
 * ============================================================
 *
 * Provider priority:
 *
 * BREVO
 *   â†“
 * CPANEL
 *   â†“
 * RESEND
 *
 * ============================================================
 */

async function sendOrLog(
  message,
  email
) {

  let brevoError = null;
  let cpanelError = null;
  let resendError = null;


  /**
   * ----------------------------------------------------------
   * 1. BREVO API - PRIMARY
   * ----------------------------------------------------------
   */

  if (process.env.BREVO_API_KEY) {
    try {
      logger.warn(`[mail] Using Brevo API for ${email}.`);

      const result = await sendViaBrevoApi({
        to: email,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });

      if (result) {
        logger.info(`[mail:brevo-api] Email sent successfully to ${email}`);
        return result;
      }
    } catch (error) {
      brevoError = error;
      logger.warn(`[mail] Brevo API failed for ${email}. Falling back to SMTP.`);
    }
  } else {
    logger.warn('[mail] Brevo API key is not configured. Skipping Brevo API provider.');
  }


  /**
   * ----------------------------------------------------------
   * 2. BREVO SMTP - SECONDARY
   * ----------------------------------------------------------
   */

  if (process.env.BREVO_SMTP_USER && process.env.BREVO_SMTP_PASS) {
    try {
      const result =
        await sendViaBrevo(message, email);
      if (result) {
        return result;
      }
    } catch (error) {
      brevoError = error;
      logger.warn(`[mail] Brevo SMTP failed for ${email}. Falling back to cPanel SMTP.`);
    }
  } else {
    logger.warn('[mail] Brevo SMTP is not configured. Skipping secondary Brevo provider.');
  }

  /**
   * ----------------------------------------------------------
   * 3. CPANEL - BACKUP
   * ----------------------------------------------------------
   */

  if (
    process.env.SMTP_HOST &&
    (
      process.env.SMTP_USER ||
      process.env.SMTP_USERNAME ||
      process.env.SMTP_EMAIL
    ) &&
    (
      process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD
    )
  ) {

    try {

      const result =
        await sendViaCpanel(
          message,
          email
        );


      if (result) {
        return result;
      }

    } catch (error) {

      cpanelError = error;


      logger.warn(
        `[mail] cPanel SMTP failed for ${email}.`
      );
    }

  } else {

    logger.warn(
      '[mail] cPanel SMTP backup is not configured.'
    );
  }


  /**
   * ----------------------------------------------------------
   * 4. RESEND - OPTIONAL FINAL FALLBACK
   * ----------------------------------------------------------
   */

  if (
    process.env.RESEND_API_KEY
  ) {

    try {

      logger.warn(
        `[mail] SMTP providers failed. Attempting Resend for ${email}.`
      );


      const result =
        await sendViaResend({
          to: email,

          subject:
            message.subject,

          text:
            message.text,

          html:
            message.html,
        });


      logger.info(
        `[mail:resend] Email sent successfully to ${email}`
      );


      return result;

    } catch (error) {

      resendError = error;


      logger.error(
        `[mail:resend] Resend failed for ${email}: ${error.message}`
      );
    }
  }


  /**
   * ----------------------------------------------------------
   * 4. ALL PROVIDERS FAILED
   * ----------------------------------------------------------
   */

  const errors = [];


  if (brevoError) {
    errors.push(
      `Brevo: ${brevoError.message}`
    );
  }


  if (cpanelError) {
    errors.push(
      `cPanel: ${cpanelError.message}`
    );
  }


  if (resendError) {
    errors.push(
      `Resend: ${resendError.message}`
    );
  }


  const finalError =
    errors.length > 0
      ? `All email providers failed. ${errors.join(' | ')}`
      : 'No email provider is configured.';


  if (
    process.env.NODE_ENV === 'production'
  ) {

    logger.error(
      `[mail:prod] ${finalError}`
    );


    throw new Error(
      finalError
    );
  }


  /**
   * Development mode.
   */
  logger.info(
    `[mail:dev] ${finalError}`
  );


  logger.info(
    `[mail:dev] Email would have been sent to: ${email}`
  );


  return null;
}


/**
 * ============================================================
 * INVITATION EMAIL HTML
 * ============================================================
 */

function buildInviteHtml({
  name,
  link,
}) {
  return renderInviteEmail({ name, link });
}

function getFromAddress() {

  const senderName =
    process.env.MAIL_FROM_NAME ||
    process.env.SMTP_MAIL_FROM_NAME ||
    'MFM APD';


  /**
   * Prefer the explicit sender we have configured for the active mail route.
   * This keeps the email identity aligned with the provider owner and avoids
   * a mismatched From header when using Brevo or cPanel.
   */
  const brevoFrom =
    process.env.BREVO_MAIL_FROM;

  if (brevoFrom) {
    return brevoFrom;
  }

  if (
    process.env.MAIL_FROM
  ) {
    return process.env.MAIL_FROM;
  }

  if (
    process.env.MAIL_FROM_ADDRESS
  ) {
    return (
      `${senderName} <${process.env.MAIL_FROM_ADDRESS}>`
    );
  }

  if (
    process.env.SMTP_MAIL_FROM
  ) {
    return process.env.SMTP_MAIL_FROM;
  }

  /**
   * Fallback to the cPanel account.
   */
  const smtpUser =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.SMTP_EMAIL ||
    'admin@sivarenterprise.com';


  return (
    `${senderName} <${smtpUser}>`
  );
}


/**
 * ============================================================
 * SEND INVITATION EMAIL
 * ============================================================
 */

exports.sendInviteEmail = async (
  email,
  token,
  user = {}
) => {

  const frontendUrl =
    process.env.FRONTEND_URL ||
    'http://localhost:5173';


  /**
   * Encode token to safely handle
   * special URL characters.
   */
  const link =
    `${frontendUrl}/set-password?token=${encodeURIComponent(token)}`;


  const name =
    user.name || 'there';


  const message = {

    from:
      getFromAddress(),

    to:
      email,

    subject:
      'You have been invited to the MFM Activity Performance Dashboard',

    text:
      `Hello ${name},

You have been invited to use the MFM Activity Performance Dashboard.

Set your password using this link (valid for 72 hours):

${link}

If you did not expect this invitation, you can safely ignore this email.

â€” MFM Administration`,

    html:
      buildInviteHtml({
        name,
        link,
      }),
  };


  try {

    await sendOrLog(
      message,
      email
    );


    return true;

  } catch (error) {

    logger.warn(
      `Failed to send invite to ${email}: ${error.message}`
    );


    throw error;
  }
};


/**
 * ============================================================
 * GENERIC SEND MAIL
 * ============================================================
 */

exports.sendMail = async (
  to,
  subject,
  text,
  html
) => {

  const message = {

    from:
      getFromAddress(),

    to,

    subject,

    text,

    html,
  };


  await sendOrLog(
    message,
    to
  );
};


/**
 * ============================================================
 * VERIFY BREVO CONNECTION
 * ============================================================
 */

exports.verifyBrevoConnection = async () => {

  const transporter =
    getBrevoTransporter();


  if (!transporter) {

    throw new Error(
      'Brevo SMTP configuration is missing.'
    );
  }


  try {

    await withTimeout(
      transporter.verify(),
      'Brevo SMTP connection verification'
    );


    logger.info(
      '[mail:brevo] SMTP connection verified successfully.'
    );


    return true;

  } catch (error) {

    logger.error(
      `[mail:brevo] SMTP verification failed: ${error.message}`
    );


    brevoTransporter = null;


    throw error;
  }
};


/**
 * ============================================================
 * VERIFY CPANEL CONNECTION
 * ============================================================
 */

exports.verifyCpanelConnection = async () => {

  const transporter =
    getCpanelTransporter();


  if (!transporter) {

    throw new Error(
      'cPanel SMTP configuration is missing.'
    );
  }


  try {

    await withTimeout(
      transporter.verify(),
      'cPanel SMTP connection verification'
    );


    logger.info(
      '[mail:cpanel] SMTP connection verified successfully.'
    );


    return true;

  } catch (error) {

    logger.error(
      `[mail:cpanel] SMTP verification failed: ${error.message}`
    );


    smtpTransporter = null;


    throw error;
  }
};


/**
 * ============================================================
 * VERIFY ALL SMTP PROVIDERS
 * ============================================================
 *
 * Useful during deployment/debugging.
 * Does not send an email.
 * ============================================================
 */

exports.verifyEmailConnections = async () => {

  const results = {
    brevo: {
      configured: false,
      connected: false,
      error: null,
    },

    cpanel: {
      configured: false,
      connected: false,
      error: null,
    },
  };


  /**
   * Brevo
   */
  if (
    process.env.BREVO_SMTP_USER &&
    process.env.BREVO_SMTP_PASS
  ) {

    results.brevo.configured = true;


    try {

      await exports.verifyBrevoConnection();

      results.brevo.connected = true;

    } catch (error) {

      results.brevo.error =
        error.message;
    }
  }


  /**
   * cPanel
   */
  if (
    process.env.SMTP_HOST &&
    (
      process.env.SMTP_USER ||
      process.env.SMTP_USERNAME ||
      process.env.SMTP_EMAIL
    ) &&
    (
      process.env.SMTP_PASS ||
      process.env.SMTP_PASSWORD
    )
  ) {

    results.cpanel.configured = true;


    try {

      await exports.verifyCpanelConnection();

      results.cpanel.connected = true;

    } catch (error) {

      results.cpanel.error =
        error.message;
    }
  }


  return results;
};









