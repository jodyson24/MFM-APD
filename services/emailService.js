const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

let transporter = null;

/**
 * ============================================================
 * EMAIL CONFIGURATION
 * ============================================================
 *
 * cPanel SMTP:
 *
 * SMTP_HOST=sivarenterprise.com
 * SMTP_PORT=465
 * SMTP_SECURE=true
 * SMTP_USER=admin@sivarenterprise.com
 * SMTP_PASS=your-cpanel-email-password
 *
 * MAIL_FROM=admin@sivarenterprise.com
 * MAIL_FROM_NAME=MFM APD
 *
 * Optional Resend fallback:
 *
 * RESEND_API_KEY=re_xxxxxxxxx
 * RESEND_FROM=MFM APD <admin@sivarenterprise.com>
 *
 * Other:
 *
 * EMAIL_SEND_TIMEOUT_MS=30000
 * FRONTEND_URL=https://your-frontend-url.com
 *
 * ============================================================
 */


/**
 * Get email timeout.
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
 * Promise timeout helper.
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
 * SMTP TRANSPORTER
 * ============================================================
 *
 * Uses the cPanel SMTP server.
 *
 * Port 465 = implicit SSL/TLS
 *
 * cPanel settings:
 *
 * Host:     sivarenterprise.com
 * Port:     465
 * Security: SSL/TLS
 * User:     admin@sivarenterprise.com
 *
 * ============================================================
 */
function getTransporter() {
  if (transporter) {
    return transporter;
  }

  const SMTP_HOST =
    process.env.SMTP_HOST;

  const SMTP_PORT =
    Number(process.env.SMTP_PORT || 465);

  const SMTP_USER =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.SMTP_EMAIL;

  const SMTP_PASS =
    process.env.SMTP_PASS ||
    process.env.SMTP_PASSWORD;

  const SMTP_SECURE =
    process.env.SMTP_SECURE !== undefined
      ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
      : SMTP_PORT === 465;


  /**
   * Validate configuration.
   */
  if (
    !SMTP_HOST ||
    !SMTP_USER ||
    !SMTP_PASS
  ) {
    logger.error(
      '[mail:smtp] Missing SMTP configuration. Required: SMTP_HOST, SMTP_USER, SMTP_PASS'
    );

    return null;
  }


  /**
   * Create Nodemailer transporter.
   */
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,

    port: SMTP_PORT,

    secure: SMTP_SECURE,

    /**
     * STARTTLS is only required for port 587.
     *
     * Port 465 uses implicit TLS.
     */
    requireTLS:
      !SMTP_SECURE &&
      SMTP_PORT === 587,

    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },

    /**
     * Connection timeout.
     */
    connectionTimeout:
      getEmailSendTimeoutMs(),

    /**
     * SMTP greeting timeout.
     */
    greetingTimeout:
      getEmailSendTimeoutMs(),

    /**
     * Socket timeout.
     */
    socketTimeout:
      getEmailSendTimeoutMs(),
  });


  logger.info(
    `[mail:smtp] SMTP transporter configured for ${SMTP_HOST}:${SMTP_PORT}`
  );


  return transporter;
}


/**
 * ============================================================
 * RESEND
 * ============================================================
 *
 * Optional HTTP-based fallback.
 *
 * This is useful when SMTP is unavailable from Render.
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


  const response = await fetch(
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
      `Resend API request failed (${response.status}): ${
        errBody || 'unknown error'
      }`
    );
  }


  return response;
}


/**
 * ============================================================
 * SEND EMAIL
 * ============================================================
 *
 * Order:
 *
 * 1. cPanel SMTP
 * 2. Resend fallback
 * 3. Development logging
 *
 * ============================================================
 */
