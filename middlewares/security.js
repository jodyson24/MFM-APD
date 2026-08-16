const rateLimit = require('express-rate-limit');

// Rate limiter for auth endpoints
exports.authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 1200,
  message: { message: 'Too many attempts, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});