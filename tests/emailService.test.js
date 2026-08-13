const test = require('node:test');
const assert = require('node:assert/strict');

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

  delete require.cache[emailServicePath];
  const freshEmailService = require('../services/emailService');

  await assert.rejects(
    () => freshEmailService.sendInviteEmail('user@example.com', 'token-123', { name: 'Test User' }),
    /SMTP.*credentials|MAIL.*configured|missing.*SMTP/i,
  );
});