async function sendOrLog(
  message,
  email
) {
  const smtpTransporter =
    getTransporter();


  /**
   * ----------------------------------------------------------
   * 1. PRIMARY: cPanel SMTP
   * ----------------------------------------------------------
   */
  if (smtpTransporter) {
    try {
      logger.info(
        `[mail:smtp] Attempting to send email to ${email}`
      );


      const result =
        await withTimeout(
          smtpTransporter.sendMail(
            message
          ),
          `Email send to ${email}`
        );


      logger.info(
        `[mail:smtp] Email sent successfully to ${email}. Message ID: ${result.messageId}`
      );


      return result;
    } catch (smtpError) {

      logger.error(
        `[mail:smtp] Failed to send email to ${email}: ${smtpError.message}`
      );


      /**
       * Reset transporter so that a future request
       * creates a fresh SMTP connection.
       */
      transporter = null;


      /**
       * ------------------------------------------------------
       * 2. FALLBACK TO RESEND
       * ------------------------------------------------------
       */
      if (
        process.env.RESEND_API_KEY
      ) {
        logger.warn(
          `[mail] SMTP failed for ${email}. Attempting Resend fallback...`
        );


        try {
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
        } catch (resendError) {

          logger.error(
            `[mail:resend] Resend fallback also failed for ${email}: ${resendError.message}`
          );


          /**
           * Throw the Resend error because both
           * providers have failed.
           */
          throw new Error(
            `SMTP failed: ${smtpError.message}. Resend fallback failed: ${resendError.message}`
          );
        }
      }


      /**
       * No fallback configured.
       */
      throw smtpError;
    }
  }


  /**
   * ----------------------------------------------------------
   * 3. SMTP NOT CONFIGURED
   * ----------------------------------------------------------
   *
   * Try Resend directly if available.
   */
  if (
    process.env.RESEND_API_KEY
  ) {
    try {
      logger.warn(
        `[mail] SMTP is not configured. Using Resend for ${email}`
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
    } catch (resendError) {

      logger.error(
        `[mail:resend] Failed to send email to ${email}: ${resendError.message}`
      );


      throw resendError;
    }
  }


  /**
   * ----------------------------------------------------------
   * 4. NOTHING CONFIGURED
   * ----------------------------------------------------------
   */
  const missingConfigMessage =
    'Email configuration missing. Set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS and MAIL_FROM.';


  if (
    process.env.NODE_ENV === 'production'
  ) {
    logger.error(
      `[mail:prod] ${missingConfigMessage}`
    );

    throw new Error(
      missingConfigMessage
    );
  }


  /**
   * Development mode.
   */
  logger.info(
    `[mail:dev] ${missingConfigMessage}`
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
  const appName =
    'MFM Activity Performance Dashboard';


  return `
    <div style="margin:0;padding:0;background-color:#f4f4f9;font-family:Arial,Helvetica,sans-serif;">

      <table
        role="presentation"
        width="100%"
        cellpadding="0"
        cellspacing="0"
        style="background-color:#f4f4f9;padding:32px 0;"
      >

        <tr>
          <td align="center">

            <table
              role="presentation"
              width="100%"
              cellpadding="0"
              cellspacing="0"
              style="
                max-width:640px;
                background-color:#ffffff;
                border:1px solid #e7e5f3;
                border-radius:16px;
                overflow:hidden;
              "
            >

              <!-- Header -->

              <tr>

                <td
                  style="
                    padding:24px 32px 16px 32px;
                    background:linear-gradient(
                      135deg,
                      #5b21b6 0%,
                      #7c3aed 100%
                    );
                  "
                >

                  <div
                    style="
                      font-size:12px;
                      line-height:18px;
                      font-weight:700;
                      letter-spacing:1.5px;
                      text-transform:uppercase;
                      color:#ede9fe;
                    "
                  >
                    MFM APD
                  </div>


                  <div
                    style="
                      font-size:28px;
                      line-height:34px;
                      font-weight:700;
                      color:#ffffff;
                      margin-top:8px;
                    "
                  >
                    Account Invitation
                  </div>

                </td>

              </tr>


              <!-- Content -->

              <tr>

                <td style="padding:32px;">

                  <p
                    style="
                      margin:0 0 16px;
                      font-size:16px;
                      line-height:24px;
                      color:#22253a;
                    "
                  >
                    Hello ${name},
                  </p>


                  <p
                    style="
                      margin:0 0 20px;
                      font-size:16px;
                      line-height:24px;
                      color:#32384f;
                    "
                  >
                    You have been invited to join the

                    <strong style="color:#5b21b6;">
                      ${appName}
                    </strong>.
                  </p>


                  <p
                    style="
                      margin:0 0 20px;
                      font-size:16px;
                      line-height:24px;
                      color:#32384f;
                    "
                  >
                    To set up your password and activate
                    your account, click the button below.
                    This invite is valid for 72 hours.
                  </p>


                  <div style="margin:0 0 24px;">

                    <a
                      href="${link}"
                      style="
                        display:inline-block;
                        background-color:#7c3aed;
                        color:#ffffff;
                        text-decoration:none;
                        font-size:15px;
                        font-weight:700;
                        line-height:18px;
                        padding:14px 24px;
                        border-radius:10px;
                      "
                    >
                      Set your password
                    </a>

                  </div>


                  <p
                    style="
                      margin:0 0 8px;
                      font-size:14px;
                      line-height:22px;
                      color:#4f5a80;
                    "
                  >
                    If the button does not work,
                    use this link:
                  </p>


                  <p
                    style="
                      margin:0 0 24px;
                      font-size:14px;
                      line-height:22px;
                      word-break:break-all;
                      color:#4f5a80;
                    "
                  >

                    <a
                      href="${link}"
                      style="
                        color:#6d28d9;
                        text-decoration:none;
                      "
                    >
                      ${link}
                    </a>

                  </p>


                  <p
                    style="
                      margin:0;
                      font-size:14px;
                      line-height:22px;
                      color:#4f5a80;
                    "
                  >
                    If you did not expect this invitation,
                    you can safely ignore this email.
                  </p>

                </td>

              </tr>


              <!-- Footer -->

              <tr>

                <td
                  style="
                    padding:0 32px 28px 32px;
                  "
                >

                  <div
                    style="
                      border-top:1px solid #e7e5f3;
                      padding-top:16px;
                      font-size:12px;
                      line-height:18px;
                      color:#64709a;
                    "
                  >
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
 * ============================================================
 * FROM ADDRESS
 * ============================================================
 */
function getFromAddress() {
  const senderName =
    process.env.MAIL_FROM_NAME ||
    'MFM APD';


  const smtpUser =
    process.env.SMTP_USER ||
    process.env.SMTP_USERNAME ||
    process.env.SMTP_EMAIL ||
    'admin@sivarenterprise.com';


  return (
    process.env.MAIL_FROM ||
    process.env.MAIL_FROM_ADDRESS ||
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
   * Encode the token so that special characters
   * cannot break the URL.
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

— MFM Administration`,

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
 * GENERIC EMAIL
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
 * VERIFY SMTP CONNECTION
 * ============================================================
 *
 * Useful for debugging Render/cPanel connectivity.
 *
 * ============================================================
 */
exports.verifyEmailConnection = async () => {

  const smtpTransporter =
    getTransporter();


  if (!smtpTransporter) {

    throw new Error(
      'SMTP configuration is missing.'
    );
  }


  try {

    await withTimeout(
      smtpTransporter.verify(),
      'SMTP connection verification'
    );


    logger.info(
      '[mail:smtp] SMTP connection verified successfully.'
    );


    return true;

  } catch (error) {

    logger.error(
      `[mail:smtp] SMTP verification failed: ${error.message}`
    );


    transporter = null;


    throw error;
  }
};