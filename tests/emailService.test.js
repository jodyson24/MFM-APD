const test = require('node:test');
const assert = require('node:assert/strict');
const nodemailer = require('nodemailer');

const emailServicePath = require.resolve('../services/emailService');

delete require.cache[emailServicePath];

const emailService = require('../services/emailService');

test('sendInviteEmail rejects when SMTP credentials are missing in production', async () => {
  process.env.NODE_ENV = 'production';
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASS;
  delete process.env.MAIL_FROM;
  delete process.env.EMAIL_SEND_TIMEOUT_MS;

  delete require.cache[emailServicePath];
  const freshEmailService = require('../services/emailService');

  await assert.rejects(
    () => freshEmailService.sendInviteEmail('user@example.com', 'token-123', { name: 'Test User' }),
    /SMTP.*credentials|MAIL.*configured|missing.*SMTP/i,
  );
});

test('sendInviteEmail times out when the SMTP server hangs', async () => {
  process.env.NODE_ENV = 'production';
  process.env.SMTP_USER = 'user@example.com';
  process.env.SMTP_PASS = 'secret';
  process.env.EMAIL_SEND_TIMEOUT_MS = '50';

  const originalCreateTransport = nodemailer.createTransport;
  nodemailer.createTransport = () => ({
    sendMail: () => new Promise(() => {}),
  });

  delete require.cache[emailServicePath];
  const freshEmailService = require('../services/emailService');

  try {
    await assert.rejects(
      () => freshEmailService.sendInviteEmail('user@example.com', 'token-123', { name: 'Test User' }),
      /timed out|Email send timed out/i,
    );
  } finally {
    nodemailer.createTransport = originalCreateTransport;
    delete process.env.EMAIL_SEND_TIMEOUT_MS;
    delete require.cache[emailServicePath];
  }
});
